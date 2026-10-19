import { useState } from 'react';
import {
  Sliders, Droplets, Thermometer, Waves, Activity, Radio,
  Sparkles, RotateCcw, ArrowRight, CloudRain
} from 'lucide-react';
import type { SoilAndEnvReadings } from '../services/cropAnalysisEngine';
import { DEMO_SCENARIOS } from '../services/cropAnalysisEngine';

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

  const handleApplyPreset = (scenarioId: string) => {
    setSelectedPreset(scenarioId);
    const found = DEMO_SCENARIOS.find(p => p.id === scenarioId);
    if (found) {
      onChange({ ...found.readings });
    }
  };

  const handleResetDefaults = () => {
    setSelectedPreset('custom');
    onChange({
      airTemperature: 27.0,
      relativeHumidity: 60.0,
      soilMoisture: 48.0,
      soilTemperature: 25.0,
      soilPh: 6.5,
      ec: 650,
      nitrogen: 125,
      phosphorus: 65,
      potassium: 115,
      rainfall: 0.0
    });
  };

  const handleSingleField = (key: keyof SoilAndEnvReadings, val: number) => {
    setSelectedPreset('custom');
    onChange({ ...readings, [key]: val });
  };

  const airTemp = readings.airTemperature ?? 27.0;
  const humidity = readings.relativeHumidity ?? 60.0;
  const moisture = readings.soilMoisture ?? 48.0;
  const soilTemp = readings.soilTemperature ?? 25.0;
  const ph = readings.soilPh ?? 6.5;
  const ec = readings.ec ?? 650;
  const n = readings.nitrogen ?? 125;
  const p = readings.phosphorus ?? 65;
  const k = readings.potassium ?? 115;
  const rain = readings.rainfall ?? 0.0;

  return (
    <div className="manual-mode-control-panel">
      {/* Top Banner */}
      <div className="manual-panel-header">
        <div className="manual-title-block">
          <span className="source-pill manual">MANUAL INPUT MODE ACTIVE</span>
          <h3>Interactive Sensor Emulation & Parameter Lab</h3>
          <p>
            Simulate custom soil and weather readings without physical hardware. Values drive dashboard gauges, alerts, and the crop analysis recommendation engine in real time.
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
        <span className="presets-label"><Sliders size={14}/> Quick Demonstration Scenarios:</span>
        <div className="preset-buttons-wrap">
          {DEMO_SCENARIOS.map(scenario => (
            <button
              key={scenario.id}
              className={`preset-btn ${selectedPreset === scenario.id ? 'active' : ''}`}
              onClick={() => handleApplyPreset(scenario.id)}
              title={scenario.description}
            >
              <strong>{scenario.name}</strong>
            </button>
          ))}
          <button
            className="preset-btn reset-btn"
            onClick={handleResetDefaults}
            title="Reset to default balanced values"
          >
            <RotateCcw size={12}/> Reset
          </button>
        </div>
      </div>

      {/* Interactive Controls Sliders */}
      <div className="manual-sliders-grid">
        {/* Soil Moisture */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Droplets size={16} color="#2f8b57"/> Soil Moisture</span>
            <strong>{moisture.toFixed(1)} %</strong>
          </div>
          <input
            type="range"
            min="10"
            max="95"
            step="1"
            value={moisture}
            onChange={e => handleSingleField('soilMoisture', parseFloat(e.target.value))}
            className="slider-accent-green"
          />
          <div className="slider-scale-limits">
            <span>10% (Wilting)</span>
            <span>50% (Field Capacity)</span>
            <span>95% (Waterlogged)</span>
          </div>
        </div>

        {/* Air Temperature */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Thermometer size={16} color="#dc8152"/> Air Temperature</span>
            <strong>{airTemp.toFixed(1)} °C</strong>
          </div>
          <input
            type="range"
            min="10"
            max="48"
            step="0.5"
            value={airTemp}
            onChange={e => handleSingleField('airTemperature', parseFloat(e.target.value))}
            className="slider-accent-orange"
          />
          <div className="slider-scale-limits">
            <span>10°C (Cold)</span>
            <span>26°C (Optimal)</span>
            <span>48°C (Extreme Heat)</span>
          </div>
        </div>

        {/* Relative Humidity */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Waves size={16} color="#5389c7"/> Relative Humidity</span>
            <strong>{humidity.toFixed(0)} %</strong>
          </div>
          <input
            type="range"
            min="15"
            max="98"
            step="1"
            value={humidity}
            onChange={e => handleSingleField('relativeHumidity', parseFloat(e.target.value))}
            className="slider-accent-blue"
          />
          <div className="slider-scale-limits">
            <span>15% (Dry Air)</span>
            <span>60% (Moderate)</span>
            <span>98% (High Blight Risk)</span>
          </div>
        </div>

        {/* Soil pH */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Activity size={16} color="#8d73c6"/> Soil pH</span>
            <strong>{ph.toFixed(2)} pH</strong>
          </div>
          <input
            type="range"
            min="4.0"
            max="9.5"
            step="0.05"
            value={ph}
            onChange={e => handleSingleField('soilPh', parseFloat(e.target.value))}
            className="slider-accent-purple"
          />
          <div className="slider-scale-limits">
            <span>4.0 (Strong Acid)</span>
            <span>6.8 (Neutral)</span>
            <span>9.5 (Strong Alkaline)</span>
          </div>
        </div>

        {/* Electrical Conductivity (EC) */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><Radio size={16} color="#4a85a4"/> Salinity (EC)</span>
            <strong>{ec} µS/cm</strong>
          </div>
          <input
            type="range"
            min="100"
            max="3500"
            step="50"
            value={ec}
            onChange={e => handleSingleField('ec', parseInt(e.target.value))}
            className="slider-accent-slate"
          />
          <div className="slider-scale-limits">
            <span>100 (Low Salt)</span>
            <span>700 (Safe)</span>
            <span>3500 (Severe Salinity)</span>
          </div>
        </div>

        {/* Rainfall */}
        <div className="manual-slider-card">
          <div className="slider-header-row">
            <span className="slider-icon-label"><CloudRain size={16} color="#0284c7"/> Recent Rain</span>
            <strong>{rain.toFixed(1)} mm</strong>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={rain}
            onChange={e => handleSingleField('rainfall', parseFloat(e.target.value))}
            className="slider-accent-blue"
          />
          <div className="slider-scale-limits">
            <span>0 mm (Dry)</span>
            <span>25 mm (Shower)</span>
            <span>100 mm (Downpour)</span>
          </div>
        </div>
      </div>

      {/* NPK Macronutrients Row */}
      <div className="manual-npk-row">
        <div className="npk-indicator-chip">
          <label>Available Nitrogen (N)</label>
          <div className="npk-stepper">
            <input
              type="number"
              min="10"
              max="350"
              value={n}
              onChange={e => handleSingleField('nitrogen', parseInt(e.target.value) || 0)}
            />
            <span>kg/ha</span>
          </div>
        </div>

        <div className="npk-indicator-chip">
          <label>Available Phosphorus (P)</label>
          <div className="npk-stepper">
            <input
              type="number"
              min="5"
              max="200"
              value={p}
              onChange={e => handleSingleField('phosphorus', parseInt(e.target.value) || 0)}
            />
            <span>kg/ha</span>
          </div>
        </div>

        <div className="npk-indicator-chip">
          <label>Available Potassium (K)</label>
          <div className="npk-stepper">
            <input
              type="number"
              min="10"
              max="350"
              value={k}
              onChange={e => handleSingleField('potassium', parseInt(e.target.value) || 0)}
            />
            <span>kg/ha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
