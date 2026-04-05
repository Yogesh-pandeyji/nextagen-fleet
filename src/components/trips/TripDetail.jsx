import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function TripDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { trips, updateTrip } = useStore()
  const trip = trips.find(t=>t.id===id)
  if(!trip) return <div className="p-6 text-gray-500">Trip not found.</div>
  const markInTransit = () => updateTrip(id,{status:'In Transit'})
  const markCompleted = () => updateTrip(id,{status:'Completed',end_date:new Date().toISOString().split('T')[0]})
  const rows=[['Trip Number',trip.trip_number],['Status',trip.status],['From',trip.from_location],['To',trip.to_location],['Client',trip.client_name],['Vehicle',trip.vehicle_registration],['Driver',trip.driver_name],['Start Date',trip.start_date],['Freight',trip.freight_amount?'₹'+Number(trip.freight_amount).toLocaleString('en-IN'):'—'],['Distance',trip.distance_km?trip.distance_km+'km':'—']]
  return (<div className="p-6 max-w-2xl"><button onClick={()=>navigate('/trips')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft size={16}/> Back</button>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><h1 className="font-bold text-gray-800 text-lg mb-4">{trip.trip_number}</h1>
      <div className="grid grid-cols-2 gap-3 mb-6">{rows.map(([l,v])=>(<div key={l}><div className="text-xs text-gray-400">{l}</div><div className="text-sm font-medium text-gray-700 mt-0.5">{v||'—'}</div></div>))}</div>
      <div className="flex gap-3">{trip.status==='Scheduled'&&<button onClick={markInTransit} className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>Mark In Transit</button>}{trip.status==='In Transit'&&<button onClick={markCompleted} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold bg-green-600"><CheckCircle size={16}/> Complete Trip</button>}</div>
    </div></div>)
}
