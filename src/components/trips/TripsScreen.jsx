import { useState } from 'react'
import { Plus, X, ChevronRight, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const EMPTY = {
  from_location: '', to_location: '', client_name: '',
  vehicle_registration: '', driver_name: '', driver_phone: '',
  start_date: '', freight_amount: '', distance_km: '', notes: '',
  exp_fuel: '', exp_toll: '', exp_driver_allowance: '', exp_loading: '', exp_misc: '',
}

async function notifyDriver(trip, driver_phone) {
  if (!driver_phone || !trip?.id) return
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!SUPABASE_URL) return
    await fetch(`${SUPABASE_URL}/functions/v1/trip-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
      body: JSON.stringify({
        event: 'assigned',
        driver_phone,
        trip: {
          trip_number: trip.trip_number, from_location: trip.from_location,
          to_location: trip.to_location, vehicle_registration: trip.vehicle_registration,
          client_name: trip.client_name, start_date: trip.start_date,
          freight_amount: trip.freight_amount, distance: trip.distance_km,
          driver_name: trip.driver_name, status: trip.status,
        },
      }),
    })
  } catch (e) {
    console.warn('Driver notification skipped:', e.message)
  }
}

export default function TripsScreen() {
  const { trips, createTrip, vehicles, drivers, company } = useStore()
  const [show, setShow]     = useState(false)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const openModal  = () => { setForm(EMPTY); setError(null); setShow(true) }
  const closeModal = () => { if (!saving) { setShow(false); setError(null) } }

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { exp_fuel, exp_toll, exp_driver_allowance, exp_loading, exp_misc, driver_phone, ...coreForm } = form
      const tripData = await createTrip(coreForm)
      if (!tripData?.id) {
        setError('Trip could not be saved. Check the notification above for details.')
        setSaving(false)
        return
      }
      const expRows = [
        { expense_type: 'Fuel',              amount: exp_fuel,             description: 'Fuel cost' },
        { expense_type: 'Toll',              amount: exp_toll,             description: 'Toll charges' },
        { expense_type: 'Driver Allowance',  amount: exp_driver_allowance, description: 'Driver allowance' },
        { expense_type: 'Loading/Unloading', amount: exp_loading,          description: 'Loading & unloading' },
        { expense_type: 'Miscellaneous',     amount: exp_misc,             description: 'Miscellaneous' },
      ].filter(r => r.amount && Number(r.amount) > 0)
       .map(r => ({ ...r, trip_id: tripData.id, company_id: company?.id,
         recorded_at: form.start_date ? form.start_date + 'T00:00:00Z' : new Date().toISOString() }))
      await Promise.allSettled([
        expRows.length > 0 ? supabase.from('trip_expenses').insert(expRows) : Promise.resolve(),
        notifyDriver(tripData, driver_phone),
      ])
      setForm(EMPTY)
      setShow(false)
    } catch (err) {
      setError(err?.message || 'Unexpected error. Please try again.')
      console.error('Trip submit error:', err)
    } finally {
      setSaving(false)
    }
  }

  const expTotal = ['exp_fuel','exp_toll','exp_driver_allowance','exp_loading','exp_misc']
    .reduce((s, k) => s + (Number(form[k]) || 0), 0)

  const statusColor = {
    Completed: 'text-green-600 bg-green-50', 'In Transit': 'text-blue-600 bg-blue-50',
    Scheduled: 'text-yellow-600 bg-yellow-50', Cancelled: 'text-red-500 bg-red-50',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Trips</h1>
          <p className="text-sm text-gray-500">{trips.length} trips total</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>
          <Plus size={16}/> New Trip
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {trips.length === 0 && <div className="p-12 text-center text-gray-400 text-sm">No trips yet. Create your first trip!</div>}
        <div className="divide-y divide-gray-50">
          {trips.map(t => (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/trips/' + t.id)}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800">{t.trip_number}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">
                  {t.from_location} &rarr; {t.to_location}
                  {t.client_name && <span className="text-gray-400"> &middot; {t.client_name}</span>}
                </div>
                <div className="text-xs text-gray-400">{t.vehicle_registration || t.vehicle_reg || '-'} &middot; {t.driver_name || '-'}</div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[t.status] || 'text-gray-500 bg-gray-100'}`}>{t.status}</span>
                  {Number(t.freight_amount) > 0 && <div className="text-xs text-gray-500 mt-1">&#8377;{Number(t.freight_amount).toLocaleString('en-IN')}</div>}
                </div>
                <ChevronRight size={14} className="text-gray-300"/>
              </div>
            </div>
          ))}
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-base">New Trip</h2>
              <button onClick={closeModal} disabled={saving}><X size={18} className="text-gray-400"/></button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5"/>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['FROM LOCATION *','from_location','text',true],
                  ['TO LOCATION *','to_location','text',true],
                  ['CLIENT NAME','client_name','text',false],
                  ['VEHICLE REGISTRATION','vehicle_registration','text',false],
                  ['DRIVER NAME','driver_name','text',false],
                  ['DRIVER PHONE','driver_phone','tel',false],
                  ['START DATE *','start_date','date',true],
                  ['FREIGHT AMOUNT (\u20b9)','freight_amount','number',false],
                ].map(([label,key,type,required]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1 tracking-wide">{label}</label>
                    <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} required={required}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 tracking-wide">DISTANCE (KM)</label>
                <input type="number" value={form.distance_km} onChange={e => set('distance_km', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
              </div>

              {vehicles.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 tracking-wide">SELECT VEHICLE</label>
                  <select value={form.vehicle_registration} onChange={e => set('vehicle_registration', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Choose from registered vehicles</option>
                    {vehicles.map(v => <option key={v.id} value={v.registration_no}>{v.registration_no}</option>)}
                  </select>
                </div>
              )}

              {drivers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 tracking-wide">SELECT DRIVER</label>
                  <select value={form.driver_name} onChange={e => {
                    const d = drivers.find(dr => dr.name === e.target.value)
                    set('driver_name', e.target.value)
                    if (d?.phone && !form.driver_phone) set('driver_phone', d.phone)
                  }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">Choose from registered drivers</option>
                    {drivers.map(d => <option key={d.id} value={d.name}>{d.name}{d.phone ? ' · '+d.phone : ''}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 tracking-wide">NOTES</label>
                <input type="text" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional remarks"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">TRIP EXPENSES <span className="font-normal text-gray-400">(optional)</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {[['Fuel (\u20b9)','exp_fuel'],['Toll (\u20b9)','exp_toll'],['Driver Allowance (\u20b9)','exp_driver_allowance'],['Loading/Unloading (\u20b9)','exp_loading'],['Miscellaneous (\u20b9)','exp_misc']].map(([label,key]) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input type="number" min="0" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>
                    </div>
                  ))}
                </div>
                {expTotal > 0 && <div className="mt-2 text-right text-xs font-semibold text-gray-700">Total: &#8377;{expTotal.toLocaleString('en-IN')}</div>}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} disabled={saving} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2" style={{background:'#2E6073'}}>
                  {saving ? (<><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Creating…</>) : (<><Plus size={14}/> Create Trip</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
