import { Wrench, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function MaintenanceScreen() {
  const { vehicles } = useStore()
  const today = new Date()
  const healthScore = v => { let s=100; if(v.fitness_expiry&&new Date(v.fitness_expiry)<today)s-=30; if(v.insurance_expiry&&new Date(v.insurance_expiry)<today)s-=30; if(v.year&&today.getFullYear()-v.year>10)s-=20; return Math.max(s,0) }
  const scoreColor = s => s>=75?'text-green-600':s>=50?'text-yellow-600':'text-red-500'
  const scoreBar = s => s>=75?'bg-green-500':s>=50?'bg-yellow-500':'bg-red-500'

  return (<div className="p-6"><h1 className="text-xl font-bold text-gray-800 mb-1">Predictive Maintenance</h1><p className="text-sm text-gray-500 mb-6">AI health scores</p>
    <div className="space-y-3">
      {vehicles.length===0&&<div className="bg-white rounded-xl border p-12 text-center text-gray-400 text-sm">Add vehicles to see health scores.</div>}
      {vehicles.map(v=>{ const score=healthScore(v); const fitnessExp=v.fitness_expiry&&new Date(v.fitness_expiry)<today; const insExp=v.insurance_expiry&&new Date(v.insurance_expiry)<today;
        return (<div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3"><Wrench size={16} style={{color:'#2E6073'}}/><div><div className="font-semibold text-sm text-gray-800">{v.registration_no}</div><div className="text-xs text-gray-400">{v.make} {v.model}</div></div></div><div className={`text-lg font-bold ${scoreColor(score)}`}>{score}%</div></div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3"><div className={`h-full rounded-full ${scoreBar(score)}`} style={{width:score+'%'}}></div></div>
          {(fitnessExp||insExp)&&<div className="space-y-1">{fitnessExp&&<div className="flex items-center gap-1.5 text-xs text-red-500"><AlertTriangle size={12}/> Fitness expired</div>}{insExp&&<div className="flex items-center gap-1.5 text-xs text-red-500"><AlertTriangle size={12}/> Insurance expired</div>}</div>}
        </div>)})}
    </div></div>)
}
