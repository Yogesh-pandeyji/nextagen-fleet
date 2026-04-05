import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 10 } },
})
export const auth = {
  signUp: async ({ email, password, companyName, gst, phone, city, plan }) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    const { data: company, error: cErr } = await supabase.from('companies').insert({ name: companyName, gst_number: gst, phone, email, city, plan }).select().single()
    if (cErr) throw cErr
    await supabase.from('company_users').insert({ company_id: company.id, user_id: data.user.id, role: 'admin', name: companyName })
    return { user: data.user, company }
  },
  signIn: async ({ email, password }) => { const { data, error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; return data },
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  getCompany: async () => {
    const { data } = await supabase.from('company_users').select('*, companies(*)').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single()
    return data?.companies
  },
}
export const db = {
  getVehicles: () => supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
  addVehicle: (v) => supabase.from('vehicles').insert(v).select().single(),
  updateVehicle: (id, data) => supabase.from('vehicles').update(data).eq('id', id).select().single(),
  deleteVehicle: (id) => supabase.from('vehicles').delete().eq('id', id),
  getDrivers: () => supabase.from('drivers').select('*').order('name'),
  addDriver: (d) => supabase.from('drivers').insert(d).select().single(),
  updateDriver: (id, data) => supabase.from('drivers').update(data).eq('id', id).select().single(),
  getTrips: () => supabase.from('trips').select('*').order('created_at', { ascending: false }),
  addTrip: (t) => supabase.from('trips').insert(t).select().single(),
  updateTrip: (id, data) => supabase.from('trips').update({ ...data, updated_at: new Date() }).eq('id', id).select().single(),
  getInvoices: () => supabase.from('invoices').select('*, trips(*)').order('created_at', { ascending: false }),
  createInvoice: (inv) => supabase.from('invoices').insert(inv).select().single(),
  markInvoicePaid: (id) => supabase.from('invoices').update({ status: 'Paid', payment_received_at: new Date() }).eq('id', id),
  getMaintenance: (vehicleId) => supabase.from('maintenance_records').select('*').eq('vehicle_id', vehicleId).order('service_date', { ascending: false }),
  addMaintenance: (m) => supabase.from('maintenance_records').insert(m).select().single(),
  captureEPOD: (tripId, { recipient, signatureUrl }) => supabase.from('trips').update({ epod_captured: true, epod_captured_at: new Date(), epod_recipient: recipient, epod_signature_url: signatureUrl }).eq('id', tripId),
}
export const subscribeToVehicles = (companyId, callback) => supabase.channel('vehicles:'+companyId).on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: 'company_id=eq.'+companyId }, callback).subscribe()
export const subscribeToTrips = (companyId, callback) => supabase.channel('trips:'+companyId).on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: 'company_id=eq.'+companyId }, callback).subscribe()
