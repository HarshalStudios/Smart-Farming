export interface Esp32SensorPayload {
  version: '1.0';
  device_id: string;
  timestamp: string; // ISO 8601 UTC string (e.g. 2026-10-18T16:15:30Z)
  sht40: {
    valid: boolean;
    air_temperature_c: number | null;
    relative_humidity_pct: number | null;
  };
  modbus: {
    valid: boolean;
    error_code?: number; // Modbus exception or communication error code if valid === false
    soil_moisture_pct: number | null;
    soil_temperature_c: number | null;
    soil_ph: number | null;
    // EC: accept dS/m directly or raw uS/cm (auto-converted: 1 dS/m = 1000 uS/cm)
    electrical_conductivity_ds_m?: number | null;
    electrical_conductivity_us_cm?: number | null;
    // NPK: accept kg/ha directly or raw mg/kg (auto-converted: kg/ha = mg/kg * 2.0 based on 15cm furrow slice)
    nitrogen_kg_ha?: number | null;
    phosphorus_kg_ha?: number | null;
    potassium_kg_ha?: number | null;
    nitrogen_mg_kg?: number | null;
    phosphorus_mg_kg?: number | null;
    potassium_mg_kg?: number | null;
  };
  rain_gauge: {
    valid: boolean;
    pulse_count: number;
    pulse_resolution_mm: number; // standard tipping bucket: 0.1498 mm/pulse
    accumulation_period_seconds: number; // interval duration (e.g. 60)
    rainfall_period_mm: number; // pulses * pulse_resolution_mm for this interval
    rainfall_cumulative_mm?: number; // total cumulative precipitation since device boot
  };
  diagnostics?: {
    uptime_seconds?: number;
    wifi_rssi_dbm?: number;
    battery_pct?: number;
    free_heap_bytes?: number;
  };
}

export interface NormalizedModbusReadings {
  valid: boolean;
  error_code?: number;
  soil_moisture_pct: number | null;
  soil_temperature_c: number | null;
  soil_ph: number | null;
  electrical_conductivity_ds_m: number | null;
  nitrogen_kg_ha: number | null;
  phosphorus_kg_ha: number | null;
  potassium_kg_ha: number | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  data?: Esp32SensorPayload;
  normalizedModbus?: NormalizedModbusReadings;
}

export function validateTelemetryPayload(input: unknown): ValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Payload must be a non-empty JSON object'] };
  }

  const p = input as Partial<Esp32SensorPayload>;

  if (p.version !== '1.0') {
    errors.push('Unsupported payload version. Expected "1.0"');
  }

  if (!p.device_id || typeof p.device_id !== 'string' || p.device_id.trim().length < 3) {
    errors.push('Missing or invalid device_id (min 3 characters)');
  }

  if (!p.timestamp || typeof p.timestamp !== 'string') {
    errors.push('Missing timestamp (ISO 8601 UTC string required)');
  } else {
    const ts = Date.parse(p.timestamp);
    if (Number.isNaN(ts)) {
      errors.push('Timestamp format is not a valid ISO 8601 date');
    } else {
      const now = Date.now();
      // Allow slight clock drift (up to 10 min in future, 7 days in past for offline buffer catch-up)
      if (ts > now + 10 * 60 * 1000) {
        errors.push('Timestamp cannot be in the future (>10 min drift)');
      }
      if (ts < now - 7 * 24 * 60 * 60 * 1000) {
        errors.push('Timestamp is too stale (>7 days old)');
      }
    }
  }

  // Validate SHT40
  if (!p.sht40 || typeof p.sht40 !== 'object') {
    errors.push('Missing sht40 block');
  } else {
    if (typeof p.sht40.valid !== 'boolean') {
      errors.push('sht40.valid must be boolean');
    }
    if (p.sht40.valid) {
      if (typeof p.sht40.air_temperature_c !== 'number' || p.sht40.air_temperature_c < -40 || p.sht40.air_temperature_c > 85) {
        errors.push('sht40.air_temperature_c out of realistic range (-40 to 85°C)');
      }
      if (typeof p.sht40.relative_humidity_pct !== 'number' || p.sht40.relative_humidity_pct < 0 || p.sht40.relative_humidity_pct > 100) {
        errors.push('sht40.relative_humidity_pct out of range (0 to 100%)');
      }
    }
  }

  // Validate Modbus and normalize units
  let normalizedModbus: NormalizedModbusReadings = {
    valid: false,
    soil_moisture_pct: null,
    soil_temperature_c: null,
    soil_ph: null,
    electrical_conductivity_ds_m: null,
    nitrogen_kg_ha: null,
    phosphorus_kg_ha: null,
    potassium_kg_ha: null
  };

  if (!p.modbus || typeof p.modbus !== 'object') {
    errors.push('Missing modbus block');
  } else {
    if (typeof p.modbus.valid !== 'boolean') {
      errors.push('modbus.valid must be boolean');
    }

    normalizedModbus.valid = p.modbus.valid;
    normalizedModbus.error_code = p.modbus.error_code;

    if (p.modbus.valid) {
      const checkRange = (val: unknown, name: string, min: number, max: number) => {
        if (typeof val !== 'number' || val < min || val > max) {
          errors.push(`modbus.${name} out of plausible physical range (${min} to ${max})`);
        }
      };

      checkRange(p.modbus.soil_moisture_pct, 'soil_moisture_pct', 0, 100);
      checkRange(p.modbus.soil_temperature_c, 'soil_temperature_c', -20, 70);
      checkRange(p.modbus.soil_ph, 'soil_ph', 2, 12);

      // Handle Electrical Conductivity unit normalization (dS/m vs uS/cm)
      let ec_ds_m: number | null = null;
      if (typeof p.modbus.electrical_conductivity_ds_m === 'number') {
        ec_ds_m = p.modbus.electrical_conductivity_ds_m;
      } else if (typeof p.modbus.electrical_conductivity_us_cm === 'number') {
        ec_ds_m = Number((p.modbus.electrical_conductivity_us_cm / 1000.0).toFixed(3));
      }
      if (ec_ds_m !== null) {
        checkRange(ec_ds_m, 'electrical_conductivity_ds_m', 0, 20);
      } else {
        errors.push('modbus requires either electrical_conductivity_ds_m or electrical_conductivity_us_cm');
      }

      // Handle NPK unit normalization (kg/ha vs raw mg/kg with documented 2.0 furrow-slice conversion)
      let n_kg_ha: number | null = null;
      if (typeof p.modbus.nitrogen_kg_ha === 'number') {
        n_kg_ha = p.modbus.nitrogen_kg_ha;
      } else if (typeof p.modbus.nitrogen_mg_kg === 'number') {
        n_kg_ha = Number((p.modbus.nitrogen_mg_kg * 2.0).toFixed(1));
      }
      if (n_kg_ha !== null) checkRange(n_kg_ha, 'nitrogen_kg_ha', 0, 1500);
      else errors.push('modbus requires either nitrogen_kg_ha or nitrogen_mg_kg');

      let p_kg_ha: number | null = null;
      if (typeof p.modbus.phosphorus_kg_ha === 'number') {
        p_kg_ha = p.modbus.phosphorus_kg_ha;
      } else if (typeof p.modbus.phosphorus_mg_kg === 'number') {
        p_kg_ha = Number((p.modbus.phosphorus_mg_kg * 2.0).toFixed(1));
      }
      if (p_kg_ha !== null) checkRange(p_kg_ha, 'phosphorus_kg_ha', 0, 500);
      else errors.push('modbus requires either phosphorus_kg_ha or phosphorus_mg_kg');

      let k_kg_ha: number | null = null;
      if (typeof p.modbus.potassium_kg_ha === 'number') {
        k_kg_ha = p.modbus.potassium_kg_ha;
      } else if (typeof p.modbus.potassium_mg_kg === 'number') {
        k_kg_ha = Number((p.modbus.potassium_mg_kg * 2.0).toFixed(1));
      }
      if (k_kg_ha !== null) checkRange(k_kg_ha, 'potassium_kg_ha', 0, 2000);
      else errors.push('modbus requires either potassium_kg_ha or potassium_mg_kg');

      normalizedModbus = {
        valid: true,
        error_code: undefined,
        soil_moisture_pct: p.modbus.soil_moisture_pct ?? null,
        soil_temperature_c: p.modbus.soil_temperature_c ?? null,
        soil_ph: p.modbus.soil_ph ?? null,
        electrical_conductivity_ds_m: ec_ds_m,
        nitrogen_kg_ha: n_kg_ha,
        phosphorus_kg_ha: p_kg_ha,
        potassium_kg_ha: k_kg_ha
      };
    } else {
      // Modbus read failed: explicitly retain NULLs to prevent zero-value pollution
      normalizedModbus = {
        valid: false,
        error_code: p.modbus.error_code,
        soil_moisture_pct: null,
        soil_temperature_c: null,
        soil_ph: null,
        electrical_conductivity_ds_m: null,
        nitrogen_kg_ha: null,
        phosphorus_kg_ha: null,
        potassium_kg_ha: null
      };
    }
  }

  // Validate Rain Gauge
  if (!p.rain_gauge || typeof p.rain_gauge !== 'object') {
    errors.push('Missing rain_gauge block');
  } else {
    if (typeof p.rain_gauge.valid !== 'boolean') {
      errors.push('rain_gauge.valid must be boolean');
    }
    if (typeof p.rain_gauge.pulse_count !== 'number' || p.rain_gauge.pulse_count < 0) {
      errors.push('rain_gauge.pulse_count must be a non-negative number');
    }
    if (typeof p.rain_gauge.rainfall_period_mm !== 'number' || p.rain_gauge.rainfall_period_mm < 0) {
      errors.push('rain_gauge.rainfall_period_mm must be a non-negative number');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: p as Esp32SensorPayload,
    normalizedModbus
  };
}
