import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import { supabase } from './lib/supabase'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'
import Dashboard from './components/dashboard/Dashboard'
import TrackingScreen from './components/tracking/TrackingScreen'
import FleetScreen from './components/fleet/FleetScreen'
import DriversScreen from './components/drivers/DriversScreen'
import TripsScreen from './components/trips/TripsScreen'
import TripDetail from './components/trips/TripDetail'
import EPODScreen from './components/epod/EPODScreen'
import InvoicesScreen from './components/invoices/InvoicesScreen'
import AnalyticsScreen from './components/analytics/AnalyticsScreen'
import MaintenanceScreen from './components/maintenance/MaintenanceScreen'
import AlertsScreen from './components/alerts/AlertsScreen'
import SettingsScreen from './components/settings/SettingsScreen'

const ProtectedRoute = ({ children }) => {
  const user = useStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { setUser, setCompany, loadAll, setupRealtime, teardownRealtime } = useStore()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); loadAll(); setupRealtime() }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') { setUser(session.user); loadAll(); setupRealtime() }
      else if (event === 'SIGNED_OUT') { setUser(null); setCompany(null); teardownRealtime() }
    })
    return () => subscription.unsubscribe()
  }, [])
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="tracking" element={<TrackingScreen />} />
          <Route path="fleet" element={<FleetScreen />} />
          <Route path="drivers" element={<DriversScreen />} />
          <Route path="trips" element={<TripsScreen />} />
          <Route path="trips/:id" element={<TripDetail />} />
          <Route path="epod" element={<EPODScreen />} />
          <Route path="invoices" element={<InvoicesScreen />} />
          <Route path="analytics" element={<AnalyticsScreen />} />
          <Route path="maintenance" element={<MaintenanceScreen />} />
          <Route path="alerts" element={<AlertsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
