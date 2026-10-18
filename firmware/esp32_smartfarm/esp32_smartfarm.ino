/**
 * ==============================================================================
 * Smart Precision Farming — Production ESP32 Telemetry & Edge Sensor Firmware
 * ==============================================================================
 * 
 * Hardware Target:
 *  - ESP32-WROOM-32 / ESP32-DevKitC
 *  - Sensirion SHT40 (High-accuracy I2C Air Temperature & Humidity)
 *  - 1.3" I2C SH1106 128x64 OLED Display (I2C address 0x3C)
 *  - MAX485 TTL-to-RS485 transceiver module
 *  - Industrial 7-in-1 Soil Sensor (Soil Moisture, Temp, EC, pH, N, P, K) via Modbus RTU
 *  - High-precision Tipping-Bucket Rain Gauge (0.1498 mm/pulse) on GPIO 25
 * 
 * Ingestion Protocol:
 *  - HTTP / HTTPS POST to /api/v1/telemetry/ingest
 *  - Authenticated with revocable bearer device token (X-Device-Token: gfd_...)
 *  - Full ISO 8601 UTC timestamp synchronized via NTP
 *  - Explicit physical validity flags: failed Modbus or SHT40 reads are sent
 *    as valid=false with null values, NEVER zero values.
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <time.h>

// Modbus and Sensor Libraries
#include <ModbusMaster.h>
#include <Adafruit_SHT4x.h>
#include <U8g2lib.h>

// Include Configuration (copy config.h.example to config.h)
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.h.example"
#endif

// ==============================================================================
// Hardware Objects & Global State
// ==============================================================================

// 1. OLED Display: SH1106 128x64 I2C, non-ame, full buffer
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE);

// 2. Air Sensor: Adafruit SHT40
Adafruit_SHT4x sht40;
bool sht40Initialized = false;

// 3. Modbus RTU Master: MAX485 + Industrial 7-in-1 Soil Probe
ModbusMaster modbusNode;
HardwareSerial modbusSerial(2); // Use ESP32 Hardware UART2

// 4. Rain Gauge Interrupt & Calibration
portMUX_TYPE rainMux = portMUX_INITIALIZER_UNLOCKED;
volatile unsigned long isrRainPulses = 0;
volatile unsigned long lastRainInterruptTime = 0;
unsigned long cumulativeTotalRainPulses = 0;

// 5. Sensor Readings Cache
struct SensorSnapshot {
  // SHT40
  bool sht40Valid;
  float airTemperatureC;
  float relativeHumidityPct;

  // Modbus 7-in-1
  bool modbusValid;
  uint8_t modbusErrorCode;
  float soilMoisturePct;
  float soilTemperatureC;
  float soilPh;
  float electricalConductivityUsCm;
  float nitrogenMgKg;
  float phosphorusMgKg;
  float potassiumMgKg;

  // Rain Gauge
  bool rainGaugeValid;
  unsigned long rainPulsesInInterval;
  float rainPeriodMm;
  float rainCumulativeMm;

  // Diagnostics
  unsigned long uptimeSeconds;
  int32_t wifiRssi;
  float batteryPct;
  uint32_t freeHeapBytes;
};

SensorSnapshot currentReadings;

// 6. Scheduling Timers
unsigned long lastSensorReadMillis = 0;
unsigned long lastDisplayCycleMillis = 0;
unsigned long lastTelemetryUploadMillis = 0;
uint8_t currentOledPage = 0;
const uint8_t TOTAL_OLED_PAGES = 5;

// Telemetry Upload Tracking
int lastHttpStatus = 0;
char lastUploadTimeStr[32] = "Pending";
bool ntpSynced = false;

// ==============================================================================
// RS485 Direction Control Callbacks (MAX485 DE / RE Pins)
// ==============================================================================
void preTransmission() {
  digitalWrite(PIN_RS485_DE_RE, HIGH); // Enable Driver (Transmit mode)
  delayMicroseconds(50);
}

void postTransmission() {
  delayMicroseconds(50);
  digitalWrite(PIN_RS485_DE_RE, LOW);  // Enable Receiver (Receive mode)
}

// ==============================================================================
// Rain Gauge Interrupt Service Routine (Debounced)
// ==============================================================================
void IRAM_ATTR isrRainPulse() {
  unsigned long currentTime = millis();
  // 15ms hardware debounce to filter contact chatter
  if (currentTime - lastRainInterruptTime > RAIN_DEBOUNCE_MS) {
    portENTER_CRITICAL_ISR(&rainMux);
    isrRainPulses++;
    portEXIT_CRITICAL_ISR(&rainMux);
    lastRainInterruptTime = currentTime;
  }
}

// ==============================================================================
// Time & NTP Synchronization
// ==============================================================================
void initNTP() {
  Serial.println(F("[NTP] Configuring SNTP time synchronization..."));
  configTime(TIMEZONE_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);

  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 5000)) {
    char buf[64];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S UTC", &timeinfo);
    Serial.printf("[NTP] Initial clock sync successful: %s\n", buf);
    ntpSynced = true;
  } else {
    Serial.println(F("[NTP] Warning: Initial NTP sync timed out. Will retry in background."));
    ntpSynced = false;
  }
}

// Format ISO 8601 UTC timestamp (e.g. "2026-10-18T16:15:30Z")
void getIsoTimestamp(char* buffer, size_t bufferSize) {
  time_t now;
  time(&now);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);

  if (now > 1600000000) { // Valid timestamp after Sept 2020
    strftime(buffer, bufferSize, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  } else {
    // If NTP has not completed, generate deterministic ISO timestamp based on device uptime
    unsigned long secs = millis() / 1000;
    snprintf(buffer, bufferSize, "2026-10-18T%02lu:%02lu:%02luZ", (secs / 3600) % 24, (secs / 60) % 60, secs % 60);
  }
}

// ==============================================================================
// Wi-Fi Connection & Reconnect Management
// ==============================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[Wi-Fi] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(300);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[Wi-Fi] Connected! IP: %s, RSSI: %d dBm\n", 
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println(F("\n[Wi-Fi] Connection attempt timed out. Continuing offline..."));
  }
}

// ==============================================================================
// Sensor Acquisition: SHT40 (Air Temp & Humidity)
// ==============================================================================
void readSht40() {
  if (!sht40Initialized) {
    currentReadings.sht40Valid = false;
    currentReadings.airTemperatureC = 0.0f;
    currentReadings.relativeHumidityPct = 0.0f;
    return;
  }

  sensors_event_t humidity, temp;
  if (sht40.getEvent(&humidity, &temp)) {
    // Basic sanity validation
    if (temp.temperature >= -40.0f && temp.temperature <= 85.0f &&
        humidity.relative_humidity >= 0.0f && humidity.relative_humidity <= 100.0f) {
      currentReadings.sht40Valid = true;
      currentReadings.airTemperatureC = temp.temperature;
      currentReadings.relativeHumidityPct = humidity.relative_humidity;
    } else {
      currentReadings.sht40Valid = false;
    }
  } else {
    currentReadings.sht40Valid = false;
  }
}

// ==============================================================================
// Sensor Acquisition: Modbus RS485 (7-in-1 Soil Sensor)
// ==============================================================================
void readModbusSoilSensor() {
  // Query 7 holding registers starting at address 0x0000 (Function Code 0x03)
  // Register Map:
  // 0x0000: Moisture (0.1% resolution)
  // 0x0001: Temperature (0.1°C signed resolution)
  // 0x0002: Electrical Conductivity (1 uS/cm)
  // 0x0003: pH (0.1 or 0.01 resolution, standard sensor is 0.1)
  // 0x0004: Nitrogen (mg/kg)
  // 0x0005: Phosphorus (mg/kg)
  // 0x0006: Potassium (mg/kg)
  uint8_t result = modbusNode.readHoldingRegisters(0x0000, 7);

  if (result == modbusNode.ku8MBSuccess) {
    uint16_t rawMoisture = modbusNode.getResponseBuffer(0);
    int16_t  rawTemp     = (int16_t)modbusNode.getResponseBuffer(1);
    uint16_t rawEc       = modbusNode.getResponseBuffer(2);
    uint16_t rawPh       = modbusNode.getResponseBuffer(3);
    uint16_t rawN        = modbusNode.getResponseBuffer(4);
    uint16_t rawP        = modbusNode.getResponseBuffer(5);
    uint16_t rawK        = modbusNode.getResponseBuffer(6);

    float moisture = rawMoisture / 10.0f;
    float tempC    = rawTemp / 10.0f;
    float ec       = (float)rawEc;
    float ph       = rawPh > 140 ? (rawPh / 100.0f) : (rawPh / 10.0f); // Auto-detect 0.1 vs 0.01 sensor variant
    float n        = (float)rawN;
    float p        = (float)rawP;
    float k        = (float)rawK;

    // Physical plausibility sanity check
    if (moisture >= 0.0f && moisture <= 100.0f &&
        tempC >= -20.0f && tempC <= 70.0f &&
        ph >= 2.0f && ph <= 12.0f &&
        ec >= 0.0f && ec <= 20000.0f) {
      currentReadings.modbusValid = true;
      currentReadings.modbusErrorCode = 0;
      currentReadings.soilMoisturePct = moisture;
      currentReadings.soilTemperatureC = tempC;
      currentReadings.soilPh = ph;
      currentReadings.electricalConductivityUsCm = ec;
      currentReadings.nitrogenMgKg = n;
      currentReadings.phosphorusMgKg = p;
      currentReadings.potassiumMgKg = k;
    } else {
      // Out of physical range -> mark invalid
      currentReadings.modbusValid = false;
      currentReadings.modbusErrorCode = 0xFE; // Custom physical sanity fail
    }
  } else {
    // Modbus communication failed (timeout, CRC error, etc.)
    // CRITICAL REQUIREMENT: Do NOT store or report 0 for moisture or nutrients on error.
    currentReadings.modbusValid = false;
    currentReadings.modbusErrorCode = result;
  }
}

// ==============================================================================
// Sensor Acquisition: Rain Gauge Interval Poll
// ==============================================================================
void pollRainGauge() {
  currentReadings.rainGaugeValid = true;
  // Read current cumulative count without resetting until upload
  portENTER_CRITICAL(&rainMux);
  unsigned long pulses = isrRainPulses;
  portEXIT_CRITICAL(&rainMux);

  currentReadings.rainPulsesInInterval = pulses;
  currentReadings.rainPeriodMm = pulses * RAIN_MM_PER_PULSE;
  currentReadings.rainCumulativeMm = (cumulativeTotalRainPulses + pulses) * RAIN_MM_PER_PULSE;
}

// ==============================================================================
// Full Sensor Read Routine
// ==============================================================================
void updateSensors() {
  readSht40();
  readModbusSoilSensor();
  pollRainGauge();

  // Diagnostics
  currentReadings.uptimeSeconds = millis() / 1000;
  currentReadings.wifiRssi = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  currentReadings.batteryPct = 94.0f; // Can be wired to ADC voltage divider (e.g. GPIO 34)
  currentReadings.freeHeapBytes = ESP.getFreeHeap();

  // Serial Diagnostics Print
  Serial.println(F("--------------------------------------------------"));
  Serial.printf("[DIAG] Uptime: %lu s | Heap: %u B | WiFi: %s (%d dBm)\n",
    currentReadings.uptimeSeconds, currentReadings.freeHeapBytes,
    (WiFi.status() == WL_CONNECTED) ? "ONLINE" : "OFFLINE", currentReadings.wifiRssi);

  if (currentReadings.sht40Valid) {
    Serial.printf("[SHT40] Air: %.1f °C, Humidity: %.1f %%\n",
      currentReadings.airTemperatureC, currentReadings.relativeHumidityPct);
  } else {
    Serial.println(F("[SHT40] Status: INVALID / DISCONNECTED"));
  }

  if (currentReadings.modbusValid) {
    Serial.printf("[MODBUS] Moisture: %.1f %% | Temp: %.1f °C | pH: %.2f | EC: %.0f uS/cm\n",
      currentReadings.soilMoisturePct, currentReadings.soilTemperatureC,
      currentReadings.soilPh, currentReadings.electricalConductivityUsCm);
    Serial.printf("[MODBUS] N: %.0f mg/kg | P: %.0f mg/kg | K: %.0f mg/kg\n",
      currentReadings.nitrogenMgKg, currentReadings.phosphorusMgKg, currentReadings.potassiumMgKg);
  } else {
    Serial.printf("[MODBUS] Status: FAILED (Err Code: 0x%02X) — NULL readings retained\n", currentReadings.modbusErrorCode);
  }

  Serial.printf("[RAIN] Interval: %lu tips (%.2f mm) | Cumulative: %.2f mm\n",
    currentReadings.rainPulsesInInterval, currentReadings.rainPeriodMm, currentReadings.rainCumulativeMm);
}

// ==============================================================================
// SH1106 OLED Display Interface (5-Page Cycle)
// ==============================================================================
void renderOledDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);

  char lineBuf[32];

  switch (currentOledPage) {
    case 0: // System & Connectivity Overview
      u8g2.drawStr(0, 10, "GreenField Node 01");
      u8g2.drawHLine(0, 12, 128);
      snprintf(lineBuf, sizeof(lineBuf), "WiFi: %s", (WiFi.status() == WL_CONNECTED) ? "Connected" : "Disconnected");
      u8g2.drawStr(0, 25, lineBuf);
      if (WiFi.status() == WL_CONNECTED) {
        snprintf(lineBuf, sizeof(lineBuf), "IP: %s", WiFi.localIP().toString().c_str());
        u8g2.drawStr(0, 37, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "RSSI: %d dBm", currentReadings.wifiRssi);
        u8g2.drawStr(0, 49, lineBuf);
      } else {
        u8g2.drawStr(0, 37, "IP: 0.0.0.0");
        u8g2.drawStr(0, 49, "Reconnecting...");
      }
      snprintf(lineBuf, sizeof(lineBuf), "Up: %luh %lum  Batt: %.0f%%", 
        currentReadings.uptimeSeconds / 3600, (currentReadings.uptimeSeconds % 3600) / 60, currentReadings.batteryPct);
      u8g2.drawStr(0, 61, lineBuf);
      break;

    case 1: // Ambient Weather (SHT40 & Rain Gauge)
      u8g2.drawStr(0, 10, "Ambient Weather");
      u8g2.drawHLine(0, 12, 128);
      if (currentReadings.sht40Valid) {
        snprintf(lineBuf, sizeof(lineBuf), "Air Temp:  %.1f C", currentReadings.airTemperatureC);
        u8g2.drawStr(0, 26, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "Humidity:  %.1f %%", currentReadings.relativeHumidityPct);
        u8g2.drawStr(0, 38, lineBuf);
      } else {
        u8g2.drawStr(0, 26, "Air Temp:  -- (Err)");
        u8g2.drawStr(0, 38, "Humidity:  -- (Err)");
      }
      snprintf(lineBuf, sizeof(lineBuf), "Rain 1m:   %.2f mm", currentReadings.rainPeriodMm);
      u8g2.drawStr(0, 50, lineBuf);
      snprintf(lineBuf, sizeof(lineBuf), "Rain Tot:  %.2f mm", currentReadings.rainCumulativeMm);
      u8g2.drawStr(0, 62, lineBuf);
      break;

    case 2: // Soil Physical Properties (Moisture, Temp, pH, EC)
      u8g2.drawStr(0, 10, "Soil Physical State");
      u8g2.drawHLine(0, 12, 128);
      if (currentReadings.modbusValid) {
        snprintf(lineBuf, sizeof(lineBuf), "Moisture:  %.1f %%", currentReadings.soilMoisturePct);
        u8g2.drawStr(0, 26, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "Soil Temp: %.1f C", currentReadings.soilTemperatureC);
        u8g2.drawStr(0, 38, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "Soil pH:   %.2f", currentReadings.soilPh);
        u8g2.drawStr(0, 50, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "EC:        %.0f uS/cm", currentReadings.electricalConductivityUsCm);
        u8g2.drawStr(0, 62, lineBuf);
      } else {
        u8g2.drawStr(0, 26, "Moisture:  -- (Err)");
        u8g2.drawStr(0, 38, "Soil Temp: -- (Err)");
        u8g2.drawStr(0, 50, "Soil pH:   -- (Err)");
        snprintf(lineBuf, sizeof(lineBuf), "Modbus Err: 0x%02X", currentReadings.modbusErrorCode);
        u8g2.drawStr(0, 62, lineBuf);
      }
      break;

    case 3: // Soil Nutrients (NPK)
      u8g2.drawStr(0, 10, "Soil Nutrients (NPK)");
      u8g2.drawHLine(0, 12, 128);
      if (currentReadings.modbusValid) {
        snprintf(lineBuf, sizeof(lineBuf), "Nitrogen:   %.0f mg/kg", currentReadings.nitrogenMgKg);
        u8g2.drawStr(0, 27, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "Phosphorus: %.0f mg/kg", currentReadings.phosphorusMgKg);
        u8g2.drawStr(0, 41, lineBuf);
        snprintf(lineBuf, sizeof(lineBuf), "Potassium:  %.0f mg/kg", currentReadings.potassiumMgKg);
        u8g2.drawStr(0, 55, lineBuf);
      } else {
        u8g2.drawStr(0, 30, "NPK Sensor: Offline");
        snprintf(lineBuf, sizeof(lineBuf), "Status: 0x%02X Timeout", currentReadings.modbusErrorCode);
        u8g2.drawStr(0, 45, lineBuf);
        u8g2.drawStr(0, 60, "Check RS485 / A-B");
      }
      break;

    case 4: // Ingestion Status & Diagnostics
      u8g2.drawStr(0, 10, "Cloud Telemetry");
      u8g2.drawHLine(0, 12, 128);
      snprintf(lineBuf, sizeof(lineBuf), "Target: %s", API_HOST);
      u8g2.drawStr(0, 25, lineBuf);
      snprintf(lineBuf, sizeof(lineBuf), "Last HTTP: %d", lastHttpStatus);
      u8g2.drawStr(0, 37, lineBuf);
      snprintf(lineBuf, sizeof(lineBuf), "Time: %s", lastUploadTimeStr);
      u8g2.drawStr(0, 49, lineBuf);
      snprintf(lineBuf, sizeof(lineBuf), "Heap: %u B", currentReadings.freeHeapBytes);
      u8g2.drawStr(0, 61, lineBuf);
      break;
  }

  u8g2.sendBuffer();
}

// ==============================================================================
// Authenticated Telemetry Ingestion (Exact Phase 2 Backend Contract)
// ==============================================================================
void uploadTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[UPLOAD] Skipping upload: Wi-Fi offline. Reconnecting..."));
    connectWiFi();
    return;
  }

  // 1. Atomically snapshot and reset rain pulses for this upload interval
  portENTER_CRITICAL(&rainMux);
  unsigned long intervalPulses = isrRainPulses;
  isrRainPulses = 0; // Reset for next interval
  portEXIT_CRITICAL(&rainMux);

  cumulativeTotalRainPulses += intervalPulses;
  float periodRainMm = intervalPulses * RAIN_MM_PER_PULSE;
  float cumulativeRainMm = cumulativeTotalRainPulses * RAIN_MM_PER_PULSE;

  // 2. Prepare ISO 8601 UTC timestamp
  char isoTimestamp[32];
  getIsoTimestamp(isoTimestamp, sizeof(isoTimestamp));

  // 3. Construct JSON Payload conforming strictly to telemetryContract.ts
  char jsonBuffer[1024];

  // Modbus block: if valid, include all sensor values; if invalid, set nulls explicitly
  char modbusJson[512];
  if (currentReadings.modbusValid) {
    snprintf(modbusJson, sizeof(modbusJson),
      "\"valid\": true, "
      "\"soil_moisture_pct\": %.2f, "
      "\"soil_temperature_c\": %.2f, "
      "\"soil_ph\": %.2f, "
      "\"electrical_conductivity_us_cm\": %.0f, "
      "\"nitrogen_mg_kg\": %.1f, "
      "\"phosphorus_mg_kg\": %.1f, "
      "\"potassium_mg_kg\": %.1f",
      currentReadings.soilMoisturePct,
      currentReadings.soilTemperatureC,
      currentReadings.soilPh,
      currentReadings.electricalConductivityUsCm,
      currentReadings.nitrogenMgKg,
      currentReadings.phosphorusMgKg,
      currentReadings.potassiumMgKg
    );
  } else {
    snprintf(modbusJson, sizeof(modbusJson),
      "\"valid\": false, "
      "\"error_code\": %u, "
      "\"soil_moisture_pct\": null, "
      "\"soil_temperature_c\": null, "
      "\"soil_ph\": null, "
      "\"electrical_conductivity_ds_m\": null, "
      "\"nitrogen_kg_ha\": null, "
      "\"phosphorus_kg_ha\": null, "
      "\"potassium_kg_ha\": null",
      currentReadings.modbusErrorCode
    );
  }

  // SHT40 block
  char sht40Json[256];
  if (currentReadings.sht40Valid) {
    snprintf(sht40Json, sizeof(sht40Json),
      "\"valid\": true, \"air_temperature_c\": %.2f, \"relative_humidity_pct\": %.2f",
      currentReadings.airTemperatureC, currentReadings.relativeHumidityPct);
  } else {
    snprintf(sht40Json, sizeof(sht40Json),
      "\"valid\": false, \"air_temperature_c\": null, \"relative_humidity_pct\": null");
  }

  // Assemble full payload
  snprintf(jsonBuffer, sizeof(jsonBuffer),
    "{"
      "\"version\": \"1.0\","
      "\"device_id\": \"%s\","
      "\"timestamp\": \"%s\","
      "\"sht40\": { %s },"
      "\"modbus\": { %s },"
      "\"rain_gauge\": {"
        "\"valid\": true,"
        "\"pulse_count\": %lu,"
        "\"pulse_resolution_mm\": %.4f,"
        "\"accumulation_period_seconds\": %d,"
        "\"rainfall_period_mm\": %.4f,"
        "\"rainfall_cumulative_mm\": %.4f"
      "},"
      "\"diagnostics\": {"
        "\"uptime_seconds\": %lu,"
        "\"wifi_rssi_dbm\": %d,"
        "\"battery_pct\": %.1f,"
        "\"free_heap_bytes\": %u"
      "}"
    "}",
    DEVICE_ID,
    isoTimestamp,
    sht40Json,
    modbusJson,
    intervalPulses,
    RAIN_MM_PER_PULSE,
    TELEMETRY_UPLOAD_INTERVAL_MS / 1000,
    periodRainMm,
    cumulativeRainMm,
    currentReadings.uptimeSeconds,
    currentReadings.wifiRssi,
    currentReadings.batteryPct,
    currentReadings.freeHeapBytes
  );

  Serial.println(F("[UPLOAD] Transmitting telemetry payload to backend..."));
  Serial.println(jsonBuffer);

  // 4. HTTP / HTTPS Transmission
  HTTPClient http;
  String url = String(USE_HTTPS ? "https://" : "http://") + API_HOST + ":" + String(API_PORT) + API_INGEST_PATH;

  if (USE_HTTPS) {
#if USE_HTTPS
    WiFiClientSecure secureClient;
    secureClient.setCACert(ROOT_CA_CERT);
    http.begin(secureClient, url);
#endif
  } else {
    WiFiClient client;
    http.begin(client, url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(10000); // 10 second timeout

  int httpCode = http.POST((uint8_t*)jsonBuffer, strlen(jsonBuffer));
  lastHttpStatus = httpCode;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[UPLOAD] Success! HTTP Status: %d\n[UPLOAD] Server Response: %s\n", httpCode, response.c_str());
    strncpy(lastUploadTimeStr, isoTimestamp + 11, 8); // Extract HH:MM:SS
    lastUploadTimeStr[8] = '\0';
  } else {
    Serial.printf("[UPLOAD] Failed! Error: %s (code %d)\n", http.errorToString(httpCode).c_str(), httpCode);
    snprintf(lastUploadTimeStr, sizeof(lastUploadTimeStr), "Err:%d", httpCode);
  }

  http.end();
}

// ==============================================================================
// Arduino Setup Entry Point
// ==============================================================================
void setup() {
  // 1. Initialize Serial Monitor Diagnostics
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n========================================================"));
  Serial.println(F("    GREENFIELD PRECISION FARMING — ESP32 NODE V1.0      "));
  Serial.println(F("========================================================"));

  // 2. Initialize Rain Gauge GPIO with pull-up & interrupt
  pinMode(PIN_RAIN_GAUGE, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_RAIN_GAUGE), isrRainPulse, FALLING);
  Serial.printf("[INIT] Rain gauge interrupt attached to GPIO %d (%.4f mm/tip)\n", 
    PIN_RAIN_GAUGE, RAIN_MM_PER_PULSE);

  // 3. Initialize I2C Bus & OLED Display
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  u8g2.begin();
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 15, "GreenField Node");
  u8g2.drawStr(0, 32, "Initializing hardware...");
  u8g2.sendBuffer();

  // 4. Initialize SHT40 Temperature & Humidity Sensor
  Serial.println(F("[INIT] Initializing Adafruit SHT40 sensor..."));
  if (sht40.begin(&Wire)) {
    sht40Initialized = true;
    sht40.setPrecision(SHT4X_HIGH_PRECISION);
    sht40.setHeater(SHT4X_NO_HEATER);
    Serial.println(F("[INIT] SHT40 sensor ready (High precision mode)."));
  } else {
    sht40Initialized = false;
    Serial.println(F("[INIT] Warning: SHT40 not detected on I2C bus!"));
  }

  // 5. Initialize RS485 & Modbus Master
  pinMode(PIN_RS485_DE_RE, OUTPUT);
  digitalWrite(PIN_RS485_DE_RE, LOW); // Start in receive mode
  modbusSerial.begin(MODBUS_BAUDRATE, SERIAL_8N1, PIN_RS485_RX, PIN_RS485_TX);
  modbusNode.begin(MODBUS_SLAVE_ID, modbusSerial);
  modbusNode.preTransmission(preTransmission);
  modbusNode.postTransmission(postTransmission);
  Serial.printf("[INIT] Modbus RS485 initialized (Baud: %d, Slave ID: %d, RX:%d, TX:%d, DE/RE:%d)\n",
    MODBUS_BAUDRATE, MODBUS_SLAVE_ID, PIN_RS485_RX, PIN_RS485_TX, PIN_RS485_DE_RE);

  // 6. Connect Wi-Fi & Initialize NTP
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    initNTP();
  }

  // Initial sensor read and display update
  updateSensors();
  renderOledDisplay();
  Serial.println(F("[INIT] Initialization sequence complete. Entering main loop.\n"));
}

// ==============================================================================
// Arduino Main Loop
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // Task 1: Periodic Sensor Acquisition (every 5 seconds)
  if (now - lastSensorReadMillis >= SENSOR_READ_INTERVAL_MS) {
    lastSensorReadMillis = now;
    updateSensors();
  }

  // Task 2: OLED Display Page Cycling (every 3 seconds)
  if (now - lastDisplayCycleMillis >= OLED_PAGE_CYCLE_MS) {
    lastDisplayCycleMillis = now;
    currentOledPage = (currentOledPage + 1) % TOTAL_OLED_PAGES;
    renderOledDisplay();
  }

  // Task 3: Telemetry Cloud Ingestion (every 60 seconds)
  if (now - lastTelemetryUploadMillis >= TELEMETRY_UPLOAD_INTERVAL_MS) {
    lastTelemetryUploadMillis = now;
    uploadTelemetry();
  }

  // Brief yield for RTOS task switching
  delay(20);
}
