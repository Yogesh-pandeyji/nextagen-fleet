import { Truck, Users, Route, TrendingUp, IndianRupee, Clock } from 'lucide-react'
import { useStore } from '../../store/useStore'

const Card = ({icon:Icon,label,value,sub,color}) => (<div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><div className="flex items-center justify-between mb-3"><span className="text-sm text-gray-500">{label}</span><div className="p-2 rounded-lg" style={{background:color+'20'}}><Icon size={18} style={{color}}/></div></div><div className="text-2xl font-bold text-gray-800">{value}</div>{sub&&<div className="text-xs text-gray-400 mt-1">{sub}</div>}</div>)

export default function Dashboard() {
  const { vehicles, drivers, trips, getAnalytics, company } = useStore()
  const a = getAnalytics()
  const fmt = n => '₹'+Number(n).toLocaleString('en-IN')
  const statusColor = {Completed:'text-green-600','In Transit':'text-blue-600',Scheduled:'text-yellow-600',Cancelled:'text-red-500'}
  return (<div className="p-6">
    <div className="mb-6"><h1 className="text-xl font-bold text-gray-800">Dashboard</h1><p className="text-sm text-gray-500">{company?.name} — Fleet Overview</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card icon={Truck} label="Vehicles" value={a.totalVehicles} sub={`${vehicles.filter(v=>v.status==='Active').length} active`} color="#2E6073"/>
      <Card icon={Users} label="Drivers" value={a.activeDrivers} sub={`of ${drivers.length}`} color="#F07820"/>
      <Card icon={Route} label="Active Trips" value={a.activeTrips} sub={`${a.totalTrips} total`} color="#6366f1"/>
      <Card icon={TrendingUp} label="Profit Margin" value={a.profitMargin+'%'} sub="completed" color="#10b981"/>
    </div>
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[['Revenue',fmt(a.totalRevenue),'#2E6073'],['Expenses',fmt(a.totalExpenses),'#ef4444'],['Net Profit',fmt(a.totalProfit),'#10b981']].map(([l,v,c])=>(<div key={l} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100"><div className="flex items-center gap-2 mb-1"><IndianRupee size={14} style={{color:c}}/><span className="text-sm text-gray-500">{l}</span></div><div className="text-xl font-bold text-gray-800">{v}</div></div>))}
    </div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100"><div className="p-4 border-b border-gray-100 flex items-center gap-2"><Clock size={16} style={{color:'#2E6073'}}/><h2 className="font-semibold text-sm text-gray-700">Recent Trips</h2></div>
      <div className="divide-y divide-gray-50">
        {trips.length===0&&<div className="p-8 text-center text-gray-400 text-sm">No trips yet.</div>}
        {trips.slice(0,5).map(t=>(<div key={t.id} className="p-4 flex items-center justify-between"><div><div className="text-sm font-medium text-gray-700">{t.trip_number} — {t.from_location} → {t.to_location}</div><div className="text-xs text-gray-400">{t.vehicle_registration} · {t.driver_name}</div></div><span className={`text-xs font-semibold ${statusColor[t.status]||'text-gray-500'}`}>{t.status}</span></div>))}
      </div></div>
  </div>)
}
