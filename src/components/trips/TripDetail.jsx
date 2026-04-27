import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Edit2, X, Save, Truck } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

const STATUS_OPTIONS = ['Scheduled', 'In Transit', 'Completed', 'Cancelled']

const STATUS_STYLE = {
  'Completed':  'bg-green-100 text-green-700 border-green-200',
  'In Transit': 'bg-blue-100 text-blue-700 border-blue-200',
  'Scheduled':  'bg-amber-100 text-amber-700 border-amber-200',
  'Cancelled':  'bg-red-100 text-red-700 border-red-200',
}

const EDIT_FIELDS = [
  { key: 'from_location',       label: 'From Location',       col: 1 },
  { key: 'to_location',         label: 'To Location',         col: 1 },
  { key: 'client_name',         label: 'Client Name',         col: 1 },
  { key: 'vehicle_registration',label: 'Vehicle Reg.',        col: 1 },
  { key: 'driver_name',         label: 'Driver Name',         col: 1 },
  { key: 'start_date',          label: 'Start Date',          col: 1, type: 'date' },
  { key: 'freight_amount',      label: 'Freight Amount (â¹)',  col: 1, type: 'number' },
  { key: 'distance',            label: 'Distance (km)',       col: 1, type: 'number' },
]

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value || 'â'}</p>
    </div>
  )
}

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { trips, updateTrip } = useStore()
  const trip = trips.find(t => t.id === id)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState({})

  if (!trip) return (
    <div className="p-8 text-center">
      <p className="text-gray-400 text-sm">Trip not found.</p>
      <button onClick={() => navigate('/trips')} className="mt-4 text-teal-600 text-sm font-medium hover:underline">
        Back to Trips
      </button>
    </div>
  )

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const markInTransit = async () => {
    await updateTrip(id, { status: 'In Transit' })
    showToast('Status updated to In Transit')
  }

  const markCompleted = async () => {
    const end = new Date().toISOString().split('T')[0]
    await updateTrip(id, { status: 'Completed', end_date: end })
    showToast('Trip marked as Completed')
  }

  const startEdit = () => {
    setForm({
      from_location:        trip.from_location        || '',
      to_location:          trip.to_location          || '',
      client_name:          trip.client_name          || '',
      vehicle_registration: trip.vehicle_registration || '',
      driver_name:          trip.driver_name          || '',
      start_date:           trip.start_date           || '',
      freight_amount:       trip.freight_amount       || '',
      distance:             trip.distance             || '',
      status:               trip.status               || 'Scheduled',
      notes:                trip.notes                || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (payload.freight_amount) payload.freight_amount = Number(payload.freight_amount)
      if (payload.distance) payload.distance = payload.distance.toString()
      const { error } = await supabase.from('trips').update(payload).eq('id', id)
      if (error) throw error
      updateTrip(id, payload)
      setEditing(false)
      showToast('Trip updated successfully')
    } catch (e) {
      console.error(e)
      showToast('Failed to save changes', false)
    } finally {
      setSaving(false)
    }
  }

  const fmt = n => n ? 'â¹' + Number(n).toLocaleString('en-IN') : 'â'

  return (
    <div className="p-6 max-w3x1 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/trips')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
          <ArrowLeft size={16} />
          Back to Trips
        </button>
        <button onClick={startEdit}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
          <Edit2 size={14} />
          Edit Trip
        </button>
      </div>

      {/* Detail Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 to-teal-400" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{trip.trip_number}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {trip.from_location} â {trip.to_location}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[trip.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {trip.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6 pb-6 border-b border-gray-100">
            <Field label="Trip Number"   value={trip.trip_number} />
            <Field label="Status"        value={trip.status} />
            <Field label="From"          value={trip.from_location} />
            <Field label="To"            value={trip.to_location} />
            <Field label="Client"        value={trip.client_name} />
            <Field label="Vehicle"       value={trip.vehicle_registration} />
            <Field label="Driver"        value={trip.driver_name} />
            <Field label="Start Date"    value={trip.start_date} />
            <Field label="Freight"       value={fmt(trip.freight_amount)} />
            <Field label="Distance"      value={trip.distance ? trip.distance + ' km' : null} />
            {trip.end_date && <Field label="End Date" value={trip.end_date} />}
            {trip.notes    && <Field label="Notes"    value={trip.notes} />}
          </div>

          <div className="flex flex-wrap gap-3">
            {trip.status === 'Scheduled' && (
              <button onClick={markInTransit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                <Truck size={15} />
                Mark In Transit
              </button>
            )}
            {trip.status !== 'Completed' && trip.status !== 'Cancelled' && (
              <button onClick={markCompleted}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors shadow-sm">
                <CheckCircle size={15} />
                Complete Trip
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h[90vh] flex flex-col">

            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Trip</h2>
                <p className="text-xs text-gray-400 mt-0.5">{trip.trip_number}</p>
              </div>
              <button onClick={() => setEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EDIT_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type={f.type || 'text'}
                      value={form[f.key] || ''}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes || ''}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button onClick={() => setEditing(false)}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm">
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
