import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db, auth, subscribeToVehicles, subscribeToTrips } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useStore = create(persist((set, get) => ({
  user: null, company: null, isLoading: false,
  setUser: (user) => set({ user }),
  setCompany: (company) => set({ company }),
  signIn: async (email, password) => {
    set({ isLoading: true })
    try { const data = await auth.signIn({ email, password }); const company = await auth.getCompany(); set({ user: data.user, company }); await get().loadAll(); toast.success('Welcome back, '+company?.name+'!'); return { success: true } }
    catch (err) { toast.error(err.message); return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  signUp: async (formData) => {
    set({ isLoading: true })
    try { const { user, company } = await auth.signUp(formData); set({ user, company }); toast.success('Account created! Welcome to Nextagen Fleet.'); return { success: true } }
    catch (err) { toast.error(err.message); return { success: false, error: err.message } }
    finally { set({ isLoading: false }) }
  },
  signOut: async () => { await auth.signOut(); set({ user: null, company: null, vehicles: [], drivers: [], trips: [], invoices: [] }) },
  vehicles: [],
  loadVehicles: async () => { const { data } = await db.getVehicles(); if (data) set({ vehicles: data }) },
  addVehicle: async (vehicle) => {
    const { data, error } = await db.addVehicle({ ...vehicle, company_id: get().company?.id })
    if (error) { toast.error('Failed to add vehicle'); return }
    set((s) => ({ vehicles: [data, ...s.vehicles] })); toast.success(vehicle.registration_no+' registered!')
  },
  updateVehicle: async (id, updates) => {
    const { data, error } = await db.updateVehicle(id, updates)
    if (error) { toast.error('Update failed'); return }
    set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === id ? data : v)) }))
  },
  drivers: [],
  loadDrivers: async () => { const { data } = await db.getDrivers(); if (data) set({ drivers: data }) },
  addDriver: async (driver) => {
    const { data, error } = await db.addDriver({ ...driver, company_id: get().company?.id })
    if (error) { toast.error('Failed to add driver'); return }
    set((s) => ({ drivers: [data, ...s.drivers] })); toast.success(driver.name+' added!')
  },
  trips: [],
  loadTrips: async () => { const { data } = await db.getTrips(); if (data) set({ trips: data }) },
  createTrip: async (trip) => {
    const tripNumber = 'T'+Date.now()
    const { data, error } = await db.addTrip({ ...trip, trip_number: tripNumber, company_id: get().company?.id, status: 'Scheduled' })
    if (error) { toast.error('Failed to create trip'); return }
    set((s) => ({ trips: [data, ...s.trips] })); toast.success('Trip '+tripNumber+' created!'); return data
  },
  updateTrip: async (id, updates) => {
    const { data, error } = await db.updateTrip(id, updates)
    if (error) { toast.error('Update failed'); return }
    set((s) => ({ trips: s.trips.map((t) => (t.id === id ? data : t)) }))
  },
  captureEPOD: async (tripId, epodData) => {
    await db.captureEPOD(tripId, epodData)
    set((s) => ({ trips: s.trips.map((t) => t.id === tripId ? { ...t, epod_captured: true, epod_recipient: epodData.recipient } : t) }))
    toast.success('ePOD captured!')
  },
  invoices: [],
  loadInvoices: async () => { const { data } = await db.getInvoices(); if (data) set({ invoices: data }) },
  createInvoice: async (tripId, invoiceData) => {
    const invoiceNumber = 'INV-'+Date.now()
    const { data, error } = await db.createInvoice({ ...invoiceData, invoice_number: invoiceNumber, trip_id: tripId, company_id: get().company?.id })
    if (error) { toast.error('Failed to create invoice'); return }
    set((s) => ({ invoices: [data, ...s.invoices] })); await get().updateTrip(tripId, { invoice_raised: true, invoice_number: invoiceNumber }); toast.success('Invoice '+invoiceNumber+' created!'); return data
  },
  loadAll: async () => { await Promise.all([get().loadVehicles(), get().loadDrivers(), get().loadTrips(), get().loadInvoices()]) },
  subscriptions: [],
  setupRealtime: () => {
    const companyId = get().company?.id; if (!companyId) return
    const subs = [subscribeToVehicles(companyId, () => get().loadVehicles()), subscribeToTrips(companyId, () => get().loadTrips())]
    set({ subscriptions: subs })
  },
  teardownRealtime: () => { get().subscriptions.forEach((sub) => sub.unsubscribe()); set({ subscriptions: [] }) },
  getAnalytics: () => {
    const { trips, vehicles, drivers } = get()
    const completed = trips.filter((t) => t.status === 'Completed')
    const totalRevenue = completed.reduce((s, t) => s + (t.freight_amount || 0), 0)
    const totalExpenses = completed.reduce((s, t) => s + (t.toll_amount || 0) + (t.fuel_amount || 0) + (t.driver_payment || 0), 0)
    const totalProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
    return { totalRevenue, totalExpenses, totalProfit, profitMargin, totalTrips: trips.length, activeTrips: trips.filter((t) => t.status === 'In Transit').length, totalVehicles: vehicles.length, activeDrivers: drivers.filter((d) => d.status === 'On Duty').length }
  },
}), { name: 'nextagen-fleet-storage', partialize: (state) => ({ user: state.user, company: state.company }) }))
