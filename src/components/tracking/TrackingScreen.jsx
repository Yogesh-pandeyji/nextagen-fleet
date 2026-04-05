import { MapPin, Truck } from 'lucide-react'
import { useStore } from '../../store/useStore'
export default function TrackingScreen() {
  const { trips } = useStore()
  const active = trips.filter(t=>t.status==='In Transit')
  return (<div className="p-6"><h1 className="text-xl font-bold text-gray-800 mb-1">Live Tracking</h1><p className="text-sm text-gray-500 mb-6">{active.length} vehicles in transit</p>
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-6 text-center" style={{minHeight:320}}><MapPin size={40} className="mx-auto mb-3 text-gray-300"/><p className="text-gray-400 text-sm font-medium">Live GPS Map</p><p className="text-gray-300 text-xs mt-1">Integrate with Google Maps or Leaflet + GPS provider</p></div>
    <div className="space-y-2">{active.length===0&&<div className="text-center text-gray-400 text-sm py-4">No vehicles in transit.</div>}{active.map(t=>(<div key={t.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"><div className="p-2 rounded-lg" style={{background:'#2E607315'}}><Truck size={18} style={{color:'#2E6073'}}/></div><div className="flex-1"><div className="text-sm font-semibold text-gray-800">{t.vehicle_registration}</div><div className="text-xs text-gray-500">{t.from_location} → {t.to_location}</div></div><div className="flex items-center gap-1 text-xs text-green-600 font-medium"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live</div></div>))}</div>
  </div>)
}
