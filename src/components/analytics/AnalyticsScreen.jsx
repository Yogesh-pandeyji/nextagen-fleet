import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { useStore } from '../../store/useStore'
export default function AnalyticsScreen() {
  const { trips, getAnalytics } = useStore()
  const a = getAnalytics()
  const fmt = n => '₹'+Number(n).toLocaleString('en-IN')
  const monthData = trips.reduce((acc,t)=>{ if(!t.start_date)return acc; const m=t.start_date.slice(0,7); if(!acc[m])acc[m]={month:m,revenue:0,expenses:0,trips:0}; acc[m].revenue+=t.freight_amount||0; acc[m].expenses+=(t.toll_amount||0)+(t.fuel_amount||0)+(t.driver_payment||0); acc[m].trips++; return acc },{})
  const chartData = Object.values(monthData).slice(-6).map(d=>({...d,profit:d.revenue-d.expenses}))
  return (<div className="p-6"><div className="mb-6"><h1 className="text-xl font-bold text-gray-800">Analytics & P&L</h1></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[['Revenue',fmt(a.totalRevenue),'text-blue-600'],['Expenses',fmt(a.totalExpenses),'text-red-500'],['Net Profit',fmt(a.totalProfit),'text-green-600'],['Margin',a.profitMargin+'%','text-purple-600']].map(([label,val,color])=>(<div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><div className="text-xs text-gray-400 mb-1">{label}</div><div className={`text-xl font-bold ${color}`}>{val}</div></div>))}</div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4"><h2 className="text-sm font-semibold text-gray-600 mb-4">Monthly Revenue vs Expenses</h2>
      {chartData.length===0?(<div className="h-48 flex items-center justify-center text-gray-400 text-sm">Complete some trips to see data</div>):(<ResponsiveContainer width="100%" height={220}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>'₹'+Number(v).toLocaleString('en-IN')}/><Bar dataKey="revenue" fill="#2E6073" radius={[4,4,0,0]}/><Bar dataKey="expenses" fill="#F07820" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>)}
    </div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5"><h2 className="text-sm font-semibold text-gray-600 mb-4">Profit Trend</h2>
      {chartData.length===0?(<div className="h-32 flex items-center justify-center text-gray-400 text-sm">No data yet</div>):(<ResponsiveContainer width="100%" height={160}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip formatter={v=>'₹'+Number(v).toLocaleString('en-IN')}/><Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{r:4}}/></LineChart></ResponsiveContainer>)}
    </div>
  </div>)
}
