export type CropCategory = 'Cereals & Millets' | 'Pulses & Legumes' | 'Vegetables' | 'Fruits' | 'Cash Crops & Spices';

export interface CropGrowthStage {
  stageId: string;
  name: string;
  daysRange: string;
  description: string;
  moistureTarget: number; // optimal soil moisture %
  waterNeed: 'Low' | 'Moderate' | 'High' | 'Critical';
  nutrientPriority: string; // e.g., 'High Nitrogen', 'High Phosphorus', 'High Potassium'
  managementTips: string;
}

export interface PestDiseaseInfo {
  name: string;
  type: 'Fungal' | 'Bacterial' | 'Viral' | 'Insect / Pest' | 'Nutritional / Fungal' | 'Nutritional / Physiological';
  favorableConditions: string;
  symptoms: string;
  prevention: string;
  organicRemedy: string;
  chemicalControl: string;
}

export interface CropProfile {
  id: string;
  name: string;
  scientificName: string;
  localName: string; // Marathi / Hindi name
  category: CropCategory;
  emoji: string;
  durationDays: number;
  season: 'Kharif' | 'Rabi' | 'Zaid' | 'Perennial' | 'Multi-season';
  soilTypes: string[];
  waterRequirementMm: number;
  optimalRanges: {
    moistureMin: number;
    moistureMax: number;
    moistureOptimal: number;
    tempMin: number;
    tempMax: number;
    tempOptimal: number;
    humidityMin: number;
    humidityMax: number;
    phMin: number;
    phMax: number;
    ecMax: number; // in µS/cm (or dS/m * 1000)
    nitrogenKgHa: { min: number; max: number; target: number };
    phosphorusKgHa: { min: number; max: number; target: number };
    potassiumKgHa: { min: number; max: number; target: number };
  };
  growthStages: CropGrowthStage[];
  commonPestsAndDiseases: PestDiseaseInfo[];
  fertilizerSchedule: {
    basalDose: string;
    topDressing1: string;
    topDressing2: string;
    foliarSprays: string;
  };
  irrigationSchedule: string;
}

export const CROPS_CATALOG: CropProfile[] = [
  // ==================== CEREALS & MILLETS ====================
  {
    id: 'crop-wheat',
    name: 'Wheat',
    scientificName: 'Triticum aestivum',
    localName: 'गहू (Gehun)',
    category: 'Cereals & Millets',
    emoji: '🌾',
    durationDays: 120,
    season: 'Rabi',
    soilTypes: ['Well-drained loam', 'Clay loam', 'Alluvial soil'],
    waterRequirementMm: 450,
    optimalRanges: {
      moistureMin: 30,
      moistureMax: 55,
      moistureOptimal: 42,
      tempMin: 15,
      tempMax: 25,
      tempOptimal: 20,
      humidityMin: 50,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 2000,
      nitrogenKgHa: { min: 100, max: 150, target: 120 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 40, max: 60, target: 40 }
    },
    growthStages: [
      { stageId: 'crown-root', name: 'Crown Root Initiation (CRI)', daysRange: '20-25 days', description: 'Most critical stage for irrigation; crown roots develop.', moistureTarget: 45, waterNeed: 'Critical', nutrientPriority: 'Nitrogen & Phosphorus', managementTips: 'First irrigation mandatory at CRI (21 DAS).' },
      { stageId: 'tillering', name: 'Tillering', daysRange: '26-45 days', description: 'Vegetative stem production determining yield potential.', moistureTarget: 40, waterNeed: 'Moderate', nutrientPriority: 'High Nitrogen', managementTips: 'Apply first top dressing of Urea (30 kg/acre).' },
      { stageId: 'jointing', name: 'Late Jointing / Booting', daysRange: '46-70 days', description: 'Rapid stem elongation and embryonic ear development.', moistureTarget: 42, waterNeed: 'High', nutrientPriority: 'Balanced NPK', managementTips: 'Apply second top dressing of Nitrogen if moisture permits.' },
      { stageId: 'flowering', name: 'Flowering & Anthesis', daysRange: '71-90 days', description: 'Pollen shedding and fertilization.', moistureTarget: 45, waterNeed: 'Critical', nutrientPriority: 'Potassium & Micronutrients', managementTips: 'Avoid water stress; spray 13:0:45 foliar spray.' },
      { stageId: 'grain-filling', name: 'Milking & Dough', daysRange: '91-110 days', description: 'Carbohydrate accumulation in grains.', moistureTarget: 35, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Maintain light soil moisture, stop irrigation 10 days before harvest.' },
      { stageId: 'maturity', name: 'Maturity & Ripening', daysRange: '111-125 days', description: 'Grains harden; moisture falls below 14%.', moistureTarget: 20, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest when straw turns yellow and grains crack between teeth.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Brown / Yellow Rust', type: 'Fungal', favorableConditions: 'Cool weather (15-20°C) with high humidity', symptoms: 'Yellow or orange-brown pustules in linear rows on leaves', prevention: 'Use resistant varieties (PBW-550, HD-2967)', organicRemedy: 'Neem seed kernel extract 5%', chemicalControl: 'Propiconazole 25 EC @ 1 ml/liter water' },
      { name: 'Termites', type: 'Insect / Pest', favorableConditions: 'Dry sandy soil with low moisture', symptoms: 'Drying of seedlings, roots chewed off', prevention: 'Seed treatment with Chlorpyrifos', organicRemedy: 'Metarhizium anisopliae @ 2 kg/acre', chemicalControl: 'Fipronil 0.3% GR @ 8 kg/acre' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 25 kg Zinc Sulfate per acre at sowing',
      topDressing1: '35 kg Urea at Crown Root Initiation (21-25 days)',
      topDressing2: '35 kg Urea at Jointing stage (45-50 days)',
      foliarSprays: '19:19:19 @ 1% at vegetative stage; 0:52:34 @ 1% at booting'
    },
    irrigationSchedule: '6 critical irrigations: CRI (21 DAS), Tillering (42 DAS), Jointing (65 DAS), Flowering (85 DAS), Milking (100 DAS), Dough (115 DAS).'
  },
  {
    id: 'crop-paddy-dry',
    name: 'Paddy (Dry Seeded)',
    scientificName: 'Oryza sativa (DSR)',
    localName: 'भात (कोरडवाहू / DSR)',
    category: 'Cereals & Millets',
    emoji: '🌾',
    durationDays: 125,
    season: 'Kharif',
    soilTypes: ['Clay loam', 'Silty clay', 'Black cotton soil'],
    waterRequirementMm: 800,
    optimalRanges: {
      moistureMin: 45,
      moistureMax: 75,
      moistureOptimal: 60,
      tempMin: 22,
      tempMax: 34,
      tempOptimal: 28,
      humidityMin: 65,
      humidityMax: 85,
      phMin: 5.5,
      phMax: 7.0,
      ecMax: 1500,
      nitrogenKgHa: { min: 120, max: 160, target: 140 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 50, max: 80, target: 60 }
    },
    growthStages: [
      { stageId: 'emergence', name: 'Germination & Emergence', daysRange: '0-15 days', description: 'Seedling emergence without standing water.', moistureTarget: 55, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Ensure aerobic soil moisture; spray pre-emergence herbicide.' },
      { stageId: 'tillering', name: 'Active Tillering', daysRange: '16-45 days', description: 'Tillers multiply; rapid root elongation.', moistureTarget: 65, waterNeed: 'High', nutrientPriority: 'Nitrogen & Zinc', managementTips: 'Split dose of nitrogen + Zinc sulfate 10 kg/acre.' },
      { stageId: 'panicle', name: 'Panicle Initiation', daysRange: '46-75 days', description: 'Inflorescence initiates at node level.', moistureTarget: 70, waterNeed: 'Critical', nutrientPriority: 'Balanced NPK', managementTips: 'Maintain field capacity; never allow moisture to drop below 50%.' },
      { stageId: 'flowering', name: 'Heading & Flowering', daysRange: '76-95 days', description: 'Flowering and spikelet fertilization.', moistureTarget: 70, waterNeed: 'Critical', nutrientPriority: 'Potassium', managementTips: 'Protect from blast and brown planthopper.' },
      { stageId: 'grain-fill', name: 'Milking & Grain Filling', daysRange: '96-115 days', description: 'Grain development and dry matter accumulation.', moistureTarget: 55, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Alternate wetting and drying cycle.' },
      { stageId: 'ripening', name: 'Ripening', daysRange: '116-125 days', description: 'Grains turn golden yellow.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Drain excess field water 10 days before harvest.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Rice Blast', type: 'Fungal', favorableConditions: 'Night temp 20-24°C with relative humidity > 90%', symptoms: 'Spindle-shaped lesions with brown borders on leaf and neck', prevention: 'Avoid excess nitrogen fertilizer', organicRemedy: 'Pseudomonas fluorescens @ 5 g/kg seed', chemicalControl: 'Tricyclazole 75 WP @ 0.6 g/liter water' },
      { name: 'Brown Planthopper (BPH)', type: 'Insect / Pest', favorableConditions: 'Stagnant warm microclimate with dense canopy', symptoms: 'Hopper burn — patches of yellow drying plants', prevention: 'Provide alleyways every 2-3 meters', organicRemedy: 'Neem oil 10,000 ppm @ 2 ml/liter', chemicalControl: 'Pymetrozine 50 WG @ 0.6 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 10 kg Zinc Sulfate per acre',
      topDressing1: '30 kg Urea at active tillering (30 DAS)',
      topDressing2: '30 kg Urea at panicle initiation (60 DAS)',
      foliarSprays: '0:52:34 @ 1% at panicle emergence'
    },
    irrigationSchedule: 'Irrigate at hair-crack soil stage; maintain saturation during panicle initiation and flowering.'
  },
  {
    id: 'crop-paddy-transplanted',
    name: 'Paddy (Transplanted)',
    scientificName: 'Oryza sativa (Lowland)',
    localName: 'भात (रोपवाटिका लावणी)',
    category: 'Cereals & Millets',
    emoji: '🌾',
    durationDays: 135,
    season: 'Kharif',
    soilTypes: ['Clay loam', 'Alluvial clay', 'Black cotton soil'],
    waterRequirementMm: 1200,
    optimalRanges: {
      moistureMin: 60,
      moistureMax: 95,
      moistureOptimal: 80,
      tempMin: 22,
      tempMax: 35,
      tempOptimal: 29,
      humidityMin: 70,
      humidityMax: 90,
      phMin: 5.5,
      phMax: 6.8,
      ecMax: 1200,
      nitrogenKgHa: { min: 120, max: 150, target: 135 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 60, max: 90, target: 75 }
    },
    growthStages: [
      { stageId: 'nursery', name: 'Nursery & Seedling', daysRange: '0-25 days', description: 'Raising robust 3-4 leaf seedlings.', moistureTarget: 85, waterNeed: 'High', nutrientPriority: 'Phosphorus', managementTips: 'Maintain shallow standing water (2-3 cm).' },
      { stageId: 'transplanting', name: 'Transplanting & Recovery', daysRange: '26-40 days', description: 'Transplanting 2-3 seedlings per hill at 20x15 cm spacing.', moistureTarget: 90, waterNeed: 'Critical', nutrientPriority: 'Basal NPK', managementTips: 'Maintain 2-5 cm water layer to cushion seedling shock.' },
      { stageId: 'tillering', name: 'Tillering', daysRange: '41-70 days', description: 'Production of secondary and tertiary tillers.', moistureTarget: 85, waterNeed: 'High', nutrientPriority: 'Nitrogen & Zinc', managementTips: 'Apply first urea split; weed control.' },
      { stageId: 'panicle', name: 'Panicle Initiation & Booting', daysRange: '71-95 days', description: 'Stem swells; panicle forms inside sheath.', moistureTarget: 90, waterNeed: 'Critical', nutrientPriority: 'Potassium & Nitrogen', managementTips: 'Never allow dry stress; maintain 5 cm water.' },
      { stageId: 'flowering', name: 'Flowering & Grain Filling', daysRange: '96-120 days', description: 'Pollen drop, milky and dough grain accumulation.', moistureTarget: 75, waterNeed: 'High', nutrientPriority: 'Potassium', managementTips: 'Alternate wetting and drying (AWD) saves water.' },
      { stageId: 'harvest', name: 'Ripening & Harvest', daysRange: '121-135 days', description: 'Grain moisture drops to 14-16%.', moistureTarget: 40, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Stop watering 10-14 days before harvest.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Bacterial Leaf Blight (BLB)', type: 'Bacterial', favorableConditions: 'Windy rains, warm temperature (28-34°C)', symptoms: 'Water-soaked wavy lesions starting at leaf tips turning straw-white', prevention: 'Seed treatment; balance nitrogen fertilizer', organicRemedy: 'Cow dung water extract 20% spray', chemicalControl: 'Copper Oxychloride 50 WP @ 2.5 g + Streptocycline @ 0.1 g/liter' },
      { name: 'Stem Borer', type: 'Insect / Pest', favorableConditions: 'High humidity and warm cloudy weather', symptoms: 'Dead hearts in vegetative stage; white ears in reproductive stage', prevention: 'Pheromone traps @ 8 per acre', organicRemedy: 'Trichogramma japonicum egg parasitoid cards', chemicalControl: 'Chlorantraniliprole 18.5 SC @ 0.3 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 10 kg Zinc Sulfate per acre at puddling',
      topDressing1: '35 kg Urea at 21 days after transplanting',
      topDressing2: '30 kg Urea + 15 kg MOP at panicle initiation (45 DAT)',
      foliarSprays: '13:0:45 @ 1% at flowering'
    },
    irrigationSchedule: 'Maintain 2-5 cm standing water from transplanting till dough stage; drain field 12 days before harvest.'
  },
  {
    id: 'crop-maize',
    name: 'Maize',
    scientificName: 'Zea mays',
    localName: 'मका (Makka)',
    category: 'Cereals & Millets',
    emoji: '🌽',
    durationDays: 105,
    season: 'Multi-season',
    soilTypes: ['Well-drained sandy loam', 'Loam', 'Deep fertile alluvial'],
    waterRequirementMm: 500,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 65,
      moistureOptimal: 50,
      tempMin: 18,
      tempMax: 32,
      tempOptimal: 26,
      humidityMin: 50,
      humidityMax: 75,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 1800,
      nitrogenKgHa: { min: 120, max: 180, target: 150 },
      phosphorusKgHa: { min: 60, max: 80, target: 70 },
      potassiumKgHa: { min: 40, max: 70, target: 50 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Emergence & V4 (Knee High)', daysRange: '0-25 days', description: 'Early root growth; sensitive to waterlogging.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Prevent standing water; thin seedlings to 1 plant/hill.' },
      { stageId: 'tasseling', name: 'Tasseling & Silking', daysRange: '45-65 days', description: 'Male tassel and female silk emergence; peak water demand.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Nitrogen & Potassium', managementTips: 'Severe drought stress here causes poor kernel set.' },
      { stageId: 'grain-fill', name: 'Grain Filling & Blister/Milk', daysRange: '66-88 days', description: 'Starch deposition inside cob kernels.', moistureTarget: 50, waterNeed: 'High', nutrientPriority: 'Potassium', managementTips: 'Ensure uniform soil moisture.' },
      { stageId: 'maturity', name: 'Physiological Maturity (Black Layer)', daysRange: '89-105 days', description: 'Cob husks dry; black layer forms at kernel base.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest when cob moisture drops below 20%.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Fall Armyworm (FAW)', type: 'Insect / Pest', favorableConditions: 'Warm dry spells followed by rain (25-32°C)', symptoms: 'Pinholes in whorl leaves, ragged leaves with sawdust-like frass', prevention: 'Intercropping with pulses; bird perches', organicRemedy: 'Nomuraea rileyi or Bacillus thuringiensis @ 2 g/liter', chemicalControl: 'Emamectin benzoate 5 SG @ 0.4 g/liter or Spinetoram 11.7 SC @ 0.5 ml/liter' },
      { name: 'Turcicum Leaf Blight', type: 'Fungal', favorableConditions: 'Moderate temp (20-25°C) with high humidity', symptoms: 'Long elliptical grayish-green or tan lesions on leaves', prevention: 'Crop rotation; balanced N-P-K', organicRemedy: 'Trichoderma harzianum soil application', chemicalControl: 'Mancozeb 75 WP @ 2.5 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 10 kg Zinc Sulfate per acre at sowing',
      topDressing1: '40 kg Urea at knee-high stage (30 DAS)',
      topDressing2: '35 kg Urea at tasseling initiation (50 DAS)',
      foliarSprays: 'Zinc EDTA @ 1 g/liter if leaf interveinal chlorosis appears'
    },
    irrigationSchedule: 'Irrigate at Knee-high (30 DAS), Tasseling (50 DAS), Silking (65 DAS), and Dough stage (80 DAS).'
  },
  {
    id: 'crop-bajra',
    name: 'Bajra (Pearl Millet)',
    scientificName: 'Pennisetum glaucum',
    localName: 'बाजरी (Bajri)',
    category: 'Cereals & Millets',
    emoji: '🌾',
    durationDays: 85,
    season: 'Kharif',
    soilTypes: ['Light sandy loam', 'Red sandy', 'Shallow black soil'],
    waterRequirementMm: 300,
    optimalRanges: {
      moistureMin: 25,
      moistureMax: 50,
      moistureOptimal: 35,
      tempMin: 20,
      tempMax: 38,
      tempOptimal: 30,
      humidityMin: 40,
      humidityMax: 65,
      phMin: 6.5,
      phMax: 8.0,
      ecMax: 3000,
      nitrogenKgHa: { min: 60, max: 90, target: 80 },
      phosphorusKgHa: { min: 30, max: 45, target: 40 },
      potassiumKgHa: { min: 20, max: 40, target: 30 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Seedling & Tillering', daysRange: '0-25 days', description: 'Rapid taproot penetration; drought-tolerant seedling.', moistureTarget: 35, waterNeed: 'Low', nutrientPriority: 'Nitrogen & Phosphorus', managementTips: 'Thinning to maintain 10-12 cm intra-row spacing.' },
      { stageId: 'booting', name: 'Booting & Earhead Emergence', daysRange: '35-50 days', description: 'Cylindrical spike emerges from flag leaf.', moistureTarget: 40, waterNeed: 'Critical', nutrientPriority: 'Nitrogen', managementTips: 'Provide protective irrigation if rain fails.' },
      { stageId: 'grain-fill', name: 'Grain Formation & Maturity', daysRange: '51-85 days', description: 'Milky and dough stage; grain filling.', moistureTarget: 30, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Protect earheads from bird damage.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Downy Mildew (Green Ear)', type: 'Fungal', favorableConditions: 'High humidity (> 80%) with temp 20-25°C', symptoms: 'Chlorotic striping on leaves, earheads transform into leafy structures', prevention: 'Seed treatment with Metalaxyl-M (Apron XL)', organicRemedy: 'Neem seed kernel extract 5%', chemicalControl: 'Metalaxyl + Mancozeb (Ridomil MZ) @ 2 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '30 kg DAP + 15 kg MOP per acre at sowing',
      topDressing1: '25 kg Urea at 30 days after sowing (after weeding)',
      topDressing2: 'Not required under rainfed conditions',
      foliarSprays: '19:19:19 @ 1% at vegetative stage'
    },
    irrigationSchedule: 'Requires only 2-3 irrigations if rainfall is deficient: Tillering (25-30 DAS) and Flowering (45-50 DAS).'
  },
  {
    id: 'crop-ragi',
    name: 'Ragi (Finger Millet)',
    scientificName: 'Eleusine coracana',
    localName: 'नाचणी (Nachani / Ragi)',
    category: 'Cereals & Millets',
    emoji: '🌾',
    durationDays: 110,
    season: 'Kharif',
    soilTypes: ['Red loam', 'Lateritic soil', 'Light gravelly soil'],
    waterRequirementMm: 350,
    optimalRanges: {
      moistureMin: 30,
      moistureMax: 60,
      moistureOptimal: 42,
      tempMin: 18,
      tempMax: 34,
      tempOptimal: 26,
      humidityMin: 55,
      humidityMax: 75,
      phMin: 5.5,
      phMax: 7.2,
      ecMax: 2000,
      nitrogenKgHa: { min: 60, max: 90, target: 75 },
      phosphorusKgHa: { min: 30, max: 45, target: 40 },
      potassiumKgHa: { min: 30, max: 50, target: 40 }
    },
    growthStages: [
      { stageId: 'nursery', name: 'Nursery / Direct Sowing', daysRange: '0-25 days', description: 'Seedling emergence and nursery maintenance.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Transplant 21-day seedlings at 25x10 cm.' },
      { stageId: 'tillering', name: 'Tillering & Stem Elongation', daysRange: '26-55 days', description: 'Tillering determines finger head numbers.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Nitrogen', managementTips: 'Interculturing and first top dressing of urea.' },
      { stageId: 'flowering', name: 'Heading (Finger Emergence)', daysRange: '56-80 days', description: 'Fingers spread outwards with spikelets.', moistureTarget: 50, waterNeed: 'Critical', nutrientPriority: 'Balanced NPK', managementTips: 'Ensure adequate moisture; protect against blast.' },
      { stageId: 'maturity', name: 'Grain Hardening & Harvest', daysRange: '81-110 days', description: 'Earheads turn dark brown.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest mature earheads in 2 pickings.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Finger Millet Blast', type: 'Fungal', favorableConditions: 'Intermittent rains, cloudy days, temp 22-26°C', symptoms: 'Diamond lesions on leaf blades, neck rot, and finger blast', prevention: 'Seed treatment with Carbendazim @ 2 g/kg', organicRemedy: 'Cow urine spray 10% + Hing (asafoetida)', chemicalControl: 'Kitazin 48 EC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '25 kg DAP + 15 kg MOP per acre at final land preparation',
      topDressing1: '25 kg Urea at 3 weeks after transplanting',
      topDressing2: 'Optional: 15 kg Urea at flowering under irrigation',
      foliarSprays: 'Multi-micronutrient spray @ 2 g/liter at vegetative stage'
    },
    irrigationSchedule: 'Irrigate immediately after transplanting; critical intervals at tillering and flowering stages.'
  },

  // ==================== PULSES & LEGUMES ====================
  {
    id: 'crop-soybean',
    name: 'Soybean',
    scientificName: 'Glycine max',
    localName: 'सोयाबीन (Soyabean)',
    category: 'Pulses & Legumes',
    emoji: '🌱',
    durationDays: 100,
    season: 'Kharif',
    soilTypes: ['Deep black cotton soil', 'Well-drained clay loam', 'Silt loam'],
    waterRequirementMm: 500,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 60,
      moistureOptimal: 48,
      tempMin: 20,
      tempMax: 32,
      tempOptimal: 26,
      humidityMin: 55,
      humidityMax: 80,
      phMin: 6.0,
      phMax: 7.2,
      ecMax: 1500,
      nitrogenKgHa: { min: 25, max: 40, target: 30 }, // Fixes atmospheric N
      phosphorusKgHa: { min: 60, max: 80, target: 70 },
      potassiumKgHa: { min: 40, max: 60, target: 50 }
    },
    growthStages: [
      { stageId: 'emergence', name: 'Germination & VE/VC', daysRange: '0-15 days', description: 'Cotyledon emergence and unifoliolate leaf expansion.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus & Rhizobium', managementTips: 'Seed inoculate with Bradyrhizobium + PSB culture.' },
      { stageId: 'vegetative', name: 'Vegetative (V3-V6)', daysRange: '16-40 days', description: 'Trifoliolate leaf development; root nodule formation.', moistureTarget: 48, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus & Sulfur', managementTips: 'Check nodule color: pink indicates active nitrogen fixation.' },
      { stageId: 'flowering', name: 'Flowering (R1-R2)', daysRange: '41-60 days', description: 'Purple or white flowers at nodes; critical stage.', moistureTarget: 52, waterNeed: 'Critical', nutrientPriority: 'Boron & Potassium', managementTips: 'Water stress causes massive flower drop; provide irrigation.' },
      { stageId: 'pod-dev', name: 'Pod Development (R3-R5)', daysRange: '61-80 days', description: 'Pod elongation and seed expansion.', moistureTarget: 50, waterNeed: 'Critical', nutrientPriority: 'Potassium & Sulfur', managementTips: 'Spray 0:52:34 + Micronutrients for seed plumpness.' },
      { stageId: 'maturity', name: 'Maturity & Leaf Drop (R7-R8)', daysRange: '81-100 days', description: 'Leaves turn yellow and fall off; pods turn brown.', moistureTarget: 25, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest when pod moisture is 13-14% to prevent shattering.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Yellow Mosaic Virus (YMV)', type: 'Viral', favorableConditions: 'Warm dry periods favoring whitefly population', symptoms: 'Bright yellow alternating with green patches on leaves', prevention: 'Control whitefly vector promptly', organicRemedy: 'Yellow sticky traps (15/acre) + Neem oil 10,000 ppm', chemicalControl: 'Thiamethoxam 25 WG @ 0.3 g/liter or Acetamiprid 20 SP @ 0.2 g/liter' },
      { name: 'Girdle Beetle & Spodoptera', type: 'Insect / Pest', favorableConditions: 'Warm humid weather during vegetative stage', symptoms: 'Ring-like cut on stem causing plant death above the girdle', prevention: 'Avoid dense sowing; maintain proper drainage', organicRemedy: 'Nomuraea rileyi @ 2 g/liter', chemicalControl: 'Chlorantraniliprole 18.5 SC @ 0.3 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg Single Super Phosphate (SSP) + 25 kg MOP + 10 kg Sulfur 90% per acre',
      topDressing1: 'Not required if nodules are active (Rhizobium inoculated)',
      topDressing2: 'Optional: 15 kg Urea only if nodulation fails',
      foliarSprays: '19:19:19 @ 1% at vegetative (30 DAS); 0:52:34 @ 1% at pod formation (60 DAS)'
    },
    irrigationSchedule: 'Crucial at Flowering (35-45 DAS) and Pod Filling (60-70 DAS). Avoid waterlogging at all costs.'
  },
  {
    id: 'crop-red-gram',
    name: 'Red Gram / Pigeon Pea (Tur)',
    scientificName: 'Cajanus cajan',
    localName: 'तूर (Arhar / Tur)',
    category: 'Pulses & Legumes',
    emoji: '🌿',
    durationDays: 160,
    season: 'Kharif',
    soilTypes: ['Deep well-drained loam', 'Medium to deep black soil'],
    waterRequirementMm: 600,
    optimalRanges: {
      moistureMin: 30,
      moistureMax: 60,
      moistureOptimal: 45,
      tempMin: 18,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 50,
      humidityMax: 75,
      phMin: 6.5,
      phMax: 8.0,
      ecMax: 1500,
      nitrogenKgHa: { min: 20, max: 30, target: 25 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 20, max: 40, target: 30 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Seedling & Branching', daysRange: '0-40 days', description: 'Deep taproot penetration (up to 2 meters); slow vegetative start.', moistureTarget: 40, waterNeed: 'Low', nutrientPriority: 'Phosphorus', managementTips: 'First weeding at 30 days; nip terminal buds to stimulate branching.' },
      { stageId: 'branching', name: 'Active Branching & Canopies', daysRange: '41-80 days', description: 'Expansion of primary and secondary fruiting branches.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Sulfur & Phosphorus', managementTips: 'Ensure no water accumulation in root zone.' },
      { stageId: 'flowering', name: 'Flower Bud Initiation & Bloom', daysRange: '81-120 days', description: 'Copious yellow flowers bloom.', moistureTarget: 50, waterNeed: 'Critical', nutrientPriority: 'Boron & Potassium', managementTips: 'First protective irrigation if soil is dry; spray Planofix for flower retention.' },
      { stageId: 'podding', name: 'Pod Formation & Seed Filling', daysRange: '121-150 days', description: 'Pods fill with 4-6 seeds.', moistureTarget: 45, waterNeed: 'Critical', nutrientPriority: 'Potassium', managementTips: 'Monitor for Helicoverpa pod borer larvae.' },
      { stageId: 'maturity', name: 'Maturity & Desiccation', daysRange: '151-165 days', description: 'Pods turn dark brown/black; leaves drop.', moistureTarget: 25, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest when 80% pods dry out.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Pod Borer (Helicoverpa armigera)', type: 'Insect / Pest', favorableConditions: 'Cloudy weather during flowering and pod development', symptoms: 'Circular holes bored into pods with head inside eating seeds', prevention: 'Pheromone traps (Helilure @ 5/acre); intercrop with coriander', organicRemedy: 'HaNPV 250 LE @ 1 ml/liter + Neem oil', chemicalControl: 'Chlorantraniliprole 18.5 SC @ 0.3 ml/liter or Flubendiamide 39.35 SC @ 0.2 ml/liter' },
      { name: 'Fusarium Wilt', type: 'Fungal', favorableConditions: 'Soil compaction, waterlogging, temp 25-30°C', symptoms: 'Black vascular striping beneath bark; sudden wilting of branches', prevention: 'Use wilt-resistant cultivars (BDN-711, BSMR-736)', organicRemedy: 'Trichoderma viride 2.5 kg/acre in compost', chemicalControl: 'Soil drenching with Carbendazim @ 1 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 20 kg MOP + 10 kg Zinc Sulfate + 10 kg Sulfur 90% per acre',
      topDressing1: 'None needed under rainfed (legume fixates own N)',
      topDressing2: 'Not required',
      foliarSprays: '00:52:34 (1%) + Boron (0.1%) at 50% flowering'
    },
    irrigationSchedule: 'Provide protective irrigation at Flower Initiation (90-100 DAS) and Pod Development (120-130 DAS).'
  },
  {
    id: 'crop-green-gram',
    name: 'Green Gram (Moong)',
    scientificName: 'Vigna radiata',
    localName: 'मूग (Moong)',
    category: 'Pulses & Legumes',
    emoji: '🌱',
    durationDays: 65,
    season: 'Multi-season',
    soilTypes: ['Well-drained sandy loam', 'Loam', 'Medium black soil'],
    waterRequirementMm: 300,
    optimalRanges: {
      moistureMin: 30,
      moistureMax: 55,
      moistureOptimal: 42,
      tempMin: 22,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 50,
      humidityMax: 70,
      phMin: 6.2,
      phMax: 7.5,
      ecMax: 1500,
      nitrogenKgHa: { min: 15, max: 25, target: 20 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 20, max: 35, target: 25 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Germination & Seedling', daysRange: '0-15 days', description: 'Fast uniform germination; early taproot growth.', moistureTarget: 40, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Seed treatment with Rhizobium and PSB culture.' },
      { stageId: 'vegetative', name: 'Branching & Canopy', daysRange: '16-30 days', description: 'Vegetative growth; nodules fix nitrogen.', moistureTarget: 42, waterNeed: 'Moderate', nutrientPriority: 'Sulfur & Phosphorus', managementTips: 'One hand weeding or hoeing at 20 DAS.' },
      { stageId: 'flowering', name: 'Flowering', daysRange: '31-45 days', description: 'Synchronized yellow flowers at upper nodes.', moistureTarget: 48, waterNeed: 'Critical', nutrientPriority: 'Boron', managementTips: 'Irrigate once if soil moisture is under 30%.' },
      { stageId: 'podding', name: 'Pod Filling & Maturity', daysRange: '46-65 days', description: 'Pods turn blackish-brown and dry.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest in 2-3 pickings or single cut when 85% pods mature.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Yellow Mosaic Virus', type: 'Viral', favorableConditions: 'Warm dry conditions with whitefly incidence', symptoms: 'Yellow mosaic mottling on leaves; stunted plants', prevention: 'Plant YMV-tolerant varieties (BM-2003-2, Utkarsha)', organicRemedy: 'Neem oil spray + yellow sticky traps', chemicalControl: 'Diafenthiuron 50 WP @ 1.2 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '35 kg DAP + 15 kg MOP per acre',
      topDressing1: 'Not required',
      topDressing2: 'Not required',
      foliarSprays: 'Foliar spray of 2% DAP or 19:19:19 (1%) at flowering'
    },
    irrigationSchedule: 'Usually rainfed in Kharif; in Summer crop irrigate every 10-12 days (critical at flowering and pod setting).'
  },
  {
    id: 'crop-black-gram',
    name: 'Black Gram (Urad)',
    scientificName: 'Vigna mungo',
    localName: 'उडीद (Udid / Urad)',
    category: 'Pulses & Legumes',
    emoji: '🌱',
    durationDays: 75,
    season: 'Kharif',
    soilTypes: ['Heavy black cotton soil', 'Clay loam', 'Well-drained alluvial'],
    waterRequirementMm: 350,
    optimalRanges: {
      moistureMin: 32,
      moistureMax: 60,
      moistureOptimal: 45,
      tempMin: 22,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 55,
      humidityMax: 75,
      phMin: 6.5,
      phMax: 7.8,
      ecMax: 1500,
      nitrogenKgHa: { min: 15, max: 25, target: 20 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 20, max: 35, target: 25 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Seedling Emergence', daysRange: '0-15 days', description: 'Germination and unifoliolate leaf expansion.', moistureTarget: 42, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Treat seed with Trichoderma and Rhizobium.' },
      { stageId: 'vegetative', name: 'Vegetative Growth', daysRange: '16-35 days', description: 'Lateral branch production.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Sulfur & Phosphorus', managementTips: 'Maintain field weed-free during first 30 days.' },
      { stageId: 'flowering', name: 'Flowering & Podding', daysRange: '36-55 days', description: 'Bright yellow flowers emerge; pods elongate.', moistureTarget: 50, waterNeed: 'Critical', nutrientPriority: 'Boron & Potassium', managementTips: 'Spray 13:0:45 @ 1% to boost pod setting.' },
      { stageId: 'maturity', name: 'Pod Maturation & Harvest', daysRange: '56-75 days', description: 'Pods turn black.', moistureTarget: 28, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest early morning to prevent pod shattering.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Powdery Mildew', type: 'Fungal', favorableConditions: 'Cool nights and warm humid days', symptoms: 'White powdery patches on leaves and pods', prevention: 'Resistant varieties (TAU-1)', organicRemedy: 'Sulfur 80 WP @ 2.5 g/liter', chemicalControl: 'Hexaconazole 5 EC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '35 kg DAP + 15 kg MOP + 10 kg Micronutrient mix per acre',
      topDressing1: 'Not required',
      topDressing2: 'Not required',
      foliarSprays: '19:19:19 (1%) at 25 DAS; 0:52:34 (1%) at pod formation'
    },
    irrigationSchedule: 'Critical stages: Flowering (35 DAS) and Pod development (50 DAS).'
  },
  {
    id: 'crop-chickpea',
    name: 'Bengal Gram / Chickpea (Chana)',
    scientificName: 'Cicer arietinum',
    localName: 'हरभरा / चणा (Chana)',
    category: 'Pulses & Legumes',
    emoji: '🌱',
    durationDays: 105,
    season: 'Rabi',
    soilTypes: ['Medium to deep black soil', 'Clay loam', 'Alluvial soil'],
    waterRequirementMm: 350,
    optimalRanges: {
      moistureMin: 28,
      moistureMax: 55,
      moistureOptimal: 40,
      tempMin: 15,
      tempMax: 28,
      tempOptimal: 22,
      humidityMin: 45,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 8.0,
      ecMax: 1800,
      nitrogenKgHa: { min: 20, max: 30, target: 25 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 30, max: 50, target: 40 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Seedling & Nipping', daysRange: '0-30 days', description: 'Early vegetative growth.', moistureTarget: 38, waterNeed: 'Low', nutrientPriority: 'Phosphorus', managementTips: 'Nipping (plucking top shoots) at 30 DAS triggers profuse branching.' },
      { stageId: 'branching', name: 'Branching & Canopy', daysRange: '31-55 days', description: 'Bushy branch canopy formation.', moistureTarget: 42, waterNeed: 'Moderate', nutrientPriority: 'Sulfur & Phosphorus', managementTips: 'Hoeing and earthing-up.' },
      { stageId: 'flowering', name: 'Flowering', daysRange: '56-75 days', description: 'Pink or white flowers appear.', moistureTarget: 45, waterNeed: 'Critical', nutrientPriority: 'Boron & Potassium', managementTips: 'Do not flood irrigate at peak flowering; use sprinkler or light furrow.' },
      { stageId: 'podding', name: 'Pod Development', daysRange: '76-95 days', description: 'Pods swell with 1-2 seeds each.', moistureTarget: 40, waterNeed: 'Critical', nutrientPriority: 'Potassium', managementTips: 'Monitor for Helicoverpa gram pod borer.' },
      { stageId: 'maturity', name: 'Maturity', daysRange: '96-105 days', description: 'Foliage turns yellowish brown and dries.', moistureTarget: 22, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest when pods rattle upon shaking.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Gram Pod Borer (Helicoverpa armigera)', type: 'Insect / Pest', favorableConditions: 'Warm sunny weather during podding', symptoms: 'Round holes in pods with devoured seeds', prevention: 'Install bird perches (20/acre) and pheromone traps', organicRemedy: 'Neem oil 10,000 ppm + HaNPV 250 LE', chemicalControl: 'Emamectin benzoate 5 SG @ 0.4 g/liter or Chlorantraniliprole @ 0.3 ml/liter' },
      { name: 'Fusarium Wilt', type: 'Fungal', favorableConditions: 'High soil temperature at seedling and flowering stages', symptoms: 'Drooping petioles, vascular browning in split stem', prevention: 'Use resistant varieties (Digvijay, Vijay, JAKI-9218)', organicRemedy: 'Seed treatment with Trichoderma @ 5 g/kg seed', chemicalControl: 'Carbendazim 50 WP @ 1.5 g/kg seed' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 20 kg MOP + 10 kg Sulfur per acre at sowing',
      topDressing1: 'Not required',
      topDressing2: 'Not required',
      foliarSprays: 'Foliar spray of 2% Urea or 0:52:34 at pod formation'
    },
    irrigationSchedule: 'Only 1-2 light irrigations needed: Pre-flowering (45 DAS) and Pod development (70 DAS).'
  },
  {
    id: 'crop-groundnut',
    name: 'Groundnut / Peanut',
    scientificName: 'Arachis hypogaea',
    localName: 'भुईमूग (Bhuimug)',
    category: 'Pulses & Legumes',
    emoji: '🥜',
    durationDays: 115,
    season: 'Multi-season',
    soilTypes: ['Sandy loam', 'Light loamy soil', 'Red sandy loam (friable)'],
    waterRequirementMm: 500,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 65,
      moistureOptimal: 50,
      tempMin: 22,
      tempMax: 34,
      tempOptimal: 28,
      humidityMin: 50,
      humidityMax: 75,
      phMin: 6.0,
      phMax: 7.2,
      ecMax: 1500,
      nitrogenKgHa: { min: 25, max: 40, target: 30 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 40, max: 60, target: 50 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Emergence & Vegetative', daysRange: '0-25 days', description: 'Four-leaflet leaves emerge; taproot expands.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Seed treated with Rhizobium and Trichoderma.' },
      { stageId: 'flowering', name: 'Flowering & Pegging', daysRange: '26-50 days', description: 'Yellow flowers self-pollinate; gynophore pegs grow downward into soil.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Calcium & Sulfur (Gypsum)', managementTips: 'Apply Gypsum (200 kg/acre) around plants; keep soil loose for peg penetration.' },
      { stageId: 'pod-dev', name: 'Pod Development', daysRange: '51-85 days', description: 'Underground pods swell and shell hardens.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Calcium', managementTips: 'Maintain consistent soil moisture; drought causes unfilled pods (pops).' },
      { stageId: 'maturity', name: 'Maturity & Harvest', daysRange: '86-115 days', description: 'Inner shell turns dark brown with veined markings.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Irrigate lightly before uprooting to prevent pod detachment in soil.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Tikka Disease (Leaf Spot)', type: 'Fungal', favorableConditions: 'Warm humid weather (25-30°C) with prolonged leaf wetness', symptoms: 'Dark brown spots with yellow halos on older leaves', prevention: 'Seed treatment; crop rotation', organicRemedy: 'Neem seed kernel extract 5%', chemicalControl: 'Tebuconazole 25.9 EC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg Single Super Phosphate (SSP) + 25 kg MOP + 15 kg Urea per acre',
      topDressing1: '200 kg Gypsum at flowering / pegging stage (40-45 DAS)',
      topDressing2: 'Not required',
      foliarSprays: 'Ferrous sulfate 0.5% + Citric acid 0.1% if iron chlorosis occurs'
    },
    irrigationSchedule: 'Critical irrigations: Flowering (30-35 DAS), Pegging (45-50 DAS), and Pod formation (65-75 DAS).'
  },

  // ==================== VEGETABLES ====================
  {
    id: 'crop-tomato',
    name: 'Tomato',
    scientificName: 'Solanum lycopersicum',
    localName: 'टोमॅटो (Tomato)',
    category: 'Vegetables',
    emoji: '🍅',
    durationDays: 130,
    season: 'Multi-season',
    soilTypes: ['Well-drained sandy loam', 'Loam', 'Rich alluvial with organic matter'],
    waterRequirementMm: 600,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 65,
      moistureOptimal: 50,
      tempMin: 18,
      tempMax: 30,
      tempOptimal: 24,
      humidityMin: 50,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 7.0,
      ecMax: 1800,
      nitrogenKgHa: { min: 100, max: 150, target: 125 },
      phosphorusKgHa: { min: 60, max: 90, target: 75 },
      potassiumKgHa: { min: 100, max: 160, target: 130 }
    },
    growthStages: [
      { stageId: 'nursery', name: 'Transplanting & Establishment', daysRange: '0-20 days', description: 'Seedling transplanting; root establishment.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: '19:19:19 & Phosphorus', managementTips: 'Drench with Humic acid + 12:61:00 for rapid rooting.' },
      { stageId: 'vegetative', name: 'Vegetative & Staking', daysRange: '21-45 days', description: 'Intense shoot and foliage expansion; flower cluster emergence.', moistureTarget: 52, waterNeed: 'High', nutrientPriority: 'Nitrogen & Calcium', managementTips: 'Provide bamboo or trellis staking; prune side suckers.' },
      { stageId: 'flowering', name: 'Flowering & Fruit Set', daysRange: '46-70 days', description: 'Prolific yellow flowers setting green fruits.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Boron & Calcium', managementTips: 'Spray Calcium-Boron to prevent Blossom End Rot.' },
      { stageId: 'fruiting', name: 'Fruit Development & Color Break', daysRange: '71-105 days', description: 'Fruits enlarge and turn pink/red (breaker stage).', moistureTarget: 50, waterNeed: 'Critical', nutrientPriority: 'High Potassium (0:0:50)', managementTips: 'Maintain consistent soil moisture; irregular irrigation causes fruit cracking.' },
      { stageId: 'harvest', name: 'Harvesting & Picking', daysRange: '106-130 days', description: 'Multi-round pickings every 3-4 days.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: '13:0:45', managementTips: 'Pick at breaker stage for distant markets; firm red for local processing.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Early & Late Blight', type: 'Fungal', favorableConditions: 'High humidity (> 80%), temp 18-24°C, dew or rain', symptoms: 'Concentric target spots on lower leaves turning black; water-soaked fruit rot', prevention: 'Mulching; drip irrigation (avoid wetting leaves)', organicRemedy: 'Trichoderma viride + Copper hydroxide', chemicalControl: 'Azoxystrobin 18.2% + Difenoconazole 11.4% SC @ 1 ml/liter' },
      { name: 'Tomato Leaf Curl Virus (TLCV)', type: 'Viral', favorableConditions: 'High temperature and dry conditions favoring whiteflies', symptoms: 'Upward curling, crinkling, severe stunting of plants', prevention: 'Plant TLCV-resistant hybrids (Abhinav, US-440)', organicRemedy: 'Silver reflective mulch + yellow sticky traps', chemicalControl: 'Cyantraniliprole 10.26 OD @ 1.8 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 40 kg MOP + 15 kg Magnesium Sulfate + 10 kg Micronutrient mix per acre',
      topDressing1: 'Fertigation via drip: 12:61:00 (3 kg/acre/week) from 15-40 DAT',
      topDressing2: 'Fertigation: 19:19:19 (4 kg/acre/week) + 13:0:45 (4 kg/acre/week) during fruiting',
      foliarSprays: 'Chelated Calcium (1 g/liter) + Boron 20% (1 g/liter) at flowering'
    },
    irrigationSchedule: 'Drip irrigation recommended: 2-3 liters per plant per day; avoid erratic watering to prevent blossom end rot.'
  },
  {
    id: 'crop-onion',
    name: 'Onion',
    scientificName: 'Allium cepa',
    localName: 'कांदा (Kanda)',
    category: 'Vegetables',
    emoji: '🧅',
    durationDays: 120,
    season: 'Multi-season',
    soilTypes: ['Rich friable sandy loam', 'Loam', 'Silt loam free of stones'],
    waterRequirementMm: 450,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 60,
      moistureOptimal: 48,
      tempMin: 15,
      tempMax: 30,
      tempOptimal: 22,
      humidityMin: 45,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 1400,
      nitrogenKgHa: { min: 80, max: 120, target: 100 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 60, max: 100, target: 80 }
    },
    growthStages: [
      { stageId: 'establishment', name: 'Transplanting & Rooting', daysRange: '0-25 days', description: 'Transplanting 45-day seedlings on raised beds.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Maintain shallow planting; do not bury bulb root plate too deep.' },
      { stageId: 'vegetative', name: 'Vegetative Foliage Growth', daysRange: '26-55 days', description: 'Rapid leaf generation; each leaf creates a bulb scale.', moistureTarget: 50, waterNeed: 'High', nutrientPriority: 'Nitrogen & Sulfur', managementTips: 'Top dress with Urea + Ammonium sulfate for pungency and firmness.' },
      { stageId: 'bulb-dev', name: 'Bulb Initiation & Swelling', daysRange: '56-95 days', description: 'Bulb expands; critical water and potassium stage.', moistureTarget: 52, waterNeed: 'Critical', nutrientPriority: 'Potassium & Sulfur', managementTips: 'Stop all nitrogen fertilizers to avoid split bulbs and neck rot.' },
      { stageId: 'curing', name: 'Neck Fall & Field Curing', daysRange: '96-120 days', description: 'Top foliage softens and falls over (50-70% neck fall).', moistureTarget: 25, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Withhold water completely 15 days before harvest; field cure 4 days.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Onion Thrips (Thrips tabaci)', type: 'Insect / Pest', favorableConditions: 'Dry, warm weather (25-32°C)', symptoms: 'Silvery white patches and sunken streaks on leaves', prevention: 'Blue sticky traps (15/acre); avoid water stress', organicRemedy: 'Verticillium lecanii @ 3 g/liter', chemicalControl: 'Fipronil 5 SC @ 1.5 ml/liter or Spinosad 45 SC @ 0.3 ml/liter' },
      { name: 'Purple Blotch', type: 'Fungal', favorableConditions: 'Warm humid weather (28-30°C) with rain/dew', symptoms: 'Small water-soaked sunken lesions turning purplish brown with yellow borders', prevention: 'Proper field drainage; crop rotation', organicRemedy: 'Neem cake soil application + Trichoderma', chemicalControl: 'Difenoconazole 25 EC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 25 kg MOP + 15 kg Sulfur 90% per acre',
      topDressing1: '30 kg Urea at 30 days after transplanting',
      topDressing2: '25 kg Urea at 45 days after transplanting (strictly no N after 60 days)',
      foliarSprays: '0:52:34 @ 1% at 60 DAT; 0:0:50 @ 1% at 75 DAT for bulb size'
    },
    irrigationSchedule: 'Irrigate every 6-8 days in winter, 4-5 days in summer; stop irrigation 15 days prior to harvest.'
  },
  {
    id: 'crop-potato',
    name: 'Potato',
    scientificName: 'Solanum tuberosum',
    localName: 'बटाटा (Batata)',
    category: 'Vegetables',
    emoji: '🥔',
    durationDays: 100,
    season: 'Rabi',
    soilTypes: ['Loose, well-aerated sandy loam', 'Loam rich in humus'],
    waterRequirementMm: 500,
    optimalRanges: {
      moistureMin: 40,
      moistureMax: 70,
      moistureOptimal: 55,
      tempMin: 15,
      tempMax: 24,
      tempOptimal: 18,
      humidityMin: 55,
      humidityMax: 75,
      phMin: 5.2,
      phMax: 6.8,
      ecMax: 1500,
      nitrogenKgHa: { min: 120, max: 180, target: 150 },
      phosphorusKgHa: { min: 80, max: 120, target: 100 },
      potassiumKgHa: { min: 100, max: 150, target: 125 }
    },
    growthStages: [
      { stageId: 'sprouting', name: 'Sprouting & Emergence', daysRange: '0-20 days', description: 'Tubers sprout and emerge through ridges.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Use certified disease-free seed tubers.' },
      { stageId: 'vegetative', name: 'Vegetative & Earthing Up', daysRange: '21-45 days', description: 'Dense canopy growth; earthing-up to cover tubers.', moistureTarget: 55, waterNeed: 'High', nutrientPriority: 'Nitrogen & Phosphorus', managementTips: 'Earth up soil around plants to prevent greening of tubers.' },
      { stageId: 'tuber-init', name: 'Tuber Initiation & Bulking', daysRange: '46-80 days', description: 'Stolons hook and swell into tubers; high water need.', moistureTarget: 60, waterNeed: 'Critical', nutrientPriority: 'Potassium & Calcium', managementTips: 'Avoid moisture fluctuations to prevent tuber cracking and knobbiness.' },
      { stageId: 'haulm-cut', name: 'Haulm Cutting & Skin Hardening', daysRange: '81-100 days', description: 'Cut green foliage 10 days before harvest to harden skin.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Dehaulming prevents aphid virus transmission and thickens tuber peel.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Late Blight (Phytophthora infestans)', type: 'Fungal', favorableConditions: 'Fog, high humidity (> 90%), temp 12-20°C', symptoms: 'Water-soaked blackish lesions on leaves with white mould on underside', prevention: 'Prophylactic Mancozeb spray before winter rains', organicRemedy: 'Bordeaux mixture 1%', chemicalControl: 'Cymoxanil + Mancozeb (Sectin) @ 2 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '75 kg 10:26:26 + 50 kg SSP + 30 kg MOP per acre',
      topDressing1: '40 kg Urea at first earthing up (30 DAS)',
      topDressing2: '20 kg Urea + 10 kg Potassium sulfate at tuber initiation (45 DAS)',
      foliarSprays: '0:0:50 @ 1.5% at tuber enlargement stage'
    },
    irrigationSchedule: 'Light, frequent irrigations (every 6-8 days); avoid water reaching the top of ridges.'
  },
  {
    id: 'crop-brinjal',
    name: 'Brinjal / Eggplant',
    scientificName: 'Solanum melongena',
    localName: 'वांगी (Vangi)',
    category: 'Vegetables',
    emoji: '🍆',
    durationDays: 140,
    season: 'Multi-season',
    soilTypes: ['Deep rich silt loam', 'Clay loam', 'Well-drained black soil'],
    waterRequirementMm: 650,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 65,
      moistureOptimal: 50,
      tempMin: 20,
      tempMax: 32,
      tempOptimal: 26,
      humidityMin: 50,
      humidityMax: 75,
      phMin: 6.0,
      phMax: 7.2,
      ecMax: 1800,
      nitrogenKgHa: { min: 100, max: 140, target: 120 },
      phosphorusKgHa: { min: 50, max: 80, target: 60 },
      potassiumKgHa: { min: 50, max: 80, target: 60 }
    },
    growthStages: [
      { stageId: 'establishment', name: 'Transplanting & Establishment', daysRange: '0-25 days', description: 'Transplanting 30-day seedlings at 90x60 cm.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: '19:19:19', managementTips: 'Dip roots in Imidacloprid solution before transplanting.' },
      { stageId: 'vegetative', name: 'Vegetative Branching', daysRange: '26-55 days', description: 'Sturdy bush forms with dark green leaves.', moistureTarget: 50, waterNeed: 'High', nutrientPriority: 'Nitrogen & Micronutrients', managementTips: 'Top dress with Urea; earth up rows.' },
      { stageId: 'flowering', name: 'Flowering & Fruiting', daysRange: '56-90 days', description: 'Purple flowers set shiny fruits.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Boron', managementTips: 'Clip shoot borer affected wilting tips immediately.' },
      { stageId: 'harvesting', name: 'Continuous Picking', daysRange: '91-140 days', description: 'Harvest glossy fruits every 4-5 days.', moistureTarget: 45, waterNeed: 'High', nutrientPriority: '13:0:45', managementTips: 'Avoid delaying harvest; overripe fruits develop bitter seeds.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Shoot & Fruit Borer (Leucinodes orbonalis)', type: 'Insect / Pest', favorableConditions: 'Warm humid weather throughout fruiting', symptoms: 'Drooping withered shoots; bored holes plugged with excreta in fruits', prevention: 'Install Lucilure pheromone traps (10/acre); prune withered shoots', organicRemedy: 'Neem oil 10,000 ppm + Bacillus thuringiensis', chemicalControl: 'Chlorantraniliprole 18.5 SC @ 0.4 ml/liter or Emamectin benzoate @ 0.4 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 10 kg Zinc Sulfate per acre',
      topDressing1: '30 kg Urea at 30 days after transplanting',
      topDressing2: '25 kg Urea + 15 kg MOP at first fruit picking (60 DAT)',
      foliarSprays: '0:52:34 @ 1% + Micronutrient spray every 15 days during flush'
    },
    irrigationSchedule: 'Irrigate every 4-5 days in summer and 8-10 days in winter; avoid dry spells during flowering.'
  },
  {
    id: 'crop-okra',
    name: 'Okra / Ladyfinger',
    scientificName: 'Abelmoschus esculentus',
    localName: 'भेंडी (Bhendi)',
    category: 'Vegetables',
    emoji: '🥬',
    durationDays: 95,
    season: 'Multi-season',
    soilTypes: ['Sandy loam to clay loam', 'Rich alluvial', 'Well-aerated black soil'],
    waterRequirementMm: 450,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 60,
      moistureOptimal: 48,
      tempMin: 22,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 50,
      humidityMax: 75,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 1600,
      nitrogenKgHa: { min: 80, max: 120, target: 100 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 40, max: 60, target: 50 }
    },
    growthStages: [
      { stageId: 'emergence', name: 'Emergence & Seedling', daysRange: '0-20 days', description: 'Fast seedling germination.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Soak seeds in water 12 hours before sowing.' },
      { stageId: 'vegetative', name: 'Vegetative Growth', daysRange: '21-40 days', description: 'Shoot elongation and leaf expansion.', moistureTarget: 48, waterNeed: 'High', nutrientPriority: 'Nitrogen', managementTips: 'Weeding and earthing up.' },
      { stageId: 'flowering', name: 'Flowering & Pod Setting', daysRange: '41-60 days', description: 'Yellow hibiscus-like flowers bloom and set tender pods.', moistureTarget: 52, waterNeed: 'Critical', nutrientPriority: 'Balanced NPK', managementTips: 'Keep soil moist; water stress makes pods fibrous.' },
      { stageId: 'harvesting', name: 'Continuous Harvest', daysRange: '61-95 days', description: 'Harvest tender 8-10 cm pods every alternate day.', moistureTarget: 45, waterNeed: 'High', nutrientPriority: 'Potassium', managementTips: 'Pick tender pods promptly before they turn woody.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Yellow Vein Mosaic Virus (YVMV)', type: 'Viral', favorableConditions: 'Warm weather encouraging whitefly vector', symptoms: 'Vein clearing turning completely yellow network on leaves', prevention: 'Plant YVMV-resistant hybrids (Radhika, Singham)', organicRemedy: 'Neem oil spray + yellow sticky traps', chemicalControl: 'Acetamiprid 20 SP @ 0.3 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '40 kg DAP + 25 kg MOP per acre',
      topDressing1: '25 kg Urea at 30 days after sowing',
      topDressing2: '20 kg Urea at 50 days after sowing',
      foliarSprays: '19:19:19 @ 1% at vegetative stage'
    },
    irrigationSchedule: 'Irrigate every 4-5 days in summer and 8-10 days in winter.'
  },
  {
    id: 'crop-cabbage',
    name: 'Cabbage',
    scientificName: 'Brassica oleracea var. capitata',
    localName: 'कोबी (Kobi)',
    category: 'Vegetables',
    emoji: '🥬',
    durationDays: 90,
    season: 'Rabi',
    soilTypes: ['Sandy loam', 'Clay loam rich in organic matter'],
    waterRequirementMm: 400,
    optimalRanges: {
      moistureMin: 40,
      moistureMax: 70,
      moistureOptimal: 55,
      tempMin: 15,
      tempMax: 24,
      tempOptimal: 18,
      humidityMin: 60,
      humidityMax: 80,
      phMin: 6.0,
      phMax: 7.2,
      ecMax: 1600,
      nitrogenKgHa: { min: 120, max: 160, target: 140 },
      phosphorusKgHa: { min: 60, max: 80, target: 70 },
      potassiumKgHa: { min: 60, max: 90, target: 75 }
    },
    growthStages: [
      { stageId: 'nursery', name: 'Transplanting & Establishment', daysRange: '0-20 days', description: 'Transplant 25-day seedlings.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Dip seedling roots in Trichoderma solution.' },
      { stageId: 'cupping', name: 'Foliage & Head Cupping', daysRange: '21-50 days', description: 'Leaves curve inward to initiate head formation.', moistureTarget: 55, waterNeed: 'High', nutrientPriority: 'Nitrogen & Calcium', managementTips: 'Apply second urea dose; ensure continuous moisture.' },
      { stageId: 'heading', name: 'Head Formation & Firming', daysRange: '51-80 days', description: 'Head densifies and hardens.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Boron', managementTips: 'Maintain steady moisture; sudden watering after dry spell splits heads.' },
      { stageId: 'harvest', name: 'Harvest', daysRange: '81-90 days', description: 'Heads are rock-solid and mature.', moistureTarget: 35, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Cut firm heads with 2-3 outer wrapper leaves.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Diamondback Moth (DBM)', type: 'Insect / Pest', favorableConditions: 'Warm dry periods in winter/spring', symptoms: 'Windowing on leaves; caterpillars feeding inside head', prevention: 'Intercrop with mustard as trap crop (2 rows per 25 cabbage rows)', organicRemedy: 'Bacillus thuringiensis (Bt) @ 1.5 g/liter', chemicalControl: 'Spinetoram 11.7 SC @ 0.8 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 30 kg SSP + 10 kg Boron 20% per acre',
      topDressing1: '35 kg Urea at 25 DAT',
      topDressing2: '25 kg Urea at 45 DAT (cupping stage)',
      foliarSprays: 'Boron 20% (1 g/liter) at head initiation'
    },
    irrigationSchedule: 'Irrigate every 6-8 days; avoid heavy flood irrigation at maturity to avoid head cracking.'
  },
  {
    id: 'crop-cauliflower',
    name: 'Cauliflower',
    scientificName: 'Brassica oleracea var. botrytis',
    localName: 'फ्लॉवर (Flower)',
    category: 'Vegetables',
    emoji: '🥦',
    durationDays: 95,
    season: 'Rabi',
    soilTypes: ['Deep loamy soil', 'Clay loam high in organic carbon'],
    waterRequirementMm: 450,
    optimalRanges: {
      moistureMin: 40,
      moistureMax: 70,
      moistureOptimal: 55,
      tempMin: 15,
      tempMax: 24,
      tempOptimal: 18,
      humidityMin: 60,
      humidityMax: 80,
      phMin: 6.0,
      phMax: 7.0,
      ecMax: 1500,
      nitrogenKgHa: { min: 120, max: 160, target: 140 },
      phosphorusKgHa: { min: 60, max: 90, target: 75 },
      potassiumKgHa: { min: 60, max: 90, target: 75 }
    },
    growthStages: [
      { stageId: 'establishment', name: 'Transplanting & Rooting', daysRange: '0-25 days', description: 'Seedlings establish root system.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Prevent root galling with bio-nematicide.' },
      { stageId: 'vegetative', name: 'Vegetative Canopy', daysRange: '26-55 days', description: 'Leaves broaden to form curd shield.', moistureTarget: 55, waterNeed: 'High', nutrientPriority: 'Nitrogen & Molybdenum', managementTips: 'Whiptail occurs if molybdenum is deficient in acidic soils.' },
      { stageId: 'curd-init', name: 'Curd Initiation & Blanching', daysRange: '56-80 days', description: 'White curd forms in leaf center.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Boron', managementTips: 'Tie wrapper leaves over curd (blanching) to keep it snowy white.' },
      { stageId: 'harvest', name: 'Curd Harvest', daysRange: '81-95 days', description: 'Curd is compact and pure white.', moistureTarget: 35, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest before curd becomes loose or ricey.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Brown Rot & Hollow Stem', type: 'Nutritional / Fungal', favorableConditions: 'Boron deficiency coupled with rapid nitrogen growth', symptoms: 'Water-soaked curd patches turning brown; hollow stem cavity', prevention: 'Soil application of Borax @ 4 kg/acre', organicRemedy: 'Foliar Boron 20% spray', chemicalControl: 'Foliar Boron @ 1.5 g/liter at button stage' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 30 kg SSP + 5 kg Borax + 500 g Ammonium Molybdate per acre',
      topDressing1: '35 kg Urea at 30 DAT',
      topDressing2: '25 kg Urea at buttoning stage (50 DAT)',
      foliarSprays: '0:52:34 @ 1% + Boron @ 1 g/liter at curd emergence'
    },
    irrigationSchedule: 'Uniform moisture needed; irrigate every 5-7 days depending on temperature.'
  },
  {
    id: 'crop-green-chilli',
    name: 'Green Chilli',
    scientificName: 'Capsicum annuum',
    localName: 'हिरवी मिरची (Mirchi)',
    category: 'Vegetables',
    emoji: '🌶️',
    durationDays: 150,
    season: 'Multi-season',
    soilTypes: ['Well-drained light black soil', 'Red loam', 'Sandy loam'],
    waterRequirementMm: 600,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 65,
      moistureOptimal: 48,
      tempMin: 18,
      tempMax: 32,
      tempOptimal: 25,
      humidityMin: 50,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 7.2,
      ecMax: 1600,
      nitrogenKgHa: { min: 100, max: 140, target: 120 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 60, max: 90, target: 75 }
    },
    growthStages: [
      { stageId: 'nursery', name: 'Establishment', daysRange: '0-25 days', description: 'Transplanting 35-day seedlings at 60x45 cm.', moistureTarget: 48, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Drench with bio-fungicide to prevent collar rot.' },
      { stageId: 'vegetative', name: 'Branching', daysRange: '26-55 days', description: 'Bushy upright branching.', moistureTarget: 50, waterNeed: 'High', nutrientPriority: 'Nitrogen & Zinc', managementTips: 'First weeding and earthing up.' },
      { stageId: 'flowering', name: 'Flowering & Setting', daysRange: '56-80 days', description: 'White nodding flowers setting dark green pods.', moistureTarget: 52, waterNeed: 'Critical', nutrientPriority: 'Boron & Potassium', managementTips: 'Avoid moisture stress which triggers flower shedding.' },
      { stageId: 'harvest', name: 'Continuous Picking', daysRange: '81-150 days', description: 'Pick pungent green pods every 7-10 days.', moistureTarget: 45, waterNeed: 'High', nutrientPriority: '13:0:45', managementTips: 'Top dress soluble nutrients after every two pickings.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Chilli Murda / Leaf Curl (Thrips & Mites)', type: 'Insect / Pest', favorableConditions: 'Dry warm weather favoring thrips; humid warm for mites', symptoms: 'Upward cup curling (thrips) or downward inverted boat curling (mites)', prevention: 'Blue and yellow sticky traps; silver mulch', organicRemedy: 'Neem oil + Dashaparni ark', chemicalControl: 'Diafenthiuron 50 WP @ 1.2 g/liter or Spiromesifen 22.9 SC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 30 kg SSP + 10 kg Zinc Sulfate per acre',
      topDressing1: '30 kg Urea at 30 DAT',
      topDressing2: '25 kg Urea + 15 kg MOP at first picking (70 DAT)',
      foliarSprays: '19:19:19 @ 1% + Micronutrients every 15 days'
    },
    irrigationSchedule: 'Irrigate every 5-7 days; drip irrigation with fertigation gives 40% higher yield.'
  },
  {
    id: 'crop-capsicum',
    name: 'Capsicum / Bell Pepper',
    scientificName: 'Capsicum annuum var. grossum',
    localName: 'ढोबळी मिरची (Dhobli Mirchi)',
    category: 'Vegetables',
    emoji: '🫑',
    durationDays: 140,
    season: 'Multi-season',
    soilTypes: ['Sandy loam high in humus', 'Silt loam', 'Greenhouse cocopeat/soil'],
    waterRequirementMm: 550,
    optimalRanges: {
      moistureMin: 40,
      moistureMax: 65,
      moistureOptimal: 52,
      tempMin: 18,
      tempMax: 28,
      tempOptimal: 22,
      humidityMin: 60,
      humidityMax: 75,
      phMin: 6.0,
      phMax: 6.8,
      ecMax: 1500,
      nitrogenKgHa: { min: 120, max: 160, target: 140 },
      phosphorusKgHa: { min: 60, max: 90, target: 75 },
      potassiumKgHa: { min: 100, max: 150, target: 125 }
    },
    growthStages: [
      { stageId: 'establishment', name: 'Establishment & Trellising', daysRange: '0-25 days', description: 'Seedling planting; four-leader training.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Tie to support twines; remove crown flower for better bush growth.' },
      { stageId: 'vegetative', name: 'Branching & Flower Flush', daysRange: '26-55 days', description: 'Canopy fills shade net.', moistureTarget: 52, waterNeed: 'High', nutrientPriority: 'Nitrogen & Calcium', managementTips: 'Maintain 22-26°C inside shade net.' },
      { stageId: 'fruiting', name: 'Blocky Fruit Development', daysRange: '56-95 days', description: 'Thick walled 3-4 lobed fruits expand.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Calcium', managementTips: 'Calcium nitrate spray prevents blossom end rot.' },
      { stageId: 'harvest', name: 'Harvesting', daysRange: '96-140 days', description: 'Pick blocky green or colored (yellow/red) fruit.', moistureTarget: 48, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Cut with clean pruner leaving a short stem.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Anthracnose & Fruit Rot', type: 'Fungal', favorableConditions: 'Warm humid conditions (> 80% RH), temp 25-28°C', symptoms: 'Circular sunken lesions with black concentric rings on fruits', prevention: 'Seed treatment; ensure good air circulation', organicRemedy: 'Pseudomonas fluorescens spray @ 5 g/liter', chemicalControl: 'Azoxystrobin 23 SC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 15 kg Magnesium Sulfate + 10 kg Micronutrients per acre',
      topDressing1: 'Drip fertigation: Calcium Nitrate (3 kg) + Potassium Nitrate 13:0:45 (3 kg) per week',
      topDressing2: 'Fertigation: 0:52:34 during peak bloom',
      foliarSprays: 'Chelated Calcium + Boron foliar spray at fruit set'
    },
    irrigationSchedule: 'Drip irrigation: 2 to 3 liters/plant/day depending on temperature; maintain tensiometer reading around 20-25 kPa.'
  },

  // ==================== FRUITS ====================
  {
    id: 'crop-mango',
    name: 'Mango',
    scientificName: 'Mangifera indica',
    localName: 'आंबा (Amba / Alphonso / Kesar)',
    category: 'Fruits',
    emoji: '🥭',
    durationDays: 365,
    season: 'Perennial',
    soilTypes: ['Deep well-drained alluvial', 'Lateritic red loam', 'Black cotton with good drainage'],
    waterRequirementMm: 900,
    optimalRanges: {
      moistureMin: 30,
      moistureMax: 55,
      moistureOptimal: 40,
      tempMin: 22,
      tempMax: 36,
      tempOptimal: 28,
      humidityMin: 40,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 1500,
      nitrogenKgHa: { min: 80, max: 120, target: 100 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 100, max: 150, target: 120 }
    },
    growthStages: [
      { stageId: 'dormancy', name: 'Post-Monsoon Stress & Bud Break', daysRange: 'Oct - Nov', description: 'Withhold irrigation to induce terminal shoot dormancy and floral bud differentiation.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'Paclobutrazol / Potassium', managementTips: 'Soil drench Cultar (Paclobutrazol) in Sept-Oct for Alphonso flower induction.' },
      { stageId: 'flowering', name: 'Panicle Emergence & Bloom', daysRange: 'Dec - Jan', description: 'Fragrant panicles bloom; pollinated by honeybees and flies.', moistureTarget: 35, waterNeed: 'Low', nutrientPriority: 'Boron & Sulfur', managementTips: 'Never irrigate or spray insecticides at full bloom to preserve pollinators.' },
      { stageId: 'fruit-set', name: 'Fruit Set & Pea / Marble Size', daysRange: 'Feb - Mar', description: 'Pea-sized fruitlets grow to egg size; rapid cell division.', moistureTarget: 45, waterNeed: 'High', nutrientPriority: 'Potassium & Nitrogen', managementTips: 'Resume drip irrigation (80-100 L/tree/day) to prevent heavy fruit drop.' },
      { stageId: 'maturation', name: 'Fruit Development & Harvest', daysRange: 'Apr - May', description: 'Shoulders rise above stalk cavity; specific gravity reaches 1.01-1.02.', moistureTarget: 40, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Stop irrigation 15 days before harvest to enhance sugar content and shelf life.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Mango Hopper (Amritodus atkinsoni)', type: 'Insect / Pest', favorableConditions: 'Cloudy, damp weather during flowering (Dec-Feb)', symptoms: 'Hoppers suck sap from panicles causing honey-dew secretions and sooty mould', prevention: 'Prune overcrowded inner branches to allow sunlight', organicRemedy: 'Verticillium lecanii @ 3 g/liter + Neem oil', chemicalControl: 'Imidacloprid 17.8 SL @ 0.4 ml/liter before flower opening' },
      { name: 'Powdery Mildew', type: 'Fungal', favorableConditions: 'Cool nights and cloudy humid mornings in winter', symptoms: 'White powdery coating on panicles and young fruits resulting in fruit drop', prevention: 'Prophylactic sulfur dusting', organicRemedy: 'Wettable Sulfur 80 WP @ 2 g/liter', chemicalControl: 'Hexaconazole 5 SC @ 1 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg FYM + 1 kg Urea + 1.5 kg SSP + 1 kg MOP per mature tree in July (post harvest)',
      topDressing1: '500 g Urea + 500 g MOP per tree in Feb during marble stage',
      topDressing2: 'Not required',
      foliarSprays: '13:0:45 @ 1% + Boron @ 1 g/liter at pea-size fruitlet stage'
    },
    irrigationSchedule: 'Withhold water from October to flower opening; irrigate at 10-15 day intervals from fruit set till 2 weeks before harvest.'
  },
  {
    id: 'crop-pomegranate',
    name: 'Pomegranate',
    scientificName: 'Punica granatum',
    localName: 'डाळिंब (Dalimb / Bhagwa)',
    category: 'Fruits',
    emoji: '🍎',
    durationDays: 365,
    season: 'Perennial',
    soilTypes: ['Deep well-drained loamy soil', 'Light gravelly red soil', 'Alluvial soil with free drainage'],
    waterRequirementMm: 700,
    optimalRanges: {
      moistureMin: 30,
      moistureMax: 55,
      moistureOptimal: 42,
      tempMin: 18,
      tempMax: 38,
      tempOptimal: 28,
      humidityMin: 35,
      humidityMax: 65,
      phMin: 6.5,
      phMax: 8.2,
      ecMax: 2000,
      nitrogenKgHa: { min: 100, max: 150, target: 125 },
      phosphorusKgHa: { min: 50, max: 75, target: 60 },
      potassiumKgHa: { min: 100, max: 160, target: 130 }
    },
    growthStages: [
      { stageId: 'bahar-treat', name: 'Bahar Treatment (Stress & Defoliation)', daysRange: '45 days before bloom', description: 'Withhold irrigation to induce defoliation for selected Bahar (Ambe / Mrig / Hasta).', moistureTarget: 25, waterNeed: 'Low', nutrientPriority: 'Stress induction', managementTips: 'Prune dead wood and spray Ethrel for complete defoliation.' },
      { stageId: 'flowering', name: 'Flowering & Fruit Set', daysRange: 'Days 1-45 after stress', description: 'Vibrant red bisexual (hermaphrodite) flowers bloom and set fruits.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Boron & Zinc', managementTips: 'Provide uniform light irrigation; sudden flooding causes flower abortion.' },
      { stageId: 'fruit-dev', name: 'Fruit Development & Sizing', daysRange: 'Days 46-120', description: 'Fruits expand from lemon size to 250-400g Bhagwa fruit.', moistureTarget: 50, waterNeed: 'Critical', nutrientPriority: 'Calcium & Potassium', managementTips: 'Bag fruits with paper bags to protect from sun scald and borer.' },
      { stageId: 'ripening', name: 'Aril Coloration & Harvest', daysRange: 'Days 121-160', description: 'Skin turns saffron-red; arils turn deep ruby red.', moistureTarget: 40, waterNeed: 'Moderate', nutrientPriority: 'Potassium (0:0:50)', managementTips: 'Ensure consistent moisture; dry spell followed by irrigation cracks fruit skin.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Bacterial Blight / Telya (Xanthomonas axonopodis)', type: 'Bacterial', favorableConditions: 'Warm cloudy weather with intermittent rain, 25-35°C, RH > 70%', symptoms: 'Oily water-soaked spots on leaves and fruit turning into L-shaped or star-shaped cracks', prevention: 'Use tissue-cultured clean plants; strict orchard sanitation', organicRemedy: 'Bacteriophage + 2-Bromo-2-Nitropropane-1,3-Diol (Bronopol)', chemicalControl: 'Streptocycline @ 0.5 g + Copper Oxychloride @ 2.5 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '30 kg FYM + 2 kg Neem cake + 500 g 10:26:26 per plant at Bahar initiation',
      topDressing1: 'Drip fertigation: 12:61:00 (20 g/plant) weekly during flowering',
      topDressing2: 'Fertigation: 0:52:34 + 0:0:50 (30 g/plant) weekly during fruit development',
      foliarSprays: 'Calcium Nitrate (2 g/liter) + Boron (1 g/liter) to prevent fruit cracking'
    },
    irrigationSchedule: 'Drip irrigation mandatory: 20-30 liters/plant/day during fruit development; regulate precisely to eliminate fruit cracking.'
  },
  {
    id: 'crop-banana',
    name: 'Banana',
    scientificName: 'Musa acuminata (Grand Naine)',
    localName: 'केळी (Keli / G-9)',
    category: 'Fruits',
    emoji: '🍌',
    durationDays: 330,
    season: 'Perennial',
    soilTypes: ['Deep rich clay loam', 'Alluvial soil with high organic matter', 'Well-drained black soil'],
    waterRequirementMm: 1500,
    optimalRanges: {
      moistureMin: 50,
      moistureMax: 80,
      moistureOptimal: 65,
      tempMin: 20,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 60,
      humidityMax: 85,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 1200,
      nitrogenKgHa: { min: 200, max: 280, target: 240 },
      phosphorusKgHa: { min: 60, max: 90, target: 75 },
      potassiumKgHa: { min: 250, max: 350, target: 300 }
    },
    growthStages: [
      { stageId: 'establishment', name: 'Planting & Vegetative (0-4 months)', daysRange: '0-120 days', description: 'Rapid leaf emergence; 1 new leaf every 7-10 days.', moistureTarget: 65, waterNeed: 'High', nutrientPriority: 'Nitrogen & Phosphorus', managementTips: 'Drip fertigate with Urea and DAP; weed control.' },
      { stageId: 'shooting', name: 'Shooting & Inflorescence (5-8 months)', daysRange: '121-240 days', description: 'Flower bud emerges from pseudostem center; bracts roll back.', moistureTarget: 70, waterNeed: 'Critical', nutrientPriority: 'High Potassium', managementTips: 'Remove male bud (denavelling); spray fruit care mixture.' },
      { stageId: 'bunch-dev', name: 'Bunch Development (9-11 months)', daysRange: '241-330 days', description: 'Banana hands fill out and fingers plump up.', moistureTarget: 65, waterNeed: 'Critical', nutrientPriority: 'Potassium & Micronutrients', managementTips: 'Provide bamboo or rope propping against heavy wind; bunch sleeving.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Sigatoka Leaf Spot', type: 'Fungal', favorableConditions: 'High humidity (> 80%), temp 24-28°C, heavy rains', symptoms: 'Spindle-shaped pale spots turning black with yellow halo, premature leaf drying', prevention: 'Deleafing of affected leaves; maintain good drainage', organicRemedy: 'Mineral oil spray (1%)', chemicalControl: 'Propiconazole 25 EC @ 1 ml/liter or Propineb @ 2 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '20 kg FYM + 250 g SSP per plant at planting',
      topDressing1: 'Drip fertigation: 200 g Urea + 300 g MOP per plant split into 25 weekly doses',
      topDressing2: 'Potassium Nitrate (13:0:45) during finger development',
      foliarSprays: 'SOP (0:0:50) @ 1% bunch spray after denavelling'
    },
    irrigationSchedule: 'High water requirement: 15-20 liters/plant/day in winter, 25-30 liters/plant/day in summer through drip.'
  },
  {
    id: 'crop-grapes',
    name: 'Grapes',
    scientificName: 'Vitis vinifera (Thompson Seedless)',
    localName: 'द्राक्षे (Draksha)',
    category: 'Fruits',
    emoji: '🍇',
    durationDays: 365,
    season: 'Perennial',
    soilTypes: ['Well-drained sandy loam', 'Medium black soil', 'Red loamy soil with gravel'],
    waterRequirementMm: 700,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 60,
      moistureOptimal: 48,
      tempMin: 18,
      tempMax: 32,
      tempOptimal: 25,
      humidityMin: 40,
      humidityMax: 65,
      phMin: 6.5,
      phMax: 8.0,
      ecMax: 1500,
      nitrogenKgHa: { min: 100, max: 150, target: 120 },
      phosphorusKgHa: { min: 50, max: 80, target: 60 },
      potassiumKgHa: { min: 120, max: 180, target: 150 }
    },
    growthStages: [
      { stageId: 'foundation', name: 'April Pruning (Foundation Pruning)', daysRange: 'Apr - May', description: 'Back pruning to 1-2 buds for cane development.', moistureTarget: 50, waterNeed: 'High', nutrientPriority: 'Nitrogen & Phosphorus', managementTips: 'Train vigorous canes on Y-trellis or Bower system.' },
      { stageId: 'fruit-prune', name: 'October Pruning (Forward Pruning)', daysRange: 'Oct - Nov', description: 'Pruning to 4-6 buds for grape bunch emergence.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Hydrogen Cyanamide (Dormex)', managementTips: 'Apply Dormex paste to terminal buds for uniform bud break.' },
      { stageId: 'berry-dev', name: 'Berry Sizing & GA3 Dipping', daysRange: 'Dec - Jan', description: 'Berries elongate and expand from 4mm to 18mm.', moistureTarget: 52, waterNeed: 'Critical', nutrientPriority: 'Potassium & Gibberellic Acid', managementTips: 'Bunch dipping in GA3 (Gibberellic Acid) + CPPU for berry elongation.' },
      { stageId: 'veraison', name: 'Veraison & Harvest', daysRange: 'Feb - Mar', description: 'Berries soften; TSS rises to 18-20° Brix.', moistureTarget: 40, waterNeed: 'Moderate', nutrientPriority: 'Potassium (0:0:50)', managementTips: 'Reduce watering 10 days before harvest to build sugars.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Downy Mildew (Plasmopara viticola)', type: 'Fungal', favorableConditions: 'Rains/dew, temp 20-25°C, leaf wetness > 2 hours', symptoms: 'Oil spots on leaf surface; white downy growth on underside; berry drop', prevention: 'Canopy management for aeration; copper spray', organicRemedy: 'Bordeaux mixture 0.8%', chemicalControl: 'Dimethomorph 50 WP @ 1 g/liter or Mandipropamid 23.4 SC @ 0.8 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg FYM + 200 g 10:26:26 per vine after October pruning',
      topDressing1: 'Drip fertigation: 12:61:00 (15 g/vine) during shoot growth',
      topDressing2: 'Fertigation: 0:0:50 + 13:0:45 (25 g/vine) during berry sizing',
      foliarSprays: 'Chelated Calcium + Boron at 6 mm berry size'
    },
    irrigationSchedule: 'Strict drip irrigation scheduling based on pan evaporation; heavy water reduction during veraison.'
  },
  {
    id: 'crop-papaya',
    name: 'Papaya',
    scientificName: 'Carica papaya (Red Lady 786)',
    localName: 'पपई (Papai)',
    category: 'Fruits',
    emoji: '🍈',
    durationDays: 300,
    season: 'Perennial',
    soilTypes: ['Rich sandy loam', 'Alluvial soil with exceptional drainage'],
    waterRequirementMm: 800,
    optimalRanges: {
      moistureMin: 40,
      moistureMax: 65,
      moistureOptimal: 50,
      tempMin: 22,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 55,
      humidityMax: 75,
      phMin: 6.0,
      phMax: 7.0,
      ecMax: 1200,
      nitrogenKgHa: { min: 120, max: 180, target: 150 },
      phosphorusKgHa: { min: 60, max: 100, target: 80 },
      potassiumKgHa: { min: 150, max: 220, target: 180 }
    },
    growthStages: [
      { stageId: 'establishment', name: 'Transplanting & Vegetative', daysRange: '0-90 days', description: 'Transplanting 45-day seedlings; stem thickens rapidly.', moistureTarget: 50, waterNeed: 'Moderate', nutrientPriority: 'Nitrogen & Phosphorus', managementTips: 'Mound soil around collar to prevent collar rot; zero water stagnation.' },
      { stageId: 'flowering', name: 'Flower Emergence & Sex Determination', daysRange: '91-150 days', description: 'Bisexual / female flowers emerge at leaf axils.', moistureTarget: 52, waterNeed: 'High', nutrientPriority: 'Boron & Potassium', managementTips: 'Identify and remove excess male plants in dioecious types.' },
      { stageId: 'fruit-fill', name: 'Fruit Set & Continuous Sizing', daysRange: '151-240 days', description: 'Dense cluster of 1.5-2.5 kg fruits along main stem.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Calcium', managementTips: 'Thin congested fruits to avoid misshapen specimens.' },
      { stageId: 'harvest', name: 'Harvesting', daysRange: '241-330 days', description: 'Yellow streaks appear at apex (color break).', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Harvest when latex turns watery and yellow color streaks appear.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Papaya Ringspot Virus (PRSV)', type: 'Viral', favorableConditions: 'Aphid vectors active in warm dry spells', symptoms: 'Shoestring leaves, yellow mosaic, oily rings on stems and fruits', prevention: 'Barrier crops (2 rows of maize around papaya field); silver mulch', organicRemedy: 'Neem oil spray + yellow sticky traps', chemicalControl: 'Dimethoate 30 EC @ 1.5 ml/liter to suppress aphids' }
    ],
    fertilizerSchedule: {
      basalDose: '15 kg FYM + 250 g SSP per pit',
      topDressing1: 'Drip fertigation: 50 g Urea + 50 g MOP per plant every month',
      topDressing2: '0:52:34 @ 1% foliar spray during flowering',
      foliarSprays: 'Borax @ 1 g/liter spray to prevent bumpy fruits'
    },
    irrigationSchedule: 'Irrigate every 5-6 days in winter, 3-4 days in summer; never allow water to touch tree trunk directly (ring basin or drip).'
  },

  // ==================== CASH CROPS, SPICES & OTHERS ====================
  {
    id: 'crop-cotton',
    name: 'Cotton',
    scientificName: 'Gossypium hirsutum',
    localName: 'कापूस (Kapoos / Bt Cotton)',
    category: 'Cash Crops & Spices',
    emoji: '☁️',
    durationDays: 165,
    season: 'Kharif',
    soilTypes: ['Deep black cotton soil (Regur)', 'Clay loam', 'Well-drained alluvial'],
    waterRequirementMm: 650,
    optimalRanges: {
      moistureMin: 35,
      moistureMax: 65,
      moistureOptimal: 48,
      tempMin: 21,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 50,
      humidityMax: 70,
      phMin: 6.0,
      phMax: 8.0,
      ecMax: 2000,
      nitrogenKgHa: { min: 100, max: 150, target: 120 },
      phosphorusKgHa: { min: 40, max: 60, target: 50 },
      potassiumKgHa: { min: 40, max: 60, target: 50 }
    },
    growthStages: [
      { stageId: 'seedling', name: 'Germination & Monopodial Growth', daysRange: '0-35 days', description: 'Early vegetative growth; taproot reaches 1 meter.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'First weeding at 20 DAS; ensure optimum plant population (7,000 plants/acre).' },
      { stageId: 'squaring', name: 'Square (Bud) Formation', daysRange: '36-65 days', description: 'Sympodial fruiting branches produce green pyramidal flower buds (squares).', moistureTarget: 48, waterNeed: 'High', nutrientPriority: 'Nitrogen & Magnesium', managementTips: 'Spray Magnesium Sulfate (1%) to prevent leaf reddening (Lalya).' },
      { stageId: 'flowering', name: 'Flowering & Boll Development', daysRange: '66-110 days', description: 'Cream flowers turn pink/purple; spherical bolls expand.', moistureTarget: 55, waterNeed: 'Critical', nutrientPriority: 'Potassium & Boron', managementTips: 'Peak water requirement stage; water stress causes square and boll shedding.' },
      { stageId: 'boll-burst', name: 'Boll Bursting & Picking', daysRange: '111-165 days', description: 'Bolls burst open revealing fluffy white lint.', moistureTarget: 30, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest clean, dry cotton in 3-4 pickings; avoid leaf trash.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Pink Bollworm (Pectinophora gossypiella)', type: 'Insect / Pest', favorableConditions: 'Humid warm weather from 60-120 DAS', symptoms: 'Rosetted flowers; bored bolls with stained discolored lint inside', prevention: 'Install PBW pheromone traps (Pectino-lure @ 5/acre); destroy crop residues', organicRemedy: 'Trichogramma bactrae egg parasitoid @ 60,000/acre', chemicalControl: 'Profenofos 50 EC @ 2 ml/liter or Spinetoram 11.7 SC @ 0.8 ml/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 10 kg Magnesium Sulfate + 10 kg Zinc Sulfate per acre',
      topDressing1: '35 kg Urea at 35 DAS (squaring)',
      topDressing2: '35 kg Urea at 60 DAS (flowering)',
      foliarSprays: '13:0:45 @ 1% + Boron @ 1 g/liter at boll development'
    },
    irrigationSchedule: 'Irrigate at Square initiation (45 DAS), Peak flowering (70 DAS), and Boll development (95 DAS); avoid waterlogging.'
  },
  {
    id: 'crop-sugarcane',
    name: 'Sugarcane',
    scientificName: 'Saccharum officinarum (Co-86032)',
    localName: 'ऊस (Oos)',
    category: 'Cash Crops & Spices',
    emoji: '🎋',
    durationDays: 360,
    season: 'Perennial',
    soilTypes: ['Deep rich black cotton soil', 'Alluvial loam', 'Heavy clay loam with good drainage'],
    waterRequirementMm: 1800,
    optimalRanges: {
      moistureMin: 45,
      moistureMax: 75,
      moistureOptimal: 60,
      tempMin: 22,
      tempMax: 38,
      tempOptimal: 30,
      humidityMin: 55,
      humidityMax: 85,
      phMin: 6.5,
      phMax: 8.0,
      ecMax: 1800,
      nitrogenKgHa: { min: 200, max: 300, target: 250 },
      phosphorusKgHa: { min: 80, max: 120, target: 100 },
      potassiumKgHa: { min: 120, max: 180, target: 150 }
    },
    growthStages: [
      { stageId: 'germination', name: 'Germination & Sprouting', daysRange: '0-35 days', description: 'Two-eye bud setts sprout under moist ridges.', moistureTarget: 60, waterNeed: 'High', nutrientPriority: 'Phosphorus', managementTips: 'Sett treatment with Carbendazim + Chlorpyrifos before planting.' },
      { stageId: 'tillering', name: 'Tillering Phase', daysRange: '36-120 days', description: 'Tillers multiply from mother shoot (4-6 tillers/clump).', moistureTarget: 62, waterNeed: 'High', nutrientPriority: 'Nitrogen & Zinc', managementTips: 'Apply partial earthing-up and top dress with Urea.' },
      { stageId: 'grand-growth', name: 'Grand Growth (Cane Elongation)', daysRange: '121-270 days', description: 'Rapid stalk elongation and internode production; high biomass.', moistureTarget: 65, waterNeed: 'Critical', nutrientPriority: 'Potassium & Nitrogen', managementTips: 'Full earthing up at 120 days; detrashing dry lower leaves.' },
      { stageId: 'ripening', name: 'Ripening & Sucrose Accumulation', daysRange: '271-360 days', description: 'Invert sugars convert to sucrose inside stalk.', moistureTarget: 45, waterNeed: 'Moderate', nutrientPriority: 'Potassium', managementTips: 'Withhold irrigation 20 days prior to harvest to maximize sugar recovery.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Early Shoot Borer & Pyrilla', type: 'Insect / Pest', favorableConditions: 'Hot dry weather (35-40°C) with low humidity during early stage', symptoms: 'Dead hearts in shoots; sap sucking causing sooty leaves', prevention: 'Trash mulching (3 tonnes/acre); light earthing up', organicRemedy: 'Beauveria bassiana @ 2 kg/acre', chemicalControl: 'Chlorantraniliprole 18.5 SC @ 0.4 ml/liter or Fipronil 0.3% GR @ 10 kg/acre' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg DAP + 30 kg MOP + 15 kg Zinc Sulfate + 10 kg Sulfur per acre',
      topDressing1: '50 kg Urea at 45 days (tillering)',
      topDressing2: '75 kg Urea + 50 kg 10:26:26 + 30 kg MOP at final earthing-up (120 days)',
      foliarSprays: '19:19:19 @ 1% + Ferrous sulfate 0.5% during tillering'
    },
    irrigationSchedule: 'Irrigate every 7-10 days in summer and 12-15 days in winter; drip fertigation saves 45% water and increases cane tonnage.'
  },
  {
    id: 'crop-turmeric',
    name: 'Turmeric',
    scientificName: 'Curcuma longa (Salem / Waigaon)',
    localName: 'हळद (Halad)',
    category: 'Cash Crops & Spices',
    emoji: '🌿',
    durationDays: 240,
    season: 'Kharif',
    soilTypes: ['Well-drained rich friable loam', 'Sandy loam high in humus', 'Red loamy soil'],
    waterRequirementMm: 1200,
    optimalRanges: {
      moistureMin: 45,
      moistureMax: 70,
      moistureOptimal: 55,
      tempMin: 20,
      tempMax: 35,
      tempOptimal: 28,
      humidityMin: 60,
      humidityMax: 85,
      phMin: 6.0,
      phMax: 7.5,
      ecMax: 1500,
      nitrogenKgHa: { min: 120, max: 160, target: 140 },
      phosphorusKgHa: { min: 60, max: 80, target: 70 },
      potassiumKgHa: { min: 100, max: 150, target: 125 }
    },
    growthStages: [
      { stageId: 'sprouting', name: 'Rhizome Sprouting', daysRange: '0-30 days', description: 'Mother rhizomes sprout under straw mulch.', moistureTarget: 55, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Cover raised beds with sugarcane trash or green leaf mulch.' },
      { stageId: 'vegetative', name: 'Vegetative & Tillering', daysRange: '31-90 days', description: 'Broad glossy green leaves unfurl; secondary shoots form.', moistureTarget: 58, waterNeed: 'High', nutrientPriority: 'Nitrogen & Micronutrients', managementTips: 'Earthing up at 60 and 90 DAS; top dress with organic manure.' },
      { stageId: 'rhizome-dev', name: 'Rhizome Development & Bulking', daysRange: '91-180 days', description: 'Primary and secondary finger rhizomes expand and accumulate curcumin.', moistureTarget: 60, waterNeed: 'Critical', nutrientPriority: 'Potassium & Sulfur', managementTips: 'Keep soil loose and weed free; prevent rhizome rot.' },
      { stageId: 'maturity', name: 'Maturity & Harvest', daysRange: '181-240 days', description: 'Foliage turns completely yellow and withers.', moistureTarget: 35, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Withhold irrigation 15 days before harvest; dig rhizomes carefully.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Rhizome Rot (Pythium aphanidermatum)', type: 'Fungal', favorableConditions: 'Waterlogging, heavy black soil, high soil temperature', symptoms: 'Collar region rots with foul odor; leaves turn yellow and collapse', prevention: 'Plant on broad raised beds (BBF); ensure zero water stagnation', organicRemedy: 'Trichoderma harzianum drenching @ 5 g/liter', chemicalControl: 'Metalaxyl-M + Mancozeb (Ridomil MZ) @ 2.5 g/liter' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 25 kg SSP + 15 kg Magnesium Sulfate + 10 kg Micronutrients per acre',
      topDressing1: '35 kg Urea at 45 DAS (first earthing-up)',
      topDressing2: '35 kg Urea + 30 kg MOP at 90 DAS (second earthing-up)',
      foliarSprays: '19:19:19 @ 1% + Ferrous sulfate 0.5% at 60 and 90 DAS'
    },
    irrigationSchedule: 'Irrigate every 5-7 days; drip irrigation on raised beds is optimal to prevent rhizome rot.'
  },
  {
    id: 'crop-ginger',
    name: 'Ginger',
    scientificName: 'Zingiber officinale (Mahim / Rio de Janeiro)',
    localName: 'आले (Aale)',
    category: 'Cash Crops & Spices',
    emoji: '🫚',
    durationDays: 240,
    season: 'Kharif',
    soilTypes: ['Sandy loam', 'Rich silt loam high in organic carbon', 'Well-drained red loam'],
    waterRequirementMm: 1300,
    optimalRanges: {
      moistureMin: 45,
      moistureMax: 70,
      moistureOptimal: 58,
      tempMin: 20,
      tempMax: 32,
      tempOptimal: 26,
      humidityMin: 65,
      humidityMax: 85,
      phMin: 6.0,
      phMax: 6.8,
      ecMax: 1200,
      nitrogenKgHa: { min: 100, max: 140, target: 120 },
      phosphorusKgHa: { min: 50, max: 70, target: 60 },
      potassiumKgHa: { min: 100, max: 140, target: 120 }
    },
    growthStages: [
      { stageId: 'sprouting', name: 'Sprouting & Emergence', daysRange: '0-40 days', description: 'Seed rhizome eyes sprout under thick mulch.', moistureTarget: 55, waterNeed: 'Moderate', nutrientPriority: 'Phosphorus', managementTips: 'Apply heavy mulch of green leaves (5 tonnes/acre) at planting.' },
      { stageId: 'tillering', name: 'Tillering & Canopy Spread', daysRange: '41-100 days', description: 'Multiple pseudo-stems emerge from rhizome clump.', moistureTarget: 60, waterNeed: 'High', nutrientPriority: 'Nitrogen & Micronutrients', managementTips: 'Re-mulching and earthing up.' },
      { stageId: 'rhizome-fill', name: 'Rhizome Bulking & Oleoresin Build', daysRange: '101-190 days', description: 'Underground rhizome hands thicken and gain pungency.', moistureTarget: 62, waterNeed: 'Critical', nutrientPriority: 'High Potassium (0:0:50)', managementTips: 'Drench with bio-fungicide to prevent bacterial wilt.' },
      { stageId: 'maturity', name: 'Maturity', daysRange: '191-240 days', description: 'Leaves dry up and pseudostems lodge.', moistureTarget: 35, waterNeed: 'Low', nutrientPriority: 'None', managementTips: 'Harvest with fork when pseudostems turn yellow and dry.' }
    ],
    commonPestsAndDiseases: [
      { name: 'Soft Rot / Rhizome Rot (Pythium spp.)', type: 'Fungal', favorableConditions: 'Waterlogging, heavy clay soil, monsoon rains', symptoms: 'Base of pseudostem rots; shoot easily pulls out with rotten smelly rhizome', prevention: 'Raised bed cultivation; seed rhizome solarization', organicRemedy: 'Pseudomonas fluorescens + Trichoderma soil drench', chemicalControl: 'Copper Oxychloride 50 WP @ 3 g/liter drench' }
    ],
    fertilizerSchedule: {
      basalDose: '50 kg 10:26:26 + 30 kg SSP + 10 kg Zinc Sulfate per acre',
      topDressing1: '30 kg Urea at 60 DAS after weeding',
      topDressing2: '30 kg Urea + 30 kg MOP at 100 DAS along with earthing up',
      foliarSprays: '0:52:34 @ 1% + Micronutrient spray at 120 DAS'
    },
    irrigationSchedule: 'Irrigate every 4-6 days; maintain continuous moist soil without ever allowing stagnant water.'
  }
];

export const CROP_CATEGORIES: CropCategory[] = [
  'Cereals & Millets',
  'Pulses & Legumes',
  'Vegetables',
  'Fruits',
  'Cash Crops & Spices'
];

export function getCropById(cropId: string): CropProfile | undefined {
  return CROPS_CATALOG.find(c => c.id === cropId);
}
