import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Truck, Route, IndianRupee, Target, Calendar, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PRESET_RANGES = [
  { label: 'This Month',    value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'This Year',     value: 'year' },
  { label: 'All Time',      value: 'all' },
  { label: 'Custom Range',  value: 'custom' },
]

const STATUS_COLORS = {
  'Completed':  '#22c55e',
  'In Transit': '#3b82f6',
  'Scheduled':  '#f59e0b',
  'Cancelled':  '#ef4444',
}

const TEAL  = '#0d9488'
const AMBER = '#f59e0b'

function KpiCard({ icon: Icon, label, value, sub, trend, color = 'teal' }) {
  const colors = {
    teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'border-teal-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100' },
  }
  const c = colors[color] || colors.teal
  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon size={18} className={c.icon} />
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
      <p className="text-xs font-medium text-gray-400 mt-0.5 uppercase tracking-wide">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

const fmt = n => n ? 'â¹' + Number(n).toLocaleString('en-IN') : 'â¹0'

function getDateRange(range, customFrom, customTo) {
  const now = new Date()
  if (range === 'custom' && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo + 'T23:59:59') }
  }
  if (range === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }
  }
  if (range === '3months') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    return { from: d, to: now }
  }
  if (range === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to: now }
  }
  return { from: null, to: now }
}

export default function AnalyticsScreen() {
  const [allTrips, setAllTrips]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [range, setRange]           = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [dropOpen, setDropOpen]     = useState(false)

  useEffect(() => { fetchTrips() }, [])

  const fetchTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: cu } = await supabase
        .from('company_users').select('company_id').eq('user_id', user.id).single()
      const { data } = await supabase
        .from('trips').select('*')
        .eq('company_id', cu.company_id)
        .order('start_date', { ascending: false })
      setAllTrips(data || [])
    } finally {
      setLoading(false)
    }
  }

  const handleRangeSelect = (val) => {
    setRange(val)
    setDropOpen(false)
    setShowCustom(val === 'custom')
  }

  const { from, to } = getDateRange(range, customFrom, customTo)

  const trips = allTrips.filter(t => {
    if (!t.start_date) return false
    const d = new Date(t.start_date)
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })

  const completed  = trips.filter(t => t.status === 'Completed')
  const revenue    = completed.reduce((s, t) => s + Number(t.freight_amount || 0), 0)
  const expenses   = completed.reduce((s, t) => s + Number(t.expenses       || 0), 0)
  const profit     = revenue - expenses
  const margin     = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0'
  const totalKm    = trips.reduce((s, t) => s + Number(t.distance || 0), 0)

  const monthMap = {}
  trips.forEach(t => {
    if (!t.start_date) return
    const key = t.start_date.slice(0, 7)
    if (!monthMap[key]) monthMap[key] = { month: key, revenue: 0, expenses: 0 }
    if (t.status === 'Completed') {
      monthMap[key].revenue  += Number(t.freight_amount || 0)
      monthMap[key].expenses += Number(t.expenses       || 0)
    }
  })
  const monthlyData = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
  const profitData  = monthlyData.map(m => ({ month: m.month, profit: m.revenue - m.expenses }))

  const statusCount = {}
  trips.forEach(t => { statusCount[t.status] = (statusCount[t.status] || 0) + 1 })
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }))

  const routeMap = {}
  trips.forEach(t => {
    if (!t.from_location || !t.to_location) return
    const key = `${t.from_location} â ${t.to_location}`
    if (!routeMap[key]) routeMap[key] = { route: key, trips: 0, revenue: 0 }
    routeMap[key].trips++
    if (t.status === 'Completed') routeMap[key].revenue += Number(t.freight_amount || 0)
  })
  const topRoutes = Object.values(routeMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  const vehMap = {}
  trips.forEach(t => {
    if (!t.vehicle_registration) return
    if (!vehMap[t.vehicle_registration]) vehMap[t.vehicle_registration] = { vehicle: t.vehicle_registration, trips: 0, revenue: 0 }
    vehMap[t.vehicle_registration].trips++
    if (t.status === 'Completed') vehMap[t.vehicle_registration].revenue += Number(t.freight_amount || 0)
  })
  const topVehicles = Object.values(vehMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const maxVehRev   = topVehicles[0]?.revenue || 1

  const selectedLabel = PRESET_RANGES.find(r => r.value === range)?.label || 'This Month'

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header + Range Picker */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics &amp; P&amp;L</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {trips.length} trips &middot; {range === 'custom' && customFrom && customTo
              ? `${customFrom} to ${customTo}`
              : selectedLabel}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-teal-400 shadow-sm transition-all"
          >
            <Calendar size={15} className="text-teal-600" />
            {selectedLabel}
            <ChevronDown size={14} className={`transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
              {PRESET_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => handleRangeSelect(r.value)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                    ${range === r.value ? 'bg-teal-50 text-teal-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex flex-wrap items-end gap-3 bg-teal-50 border border-teal-100 rounded-2xl p-4">
          <div>
            <label className="block text-xs font-semibold text-teal-700 mb-1.5 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-2 border border-teal-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-teal-700 mb-1.5 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-2 border border-teal-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            onClick={() => { if (customFrom && customTo) setShowCustom(false) }}
            disabled={!customFrom || !customTo}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={IndianRupee}  label="Revenue"        value={fmt(revenue)}    color="teal"   />
        <KpiCard icon={TrendingDown} label="Expenses"       value={fmt(expenses)}   color="red"    />
        <KpiCard icon={TrendingUp}   label="Net Profit"     value={fmt(profit)}     color="green"  />
        <KpiCard icon={Target}       label="Margin"         value={`${margin}%`}    color="purple" />
        <KpiCard icon={Truck}        label="Total Trips"    value={trips.length}    color="blue"   />
        <KpiCard icon={Route}        label="Distance"       value={`${totalKm.toLocaleString('en-IN')} km`} color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Monthly Revenue vs Expenses</h2>
          {monthlyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => 'â¹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                <Tooltip formatter={(v, n) => [fmt(v), n === 'revenue' ? 'Revenue' : 'Expenses']} />
                <Legend formatter={n => n === 'revenue' ? 'Revenue' : 'Expenses'} />
                <Bar dataKey="revenue"  fill={TEAL}  radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill={AMBER} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Trip Status</h2>
          {pieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name] || '#94a3b8' }} />
                      <span className="text-gray-600 font-medium">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profit area chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Profit Trend</h2>
        {profitData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-gray-300 text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={profitData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={TEAL} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => 'â¹' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
              <Tooltip formatter={v => [fmt(v), 'Profit']} />
              <Area type="monotone" dataKey="profit" stroke={TEAL} strokeWidth={2} fill="url(#profitGrad)" dot={{ r: 3, fill: TEAL }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Top Routes by Revenue</h2>
          {topRoutes.length === 0 ? (
            <p className="text-gray-300 text-sm text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {topRoutes.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{r.route}</p>
                      <p className="text-xs text-gray-400">{r.trips} trip{r.trips !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 ml-2 flex-shrink-0">{fmt(r.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Top Vehicles by Revenue</h2>
          {topVehicles.length === 0 ? (
            <p className="text-gray-300 text-sm text-center py-6">No data</p>
          ) : (
            <div className="space-y-3">
              {topVehicles.map((v, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-800">{v.vehicle}</span>
                    <span className="text-xs font-bold text-gray-700">{fmt(v.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all"
                      style={{ width: `${Math.round((v.revenue / maxVehRev) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
