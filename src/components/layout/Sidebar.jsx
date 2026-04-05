import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, Truck, Users, Route, FileCheck, Receipt, BarChart3, Wrench, Bell, Settings, LogOut } from 'lucide-react'
import { useStore } from '../../store/useStore'

const links = [
  { to:'/', icon: LayoutDashboard, label:'Dashboard' },
  { to:'/tracking', icon: MapPin, label:'Live Tracking' },
  { to:'/fleet', icon: Truck, label:'Fleet' },
  { to:'/drivers', icon: Users, label:'Drivers' },
  { to:'/trips', icon: Route, label:'Trips' },
  { to:'/epod', icon: FileCheck, label:'ePOD' },
  { to:'/invoices', icon: Receipt, label:'Invoices' },
  { to:'/analytics', icon: BarChart3, label:'Analytics' },
  { to:'/maintenance', icon: Wrench, label:'Maintenance' },
  { to:'/alerts', icon: Bell, label:'Alerts' },
  { to:'/settings', icon: Settings, label:'Settings' },
]

export default function Sidebar() {
  const { signOut, company } = useStore()
  const navigate = useNavigate()
  return (
    <div className="w-56 h-screen flex flex-col text-white" style={{background:'#2E6073'}}>
      <div className="p-5 border-b border-white/10">
        <div className="text-2xl font-bold tracking-tight"><span className="text-white">next</span><span style={{color:'#F07820'}}>A</span><span className="text-white">gen</span></div>
        <div className="text-xs text-white/60 mt-0.5 truncate">{company?.name||'Fleet'}</div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {links.map(({to,icon:Icon,label})=>(<NavLink key={to} to={to} end={to==='/'} className={({isActive})=>`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive?'bg-white/20 font-semibold':'hover:bg-white/10'}`}><Icon size={16}/>{label}</NavLink>))}
      </nav>
      <div className="p-3"><button onClick={()=>{signOut();navigate('/login')}} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-white/10"><LogOut size={16}/> Sign Out</button></div>
    </div>)
}
