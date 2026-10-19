import { useState } from 'react';
import { Calendar, Sun, CloudRain, Snowflake, Sprout, Droplets, Leaf, ShieldAlert } from 'lucide-react';

interface CalendarSeason {
  season: 'Kharif' | 'Rabi' | 'Summer / Zaid' | 'Perennial';
  months: string;
  marathiName: string;
  climateContext: string;
  crops: {
    name: string;
    localName: string;
    emoji: string;
    sowingWindow: string;
    criticalIntervention: string;
    irrigationStrategy: string;
    harvestWindow: string;
  }[];
}

const SEASONS_DATA: CalendarSeason[] = [
  {
    season: 'Kharif',
    months: 'June to October (Monsoon Season)',
    marathiName: 'खरीप हंगाम',
    climateContext: 'Southwest monsoon rains, high humidity, warm temperatures. Critical risk: Waterlogging and fungal blights after continuous downpours.',
    crops: [
      {
        name: 'Soybean',
        localName: 'सोयाबीन',
        emoji: '🌱',
        sowingWindow: '15 June - 5 July (After 75mm monsoon rain)',
        criticalIntervention: 'Weed control at 20-25 DAS; watch for stem fly and girdle beetle.',
        irrigationStrategy: 'Rainfed; provide protective irrigation during pod filling if monsoon dry spell exceeds 15 days.',
        harvestWindow: 'October (when 90% leaves turn yellow and drop)'
      },
      {
        name: 'Cotton',
        localName: 'कापूस',
        emoji: '☁️',
        sowingWindow: 'Late May (irrigated) to 25 June (rainfed)',
        criticalIntervention: 'Square and boll formation monitoring; install pink bollworm pheromone traps (5 traps/acre).',
        irrigationStrategy: 'Avoid standing water in black soils; alternate furrow irrigation at boll development.',
        harvestWindow: 'November to January (multi-picking)'
      },
      {
        name: 'Tomato (Kharif)',
        localName: 'टोमॅटो',
        emoji: '🍅',
        sowingWindow: 'Nursery in May, transplant June-July',
        criticalIntervention: 'Staking on trellis wires; copper spray for early blight prevention during drizzling days.',
        irrigationStrategy: 'Drip irrigation 2-3 hours alternate days; never use overhead sprinkler.',
        harvestWindow: 'August to October'
      },
      {
        name: 'Paddy / Rice',
        localName: 'भात (तांदूळ)',
        emoji: '🌾',
        sowingWindow: 'Nursery in June, transplanting July (Konkan & Vidarbha)',
        criticalIntervention: 'Maintain 2-5 cm standing water during tillering and panicle initiation.',
        irrigationStrategy: 'Keep field submerged during vegetative stage; drain 10 days before harvest.',
        harvestWindow: 'October to November'
      },
      {
        name: 'Red Gram / Tur',
        localName: 'तूर (अरहर)',
        emoji: '🌿',
        sowingWindow: 'June-July (Intercrop with Soybean / Cotton)',
        criticalIntervention: 'Foliar spray of NPV / bio-pesticide for Helicoverpa pod borer at flowering.',
        irrigationStrategy: 'Deep rooted; requires 1 protective irrigation at pod development stage.',
        harvestWindow: 'December to January'
      }
    ]
  },
  {
    season: 'Rabi',
    months: 'October to March (Winter Season)',
    marathiName: 'रब्बी हंगाम',
    climateContext: 'Cool dry weather, declining day length, dew condensation. Critical focus: Timely crown root and tillering irrigation for winter cereals.',
    crops: [
      {
        name: 'Wheat',
        localName: 'गहू',
        emoji: '🌾',
        sowingWindow: '1 November - 20 November (Timely sowing)',
        criticalIntervention: 'First irrigation strictly at Crown Root Initiation (CRI) stage (21 DAS).',
        irrigationStrategy: '5-6 critical irrigations: CRI (21d), Tillering (42d), Late jointing (65d), Flowering (85d), Milking (105d).',
        harvestWindow: 'March to April (golden grain maturity)'
      },
      {
        name: 'Onion (Rabi)',
        localName: 'कांदा (रब्बी)',
        emoji: '🧅',
        sowingWindow: 'Nursery Oct-Nov, transplant Dec-Jan',
        criticalIntervention: 'Sulphur application @ 15 kg/acre for pungency and storage shelf life.',
        irrigationStrategy: 'Irrigate every 7-10 days; stop watering 15 days before harvest to dry outer skins.',
        harvestWindow: 'April to May'
      },
      {
        name: 'Bengal Gram / Harbara',
        localName: 'हरभरा (चना)',
        emoji: '🌱',
        sowingWindow: 'October (Vijay / Digvijay varieties)',
        criticalIntervention: 'Nipping (terminal bud plucking) at 30-35 DAS to stimulate profuse branch tillering.',
        irrigationStrategy: 'Only 1-2 irrigations: Branching (35 DAS) and pod formation (60 DAS). Avoid watering at peak flowering.',
        harvestWindow: 'February to March'
      },
      {
        name: 'Potato (Rabi)',
        localName: 'बटाटा',
        emoji: '🥔',
        sowingWindow: '15 October - 10 November',
        criticalIntervention: 'Earthing-up at 30 DAS to prevent greening of developing tubers.',
        irrigationStrategy: 'Frequent light irrigations; avoid water stress during tuber initiation.',
        harvestWindow: 'January to February'
      }
    ]
  },
  {
    season: 'Summer / Zaid',
    months: 'March to June (Pre-Monsoon Season)',
    marathiName: 'उन्हाळी हंगाम',
    climateContext: 'High solar irradiance, low relative humidity, strong dry winds. High evapotranspiration requires drip fertigation and moisture mulching.',
    crops: [
      {
        name: 'Groundnut (Summer)',
        localName: 'उन्हाळी भुईमूग',
        emoji: '🥜',
        sowingWindow: '15 January - 15 February',
        criticalIntervention: 'Gypsum application @ 150 kg/acre at pegging stage (40-45 DAS) for pod filling.',
        irrigationStrategy: 'Irrigate every 5-7 days; critical periods: flowering, peg penetration, and pod development.',
        harvestWindow: 'May to June'
      },
      {
        name: 'Okra / Bhendi',
        localName: 'भेंडी',
        emoji: '🌱',
        sowingWindow: 'February - March',
        criticalIntervention: 'Yellow Vein Mosaic Virus resistant seeds; spray neem oil for whitefly control.',
        irrigationStrategy: 'Drip irrigation every 2 days; mulching prevents rapid moisture loss.',
        harvestWindow: 'April to June (continuous picking)'
      },
      {
        name: 'Green Gram (Moong)',
        localName: 'उन्हाळी मूग',
        emoji: '🌿',
        sowingWindow: 'Late February to March',
        criticalIntervention: 'Seed inoculation with Rhizobium and PSB cultures.',
        irrigationStrategy: '3-4 light irrigations; stop watering at pod ripening.',
        harvestWindow: 'May (65-70 days short duration)'
      }
    ]
  },
  {
    season: 'Perennial',
    months: 'Year-Round Cultivation',
    marathiName: 'बारमाही / बागायती पिके',
    climateContext: 'Perennial orchards and long-duration commercial cash crops in Western and Central Maharashtra.',
    crops: [
      {
        name: 'Sugarcane',
        localName: 'ऊस',
        emoji: '🎋',
        sowingWindow: 'Suru (Jan-Feb), Pre-seasonal (Oct), Adsali (July-Aug)',
        criticalIntervention: 'Trash mulching (5 tonnes/acre) to conserve moisture; earthing up at 120 days.',
        irrigationStrategy: 'High water requirement (1500-2000 mm); drip fertigation saves 45% water.',
        harvestWindow: '12 to 16 months depending on planting season'
      },
      {
        name: 'Pomegranate',
        localName: 'डाळिंब',
        emoji: '🍎',
        sowingWindow: 'Bahar regulation (Ambe, Mrig, or Hasta Bahar)',
        criticalIntervention: 'Strict orchard sanitation for Bacterial Blight (Telya) control; Bordeaux mixture spray.',
        irrigationStrategy: 'Water stress during defoliation followed by calculated gradual irrigation.',
        harvestWindow: '5-6 months after flowering'
      },
      {
        name: 'Grapes',
        localName: 'द्राक्षे',
        emoji: '🍇',
        sowingWindow: 'April foundation pruning & October fruit pruning',
        criticalIntervention: 'Canopy thinning for ventilation; gibberellic acid (GA3) berry elongation dip.',
        irrigationStrategy: 'Precision drip with tensiometers; regulated deficit irrigation (RDI) after veraison.',
        harvestWindow: 'January to April (Nashik / Sangli belt)'
      }
    ]
  }
];

export default function MaharashtraCropCalendar() {
  const [selectedSeason, setSelectedSeason] = useState<'Kharif' | 'Rabi' | 'Summer / Zaid' | 'Perennial'>('Kharif');
  const activeSeason = SEASONS_DATA.find(s => s.season === selectedSeason) || SEASONS_DATA[0];

  return (
    <div className="crop-calendar-container panel">
      <div className="panel-heading">
        <div>
          <h2>Maharashtra Agro-Climatic Seasonal Calendar</h2>
          <p>ICAR & MPKV Rahuri guidance for Kharif, Rabi, Summer, and Perennial cultivation cycles in Maharashtra</p>
        </div>
        <span className="source-pill demo">REGIONAL AGRO CALENDAR</span>
      </div>

      <div className="calendar-seasons-tabs">
        {SEASONS_DATA.map(s => {
          const isActive = s.season === selectedSeason;
          return (
            <button
              key={s.season}
              className={`calendar-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedSeason(s.season)}
            >
              <Calendar size={14}/>
              <span><strong>{s.season}</strong> ({s.marathiName})</span>
            </button>
          );
        })}
      </div>

      <div className="season-context-box">
        <div>
          <strong>{activeSeason.season} ({activeSeason.marathiName}) — {activeSeason.months}</strong>
          <p>{activeSeason.climateContext}</p>
        </div>
      </div>

      <div className="calendar-crops-table-wrap">
        <table className="calendar-crops-table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Sowing / Planting Window</th>
              <th>Critical Stage Intervention</th>
              <th>Irrigation & Moisture Strategy</th>
              <th>Harvest Window</th>
            </tr>
          </thead>
          <tbody>
            {activeSeason.crops.map((c, idx) => (
              <tr key={idx}>
                <td>
                  <div className="cal-crop-cell">
                    <span className="cal-crop-emoji">{c.emoji}</span>
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.localName}</small>
                    </div>
                  </div>
                </td>
                <td>{c.sowingWindow}</td>
                <td><span className="cal-intervention">{c.criticalIntervention}</span></td>
                <td>{c.irrigationStrategy}</td>
                <td><strong>{c.harvestWindow}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="calendar-footer-disclaimer">
        <span>* General agro-climatic calendar reference based on Maharashtra State Agriculture Department guidelines. Local sowing dates vary based on monsoon onset and soil moisture conditions.</span>
      </div>
    </div>
  );
}
