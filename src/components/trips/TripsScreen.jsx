import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'






// ─── Trip Notification Helper ──────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY


async function sendTripNotification(event, trip, driverPhone) {
  if (!driverPhone) return
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/trip-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ event, trip, driver_phone: driverPhone }),
    })
  } catch(e) {
    console.warn('Notification send failed (non-blocking):', e.message)
  }
}


const EMPTY = {
  from_location:'', to_location:'', vehicle_registration:'', driver_name:'',
  start_date:'', freight_amount:'', distance_km:'', client_name:'',
  exp_fuel:'', exp_toll:'', exp_driver_allowance:'', exp_loading:'', exp_misc:''
}




export default function TripsScreen() {
  const { trips, createTrip, vehicles, drivers, company } = useStore()
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()




  const set = (k,v) => setForm(f=>({...f,[k]:v}))




  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    const { exp_fuel, exp_toll, exp_driver_allowance, exp_loading, exp_misc, ...coreForm } = form
    const tripData = await createTrip(coreForm)
    if (tripData?.id) {
      // Send WhatsApp + SMS notification to driver
      const assignedDriver = drivers.find(d =>
        d.name === form.driver_name || d.driver_name === form.driver_name
      )
      const driverPhone = assignedDriver?.phone || assignedDriver?.mobile || assignedDriver?.contact_number
      sendTripNotification('assigned', {
        trip_number:          tripData.trip_number,
        from_location:        coreForm.from_location,
        to_location:          coreForm.to_location,
        vehicle_registration: coreForm.vehicle_registration,
        client_name:          coreForm.client_name,
        start_date:           coreForm.start_date,
        freight_amount:       coreForm.freight_amount,
        driver_name:          coreForm.driver_name,
        status:               'Assigned',
      }, driverPhone)
      const expRows = [
        { expense_type:'Fuel', amount:exp_fuel, description:'Fuel cost' },
        { expense_type:'Toll', amount:exp_toll, description:'Toll charges' },
        { expense_type:'Driver Allowance', amount:exp_driver_allowance, description:'Driver allowance' },
        { expense_type:'Loading/Unloading', amount:exp_loading, description:'Loading & unloading' },
        { expense_type:'Miscellaneous', amount:exp_misc, description:'Miscellaneous' },
      ].filter(e => e.amount && Number(e.amount) > 0)
       .map(e => ({
         ...e,
