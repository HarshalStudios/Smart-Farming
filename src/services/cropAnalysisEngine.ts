import type { CropProfile, CropGrowthStage } from '../data/cropsData';

export interface SoilAndEnvReadings {
  airTemperature: number;
  relativeHumidity: number;
  soilMoisture: number;
  soilTemperature?: number;
  soilPh: number;
  ec: number; // in µS/cm
  nitrogen: number; // in mg/kg or kg/ha
  phosphorus: number; // in mg/kg or kg/ha
  potassium: number; // in mg/kg or kg/ha
  rainfall?: number; // mm
}

export interface ParameterAnalysis {
  id: string;
  label: string;
  currentValue: number;
  unit: string;
  optimalMin: number;
  optimalMax: number;
  optimalTarget: number;
  status: 'Optimal' | 'Warning' | 'Critical' | 'Deficient' | 'Excess';
  delta: number;
  interpretation: string;
}

export interface NutrientRecommendation {
  nutrient: 'Nitrogen (N)' | 'Phosphorus (P)' | 'Potassium (K)';
  currentLevel: number;
  targetLevel: number;
  unit: string;
  status: 'Deficient' | 'Optimal' | 'Excess';
  chemicalFertilizer: string;
  dosage: string;
  organicAlternative: string;
  applicationMethod: string;
}

export interface DiseaseRiskWarning {
  diseaseName: string;
  riskLevel: 'Low' | 'Moderate' | 'High';
  triggerReason: string;
  preventiveAction: string;
  chemicalControl: string;
}

export interface CropAnalysisResult {
  analysisId: string;
  analyzedAt: string;
  cropId: string;
  cropName: string;
  cropCategory: string;
  stageId: string;
  stageName: string;
  farmId: string;
  farmName: string;
  plotName: string;
  source: 'manual' | 'demo' | 'live';
  healthScore: number; // 0 - 100
  healthRating: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical Stress';
  healthSummary: string;
  parameters: ParameterAnalysis[];
  soilDiagnostics: {
    phCategory: 'Acidic' | 'Neutral' | 'Alkaline';
    phImpact: string;
    phAmendment: string;
    salinityCategory: 'Non-saline' | 'Slightly saline' | 'Moderately saline' | 'Severely saline';
    salinityAction: string;
    moistureCategory: 'Severe Deficit' | 'Mild Deficit' | 'Optimal' | 'High' | 'Waterlogged';
    irrigationAdvice: string;
  };
  nutrientPrescriptions: NutrientRecommendation[];
  diseaseRisks: DiseaseRiskWarning[];
  stageAdvice: {
    stageName: string;
    waterRequirement: string;
    nutrientPriority: string;
    actionableTips: string;
  };
  actionChecklist: {
    immediate: string[];
    upcomingDays: string[];
    routine: string[];
  };
}

/**
 * Agronomic Analysis Engine
 * Evaluates real or simulated soil and environmental readings against scientific crop parameters
 */
export function analyzeCropParameters(
  crop: CropProfile,
  stageId: string,
  readings: SoilAndEnvReadings,
  context: { farmId: string; farmName: string; plotName: string; source: 'manual' | 'demo' | 'live' }
): CropAnalysisResult {
  const stage: CropGrowthStage = crop.growthStages.find(s => s.stageId === stageId) || crop.growthStages[0];

  const parameters: ParameterAnalysis[] = [];
  let scoreDeductions = 0;

  // 1. Soil Moisture Analysis
  const moistureOptimalMin = Math.max(20, stage.moistureTarget - 10);
  const moistureOptimalMax = Math.min(85, stage.moistureTarget + 10);
  const moisture = readings.soilMoisture;
  let moistureStatus: ParameterAnalysis['status'] = 'Optimal';
  let moistureInterp = 'Moisture level is ideal for current growth stage root respiration.';

  if (moisture < crop.optimalRanges.moistureMin) {
    moistureStatus = 'Critical';
    scoreDeductions += 22;
    moistureInterp = `Severe moisture stress. Below minimum threshold (${crop.optimalRanges.moistureMin}%). Stomatal closure and growth stoppage imminent.`;
  } else if (moisture < moistureOptimalMin) {
    moistureStatus = 'Deficient';
    scoreDeductions += 12;
    moistureInterp = `Mild water deficit. Below stage target (${stage.moistureTarget}%). Irrigation needed soon.`;
  } else if (moisture > 85) {
    moistureStatus = 'Critical';
    scoreDeductions += 22;
    moistureInterp = `Waterlogging / root asphyxiation risk. Soil pores filled with water; anaerobic root rot likely.`;
  } else if (moisture > moistureOptimalMax) {
    moistureStatus = 'Excess';
    scoreDeductions += 10;
    moistureInterp = `Slightly high moisture. Exceeds stage optimal (${stage.moistureTarget}%). Halt irrigation.`;
  }

  parameters.push({
    id: 'moisture',
    label: 'Soil Moisture',
    currentValue: moisture,
    unit: '%',
    optimalMin: moistureOptimalMin,
    optimalMax: moistureOptimalMax,
    optimalTarget: stage.moistureTarget,
    status: moistureStatus,
    delta: Number((moisture - stage.moistureTarget).toFixed(1)),
    interpretation: moistureInterp
  });

  // 2. Soil pH Analysis
  const ph = readings.soilPh;
  let phStatus: ParameterAnalysis['status'] = 'Optimal';
  let phInterp = 'Optimal pH range. Maximum availability of all macronutrients and micronutrients.';

  if (ph < 5.5) {
    phStatus = 'Critical';
    scoreDeductions += 18;
    phInterp = `Strongly acidic soil (pH ${ph.toFixed(2)}). Severe aluminum/manganese toxicity; phosphorus and calcium locked out.`;
  } else if (ph < crop.optimalRanges.phMin) {
    phStatus = 'Warning';
    scoreDeductions += 10;
    phInterp = `Moderately acidic soil. Below optimal min (${crop.optimalRanges.phMin}). Micronutrient availability altered.`;
  } else if (ph > 8.2) {
    phStatus = 'Critical';
    scoreDeductions += 18;
    phInterp = `Strongly alkaline / calcareous soil (pH ${ph.toFixed(2)}). Severe lock-out of Iron, Zinc, Boron, and Phosphorus.`;
  } else if (ph > crop.optimalRanges.phMax) {
    phStatus = 'Warning';
    scoreDeductions += 10;
    phInterp = `Slightly alkaline. Above crop optimal max (${crop.optimalRanges.phMax}). Reduced zinc and iron uptake.`;
  }

  parameters.push({
    id: 'ph',
    label: 'Soil pH',
    currentValue: ph,
    unit: 'pH',
    optimalMin: crop.optimalRanges.phMin,
    optimalMax: crop.optimalRanges.phMax,
    optimalTarget: Number(((crop.optimalRanges.phMin + crop.optimalRanges.phMax) / 2).toFixed(1)),
    status: phStatus,
    delta: Number((ph - (crop.optimalRanges.phMin + crop.optimalRanges.phMax) / 2).toFixed(2)),
    interpretation: phInterp
  });

  // 3. Electrical Conductivity (Salinity)
  const ec = readings.ec;
  let ecStatus: ParameterAnalysis['status'] = 'Optimal';
  let ecInterp = 'Non-saline soil. Low osmotic pressure allows normal water absorption by roots.';

  if (ec > crop.optimalRanges.ecMax * 1.4) {
    ecStatus = 'Critical';
    scoreDeductions += 16;
    ecInterp = `Severe salinity stress (${ec} µS/cm). High osmotic suction causes physiological drought and tip burn.`;
  } else if (ec > crop.optimalRanges.ecMax) {
    ecStatus = 'Warning';
    scoreDeductions += 9;
    ecInterp = `Moderate salinity. Exceeds crop tolerance threshold (${crop.optimalRanges.ecMax} µS/cm). Leaching required.`;
  }

  parameters.push({
    id: 'ec',
    label: 'Electrical Conductivity (EC)',
    currentValue: ec,
    unit: 'µS/cm',
    optimalMin: 200,
    optimalMax: crop.optimalRanges.ecMax,
    optimalTarget: Math.round(crop.optimalRanges.ecMax * 0.5),
    status: ecStatus,
    delta: Math.round(ec - crop.optimalRanges.ecMax * 0.5),
    interpretation: ecInterp
  });

  // 4. Nitrogen (N) Analysis
  const n = readings.nitrogen;
  const nTarget = crop.optimalRanges.nitrogenKgHa.target;
  let nStatus: ParameterAnalysis['status'] = 'Optimal';
  let nInterp = 'Nitrogen levels are balanced for steady chlorophyll synthesis and canopy maintenance.';

  if (n < crop.optimalRanges.nitrogenKgHa.min * 0.75) {
    nStatus = 'Critical';
    scoreDeductions += 15;
    nInterp = `Severe Nitrogen deficiency (${n} kg/ha). Pale yellowing of older leaves, stunted tillers, diminished yield.`;
  } else if (n < crop.optimalRanges.nitrogenKgHa.min) {
    nStatus = 'Deficient';
    scoreDeductions += 8;
    nInterp = `Sub-optimal Nitrogen level. Supplementary top-dressing of Urea or organic slurry advised.`;
  } else if (n > crop.optimalRanges.nitrogenKgHa.max * 1.3) {
    nStatus = 'Excess';
    scoreDeductions += 10;
    nInterp = `Excess Nitrogen (${n} kg/ha). Overly lush vegetative canopy vulnerable to sucking pests, lodging, and fungal blast.`;
  }

  parameters.push({
    id: 'nitrogen',
    label: 'Nitrogen (N)',
    currentValue: n,
    unit: 'kg/ha',
    optimalMin: crop.optimalRanges.nitrogenKgHa.min,
    optimalMax: crop.optimalRanges.nitrogenKgHa.max,
    optimalTarget: nTarget,
    status: nStatus,
    delta: Math.round(n - nTarget),
    interpretation: nInterp
  });

  // 5. Phosphorus (P) Analysis
  const p = readings.phosphorus;
  const pTarget = crop.optimalRanges.phosphorusKgHa.target;
  let pStatus: ParameterAnalysis['status'] = 'Optimal';
  let pInterp = 'Adequate phosphorus for root expansion, energy ATP transfer, and flower bud initiation.';

  if (p < crop.optimalRanges.phosphorusKgHa.min * 0.75) {
    pStatus = 'Critical';
    scoreDeductions += 12;
    pInterp = `Phosphorus deficiency (${p} kg/ha). Purplish discoloration on stems and veins; stunted root architecture.`;
  } else if (p < crop.optimalRanges.phosphorusKgHa.min) {
    pStatus = 'Deficient';
    scoreDeductions += 6;
    pInterp = `Low Phosphorus. Below stage requirement (${crop.optimalRanges.phosphorusKgHa.min} kg/ha). Band application of DAP recommended.`;
  } else if (p > crop.optimalRanges.phosphorusKgHa.max * 1.4) {
    pStatus = 'Excess';
    scoreDeductions += 5;
    pInterp = `High Phosphorus. Can interfere with Zinc and Iron micro-nutrient absorption.`;
  }

  parameters.push({
    id: 'phosphorus',
    label: 'Phosphorus (P)',
    currentValue: p,
    unit: 'kg/ha',
    optimalMin: crop.optimalRanges.phosphorusKgHa.min,
    optimalMax: crop.optimalRanges.phosphorusKgHa.max,
    optimalTarget: pTarget,
    status: pStatus,
    delta: Math.round(p - pTarget),
    interpretation: pInterp
  });

  // 6. Potassium (K) Analysis
  const k = readings.potassium;
  const kTarget = crop.optimalRanges.potassiumKgHa.target;
  let kStatus: ParameterAnalysis['status'] = 'Optimal';
  let kInterp = 'Potassium level supports stomatal guard cell regulation, disease resistance, and fruit/grain filling.';

  if (k < crop.optimalRanges.potassiumKgHa.min * 0.75) {
    kStatus = 'Critical';
    scoreDeductions += 12;
    kInterp = `Severe Potassium deficiency (${k} kg/ha). Marginal leaf scorching, weakened stalks, poor fruit size.`;
  } else if (k < crop.optimalRanges.potassiumKgHa.min) {
    kStatus = 'Deficient';
    scoreDeductions += 6;
    kInterp = `Low Potassium. Application of Muriate of Potash (MOP) or foliar SOP advised.`;
  } else if (k > crop.optimalRanges.potassiumKgHa.max * 1.4) {
    kStatus = 'Excess';
    scoreDeductions += 4;
    kInterp = `High Potassium. May compete with Magnesium uptake.`;
  }

  parameters.push({
    id: 'potassium',
    label: 'Potassium (K)',
    currentValue: k,
    unit: 'kg/ha',
    optimalMin: crop.optimalRanges.potassiumKgHa.min,
    optimalMax: crop.optimalRanges.potassiumKgHa.max,
    optimalTarget: kTarget,
    status: kStatus,
    delta: Math.round(k - kTarget),
    interpretation: kInterp
  });

  // 7. Air Temperature Analysis
  const temp = readings.airTemperature;
  let tempStatus: ParameterAnalysis['status'] = 'Optimal';
  let tempInterp = 'Ambient air temperature is well suited for optimal photosynthesis and enzyme activity.';

  if (temp < crop.optimalRanges.tempMin - 3) {
    tempStatus = 'Critical';
    scoreDeductions += 10;
    tempInterp = `Cold stress (${temp.toFixed(1)}°C). Photosynthesis slows significantly; pollen sterility risk.`;
  } else if (temp < crop.optimalRanges.tempMin) {
    tempStatus = 'Warning';
    scoreDeductions += 5;
    tempInterp = `Slightly low temperature. Slows metabolic rate.`;
  } else if (temp > crop.optimalRanges.tempMax + 4) {
    tempStatus = 'Critical';
    scoreDeductions += 14;
    tempInterp = `High heat stress (${temp.toFixed(1)}°C). High evapotranspiration, pollen desiccation, and flower shedding risk.`;
  } else if (temp > crop.optimalRanges.tempMax) {
    tempStatus = 'Warning';
    scoreDeductions += 6;
    tempInterp = `Warm ambient temperature. Monitor transpiration and increase irrigation frequency.`;
  }

  parameters.push({
    id: 'airTemperature',
    label: 'Air Temperature',
    currentValue: temp,
    unit: '°C',
    optimalMin: crop.optimalRanges.tempMin,
    optimalMax: crop.optimalRanges.tempMax,
    optimalTarget: crop.optimalRanges.tempOptimal,
    status: tempStatus,
    delta: Number((temp - crop.optimalRanges.tempOptimal).toFixed(1)),
    interpretation: tempInterp
  });

  // 8. Relative Humidity Analysis
  const humidity = readings.relativeHumidity;
  let humStatus: ParameterAnalysis['status'] = 'Optimal';
  let humInterp = 'Relative humidity maintains favorable leaf transpiration without triggering disease spore germination.';

  if (humidity < crop.optimalRanges.humidityMin - 15) {
    humStatus = 'Warning';
    scoreDeductions += 6;
    humInterp = `Very dry ambient air (${humidity.toFixed(0)}%). Severe vapor pressure deficit accelerates soil drying.`;
  } else if (humidity > crop.optimalRanges.humidityMax + 10) {
    humStatus = 'Warning';
    scoreDeductions += 8;
    humInterp = `High atmospheric humidity (${humidity.toFixed(0)}%). Creates high risk micro-climate for fungal and bacterial leaf blights.`;
  }

  parameters.push({
    id: 'relativeHumidity',
    label: 'Relative Humidity',
    currentValue: humidity,
    unit: '%',
    optimalMin: crop.optimalRanges.humidityMin,
    optimalMax: crop.optimalRanges.humidityMax,
    optimalTarget: Math.round((crop.optimalRanges.humidityMin + crop.optimalRanges.humidityMax) / 2),
    status: humStatus,
    delta: Math.round(humidity - (crop.optimalRanges.humidityMin + crop.optimalRanges.humidityMax) / 2),
    interpretation: humInterp
  });

  // Compute Composite Health Score (0 - 100)
  const healthScore = Math.max(10, Math.min(100, Math.round(100 - scoreDeductions)));
  let healthRating: CropAnalysisResult['healthRating'] = 'Excellent';
  let healthSummary = `Optimal crop growing conditions for ${crop.name} at the ${stage.name} stage. Maintain current agronomic practices.`;

  if (healthScore < 50) {
    healthRating = 'Critical Stress';
    healthSummary = `Critical agronomic stress detected for ${crop.name}. Multiple vital soil/climate parameters violate safe cultivation boundaries. Immediate intervention required.`;
  } else if (healthScore < 70) {
    healthRating = 'Needs Attention';
    healthSummary = `Moderate deficiencies or stresses identified for ${crop.name}. Targeted fertilizer top-dressing or irrigation adjustments will prevent yield loss.`;
  } else if (healthScore < 85) {
    healthRating = 'Good';
    healthSummary = `Healthy growing conditions with minor room for optimization in ${crop.name} nutrition or moisture management.`;
  }

  // Soil Diagnostics
  let phCategory: 'Acidic' | 'Neutral' | 'Alkaline' = 'Neutral';
  let phImpact = 'Neutral soil promotes maximum solubility and absorption of macro and micronutrients.';
  let phAmendment = 'No pH adjustment required. Soil buffering capacity is balanced.';

  if (ph < 6.0) {
    phCategory = 'Acidic';
    phImpact = 'Acidic soil restricts phosphorus, calcium, and magnesium uptake while increasing toxic aluminum availability.';
    phAmendment = 'Apply Agricultural Limestone (CaCO3) or Dolomite @ 200 - 300 kg/acre before irrigation to neutralize acidity.';
  } else if (ph > 7.6) {
    phCategory = 'Alkaline';
    phImpact = 'Alkaline soil causes chemical precipitation of phosphorus and micronutrients (Fe, Zn, Mn).';
    phAmendment = 'Apply Agricultural Gypsum (CaSO4) @ 150 - 250 kg/acre or Elemental Sulfur @ 25 kg/acre + organic compost to lower pH.';
  }

  let salinityCategory: 'Non-saline' | 'Slightly saline' | 'Moderately saline' | 'Severely saline' = 'Non-saline';
  let salinityAction = 'Normal irrigation schedule. Zero salt accumulation danger.';

  if (ec > 3000) {
    salinityCategory = 'Severely saline';
    salinityAction = 'Heavy leaching irrigation required with deep drainage channels. Apply Gypsum to displace sodium ions.';
  } else if (ec > 2000) {
    salinityCategory = 'Moderately saline';
    salinityAction = 'Increase irrigation volume by 20% to leach soluble salts below root zone. Avoid saline canal/well water.';
  } else if (ec > 1400) {
    salinityCategory = 'Slightly saline';
    salinityAction = 'Ensure proper field drainage; incorporate organic green manuring to buffer salt ions.';
  }

  let moistureCategory: 'Severe Deficit' | 'Mild Deficit' | 'Optimal' | 'High' | 'Waterlogged' = 'Optimal';
  let irrigationAdvice = `Maintain standard schedule. Soil moisture is optimal for ${stage.name}.`;

  if (moisture < 25) {
    moistureCategory = 'Severe Deficit';
    irrigationAdvice = `URGENT: Provide immediate deep irrigation (35-40 mm or 4-5 hours drip cycle). Severe wilting risk.`;
  } else if (moisture < crop.optimalRanges.moistureMin) {
    moistureCategory = 'Mild Deficit';
    irrigationAdvice = `Apply scheduled irrigation (20-25 mm drip or furrow) within the next 24 hours to prevent moisture stress.`;
  } else if (moisture > 82) {
    moistureCategory = 'Waterlogged';
    irrigationAdvice = `EMERGENCY: Open field drainage ditches immediately. Stop all irrigation. Aerobic respiration blocked.`;
  } else if (moisture > moistureOptimalMax) {
    moistureCategory = 'High';
    irrigationAdvice = `Hold off irrigation for 2-3 days until topsoil moisture drops into optimal range (${moistureOptimalMin}-${moistureOptimalMax}%).`;
  }

  // Nutrient Prescriptions (NPK)
  const nutrientPrescriptions: NutrientRecommendation[] = [
    {
      nutrient: 'Nitrogen (N)',
      currentLevel: n,
      targetLevel: nTarget,
      unit: 'kg/ha',
      status: n < crop.optimalRanges.nitrogenKgHa.min ? 'Deficient' : n > crop.optimalRanges.nitrogenKgHa.max ? 'Excess' : 'Optimal',
      chemicalFertilizer: n < crop.optimalRanges.nitrogenKgHa.min ? 'Urea (46% N) or Ammonium Sulfate' : n > crop.optimalRanges.nitrogenKgHa.max ? 'Hold Nitrogen applications' : 'Maintenance dose',
      dosage: n < crop.optimalRanges.nitrogenKgHa.min ? `${Math.round((nTarget - n) * 0.9)} kg Urea per acre` : n > crop.optimalRanges.nitrogenKgHa.max ? '0 kg (skip next 2 top-dressings)' : 'Continue normal split schedule',
      organicAlternative: 'Well-decomposed Cow Dung FYM (2 tonnes/acre) + Jeevamrit (200 L/acre) via irrigation',
      applicationMethod: 'Band placement 5 cm away from plant stem followed by light irrigation, or drip fertigation'
    },
    {
      nutrient: 'Phosphorus (P)',
      currentLevel: p,
      targetLevel: pTarget,
      unit: 'kg/ha',
      status: p < crop.optimalRanges.phosphorusKgHa.min ? 'Deficient' : p > crop.optimalRanges.phosphorusKgHa.max ? 'Excess' : 'Optimal',
      chemicalFertilizer: p < crop.optimalRanges.phosphorusKgHa.min ? 'Di-Ammonium Phosphate (DAP 18:46:0) or SSP (16% P2O5)' : 'Maintenance dose',
      dosage: p < crop.optimalRanges.phosphorusKgHa.min ? `${Math.round((pTarget - p) * 1.1)} kg DAP per acre` : '0 kg',
      organicAlternative: 'Bone meal (50 kg/acre) or Rock Phosphate with Phosphate Solubilizing Bacteria (PSB) culture (2 kg/acre)',
      applicationMethod: 'Deep placement near active root zone (Phosphorus has low soil mobility)'
    },
    {
      nutrient: 'Potassium (K)',
      currentLevel: k,
      targetLevel: kTarget,
      unit: 'kg/ha',
      status: k < crop.optimalRanges.potassiumKgHa.min ? 'Deficient' : k > crop.optimalRanges.potassiumKgHa.max ? 'Excess' : 'Optimal',
      chemicalFertilizer: k < crop.optimalRanges.potassiumKgHa.min ? 'Muriate of Potash (MOP 0:0:60) or Sulfate of Potash (SOP 0:0:50)' : 'Maintenance dose',
      dosage: k < crop.optimalRanges.potassiumKgHa.min ? `${Math.round((kTarget - k) * 0.8)} kg MOP per acre` : '0 kg',
      organicAlternative: 'Wood ash (100 kg/acre) or Potash Solubilizing Bacteria (KSB) culture (2 kg/acre)',
      applicationMethod: 'Soil placement along furrows or water-soluble foliar spray of 0:0:50 @ 1.5% during fruit/grain filling'
    }
  ];

  // Disease Risk Warnings based on real weather conditions
  const diseaseRisks: DiseaseRiskWarning[] = [];
  if (humidity > 75 && temp >= 20 && temp <= 30) {
    diseaseRisks.push({
      diseaseName: 'Fungal Leaf Blight / Downy Mildew',
      riskLevel: humidity > 85 ? 'High' : 'Moderate',
      triggerReason: `High atmospheric humidity (${humidity.toFixed(0)}%) coupled with warm temperature (${temp.toFixed(1)}°C) creates ideal spore germination environment.`,
      preventiveAction: 'Avoid overhead sprinkler watering; improve inter-plant air circulation by trimming lower aged foliage.',
      chemicalControl: 'Prophylactic spray of Mancozeb 75 WP @ 2.5 g/liter or Azoxystrobin @ 1 ml/liter'
    });
  }

  if (temp > 32 && humidity < 50) {
    diseaseRisks.push({
      diseaseName: 'Sucking Pests (Thrips, Mites & Whiteflies)',
      riskLevel: temp > 35 ? 'High' : 'Moderate',
      triggerReason: `Hot dry weather (${temp.toFixed(1)}°C, ${humidity.toFixed(0)}% RH) accelerates reproductive multiplication of sap-sucking insects.`,
      preventiveAction: 'Install yellow & blue sticky traps (15 traps/acre); spray neem oil 10,000 ppm @ 2 ml/liter.',
      chemicalControl: 'Diafenthiuron 50 WP @ 1.2 g/liter or Fipronil 5 SC @ 1.5 ml/liter'
    });
  }

  if (moisture > 75) {
    diseaseRisks.push({
      diseaseName: 'Root Rot & Collar Rot (Pythium / Rhizoctonia)',
      riskLevel: moisture > 82 ? 'High' : 'Moderate',
      triggerReason: `Excessive soil moisture (${moisture.toFixed(1)}%) promotes anaerobic soil-borne pathogenic fungi attacking collar region.`,
      preventiveAction: 'Ensure zero stagnant water in plots; apply Trichoderma harzianum @ 2.5 kg/acre with vermicompost.',
      chemicalControl: 'Drench collar region with Metalaxyl + Mancozeb (Ridomil MZ) @ 2 g/liter or Copper Oxychloride @ 3 g/liter'
    });
  }

  if (diseaseRisks.length === 0) {
    diseaseRisks.push({
      diseaseName: 'General Canopy Health',
      riskLevel: 'Low',
      triggerReason: 'Current ambient microclimate (temperature, humidity, soil moisture) does not present acute pathogen outbreak conditions.',
      preventiveAction: 'Continue weekly scouting of underside of leaves and branch axils.',
      chemicalControl: 'No chemical pesticide application recommended at this time.'
    });
  }

  // Action Checklist
  const immediateActions: string[] = [];
  const upcomingActions: string[] = [];
  const routineActions: string[] = [];

  if (moisture < crop.optimalRanges.moistureMin) {
    immediateActions.push(`Irrigate plot ${context.plotName} immediately (${irrigationAdvice})`);
  } else if (moisture > 80) {
    immediateActions.push(`Open drainage furrows immediately to purge excess standing water.`);
  }

  if (ph < 5.8 || ph > 8.0) {
    upcomingActions.push(`Apply recommended soil amendment (${phAmendment})`);
  }

  if (n < crop.optimalRanges.nitrogenKgHa.min) {
    upcomingActions.push(`Apply ${nutrientPrescriptions[0].dosage} for vegetative vigor`);
  }
  if (p < crop.optimalRanges.phosphorusKgHa.min) {
    upcomingActions.push(`Incorporate ${nutrientPrescriptions[1].dosage} into the root zone`);
  }
  if (k < crop.optimalRanges.potassiumKgHa.min) {
    upcomingActions.push(`Supply ${nutrientPrescriptions[2].dosage} to boost plant defense`);
  }

  if (diseaseRisks.some(r => r.riskLevel === 'High')) {
    immediateActions.push(`Spray prophylactic bio-fungicide / insecticide for ${diseaseRisks.find(r => r.riskLevel === 'High')?.diseaseName}`);
  }

  routineActions.push(`Check tensiometer / soil moisture probe reading before next irrigation.`);
  routineActions.push(`Inspect 20 random plants across ${context.plotName} for early pest infestation.`);
  routineActions.push(`Record growth metrics (plant height / tillering count) for stage ${stage.name}.`);

  return {
    analysisId: `ca-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    analyzedAt: new Date().toISOString(),
    cropId: crop.id,
    cropName: crop.name,
    cropCategory: crop.category,
    stageId: stage.stageId,
    stageName: stage.name,
    farmId: context.farmId,
    farmName: context.farmName,
    plotName: context.plotName,
    source: context.source,
    healthScore,
    healthRating,
    healthSummary,
    parameters,
    soilDiagnostics: {
      phCategory,
      phImpact,
      phAmendment,
      salinityCategory,
      salinityAction,
      moistureCategory,
      irrigationAdvice
    },
    nutrientPrescriptions,
    diseaseRisks,
    stageAdvice: {
      stageName: stage.name,
      waterRequirement: stage.waterNeed,
      nutrientPriority: stage.nutrientPriority,
      actionableTips: stage.managementTips
    },
    actionChecklist: {
      immediate: immediateActions.length > 0 ? immediateActions : ['Conditions within safe boundaries. Maintain regular farm oversight.'],
      upcomingDays: upcomingActions.length > 0 ? upcomingActions : ['Prepare scheduled maintenance top dressing as per stage timeline.'],
      routine: routineActions
    }
  };
}
