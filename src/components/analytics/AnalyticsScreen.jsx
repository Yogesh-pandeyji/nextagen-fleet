import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import { TrendingUp, TrendingDown, Truck, Route, IndianRupee, Target } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const RANGE_OPTIONS = [
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
]

const STATUS_COLORS = {
  'Completed': '#22c55e',
  'In Transit': '#3b82f6',
  'Scheduled': '#f59e0b',
  'Cancelled': '#ef4444',
  'Pending': '#8b5cf6',
}
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function AnalyticsScreen() {
  const [allTrips, setAllTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('month')

  useEffect(() => { fetchTrips() }, [])

  const fetchTrips = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single()
      if (!cu) return
      const { data } = await supabase.from('trips').select('*').eq('company_id', cu.company_id).order('start_date', { ascending: false })
      setAllTrips(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const trips = allTrips.filter(t => {
    if (range === 'all') return true
    const d = new Date(t.start_date || t.created_at)
    const now = new Date()
    if (range === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    if (range === '3months') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1)
    if (range === 'year') return d.getFullYear() === now.getFullYear()
    return true
  })

  const revenue = trips.reduce((s, t) => s + Number(t.freight_amount || 0), 0)
  const expenses = 0
  const profit = revenue - expenses
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0'
  const totalTrips = trips.length
  const completedTrips = trips.filter(t => t.status === 'Completed').length
  const activeTrips = trips.filter(t => t.status === 'In Transit').length
  const avgFreight = totalTrips > 0 ? Math.round(revenue / totalTrips) : 0

  const monthMap = {}
  trips.forEach(t => {
    const d = new Date(t.start_date || t.created_at)
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    if (!monthMap[key]) monthMap[key] = { month: label, revenue: 0, expenses: 0, trips: 0 }
    monthMap[key].revenue += Number(t.freight_amount || 0)
    monthMap[key].trips += 1
  })
  const monthlyData = Object.keys(monthMap).sort().map(k => ({ ...monthMap[k], profit: monthMap[k].revenue }))

  const statusMap = {}
  trips.forEach(t => { const s = t.status || 'Unknown'; statusMap[s] = (statusMap[s] || 0) + 1 })
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }))

  const routeMap = {}
  trips.forEach(t => {
    const key = t.from_location + ' to ' + t.to_location
    if (!routeMap[key]) routeMap[key] = { route: key, trips: 0, revenue: 0 }
    routeMap[key].trips++
    routeMap[key].revenue += Number(t.freight_amount || 0)
  })
  const topRoutes = Object.values(routeMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const vehMap = {}
  trips.forEach(t => {
    const v = t.vehicle_registration || 'Unknown'
    if (!vehMap[v]) vehMap[v] = { vehicle: v, trips: 0, revenue: 0 }
    vehMap[v].trips++
    vehMap[v].revenue += Number(t.freight_amount || 0)
  })
  const topVehicles = Object.values(vehMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const fmt = n => 'Rs.' + Number(n).toLocaleString('en-IN')
  const fmtShort = n => n >= 100000 ? 'Rs.' + (n / 100000).toFixed(1) + 'L' : n >= 1000 ? 'Rs.' + (n / 1000).toFixed(0) + 'K' : fmt(n)

  const kpis = [
    { label: 'Revenue', value: fmt(revenue), sub: totalTrips + ' trips', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: IndianRupee },
    { label: 'Expenses', value: fmt(expenses), sub: 'fuel + maintenance', color: 'text-rose-500', bg: 'bg-rose-50', Icon: TrendingDown },
    { label: 'Net Profit', value: fmt(profit), sub: margin + '% margin', color: 'text-blue-600', bg: 'bg-blue-50', Icon: TrendingUp },
    { label: 'Completed', value: completedTrips, sub: 'of ' + totalTrips + ' total', color: 'text-teal-600', bg: 'bg-teal-50', Icon: Target },
    { label: 'In Transit', value: activeTrips, sub: 'active right now', color: 'text-orange-500', bg: 'bg-orange-50', Icon: Truck },
    { label: 'Avg Freight', value: fmt(avgFreight), sub: 'per trip', color: 'text-purple-600', bg: 'bg-purple-50', Icon: Route },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading analytics...</p>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Fleet performance overview</p>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5 shadow-sm">
          {RANGE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setRange(opt.value)}
              className={'px-3 py-1.5 text-sm rounded-lg font-medium transition-all ' + (range === opt.value ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50')}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(({ label, value, sub, color, bg, Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className={'w-9 h-9 ' + bg + ' rounded-xl flex items-center justify-center mb-3'}>
              <Icon size={17} className={color} />
            </div>
            <div className={'text-xl font-bold ' + color}>{value}</div>
            <div className="text-xs font-semibold text-gray-600 mt-0.5">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Monthly Revenue vs Expenses</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-teal-500 inline-block" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-400 inline-block" />Expenses</span>
            </div>
          </div>
          {monthlyData.length === 0 ? <div className="flex items-center justify-center h-48 text-gray-300 text-sm">No data for this period</div> :
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={4} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n) => [fmt(v), n === 'revenue' ? 'Revenue' : 'Expenses']} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#0d9488" radius={[5, 5, 0, 0]} name="revenue" />
                <Bar dataKey="expenses" fill="#fb923c" radius={[5, 5, 0, 0]} name="expenses" />
              </BarChart>
            </ResponsiveContainer>}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Trip Status Breakdown</h2>
          {statusData.length === 0 ? <div className="flex items-center justify-center h-40 text-gray-300 text-sm">No trips</div> :
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v + ' trips']} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[s.name] || PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600">{s.name}</span>
                    </span>
                    <span className="font-bold text-gray-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </>}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Profit Trend</h2>
        {monthlyData.length === 0 ? <div className="flex items-center justify-center h-32 text-gray-300 text-sm">No data for this period</div> :
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [fmt(v), 'Net Profit']} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} />
              <Area type="monotone" dataKey="profit" stroke="#0d9488" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ fill: '#0d9488', r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Routes by Revenue</h2>
          {topRoutes.length === 0 ? <div className="text-gray-300 text-sm text-center py-6">No route data</div> :
            <div className="space-y-3">
              {topRoutes.map((r, i) => (
                <div key={r.route} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{r.route}</div>
                    <div className="text-xs text-gray-400">{r.trips} trip{r.trips !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="text-sm font-bold text-teal-700 whitespace-nowrap">{fmt(r.revenue)}</div>
                </div>
              ))}
            </div>}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Vehicles by Revenue</h2>
          {topVehicles.length === 0 ? <div className="text-gray-300 text-sm text-center py-6">No vehicle data</div> :
            <div className="space-y-3">
              {topVehicles.map((v, i) => (
                <div key={v.vehicle} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">{v.vehicle}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: topVehicles[0].revenue > 0 ? (v.revenue / topVehicles[0].revenue * 100) + '%' : '0%' }} />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-blue-700 whitespace-nowrap">{fmt(v.revenue)}</div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  )
  }
