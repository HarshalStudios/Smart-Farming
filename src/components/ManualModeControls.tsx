import { useState } from 'react';
import {
  Sliders, Droplets, Thermometer, Waves, Activity, Radio,
  Sparkles, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2, CloudRain
} from 'lucide-react';
import type { SoilAndEnvReadings } from '../services/cropAnalysisEngine';

interface ManualModeControlsProps {
  readings: SoilAndEnvReadings;
  onChange: (updated: SoilAndEnvReadings) => void;
  onNavigateToAnalysis: () => void;
}

export default function ManualModeControls({
  readings,
  onChange,
  onNavigateToAnalysis
}: ManualModeControlsProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  const presets: { id: string; name: string; description: string; values: SoilAndEnvReadings }[] = [
    {
      id: 'optimal',
      name: '🌱 Balanced & Optimal',
      description: 'Healthy moisture, ideal pH 6.5, balanced NPK for normal growth',
      values: {
        airTemperature: 26.0,
        relativeHumidity: 62,
        soilMoisture: 50.0,
        soilTemperature: 24.5,
        soilPh: 6.5,
        ec: 650,
        nitrogen: 125,
        phosphorus: 70,
        potassium: 120,
        rainfall: 0.0
      }
    },
    {
      id: 'drought',
      name: '☀️ Severe Drought & Heat Stress',
      description: 'High temperature 37°C, low moisture 18%, vapor pressure deficit',
      values: {
        airTemperature: 37.0,
        relativeHumidity: 28,
        soilMoisture: 18.0,
        soilTemperature: 32.0,
        soilPh: 7.2,
        ec: 1100,
        nitrogen: 90,
        phosphorus: 40,
        potassium: 85,
        rainfall: 0.0
      }
    },
    {
      id: 'acidic-low-n',
      name: '🧪 Acidic Soil & Nitrogen Deficient',
      description: 'pH 5.1 (aluminum toxicity risk), severely low N (35 kg/ha)',
      values: {
        airTemperature: 24.0,
        relativeHumidity: 68,
        soilMoisture: 46.0,
        soilTemperature: 22.0,
        soilPh: 5.1,
        ec: 580,
        nitrogen: 35,
        phosphorus: 55,
        potassium: 95,
        rainfall: 2.0
      }
    },
    {
      id: 'saline-waterlogged',
      name: '🌊 Saline Soil & Waterlogged',
      description: 'High moisture 88% (anaerobic roots), EC 2800 µS/cm, alkaline pH 8.4',
      values: {
        airTemperature: 28.5,
        relativeHumidity: 82,
        soilMoisture: 88.0,
        soilTemperature: 26.0,
        soilPh: 8.4,
        ec: 2800,
        nitrogen: 145,
        phosphorus: 65,
        potassium: 130,
        rainfall: 18.5
      }
    },
    {
      id: 'monsoon-fungal',
      name: '🌧️ Monsoon Rain & Blight Risk',
      description: 'High humidity 92%, heavy rainfall 48mm, high fungal spore germination risk',
      values: {
        airTemperature: 25.5,
        relativeHumidity: 92,
        soilMoisture: 78.0,
        soilTemperature: 24.0,
        soilPh: 6.7,
        ec: 450,
        nitrogen: 110,
        phosphorus: 50,
        potassium: 105,
        rainfall: 48.0
      }
    }
  ];

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = presets.find(p => p.id === presetId);
    if (found) {
      onChange(found.values);
    }
  };

  const handleSingleField = (key: keyof SoilAndEnvReadings, val: number) => {
    setSelectedPreset('custom');
    onChange({ ...readings, [key]: val });
  };

  return (
    <div className="manual-mode-control-panel">
      {/* Top Banner */}
      <div className="manual-panel-header">
        <div className="manual-title-block">
          <span className="source-pill manual">MANUAL INPUT MODE ACTIVE</span>
          <h3>Interactive Sensor Emulation & Parameter Lab</h3>
          <p>
            Simulate custom field readings on the fly without physical hardware. Values instantly drive dashboard gauges, alerts, and the crop analysis recommendation engine.
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={onNavigateToAnalysis}
        >
          <Sparkles size={14}/> Test in Crop Analysis <ArrowRight size={14}/>
        </button>
      </div>

      {/* Scenario Presets Row */}
      <div className="manual-presets-bar">
        <span className="presets-label"><Sliders size={14}/> Quick Scenarios:</span>
        <div className="preset-buttons-wrap">
          {presets.map(preset => (
            <button
              key={preset.id}
              className={`preset-btn ${selectedPreset === preset.id ? 'active' : ''}`}
              onClick={() => handleApplyPreset(preset.id)}
              title={preset.description}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Controls Sliders */}
      <div className="manual-sliders-grid">
        {/* Air Temperature */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Thermometer size={16} color="#dc8152"/> Air Temperature</span>
            <strong>{readings.airTemperature.toFixed(1)} °C</strong>
          </div>
          <input
            type="range"
            min="10"
            max="45"
            step="0.5"
            value={readings.airTemperature}
            onChange={e => handleSingleField('airTemperature', parseFloat(e.target.value))}
            className="slider-accent-orange"
          />
          <div className="slider-scale-limits">
            <span>10°C (Cold)</span>
            <span>25°C</span>
            <span>45°C (Extreme Heat)</span>
          </div>
        </div>

        {/* Relative Humidity */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Waves size={16} color="#5389c7"/> Relative Humidity</span>
            <strong>{readings.relativeHumidity.toFixed(0)} %</strong>
          </div>
          <input
            type="range"
            min="15"
            max="98"
            step="1"
            value={readings.relativeHumidity}
            onChange={e => handleSingleField('relativeHumidity', parseFloat(e.target.value))}
            className="slider-accent-blue"
          />
          <div className="slider-scale-limits">
            <span>15% (Dry Air)</span>
            <span>60%</span>
            <span>98% (Saturated)</span>
          </div>
        </div>

        {/* Soil Moisture */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Droplets size={16} color="#2f8b57"/> Soil Moisture</span>
            <strong>{readings.soilMoisture.toFixed(1)} %</strong>
          </div>
          <input
            type="range"
            min="10"
            max="95"
            step="0.5"
            value={readings.soilMoisture}
            onChange={e => handleSingleField('soilMoisture', parseFloat(e.target.value))}
            className="slider-accent-green"
          />
          <div className="slider-scale-limits">
            <span>10% (Wilting)</span>
            <span>50% (Field Cap)</span>
            <span>95% (Waterlogged)</span>
          </div>
        </div>

        {/* Soil pH */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Activity size={16} color="#8d73c6"/> Soil pH</span>
            <strong>{readings.soilPh.toFixed(2)} pH</strong>
          </div>
          <input
            type="range"
            min="4.5"
            max="9.0"
            step="0.05"
            value={readings.soilPh}
            onChange={e => handleSingleField('soilPh', parseFloat(e.target.value))}
            className="slider-accent-purple"
          />
          <div className="slider-scale-limits">
            <span>4.5 (Strong Acid)</span>
            <span>6.5 - 7.0 (Neutral)</span>
            <span>9.0 (Alkaline)</span>
          </div>
        </div>

        {/* Electrical Conductivity (EC) */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Radio size={16} color="#4a85a4"/> Electrical Cond. (EC)</span>
            <strong>{readings.ec} µS/cm</strong>
          </div>
          <input
            type="range"
            min="100"
            max="3500"
            step="50"
            value={readings.ec}
            onChange={e => handleSingleField('ec', parseInt(e.target.value))}
            className="slider-accent-slate"
          />
          <div className="slider-scale-limits">
            <span>100 (Fresh)</span>
            <span>1200 (Moderate)</span>
            <span>3500 (Severe Salinity)</span>
          </div>
        </div>

        {/* Rainfall */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><CloudRain size={16} color="#387ba3"/> Interval Rainfall</span>
            <strong>{(readings.rainfall ?? 0).toFixed(1)} mm</strong>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="0.5"
            value={readings.rainfall ?? 0}
            onChange={e => handleSingleField('rainfall', parseFloat(e.target.value))}
            className="slider-accent-blue"
          />
          <div className="slider-scale-limits">
            <span>0 mm</span>
            <span>15 mm (Shower)</span>
            <span>60 mm (Downpour)</span>
          </div>
        </div>
      </div>

      {/* Nutrients NPK Row */}
      <div className="manual-npk-row">
        <div className="npk-indicator-chip">
          <label>Nitrogen (N)</label>
          <div className="npk-stepper">
            <input
              type="number"
              min="0"
              max="400"
              value={readings.nitrogen}
              onChange={e => handleSingleField('nitrogen', parseInt(e.target.value) || 0)}
            />
            <span>kg/ha</span>
          </div>
        </div>

        <div className="npk-indicator-chip">
          <label>Phosphorus (P)</label>
          <div className="npk-stepper">
            <input
              type="number"
              min="0"
              max="250"
              value={readings.phosphorus}
              onChange={e => handleSingleField('phosphorus', parseInt(e.target.value) || 0)}
            />
            <span>kg/ha</span>
          </div>
        </div>

        <div className="npk-indicator-chip">
          <label>Potassium (K)</label>
          <div className="npk-stepper">
            <input
              type="number"
              min="0"
              max="400"
              value={readings.potassium}
              onChange={e => handleSingleField('potassium', parseInt(e.target.value) || 0)}
            />
            <span>kg/ha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
