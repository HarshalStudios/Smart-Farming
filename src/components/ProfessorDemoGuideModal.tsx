import { useState } from 'react';
import {
  GraduationCap, X, CheckCircle2, Cpu, Radio, Database,
  Sprout, Sparkles, ChevronRight, ChevronLeft, ShieldCheck, Terminal
} from 'lucide-react';

interface ProfessorDemoGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchMode: (mode: 'demo' | 'live' | 'manual') => void;
  onNavigateToPage: (page: string) => void;
}

export default function ProfessorDemoGuideModal({
  isOpen,
  onClose,
  onSwitchMode,
  onNavigateToPage
}: ProfessorDemoGuideModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isOpen) return null;

  const demoSteps = [
    {
      title: '1. Project Overview & System Architecture',
      badge: 'SYSTEM DESIGN',
      summary: 'Explain the core motivation: moving agriculture from traditional calendar-based intuition to data-driven precision IoT decision support.',
      talkingPoints: [
        'Demonstrates an end-to-end IoT precision agriculture ecosystem connecting embedded field telemetry to a cloud analytics engine.',
        'Architecture: ESP32 Hardware Node → TLS HTTPS Ingestion (`POST /api/v1/telemetry/ingest`) → Hostless PostgreSQL 17 / Express 5 API → React Vite Client.',
        'Eliminates over-fertilization, saves up to 40% irrigation water, and provides early warnings before crop disease outbreaks.'
      ],
      actionLabel: 'Show Dashboard Overview',
      action: () => {
        onNavigateToPage('Dashboard');
        onClose();
      }
    },
    {
      title: '2. Operating Modes (Demo vs Live vs Manual)',
      badge: 'RELIABILITY & RESILIENCE',
      summary: 'Demonstrate the 3 distinct operating modes engineered for field reliability and academic presentation resilience.',
      talkingPoints: [
        'Live Mode: Authoritative stream from ESP32 node ESP32-PN-001. Enforces TLS validation, bearer device token authentication, and strict payload validation (NULL on sensor failure, never fake zeroes).',
        'Demo Mode: Curated deterministic simulation across multiple assigned farms (Shivneri, Sahyadri, Green Valley).',
        'Manual Mode: Interactive laboratory mode allowing real-time adjustment of Temperature, Humidity, Moisture, pH, EC, and NPK to test how the algorithms respond dynamically.'
      ],
      actionLabel: 'Activate Manual Lab Mode',
      action: () => {
        onSwitchMode('manual');
        onNavigateToPage('Dashboard');
        onClose();
      }
    },
    {
      title: '3. Precision Crop Analysis & Agronomic Engine',
      badge: 'AGRONOMIC INTELLIGENCE',
      summary: 'Show the 8-step interactive crop analysis workflow evaluating real or custom parameters against scientific crop envelopes.',
      talkingPoints: [
        'Supports 27+ Maharashtra and Indian crops (Wheat, Paddy, Soybean, Tur, Tomato, Onion, Cotton, Sugarcane, Mango, etc.).',
        'Phenological stage awareness: Agronomic needs at Sowing differ drastically from Flowering and Fruit/Grain filling.',
        'Calculates 0-100 Soil Health Score, exact fertilizer recommendations (Urea, DAP, MOP in kg/acre), pH corrective amendments (Lime vs Gypsum), and microclimate disease risk forecasts (e.g. Blight vs Sucking pests).',
        'Analyses are saved to PostgreSQL with full historical auditing.'
      ],
      actionLabel: 'Open Crop Analysis Workflow',
      action: () => {
        onNavigateToPage('Crop analysis');
        onClose();
      }
    },
    {
      title: '4. Sensor Hardware & Telemetry Contract',
      badge: 'EMBEDDED IoT INTEGRATION',
      summary: 'Review the physical sensor hardware specifications and telemetry ingestion contract.',
      talkingPoints: [
        'Microcontroller: ESP32 dual-core 240MHz node with hardware cryptographic acceleration.',
        'Sensirion SHT40: High-accuracy digital relative humidity (±1.5% RH) and air temperature (±0.1°C).',
        'RS485 Modbus RTU 7-in-1 Soil Sensor: Measures Soil Moisture, Temp, pH, EC, Nitrogen (N), Phosphorus (P), Potassium (K).',
        'Tipping Bucket Rain Gauge: 0.1498mm pulse resolution for real-time accumulation and rate measurement.',
        'Security: SHA-256 device token hash authentication with one-time token retrieval and rotation from Admin panel.'
      ],
      actionLabel: 'Inspect Devices & Token Rotation',
      action: () => {
        onNavigateToPage('Devices');
        onClose();
      }
    },
    {
      title: '5. Admin Database Explorer & PostgreSQL 17',
      badge: 'DATABASE AUDITABILITY',
      summary: 'Prove real database integration by inspecting actual tables in the connected database.',
      talkingPoints: [
        'Built-in Database Explorer in Admin panel querying real SQL tables (`users`, `farms`, `devices`, `telemetry_readings`, `crop_analyses`).',
        'Shows real connection health check, row counts, and schema definition.',
        'Allows browsing records with parameterized search, column sorting, and pagination without arbitrary SQL execution vulnerability.',
        'Distinguishes real backend database persistence from browser localStorage demo data.'
      ],
      actionLabel: 'Open Database Explorer',
      action: () => {
        onNavigateToPage('Database explorer');
        onClose();
      }
    }
  ];

  const step = demoSteps[currentStep];

  return (
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal presentation-guide-modal">
        <div className="modal-head">
          <div className="demo-guide-badge-title">
            <GraduationCap size={22} color="#2ca459"/>
            <div>
              <h2>Professor Presentation Walkthrough</h2>
              <small>5-step structured demonstration script</small>
            </div>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button>
        </div>

        {/* Step Progress Dots */}
        <div className="demo-guide-progress">
          {demoSteps.map((s, idx) => (
            <button
              key={idx}
              className={`guide-progress-dot ${idx === currentStep ? 'active' : idx < currentStep ? 'done' : ''}`}
              onClick={() => setCurrentStep(idx)}
            >
              <span>{idx + 1}</span>
            </button>
          ))}
        </div>

        {/* Active Step Content */}
        <div className="demo-step-body">
          <div className="step-badge-row">
            <span className="step-pill">{step.badge}</span>
            <span className="step-counter-text">Slide {currentStep + 1} of {demoSteps.length}</span>
          </div>

          <h3 className="demo-step-title">{step.title}</h3>
          <p className="demo-step-summary">{step.summary}</p>

          <div className="demo-talking-points">
            <h4>Key Talking Points to Present:</h4>
            <ul>
              {step.talkingPoints.map((pt, i) => (
                <li key={i}>
                  <CheckCircle2 size={16} color="#2ca459" className="bullet-icon"/>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Navigation Buttons */}
        <div className="modal-actions space-between">
          <div>
            {currentStep > 0 && (
              <button className="btn btn-light btn-sm" onClick={() => setCurrentStep(prev => prev - 1)}>
                <ChevronLeft size={14}/> Previous Slide
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={step.action}>
              {step.actionLabel}
            </button>

            {currentStep < demoSteps.length - 1 ? (
              <button className="btn btn-primary btn-sm" onClick={() => setCurrentStep(prev => prev + 1)}>
                Next Slide <ChevronRight size={14}/>
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={onClose}>
                Finish Presentation
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
