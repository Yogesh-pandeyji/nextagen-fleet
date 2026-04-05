import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'

const EMPTY = { from_location:'', to_location:'', vehicle_registration:'', driver_name:'', start_date:'', freight_amount:'', distance_km:'', client_name:'' }

export default function TripsScreen() {
  const { trips, createTrip, vehicles, drivers } = useStore()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const navigate = useNavigate()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = async e => { e.preventDefault(); await createTrip(form); setForm(EMPTY); setShow(false) }
  const statusColor = { Completed:'text-green-600 bg-green-50', 'In Transit':'text-blue-600 bg-blue-50', Scheduled:'text-yellow-600 bg-yellow-50', Cancelled:'text-red-500 bg-red-50' }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-xl font-bold text-gray-800">Trips</h1><p className="text-sm text-gray-500">{trips.length} trips total</p></div>
      <button onClick={()=>setShow(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}><Plus size={16}/> New Trip</button></div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {trips.length===0&&<div className="p-12 text-center text-gray-400 text-sm">No trips yet.</div>}
      <div className="divide-y divide-gray-50">{trips.map(t=>(<div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={()=>navigate('/trips/'+t.id)}><div><div className="text-sm font-semibold text-gray-800">{t.trip_number}</div><div className="text-xs text-gray-500">{t.from_location} → {t.to_location} · {t.client_name}</div></div><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[t.status]||'text-gray-500 bg-gray-100'}`}>{t.status}</span></div>))}</div>
    </div>
    {show&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-4"><h2 className="font-bold">New Trip</h2><button onClick={()=>setShow(false)}><X size={18} className="text-gray-400"/></button></div>
      <form onSubmit={submit} className="space-y-3">{[['From','from_location','text'],['To','to_location','text'],['Client','client_name','text'],['Freight (₹)','freight_amount','number'],['Distance (km)','distance_km','number'],['Start Date','start_date','date']].map(([label,key,type])=>(<div key={key}><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/></div>))}
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label><select value={form.vehicle_registration} onChange={e=>set('vehicle_registration',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">Select vehicle</option>{vehicles.map(v=><option key={v.id} value={v.registration_no}>{v.registration_no}</option>)}</select></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Driver</label><select value={form.driver_name} onChange={e=>set('driver_name',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">Select driver</option>{drivers.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
      <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShow(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>Create Trip</button></div></form></div></div>)}
  </div>)
}
