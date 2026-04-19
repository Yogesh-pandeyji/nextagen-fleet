import { useState, useEffect, useRef } from 'react'
import { MapPin, Truck, Plus, X, Satellite, RefreshCw } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function TrackingScreen() {
  const { trips, company } = useStore()
  const active = trips.filter(t => t.status === 'In Transit')
  const mapRef = useRef(null)
  const leafletMapRef = useRef(null)
  const markersRef = useRef({})
  const [locations, setLocations] = useState([])
  const [devices, setDevices] = useState([])
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [deviceForm, setDeviceForm] = useState({ imei: '', model: 'ECOV01A', vehicle_registration: '' })
  const [saving, setSaving] = useState(false)

  // Load Leaflet from CDN
  useEffect(() => {
    if (window.L) { setMapReady(true); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setMapReady(true)
    document.head.appendChild(script)
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null }
    }
  }, [])

  // Init map once Leaflet is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || leafletMapRef.current) return
    const map = window.L.map(mapRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5)
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map)
    leafletMapRef.current = map
  }, [mapReady])

  // Load devices + latest locations
  useEffect(() => {
    if (!company?.id) return
    supabase.from('gps_devices').select('*').eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDevices(data) })
    loadLatestLocations()
  }, [company?.id])

  const loadLatestLocations = async () => {
    if (!company?.id) return
    const { data } = await supabase
      .from('device_locations')
      .select('*')
      .eq('company_id', company.id)
      .order('timestamp', { ascending: false })
      .limit(100)
    if (data) {
      const latest = {}
      data.forEach(loc => { if (!latest[loc.device_id]) latest[loc.device_id] = loc })
      setLocations(Object.values(latest))
    }
  }

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return
    const ch = supabase.channel('gps:' + company.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'device_locations',
        filter: `company_id=eq.${company.id}`
      }, ({ new: loc }) => {
        setLocations(prev => {
          const filtered = prev.filter(l => l.device_id !== loc.device_id)
          return [...filtered, loc]
        })
        placeMarker(loc)
      })
      .subscribe()
    return () => ch.unsubscribe()
  }, [company?.id])

  // Put markers on map when locations arrive
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return
    locations.forEach(loc => placeMarker(loc))
  }, [locations, mapReady])

  function placeMarker(loc) {
    if (!leafletMapRef.current || !window.L || !loc.lat || !loc.lng) return
    const L = window.L
    const label = loc.vehicle_registration || `Device-${loc.imei?.slice(-4)}`
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:#2E6073;color:#fff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.25);white-space:nowrap;border:2px solid #fff">&#x1F69B; ${label}</div>`,
      iconAnchor: [0, 0]
    })
    const popup = `<b>${label}</b><br>Speed: ${loc.speed || 0} km/h<br>Lat: ${loc.lat?.toFixed(5)}, Lng: ${loc.lng?.toFixed(5)}<br><span style="color:#888;font-size:11px">${new Date(loc.timestamp).toLocaleString('en-IN')}</span>`
    if (markersRef.current[loc.device_id]) {
      markersRef.current[loc.device_id].setLatLng([loc.lat, loc.lng]).setPopupContent(popup)
    } else {
      markersRef.current[loc.device_id] = L.marker([loc.lat, loc.lng], { icon })
        .addTo(leafletMapRef.current)
        .bindPopup(popup)
      if (Object.keys(markersRef.current).length === 1) {
        leafletMapRef.current.setView([loc.lat, loc.lng], 13)
      }
    }
  }

  const addDevice = async () => {
    if (!deviceForm.imei.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('gps_devices').insert({
      company_id: company?.id,
      imei: deviceForm.imei.trim(),
      model: deviceForm.model || 'ECOV01A',
      provider: 'Sensorise',
      vehicle_registration: deviceForm.vehicle_registration.trim(),
      status: 'Active'
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setDevices(prev => [data, ...prev])
      setDeviceForm({ imei: '', model: 'ECOV01A', vehicle_registration: '' })
      setShowAddDevice(false)
    } else if (error) {
      alert(error.message)
    }
  }

  const timeSince = (ts) => {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    return `${Math.floor(diff/3600)}h ago`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Live Tracking</h1>
          <p className="text-sm text-gray-500">
            {devices.length} GPS device{devices.length !== 1 ? 's' : ''} &middot; {locations.length} online &middot; {active.length} in transit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadLatestLocations} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Refresh">
            <RefreshCw size={15} className="text-gray-500"/>
          </button>
          <button onClick={() => setShowAddDevice(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{background:'#2E6073'}}>
            <Plus size={15}/> Add GPS Device
          </button>
        </div>
      </div>

      <div className="relative bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-5" style={{height:420, zIndex:0, isolation:'isolate'}}>
        <div ref={mapRef} style={{height:'100%', width:'100%'}} />
        {locations.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 pointer-events-none">
            <Satellite size={44} className="text-gray-300 mb-3"/>
            <p className="text-gray-500 text-sm font-medium">Waiting for GPS signal</p>
            <p className="text-gray-400 text-xs mt-1">ECOV01A &middot; IMEI: 862567078906500</p>
            <p className="text-gray-300 text-xs mt-0.5">Map will update automatically when device connects</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">GPS Devices</h2>
            <span className="text-xs text-gray-400">{devices.length} registered</span>
          </div>
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <MapPin size={28} className="mx-auto text-gray-200 mb-2"/>
              <p className="text-gray-400 text-sm">No devices yet</p>
              <button onClick={() => setShowAddDevice(true)} className="mt-2 text-xs font-medium" style={{color:'#2E6073'}}>+ Add your first device</button>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map(d => {
                const loc = locations.find(l => l.device_id === d.id)
                const isLive = loc && (Date.now() - new Date(loc.timestamp)) < 5 * 60 * 1000
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{d.model}
                        {d.vehicle_registration && <span className="ml-1.5 text-xs font-normal text-gray-500">&middot; {d.vehicle_registration}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">IMEI: {d.imei}</div>
                      {loc && <div className="text-xs text-gray-400">{loc.speed || 0} km/h &middot; {timeSince(loc.timestamp)}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLive
                        ? <><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/><span className="text-xs text-green-600 font-semibold">Live</span></>
                        : loc
                          ? <><span className="w-2 h-2 bg-yellow-400 rounded-full"/><span className="text-xs text-yellow-600">Idle</span></>
                          : <><span className="w-2 h-2 bg-gray-300 rounded-full"/><span className="text-xs text-gray-400">Offline</span></>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Vehicles In Transit</h2>
            <span className="text-xs text-gray-400">{active.length} active</span>
          </div>
          {active.length === 0 ? (
            <div className="text-center py-8">
              <Truck size={28} className="mx-auto text-gray-200 mb-2"/>
              <p className="text-gray-400 text-sm">No trips in transit</p>
            </div>
          ) : (
            <div className="space-y-2">
              {active.map(t => {
                const loc = locations.find(l => l.vehicle_registration === t.vehicle_registration)
                const isLive = loc && (Date.now() - new Date(loc.timestamp)) < 5 * 60 * 1000
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 rounded-lg shrink-0" style={{background:'#2E607315'}}>
                      <Truck size={15} style={{color:'#2E6073'}}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">{t.vehicle_registration || t.trip_number}</div>
                      <div className="text-xs text-gray-500 truncate">{t.from_location} &rarr; {t.to_location}</div>
                      {loc && <div className="text-xs text-gray-400">{loc.speed || 0} km/h &middot; {timeSince(loc.timestamp)}</div>}
                    </div>
                    {isLive
                      ? <div className="flex items-center gap-1 text-xs text-green-600 font-semibold shrink-0"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>Live</div>
                      : <div className="text-xs text-gray-400 shrink-0">No GPS</div>
                    }
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAddDevice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Register GPS Device</h2>
              <button onClick={() => setShowAddDevice(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Device IMEI <span className="text-red-400">*</span></label>
                <input value={deviceForm.imei}
                  onChange={e => setDeviceForm(f => ({...f, imei: e.target.value}))}
                  placeholder="862567078906500"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                <input value={deviceForm.model}
                  onChange={e => setDeviceForm(f => ({...f, model: e.target.value}))}
                  placeholder="ECOV01A"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Registration No.</label>
                <input value={deviceForm.vehicle_registration}
                  onChange={e => setDeviceForm(f => ({...f, vehicle_registration: e.target.value}))}
                  placeholder="e.g. MH12AB1234"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                <b>Provider:</b> Sensorise (M2M) &nbsp;&middot;&nbsp; <b>Protocol:</b> GT06
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAddDevice(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={addDevice} disabled={saving || !deviceForm.imei.trim()}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                  style={{background:'#2E6073'}}>
                  {saving ? 'Saving…' : 'Register Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
         }
