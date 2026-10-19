import { useState, useMemo, useEffect } from 'react';
import {
  Sprout, Search, CheckCircle2, AlertTriangle, AlertCircle,
  Droplets, Thermometer, Waves, Activity, Radio, Save, RotateCcw,
  Calendar, MapPin, ChevronRight, Check, Sliders, ShieldCheck,
  FileText, Sparkles, RefreshCw, Trash2, Info, BookOpen, Clock
} from 'lucide-react';
import { CROPS_CATALOG, CROP_CATEGORIES, type CropProfile, type CropGrowthStage } from '../data/cropsData';
import {
  analyzeCropParameters,
  DEMO_SCENARIOS,
  type SoilAndEnvReadings,
  type CropAnalysisResult,
  type DemoScenario
} from '../services/cropAnalysisEngine';
import CropAnalysisVisualAnalytics from './CropAnalysisVisualAnalytics';

interface FarmOption {
  id: string;
  name: string;
  location: string;
  soil: string;
}

interface CropAnalysisWorkflowProps {
  farms: FarmOption[];
  activeMode: 'demo' | 'live' | 'manual';
  currentReadings: SoilAndEnvReadings;
  initialCropId?: string;
  onNavigateToCropDetail?: (cropId: string) => void;
  sessionToken?: string | null;
}

export default function CropAnalysisWorkflow({
  farms,
  activeMode,
  currentReadings,
  initialCropId,
  onNavigateToCropDetail,
  sessionToken
}: CropAnalysisWorkflowProps) {
  // Step 1: Farm & Plot
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0]?.id || 'f1');
  const [selectedPlot, setSelectedPlot] = useState<string>('Plot 1 (Main Field)');

  // Step 2: Crop Selector
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [cropSearch, setCropSearch] = useState<string>('');
  const [selectedCropId, setSelectedCropId] = useState<string>(initialCropId || 'crop-tomato');

  // Step 3: Growth Stage
  const selectedCrop = useMemo(() => {
    return CROPS_CATALOG.find(c => c.id === selectedCropId) || CROPS_CATALOG[0];
  }, [selectedCropId]);

  const [selectedStageId, setSelectedStageId] = useState<string>(
    selectedCrop.growthStages[0]?.stageId || ''
  );

  // Update stage when crop changes
  useEffect(() => {
    if (selectedCrop && (!selectedStageId || !selectedCrop.growthStages.some(s => s.stageId === selectedStageId))) {
      setSelectedStageId(selectedCrop.growthStages[0]?.stageId || '');
    }
  }, [selectedCrop, selectedStageId]);

  // Step 4: Environmental & Soil Inputs
  const [customReadings, setCustomReadings] = useState<SoilAndEnvReadings>({
    airTemperature: currentReadings.airTemperature ?? 27.5,
    relativeHumidity: currentReadings.relativeHumidity ?? 62.0,
    soilMoisture: currentReadings.soilMoisture ?? 48.0,
    soilTemperature: currentReadings.soilTemperature ?? 25.0,
    soilPh: currentReadings.soilPh ?? 6.5,
    ec: currentReadings.ec ?? 750,
    nitrogen: currentReadings.nitrogen ?? 115,
    phosphorus: currentReadings.phosphorus ?? 55,
    potassium: currentReadings.potassium ?? 110,
    rainfall: currentReadings.rainfall ?? 0
  });

  // Track active scenario or custom
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Track if inputs were modified after analysis
  const [isModifiedAfterAnalysis, setIsModifiedAfterAnalysis] = useState<boolean>(false);

  // Step 5 & 6: Analysis Result
  const [analysisResult, setAnalysisResult] = useState<CropAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'workflow' | 'history'>('workflow');
  const [resultViewMode, setResultViewMode] = useState<'analytics' | 'audit'>('analytics');

  // Step 8: Saved Analyses
  const [savedAnalyses, setSavedAnalyses] = useState<CropAnalysisResult[]>(() => {
    try {
      const stored = localStorage.getItem('greenfield_crop_analyses_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Sync with backend on mount if sessionToken available
  useEffect(() => {
    if (sessionToken) {
      fetch('/api/v1/crop-analyses?limit=30', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      })
        .then(res => res.json())
        .then((data: { analyses?: any[] }) => {
          if (data?.analyses && Array.isArray(data.analyses) && data.analyses.length > 0) {
            const formatted: CropAnalysisResult[] = data.analyses.map(a => a.results || a);
            setSavedAnalyses(prev => {
              const existingIds = new Set(prev.map(p => p.analysisId));
              const newItems = formatted.filter(f => f.analysisId && !existingIds.has(f.analysisId));
              return [...newItems, ...prev];
            });
          }
        })
        .catch(() => {});
    }
  }, [sessionToken]);

  // Filter crops
  const filteredCrops = useMemo(() => {
    return CROPS_CATALOG.filter(c => {
      const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
      const q = cropSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        c.localName.toLowerCase().includes(q) ||
        c.scientificName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, cropSearch]);

  const currentFarm = useMemo(() => {
    return farms.find(f => f.id === selectedFarmId) || farms[0] || { id: 'f1', name: 'Shivneri Farm', location: 'Pune', soil: 'Black cotton soil' };
  }, [farms, selectedFarmId]);

  const handleReadingChange = (key: keyof SoilAndEnvReadings, val: number) => {
    setCustomReadings(prev => ({ ...prev, [key]: val }));
    setActiveScenarioId(null);
    setIsModifiedAfterAnalysis(true);
  };

  const handlePullActiveReadings = () => {
    setCustomReadings({
      airTemperature: currentReadings.airTemperature ?? 27.5,
      relativeHumidity: currentReadings.relativeHumidity ?? 62.0,
      soilMoisture: currentReadings.soilMoisture ?? 48.0,
      soilTemperature: currentReadings.soilTemperature ?? 25.0,
      soilPh: currentReadings.soilPh ?? 6.5,
      ec: currentReadings.ec ?? 750,
      nitrogen: currentReadings.nitrogen ?? 115,
      phosphorus: currentReadings.phosphorus ?? 55,
      potassium: currentReadings.potassium ?? 110,
      rainfall: currentReadings.rainfall ?? 0
    });
    setActiveScenarioId(null);
    setIsModifiedAfterAnalysis(true);
  };

  const handleLoadScenario = (scenario: DemoScenario) => {
    setActiveScenarioId(scenario.id);
    setSelectedCropId(scenario.cropId);
    setSelectedStageId(scenario.stageId);
    setCustomReadings({ ...scenario.readings });
    setIsModifiedAfterAnalysis(true);
  };

  const handleResetToDefaults = () => {
    setActiveScenarioId(null);
    setSelectedCropId('crop-tomato');
    setSelectedStageId('flowering');
    setCustomReadings({
      airTemperature: 27.0,
      relativeHumidity: 60.0,
      soilMoisture: 48.0,
      soilTemperature: 25.0,
      soilPh: 6.5,
      ec: 650,
      nitrogen: 120,
      phosphorus: 60,
      potassium: 110,
      rainfall: 0.0
    });
    setIsModifiedAfterAnalysis(true);
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeCropParameters(
        selectedCrop,
        selectedStageId,
        customReadings,
        {
          farmId: currentFarm.id,
          farmName: currentFarm.name,
          plotName: selectedPlot,
          source: activeMode
        }
      );
      setAnalysisResult(result);
      setIsModifiedAfterAnalysis(false);
      setIsAnalyzing(false);
    }, 280);
  };

  const handleSaveAnalysis = async () => {
    if (!analysisResult) return;
    setSaveStatus('Saving to records...');

    // 1. Save to local storage
    const updated = [analysisResult, ...savedAnalyses.filter(a => a.analysisId !== analysisResult.analysisId)];
    setSavedAnalyses(updated);
    try {
      localStorage.setItem('greenfield_crop_analyses_history', JSON.stringify(updated));
    } catch {}

    // 2. Persist to backend database if session token available
    if (sessionToken) {
      try {
        const res = await fetch('/api/v1/crop-analyses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            analysisId: analysisResult.analysisId,
            farmId: analysisResult.farmId,
            cropId: analysisResult.cropId,
            cropName: analysisResult.cropName,
            stageName: analysisResult.stageName,
            healthScore: analysisResult.healthScore,
            healthRating: analysisResult.healthRating,
            source: analysisResult.source,
            readings: customReadings,
            results: analysisResult
          })
        });

        if (res.ok) {
          setSaveStatus('Saved to SQL Database & Farm Audit Log!');
        } else {
          setSaveStatus('Saved to Local Records');
        }
      } catch {
        setSaveStatus('Saved locally (Offline storage)');
      }
    } else {
      setSaveStatus('Saved to Farm History');
    }

    setTimeout(() => setSaveStatus(''), 3500);
  };

  const handleDeleteSaved = async (analysisId: string) => {
    const updated = savedAnalyses.filter(a => a.analysisId !== analysisId);
    setSavedAnalyses(updated);
    try {
      localStorage.setItem('greenfield_crop_analyses_history', JSON.stringify(updated));
    } catch {}

    if (sessionToken) {
      try {
        await fetch(`/api/v1/crop-analyses/${analysisId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
      } catch {}
    }
  };

  return (
    <div className="crop-analysis-container">
      {/* Top Banner and Navigation Tabs */}
      <div className="analysis-header-row">
        <div>
          <span className="eyebrow-tag">EXPLAINABLE PRECISION AGRONOMY</span>
          <h1 className="analysis-main-title">Crop Analysis & Recommendations</h1>
          <p className="analysis-subtext">
            Evaluate soil and environmental parameters across 8 agronomic aspects to generate transparent, defensible irrigation, fertilizer, and plant-protection guidance.
          </p>
        </div>

        <div className="workflow-tab-toggle">
          <button
            className={`workflow-tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            <Sliders size={15}/> Interactive Analysis
          </button>
          <button
            className={`workflow-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FileText size={15}/> Saved Analyses ({savedAnalyses.length})
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <section className="saved-analyses-section">
          <div className="saved-header">
            <h2>Archived Crop Analyses</h2>
            <p>Historical audit trail of all calculated agronomic recommendations.</p>
          </div>

          {savedAnalyses.length === 0 ? (
            <div className="empty-history-box">
              <FileText size={40} color="#8a998c"/>
              <h3>No crop analyses saved yet</h3>
              <p>Complete the interactive analysis workflow and click "Save to Records" to audit assessments.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('workflow')}>
                Start New Analysis
              </button>
            </div>
          ) : (
            <div className="saved-analyses-grid">
              {savedAnalyses.map(record => (
                <div key={record.analysisId} className="saved-card">
                  <div className="saved-card-top">
                    <div className="saved-crop-meta">
                      <span className="saved-crop-title">{record.cropName}</span>
                      <span className="saved-stage-tag">{record.stageName}</span>
                    </div>
                    <div className={`health-pill ${record.healthRating.toLowerCase().replace(/\s+/g, '-')}`}>
                      {record.healthScore} / 100 · {record.healthRating}
                    </div>
                  </div>

                  <div className="saved-card-details">
                    <div>
                      <small>FARM & PLOT</small>
                      <strong>{record.farmName} · {record.plotName}</strong>
                    </div>
                    <div>
                      <small>DATA SOURCE</small>
                      <span className={`source-chip ${record.source}`}>
                        {record.source === 'live' ? 'REAL SENSOR DATA' : record.source === 'demo' ? 'DEMONSTRATION' : 'MANUAL INPUT'}
                      </span>
                    </div>
                    <div>
                      <small>RECORDED AT</small>
                      <span>{new Date(record.analyzedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="saved-summary-snippet">
                    <p>{record.healthSummary}</p>
                  </div>

                  {record.irrigationDetails && (
                    <div style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, fontSize: 11, color: '#0369a1', marginBottom: 12 }}>
                      <strong>Irrigation: </strong>{record.irrigationDetails.indicated ? `${record.irrigationDetails.waterQuantityMm} mm depth (${record.irrigationDetails.litresPerAcre?.toLocaleString()} L/acre)` : 'Not indicated'}
                    </div>
                  )}

                  <div className="saved-card-actions">
                    <button
                      className="btn btn-light btn-xs"
                      onClick={() => {
                        setAnalysisResult(record);
                        setSelectedCropId(record.cropId);
                        setSelectedStageId(record.stageId);
                        setActiveTab('workflow');
                      }}
                    >
                      <RotateCcw size={13}/> Review Analysis
                    </button>
                    <button
                      className="icon-btn-danger"
                      title="Delete record"
                      onClick={() => handleDeleteSaved(record.analysisId)}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div>
          {/* Priority 13: Three Deterministic Demo Scenarios Bar */}
          <div className="demo-scenarios-bar">
            <div className="scenarios-bar-header">
              <span className="scenarios-title">
                <Sparkles size={16} color="#4338ca"/> <strong>Demonstration Scenarios for Presentation:</strong>
              </span>
              <span className="scenarios-subtitle">One-click deterministic sample presets demonstrating responsive recommendation logic</span>
            </div>

            <div className="scenarios-buttons-row">
              {DEMO_SCENARIOS.map(sc => {
                const isActive = activeScenarioId === sc.id;
                return (
                  <button
                    key={sc.id}
                    className={`scenario-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleLoadScenario(sc)}
                  >
                    <span className="scenario-badge">{sc.badge}</span>
                    <strong className="scenario-name">{sc.name}</strong>
                  </button>
                );
              })}
              <button
                className="scenario-btn reset-btn"
                onClick={handleResetToDefaults}
                title="Reset form values to default baseline"
              >
                <RotateCcw size={13}/> Reset Inputs
              </button>
            </div>

            {activeScenarioId && (
              <div className="scenario-active-note">
                <Info size={14}/>
                <span>
                  <strong>Active Scenario: </strong>
                  {DEMO_SCENARIOS.find(s => s.id === activeScenarioId)?.description}
                </span>
              </div>
            )}
          </div>

          <div className="workflow-grid-layout">
            {/* Left Column: Interactive Inputs (Steps 1 to 4) */}
            <div className="workflow-input-column">
              {/* Step 1: Farm and Plot */}
              <div className="step-card">
                <div className="step-number-header">
                  <span className="step-badge">1</span>
                  <div>
                    <h3>Select Farm & Land / Plot</h3>
                    <small>Target cultivation boundary</small>
                  </div>
                </div>

                <div className="step-content-row">
                  <div className="field-group">
                    <label>Assigned Farm</label>
                    <select
                      value={selectedFarmId}
                      onChange={e => setSelectedFarmId(e.target.value)}
                      className="styled-select"
                    >
                      {farms.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.location})</option>
                      ))}
                    </select>
                  </div>

                  <div className="field-group">
                    <label>Plot / Field Division</label>
                    <select
                      value={selectedPlot}
                      onChange={e => setSelectedPlot(e.target.value)}
                      className="styled-select"
                    >
                      <option value="Plot 1 (Main Field)">Plot 1 (Main Field)</option>
                      <option value="Plot 2 (North Ridge)">Plot 2 (North Ridge)</option>
                      <option value="Plot 3 (Drip Sector A)">Plot 3 (Drip Sector A)</option>
                      <option value="Greenhouse / ShadeNet 01">Greenhouse / ShadeNet 01</option>
                    </select>
                  </div>
                </div>
                <div className="farm-soil-info-tag">
                  <MapPin size={12}/> {currentFarm.location} · <em>Soil: {currentFarm.soil}</em>
                </div>
              </div>

              {/* Step 2: Crop Selector */}
              <div className="step-card">
                <div className="step-number-header">
                  <span className="step-badge">2</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Select Crop ({CROPS_CATALOG.length} Profiles)</h3>
                      {onNavigateToCropDetail && (
                        <button
                          className="text-link-btn"
                          onClick={() => onNavigateToCropDetail(selectedCrop.id)}
                        >
                          View Full Crop Profile <ChevronRight size={13}/>
                        </button>
                      )}
                    </div>
                    <small>Searchable agricultural catalog with scientific parameters</small>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="crop-categories-scroll">
                  <button
                    className={`category-pill ${categoryFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setCategoryFilter('All')}
                  >
                    All Categories
                  </button>
                  {CROP_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`category-pill ${categoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Crop Search */}
                <div className="crop-search-bar">
                  <Search size={15}/>
                  <input
                    type="text"
                    placeholder="Search by English, Marathi (उदा. कापूस, गहू, टोमॅटो) or Botanical name..."
                    value={cropSearch}
                    onChange={e => setCropSearch(e.target.value)}
                  />
                </div>

                {/* Crop Cards Grid */}
                <div className="crop-selector-grid">
                  {filteredCrops.map(crop => {
                    const isSelected = crop.id === selectedCropId;
                    return (
                      <button
                        key={crop.id}
                        className={`crop-select-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedCropId(crop.id);
                          setActiveScenarioId(null);
                          setIsModifiedAfterAnalysis(true);
                        }}
                      >
                        <span className="crop-card-emoji">{crop.emoji}</span>
                        <div className="crop-card-text">
                          <strong>{crop.name}</strong>
                          <small>{crop.localName}</small>
                          <span className="crop-category-badge">{crop.category}</span>
                        </div>
                        {isSelected && <Check className="crop-selected-check" size={16}/>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Crop Growth Stage */}
              <div className="step-card">
                <div className="step-number-header">
                  <span className="step-badge">3</span>
                  <div>
                    <h3>Select Growth Stage for {selectedCrop.name}</h3>
                    <small>Agronomic requirements differ drastically by phenological phase</small>
                  </div>
                </div>

                <div className="growth-stages-timeline">
                  {selectedCrop.growthStages.map((stage, idx) => {
                    const isSelected = stage.stageId === selectedStageId;
                    return (
                      <button
                        key={stage.stageId}
                        className={`stage-timeline-card ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedStageId(stage.stageId);
                          setActiveScenarioId(null);
                          setIsModifiedAfterAnalysis(true);
                        }}
                      >
                        <div className="stage-top-row">
                          <span className="stage-index-dot">{idx + 1}</span>
                          <strong className="stage-name">{stage.name}</strong>
                          <span className="stage-days-chip">{stage.daysRange}</span>
                        </div>
                        <p className="stage-desc">{stage.description}</p>
                        <div className="stage-metric-footer">
                          <span>Water Need: <strong className={stage.waterNeed === 'Critical' ? 'text-red' : ''}>{stage.waterNeed}</strong></span>
                          <span>Priority: <em>{stage.nutrientPriority}</em></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Soil & Environmental Readings */}
              <div className="step-card">
                <div className="step-number-header">
                  <span className="step-badge">4</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Soil & Environmental Parameters</h3>
                      <button
                        className="btn btn-light btn-xs"
                        onClick={handlePullActiveReadings}
                        title="Load readings currently present in dashboard"
                      >
                        <RefreshCw size={12}/> Sync from Active Mode
                      </button>
                    </div>
                    <small>Adjust readings manually or inspect real sensor inputs</small>
                  </div>
                </div>

                <div className="readings-source-indicator">
                  <span>Data Source:</span>
                  <strong className={`source-pill ${activeMode}`}>
                    {activeMode === 'live' ? 'REAL SENSOR DATA (ESP32)' : activeMode === 'demo' ? 'DEMONSTRATION ANALYSIS' : 'MANUAL INPUT'}
                  </strong>
                </div>

                <div className="parameters-sliders-grid">
                  {/* Soil Moisture */}
                  <div className="parameter-input-row">
                    <div className="param-label-box">
                      <Droplets size={16} color="#2f8b57"/>
                      <span>Soil Moisture</span>
                      <strong>{customReadings.soilMoisture?.toFixed(1) ?? 'Unavailable'} %</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="95"
                      step="1"
                      value={customReadings.soilMoisture ?? 48}
                      onChange={e => handleReadingChange('soilMoisture', parseFloat(e.target.value))}
                      className="slider-accent-green"
                    />
                    <div className="param-optimal-hint">Stage Target: {selectedCrop.growthStages.find(s=>s.stageId===selectedStageId)?.moistureTarget || 50}% (Envelope: {selectedCrop.optimalRanges.moistureMin}–{selectedCrop.optimalRanges.moistureMax}%)</div>
                  </div>

                  {/* Air Temperature */}
                  <div className="parameter-input-row">
                    <div className="param-label-box">
                      <Thermometer size={16} color="#dc8152"/>
                      <span>Air Temperature</span>
                      <strong>{customReadings.airTemperature?.toFixed(1) ?? 'Unavailable'} °C</strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="48"
                      step="0.5"
                      value={customReadings.airTemperature ?? 27}
                      onChange={e => handleReadingChange('airTemperature', parseFloat(e.target.value))}
                      className="slider-accent-orange"
                    />
                    <div className="param-optimal-hint">Optimal: {selectedCrop.optimalRanges.tempMin}–{selectedCrop.optimalRanges.tempMax} °C (Ideal: {selectedCrop.optimalRanges.tempOptimal} °C)</div>
                  </div>

                  {/* Relative Humidity */}
                  <div className="parameter-input-row">
                    <div className="param-label-box">
                      <Waves size={16} color="#5389c7"/>
                      <span>Relative Humidity</span>
                      <strong>{customReadings.relativeHumidity?.toFixed(0) ?? 'Unavailable'} %</strong>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="98"
                      step="1"
                      value={customReadings.relativeHumidity ?? 60}
                      onChange={e => handleReadingChange('relativeHumidity', parseFloat(e.target.value))}
                      className="slider-accent-blue"
                    />
                    <div className="param-optimal-hint">Optimal: {selectedCrop.optimalRanges.humidityMin}–{selectedCrop.optimalRanges.humidityMax} %</div>
                  </div>

                  {/* Soil pH */}
                  <div className="parameter-input-row">
                    <div className="param-label-box">
                      <Activity size={16} color="#8d73c6"/>
                      <span>Soil pH</span>
                      <strong>{customReadings.soilPh?.toFixed(2) ?? 'Unavailable'} pH</strong>
                    </div>
                    <input
                      type="range"
                      min="4.0"
                      max="9.5"
                      step="0.05"
                      value={customReadings.soilPh ?? 6.5}
                      onChange={e => handleReadingChange('soilPh', parseFloat(e.target.value))}
                      className="slider-accent-purple"
                    />
                    <div className="param-optimal-hint">Optimal: {selectedCrop.optimalRanges.phMin}–{selectedCrop.optimalRanges.phMax} pH (Neutral: 6.5–7.2)</div>
                  </div>

                  {/* Electrical Conductivity (EC) */}
                  <div className="parameter-input-row">
                    <div className="param-label-box">
                      <Radio size={16} color="#4a85a4"/>
                      <span>Electrical Conductivity (EC)</span>
                      <strong>{customReadings.ec ?? 'Unavailable'} µS/cm</strong>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="3500"
                      step="50"
                      value={customReadings.ec ?? 650}
                      onChange={e => handleReadingChange('ec', parseInt(e.target.value))}
                      className="slider-accent-slate"
                    />
                    <div className="param-optimal-hint">Salinity limit: &lt; {selectedCrop.optimalRanges.ecMax} µS/cm ({(selectedCrop.optimalRanges.ecMax/1000).toFixed(1)} dS/m)</div>
                  </div>

                  {/* Nutrients N, P, K */}
                  <div className="npk-triple-inputs">
                    <div className="npk-input-box">
                      <label>Nitrogen (N)</label>
                      <div className="npk-val-row">
                        <input
                          type="number"
                          min="10"
                          max="350"
                          value={customReadings.nitrogen ?? 120}
                          onChange={e => handleReadingChange('nitrogen', parseInt(e.target.value) || 0)}
                        />
                        <span>kg/ha</span>
                      </div>
                      <small>Opt: {selectedCrop.optimalRanges.nitrogenKgHa.target}</small>
                    </div>

                    <div className="npk-input-box">
                      <label>Phosphorus (P)</label>
                      <div className="npk-val-row">
                        <input
                          type="number"
                          min="5"
                          max="200"
                          value={customReadings.phosphorus ?? 60}
                          onChange={e => handleReadingChange('phosphorus', parseInt(e.target.value) || 0)}
                        />
                        <span>kg/ha</span>
                      </div>
                      <small>Opt: {selectedCrop.optimalRanges.phosphorusKgHa.target}</small>
                    </div>

                    <div className="npk-input-box">
                      <label>Potassium (K)</label>
                      <div className="npk-val-row">
                        <input
                          type="number"
                          min="10"
                          max="350"
                          value={customReadings.potassium ?? 110}
                          onChange={e => handleReadingChange('potassium', parseInt(e.target.value) || 0)}
                        />
                        <span>kg/ha</span>
                      </div>
                      <small>Opt: {selectedCrop.optimalRanges.potassiumKgHa.target}</small>
                    </div>
                  </div>
                </div>

                {/* Step 5: Analyze Button */}
                <div className="run-analysis-action-box">
                  {isModifiedAfterAnalysis && analysisResult && (
                    <div className="modified-warning-strip">
                      <AlertTriangle size={15}/>
                      <span>Inputs modified. Click <strong>Analyze Crop</strong> to refresh results.</span>
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-lg run-analysis-btn"
                    onClick={handleRunAnalysis}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>Running Agronomic Model...</>
                    ) : (
                      <>
                        <Sparkles size={18}/> Calculate Crop Recommendations
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Step 6 & 7 Comprehensive Results Display */}
            <div className="workflow-result-column">
              {!analysisResult ? (
                <div className="awaiting-analysis-placeholder">
                  <Sprout size={52} color="#2ca459" opacity={0.6}/>
                  <h2>Ready for Agronomic Analysis</h2>
                  <p>
                    Select a farm, crop profile, and growth stage, or load one of the 3 demonstration scenarios above, then click <strong>Calculate Crop Recommendations</strong>.
                  </p>
                  <div className="workflow-preview-chips">
                    <span>Selected: <strong>{selectedCrop.name}</strong></span>
                    <span>Stage: <strong>{selectedCrop.growthStages.find(s => s.stageId === selectedStageId)?.name || 'Vegetative'}</strong></span>
                    <span>Farm: <strong>{currentFarm.name}</strong></span>
                  </div>
                  <button className="btn btn-primary" onClick={handleRunAnalysis}>
                    Run Analysis Now
                  </button>
                </div>
              ) : (
                <div className="analysis-result-dashboard">
                  {/* Visual Analytics vs Detailed Audit Toggle */}
                  <div className="result-mode-toggle-bar">
                    <div className="segmented-toggle">
                      <button
                        className={`toggle-option ${resultViewMode === 'analytics' ? 'active' : ''}`}
                        onClick={() => setResultViewMode('analytics')}
                      >
                        <Activity size={15}/> 📊 Visual Analytics & Charts
                      </button>
                      <button
                        className={`toggle-option ${resultViewMode === 'audit' ? 'active' : ''}`}
                        onClick={() => setResultViewMode('audit')}
                      >
                        <FileText size={15}/> 📋 Detailed Multi-Aspect Audit
                      </button>
                    </div>

                    <div className="view-mode-actions">
                      <button
                        className="btn btn-light btn-sm"
                        onClick={handleSaveAnalysis}
                      >
                        <Save size={14}/> Save to Records
                      </button>
                      {saveStatus && <span className="save-feedback-text">{saveStatus}</span>}
                    </div>
                  </div>

                  {resultViewMode === 'analytics' ? (
                    <div>
                      <CropAnalysisVisualAnalytics
                        result={analysisResult}
                        readings={customReadings}
                        cropProfile={selectedCrop}
                        onNavigateToCropDetail={onNavigateToCropDetail}
                      />
                      <div className="switch-to-audit-callout">
                        <button
                          className="btn btn-light btn-sm"
                          onClick={() => setResultViewMode('audit')}
                        >
                          <FileText size={14}/> View Full 8-Aspect Text Breakdown & Agronomic Model Equations <ChevronRight size={14}/>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Score & Header Card */}
                      <div className="result-score-hero">
                    <div className="score-hero-left">
                      <div className={`score-circular-badge ${analysisResult.healthRating.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="score-number">{analysisResult.healthScore}</div>
                        <div className="score-denominator">/ 100</div>
                      </div>
                      <div className="score-meta-block">
                        <span className="result-eyebrow">SOIL HEALTH & CROP SUITABILITY SCORE</span>
                        <h2 className="score-rating-title">{analysisResult.healthRating}</h2>
                        <div className="crop-result-badge-row">
                          <span className="crop-pill-tag">
                            {selectedCrop.emoji} {analysisResult.cropName}
                          </span>
                          <span className="stage-pill-tag">
                            {analysisResult.stageName}
                          </span>
                          <span className={`source-pill ${analysisResult.source}`}>
                            {analysisResult.source === 'live' ? 'REAL SENSOR DATA' : analysisResult.source === 'demo' ? 'DEMONSTRATION' : 'MANUAL INPUT'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="score-hero-actions">
                      <button
                        className="btn btn-light btn-sm"
                        onClick={handleSaveAnalysis}
                      >
                        <Save size={14}/> Save to Records
                      </button>
                      {saveStatus && <span className="save-feedback-text">{saveStatus}</span>}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="result-summary-box">
                    <p><strong>Agronomic Evaluation: </strong>{analysisResult.healthSummary}</p>
                  </div>

                  {/* Priority 4: The 8 Explainable Multi-Aspect Assessments */}
                  <div className="result-section">
                    <div className="result-section-header">
                      <h4>Eight-Aspect Agronomic Assessment</h4>
                      <small>Comprehensive evaluation across vital soil and atmospheric dimensions</small>
                    </div>

                    <div className="aspects-cards-grid">
                      {analysisResult.aspects.map(asp => {
                        const statusClass = asp.status.toLowerCase().replace(/\s+/g, '-');
                        return (
                          <div key={asp.aspectId} className={`aspect-card status-${statusClass}`}>
                            <div className="aspect-card-header">
                              <div>
                                <span className="aspect-title">{asp.aspectTitle}</span>
                                <span className="aspect-crop-ref">{asp.cropReference}</span>
                              </div>
                              <span className={`aspect-status-chip ${statusClass}`}>
                                {asp.status}
                              </span>
                            </div>

                            <div className="aspect-metric-row">
                              <small>MEASURED / INPUT:</small>
                              <strong>{asp.measuredValue}</strong>
                            </div>

                            <div className="aspect-explanation">
                              <p>{asp.explanation}</p>
                            </div>

                            <div className="aspect-action-box">
                              <small>RECOMMENDED ACTION:</small>
                              <p>{asp.recommendedAction}</p>
                            </div>

                            <div className="aspect-footer-meta">
                              <span>Methodology: <em>{asp.methodology}</em></span>
                              <span title={asp.limitations} className="aspect-limitations">
                                <Info size={11}/> Limitations
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priority 6: Detailed Irrigation & Defensible Water Volume */}
                  <div className="result-section irrigation-section">
                    <div className="result-section-header">
                      <h4>Irrigation & Water Management Plan</h4>
                      <small>Defensible volumetric calculation based on soil water deficit</small>
                    </div>

                    <div className="irrigation-card-body">
                      <div className="irrigation-kpi-row">
                        <div className="irrigation-kpi">
                          <small>IRRIGATION STATUS</small>
                          <strong className={analysisResult.irrigationDetails.indicated ? 'text-blue' : 'text-green'}>
                            {analysisResult.irrigationDetails.indicated ? 'Irrigation Indicated' : 'Adequate Moisture'}
                          </strong>
                        </div>
                        <div className="irrigation-kpi">
                          <small>URGENCY / TIMING</small>
                          <strong>{analysisResult.irrigationDetails.urgency}</strong>
                        </div>
                        <div className="irrigation-kpi">
                          <small>NET WATER DEPTH</small>
                          <strong>{analysisResult.irrigationDetails.waterQuantityMm ? `${analysisResult.irrigationDetails.waterQuantityMm} mm` : '0 mm'}</strong>
                        </div>
                        <div className="irrigation-kpi">
                          <small>VOLUME PER ACRE</small>
                          <strong>{analysisResult.irrigationDetails.litresPerAcre ? `${analysisResult.irrigationDetails.litresPerAcre.toLocaleString()} Litres` : '0 Litres'}</strong>
                        </div>
                      </div>

                      <div className="irrigation-details-text">
                        <p><strong>Agronomic Basis: </strong>{analysisResult.irrigationDetails.reason}</p>
                        <p><strong>Calculation Formula: </strong>{analysisResult.irrigationDetails.calculationExplanation}</p>
                        <div className="conversion-reference-strip">
                          <span>Unit Conversions: 1 mm depth = 1.0 L/m² = 10.0 m³/ha = 4,047 L/acre.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nutrient Prescriptions (NPK) */}
                  <div className="result-section">
                    <div className="result-section-header">
                      <h4>Nutrient Prescription & Fertilizer Dosage</h4>
                      <small>Calculated chemical vs organic formulations</small>
                    </div>

                    <div className="prescriptions-cards-grid">
                      {analysisResult.nutrientPrescriptions.map(npk => (
                        <div key={npk.nutrient} className="prescription-card">
                          <div className="presc-head">
                            <strong>{npk.nutrient}</strong>
                            <span className={`presc-status ${npk.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {npk.status} ({npk.currentLevel ?? 'N/A'} / {npk.targetLevel} {npk.unit})
                            </span>
                          </div>
                          <div className="presc-content">
                            <div>
                              <small>CHEMICAL DOSAGE</small>
                              <p className="presc-dose"><strong>{npk.dosage}</strong></p>
                              <span className="presc-fert-type">{npk.chemicalFertilizer}</span>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <small>ORGANIC ALTERNATIVE</small>
                              <p className="presc-organic">{npk.organicAlternative}</p>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <small>APPLICATION METHOD</small>
                              <span className="presc-method">{npk.applicationMethod}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Soil Diagnostics: pH & EC */}
                  <div className="soil-diagnostics-grid">
                    <div className="diagnostic-box">
                      <div className="diag-head">
                        <Activity size={17} color="#8d73c6"/>
                        <strong>Soil Acidity & pH Amendment</strong>
                        <span className={`diag-badge ${analysisResult.soilDiagnostics.phCategory.toLowerCase()}`}>
                          {analysisResult.soilDiagnostics.phCategory}
                        </span>
                      </div>
                      <p className="diag-text">{analysisResult.soilDiagnostics.phImpact}</p>
                      <div className="diag-action">
                        <small>ACTIONABLE CORRECTION:</small>
                        <p>{analysisResult.soilDiagnostics.phAmendment}</p>
                      </div>
                    </div>

                    <div className="diagnostic-box">
                      <div className="diag-head">
                        <Radio size={17} color="#4a85a4"/>
                        <strong>Salinity & Osmotic Risk (EC)</strong>
                        <span className="diag-badge neutral">
                          {analysisResult.soilDiagnostics.salinityCategory}
                        </span>
                      </div>
                      <p className="diag-text">{analysisResult.soilDiagnostics.salinityAction}</p>
                    </div>
                  </div>

                  {/* Pest & Disease Early Warnings */}
                  <div className="result-section">
                    <div className="result-section-header">
                      <h4>Microclimatic Pest & Disease Forecast</h4>
                      <small>Based on ambient temperature, humidity, and leaf wetness</small>
                    </div>

                    <div className="disease-warnings-list">
                      {analysisResult.diseaseRisks.map((risk, idx) => (
                        <div key={idx} className={`disease-warning-card ${risk.riskLevel.toLowerCase()}`}>
                          <div className="disease-card-header">
                            <span className="disease-name">
                              <AlertTriangle size={16}/> {risk.diseaseName}
                            </span>
                            <span className={`risk-pill ${risk.riskLevel.toLowerCase()}`}>
                              {risk.riskLevel} Risk
                            </span>
                          </div>
                          <p className="trigger-reason">{risk.triggerReason}</p>
                          <div className="remedy-row">
                            <div>
                              <small>PREVENTION & BIO-CONTROL</small>
                              <p>{risk.preventiveAction}</p>
                            </div>
                            <div>
                              <small>CHEMICAL MEASURE (IF SEVERE)</small>
                              <p>{risk.chemicalControl}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Prioritized Checklist */}
                  <div className="result-section">
                    <div className="result-section-header">
                      <h4>Actionable Agronomic Plan</h4>
                      <small>Prioritized tasks for farm management</small>
                    </div>

                    <div className="action-plan-columns">
                      <div className="plan-column immediate">
                        <h5><AlertCircle size={15}/> Immediate Action (Within 24 Hours)</h5>
                        <ul>
                          {analysisResult.actionChecklist.immediate.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="plan-column upcoming">
                        <h5><Calendar size={15}/> Upcoming Interventions (3 - 5 Days)</h5>
                        <ul>
                          {analysisResult.actionChecklist.upcomingDays.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="plan-column routine">
                        <h5><CheckCircle2 size={15}/> Routine Monitoring</h5>
                        <ul>
                          {analysisResult.actionChecklist.routine.map((act, i) => (
                            <li key={i}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Priority 5: Engine Provenance & Model Explanation Box */}
                  <div className="result-section provenance-section">
                    <div className="result-section-header">
                      <h4>Model Explanation & Provenance Disclosure</h4>
                      <small>Academic integrity and agricultural validation details</small>
                    </div>

                    <div className="provenance-card-content">
                      <div className="prov-row">
                        <small>ANALYSIS ENGINE:</small>
                        <strong>{analysisResult.provenance.engineName}</strong>
                      </div>
                      <div className="prov-row">
                        <small>METHODOLOGY TYPE:</small>
                        <span>{analysisResult.provenance.methodologyType}</span>
                      </div>
                      <div className="prov-row">
                        <small>INPUTS CONSIDERED:</small>
                        <span>{analysisResult.provenance.inputsConsidered.join(' · ')}</span>
                      </div>
                      <div className="prov-row">
                        <small>AGRONOMIC REFERENCES:</small>
                        <span>{analysisResult.provenance.referenceDataSources.join(' | ')}</span>
                      </div>
                      <div className="prov-row">
                        <small>MODEL DISCLOSURE:</small>
                        <p>{analysisResult.provenance.justification}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="result-bottom-toolbar">
                    <button className="btn btn-primary" onClick={handleSaveAnalysis}>
                      <Save size={15}/> Save Analysis to Records
                    </button>
                    {saveStatus && <span className="save-feedback-text">{saveStatus}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
