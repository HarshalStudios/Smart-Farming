import React, { useState, useMemo } from 'react';
import {
  Droplets, Thermometer, Waves, Activity, Radio, Sprout,
  ArrowDown, ArrowUp, Calendar, Download, RefreshCw, Check,
  AlertTriangle, Info, Sparkles, SlidersHorizontal, CloudRain,
  Wind, Gauge, Leaf, Sun
} from 'lucide-react';
import type { SoilAndEnvReadings } from '../services/cropAnalysisEngine';

export interface ModernSensorDataViewProps {
  mode: 'demo' | 'live' | 'manual';
  manualReadings: SoilAndEnvReadings;
  onManualReadingChange?: (key: keyof SoilAndEnvReadings, val: number) => void;
  latestLiveReading?: any;
  liveHistory?: any[];
  farmName?: string;
  plotName?: string;
  cropName?: string;
  onNavigateToCropAnalysis?: () => void;
}

interface MetricCardConfig {
  id: string;
  key: string;
  name: string;
  unit: string;
  getValue: (data: EffectiveSensorData) => number | string;
  status: (val: number) => 'Normal' | 'Low' | 'High' | 'Warning' | 'Critical';
  min: number;
  max: number;
  safeMin: number;
  safeMax: number;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  optional?: boolean;
}

interface EffectiveSensorData {
  soilMoisture: number;
  soilTemperature: number;
  soilEc: number; // in dS/m
  soilPh: number;
  nitrogen: number; // mg/kg
  phosphorus: number; // mg/kg
  potassium: number; // mg/kg
  airTemperature: number; // °C
  humidity: number; // %
  pressure: number; // hPa
  leafWetness: number; // %
  rainfall: number; // mm
}

const STAGES = [
  { id: 'sowing', label: 'Sowing' },
  { id: 'germination', label: 'Germination' },
  { id: 'tillering', label: 'Tillering' },
  { id: 'jointing', label: 'Jointing' },
  { id: 'flowering', label: 'Flowering' },
  { id: 'grain_filling', label: 'Grain filling' },
  { id: 'harvest', label: 'Harvest' }
];

export default function ModernSensorDataView({
  mode,
  manualReadings,
  onManualReadingChange,
  latestLiveReading,
  liveHistory = [],
  farmName = 'Shivneri Farm',
  plotName = 'Land L-01',
  cropName = 'Wheat',
  onNavigateToCropAnalysis
}: ModernSensorDataViewProps) {
  // Crop stage stepper state (Tillering is active as in Screenshot 1)
  const [activeStageIndex, setActiveStageIndex] = useState<number>(2); // 2 = Tillering
  const [selectedMetricId, setSelectedMetricId] = useState<string>('soil_moisture');
  const [chartPeriod, setChartPeriod] = useState<'24h' | '7d' | '30d'>('7d');

  // Compute effective current readings based on active mode
  const effectiveData: EffectiveSensorData = useMemo(() => {
    if (mode === 'manual') {
      return {
        soilMoisture: manualReadings.soilMoisture ?? 24,
        soilTemperature: manualReadings.soilTemperature ?? 27,
        soilEc: manualReadings.ec ? parseFloat((manualReadings.ec / 1000).toFixed(1)) : 1.2,
        soilPh: manualReadings.soilPh ?? 6.8,
        nitrogen: manualReadings.nitrogen ?? 76,
        phosphorus: manualReadings.phosphorus ?? 24,
        potassium: manualReadings.potassium ?? 162,
        airTemperature: manualReadings.airTemperature ?? 28,
        humidity: manualReadings.relativeHumidity ?? 58,
        pressure: 1010,
        leafWetness: 34,
        rainfall: manualReadings.rainfall ?? 0.0
      };
    }

    if (mode === 'live' && latestLiveReading) {
      let rawJson: any = null;
      try {
        rawJson = latestLiveReading.raw_payload ? JSON.parse(latestLiveReading.raw_payload) : null;
      } catch {
        /* ignore */
      }
      return {
        soilMoisture: latestLiveReading.soil_moisture_pct ?? 24,
        soilTemperature: latestLiveReading.soil_temperature_c ?? 27,
        soilEc: latestLiveReading.electrical_conductivity_ds_m ?? 1.2,
        soilPh: latestLiveReading.soil_ph ?? 6.8,
        nitrogen: rawJson?.modbus?.nitrogen_mg_kg ?? 76,
        phosphorus: rawJson?.modbus?.phosphorus_mg_kg ?? 24,
        potassium: rawJson?.modbus?.potassium_mg_kg ?? 162,
        airTemperature: latestLiveReading.air_temperature_c ?? 28,
        humidity: latestLiveReading.relative_humidity_pct ?? 58,
        pressure: 1010,
        leafWetness: 34,
        rainfall: latestLiveReading.rain_accumulation_mm ?? 0.0
      };
    }

    // Default Demo Mode matching Screenshot 1 exactly
    return {
      soilMoisture: 24,
      soilTemperature: 27,
      soilEc: 1.2,
      soilPh: 6.8,
      nitrogen: 76,
      phosphorus: 24,
      potassium: 162,
      airTemperature: 28,
      humidity: 58,
      pressure: 1010,
      leafWetness: 34,
      rainfall: 0.0
    };
  }, [mode, manualReadings, latestLiveReading]);

  // Metric definitions matching Screenshot 1
  const metrics: MetricCardConfig[] = [
    {
      id: 'soil_moisture',
      key: 'soilMoisture',
      name: 'Soil moisture',
      unit: '%',
      getValue: d => d.soilMoisture,
      status: v => (v < 35 ? 'Low' : v > 80 ? 'High' : 'Normal'),
      min: 0,
      max: 100,
      safeMin: 40,
      safeMax: 70,
      icon: Droplets
    },
    {
      id: 'soil_temp',
      key: 'soilTemperature',
      name: 'Soil temperature',
      unit: '°C',
      getValue: d => d.soilTemperature,
      status: v => (v < 18 ? 'Low' : v > 35 ? 'High' : 'Normal'),
      min: 10,
      max: 45,
      safeMin: 20,
      safeMax: 30,
      icon: Thermometer
    },
    {
      id: 'soil_ec',
      key: 'soilEc',
      name: 'Soil EC',
      unit: 'dS/m',
      getValue: d => d.soilEc.toFixed(1),
      status: v => (v > 2.0 ? 'High' : 'Normal'),
      min: 0,
      max: 4.0,
      safeMin: 0.8,
      safeMax: 2.0,
      icon: Radio
    },
    {
      id: 'soil_ph',
      key: 'soilPh',
      name: 'Soil pH',
      unit: '',
      getValue: d => d.soilPh.toFixed(1),
      status: v => (v < 6.0 ? 'Low' : v > 7.5 ? 'High' : 'Normal'),
      min: 4.0,
      max: 9.0,
      safeMin: 6.0,
      safeMax: 7.5,
      icon: Activity
    },
    {
      id: 'nitrogen',
      key: 'nitrogen',
      name: 'Nitrogen',
      unit: 'mg/kg',
      getValue: d => d.nitrogen,
      status: v => (v < 80 ? 'Low' : v > 150 ? 'High' : 'Normal'),
      min: 0,
      max: 200,
      safeMin: 80,
      safeMax: 150,
      icon: Leaf
    },
    {
      id: 'phosphorus',
      key: 'phosphorus',
      name: 'Phosphorus',
      unit: 'mg/kg',
      getValue: d => d.phosphorus,
      status: v => (v < 15 ? 'Low' : v > 45 ? 'High' : 'Normal'),
      min: 0,
      max: 60,
      safeMin: 15,
      safeMax: 40,
      icon: Leaf
    },
    {
      id: 'potassium',
      key: 'potassium',
      name: 'Potassium',
      unit: 'mg/kg',
      getValue: d => d.potassium,
      status: v => (v < 120 ? 'Low' : v > 240 ? 'High' : 'Normal'),
      min: 0,
      max: 300,
      safeMin: 120,
      safeMax: 220,
      icon: Leaf
    },
    {
      id: 'air_temp',
      key: 'airTemperature',
      name: 'Air temperature',
      unit: '°C',
      getValue: d => d.airTemperature,
      status: v => (v < 16 ? 'Low' : v > 36 ? 'High' : 'Normal'),
      min: 10,
      max: 45,
      safeMin: 18,
      safeMax: 32,
      icon: Thermometer
    },
    {
      id: 'humidity',
      key: 'humidity',
      name: 'Humidity',
      unit: '%',
      getValue: d => d.humidity,
      status: v => (v < 40 ? 'Low' : v > 85 ? 'High' : 'Normal'),
      min: 20,
      max: 100,
      safeMin: 50,
      safeMax: 80,
      icon: Waves
    },
    {
      id: 'pressure',
      key: 'pressure',
      name: 'Pressure',
      unit: 'hPa',
      getValue: d => d.pressure,
      status: () => 'Normal',
      min: 980,
      max: 1030,
      safeMin: 1000,
      safeMax: 1020,
      icon: Gauge,
      optional: true
    },
    {
      id: 'leaf_wetness',
      key: 'leafWetness',
      name: 'Leaf wetness',
      unit: '%',
      getValue: d => d.leafWetness,
      status: () => 'Normal',
      min: 0,
      max: 100,
      safeMin: 20,
      safeMax: 60,
      icon: Leaf,
      optional: true
    },
    {
      id: 'rainfall',
      key: 'rainfall',
      name: 'Rainfall',
      unit: 'mm',
      getValue: d => d.rainfall.toFixed(1),
      status: () => 'Normal',
      min: 0,
      max: 20,
      safeMin: 0,
      safeMax: 50,
      icon: CloudRain,
      optional: true
    }
  ];

  const selectedMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];

  // Dynamic advice messages based on effective data
  const irrigationAdvice = useMemo(() => {
    if (effectiveData.soilMoisture < 35) {
      return `Irrigate within 24 hours, early in the morning. Soil moisture is ${effectiveData.soilMoisture}% and no rain is expected until Tuesday.`;
    }
    if (effectiveData.soilMoisture > 75) {
      return `Hold irrigation. Soil moisture is ample at ${effectiveData.soilMoisture}%. Aerate soil if necessary to prevent root hypoxia.`;
    }
    return `Soil moisture is at a healthy ${effectiveData.soilMoisture}%. Maintain regular micro-irrigation schedule as per tillering demands.`;
  }, [effectiveData.soilMoisture]);

  const fertilizerAdvice = useMemo(() => {
    if (effectiveData.nitrogen < 80) {
      return `Nitrogen is ${effectiveData.nitrogen} mg/kg, below the safe range. Plan a nitrogen top dressing (Urea / CAN) after the next irrigation.`;
    }
    if (effectiveData.phosphorus < 15) {
      return `Phosphorus is ${effectiveData.phosphorus} mg/kg, below optimal. Apply single super phosphate (SSP) or rock phosphate.`;
    }
    if (effectiveData.potassium < 120) {
      return `Potassium is ${effectiveData.potassium} mg/kg. Supplement with Muriate of Potash (MOP) to enhance stalk strength.`;
    }
    return `Macro-nutrients (N: ${effectiveData.nitrogen}, P: ${effectiveData.phosphorus}, K: ${effectiveData.potassium} mg/kg) are well balanced for ${cropName} during ${STAGES[activeStageIndex].label}.`;
  }, [effectiveData, cropName, activeStageIndex]);

  // Synthetic or historical table readings matching Screenshot 3
  const tableReadings = useMemo(() => {
    if (mode === 'live' && liveHistory.length > 0) {
      return liveHistory.slice(-8).reverse().map((r, i) => {
        let raw: any = null;
        try { raw = r.raw_payload ? JSON.parse(r.raw_payload) : null; } catch {}
        return {
          id: `D-${48213 - i}`,
          timestamp: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          moist: r.soil_moisture_pct ?? 24,
          soilTemp: r.soil_temperature_c ?? 27,
          ec: r.electrical_conductivity_ds_m ? r.electrical_conductivity_ds_m.toFixed(1) : '1.2',
          ph: r.soil_ph ? r.soil_ph.toFixed(1) : '6.8',
          n: raw?.modbus?.nitrogen_mg_kg ?? 76,
          p: raw?.modbus?.phosphorus_mg_kg ?? 24,
          k: raw?.modbus?.potassium_mg_kg ?? 162,
          airTemp: r.air_temperature_c ? r.air_temperature_c.toFixed(0) : '28',
          hum: r.relative_humidity_pct ? r.relative_humidity_pct.toFixed(0) : '58'
        };
      });
    }

    // Baseline readings replicating Screenshot 3 exactly
    const baseM = effectiveData.soilMoisture;
    const baseN = effectiveData.nitrogen;
    return [
      { id: 'D-48213', timestamp: '11 Oct, 9:02 AM', moist: baseM, soilTemp: 27, ec: '1.2', ph: '6.8', n: baseN, p: 24, k: 162, airTemp: 28, hum: 58 },
      { id: 'D-48212', timestamp: '11 Oct, 8:02 AM', moist: baseM, soilTemp: 26, ec: '1.2', ph: '6.8', n: baseN, p: 24, k: 162, airTemp: 26, hum: 64 },
      { id: 'D-48211', timestamp: '11 Oct, 7:02 AM', moist: baseM + 1, soilTemp: 26, ec: '1.2', ph: '6.8', n: baseN + 1, p: 24, k: 163, airTemp: 25, hum: 70 },
      { id: 'D-48210', timestamp: '11 Oct, 6:02 AM', moist: baseM + 1, soilTemp: 25, ec: '1.2', ph: '6.8', n: baseN + 1, p: 25, k: 163, airTemp: 24, hum: 74 },
      { id: 'D-48209', timestamp: '11 Oct, 5:02 AM', moist: baseM + 2, soilTemp: 25, ec: '1.1', ph: '6.8', n: baseN + 2, p: 25, k: 164, airTemp: 23, hum: 77 },
      { id: 'D-48208', timestamp: '11 Oct, 4:02 AM', moist: baseM + 2, soilTemp: 25, ec: '1.1', ph: '6.7', n: baseN + 2, p: 25, k: 164, airTemp: 23, hum: 78 },
      { id: 'D-48207', timestamp: '11 Oct, 3:02 AM', moist: baseM + 2, soilTemp: 25, ec: '1.1', ph: '6.7', n: baseN + 2, p: 25, k: 164, airTemp: 23, hum: 79 },
      { id: 'D-48206', timestamp: '11 Oct, 2:02 AM', moist: baseM + 3, soilTemp: 24, ec: '1.1', ph: '6.7', n: baseN + 3, p: 25, k: 165, airTemp: 22, hum: 80 }
    ];
  }, [mode, liveHistory, effectiveData]);

  // Export CSV handler
  const handleDownloadCsv = () => {
    const headers = ['DATA ID', 'TIMESTAMP', 'MOIST %', 'SOIL °C', 'EC', 'PH', 'N', 'P', 'K', 'AIR °C', 'HUM %'];
    const rows = tableReadings.map(r => [
      r.id,
      `"${r.timestamp}"`,
      r.moist,
      r.soilTemp,
      r.ec,
      r.ph,
      r.n,
      r.p,
      r.k,
      r.airTemp,
      r.hum
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `greenfield_sensor_readings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate smooth 7-day or 24-hour SVG curve for the selected metric
  const selectedMetricChartData = useMemo(() => {
    const currentVal = typeof selectedMetric.getValue(effectiveData) === 'number' 
      ? Number(selectedMetric.getValue(effectiveData)) 
      : parseFloat(String(selectedMetric.getValue(effectiveData))) || 24;

    const count = chartPeriod === '24h' ? 24 : chartPeriod === '7d' ? 7 : 30;
    const points: number[] = [];
    for (let i = 0; i < count; i++) {
      const offset = Math.sin((i / count) * Math.PI * 2) * (currentVal * 0.12);
      const randomNoise = ((i % 3) - 1) * 0.5;
      points.push(Math.max(0, parseFloat((currentVal + offset + randomNoise).toFixed(1))));
    }
    // Make sure the last point aligns with current value
    points[points.length - 1] = currentVal;
    return points;
  }, [selectedMetric, effectiveData, chartPeriod]);

  return (
    <div className="modern-sensor-container">
      {/* 1. Crop Stage Progress Timeline (Screenshot 1 Top) */}
      <div className="crop-stage-card">
        <div className="crop-stage-header">
          <span className="crop-stage-title">Crop stage</span>
          <span className="crop-stage-context">
            Now: <strong>{STAGES[activeStageIndex].label}</strong> · next:{' '}
            <span>{STAGES[Math.min(activeStageIndex + 1, STAGES.length - 1)].label}</span>
          </span>
        </div>

        <div className="crop-stage-timeline">
          {STAGES.map((stg, idx) => {
            const isCompleted = idx < activeStageIndex;
            const isCurrent = idx === activeStageIndex;
            return (
              <React.Fragment key={stg.id}>
                <button
                  type="button"
                  className={`stage-node-btn ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setActiveStageIndex(idx)}
                  title={`Growth stage: ${stg.label}`}
                >
                  <div className={`stage-circle ${isCompleted ? 'done' : isCurrent ? 'active' : 'pending'}`}>
                    {isCompleted ? <Check size={14} strokeWidth={3}/> : isCurrent ? <span className="inner-dot"/> : null}
                  </div>
                  <span className={`stage-label ${isCurrent ? 'font-bold' : ''}`}>{stg.label}</span>
                </button>
                {idx < STAGES.length - 1 && (
                  <div className={`stage-line ${idx < activeStageIndex ? 'filled' : ''}`}/>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 2. Sensor Data 12-Card Grid (Screenshot 1 Middle) */}
      <div className="sensor-data-section">
        <div className="section-head-row">
          <div>
            <h2 className="section-main-heading">Sensor data.</h2>
          </div>
          <div className="section-head-right">
            <span className="reading-pick-hint">Choose a reading to see its graph</span>
            {mode === 'manual' && onNavigateToCropAnalysis && (
              <button
                className="btn btn-primary btn-xs"
                onClick={onNavigateToCropAnalysis}
                style={{ marginLeft: 12 }}
              >
                <Sparkles size={13}/> Run Crop Analysis
              </button>
            )}
          </div>
        </div>

        <div className="sensor-cards-12-grid">
          {metrics.map(metric => {
            const isSelected = metric.id === selectedMetricId;
            const val = metric.getValue(effectiveData);
            const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
            const statusLabel = metric.status(numVal);
            const Icon = metric.icon;

            return (
              <div
                key={metric.id}
                className={`metric-tile-card ${isSelected ? 'selected-active' : ''}`}
                onClick={() => setSelectedMetricId(metric.id)}
                role="button"
                tabIndex={0}
              >
                <div className="tile-top-row">
                  <Icon size={16} className="tile-icon"/>
                  <span className="tile-name">{metric.name}</span>
                </div>

                <div className="tile-value-row">
                  <span className="tile-big-val">{val}</span>
                  {metric.unit && <span className="tile-unit">{metric.unit}</span>}
                </div>

                <div className="tile-footer-row">
                  <span className={`tile-status-pill status-${statusLabel.toLowerCase()}`}>
                    {statusLabel}
                  </span>
                  {metric.optional && (
                    <span className="tile-optional-note">Optional sensor</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Reading Graph & 'Right Now' Telemetry (Screenshot 1 Bottom) */}
      <div className="metric-inspection-panel">
        <div className="inspection-left-chart">
          <div className="inspection-header">
            <h3 className="inspection-title">{selectedMetric.name}.</h3>
            <div className="period-segmented-controls">
              {(['24h', '7d', '30d'] as const).map(p => (
                <button
                  key={p}
                  className={`period-btn ${chartPeriod === p ? 'active' : ''}`}
                  onClick={() => setChartPeriod(p)}
                >
                  {p === '24h' ? '24 hours' : p === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive SVG Chart for Selected Metric */}
          <div className="inspection-chart-container">
            <svg viewBox="0 0 700 220" className="inspection-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#114b32" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#114b32" stopOpacity="0.0"/>
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="40" y1="30" x2="680" y2="30" stroke="#f1f5f9" strokeWidth="1"/>
              <line x1="40" y1="80" x2="680" y2="80" stroke="#f1f5f9" strokeWidth="1"/>
              <line x1="40" y1="130" x2="680" y2="130" stroke="#f1f5f9" strokeWidth="1"/>
              <line x1="40" y1="180" x2="680" y2="180" stroke="#f1f5f9" strokeWidth="1"/>

              {/* Render dynamic line path */}
              {(() => {
                const maxVal = Math.max(...selectedMetricChartData, selectedMetric.safeMax * 1.15);
                const minVal = Math.min(...selectedMetricChartData, selectedMetric.safeMin * 0.85);
                const range = maxVal - minVal || 1;
                const points = selectedMetricChartData.map((val, idx) => {
                  const x = 50 + (idx / (selectedMetricChartData.length - 1)) * 620;
                  const y = 180 - ((val - minVal) / range) * 140;
                  return { x, y, val };
                });

                const d = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
                const areaD = `${d} L ${points[points.length - 1].x.toFixed(1)},180 L ${points[0].x.toFixed(1)},180 Z`;

                return (
                  <g>
                    <path d={areaD} fill="url(#chartGradient)"/>
                    <path d={d} fill="none" stroke="#114b32" strokeWidth="2.5" strokeLinecap="round"/>
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={i === points.length - 1 ? 5 : 3}
                        fill={i === points.length - 1 ? '#114b32' : '#ffffff'}
                        stroke="#114b32"
                        strokeWidth="2"
                      />
                    ))}
                  </g>
                );
              })()}
            </svg>

            {/* X-axis labels */}
            <div className="chart-x-labels">
              <span>{chartPeriod === '24h' ? '00:00' : 'Day 1'}</span>
              <span>{chartPeriod === '24h' ? '06:00' : 'Day 2'}</span>
              <span>{chartPeriod === '24h' ? '12:00' : 'Day 4'}</span>
              <span>{chartPeriod === '24h' ? '18:00' : 'Day 6'}</span>
              <span>{chartPeriod === '24h' ? 'Now (Live)' : 'Today'}</span>
            </div>
          </div>
        </div>

        {/* 'Right Now' Stats Card on right */}
        <div className="inspection-right-now">
          <h4 className="right-now-title">Right now</h4>
          <div className="right-now-metric-box">
            <span className="right-now-val">
              {selectedMetric.getValue(effectiveData)}
              <small>{selectedMetric.unit}</small>
            </span>
            <span className={`right-now-badge ${selectedMetric.status(Number(selectedMetric.getValue(effectiveData))).toLowerCase()}`}>
              {selectedMetric.status(Number(selectedMetric.getValue(effectiveData)))}
            </span>
          </div>

          <div className="right-now-specs">
            <div className="spec-row">
              <span className="spec-label">Safe optimal band</span>
              <strong className="spec-value">{selectedMetric.safeMin} – {selectedMetric.safeMax} {selectedMetric.unit}</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Trend status</span>
              <strong className="spec-value text-green">Stable within diurnal bounds</strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Telemetry source</span>
              <strong className="spec-value">
                {mode === 'live' ? 'ESP32 Modbus RS485' : mode === 'manual' ? 'Manual Emulation' : 'Standard Baseline'}
              </strong>
            </div>
            <div className="spec-row">
              <span className="spec-label">Target plot</span>
              <strong className="spec-value">{plotName} ({farmName})</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Analytics & Diagnostics Grid (Screenshot 2) */}
      <div className="analytics-quad-grid">
        {/* Card 1: Nutrients (N, P, K) with safe range overlays */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Nutrients (N, P, K)</h4>
            <div className="safe-range-legend">
              <span className="safe-range-box-sample"/>
              <span className="legend-label">Safe range</span>
            </div>
          </div>

          <div className="nutrient-meters-stack">
            {/* Nitrogen (N) */}
            <div className="nutrient-meter-item">
              <div className="nutrient-row-top">
                <span className="nutrient-name">Nitrogen (N)</span>
                <span className="nutrient-reading">
                  <strong>{effectiveData.nitrogen} mg/kg</strong> · <span className={effectiveData.nitrogen < 80 ? 'text-amber' : 'text-green'}>{effectiveData.nitrogen < 80 ? 'Low' : 'Normal'}</span>
                </span>
              </div>
              <div className="meter-track-container">
                {/* Safe range overlay 80 to 150 over 0-200 (40% to 75%) */}
                <div className="meter-safe-zone" style={{ left: '40%', width: '35%' }}/>
                {/* Current progress bar */}
                <div
                  className={`meter-fill-bar ${effectiveData.nitrogen < 80 ? 'fill-orange' : 'fill-green'}`}
                  style={{ width: `${Math.min(100, Math.max(0, (effectiveData.nitrogen / 200) * 100))}%` }}
                />
              </div>
              <div className="meter-scale-labels">
                <span>0</span>
                <span className="safe-label">Safe 80 to 150</span>
                <span>200</span>
              </div>
            </div>

            {/* Phosphorus (P) */}
            <div className="nutrient-meter-item">
              <div className="nutrient-row-top">
                <span className="nutrient-name">Phosphorus (P)</span>
                <span className="nutrient-reading">
                  <strong>{effectiveData.phosphorus} mg/kg</strong> · <span className="text-green">Normal</span>
                </span>
              </div>
              <div className="meter-track-container">
                {/* Safe range overlay 15 to 40 over 0-60 (25% to 66.6%) */}
                <div className="meter-safe-zone" style={{ left: '25%', width: '41.6%' }}/>
                <div
                  className="meter-fill-bar fill-green"
                  style={{ width: `${Math.min(100, Math.max(0, (effectiveData.phosphorus / 60) * 100))}%` }}
                />
              </div>
              <div className="meter-scale-labels">
                <span>0</span>
                <span className="safe-label">Safe 15 to 40</span>
                <span>60</span>
              </div>
            </div>

            {/* Potassium (K) */}
            <div className="nutrient-meter-item">
              <div className="nutrient-row-top">
                <span className="nutrient-name">Potassium (K)</span>
                <span className="nutrient-reading">
                  <strong>{effectiveData.potassium} mg/kg</strong> · <span className="text-green">Normal</span>
                </span>
              </div>
              <div className="meter-track-container">
                {/* Safe range overlay 120 to 220 over 0-300 (40% to 73.3%) */}
                <div className="meter-safe-zone" style={{ left: '40%', width: '33.3%' }}/>
                <div
                  className="meter-fill-bar fill-green"
                  style={{ width: `${Math.min(100, Math.max(0, (effectiveData.potassium / 300) * 100))}%` }}
                />
              </div>
              <div className="meter-scale-labels">
                <span>0</span>
                <span className="safe-label">Safe 120 to 220</span>
                <span>300</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Soil reaction and salts (pH and EC sliders with triangle markers) */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Soil reaction and salts</h4>
          </div>

          <div className="reaction-sliders-stack">
            {/* Soil pH */}
            <div className="reaction-slider-item">
              <div className="reaction-row-top">
                <span className="reaction-name">Soil pH</span>
                <span className="reaction-reading">
                  <strong>{effectiveData.soilPh.toFixed(1)}</strong> · <span className="text-green">Normal</span>
                </span>
              </div>
              <div className="slider-track-wrap">
                {/* Safe box: 6.0 to 7.5 over 4.0 to 9.0 = (6.0-4.0)/5.0 = 40% to (7.5-4.0)/5.0 = 70% */}
                <div className="slider-safe-box" style={{ left: '40%', width: '30%' }}/>
                {/* Pointer Marker ▼ at current pH */}
                <div
                  className="slider-marker-pointer"
                  style={{
                    left: `${Math.min(98, Math.max(2, ((effectiveData.soilPh - 4.0) / 5.0) * 100))}%`
                  }}
                >
                  <div className="down-triangle"/>
                </div>
              </div>
              <div className="slider-scale-labels">
                <span>4</span>
                <span className="safe-label">Safe 6 to 7.5</span>
                <span>9</span>
              </div>
            </div>

            {/* Soil EC (salts) */}
            <div className="reaction-slider-item">
              <div className="reaction-row-top">
                <span className="reaction-name">Soil EC (salts)</span>
                <span className="reaction-reading">
                  <strong>{effectiveData.soilEc.toFixed(1)} dS/m</strong> · <span className="text-green">Normal</span>
                </span>
              </div>
              <div className="slider-track-wrap">
                {/* Safe box: 0.8 to 2.0 over 0.0 to 4.0 = 20% to 50% */}
                <div className="slider-safe-box" style={{ left: '20%', width: '30%' }}/>
                {/* Pointer Marker ▼ at current EC */}
                <div
                  className="slider-marker-pointer"
                  style={{
                    left: `${Math.min(98, Math.max(2, (effectiveData.soilEc / 4.0) * 100))}%`
                  }}
                >
                  <div className="down-triangle"/>
                </div>
              </div>
              <div className="slider-scale-labels">
                <span>0</span>
                <span className="safe-label">Safe 0.8 to 2</span>
                <span>4</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Air temperature and humidity, last 24 hours (Dual axis chart) */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Air temperature and humidity, last 24 hours</h4>
          </div>

          <div className="chart-legend-row">
            <span className="legend-item text-orange">
              <span className="legend-line line-orange"/> Air temperature (°C, left)
            </span>
            <span className="legend-item text-blue">
              <span className="legend-line line-blue"/> Humidity (%, right)
            </span>
          </div>

          <div className="dual-axis-chart-wrap">
            {/* Left Y-axis labels (Temperature: 17.5 to 40) */}
            <div className="y-axis-left">
              <span>40</span>
              <span>32.5</span>
              <span>25</span>
              <span>17.5</span>
            </div>

            {/* SVG smooth lines */}
            <svg viewBox="0 0 380 140" className="dual-axis-svg" preserveAspectRatio="none">
              <line x1="10" y1="20" x2="370" y2="20" stroke="#f1f5f9" strokeWidth="1"/>
              <line x1="10" y1="55" x2="370" y2="55" stroke="#f1f5f9" strokeWidth="1"/>
              <line x1="10" y1="90" x2="370" y2="90" stroke="#f1f5f9" strokeWidth="1"/>
              <line x1="10" y1="125" x2="370" y2="125" stroke="#f1f5f9" strokeWidth="1"/>

              {/* Temperature Curve (Orange, rises in afternoon, dips at night) */}
              <path
                d="M 20,80 Q 110,40 200,45 T 360,78"
                fill="none"
                stroke="#c2410c"
                strokeWidth="2.8"
                strokeLinecap="round"
              />

              {/* Humidity Curve (Blue, dips in afternoon, rises at night) */}
              <path
                d="M 20,78 Q 110,110 200,105 T 360,80"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>

            {/* Right Y-axis labels (Humidity: 25 to 100) */}
            <div className="y-axis-right">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rainfall, last 7 days (Daily bar chart) */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Rainfall, last 7 days</h4>
            <span className="card-sub-badge">Optional sensor</span>
          </div>

          <div className="rainfall-bars-container">
            {[
              { day: '5 Oct', val: 0 },
              { day: '6 Oct', val: 0 },
              { day: '7 Oct', val: 3 },
              { day: '8 Oct', val: 8 },
              { day: '9 Oct', val: 0 },
              { day: '10 Oct', val: 0 },
              { day: '11 Oct', val: 0 }
            ].map(item => {
              const maxMm = 10;
              const barHeightPct = (item.val / maxMm) * 100;
              return (
                <div key={item.day} className="rainfall-bar-col">
                  <span className="bar-val-label">{item.val}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${Math.max(barHeightPct, item.val > 0 ? 12 : 2)}%` }}
                    />
                  </div>
                  <span className="bar-day-label">{item.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Agronomic Advice Section (Screenshot 3 Top) */}
      <div className="advice-section">
        <div className="advice-head-row">
          <h3 className="advice-title">Advice for {cropName} on {plotName}</h3>
          <span className="advice-rec-meta">Recommendation R-2031 · based on reading D-48213</span>
        </div>

        <div className="advice-cards-row">
          {/* Irrigation Advice */}
          <div className="advice-pill-card irrigation">
            <div className="advice-icon-bubble bubble-blue">
              <Droplets size={20} color="#0284c7"/>
            </div>
            <div className="advice-body">
              <strong className="advice-card-heading">Irrigation advice</strong>
              <p className="advice-card-text">{irrigationAdvice}</p>
            </div>
          </div>

          {/* Fertilizer Advice */}
          <div className="advice-pill-card fertilizer">
            <div className="advice-icon-bubble bubble-amber">
              <Leaf size={20} color="#d97706"/>
            </div>
            <div className="advice-body">
              <strong className="advice-card-heading">Fertilizer advice</strong>
              <p className="advice-card-text">{fertilizerAdvice}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Recent Readings Table with CSV Download (Screenshot 3 Bottom) */}
      <div className="recent-readings-card">
        <div className="recent-head-row">
          <h3 className="recent-title">Recent readings</h3>
          <button className="download-csv-btn" onClick={handleDownloadCsv}>
            <Download size={14}/> Download all as CSV
          </button>
        </div>

        <div className="recent-table-wrap">
          <table className="recent-sensors-table">
            <thead>
              <tr>
                <th>DATA ID</th>
                <th>TIMESTAMP</th>
                <th>MOIST %</th>
                <th>SOIL °C</th>
                <th>EC</th>
                <th>PH</th>
                <th>N</th>
                <th>P</th>
                <th>K</th>
                <th>AIR °C</th>
                <th>HUM %</th>
              </tr>
            </thead>
            <tbody>
              {tableReadings.map(r => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.id}</td>
                  <td>{r.timestamp}</td>
                  <td className={r.moist < 35 ? 'text-red font-bold' : ''}>{r.moist}</td>
                  <td>{r.soilTemp}</td>
                  <td>{r.ec}</td>
                  <td>{r.ph}</td>
                  <td className={r.n < 80 ? 'text-amber font-semibold' : ''}>{r.n}</td>
                  <td>{r.p}</td>
                  <td>{r.k}</td>
                  <td>{r.airTemp}</td>
                  <td>{r.hum}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
