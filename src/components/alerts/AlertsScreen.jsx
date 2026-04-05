import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function AlertsScreen() {
  const { vehicles } = useStore()
  const today = new Date()
  const alerts = []
  vehicles.forEach(v=>{
    if(v.fitness_expiry&&new Date(v.fitness_expiry)<today) alerts.push({type:'error',msg:`${v.registration_no}: Fitness certificate expired`,date:v.fitness_expiry})
    if(v.insurance_expiry&&new Date(v.insurance_expiry)<today) alerts.push({type:'error',msg:`${v.registration_no}: Insurance expired`,date:v.insurance_expiry})
    if(v.fitness_expiry){const days=Math.ceil((new Date(v.fitness_expiry)-today)/(1000*86400));if(days>0&&days<=30) alerts.push({type:'warning',msg:`${v.registration_no}: Fitness expires in ${days} days`,date:v.fitness_expiry})}
  })
  const bg={error:'border-red-100 bg-red-50',warning:'border-yellow-100 bg-yellow-50'}
  return (<div className="p-6"><h1 className="text-xl font-bold text-gray-800 mb-1">Alerts</h1><p className="text-sm text-gray-500 mb-6">{alerts.length} active alerts</p>
    <div className="space-y-2">
      {alerts.length===0&&(<div className="bg-white rounded-xl border p-12 text-center"><CheckCircle size={32} className="mx-auto mb-3 text-green-400"/><p className="text-gray-400 text-sm">All clear!</p></div>)}
      {alerts.map((a,i)=>(<div key={i} className={`rounded-xl border p-4 flex items-start gap-3 ${bg[a.type]}`}><AlertTriangle size={16} className={a.type==='error'?'text-red-500':'text-yellow-500'}/><div><div className="text-sm font-medium text-gray-800">{a.msg}</div>{a.date&&<div className="text-xs text-gray-400 mt-0.5">{a.date}</div>}</div></div>))}
    </div></div>)
}
