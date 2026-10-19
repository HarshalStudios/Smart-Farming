import { useState } from 'react';
import {
  ArrowLeft, Sprout, Calendar, Droplets, Thermometer, Waves,
  Activity, Radio, Sparkles, AlertTriangle, ShieldCheck, Check,
  Leaf, Layers, BookOpen, ChevronRight
} from 'lucide-react';
import { CROPS_CATALOG, type CropProfile, type CropGrowthStage } from '../data/cropsData';

import ModernSensorDataView from './ModernSensorDataView';
import type { SoilAndEnvReadings } from '../services/cropAnalysisEngine';

interface CropDetailViewProps {
  cropId: string;
  onBack: () => void;
  onLaunchAnalysis: (cropId: string) => void;
  mode?: 'demo' | 'live' | 'manual';
  manualReadings?: SoilAndEnvReadings;
  latestLiveReading?: any;
  liveHistory?: any[];
}

export default function CropDetailView({
  cropId,
  onBack,
  onLaunchAnalysis,
  mode = 'demo',
  manualReadings = {},
  latestLiveReading,
  liveHistory = []
}: CropDetailViewProps) {
  const crop: CropProfile = CROPS_CATALOG.find(c => c.id === cropId) || CROPS_CATALOG[0];
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  const [detailTab, setDetailTab] = useState<'profile' | 'telemetry'>('profile');
  const activeStage: CropGrowthStage = crop.growthStages[selectedStageIndex] || crop.growthStages[0];

  return (
    <div className="crop-detail-container">
      {/* Back Button and Actions Header */}
      <div className="detail-top-nav">
        <button className="btn btn-light btn-sm" onClick={onBack}>
          <ArrowLeft size={16}/> Back to Crop Catalog
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="segmented-toggle" style={{ margin: 0 }}>
            <button
              className={`toggle-option ${detailTab === 'profile' ? 'active' : ''}`}
              onClick={() => setDetailTab('profile')}
            >
              <Sprout size={14}/> Agronomic Profile
            </button>
            <button
              className={`toggle-option ${detailTab === 'telemetry' ? 'active' : ''}`}
              onClick={() => setDetailTab('telemetry')}
            >
              <Activity size={14}/> Sensor Data & Graphs
            </button>
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => onLaunchAnalysis(crop.id)}
          >
            <Sparkles size={15}/> Analyze in Workflow <ChevronRight size={14}/>
          </button>
        </div>
      </div>

      {detailTab === 'telemetry' ? (
        <div style={{ marginTop: 16 }}>
          <ModernSensorDataView
            mode={mode}
            manualReadings={manualReadings}
            latestLiveReading={latestLiveReading}
            liveHistory={liveHistory}
            cropName={crop.name}
            plotName="Land L-01"
            onNavigateToCropAnalysis={() => onLaunchAnalysis(crop.id)}
          />
        </div>
      ) : (
        <>
      {/* Hero Banner */}
      <div className="crop-hero-banner">
        <div className="crop-hero-left">
          <div className="hero-emoji-bubble">{crop.emoji}</div>
          <div>
            <div className="hero-tags-row">
              <span className="category-tag">{crop.category}</span>
              <span className="season-tag">{crop.season} Season</span>
            </div>
            <h1 className="hero-crop-title">{crop.name}</h1>
            <div className="hero-names-row">
              <strong className="local-name-tag">{crop.localName}</strong>
              <em className="scientific-name-tag">{crop.scientificName}</em>
            </div>
          </div>
        </div>

        <div className="crop-hero-stats">
          <div className="hero-stat-card">
            <small>CROP DURATION</small>
            <strong><Calendar size={15}/> {crop.durationDays} Days</strong>
            <span>Sowing to harvest</span>
          </div>
          <div className="hero-stat-card">
            <small>WATER NEED</small>
            <strong><Droplets size={15}/> {crop.waterRequirementMm} mm</strong>
            <span>Total season volume</span>
          </div>
          <div className="hero-stat-card">
            <small>SOIL PREFERENCE</small>
            <strong><Layers size={15}/> {crop.soilTypes[0]}</strong>
            <span>{crop.soilTypes.slice(1).join(', ') || 'Well drained'}</span>
          </div>
        </div>
      </div>

      {/* Interactive Growth Stages Timeline */}
      <section className="detail-section">
        <div className="section-title-wrap">
          <Sprout size={20} color="#2ca459"/>
          <div>
            <h2>Phenological Growth Stages Timeline ({crop.growthStages.length} Stages)</h2>
            <p>Click any growth stage to view water demand, nutrient priorities, and management instructions.</p>
          </div>
        </div>

        <div className="stages-timeline-nav">
          {crop.growthStages.map((stage, idx) => {
            const isActive = idx === selectedStageIndex;
            return (
              <button
                key={stage.stageId}
                className={`stage-timeline-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedStageIndex(idx)}
              >
                <div className="timeline-dot-wrapper">
                  <span className={`timeline-dot ${isActive ? 'active' : ''}`}>{idx + 1}</span>
                  {idx < crop.growthStages.length - 1 && <div className="timeline-connector"/>}
                </div>
                <div className="timeline-stage-info">
                  <strong>{stage.name}</strong>
                  <small>{stage.daysRange}</small>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Card */}
        {activeStage && (
          <div className="active-stage-card">
            <div className="stage-card-header">
              <div>
                <span className="stage-step-tag">STAGE {selectedStageIndex + 1} OF {crop.growthStages.length}</span>
                <h3>{activeStage.name}</h3>
                <span className="stage-days-duration"><Calendar size={14}/> Typical Timing: {activeStage.daysRange}</span>
              </div>

              <div className="stage-needs-chips">
                <span className={`need-chip ${activeStage.waterNeed === 'Critical' ? 'critical' : 'moderate'}`}>
                  <Droplets size={14}/> Water Need: <strong>{activeStage.waterNeed}</strong>
                </span>
                <span className="nutrient-chip">
                  <Leaf size={14}/> Nutrient Focus: <strong>{activeStage.nutrientPriority}</strong>
                </span>
              </div>
            </div>

            <p className="stage-full-description">{activeStage.description}</p>

            <div className="stage-management-callout">
              <div className="callout-icon"><Sparkles size={18} color="#2ca459"/></div>
              <div>
                <strong>Key Agronomic Actions for this Stage:</strong>
                <p>{activeStage.managementTips}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Optimal Environmental & Soil Range Matrix */}
      <section className="detail-section">
        <div className="section-title-wrap">
          <Activity size={20} color="#dc8152"/>
          <div>
            <h2>Agronomic Envelope & Optimal Soil Parameters</h2>
            <p>Scientific thresholds governing maximum yield and photosynthesis efficiency.</p>
          </div>
        </div>

        <div className="envelope-cards-grid">
          {/* Soil Moisture */}
          <div className="envelope-stat-box">
            <div className="stat-box-icon"><Droplets size={18} color="#2f8b57"/></div>
            <div className="stat-box-body">
              <small>SOIL MOISTURE</small>
              <strong>{crop.optimalRanges.moistureMin}% - {crop.optimalRanges.moistureMax}%</strong>
              <span>Target: {crop.optimalRanges.moistureOptimal}% field capacity</span>
            </div>
          </div>

          {/* Air Temperature */}
          <div className="envelope-stat-box">
            <div className="stat-box-icon"><Thermometer size={18} color="#dc8152"/></div>
            <div className="stat-box-body">
              <small>AIR TEMPERATURE</small>
              <strong>{crop.optimalRanges.tempMin}°C - {crop.optimalRanges.tempMax}°C</strong>
              <span>Optimal: {crop.optimalRanges.tempOptimal}°C</span>
            </div>
          </div>

          {/* Relative Humidity */}
          <div className="envelope-stat-box">
            <div className="stat-box-icon"><Waves size={18} color="#5389c7"/></div>
            <div className="stat-box-body">
              <small>RELATIVE HUMIDITY</small>
              <strong>{crop.optimalRanges.humidityMin}% - {crop.optimalRanges.humidityMax}%</strong>
              <span>Comfort microclimate</span>
            </div>
          </div>

          {/* Soil pH */}
          <div className="envelope-stat-box">
            <div className="stat-box-icon"><Activity size={18} color="#8d73c6"/></div>
            <div className="stat-box-body">
              <small>SOIL pH</small>
              <strong>{crop.optimalRanges.phMin} - {crop.optimalRanges.phMax}</strong>
              <span>Ideal nutrient solubility</span>
            </div>
          </div>

          {/* Salinity EC */}
          <div className="envelope-stat-box">
            <div className="stat-box-icon"><Radio size={18} color="#4a85a4"/></div>
            <div className="stat-box-body">
              <small>MAX ELECTRICAL COND.</small>
              <strong>&lt; {crop.optimalRanges.ecMax} µS/cm</strong>
              <span>Max salinity ceiling</span>
            </div>
          </div>

          {/* NPK Ratio */}
          <div className="envelope-stat-box">
            <div className="stat-box-icon"><Sprout size={18} color="#2ca459"/></div>
            <div className="stat-box-body">
              <small>TARGET N-P-K (kg/ha)</small>
              <strong>{crop.optimalRanges.nitrogenKgHa.target} : {crop.optimalRanges.phosphorusKgHa.target} : {crop.optimalRanges.potassiumKgHa.target}</strong>
              <span>Recommended nutrient balance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Fertilizer Schedule */}
      <section className="detail-section">
        <div className="section-title-wrap">
          <Leaf size={20} color="#2f8b57"/>
          <div>
            <h2>Recommended Fertilizer & Nutrient Schedule</h2>
            <p>Standard basal and top-dressing applications in kg/acre for typical Indian soil conditions.</p>
          </div>
        </div>

        <div className="fertilizer-schedule-cards">
          <div className="fert-card">
            <span className="fert-stage-label">BASAL DOSE (AT SOWING / PLANTING)</span>
            <p className="fert-desc">{crop.fertilizerSchedule.basalDose}</p>
          </div>
          <div className="fert-card">
            <span className="fert-stage-label">FIRST TOP-DRESSING</span>
            <p className="fert-desc">{crop.fertilizerSchedule.topDressing1}</p>
          </div>
          <div className="fert-card">
            <span className="fert-stage-label">SECOND TOP-DRESSING</span>
            <p className="fert-desc">{crop.fertilizerSchedule.topDressing2}</p>
          </div>
          <div className="fert-card">
            <span className="fert-stage-label">FOLIAR SPRAYS & MICRONUTRIENTS</span>
            <p className="fert-desc">{crop.fertilizerSchedule.foliarSprays}</p>
          </div>
        </div>
      </section>

      {/* Irrigation Management */}
      <section className="detail-section">
        <div className="section-title-wrap">
          <Droplets size={20} color="#387ba3"/>
          <div>
            <h2>Irrigation Management & Critical Water Intervals</h2>
            <p>Timing guidelines to avoid crop moisture stress and maximize water productivity.</p>
          </div>
        </div>

        <div className="irrigation-box">
          <p>{crop.irrigationSchedule}</p>
        </div>
      </section>

      {/* Pest & Disease Guide */}
      <section className="detail-section">
        <div className="section-title-wrap">
          <AlertTriangle size={20} color="#dc8152"/>
          <div>
            <h2>Common Pests, Diseases & Integrated Protection</h2>
            <p>Diagnostic symptoms, environmental triggers, bio-control, and chemical management.</p>
          </div>
        </div>

        <div className="pests-detail-grid">
          {crop.commonPestsAndDiseases.map((pest, i) => (
            <div key={i} className="pest-detail-card">
              <div className="pest-header">
                <div>
                  <strong>{pest.name}</strong>
                  <span className={`pest-type-badge ${pest.type.toLowerCase().replace(/[^a-z]/g, '')}`}>{pest.type}</span>
                </div>
              </div>

              <div className="pest-content-blocks">
                <div className="pest-info-row">
                  <small>FAVORABLE CONDITIONS:</small>
                  <p>{pest.favorableConditions}</p>
                </div>
                <div className="pest-info-row">
                  <small>SYMPTOMS & DAMAGE:</small>
                  <p>{pest.symptoms}</p>
                </div>
                <div className="pest-info-row">
                  <small>BIOLOGICAL / ORGANIC PREVENTION:</small>
                  <p className="organic-text">{pest.organicRemedy}</p>
                </div>
                <div className="pest-info-row">
                  <small>CHEMICAL CONTROL (IF THRESHOLD EXCEEDED):</small>
                  <p className="chemical-text">{pest.chemicalControl}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Launch Action */}
      <div className="detail-bottom-cta">
        <div>
          <h3>Analyze {crop.name} with Current Field Data</h3>
          <p>Transfer this crop profile directly into the 8-step interactive analysis workflow.</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => onLaunchAnalysis(crop.id)}
        >
          <Sparkles size={18}/> Launch Crop Analysis Workflow
        </button>
      </div>
        </>
      )}
    </div>
  );
}
