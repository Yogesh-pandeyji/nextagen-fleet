import { useState } from 'react'
import { Plus, X, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const STATUS_STYLE = {
  'Completed':  'text-green-600',
  'In Transit': 'text-blue-600',
  'Scheduled':  'text-amber-600',
  'Cancelled':  'text-red-500',
}

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

async function sendTripNotification(event, trip, driverPhone) {
  try {
    if (!driverPhone) return
    await fetch(`${SUPABASE_URL}/functions/v1/trip-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ event, trip, driver_phone: driverPhone }),
    })
  } catch (e) {
    console.warn('Notification send failed:', e)
  }
}

const EMPTY = {
  from_location: '', to_location: '', client_name: '',
  vehicle_registration: '', driver_name: '', driver_phone: '',
  start_date: '', freight_amount: '', distance: '', notes: '',
}

export default function TripsScreen() {
  const navigate            = useNavigate()
  const { trips, addTrip, company } = useStore()
  const [open, setOpen]     = useState(false)
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleCreate = async () => {
    if (!form.from_location || !form.to_location) {
      setError('From and To locations are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: cu } = await supabase
        .from('company_users').select('company_id').eq('user_id', user.id).single()

      const trip_number = 'T' + Date.now()
      const payload = {
        trip_number,
        status:               'Scheduled',
        company_id:           cu?.company_id || null,
        from_location:        form.from_location || null,
        to_location:          form.to_location || null,
        client_name:          form.client_name || null,
        vehicle_registration: form.vehicle_registration || null,
        driver_name:          form.driver_name || null,
        driver_phone:         form.driver_phone || null,
        start_date:           form.start_date || null,
        freight_amount:       form.freight_amount ? Number(form.freight_amount) : null,
        distance:             form.distance ? Number(form.distance) : null,
        notes:                form.notes || null,
      }

      const { data, error: err } = await supabase.from('trips').insert(payload).select().single()
      if (err) throw err

      addTrip(data)
      await sendTripNotification('assigned', data, form.driver_phone)
      setOpen(false)
      setForm(EMPTY)
    } catch (e) {
      setError(e.message || 'Failed to create trip.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <p className="text-sm text-gray-400 mt-0.5">{trips.length} trips total</p>
        </div>
        <button
          onClick={() => { setOpen(true); setForm(EMPTY); setError(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Trip
        </button>
      </div>

      {/* Trip list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {trips.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No trips yet. Create your first trip.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {trips.map(t => (
              <div
                key={t.id}
                onClick={() => navigate(`/trips/${t.id}`)}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.trip_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.from_location} → {t.to_location}
                    {t.client_name ? ` · ${t.client_name}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${STATUS_STYLE[t.status] || 'text-gray-500'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Trip Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Trip</h2>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto p-6">
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'from_location',        label: 'From Location *' },
                  { key: 'to_location',          label: 'To Location *' },
                  { key: 'client_name',          label: 'Client Name' },
                  { key: 'vehicle_registration', label: 'Vehicle Registration' },
                  { key: 'driver_name',          label: 'Driver Name' },
                  { key: 'driver_phone',         label: 'Driver Phone' },
                  { key: 'start_date',           label: 'Start Date', type: 'date' },
                  { key: 'freight_amount',       label: 'Freight Amount (₹)', type: 'number' },
                  { key: 'distance',             label: 'Distance (km)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type={f.type || 'text'}
                      value={form[f.key] || ''}
                      onChange={e => set(f.key, e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                ))}

                {/* Notes - full width */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes || ''}
                    onChange={e => set('notes', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Plus size={15} />
                {saving ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
