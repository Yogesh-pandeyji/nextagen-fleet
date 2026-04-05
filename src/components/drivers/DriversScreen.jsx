import { useState } from 'react'
import { Plus, X, Phone } from 'lucide-react'
import { useStore } from '../../store/useStore'

const EMPTY = { name:'', phone:'', license_no:'', license_expiry:'', salary_per_day:'', status:'Available', city:'' }

export default function DriversScreen() {
  const { drivers, addDriver } = useStore()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const submit = async e => { e.preventDefault(); await addDriver(form); setForm(EMPTY); setShow(false) }
  const statusColor = { Available:'text-green-600 bg-green-50', 'On Duty':'text-blue-600 bg-blue-50', 'Off Duty':'text-gray-500 bg-gray-100', Leave:'text-orange-600 bg-orange-50' }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-xl font-bold text-gray-800">Drivers</h1><p className="text-sm text-gray-500">{drivers.length} on roster</p></div>
      <button onClick={()=>setShow(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}><Plus size={16}/> Add Driver</button></div>
    <div className="grid gap-3">
      {drivers.length===0&&<div className="bg-white rounded-xl border p-12 text-center text-gray-400 text-sm">No drivers yet.</div>}
      {drivers.map(d=>(<div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{background:'#F07820'}}>{d.name?.[0]?.toUpperCase()||'D'}</div><div><div className="font-semibold text-gray-800">{d.name}</div><div className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10}/>{d.phone}</div></div></div><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[d.status]||'text-gray-500 bg-gray-100'}`}>{d.status}</span></div>))}
    </div>
    {show&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between mb-4"><h2 className="font-bold">Add Driver</h2><button onClick={()=>setShow(false)}><X size={18} className="text-gray-400"/></button></div>
      <form onSubmit={submit} className="space-y-3">{[['Full Name','name','text'],['Phone','phone','tel'],['License No','license_no','text'],['License Expiry','license_expiry','date'],['Daily Salary (₹)','salary_per_day','number'],['City','city','text']].map(([label,key,type])=>(<div key={key}><label className="block text-xs font-medium text-gray-600 mb-1">{label}</label><input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/></div>))}
      <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label><select value={form.status} onChange={e=>set('status',e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">{['Available','On Duty','Off Duty','Leave'].map(o=><option key={o}>{o}</option>)}</select></div>
      <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShow(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>Add Driver</button></div></form></div></div>)}
  </div>)
}
