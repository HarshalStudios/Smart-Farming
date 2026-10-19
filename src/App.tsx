import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import {
  Activity, AlertTriangle, Bell, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleHelp, CloudSun, Cpu, Download, Droplets, Filter, LayoutDashboard, Leaf,
  LogOut, Menu, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sprout,
  Thermometer, Tractor, TrendingUp, Users, Waves, X, MapPin, Pencil, Trash2,
  RefreshCw, CalendarDays, CircleUserRound, SlidersHorizontal, Wrench, Radio,
  Database, Key, Copy, Table, Eye, ArrowUpDown, Server, GraduationCap, Sparkles
} from 'lucide-react'
import DatabaseExplorer from './components/DatabaseExplorer'
import CropAnalysisWorkflow from './components/CropAnalysisWorkflow'
import CropLibrary from './components/CropLibrary'
import CropDetailView from './components/CropDetailView'
import ManualModeControls from './components/ManualModeControls'
import ProfessorDemoGuideModal from './components/ProfessorDemoGuideModal'
import { CROPS_CATALOG } from './data/cropsData'
import type { SoilAndEnvReadings } from './services/cropAnalysisEngine'

type Role = 'Admin' | 'Farmer' | 'Partner' | 'Technician'
type User = { id: string; name: string; role: Role; description: string; farmIds: string[]; active: boolean; initials: string }
type Farm = { id: string; name: string; location: string; ownerId: string; area: number; soil: string; fields: number; crop: string; status: string }
type Crop = { id: string; name: string; emoji: string; stage: string; farmId: string; moistureMin: number; moistureMax: number; phMin: number; phMax: number; note: string }
type Device = { id: string; name: string; farmId: string; kind: string; status: 'Online' | 'Offline' | 'Needs attention' | 'Maintenance'; battery: number; lastSeen: string; notes: string }
type AlertItem = { id: string; title: string; message: string; severity: 'Critical' | 'Warning' | 'Info'; status: 'Active' | 'Acknowledged' | 'Resolved'; farmId: string; time: string; action: string }
type Reading = { time: string; moisture: number; temperature: number; humidity: number; ph: number }
type Page = 'Dashboard' | 'Crop analysis' | 'Crops' | 'Crop detail' | 'Sensor data' | 'Alerts' | 'Alert patterns' | 'Farms & lands' | 'Devices' | 'Users' | 'Profile' | 'Settings' | 'Help & support' | 'Database explorer'

export interface DbTelemetryReading {
  id: number;
  device_id: string;
  farm_id: string;
  recorded_at: string;
  ingested_at: string;
  air_temperature_c: number | null;
  relative_humidity_pct: number | null;
  soil_moisture_pct: number | null;
  soil_temperature_c: number | null;
  soil_ph: number | null;
  electrical_conductivity_ds_m: number | null;
  nitrogen_kg_ha: number | null;
  phosphorus_kg_ha: number | null;
  potassium_kg_ha: number | null;
  rain_pulses: number;
  rain_accumulation_mm: number;
  rain_duration_seconds: number;
  modbus_valid: number;
  sht40_valid: number;
  rain_valid: number;
  raw_payload: string | null;
}

export interface LiveDeviceRecord {
  id: string;
  name: string;
  farm_id: string;
  hardware_type: string;
  status: 'Online' | 'Offline' | 'Needs attention' | 'Maintenance';
  battery_pct: number;
  last_seen_at: string | null;
  created_at: string;
}

const KEY = 'greenfield-demo-v1'
const SESSION = 'greenfield-session-v1'
const MODE_KEY = 'greenfield-mode-v1'
const TOKEN_KEY = 'greenfield-token-v1'

const seedUsers: User[] = [
  { id: 'u-admin', name: 'Sumit Singh', role: 'Admin', description: 'Platform administrator', farmIds: ['f1','f2','f3'], active: true, initials: 'SS' },
  { id: 'u-pushkar', name: 'Pushkar Kandalgaonkar', role: 'Farmer', description: 'Manage assigned farms and crops', farmIds: ['f1'], active: true, initials: 'PK' },
  { id: 'u-ramesh', name: 'Ramesh Patil', role: 'Farmer', description: 'Farmer account · Satara', farmIds: ['f2'], active: true, initials: 'RP' },
  { id: 'u-priya', name: 'Priya Deshmukh', role: 'Partner', description: 'Agricultural advisor', farmIds: ['f1','f2'], active: true, initials: 'PD' },
  { id: 'u-amit', name: 'Amit Jadhav', role: 'Technician', description: 'IoT field technician', farmIds: ['f1','f2','f3'], active: true, initials: 'AJ' }
]
const seedFarms: Farm[] = [
  { id: 'f1', name: 'Shivneri Farm', location: 'Narhe, Pune, Maharashtra', ownerId: 'u-pushkar', area: 4.5, soil: 'Black cotton soil', fields: 3, crop: 'Tomato', status: 'Healthy' },
  { id: 'f2', name: 'Sahyadri Sheti', location: 'Karad, Satara, Maharashtra', ownerId: 'u-ramesh', area: 7.2, soil: 'Red loamy soil', fields: 4, crop: 'Sugarcane', status: 'Needs attention' },
  { id: 'f3', name: 'Green Valley Plot', location: 'Baramati, Pune, Maharashtra', ownerId: 'u-admin', area: 2.8, soil: 'Alluvial soil', fields: 2, crop: 'Onion', status: 'Healthy' }
]
const seedCrops: Crop[] = [
  { id: 'c1', name: 'Tomato', emoji: '🍅', stage: 'Flowering', farmId: 'f1', moistureMin: 35, moistureMax: 65, phMin: 5.5, phMax: 7, note: 'Keep soil evenly moist; avoid prolonged waterlogging.' },
  { id: 'c2', name: 'Sugarcane', emoji: '🎋', stage: 'Vegetative', farmId: 'f2', moistureMin: 40, moistureMax: 75, phMin: 6, phMax: 7.5, note: 'Monitor soil moisture and maintain consistent irrigation.' },
  { id: 'c3', name: 'Onion', emoji: '🧅', stage: 'Bulb development', farmId: 'f3', moistureMin: 30, moistureMax: 55, phMin: 6, phMax: 7, note: 'Avoid excessive irrigation during bulb development.' },
  { id: 'c4', name: 'Soybean', emoji: '🌱', stage: 'Vegetative', farmId: 'f1', moistureMin: 35, moistureMax: 60, phMin: 6, phMax: 7, note: 'Check drainage after heavy rainfall.' },
  { id: 'c5', name: 'Cotton', emoji: '☁️', stage: 'Boll formation', farmId: 'f2', moistureMin: 30, moistureMax: 60, phMin: 5.8, phMax: 8, note: 'Inspect plants regularly and avoid overwatering.' },
  { id: 'c6', name: 'Wheat', emoji: '🌾', stage: 'Tillering', farmId: 'f3', moistureMin: 30, moistureMax: 55, phMin: 6, phMax: 7.5, note: 'Irrigation timing should reflect crop stage and local conditions.' }
]
const seedDevices: Device[] = [
  { id: 'ESP32-PN-001', name: 'Soil Sensor Node 01', farmId: 'f1', kind: 'ESP32 + SHT40 + Modbus + Rain', status: 'Online', battery: 92, lastSeen: '2 min ago', notes: '' },
  { id: 'ESP32-PN-002', name: 'Weather Station 01', farmId: 'f1', kind: 'Temp / humidity', status: 'Online', battery: 78, lastSeen: '4 min ago', notes: '' },
  { id: 'ESP32-ST-003', name: 'Soil Sensor Node 03', farmId: 'f2', kind: 'ESP32 + soil probe', status: 'Offline', battery: 18, lastSeen: '3 hours ago', notes: 'Check power and Wi-Fi.' },
  { id: 'ESP32-BT-004', name: 'Field Sensor Node 04', farmId: 'f3', kind: 'Multi-sensor', status: 'Maintenance', battery: 44, lastSeen: 'Yesterday', notes: 'Scheduled probe inspection.' }
]
const seedAlerts: AlertItem[] = [
  { id: 'a1', title: 'Low soil moisture', message: 'Moisture is below the configured demo range for the Tomato plot.', severity: 'Critical', status: 'Active', farmId: 'f1', time: '10 min ago', action: 'Inspect irrigation and verify the sensor reading.' },
  { id: 'a2', title: 'Device offline', message: 'Soil Sensor Node 03 has not synchronized recently.', severity: 'Warning', status: 'Active', farmId: 'f2', time: '35 min ago', action: 'Check power, network coverage and device logs.' },
  { id: 'a3', title: 'pH reading needs review', message: 'A demo pH reading is outside the configured crop range.', severity: 'Warning', status: 'Acknowledged', farmId: 'f2', time: 'Yesterday', action: 'Verify calibration and assess the soil before intervention.' },
  { id: 'a4', title: 'Sensor data received', message: 'A new sample was recorded for Shivneri Farm.', severity: 'Info', status: 'Resolved', farmId: 'f1', time: 'Yesterday', action: 'No action required.' }
]

const demoReadings: Reading[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2,'0')}:00`,
  moisture: Math.round(44 + Math.sin(i * .47) * 13 + (i % 4)),
  temperature: Math.round(27 + Math.sin(i * .32) * 5),
  humidity: Math.round(62 + Math.cos(i * .3) * 14),
  ph: Number((6.4 + Math.sin(i * .27) * .45).toFixed(1))
}))

function freshData() {
  return {
    users: seedUsers,
    farms: seedFarms,
    crops: seedCrops,
    devices: seedDevices,
    alerts: seedAlerts,
    thresholds: { moisture: 30, temperature: 38, humidity: 85, phLow: 5.5, phHigh: 7.5 },
    profile: { notifications: true, language: 'English', units: 'Metric' }
  }
}
type Store = ReturnType<typeof freshData>

function loadData(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store
  } catch { /* fallback below */ }
  return freshData()
}

const navItems: { page: Page; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { page: 'Dashboard', icon: LayoutDashboard, roles: ['Admin','Farmer','Partner','Technician'] },
  { page: 'Crop analysis', icon: Sparkles, roles: ['Admin','Farmer','Partner','Technician'] },
  { page: 'Crops', icon: Sprout, roles: ['Admin','Farmer','Partner'] },
  { page: 'Farms & lands', icon: Tractor, roles: ['Admin','Farmer','Partner'] },
  { page: 'Alerts', icon: Bell, roles: ['Admin','Farmer','Partner','Technician'] },
  { page: 'Alert patterns', icon: SlidersHorizontal, roles: ['Admin'] },
  { page: 'Devices', icon: Cpu, roles: ['Admin','Farmer','Technician'] },
  { page: 'Database explorer', icon: Database, roles: ['Admin'] },
  { page: 'Users', icon: Users, roles: ['Admin'] },
]

const roleLabels: Record<Role, string> = {
  Admin: 'Administrator',
  Farmer: 'Farmer',
  Partner: 'Agricultural partner',
  Technician: 'Field technician'
}
const canEdit = (role: Role) => role === 'Admin' || role === 'Farmer'
function initials(name: string) { return name.split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase() }

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const time = Date.parse(dateStr);
  if (Number.isNaN(time)) return dateStr;
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button className="icon-btn" aria-label={label} title={label} onClick={onClick}>{children}</button>
}
function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close() }}><section className="modal"><div className="modal-head"><h2>{title}</h2><IconButton label="Close dialog" onClick={close}><X size={18}/></IconButton></div>{children}</section></div>
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }

export default function App() {
  const [store, setStore] = useState<Store>(loadData)
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(SESSION))
  const [mode, setMode] = useState<'demo' | 'live' | 'manual'>(() => (localStorage.getItem(MODE_KEY) as 'demo' | 'live' | 'manual') || 'demo')
  const [manualReadings, setManualReadings] = useState<SoilAndEnvReadings>({
    airTemperature: 26.5,
    relativeHumidity: 62.0,
    soilMoisture: 48.0,
    soilTemperature: 24.5,
    soilPh: 6.5,
    ec: 650,
    nitrogen: 125,
    phosphorus: 65,
    potassium: 115,
    rainfall: 0.0
  })
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false)
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [page, setPage] = useState<Page>('Dashboard')
  const [selectedCropId, setSelectedCropId] = useState('crop-tomato')
  const [selectedFarmFilter, setSelectedFarmFilter] = useState<string>('f1')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<null | 'farm' | 'crop' | 'device' | 'user' | 'reset'>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [period, setPeriod] = useState('24h')
  const [metric, setMetric] = useState<'moisture'|'temperature'|'humidity'|'ph'|'ec'|'rainfall'>('moisture')
  const [alertFilter, setAlertFilter] = useState('All')
  const [form, setForm] = useState<Record<string,string>>({})
  const [profileName, setProfileName] = useState('')

  // Live Telemetry State
  const [latestLiveReading, setLatestLiveReading] = useState<DbTelemetryReading | null>(null)
  const [liveHistory, setLiveHistory] = useState<DbTelemetryReading[]>([])
  const [liveDevices, setLiveDevices] = useState<LiveDeviceRecord[]>([])
  const [isFetchingLive, setIsFetchingLive] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [lastLivePoll, setLastLivePoll] = useState<Date | null>(null)
  const [dbEngine, setDbEngine] = useState<string>('PostgreSQL 17 / SQLite')
  const [tokenModal, setTokenModal] = useState<{ deviceId: string; token: string } | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const pollingRef = useRef<number | null>(null)

  const user = store.users.find(u => u.id === userId && u.active) ?? null

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then((data: { database?: { engine?: string } }) => {
        if (data?.database?.engine) {
          setDbEngine(data.database.engine);
        }
      })
      .catch(() => {});
  }, [])

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(store)) }, [store])
  useEffect(() => {
    if (user) localStorage.setItem(SESSION, user.id);
    else localStorage.removeItem(SESSION)
  }, [user])
  useEffect(() => { localStorage.setItem(MODE_KEY, mode) }, [mode])
  useEffect(() => {
    if (sessionToken) localStorage.setItem(TOKEN_KEY, sessionToken);
    else localStorage.removeItem(TOKEN_KEY)
  }, [sessionToken])

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(''), 3200);
      return () => window.clearTimeout(t)
    }
  }, [toast])

  // Authenticate user with server session token
  const authenticateUserSession = useCallback(async (currUser: User) => {
    try {
      const email = `${currUser.id.replace('u-','')}@smartfarm.demo`;
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'SmartFarmPassword2026!' })
      });
      if (res.ok) {
        const json = await res.json() as { token: string };
        setSessionToken(json.token);
        return json.token;
      }
    } catch {
      // Offline fallback: demo works regardless
    }
    return null;
  }, []);

  useEffect(() => {
    if (user && !sessionToken) {
      authenticateUserSession(user);
    }
  }, [user, sessionToken, authenticateUserSession]);

  const visibleFarms = useMemo(() => {
    if (!user) return []
    return user.role === 'Admin' ? store.farms : store.farms.filter(f => user.farmIds.includes(f.id) || f.ownerId === user.id)
  }, [store.farms, user])

  const visibleFarmIds = useMemo(() => visibleFarms.map(f => f.id), [visibleFarms])

  // Ensure selectedFarmFilter is valid for current user
  useEffect(() => {
    if (visibleFarmIds.length > 0 && !visibleFarmIds.includes(selectedFarmFilter)) {
      setSelectedFarmFilter(visibleFarmIds[0]);
    }
  }, [visibleFarmIds, selectedFarmFilter]);

  const visibleCrops = store.crops.filter(c => visibleFarmIds.includes(c.farmId))
  const visibleDevices = store.devices.filter(d => user?.role === 'Admin' || user?.role === 'Technician' ? (user.role === 'Admin' || visibleFarmIds.includes(d.farmId)) : visibleFarmIds.includes(d.farmId))
  const visibleAlerts = store.alerts.filter(a => visibleFarmIds.includes(a.farmId))
  const activeAlerts = visibleAlerts.filter(a => a.status === 'Active')

  // Fetch live telemetry from Express API
  const fetchLiveTelemetry = useCallback(async (showIndicator = false) => {
    if (mode !== 'live' || !user) return;
    if (showIndicator) setIsFetchingLive(true);
    setLiveError(null);

    let token = sessionToken;
    if (!token) {
      token = await authenticateUserSession(user);
    }

    if (!token) {
      setLiveError('Authentication failed. Retrying login...');
      if (showIndicator) setIsFetchingLive(false);
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const hoursMap: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168, '30d': 720 };
      const hours = hoursMap[period] || 24;

      const farmParam = selectedFarmFilter ? `&farmId=${encodeURIComponent(selectedFarmFilter)}` : '';

      // 1. Fetch latest reading for selected farm
      const latestRes = await fetch(`/api/v1/telemetry/latest?${farmParam.slice(1)}`, { headers });
      if (latestRes.ok) {
        const latestData = await latestRes.json() as { reading: DbTelemetryReading | null };
        setLatestLiveReading(latestData.reading);
      } else if (latestRes.status === 403) {
        setLiveError('Access restricted: Not assigned to this farm');
      }

      // 2. Fetch history for selected farm & time range
      const historyRes = await fetch(`/api/v1/telemetry/history?hours=${hours}${farmParam}`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json() as { readings: DbTelemetryReading[] };
        setLiveHistory(historyData.readings || []);
      }

      // 3. Fetch live registered devices & calculated status
      const devicesRes = await fetch('/api/devices', { headers });
      if (devicesRes.ok) {
        const devData = await devicesRes.json() as { devices: LiveDeviceRecord[] };
        setLiveDevices(devData.devices || []);
      }

      setLastLivePoll(new Date());
    } catch (err: unknown) {
      setLiveError((err as Error).message || 'Connection to telemetry server failed');
    } finally {
      if (showIndicator) setIsFetchingLive(false);
    }
  }, [mode, user, sessionToken, authenticateUserSession, selectedFarmFilter, period]);

  // Periodic Auto-Refresh: 10s intervals in Live Mode
  useEffect(() => {
    if (mode === 'live') {
      fetchLiveTelemetry(true);
      pollingRef.current = window.setInterval(() => {
        fetchLiveTelemetry(false);
      }, 10000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }
  }, [mode, fetchLiveTelemetry]);

  const handleRotateToken = async (deviceId: string) => {
    let token = sessionToken;
    if (!token && user) {
      token = await authenticateUserSession(user);
    }
    if (!token) {
      setToast('Administrator authentication required to rotate device token.');
      return;
    }
    try {
      const res = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/rotate-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json() as { newDeviceToken: string };
        setTokenModal({ deviceId, token: data.newDeviceToken });
        setToast(`Device token successfully rotated for ${deviceId}`);
      } else {
        const err = await res.json() as { message?: string };
        setToast(err.message || 'Failed to rotate device token');
      }
    } catch (e: unknown) {
      setToast(`Network error: ${(e as Error).message}`);
    }
  };

  const currentFarm = (id: string) => store.farms.find(f => f.id === id)?.name ?? 'Unknown farm'
  const currentCrop = store.crops.find(c => c.id === selectedCropId) ?? visibleCrops[0]
  const notify = (message: string) => setToast(message)
  const changePage = (p: Page) => { setPage(p); setMobileNav(false); setQuery('') }
  const patchStore = (patch: Partial<Store>) => setStore(prev => ({ ...prev, ...patch }))

  const upsert = <T extends {id:string}>(key: 'farms'|'crops'|'devices'|'users', item: T) => {
    setStore(prev => {
      const list = prev[key] as unknown as T[]
      const updated = list.some(x => x.id === item.id) ? list.map(x => x.id === item.id ? item : x) : [...list, item]
      return { ...prev, [key]: updated } as Store
    })
    setModal(null); setEditId(null); setForm({}); notify('Changes saved successfully')
  }

  const openForm = (kind: 'farm'|'crop'|'device'|'user', id?: string) => {
    setEditId(id ?? null)
    const item = id ? (kind === 'farm' ? store.farms : kind === 'crop' ? store.crops : kind === 'device' ? store.devices : store.users).find(x => x.id === id) as unknown as Record<string,unknown> : null
    setForm(item ? Object.fromEntries(Object.entries(item).map(([k,v]) => [k,String(v)])) : {})
    setModal(kind)
  }

  const removeRecord = (key: 'farms'|'crops'|'devices'|'users', id: string) => {
    setStore(prev => ({ ...prev, [key]: (prev[key] as unknown as {id:string}[]).filter((x: {id:string}) => x.id !== id) }) as Store)
    notify('Record deleted')
  }

  const logout = () => {
    setUserId(null);
    setSessionToken(null);
    setPage('Dashboard');
    setModal(null);
    notify('You have logged out')
  }

  const resetData = () => {
    setStore(freshData());
    setUserId('u-admin');
    setPage('Dashboard');
    setModal(null);
    notify('Demo data restored to defaults')
  }

  if (!user) {
    return <Login users={store.users} onLogin={u => { setUserId(u.id); authenticateUserSession(u); setPage('Dashboard') }} />
  }

  const title = page === 'Crop detail' ? (currentCrop?.name ?? 'Crop detail') : page

  // Parse raw telemetry payload if available
  let parsedRawPayload: any = null;
  if (latestLiveReading?.raw_payload) {
    try { parsedRawPayload = JSON.parse(latestLiveReading.raw_payload); } catch { /* ignore */ }
  }

  // Active devices count: live vs demo
  const liveActiveCount = liveDevices.filter(d => d.status === 'Online').length;
  const demoActiveCount = visibleDevices.filter(d => d.status === 'Online').length;
  const displayActiveDevices = mode === 'live' ? liveActiveCount : demoActiveCount;
  const displayTotalDevices = mode === 'live' ? liveDevices.length : visibleDevices.length;

  // Chart values calculation
  const demoChartValues = demoReadings.slice(period === '24h' ? 0 : period === '7d' ? 4 : 0, period === '24h' ? 24 : period === '7d' ? 20 : 24);

  // Live series extraction with null handling
  const liveChartLabels = liveHistory.map(r => {
    const d = new Date(r.recorded_at);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  const getMetricValue = (r: DbTelemetryReading, m: string): number | null => {
    if (m === 'moisture') return r.modbus_valid && r.soil_moisture_pct !== null ? r.soil_moisture_pct : null;
    if (m === 'temperature') return r.sht40_valid && r.air_temperature_c !== null ? r.air_temperature_c : r.modbus_valid && r.soil_temperature_c !== null ? r.soil_temperature_c : null;
    if (m === 'humidity') return r.sht40_valid && r.relative_humidity_pct !== null ? r.relative_humidity_pct : null;
    if (m === 'ph') return r.modbus_valid && r.soil_ph !== null ? r.soil_ph : null;
    if (m === 'ec') return r.modbus_valid && r.electrical_conductivity_ds_m !== null ? r.electrical_conductivity_ds_m * 1000 : null; // in uS/cm
    if (m === 'rainfall') return r.rain_valid ? r.rain_accumulation_mm : null;
    return null;
  };

  const liveMetricValues = liveHistory.map(r => getMetricValue(r, metric));
  const validLiveNumbers = liveMetricValues.filter((v): v is number => v !== null);

  const metricMeta = {
    moisture: { label: 'Soil moisture', unit: '%', color: '#2f8b57', icon: Droplets },
    temperature: { label: 'Air temperature', unit: '°C', color: '#dc8152', icon: Thermometer },
    humidity: { label: 'Air humidity', unit: '%', color: '#5389c7', icon: Waves },
    ph: { label: 'Soil pH', unit: 'pH', color: '#8d73c6', icon: Activity },
    ec: { label: 'Electrical conductivity', unit: 'µS/cm', color: '#4a85a4', icon: Radio },
    rainfall: { label: 'Rainfall (interval)', unit: 'mm', color: '#387ba3', icon: CloudSun }
  }

  const manualChartValues = useMemo(() => {
    const base = metric === 'moisture' ? manualReadings.soilMoisture :
                 metric === 'temperature' ? manualReadings.airTemperature :
                 metric === 'humidity' ? manualReadings.relativeHumidity :
                 metric === 'ph' ? manualReadings.soilPh :
                 metric === 'ec' ? manualReadings.ec :
                 manualReadings.rainfall ?? 0;
    return demoReadings.map((_, i) => {
      const variation = Math.sin(i * 0.4) * (base * 0.05);
      return Number((base + variation).toFixed(1));
    });
  }, [metric, manualReadings, demoReadings]);

  // Active chart numbers & bounds
  const chartValuesToRender = mode === 'live' ? validLiveNumbers : mode === 'manual' ? manualChartValues : demoChartValues.map(r => r[metric as 'moisture'|'temperature'|'humidity'|'ph'] || 0);
  const chartLabelsToRender = mode === 'live' ? liveChartLabels : demoChartValues.map(r => r.time);
  const chartMin = chartValuesToRender.length > 0 ? Math.min(...chartValuesToRender) - 2 : 0;
  const chartMax = chartValuesToRender.length > 0 ? Math.max(...chartValuesToRender) + 2 : 100;

  // Latest summary values
  const latestDemo = demoReadings[demoReadings.length - 1];
  const latestLiveVal = latestLiveReading ? getMetricValue(latestLiveReading, metric) : null;
  const chartCurrentStr = mode === 'live'
    ? (latestLiveVal !== null ? `${latestLiveVal}${metricMeta[metric].unit === 'pH' ? '' : metricMeta[metric].unit}` : 'Unavailable')
    : mode === 'manual'
    ? `${metric === 'moisture' ? manualReadings.soilMoisture.toFixed(1) : metric === 'temperature' ? manualReadings.airTemperature.toFixed(1) : metric === 'humidity' ? manualReadings.relativeHumidity.toFixed(0) : metric === 'ph' ? manualReadings.soilPh.toFixed(2) : metric === 'ec' ? manualReadings.ec : (manualReadings.rainfall ?? 0).toFixed(1)}${metricMeta[metric].unit === 'pH' ? '' : metricMeta[metric].unit}`
    : `${latestDemo[metric as 'moisture'|'temperature'|'humidity'|'ph'] || 0}${metricMeta[metric].unit === 'pH' ? '' : metricMeta[metric].unit}`;

  // Soil moisture for card
  const soilMoistureDisplay = mode === 'live'
    ? (latestLiveReading?.modbus_valid && latestLiveReading.soil_moisture_pct !== null ? `${latestLiveReading.soil_moisture_pct.toFixed(1)}%` : 'Unavailable')
    : mode === 'manual'
    ? `${manualReadings.soilMoisture.toFixed(1)}%`
    : `${latestDemo.moisture}%`;

  const activeReadings: SoilAndEnvReadings = useMemo(() => {
    if (mode === 'manual') return manualReadings;
    if (mode === 'live' && latestLiveReading) {
      return {
        airTemperature: latestLiveReading.sht40_valid && latestLiveReading.air_temperature_c !== null ? latestLiveReading.air_temperature_c : 27.5,
        relativeHumidity: latestLiveReading.sht40_valid && latestLiveReading.relative_humidity_pct !== null ? latestLiveReading.relative_humidity_pct : 62.0,
        soilMoisture: latestLiveReading.modbus_valid && latestLiveReading.soil_moisture_pct !== null ? latestLiveReading.soil_moisture_pct : 48.0,
        soilTemperature: latestLiveReading.modbus_valid && latestLiveReading.soil_temperature_c !== null ? latestLiveReading.soil_temperature_c : 25.0,
        soilPh: latestLiveReading.modbus_valid && latestLiveReading.soil_ph !== null ? latestLiveReading.soil_ph : 6.5,
        ec: latestLiveReading.modbus_valid && latestLiveReading.electrical_conductivity_ds_m !== null ? Math.round(latestLiveReading.electrical_conductivity_ds_m * 1000) : 650,
        nitrogen: latestLiveReading.modbus_valid && latestLiveReading.nitrogen_kg_ha !== null ? latestLiveReading.nitrogen_kg_ha : 115,
        phosphorus: latestLiveReading.modbus_valid && latestLiveReading.phosphorus_kg_ha !== null ? latestLiveReading.phosphorus_kg_ha : 55,
        potassium: latestLiveReading.modbus_valid && latestLiveReading.potassium_kg_ha !== null ? latestLiveReading.potassium_kg_ha : 110,
        rainfall: latestLiveReading.rain_valid ? latestLiveReading.rain_accumulation_mm : 0
      };
    }
    return {
      airTemperature: latestDemo.temperature,
      relativeHumidity: latestDemo.humidity,
      soilMoisture: latestDemo.moisture,
      soilTemperature: 25.0,
      soilPh: latestDemo.ph,
      ec: 650,
      nitrogen: 125,
      phosphorus: 65,
      potassium: 115,
      rainfall: 0
    };
  }, [mode, manualReadings, latestLiveReading, latestDemo]);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><Sprout size={23}/></div>
        <div><strong>SmartFarm</strong><small>PRECISION FARMING</small></div>
        <button className="mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button>
      </div>

      <div className="workspace-label">WORKSPACE</div>
      <nav className="side-nav">
        {navItems.filter(n => n.roles.includes(user.role)).map(item => (
          <button
            key={item.page}
            className={`nav-link ${page === item.page || (page === 'Crop detail' && item.page === 'Crops') ? 'selected' : ''}`}
            onClick={() => changePage(item.page)}
          >
            <item.icon size={18}/>
            <span>{item.page}</span>
            {item.page === 'Alerts' && activeAlerts.length > 0 && <em>{activeAlerts.length}</em>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="demo-note">
          <div className="demo-note-icon">
            {mode === 'live' ? <Radio size={17} color="#2ca459"/> : <ShieldCheck size={17}/>}
          </div>
          <strong>{mode === 'live' ? 'Live Telemetry Active' : 'Demo Environment'}</strong>
          <p>{mode === 'live' ? 'Connected to local SQLite database ingestion pipeline.' : 'Sample seeded data. No live physical sensors.'}</p>
          {mode === 'demo' ? (
            <button onClick={() => { setModal('reset') }}>Reset demo data <RefreshCw size={13}/></button>
          ) : (
            <button onClick={() => fetchLiveTelemetry(true)}>Refresh telemetry <RefreshCw size={13}/></button>
          )}
        </div>
        <button className={`nav-link ${page === 'Profile' ? 'selected' : ''}`} onClick={() => changePage('Profile')}><CircleUserRound size={18}/><span>Profile</span></button>
        {user.role === 'Admin' && <button className={`nav-link ${page === 'Settings' ? 'selected' : ''}`} onClick={() => changePage('Settings')}><Settings size={18}/><span>Settings</span></button>}
      </div>

      <button className="sidebar-user" onClick={() => changePage('Profile')}>
        <span className="avatar">{user.initials || initials(user.name)}</span>
        <span className="user-copy"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></span>
        <MoreHorizontal size={18}/>
      </button>
    </aside>

    {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)} />}

    <main className="main-area">
      <header className="topbar">
        <div className="top-left">
          <button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20}/></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{title}</strong></div>
        </div>

        <div className="top-actions">
          {/* Mode Switcher Pill */}
          {/* Three Operating Modes Selector */}
          <div className="mode-toggle-group" role="radiogroup" aria-label="Environment mode selector">
            <button
              className={`mode-toggle-btn ${mode === 'demo' ? 'active' : ''}`}
              onClick={() => { setMode('demo'); notify('Switched to Demo Simulation Mode'); }}
            >
              <span className="mode-dot demo"/> DEMO MODE
            </button>
            <button
              className={`mode-toggle-btn live ${mode === 'live' ? 'active' : ''}`}
              onClick={() => { setMode('live'); notify('Switched to Live Ingestion Mode'); }}
            >
              <span className="mode-dot live"/> LIVE MODE
            </button>
            <button
              className={`mode-toggle-btn manual ${mode === 'manual' ? 'active' : ''}`}
              onClick={() => { setMode('manual'); notify('Switched to Manual Interactive Mode'); }}
            >
              <span className="mode-dot manual"/> MANUAL MODE
            </button>
          </div>

          <button
            className="btn btn-light btn-xs"
            style={{ background: '#ecfdf5', color: '#166534', borderColor: '#bbf7d0', fontWeight: 800 }}
            onClick={() => setShowGuideModal(true)}
            title="Open 5-step demonstration walkthrough for your presentation"
          >
            <GraduationCap size={15}/> Professor Demo Guide
          </button>

          <button className="top-icon" title="Alerts" onClick={() => changePage('Alerts')}>
            <Bell size={19}/>
            {activeAlerts.length > 0 && <i/>}
          </button>

          <button className="top-profile" onClick={() => changePage('Profile')}>
            <span className="avatar small">{user.initials || initials(user.name)}</span>
            <span>{user.name.split(' ')[0]}</span>
            <ChevronDown size={14}/>
          </button>
        </div>
      </header>

      <div className="content">
        {/* Live Ingestion Status Banner */}
        {mode === 'live' && (
          <div className="live-banner">
            <div className="live-banner-left">
              <span className="mode-dot live"/>
              <div>
                <strong>Live Telemetry Stream Active (SQLite Ingestion)</strong>
                <p>
                  {latestLiveReading ? (
                    <>Latest sample from <strong>{latestLiveReading.device_id}</strong> on {currentFarm(latestLiveReading.farm_id)} ({formatRelativeTime(latestLiveReading.recorded_at)}). Auto-polling every 10s.</>
                  ) : (
                    <>Awaiting first telemetry packet for this farm. Upload via <code>POST /api/v1/telemetry/ingest</code>.</>
                  )}
                </p>
              </div>
            </div>
            <div className="live-banner-actions">
              {lastLivePoll && <span className="muted-text">Updated {formatRelativeTime(lastLivePoll.toISOString())}</span>}
              <button className="btn btn-light btn-xs" onClick={() => fetchLiveTelemetry(true)} disabled={isFetchingLive}>
                <RefreshCw size={13} className={isFetchingLive ? 'animate-spin' : ''}/> Sync now
              </button>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {page === 'Dashboard' && <section>
          <div className="page-heading">
            <div>
              <p className="eyebrow">{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
              <h1>Good morning, {user.name.split(' ')[0]} <span>🌱</span></h1>
              <p className="subheading">
                {mode === 'live' ? 'Showing real sensor telemetry and hardware connectivity.' : `Here’s what’s happening across your ${user.role === 'Admin' ? 'farming network' : 'assigned farms'} today.`}
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => changePage(user.role === 'Technician' ? 'Devices' : 'Farms & lands')}>
              <Plus size={16}/>{user.role === 'Technician' ? 'Inspect devices' : 'View farms'}
            </button>
          </div>

          <div className="stat-grid">
            <StatCard label="Total farms" value={visibleFarms.length} detail={`${visibleFarms.reduce((a,f)=>a+f.area,0).toFixed(1)} hectares`} icon={Tractor} tint="green" trend="Your farm network"/>
            <StatCard label="Active devices" value={`${displayActiveDevices}/${displayTotalDevices}`} detail={displayTotalDevices ? `${Math.round(displayActiveDevices/displayTotalDevices*100)}% online` : 'No devices'} icon={Cpu} tint="blue" trend={mode === 'live' ? 'Live status (<3m)' : 'Device connectivity'}/>
            <StatCard label="Active alerts" value={activeAlerts.length} detail={activeAlerts.filter(a=>a.severity==='Critical').length+' critical'} icon={AlertTriangle} tint="orange" trend="Needs attention"/>
            <StatCard label="Avg. soil moisture" value={soilMoistureDisplay} detail={mode === 'live' ? (latestLiveReading?.modbus_valid ? 'Latest Modbus probe' : 'Sensor offline') : 'Latest demo sample'} icon={Droplets} tint="purple" trend={mode === 'live' ? 'Live Reading' : 'Simulated'}/>
          </div>

          <div className="dashboard-grid">
            {/* Chart Panel */}
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>{mode === 'live' ? 'Live Sensor Analytics' : 'Sensor analytics'}</h2>
                  <p>{mode === 'live' ? `Historical records from ${dbEngine} for ${currentFarm(selectedFarmFilter)}` : 'Historical demo readings across your farms'}</p>
                </div>
                <div className="chart-controls">
                  <select aria-label="Farm selection" value={selectedFarmFilter} onChange={e => setSelectedFarmFilter(e.target.value)}>
                    {visibleFarms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <select aria-label="Sensor metric" value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>
                    {Object.entries(metricMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <select aria-label="Chart period" value={period} onChange={e => setPeriod(e.target.value)}>
                    <option value="1h">Last 1 hour</option>
                    <option value="6h">Last 6 hours</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>
              </div>

              <div className="chart-summary">
                <div>
                  <span>{metricMeta[metric].label}</span>
                  <strong>{chartCurrentStr}</strong>
                </div>
                <span className="trend-chip">
                  <TrendingUp size={14}/> {mode === 'live' ? `Live feed (${chartValuesToRender.length} pts)` : 'Demo history'}
                </span>
              </div>

              {mode === 'live' && isFetchingLive && chartValuesToRender.length === 0 ? (
                <div className="chart-state-msg">
                  <strong>Loading live telemetry...</strong>
                  <span>Querying time-series records from /api/v1/telemetry/history</span>
                </div>
              ) : mode === 'live' && chartValuesToRender.length === 0 ? (
                <div className="chart-state-msg">
                  <strong>No telemetry records in this time window</strong>
                  <span>Ingest readings via ESP32 firmware to populate this graph.</span>
                </div>
              ) : (
                <LineChart
                  values={chartValuesToRender}
                  labels={chartLabelsToRender}
                  color={metricMeta[metric].color}
                  min={chartMin}
                  max={chartMax}
                />
              )}

              <div className="chart-foot">
                <span><i className="legend-dot" style={{background:metricMeta[metric].color}}/> {metricMeta[metric].label}</span>
                <span><CalendarDays size={13}/> {mode === 'live' ? `Database records (${period})` : 'Hourly samples'}</span>
              </div>
              {liveError && <p className="sensor-unavailable" style={{marginTop:8}}>Notice: {liveError}</p>}
            </section>

            {/* Field Conditions Panel */}
            <section className="panel conditions-panel">
              <div className="panel-heading">
                <div>
                  <h2>Field conditions</h2>
                  <p>{mode === 'live' ? `Latest reading for ${currentFarm(selectedFarmFilter)}` : 'Latest demo sensor snapshot'}</p>
                </div>
                <span className="live-tag">
                  <span style={{background: mode === 'live' ? '#2ca459' : '#e0933e'}}/>
                  {mode === 'live' ? 'LIVE STREAM' : 'SIMULATED'}
                </span>
              </div>

              <div className="condition-grid">
                {/* Soil Moisture */}
                <Condition
                  icon={Droplets}
                  label="Soil moisture"
                  value={mode === 'live' ? (latestLiveReading?.modbus_valid && latestLiveReading.soil_moisture_pct !== null ? `${latestLiveReading.soil_moisture_pct.toFixed(1)}%` : 'Unavailable') : `${latestDemo.moisture}%`}
                  sub={mode === 'live' ? (latestLiveReading?.modbus_valid ? 'Modbus 7-in-1' : 'Probe Error') : 'Volumetric estimate'}
                  color="green"
                />

                {/* Air Temperature */}
                <Condition
                  icon={Thermometer}
                  label="Air temperature"
                  value={mode === 'live' ? (latestLiveReading?.sht40_valid && latestLiveReading.air_temperature_c !== null ? `${latestLiveReading.air_temperature_c.toFixed(1)}°C` : 'Unavailable') : `${latestDemo.temperature}°C`}
                  sub={mode === 'live' ? (latestLiveReading?.sht40_valid ? 'Sensirion SHT40' : 'SHT40 Error') : 'Ambient'}
                  color="orange"
                />

                {/* Relative Humidity */}
                <Condition
                  icon={Waves}
                  label="Relative humidity"
                  value={mode === 'live' ? (latestLiveReading?.sht40_valid && latestLiveReading.relative_humidity_pct !== null ? `${latestLiveReading.relative_humidity_pct.toFixed(1)}%` : 'Unavailable') : `${latestDemo.humidity}%`}
                  sub={mode === 'live' ? (latestLiveReading?.sht40_valid ? 'Sensirion SHT40' : 'SHT40 Error') : 'Relative humidity'}
                  color="blue"
                />

                {/* Soil pH */}
                <Condition
                  icon={Activity}
                  label="Soil pH"
                  value={mode === 'live' ? (latestLiveReading?.modbus_valid && latestLiveReading.soil_ph !== null ? latestLiveReading.soil_ph.toFixed(2) : 'Unavailable') : latestDemo.ph.toFixed(1)}
                  sub={mode === 'live' ? (latestLiveReading?.modbus_valid ? 'Modbus 7-in-1' : 'Probe Error') : 'Soil acidity'}
                  color="purple"
                />
              </div>

              {/* Extended Live Sensor Metrics (NPK, EC, Rain) */}
              {mode === 'live' && (
                <div style={{marginTop: 14}}>
                  {/* EC & Soil Temp */}
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8}}>
                    <div className="rain-metric-box">
                      <small>Electrical Cond. (EC)</small>
                      <strong>
                        {latestLiveReading?.modbus_valid && parsedRawPayload?.modbus?.electrical_conductivity_us_cm !== undefined ? (
                          `${parsedRawPayload.modbus.electrical_conductivity_us_cm} µS/cm`
                        ) : latestLiveReading?.modbus_valid && latestLiveReading.electrical_conductivity_ds_m !== null ? (
                          `${(latestLiveReading.electrical_conductivity_ds_m * 1000).toFixed(0)} µS/cm`
                        ) : 'Unavailable'}
                      </strong>
                    </div>
                    <div className="rain-metric-box">
                      <small>Soil Temp (Modbus)</small>
                      <strong>
                        {latestLiveReading?.modbus_valid && latestLiveReading.soil_temperature_c !== null ? `${latestLiveReading.soil_temperature_c.toFixed(1)}°C` : 'Unavailable'}
                      </strong>
                    </div>
                  </div>

                  {/* Authoritative Raw NPK Nutrients */}
                  <div style={{background:'#fafbf9', border:'1px solid #f0f2ed', borderRadius:9, padding:'10px 12px', marginBottom:8}}>
                    <div style={{fontSize:9, fontWeight:800, color:'#7a8b7c', textTransform:'uppercase', letterSpacing:'.6px'}}>
                      Soil Nutrients (NPK — Authoritative Raw Units)
                    </div>
                    {latestLiveReading?.modbus_valid && parsedRawPayload?.modbus ? (
                      <div className="npk-pills">
                        <span className="npk-chip"><span>Nitrogen (N):</span><strong>{parsedRawPayload.modbus.nitrogen_mg_kg ?? latestLiveReading.nitrogen_kg_ha} mg/kg</strong></span>
                        <span className="npk-chip"><span>Phosphorus (P):</span><strong>{parsedRawPayload.modbus.phosphorus_mg_kg ?? latestLiveReading.phosphorus_kg_ha} mg/kg</strong></span>
                        <span className="npk-chip"><span>Potassium (K):</span><strong>{parsedRawPayload.modbus.potassium_mg_kg ?? latestLiveReading.potassium_kg_ha} mg/kg</strong></span>
                      </div>
                    ) : (
                      <span className="sensor-unavailable" style={{marginTop:4}}>NPK Sensor Offline</span>
                    )}
                  </div>

                  {/* Rainfall Metrics without Double-Counting */}
                  <div className="rain-metrics">
                    <div className="rain-metric-box">
                      <small>Interval Rain (1m)</small>
                      <strong>
                        {latestLiveReading?.rain_valid ? `${latestLiveReading.rain_accumulation_mm.toFixed(2)} mm` : '0.00 mm'}
                      </strong>
                    </div>
                    <div className="rain-metric-box">
                      <small>Cumulative Rain (Total)</small>
                      <strong>
                        {parsedRawPayload?.rain_gauge?.rainfall_cumulative_mm !== undefined
                          ? `${parsedRawPayload.rain_gauge.rainfall_cumulative_mm.toFixed(2)} mm`
                          : latestLiveReading?.rain_valid ? `${latestLiveReading.rain_accumulation_mm.toFixed(2)} mm` : '0.00 mm'}
                      </strong>
                    </div>
                  </div>

                  {/* Telemetry Diagnostics Metadata */}
                  <div className="live-meta-row">
                    <span>Node: <strong>{latestLiveReading?.device_id || 'ESP32'}</strong></span>
                    <span>Batt: <strong>{parsedRawPayload?.diagnostics?.battery_pct ?? 94}%</strong></span>
                    <span>RSSI: <strong>{parsedRawPayload?.diagnostics?.wifi_rssi_dbm ?? -60} dBm</strong></span>
                    <span>{formatRelativeTime(latestLiveReading?.recorded_at)}</span>
                  </div>
                </div>
              )}

              {mode === 'demo' && (
                <div className="weather-strip">
                  <CloudSun size={20}/>
                  <div>
                    <strong>Weather integration not connected</strong>
                    <small>Values above come from seeded demo readings.</small>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="lower-grid">
            <section className="panel">
              <div className="panel-heading">
                <div><h2>Farm overview</h2><p>Your farms at a glance</p></div>
                <button className="text-button" onClick={()=>changePage('Farms & lands')}>View all <ChevronRight size={14}/></button>
              </div>
              <div className="farm-list">
                {visibleFarms.slice(0,3).map(f => (
                  <button className="farm-row" key={f.id} onClick={()=>changePage('Farms & lands')}>
                    <div className="farm-thumb"><Sprout size={22}/></div>
                    <div className="farm-row-copy">
                      <strong>{f.name}</strong>
                      <small><MapPin size={12}/>{f.location}</small>
                    </div>
                    <div className="farm-row-end">
                      <strong>{f.area} ha</strong>
                      <StatusBadge status={f.status === 'Healthy' ? 'Healthy' : 'Warning'}/>
                    </div>
                    <ChevronRight size={16}/>
                  </button>
                ))}
                {!visibleFarms.length && <EmptyState text="No farms assigned to this account yet."/>}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <div><h2>Recent alerts</h2><p>Issues that may need attention</p></div>
                <button className="text-button" onClick={()=>changePage('Alerts')}>View all <ChevronRight size={14}/></button>
              </div>
              <div className="recent-alerts">
                {visibleAlerts.slice(0,3).map(a => (
                  <div className="recent-alert" key={a.id}>
                    <span className={`alert-symbol ${a.severity.toLowerCase()}`}><AlertTriangle size={16}/></span>
                    <div>
                      <strong>{a.title}</strong>
                      <p>{a.message}</p>
                      <small>{a.time} · {currentFarm(a.farmId)}</small>
                    </div>
                    <StatusBadge status={a.status}/>
                  </div>
                ))}
                {!visibleAlerts.length && <EmptyState text="No alerts for your assigned farms."/>}
              </div>
            </section>
          </div>
        </section>}

        {/* Farms & lands View */}
        {page === 'Farms & lands' && <section>
          <PageHeading
            eyebrow="YOUR AGRICULTURAL NETWORK"
            title="Farms & lands"
            subtitle="Manage farm records, fields, ownership and crop assignments."
            action={canEdit(user.role) && <button className="btn btn-primary" onClick={()=>openForm('farm')}><Plus size={16}/> Add farm</button>}
          />
          <div className="toolbar">
            <div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search farms or locations..."/></div>
            <span className="result-count">{visibleFarms.filter(f=>(f.name+' '+f.location+' '+f.crop).toLowerCase().includes(query.toLowerCase())).length} farms</span>
          </div>
          <div className="farm-cards">
            {visibleFarms.filter(f=>(f.name+' '+f.location+' '+f.crop).toLowerCase().includes(query.toLowerCase())).map(f => (
              <article className="farm-card" key={f.id}>
                <div className="farm-card-banner">
                  <div className="field-art"><span>🌿</span><span>🌱</span><span>🌾</span></div>
                  <span className="area-chip">{f.area} hectares</span>
                </div>
                <div className="farm-card-body">
                  <div className="farm-card-title">
                    <div><h3>{f.name}</h3><p><MapPin size={13}/>{f.location}</p></div>
                    <StatusBadge status={f.status==='Healthy'?'Healthy':'Warning'}/>
                  </div>
                  <div className="farm-meta">
                    <div><small>OWNER</small><strong>{store.users.find(u=>u.id===f.ownerId)?.name ?? 'Unassigned'}</strong></div>
                    <div><small>FIELDS</small><strong>{f.fields} plots</strong></div>
                    <div><small>SOIL TYPE</small><strong>{f.soil}</strong></div>
                  </div>
                  <div className="farm-card-bottom">
                    <span><Sprout size={15}/>{f.crop}</span>
                    <div className="inline-actions">
                      <button className="btn btn-light btn-sm" onClick={()=>{setSelectedCropId(store.crops.find(c=>c.farmId===f.id)?.id ?? 'c1');changePage('Crop detail')}}>View details</button>
                      {canEdit(user.role) && <IconButton label="Edit farm" onClick={()=>openForm('farm',f.id)}><Pencil size={15}/></IconButton>}
                      {user.role==='Admin' && <IconButton label="Delete farm" onClick={()=>{if(confirm('Delete this farm and its linked demo records?')){removeRecord('farms',f.id);setStore(prev=>({...prev,crops:prev.crops.filter(c=>c.farmId!==f.id),devices:prev.devices.filter(d=>d.farmId!==f.id),alerts:prev.alerts.filter(a=>a.farmId!==f.id)}))}}}><Trash2 size={15}/></IconButton>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {visibleFarms.length===0 && <EmptyState text="No farms are assigned to this account."/>}
          </div>
        </section>}

        {/* Crops View */}
        {page === 'Crops' && <section>
          <PageHeading
            eyebrow="CROP MANAGEMENT"
            title="Crops & growing cycles"
            subtitle="Review crop stages, soil targets and farm assignments."
            action={canEdit(user.role) && <button className="btn btn-primary" onClick={()=>openForm('crop')}><Plus size={16}/> Add crop</button>}
          />
          <div className="toolbar">
            <div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search crops..."/></div>
            <span className="result-count">{visibleCrops.length} crop records</span>
          </div>
          <div className="crop-grid">
            {visibleCrops.filter(c=>(c.name+' '+c.stage+' '+currentFarm(c.farmId)).toLowerCase().includes(query.toLowerCase())).map(c => (
              <article className="crop-card" key={c.id}>
                <div className="crop-art"><span>{c.emoji}</span><span className="stage-tag">{c.stage}</span></div>
                <div className="crop-card-body">
                  <div className="crop-title"><div><h3>{c.name}</h3><p>{currentFarm(c.farmId)}</p></div><span className="crop-status-dot"/></div>
                  <div className="target-row">
                    <div><small>MOISTURE TARGET</small><strong>{c.moistureMin}–{c.moistureMax}%</strong></div>
                    <div><small>SOIL pH</small><strong>{c.phMin}–{c.phMax}</strong></div>
                  </div>
                  <p className="crop-note">{c.note}</p>
                  <div className="crop-actions">
                    <button className="btn btn-light" onClick={()=>{setSelectedCropId(c.id);changePage('Crop detail')}}>View crop details <ChevronRight size={15}/></button>
                    {canEdit(user.role) && <IconButton label="Edit crop" onClick={()=>openForm('crop',c.id)}><Pencil size={15}/></IconButton>}
                  </div>
                </div>
              </article>
            ))}
            {visibleCrops.length===0 && <EmptyState text="No crop records available."/>}
          </div>
        </section>}

        {/* Crop Detail View */}
        {page === 'Crop detail' && currentCrop && <section>
          <PageHeading
            eyebrow="CROP DETAILS"
            title={`${currentCrop.emoji} ${currentCrop.name}`}
            subtitle={`${currentFarm(currentCrop.farmId)} · ${currentCrop.stage}`}
            action={<button className="btn btn-light" onClick={()=>changePage('Crops')}>Back to crops</button>}
          />
          <div className="detail-grid">
            <div className="panel crop-detail-main">
              <div className="crop-hero">
                <div className="crop-hero-emoji">{currentCrop.emoji}</div>
                <div>
                  <span className="eyebrow">CURRENT GROWTH STAGE</span>
                  <h2>{currentCrop.stage}</h2>
                  <p>{currentCrop.note}</p>
                </div>
              </div>
              <h3>Sensor readings</h3>
              <div className="mini-stat-grid">
                <Condition
                  icon={Droplets}
                  label="Soil moisture"
                  value={mode === 'live' ? (latestLiveReading?.modbus_valid && latestLiveReading.soil_moisture_pct !== null ? `${latestLiveReading.soil_moisture_pct.toFixed(1)}%` : 'Unavailable') : `${latestDemo.moisture}%`}
                  sub={`Target ${currentCrop.moistureMin}–${currentCrop.moistureMax}%`}
                  color="green"
                />
                <Condition
                  icon={Thermometer}
                  label="Temperature"
                  value={mode === 'live' ? (latestLiveReading?.sht40_valid && latestLiveReading.air_temperature_c !== null ? `${latestLiveReading.air_temperature_c.toFixed(1)}°C` : 'Unavailable') : `${latestDemo.temperature}°C`}
                  sub={mode === 'live' ? 'Sensirion SHT40' : 'Simulated'}
                  color="orange"
                />
                <Condition
                  icon={Activity}
                  label="Soil pH"
                  value={mode === 'live' ? (latestLiveReading?.modbus_valid && latestLiveReading.soil_ph !== null ? latestLiveReading.soil_ph.toFixed(2) : 'Unavailable') : latestDemo.ph.toFixed(1)}
                  sub={`Target ${currentCrop.phMin}–${currentCrop.phMax}`}
                  color="purple"
                />
              </div>
              <h3 className="section-subhead">Moisture history</h3>
              <LineChart
                values={mode === 'live' && liveHistory.length > 0 ? liveHistory.map(r => r.modbus_valid && r.soil_moisture_pct !== null ? r.soil_moisture_pct : 0) : demoReadings.map(r=>r.moisture)}
                labels={mode === 'live' && liveHistory.length > 0 ? liveHistory.map(r => new Date(r.recorded_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})) : demoReadings.map(r=>r.time)}
                color="#2f8b57"
                min={20}
                max={80}
              />
              <p className="micro-note">
                {mode === 'live' ? 'Showing real-time telemetry from SQLite database.' : 'Simulated sample values. Actual readings will be available after IoT integration.'}
              </p>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <div><h2>Crop requirements</h2><p>Configured thresholds</p></div>
                <Leaf size={19} color="#2f8b57"/>
              </div>
              <div className="requirement">
                <span>Soil moisture</span>
                <strong>{currentCrop.moistureMin}–{currentCrop.moistureMax}%</strong>
                <div className="range-track"><i style={{left:`${currentCrop.moistureMin}%`,width:`${currentCrop.moistureMax-currentCrop.moistureMin}%`}}/></div>
              </div>
              <div className="requirement">
                <span>Soil pH range</span>
                <strong>{currentCrop.phMin}–{currentCrop.phMax}</strong>
                <div className="range-track"><i style={{left:`${currentCrop.phMin*10}%`,width:`${(currentCrop.phMax-currentCrop.phMin)*10}%`}}/></div>
              </div>
              <div className="recommendation-box">
                <div className="recommendation-icon"><Sprout size={18}/></div>
                <div>
                  <strong>Status check</strong>
                  <p>
                    {mode === 'live' && latestLiveReading?.soil_moisture_pct !== null && latestLiveReading?.soil_moisture_pct !== undefined ? (
                      latestLiveReading.soil_moisture_pct < currentCrop.moistureMin
                        ? 'Soil moisture is below the configured range. Inspect irrigation.'
                        : latestLiveReading.soil_moisture_pct > currentCrop.moistureMax
                        ? 'Soil moisture is above the configured range. Check field drainage.'
                        : 'Current moisture is within the healthy configured range.'
                    ) : 'Regular monitoring active.'}
                  </p>
                </div>
              </div>
              {canEdit(user.role) && <button className="btn btn-primary full-width" onClick={()=>openForm('crop',currentCrop.id)}><Pencil size={15}/> Edit crop settings</button>}
            </div>
          </div>
        </section>}

        {/* Sensor Data View */}
        {page === 'Sensor data' && <section>
          <PageHeading
            eyebrow="FIELD MONITORING"
            title="Sensor data"
            subtitle={mode === 'live' ? `Live telemetry stream for ${currentFarm(selectedFarmFilter)}.` : 'Explore historical readings by parameter. All values shown here are simulated demo data.'}
          />
          <div className="stat-grid">
            <StatCard label="Soil moisture" value={soilMoistureDisplay} detail={mode === 'live' ? 'Live Modbus' : 'Latest sample'} icon={Droplets} tint="green"/>
            <StatCard label="Air temperature" value={mode === 'live' ? (latestLiveReading?.sht40_valid && latestLiveReading.air_temperature_c !== null ? `${latestLiveReading.air_temperature_c.toFixed(1)}°C` : 'Unavailable') : `${latestDemo.temperature}°C`} detail="SHT40 sensor" icon={Thermometer} tint="orange"/>
            <StatCard label="Air humidity" value={mode === 'live' ? (latestLiveReading?.sht40_valid && latestLiveReading.relative_humidity_pct !== null ? `${latestLiveReading.relative_humidity_pct.toFixed(1)}%` : 'Unavailable') : `${latestDemo.humidity}%`} detail="SHT40 sensor" icon={Waves} tint="blue"/>
            <StatCard label="Soil pH" value={mode === 'live' ? (latestLiveReading?.modbus_valid && latestLiveReading.soil_ph !== null ? latestLiveReading.soil_ph.toFixed(2) : 'Unavailable') : latestDemo.ph.toFixed(1)} detail="Modbus sensor" icon={Activity} tint="purple"/>
          </div>

          <div className="panel sensor-page-panel">
            <div className="panel-heading">
              <div>
                <h2>{mode === 'live' ? 'Live historical sensor readings' : 'Historical sensor readings'}</h2>
                <p>Choose a metric and time range to inspect the sample series.</p>
              </div>
              <span className="live-tag">
                <span style={{background: mode === 'live' ? '#2ca459' : '#e0933e'}}/>
                {mode === 'live' ? 'LIVE DATA' : 'SIMULATED DATA'}
              </span>
            </div>

            <div className="chart-controls sensor-controls">
              <select aria-label="Farm selection" value={selectedFarmFilter} onChange={e => setSelectedFarmFilter(e.target.value)}>
                {visibleFarms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select aria-label="Sensor metric" value={metric} onChange={e => setMetric(e.target.value as typeof metric)}>
                {Object.entries(metricMeta).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select aria-label="Chart period" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="1h">Last 1 hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            <div className="chart-summary">
              <div>
                <span>{metricMeta[metric].label}</span>
                <strong>{chartCurrentStr}</strong>
              </div>
              <span className="trend-chip">
                <Activity size={14}/> {chartValuesToRender.length} sample points
              </span>
            </div>

            {mode === 'live' && chartValuesToRender.length === 0 ? (
              <div className="chart-state-msg">
                <strong>No telemetry records found for this farm in this window</strong>
                <span>New packets will automatically appear here once transmitted.</span>
              </div>
            ) : (
              <LineChart
                values={chartValuesToRender}
                labels={chartLabelsToRender}
                color={metricMeta[metric].color}
                min={chartMin}
                max={chartMax}
              />
            )}
          </div>

          <div className="panel sensor-reading-table">
            <div className="panel-heading">
              <div>
                <h2>{mode === 'live' ? 'Ingested readings from SQLite' : 'Latest readings'}</h2>
                <p>{mode === 'live' ? 'Authoritative values as received via HTTPS API.' : 'Timestamped values from the seeded sensor series.'}</p>
              </div>
              <button className="btn btn-light btn-sm" onClick={() => mode === 'live' ? fetchLiveTelemetry(true) : notify('Demo reading list refreshed')}>
                <RefreshCw size={14} className={isFetchingLive ? 'animate-spin' : ''}/> Refresh view
              </button>
            </div>

            {mode === 'live' ? (
              <div>
                <div className="table-head reading-row-live">
                  <span>RECORDED AT</span>
                  <span>AIR TEMP</span>
                  <span>HUMIDITY</span>
                  <span>SOIL MOIST</span>
                  <span>SOIL TEMP</span>
                  <span>SOIL pH</span>
                  <span>EC (uS/cm)</span>
                  <span>NPK (mg/kg)</span>
                  <span>RAIN (mm)</span>
                </div>
                {liveHistory.slice(-12).reverse().map(r => {
                  let rawJson: any = null;
                  try { rawJson = r.raw_payload ? JSON.parse(r.raw_payload) : null; } catch { /* ignore */ }
                  return (
                    <div className="reading-row-live" key={r.id}>
                      <span>{new Date(r.recorded_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                      <span>{r.sht40_valid && r.air_temperature_c !== null ? `${r.air_temperature_c.toFixed(1)}°C` : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.sht40_valid && r.relative_humidity_pct !== null ? `${r.relative_humidity_pct.toFixed(1)}%` : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.modbus_valid && r.soil_moisture_pct !== null ? `${r.soil_moisture_pct.toFixed(1)}%` : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.modbus_valid && r.soil_temperature_c !== null ? `${r.soil_temperature_c.toFixed(1)}°C` : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.modbus_valid && r.soil_ph !== null ? r.soil_ph.toFixed(2) : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.modbus_valid && rawJson?.modbus?.electrical_conductivity_us_cm !== undefined ? `${rawJson.modbus.electrical_conductivity_us_cm}` : r.modbus_valid && r.electrical_conductivity_ds_m !== null ? `${(r.electrical_conductivity_ds_m*1000).toFixed(0)}` : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.modbus_valid && rawJson?.modbus ? `${rawJson.modbus.nitrogen_mg_kg ?? '-'}/${rawJson.modbus.phosphorus_mg_kg ?? '-'}/${rawJson.modbus.potassium_mg_kg ?? '-'}` : <span className="sensor-unavailable">Err</span>}</span>
                      <span>{r.rain_valid ? `${r.rain_accumulation_mm.toFixed(2)}` : '0.00'}</span>
                    </div>
                  );
                })}
                {liveHistory.length === 0 && <EmptyState text="No ingested telemetry readings recorded yet for this farm."/>}
              </div>
            ) : (
              <div>
                <div className="table-head reading-row">
                  <span>TIME</span>
                  <span>SOIL MOISTURE</span>
                  <span>TEMPERATURE</span>
                  <span>HUMIDITY</span>
                  <span>SOIL pH</span>
                </div>
                {demoReadings.slice(-8).reverse().map((r,i) => (
                  <div className="reading-row" key={r.time}>
                    <span>{r.time} · {i===0?'Latest':'Earlier sample'}</span>
                    <span>{r.moisture}%</span>
                    <span>{r.temperature}°C</span>
                    <span>{r.humidity}%</span>
                    <span>{r.ph.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>}

        {/* Alerts View */}
        {page === 'Alerts' && <section>
          <PageHeading eyebrow="MONITORING & NOTIFICATIONS" title="Alerts & notifications" subtitle="Review sensor warnings and track follow-up actions."/>
          <div className="alert-summary-grid">
            <SummaryCard label="Active" value={visibleAlerts.filter(a=>a.status==='Active').length} color="red"/>
            <SummaryCard label="Acknowledged" value={visibleAlerts.filter(a=>a.status==='Acknowledged').length} color="amber"/>
            <SummaryCard label="Resolved" value={visibleAlerts.filter(a=>a.status==='Resolved').length} color="green"/>
          </div>
          <div className="toolbar">
            <div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search alerts..."/></div>
            <div className="filter-wrap">
              <Filter size={15}/>
              <select value={alertFilter} onChange={e=>setAlertFilter(e.target.value)}>
                <option>All</option>
                <option>Active</option>
                <option>Acknowledged</option>
                <option>Resolved</option>
                <option>Critical</option>
                <option>Warning</option>
                <option>Info</option>
              </select>
            </div>
          </div>
          <div className="panel alert-table">
            <div className="table-head alert-table-row">
              <span>ALERT</span><span>FARM</span><span>SEVERITY</span><span>STATUS</span><span>TIME</span><span>ACTIONS</span>
            </div>
            {visibleAlerts.filter(a=>(alertFilter==='All'||a.status===alertFilter||a.severity===alertFilter)&&(a.title+' '+a.message+' '+currentFarm(a.farmId)).toLowerCase().includes(query.toLowerCase())).map(a => (
              <div className="alert-table-row" key={a.id}>
                <div className="alert-title-cell">
                  <span className={`alert-symbol ${a.severity.toLowerCase()}`}><AlertTriangle size={15}/></span>
                  <div>
                    <strong>{a.title}</strong>
                    <small>{a.message}</small>
                    <p className="alert-action-text">Suggested: {a.action}</p>
                  </div>
                </div>
                <span className="table-farm">{currentFarm(a.farmId)}</span>
                <span><StatusBadge status={a.severity}/></span>
                <span><StatusBadge status={a.status}/></span>
                <span className="muted-text">{a.time}</span>
                <div className="table-actions">
                  {a.status==='Active'&&<button className="btn btn-light btn-xs" onClick={()=>{patchStore({alerts:store.alerts.map(x=>x.id===a.id?{...x,status:'Acknowledged'}:x)});notify('Alert acknowledged')}}>Acknowledge</button>}
                  {a.status!=='Resolved'&&user.role!=='Technician'&&<IconButton label="Resolve alert" onClick={()=>{patchStore({alerts:store.alerts.map(x=>x.id===a.id?{...x,status:'Resolved'}:x)});notify('Alert marked as resolved')}}><Check size={16}/></IconButton>}
                </div>
              </div>
            ))}
            {visibleAlerts.length===0&&<EmptyState text="No alerts are associated with your assigned farms."/>}
          </div>
        </section>}

        {/* Alert Patterns View */}
        {page === 'Alert patterns' && user.role === 'Admin' && <section>
          <PageHeading eyebrow="RULES & CONFIGURATION" title="Alert patterns" subtitle="Configure demo thresholds and preview how the application responds to sensor conditions."/>
          <div className="pattern-grid">
            <div className="panel">
              <div className="panel-heading">
                <div><h2>Sensor thresholds</h2><p>These values apply to alert rules.</p></div>
                <SlidersHorizontal size={18}/>
              </div>
              <div className="threshold-list">
                {([['moisture','Low soil moisture (%)',0,100],['temperature','High temperature (°C)',0,60],['humidity','High humidity (%)',0,100],['phLow','Low soil pH',0,14],['phHigh','High soil pH',0,14]] as [keyof Store['thresholds'],string,number,number][]).map(([key,label,min,max]) => (
                  <label className="threshold-control" key={key}>
                    <span>{label}</span>
                    <input type="number" min={min} max={max} step={key.startsWith('ph')?0.1:1} value={store.thresholds[key]} onChange={e=>patchStore({thresholds:{...store.thresholds,[key]:Number(e.target.value)}})}/>
                  </label>
                ))}
              </div>
              <button className="btn btn-primary" onClick={()=>{notify('Threshold configuration saved');}}>
                Save rules & evaluate readings
              </button>
            </div>
            <div className="panel">
              <div className="panel-heading">
                <div><h2>How alert patterns work</h2><p>Rule-based monitoring</p></div>
                <Bell size={18}/>
              </div>
              <div className="pattern-step"><span>01</span><div><strong>Sensor sample received</strong><p>A device submits a timestamped reading to the data layer.</p></div></div>
              <div className="pattern-step"><span>02</span><div><strong>Threshold evaluation</strong><p>Configured rules compare the sample with limits.</p></div></div>
              <div className="pattern-step"><span>03</span><div><strong>Alert created</strong><p>Duplicate active alerts are avoided for the same farm and rule.</p></div></div>
              <div className="pattern-step"><span>04</span><div><strong>Farmer follows up</strong><p>Users can acknowledge or resolve an alert and review suggested actions.</p></div></div>
            </div>
          </div>
        </section>}

        {/* Devices View */}
        {page === 'Devices' && <section>
          <PageHeading
            eyebrow="IOT DEVICE MONITORING"
            title="Devices"
            subtitle={mode === 'live' ? 'Real registered hardware nodes from SQLite with evaluated online/stale/offline status.' : 'Monitor demo device status, sensor assignments and maintenance history.'}
            action={user.role==='Admin' && <button className="btn btn-primary" onClick={()=>openForm('device')}><Plus size={16}/> Register device</button>}
          />
          <div className="stat-grid compact-stats">
            <StatCard label="Total devices" value={displayTotalDevices} detail="Registered nodes" icon={Cpu} tint="green"/>
            <StatCard label="Online" value={displayActiveDevices} detail="Reporting within 3m" icon={CheckCircle2} tint="blue"/>
            <StatCard label="Needs attention" value={mode === 'live' ? liveDevices.filter(d=>d.status==='Needs attention').length : visibleDevices.filter(d=>d.status==='Offline').length} detail="Stale (3–15 min)" icon={AlertTriangle} tint="orange"/>
            <StatCard label="Maintenance" value={mode === 'live' ? liveDevices.filter(d=>d.status==='Maintenance').length : visibleDevices.filter(d=>d.status==='Maintenance').length} detail="Service state" icon={Wrench} tint="purple"/>
          </div>

          <div className="toolbar">
            <div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search device ID or farm..."/></div>
          </div>

          <div className="panel device-table">
            <div className="table-head device-row">
              <span>DEVICE</span><span>FARM / FIELD</span><span>STATUS</span><span>BATTERY</span><span>LAST SYNC</span><span>ACTIONS</span>
            </div>
            {mode === 'live' ? (
              liveDevices.filter(d => (d.id+' '+d.name+' '+currentFarm(d.farm_id)).toLowerCase().includes(query.toLowerCase())).map(d => (
                <div className="device-row" key={d.id}>
                  <div className="device-name">
                    <span className="device-icon"><Cpu size={18}/></span>
                    <div><strong>{d.name}</strong><small>{d.id} · {d.hardware_type}</small></div>
                  </div>
                  <span>{currentFarm(d.farm_id)}</span>
                  <span><StatusBadge status={d.status}/></span>
                  <span>
                    <div className="battery">
                      <span className="battery-track"><i style={{width:`${d.battery_pct}%`}}/></span>
                      <small>{d.battery_pct.toFixed(0)}%</small>
                    </div>
                  </span>
                  <span className="muted-text">{formatRelativeTime(d.last_seen_at)}</span>
                  <div className="table-actions">
                    {(user.role === 'Admin' || user.role === 'Technician') && (
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => handleRotateToken(d.id)}
                        title="Rotate / generate revocable hardware device token"
                      >
                        <Key size={13} /> Rotate Token
                      </button>
                    )}
                    {user.role === 'Admin' && <IconButton label="Edit device" onClick={()=>openForm('device', d.id)}><Pencil size={15}/></IconButton>}
                  </div>
                </div>
              ))
            ) : (
              visibleDevices.filter(d => (d.id+' '+d.name+' '+currentFarm(d.farmId)).toLowerCase().includes(query.toLowerCase())).map(d => (
                <div className="device-row" key={d.id}>
                  <div className="device-name">
                    <span className="device-icon"><Cpu size={18}/></span>
                    <div><strong>{d.name}</strong><small>{d.id} · {d.kind}</small></div>
                  </div>
                  <span>{currentFarm(d.farmId)}</span>
                  <span><StatusBadge status={d.status}/></span>
                  <span>
                    <div className="battery">
                      <span className="battery-track"><i style={{width:`${d.battery}%`}}/></span>
                      <small>{d.battery}%</small>
                    </div>
                  </span>
                  <span className="muted-text">{d.lastSeen}</span>
                  <div className="table-actions">
                    {(user.role === 'Admin' || user.role === 'Technician') && (
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => handleRotateToken(d.id)}
                        title="Rotate / generate revocable hardware device token"
                      >
                        <Key size={13} /> Rotate Token
                      </button>
                    )}
                    {user.role==='Admin'&&<IconButton label="Edit device" onClick={()=>openForm('device',d.id)}><Pencil size={15}/></IconButton>}
                    {user.role==='Technician'&&<button className="btn btn-light btn-xs" onClick={()=>{setEditId(d.id);setForm({notes:d.notes,status:d.status});setModal('device')}}><Wrench size={14}/> Service</button>}
                  </div>
                </div>
              ))
            )}
            {(mode === 'live' ? liveDevices.length === 0 : visibleDevices.length === 0) && <EmptyState text="No devices found."/>}
          </div>

          <div className="note-box">
            <Activity size={17}/>
            <p>
              <strong>Status Thresholds:</strong> <strong>Online</strong> = active within 3 minutes (&lt;180s); <strong>Needs attention</strong> = stale telemetry (3 to 15 minutes); <strong>Offline</strong> = inactive &gt;15 minutes. Device tokens are stored securely as salted SHA-256 hashes and are never exposed to the frontend.
            </p>
          </div>
        </section>}

        {/* Database Explorer View (Admin Only) */}
        {page === 'Database explorer' && user.role === 'Admin' && (
          <DatabaseExplorer
            sessionToken={sessionToken}
            onAuthenticate={() => authenticateUserSession(user)}
          />
        )}

        {/* Users View */}
        {page === 'Users' && user.role === 'Admin' && <section>
          <PageHeading eyebrow="ACCESS MANAGEMENT" title="Users & roles" subtitle="Manage accounts, permissions and farm assignments." action={<button className="btn btn-primary" onClick={()=>openForm('user')}><Plus size={16}/> Add user</button>}/>
          <div className="toolbar">
            <div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search users or roles..."/></div>
            <span className="result-count">{store.users.length} accounts</span>
          </div>
          <div className="panel users-table">
            <div className="table-head user-row"><span>USER</span><span>ROLE</span><span>ASSIGNED FARMS</span><span>STATUS</span><span>ACTIONS</span></div>
            {store.users.filter(u=>(u.name+' '+u.role).toLowerCase().includes(query.toLowerCase())).map(u => (
              <div className="user-row" key={u.id}>
                <div className="device-name">
                  <span className="avatar">{u.initials||initials(u.name)}</span>
                  <div><strong>{u.name}</strong><small>{u.description}</small></div>
                </div>
                <span><span className="role-pill">{u.role}</span></span>
                <span>{u.farmIds.map(id=>currentFarm(id)).join(', ')||'None assigned'}</span>
                <span><StatusBadge status={u.active?'Active':'Inactive'}/></span>
                <div className="table-actions">
                  <IconButton label="Edit user" onClick={()=>openForm('user',u.id)}><Pencil size={15}/></IconButton>
                  <IconButton label={u.active?'Deactivate user':'Activate user'} onClick={()=>{if(u.id===user.id){notify('You cannot deactivate your current account');return}patchStore({users:store.users.map(x=>x.id===u.id?{...x,active:!x.active}:x)});notify(u.active?'Account deactivated':'Account activated')}}><ShieldCheck size={15}/></IconButton>
                </div>
              </div>
            ))}
          </div>
        </section>}

        {/* Profile View */}
        {page === 'Profile' && <section>
          <PageHeading eyebrow="YOUR ACCOUNT" title="Profile & preferences" subtitle="Manage your account preferences and view your assignments."/>
          <div className="profile-grid">
            <div className="panel profile-card">
              <div className="profile-cover"><Sprout size={36}/></div>
              <div className="profile-info">
                <span className="avatar profile-avatar">{user.initials||initials(user.name)}</span>
                <h2>{user.name}</h2>
                <span className="role-pill">{roleLabels[user.role]}</span>
                <p>{user.description}</p>
                <div className="profile-fact"><span>Assigned farms</span><strong>{visibleFarms.length}</strong></div>
                <div className="profile-fact"><span>Active session</span><strong>{sessionToken ? 'Authenticated' : 'Local'}</strong></div>
                <button className="btn btn-outline full-width" onClick={logout}><LogOut size={16}/> Log out</button>
              </div>
            </div>
            <div className="panel preferences">
              <div className="panel-heading"><div><h2>Preferences</h2><p>Changes are saved in this browser.</p></div><Settings size={18}/></div>
              <div className="preference-row">
                <div><strong>Display name</strong><p>Change the name shown in the current session.</p></div>
                <input className="preference-input" value={profileName || user.name} onChange={e=>setProfileName(e.target.value)}/>
              </div>
              <div className="preference-row">
                <div><strong>Notifications</strong><p>Show in-app notification badges and alerts.</p></div>
                <button className={`toggle ${store.profile.notifications?'on':''}`} onClick={()=>patchStore({profile:{...store.profile,notifications:!store.profile.notifications}})} aria-label="Toggle notifications"><span/></button>
              </div>
              <div className="preference-row">
                <div><strong>Units</strong><p>Sensor unit presentation (Metric authoritative).</p></div>
                <select value={store.profile.units} onChange={e=>patchStore({profile:{...store.profile,units:e.target.value}})}>
                  <option>Metric</option>
                  <option>Imperial</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={()=>{if(!profileName.trim()){notify('Name cannot be empty');return}patchStore({users:store.users.map(u=>u.id===user.id?{...u,name:profileName.trim(),initials:initials(profileName.trim())}:u)});setProfileName('');notify('Profile updated')}}>Save profile changes</button>
            </div>
          </div>
        </section>}

        {/* Settings View */}
        {page === 'Settings' && user.role === 'Admin' && <section>
          <PageHeading eyebrow="PLATFORM CONFIGURATION" title="Settings" subtitle="Manage configuration, view database engine, and reset sample workspace."/>
          <div className="settings-grid">
            <div className="panel">
              <div className="panel-heading"><div><h2>Workspace & Backend</h2><p>System configuration status</p></div><Settings size={19}/></div>
              <div className="setting-item"><span>Current mode</span><strong>{mode === 'live' ? 'Live Telemetry Ingestion' : 'Demo Simulation'}</strong></div>
              <div className="setting-item"><span>Database engine</span><StatusBadge status={dbEngine}/></div>
              <div className="setting-item"><span>Session security</span><StatusBadge status="HMAC-SHA256 Token"/></div>
              <div className="setting-item"><span>Hardware ingestion</span><StatusBadge status={mode === 'live' ? 'Listening on /api/v1' : 'Simulated'}/></div>
              <button className="btn btn-outline" onClick={()=>{const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='greenfield-data.json';a.click();URL.revokeObjectURL(url);notify('Data export downloaded')}}><Download size={16}/> Export data</button>
            </div>
            <div className="panel danger-panel">
              <div className="panel-heading"><div><h2>Reset demo workspace</h2><p>Restore initial sample records.</p></div><RefreshCw size={19}/></div>
              <p>Restores initial demo records without deleting ingested database readings in database storage.</p>
              <button className="btn btn-danger" onClick={() => setModal('reset')}>Reset demo workspace</button>
            </div>
          </div>
        </section>}

        {/* Footer */}
        <footer className="app-footer">
          <span>© 2026 SmartFarm · Smart Precision Farming</span>
          <span>
            <span className="footer-dot" style={{background: mode === 'live' ? '#2ca459' : '#e0933e'}}/>
            {mode === 'live' ? `Live Mode · Connected to ${dbEngine}` : 'Demo Mode · Simulated data'}
          </span>
        </footer>
      </div>
    </main>

    {/* Modals */}
    {modal && modal !== 'reset' && <Modal title={`${editId?'Edit':'Add'} ${modal==='farm'?'farm':modal==='crop'?'crop':modal==='device'?(user.role==='Technician'?'maintenance record':'device'):'user'}`} close={()=>{setModal(null);setEditId(null);setForm({})}}>
      {modal==='farm' && <form className="modal-form" onSubmit={e=>{e.preventDefault();const item:Farm={id:editId||'f-'+Date.now(),name:form.name?.trim()||'',location:form.location?.trim()||'',ownerId:form.ownerId||user.id,area:Number(form.area),soil:form.soil||'Loamy soil',fields:Number(form.fields),crop:form.crop||'Tomato',status:form.status||'Healthy'};if(!item.name||!item.location||item.area<=0||item.fields<1){notify('Enter a valid name, location, area and field count');return}upsert('farms',item)}}><Field label="Farm name"><input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Sunrise Farm"/></Field><Field label="Location"><input required value={form.location||''} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Village, district, state"/></Field><div className="form-two"><Field label="Area (hectares)"><input required type="number" min="0.1" step="0.1" value={form.area||''} onChange={e=>setForm({...form,area:e.target.value})}/></Field><Field label="Number of fields"><input required type="number" min="1" value={form.fields||''} onChange={e=>setForm({...form,fields:e.target.value})}/></Field></div><Field label="Soil type"><select value={form.soil||'Black cotton soil'} onChange={e=>setForm({...form,soil:e.target.value})}><option>Black cotton soil</option><option>Red loamy soil</option><option>Alluvial soil</option><option>Laterite soil</option><option>Loamy soil</option></select></Field><Field label="Primary crop"><select value={form.crop||'Tomato'} onChange={e=>setForm({...form,crop:e.target.value})}>{['Tomato','Onion','Soybean','Sugarcane','Cotton','Wheat'].map(c=><option key={c}>{c}</option>)}</select></Field>{user.role==='Admin'&&<Field label="Farm owner"><select value={form.ownerId||'u-pushkar'} onChange={e=>setForm({...form,ownerId:e.target.value})}>{store.users.filter(u=>u.role==='Farmer').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>}<ModalActions cancel={()=>setModal(null)} submit={editId?'Save changes':'Add farm'}/></form>}
      {modal==='crop' && <form className="modal-form" onSubmit={e=>{e.preventDefault();const item:Crop={id:editId||'c-'+Date.now(),name:form.name||'Tomato',emoji:form.emoji||'🌱',stage:form.stage||'Vegetative',farmId:form.farmId||visibleFarmIds[0]||'f1',moistureMin:Number(form.moistureMin),moistureMax:Number(form.moistureMax),phMin:Number(form.phMin),phMax:Number(form.phMax),note:form.note||''};if(!item.name||item.moistureMin<0||item.moistureMax>100||item.moistureMin>=item.moistureMax||item.phMin>=item.phMax){notify('Check crop name and valid target ranges');return}upsert('crops',item)}}><Field label="Crop name"><select value={form.name||'Tomato'} onChange={e=>setForm({...form,name:e.target.value,emoji:({'Tomato':'🍅','Onion':'🧅','Soybean':'🌱','Sugarcane':'🎋','Cotton':'☁️','Wheat':'🌾'} as Record<string,string>)[e.target.value]})}>{['Tomato','Onion','Soybean','Sugarcane','Cotton','Wheat'].map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Assigned farm"><select value={form.farmId||visibleFarmIds[0]||''} onChange={e=>setForm({...form,farmId:e.target.value})}>{visibleFarms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></Field><Field label="Growth stage"><select value={form.stage||'Vegetative'} onChange={e=>setForm({...form,stage:e.target.value})}>{['Seedling','Vegetative','Flowering','Fruiting','Bulb development','Boll formation','Harvest ready'].map(c=><option key={c}>{c}</option>)}</select></Field><div className="form-two"><Field label="Moisture minimum (%)"><input type="number" min="0" max="99" required value={form.moistureMin??'35'} onChange={e=>setForm({...form,moistureMin:e.target.value})}/></Field><Field label="Moisture maximum (%)"><input type="number" min="1" max="100" required value={form.moistureMax??'65'} onChange={e=>setForm({...form,moistureMax:e.target.value})}/></Field></div><div className="form-two"><Field label="pH minimum"><input type="number" min="0" max="13.9" step=".1" required value={form.phMin??'5.5'} onChange={e=>setForm({...form,phMin:e.target.value})}/></Field><Field label="pH maximum"><input type="number" min=".1" max="14" step=".1" required value={form.phMax??'7'} onChange={e=>setForm({...form,phMax:e.target.value})}/></Field></div><Field label="Recommendation note"><textarea value={form.note||''} onChange={e=>setForm({...form,note:e.target.value})} rows={3}/></Field><ModalActions cancel={()=>setModal(null)} submit={editId?'Save changes':'Add crop'}/></form>}
      {modal==='device' && user.role==='Technician' ? <form className="modal-form" onSubmit={e=>{e.preventDefault();const id=editId||'';setStore(prev=>({...prev,devices:prev.devices.map(d=>d.id===id?{...d,status:(form.status as Device['status'])||d.status,notes:form.notes||'',lastSeen:'Just now'}:d)}));setModal(null);notify('Maintenance record saved')}}><p className="muted-text">Update the service status and record the work performed.</p><Field label="Device status"><select value={form.status||'Maintenance'} onChange={e=>setForm({...form,status:e.target.value})}><option>Online</option><option>Offline</option><option>Needs attention</option><option>Maintenance</option></select></Field><Field label="Maintenance notes"><textarea rows={4} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Inspection findings, repair details..."/></Field><ModalActions cancel={()=>setModal(null)} submit="Save maintenance record"/></form> : modal==='device' && <form className="modal-form" onSubmit={async e=>{
        e.preventDefault();
        const item:Device={id:editId||form.id||'ESP32-'+Date.now(),name:form.name||'',farmId:form.farmId||visibleFarmIds[0]||'f1',kind:form.kind||'ESP32 + sensor',status:(form.status as Device['status'])||'Online',battery:Number(form.battery||100),lastSeen:form.lastSeen||'Just now',notes:form.notes||''};
        if(!item.name||!item.id||item.battery<0||item.battery>100){notify('Enter a valid device ID, name and battery value');return}
        
        // If registering a new device in live or production database as Admin:
        if (!editId && user.role === 'Admin') {
          let token = sessionToken;
          if (!token && user) token = await authenticateUserSession(user);
          if (token) {
            try {
              const res = await fetch('/api/devices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: item.id, name: item.name, farmId: item.farmId, hardwareType: item.kind })
              });
              if (res.ok) {
                const resJson = await res.json() as { deviceToken?: string };
                if (resJson.deviceToken) {
                  setTokenModal({ deviceId: item.id, token: resJson.deviceToken });
                }
              }
            } catch { /* proceed with store update */ }
          }
        }
        upsert('devices',item);
      }}><Field label="Device ID"><input required disabled={!!editId} value={form.id||''} onChange={e=>setForm({...form,id:e.target.value})} placeholder="ESP32-PN-005"/></Field><Field label="Device name"><input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Soil Sensor Node"/></Field><Field label="Assigned farm"><select value={form.farmId||visibleFarmIds[0]||''} onChange={e=>setForm({...form,farmId:e.target.value})}>{visibleFarms.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></Field><Field label="Device type"><select value={form.kind||'ESP32 + soil probe'} onChange={e=>setForm({...form,kind:e.target.value})}><option>ESP32 + SHT40 + Modbus + Rain</option><option>ESP32 + soil probe</option><option>Temp / humidity</option><option>Multi-sensor</option><option>Weather station</option></select></Field><div className="form-two"><Field label="Status"><select value={form.status||'Online'} onChange={e=>setForm({...form,status:e.target.value})}><option>Online</option><option>Needs attention</option><option>Offline</option><option>Maintenance</option></select></Field><Field label="Battery (%)"><input type="number" min="0" max="100" value={form.battery||'100'} onChange={e=>setForm({...form,battery:e.target.value})}/></Field></div><ModalActions cancel={()=>setModal(null)} submit={editId?'Save changes':'Register device'}/></form>}
      {modal==='user' && <form className="modal-form" onSubmit={e=>{e.preventDefault();const name=form.name?.trim()||'';const role=(form.role||'Farmer') as Role;const item:User={id:editId||'u-'+Date.now(),name,role,description:form.description||roleLabels[role],farmIds:form.farmIds?form.farmIds.split(',').map(x=>x.trim()).filter(Boolean):[],active:form.active!=='false',initials:initials(name)};if(!name){notify('Name is required');return}upsert('users',item)}}><Field label="Full name"><input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Farmer name"/></Field><Field label="Role"><select value={form.role||'Farmer'} onChange={e=>setForm({...form,role:e.target.value})}>{(['Admin','Farmer','Partner','Technician'] as Role[]).map(r=><option key={r}>{r}</option>)}</select></Field><Field label="Account description"><input value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Purpose of this account"/></Field><Field label="Assigned farm IDs (comma separated)"><input value={form.farmIds||''} onChange={e=>setForm({...form,farmIds:e.target.value})} placeholder="f1, f2"/></Field><Field label="Status"><select value={form.active||'true'} onChange={e=>setForm({...form,active:e.target.value})}><option value="true">Active</option><option value="false">Inactive</option></select></Field><ModalActions cancel={()=>setModal(null)} submit={editId?'Save changes':'Create account'}/></form>}
    </Modal>}
    {modal==='reset' && <Modal title="Reset demo data?" close={()=>setModal(null)}><div className="reset-content"><div className="reset-icon"><RefreshCw size={22}/></div><p>This restores the original demo users, farms, crops, devices, alerts, thresholds and preferences. Your local edits will be lost.</p><div className="modal-actions"><button className="btn btn-light" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-danger" onClick={resetData}>Reset demo data</button></div></div></Modal>}

    {/* Revocable Device Token Modal */}
    {tokenModal && (
      <Modal title={`Device Token: ${tokenModal.deviceId}`} close={() => setTokenModal(null)}>
        <div style={{ display: 'grid', gap: '14px' }}>
          <div className="note-box" style={{ background: '#edf7ee', borderColor: '#cce8d0', color: '#1e4c2b' }}>
            <ShieldCheck size={22} style={{ flex: 'none', color: '#2ca459' }} />
            <div>
              <strong>Revocable Hardware Bearer Token Generated</strong>
              <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#386043' }}>
                Copy this token now. For security, it is stored as a SHA-256 hash and cannot be retrieved again.
              </p>
            </div>
          </div>

          <Field label="Device Token (Header: X-Device-Token)">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                readOnly
                value={tokenModal.token}
                style={{ fontFamily: 'monospace', fontWeight: 600, background: '#f5f7f4' }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(tokenModal.token);
                  setTokenCopied(true);
                  setTimeout(() => setTokenCopied(false), 2500);
                }}
              >
                {tokenCopied ? <Check size={14} /> : <Copy size={14} />} {tokenCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </Field>

          <div style={{ background: '#f8faf6', padding: '12px 14px', borderRadius: '8px', fontSize: '11px', color: '#495a4c', border: '1px solid #e5ebe2' }}>
            <strong>ESP32 Firmware Configuration:</strong>
            <p style={{ margin: '5px 0 0', lineHeight: 1.6 }}>
              1. In <code>firmware/esp32_smartfarm/config.h</code>, paste this token:<br />
              <code>#define DEVICE_TOKEN "{tokenModal.token}"</code><br />
              2. Ensure <code>#define DEVICE_ID "{tokenModal.deviceId}"</code><br />
              3. Set your local Wi-Fi credentials in <code>config.h</code> and re-flash the ESP32.
            </p>
          </div>

          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => setTokenModal(null)}>Done</button>
          </div>
        </div>
      </Modal>
    )}
    {toast && <div className="toast"><CheckCircle2 size={18}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss notification"><X size={15}/></button></div>}
  </div>
}

function Login({ users, onLogin }: { users: User[]; onLogin: (user:User)=>void }) {
  const [selected,setSelected]=useState('u-pushkar')
  const activeUsers=users.filter(u=>u.active)
  return <div className="login-screen"><div className="login-left"><div className="login-brand"><div className="brand-mark"><Sprout size={25}/></div><div><strong>SmartFarm</strong><small>SMART PRECISION FARMING</small></div></div><div className="login-hero"><span className="hero-pill"><span/> SMART AGRICULTURE PLATFORM</span><h1>Farm smarter.<br/><em>Grow better.</em></h1><p>Bring your farm data together, understand field conditions and make more informed decisions.</p><div className="hero-metrics"><div><strong>24/7</strong><span>Monitoring concept</span></div><div><strong>IoT</strong><span>Ready architecture</span></div><div><strong>One view</strong><span>Farm insights</span></div></div></div><div className="login-landscape"><div className="sun"/><div className="hill hill-one"/><div className="hill hill-two"/><div className="field-lines"/></div><p className="login-footnote">A student project prototype · Sample data only</p></div><div className="login-right"><div className="login-form-wrap"><div className="login-mobile-brand"><div className="brand-mark"><Sprout size={22}/></div><strong>GreenField</strong></div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your workspace</h2><p className="login-sub">Choose a demo account to explore role-specific features.</p><div className="demo-accounts">{activeUsers.map(u=><button key={u.id} className={`account-option ${selected===u.id?'account-selected':''}`} onClick={()=>setSelected(u.id)}><span className={`avatar role-${u.role.toLowerCase()}`}>{u.initials||initials(u.name)}</span><span className="account-copy"><strong>{u.name}</strong><small>{roleLabels[u.role]}</small></span>{selected===u.id?<span className="radio-selected"><Check size={13}/></span>:<span className="radio-empty"/>}</button>)}</div><button className="btn btn-primary login-submit" onClick={()=>{const u=activeUsers.find(x=>x.id===selected);if(u)onLogin(u)}}>Continue as demo <ChevronRight size={17}/></button><div className="demo-disclaimer"><ShieldCheck size={16}/><span><strong>Demo access</strong><br/>Password SmartFarmPassword2026! automatically verified.</span></div><p className="login-legal">By continuing, you enter the SmartFarm environment.</p></div><div className="login-right-footer"><span>© 2026 GreenField</span><span><CircleHelp size={13}/> Help & support</span></div></div></div>
}

function PageHeading({ eyebrow,title,subtitle,action }: {eyebrow:string;title:string;subtitle:string;action?:ReactNode}) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subheading">{subtitle}</p></div>{action}</div>
}
function StatCard({label,value,detail,icon:Icon,tint,trend}:{label:string;value:string|number;detail:string;icon:typeof Sprout;tint:string;trend?:string}) {
  return <article className="stat-card"><div className={`stat-icon ${tint}`}><Icon size={20}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-detail">{detail}</span>{trend&&<span className="stat-trend"><span/> {trend}</span>}</article>
}
function Condition({icon:Icon,label,value,sub,color}:{icon:typeof Sprout;label:string;value:string;sub:string;color:string}) {
  return <div className="condition"><span className={`condition-icon ${color}`}><Icon size={17}/></span><span className="condition-label">{label}</span><strong>{value}</strong><small>{sub}</small></div>
}
function StatusBadge({status}:{status:string}) {
  const s=status.toLowerCase()
  const tone=['active','critical','offline','warning','needs attention','inactive'].includes(s)?(s==='active'&&status==='Active'?'red':s==='critical'?'red':s==='offline'?'red':s==='inactive'?'gray':'amber'):['resolved','healthy','online'].includes(s)?'green':['acknowledged','maintenance'].includes(s)?'blue':'gray'
  return <span className={`status-badge ${tone}`}><i/>{status}</span>
}
function SummaryCard({label,value,color}:{label:string;value:number;color:string}) {
  return <div className={`summary-card ${color}`}><span>{label}</span><strong>{value}</strong></div>
}
function EmptyState({text}:{text:string}) { return <div className="empty-state"><Sprout size={25}/><p>{text}</p></div> }
function ModalActions({cancel,submit}:{cancel:()=>void;submit:string}) { return <div className="modal-actions"><button type="button" className="btn btn-light" onClick={cancel}>Cancel</button><button type="submit" className="btn btn-primary">{submit}</button></div> }

function LineChart({values,labels,color,min,max}:{values:number[];labels:string[];color:string;min:number;max:number}) {
  const w=640,h=190,pad=24
  if (values.length === 0) {
    return <div style={{height: h, display:'grid', placeItems:'center', color:'var(--muted)'}}>No points to graph</div>;
  }
  const points=values.map((v,i)=>`${pad+i*(w-pad*2)/Math.max(1,values.length-1)},${h-pad-((v-min)/Math.max(1,max-min))*(h-pad*2)}`).join(' ')
  const area=`${pad},${h-pad} ${points} ${w-pad},${h-pad}`
  return <div className="chart-svg-wrap"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Sensor readings line chart"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{[0,1,2,3].map(i=><g key={i}><line x1={pad} x2={w-pad} y1={pad+i*(h-pad*2)/3} y2={pad+i*(h-pad*2)/3} stroke="var(--line)" strokeDasharray="3 4"/><text x="0" y={pad+i*(h-pad*2)/3+4} fill="var(--muted)" fontSize="10">{Math.round(max-i*(max-min)/3)}</text></g>)}<polygon points={area} fill="url(#chart-fill)"/><polyline points={points} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/>{values.map((v,i)=>{const x=pad+i*(w-pad*2)/Math.max(1,values.length-1);const y=h-pad-((v-min)/Math.max(1,max-min))*(h-pad*2);return <circle key={i} cx={x} cy={y} r={values.length<25?3:1.7} fill={color}><title>{labels[i]}: {v}</title></circle>})}<text x={pad} y={h-3} fill="var(--muted)" fontSize="10">{labels[0] || ''}</text><text x={w/2} y={h-3} textAnchor="middle" fill="var(--muted)" fontSize="10">{labels[Math.floor(labels.length/2)] || ''}</text><text x={w-pad} y={h-3} textAnchor="end" fill="var(--muted)" fontSize="10">{labels[labels.length-1] || ''}</text></svg></div>
}
