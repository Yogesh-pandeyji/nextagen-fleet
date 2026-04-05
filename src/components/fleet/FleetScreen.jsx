import { useState } from 'react'
import { Truck, Plus, X } from 'lucide-react'
import { useStore } from '../../store/useStore'

const EMPTY = { registration_no:'', make:'', model:'', year:'', fuel_type:'Diesel', capacity_ton:'', status:'Active', insurance_expiry:'', fitness_expiry:'' }

export default function FleetScreen() {
  const { vehicles, addVehicle } = useStore()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async (e) => { e.preventDefault(); await addVehicle(form); setForm(EMPTY); setShow(false) }
  const statusColor = { Active:'text-green-600 bg-green-50', 'In Transit':'text-blue-600 bg-blue-50', Maintenance:'text-orange-600 bg-orange-50', Inactive:'text-gray-500 bg-gray-100' }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold text-gray-800">Fleet</h1><p className="text-sm text-gray-500">{vehicles.length} vehicles registered</p></div>
        <button onClick={()=>setShow(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}><Plus size={16}/> Add Vehicle</button>
      </div>
      <div className="grid gap-3">
        {vehicles.length===0 && <div className="bg-white rounded-xl border p-12 text-center text-gray-400 text-sm">No vehicles yet.</div>}
        {vehicles.map(v=>(<div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4"><div className="p-3 rounded-xl" style={{background:'#2E607315'}}><Truck size={20} style={{color:'#2E6073'}}/></div>
            <div><div className="font-semibold text-gray-800">{v.registration_no}</div><div className="text-xs text-gray-500">{v.make} {v.model} · {v.year} · {v.capacity_ton}T</div></div></div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[v.status]||'text-gray-500 bg-gray-100'}`}>{v.status}</span>
        </div>))}
      </div>
      {show&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-800">Add Vehicle</h2><button onClick={()=>setShow(false)}><X size={18} className="text-gray-400"/></button></div>
        <form onSubmit={submit} className="space-y-3">{[['Registration No','registration_no','text'],['Make','make','text'],['Model','model','text'],['Year','year','number'],['Capacity (Ton)','capacity_ton','number'],['Insurance Expiry','insurance_expiry','date'],['Fitness Expiry','fitness_expiry','date']].map(([label,key,type])=>(<div key={key}><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/></div>))}
        <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShow(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button><button type="submit" className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>Add Vehicle</button></div></form></div></div>)}
    </div>)
}
