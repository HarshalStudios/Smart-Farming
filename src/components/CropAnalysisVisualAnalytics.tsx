import React from 'react';
import {
  Activity, Droplets, Thermometer, Waves, Radio, Sprout,
  AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight,
  TrendingUp, Leaf, Info, Calendar, Gauge, Sparkles
} from 'lucide-react';
import type { CropAnalysisResult, SoilAndEnvReadings } from '../services/cropAnalysisEngine';
import { CROPS_CATALOG, type CropProfile } from '../data/cropsData';

interface CropAnalysisVisualAnalyticsProps {
  result: CropAnalysisResult;
  readings: SoilAndEnvReadings;
  cropProfile?: CropProfile;
  onNavigateToCropDetail?: (cropId: string) => void;
}

export default function CropAnalysisVisualAnalytics({
  result,
  readings,
  cropProfile,
  onNavigateToCropDetail
}: CropAnalysisVisualAnalyticsProps) {
  const crop = cropProfile || CROPS_CATALOG.find(c => c.id === result.cropId) || CROPS_CATALOG[0];

  // Map each aspect to a score 0-100 for visual comparison
  const aspectScores = result.aspects.map(asp => {
    let score = 90;
    if (asp.status === 'Normal') score = 95;
    else if (asp.status === 'Watch') score = 75;
    else if (asp.status === 'Warning') score = 55;
    else if (asp.status === 'Critical') score = 30;
    return {
      title: asp.aspectTitle,
      status: asp.status,
      measured: asp.measuredValue,
      score,
      explanation: asp.explanation,
      action: asp.recommendedAction
    };
  });

  const soilPh = readings.soilPh ?? 6.8;
  const soilEcDsM = readings.ec ? parseFloat((readings.ec / 1000).toFixed(1)) : 1.2;
  const nitrogen = readings.nitrogen ?? 76;
  const phosphorus = readings.phosphorus ?? 24;
  const potassium = readings.potassium ?? 162;
  const soilMoisture = readings.soilMoisture ?? 24;
  const targetMoisture = crop.optimalRanges.moistureOptimal;

  return (
    <div className="visual-analytics-root">
      {/* 1. Hero Analytics Bar: Score + Phenology + Key Actions */}
      <div className="analytics-hero-banner">
        <div className="analytics-hero-left">
          {/* Radial score gauge */}
          <div className="score-ring-wrap">
            <svg viewBox="0 0 100 100" className="score-ring-svg">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={
                  result.healthScore >= 80 ? '#16a34a' :
                  result.healthScore >= 60 ? '#d97706' : '#dc2626'
                }
                strokeWidth="8"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * result.healthScore) / 100}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="score-ring-center">
              <span className="score-ring-num">{result.healthScore}</span>
              <span className="score-ring-denom">/ 100</span>
            </div>
          </div>

          <div className="score-summary-text">
            <div className="score-headline-row">
              <span className="score-eyebrow">COMPREHENSIVE AGRONOMIC RATING</span>
              <h2 className="score-rating-title">{result.healthRating}</h2>
            </div>
            <p className="score-brief">{result.healthSummary}</p>
            <div className="score-chips-row">
              <span className="metric-chip">
                {crop.emoji} {result.cropName}
              </span>
              <span className="metric-chip">
                Stage: <strong>{result.stageName}</strong>
              </span>
              <span className={`source-pill ${result.source}`}>
                {result.source === 'live' ? 'REAL SENSOR DATA' : result.source === 'demo' ? 'DEMONSTRATION' : 'MANUAL INPUT'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Kpi Tiles */}
        <div className="analytics-kpi-stack">
          <div className="kpi-micro-box">
            <small>IRRIGATION DEMAND</small>
            <strong className={result.irrigationDetails.indicated ? 'text-amber' : 'text-green'}>
              {result.irrigationDetails.indicated ? `${result.irrigationDetails.waterQuantityMm} mm required` : 'Adequate'}
            </strong>
            <span>{result.irrigationDetails.litresPerAcre ? `${result.irrigationDetails.litresPerAcre.toLocaleString()} L/acre` : 'No deficit'}</span>
          </div>

          <div className="kpi-micro-box">
            <small>CRITICAL NUTRIENT</small>
            <strong className={nitrogen < 80 ? 'text-amber' : 'text-green'}>
              {nitrogen < 80 ? 'Nitrogen Deficit' : 'Balanced'}
            </strong>
            <span>N: {nitrogen} · P: {phosphorus} · K: {potassium}</span>
          </div>

          <div className="kpi-micro-box">
            <small>SOIL CONDITION</small>
            <strong className="text-green">
              pH {soilPh.toFixed(1)} · {result.soilDiagnostics.phCategory}
            </strong>
            <span>EC: {soilEcDsM} dS/m (Safe)</span>
          </div>
        </div>
      </div>

      {/* 2. Phenological Crop Stage Stepper */}
      <div className="crop-stage-card mb-4">
        <div className="crop-stage-header">
          <span className="crop-stage-title">Growth Stage Phenology: {result.cropName}</span>
          <span className="crop-stage-context">
            Evaluated at: <strong>{result.stageName}</strong>
          </span>
        </div>

        <div className="crop-stage-timeline">
          {crop.growthStages.map((stg, idx) => {
            const currentStageIndex = crop.growthStages.findIndex(s => s.stageId === result.stageId);
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            return (
              <React.Fragment key={stg.stageId}>
                <div className={`stage-node-btn ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className={`stage-circle ${isCompleted ? 'done' : isCurrent ? 'active' : 'pending'}`}>
                    {isCompleted ? <CheckCircle2 size={14}/> : isCurrent ? <span className="inner-dot"/> : null}
                  </div>
                  <span className={`stage-label ${isCurrent ? 'font-bold' : ''}`}>{stg.name}</span>
                </div>
                {idx < crop.growthStages.length - 1 && (
                  <div className={`stage-line ${idx < currentStageIndex ? 'filled' : ''}`}/>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 3. Visual Charts Grid: Nutrients, Soil Reaction, Water Balance, 8 Aspects */}
      <div className="visual-charts-2x2-grid">
        {/* Chart A: Nutrients (N, P, K) with safe range overlay boxes */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Nutrients (N, P, K) Balance vs Target</h4>
            <div className="safe-range-legend">
              <span className="safe-range-box-sample"/>
              <span className="legend-label">Safe optimal zone</span>
            </div>
          </div>

          <div className="nutrient-meters-stack">
            {/* Nitrogen */}
            <div className="nutrient-meter-item">
              <div className="nutrient-row-top">
                <span className="nutrient-name">Nitrogen (N)</span>
                <span className="nutrient-reading">
                  <strong>{nitrogen} kg/ha</strong> · <span className={nitrogen < 80 ? 'text-amber' : 'text-green'}>{nitrogen < 80 ? 'Low (Deficit)' : 'Normal'}</span>
                </span>
              </div>
              <div className="meter-track-container">
                <div className="meter-safe-zone" style={{ left: '40%', width: '35%' }}/>
                <div
                  className={`meter-fill-bar ${nitrogen < 80 ? 'fill-orange' : 'fill-green'}`}
                  style={{ width: `${Math.min(100, (nitrogen / 200) * 100)}%` }}
                />
              </div>
              <div className="meter-scale-labels">
                <span>0</span>
                <span className="safe-label">Target safe 80 to 150 kg/ha</span>
                <span>200</span>
              </div>
            </div>

            {/* Phosphorus */}
            <div className="nutrient-meter-item">
              <div className="nutrient-row-top">
                <span className="nutrient-name">Phosphorus (P)</span>
                <span className="nutrient-reading">
                  <strong>{phosphorus} kg/ha</strong> · <span className="text-green">Normal</span>
                </span>
              </div>
              <div className="meter-track-container">
                <div className="meter-safe-zone" style={{ left: '25%', width: '41.6%' }}/>
                <div
                  className="meter-fill-bar fill-green"
                  style={{ width: `${Math.min(100, (phosphorus / 60) * 100)}%` }}
                />
              </div>
              <div className="meter-scale-labels">
                <span>0</span>
                <span className="safe-label">Target safe 15 to 40 kg/ha</span>
                <span>60</span>
              </div>
            </div>

            {/* Potassium */}
            <div className="nutrient-meter-item">
              <div className="nutrient-row-top">
                <span className="nutrient-name">Potassium (K)</span>
                <span className="nutrient-reading">
                  <strong>{potassium} kg/ha</strong> · <span className="text-green">Normal</span>
                </span>
              </div>
              <div className="meter-track-container">
                <div className="meter-safe-zone" style={{ left: '40%', width: '33.3%' }}/>
                <div
                  className="meter-fill-bar fill-green"
                  style={{ width: `${Math.min(100, (potassium / 300) * 100)}%` }}
                />
              </div>
              <div className="meter-scale-labels">
                <span>0</span>
                <span className="safe-label">Target safe 120 to 220 kg/ha</span>
                <span>300</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart B: Soil Reaction (pH) & Salinity (EC) Sliders with Pointer Needles */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Soil Reaction & Salinity Range Meters</h4>
          </div>

          <div className="reaction-sliders-stack">
            {/* Soil pH */}
            <div className="reaction-slider-item">
              <div className="reaction-row-top">
                <span className="reaction-name">Soil pH</span>
                <span className="reaction-reading">
                  <strong>{soilPh.toFixed(1)}</strong> · <span className="text-green">{result.soilDiagnostics.phCategory}</span>
                </span>
              </div>
              <div className="slider-track-wrap">
                <div className="slider-safe-box" style={{ left: '40%', width: '30%' }}/>
                <div
                  className="slider-marker-pointer"
                  style={{ left: `${Math.min(98, Math.max(2, ((soilPh - 4.0) / 5.0) * 100))}%` }}
                >
                  <div className="down-triangle"/>
                </div>
              </div>
              <div className="slider-scale-labels">
                <span>4.0 (Acidic)</span>
                <span className="safe-label">Safe optimal 6.0 to 7.5</span>
                <span>9.0 (Alkaline)</span>
              </div>
            </div>

            {/* Soil EC */}
            <div className="reaction-slider-item">
              <div className="reaction-row-top">
                <span className="reaction-name">Electrical Conductivity (Salts)</span>
                <span className="reaction-reading">
                  <strong>{soilEcDsM.toFixed(1)} dS/m</strong> · <span className="text-green">{result.soilDiagnostics.salinityCategory}</span>
                </span>
              </div>
              <div className="slider-track-wrap">
                <div className="slider-safe-box" style={{ left: '20%', width: '30%' }}/>
                <div
                  className="slider-marker-pointer"
                  style={{ left: `${Math.min(98, Math.max(2, (soilEcDsM / 4.0) * 100))}%` }}
                >
                  <div className="down-triangle"/>
                </div>
              </div>
              <div className="slider-scale-labels">
                <span>0.0 (Non-saline)</span>
                <span className="safe-label">Safe 0.8 to 2.0 dS/m</span>
                <span>4.0 (Severely saline)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart C: Volumetric Water Balance Gauge */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">Soil Water Deficit & Irrigation Volume</h4>
            <span className={result.irrigationDetails.indicated ? 'text-amber font-bold text-xs' : 'text-green font-bold text-xs'}>
              {result.irrigationDetails.urgency}
            </span>
          </div>

          <div className="water-balance-container">
            <div className="water-balance-row">
              <span className="water-label">Current Soil Moisture</span>
              <strong className={soilMoisture < 35 ? 'text-amber' : 'text-green'}>{soilMoisture}%</strong>
            </div>

            <div className="water-balance-track">
              {/* Wilting point segment */}
              <div className="water-segment wilting" style={{ width: '25%' }} title="Wilting Point (<25%)"/>
              {/* Deficit segment */}
              {soilMoisture < targetMoisture && (
                <div
                  className="water-segment current"
                  style={{ width: `${Math.max(10, (soilMoisture / 100) * 100)}%` }}
                />
              )}
              {/* Target line */}
              <div
                className="target-moisture-marker"
                style={{ left: `${targetMoisture}%` }}
                title={`Target: ${targetMoisture}%`}
              >
                <div className="marker-pin"/>
                <span>Target {targetMoisture}%</span>
              </div>
            </div>

            <div className="water-calc-summary">
              <div className="calc-kpi">
                <small>NET DEFICIT</small>
                <strong>{result.irrigationDetails.waterQuantityMm ? `${result.irrigationDetails.waterQuantityMm} mm` : '0 mm'}</strong>
              </div>
              <div className="calc-kpi">
                <small>VOLUME PER ACRE</small>
                <strong>{result.irrigationDetails.litresPerAcre ? `${result.irrigationDetails.litresPerAcre.toLocaleString()} L` : '0 L'}</strong>
              </div>
              <div className="calc-kpi">
                <small>EQUIVALENT DEPTH</small>
                <strong>{result.irrigationDetails.waterQuantityMm ? `${result.irrigationDetails.waterQuantityMm} L/m²` : '0 L/m²'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Chart D: 8-Aspect Agronomic Performance Scores */}
        <div className="analytics-card">
          <div className="analytics-card-head">
            <h4 className="analytics-title">8-Aspect Agronomic Performance Index</h4>
            <span className="card-sub-badge">Academic Multi-Vector Model</span>
          </div>

          <div className="aspects-bar-chart-stack">
            {aspectScores.map(asp => (
              <div key={asp.title} className="aspect-chart-row">
                <div className="aspect-row-info">
                  <span className="aspect-row-name">{asp.title}</span>
                  <div className="aspect-row-right">
                    <span className="aspect-row-val">{asp.measured}</span>
                    <span className={`aspect-status-dot dot-${asp.status.toLowerCase()}`}/>
                  </div>
                </div>

                <div className="aspect-progress-track">
                  <div
                    className={`aspect-progress-bar bar-${asp.status.toLowerCase()}`}
                    style={{ width: `${asp.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Action Advice Cards (Matching Screenshot 3) */}
      <div className="advice-section mt-4">
        <div className="advice-head-row">
          <h3 className="advice-title">Agronomic Prescriptions for {result.cropName} on {result.plotName}</h3>
          <span className="advice-rec-meta">Engine: {result.provenance.engineName} · {result.provenance.methodologyType}</span>
        </div>

        <div className="advice-cards-row">
          <div className="advice-pill-card irrigation">
            <div className="advice-icon-bubble bubble-blue">
              <Droplets size={20} color="#0284c7"/>
            </div>
            <div className="advice-body">
              <strong className="advice-card-heading">Irrigation Strategy ({result.irrigationDetails.urgency})</strong>
              <p className="advice-card-text">{result.irrigationDetails.reason}</p>
              {result.irrigationDetails.indicated && (
                <div className="prescription-math-strip">
                  <strong>Delivery Plan: </strong> Apply {result.irrigationDetails.waterQuantityMm} mm depth ({result.irrigationDetails.litresPerAcre?.toLocaleString()} Litres/acre) via drip emitter or furrow early morning.
                </div>
              )}
            </div>
          </div>

          <div className="advice-pill-card fertilizer">
            <div className="advice-icon-bubble bubble-amber">
              <Leaf size={20} color="#d97706"/>
            </div>
            <div className="advice-body">
              <strong className="advice-card-heading">Nutrient Management & Top Dressing</strong>
              <p className="advice-card-text">
                {result.nutrientPrescriptions[0]?.dosage ? `${result.nutrientPrescriptions[0].nutrient}: ${result.nutrientPrescriptions[0].dosage} (${result.nutrientPrescriptions[0].chemicalFertilizer}).` : 'Nutrient levels are stable.'}
              </p>
              <div className="prescription-math-strip">
                <strong>Organic Option: </strong> {result.nutrientPrescriptions[0]?.organicAlternative || 'Well decomposed FYM / Vermicompost'}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
