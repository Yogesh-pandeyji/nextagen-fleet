import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function InvoicesScreen() {
  const { invoices, trips, createInvoice } = useStore()
  const [show, setShow] = useState(false)
  const [tripId, setTripId] = useState('')
  const [gst, setGst] = useState(18)
  const completedTrips = trips.filter(t=>t.status==='Completed'&&!t.invoice_raised)
  const submit = async e => { e.preventDefault(); const trip=trips.find(t=>t.id===tripId); if(!trip)return; const base=trip.freight_amount||0; const tax=base*gst/100; await createInvoice(tripId,{base_amount:base,cgst_amount:tax/2,sgst_amount:tax/2,total_amount:base+tax,gst_rate:gst,status:'Pending'}); setShow(false) }
  return (<div className="p-6">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-xl font-bold text-gray-800">GST Invoices</h1><p className="text-sm text-gray-500">{invoices.length} invoices</p></div>
      <button onClick={()=>setShow(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}><Plus size={16}/> Create Invoice</button></div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {invoices.length===0&&<div className="p-12 text-center text-gray-400 text-sm">No invoices yet.</div>}
      <div className="divide-y divide-gray-50">{invoices.map(inv=>(<div key={inv.id} className="p-4 flex items-center justify-between"><div><div className="text-sm font-semibold text-gray-800">{inv.invoice_number}</div><div className="text-xs text-gray-500">Total: ₹{Number(inv.total_amount).toLocaleString('en-IN')} · GST {inv.gst_rate}%</div></div><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${inv.status==='Paid'?'text-green-600 bg-green-50':'text-yellow-600 bg-yellow-50'}`}>{inv.status}</span></div>))}</div>
    </div>
    {show&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"><div className="flex items-center justify-between mb-4"><h2 className="font-bold">Create Invoice</h2><button onClick={()=>setShow(false)}><X size={18} className="text-gray-400"/></button></div>
      <form onSubmit={submit} className="space-y-3"><div><label className="block text-xs font-medium text-gray-600 mb-1">Select Completed Trip</label><select value={tripId} onChange={e=>setTripId(e.target.value)} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value="">Choose trip...</option>{completedTrips.map(t=><option key={t.id} value={t.id}>{t.trip_number} · {t.client_name}</option>)}</select></div>
      <div><label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label><select value={gst} onChange={e=>setGst(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></div>
      <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShow(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" className="flex-1 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>Generate</button></div></form></div></div>)}
  </div>)
}
