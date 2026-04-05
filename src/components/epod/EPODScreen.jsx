import { useState, useRef } from 'react'
import { Check } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function EPODScreen() {
  const { trips, captureEPOD } = useStore()
  const pending = trips.filter(t=>t.status==='In Transit'&&!t.epod_captured)
  const [selected, setSelected] = useState(null)
  const [recipient, setRecipient] = useState('')
  const [signed, setSigned] = useState(false)
  const canvasRef = useRef()
  const [drawing, setDrawing] = useState(false)

  const startDraw = e => { setDrawing(true); const ctx=canvasRef.current.getContext('2d'); ctx.beginPath(); const r=canvasRef.current.getBoundingClientRect(); ctx.moveTo(e.clientX-r.left,e.clientY-r.top) }
  const draw = e => { if(!drawing)return; const ctx=canvasRef.current.getContext('2d'); const r=canvasRef.current.getBoundingClientRect(); ctx.lineTo(e.clientX-r.left,e.clientY-r.top); ctx.stroke(); setSigned(true) }
  const stopDraw = () => setDrawing(false)

  const handleCapture = async () => {
    if(!selected||!recipient||!signed)return
    await captureEPOD(selected.id,{recipient,signatureUrl:canvasRef.current.toDataURL()})
    setSelected(null);setRecipient('');setSigned(false)
    canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width,canvasRef.current.height)
  }

  return (<div className="p-6"><h1 className="text-xl font-bold text-gray-800 mb-1">ePOD — Proof of Delivery</h1><p className="text-sm text-gray-500 mb-6">{pending.length} trips awaiting ePOD</p>
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-2">
        {pending.length===0&&<div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">No pending deliveries.</div>}
        {pending.map(t=>(<div key={t.id} onClick={()=>setSelected(t)} className={`bg-white rounded-xl border p-4 cursor-pointer ${selected?.id===t.id?'border-teal-500':'border-gray-100'}`}><div className="font-semibold text-sm">{t.trip_number}</div><div className="text-xs text-gray-500">{t.from_location} → {t.to_location}</div></div>))}
        {trips.filter(t=>t.epod_captured).map(t=>(<div key={t.id} className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3"><Check size={16} className="text-green-600"/><div><div className="font-semibold text-sm">{t.trip_number}</div><div className="text-xs text-gray-500">ePOD captured</div></div></div>))}
      </div>
      {selected&&(<div className="bg-white rounded-xl border border-gray-100 p-5"><h2 className="font-bold text-gray-800 mb-4">Capture ePOD — {selected.trip_number}</h2>
        <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">Recipient Name</label><input value={recipient} onChange={e=>setRecipient(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"/></div>
        <canvas ref={canvasRef} width={350} height={120} className="border-2 border-dashed border-gray-300 rounded-lg w-full cursor-crosshair" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}/>
        <button onClick={handleCapture} disabled={!recipient||!signed} className="w-full mt-3 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{background:'#2E6073'}}>Confirm Delivery</button>
      </div>)}
    </div></div>)
}
