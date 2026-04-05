import { Building2, Shield } from 'lucide-react'
import { useStore } from '../../store/useStore'
export default function SettingsScreen() {
  const { company, user } = useStore()
  const rows=[['Company Name',company?.name],['GST Number',company?.gst_number],['Phone',company?.phone],['City',company?.city],['Plan',company?.plan],['Admin Email',user?.email]]
  return (<div className="p-6 max-w-2xl"><div className="mb-6"><h1 className="text-xl font-bold text-gray-800">Settings</h1></div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4"><div className="flex items-center gap-2 mb-4"><Building2 size={16} style={{color:'#2E6073'}}/><h2 className="font-semibold text-gray-700 text-sm">Company Profile</h2></div><div className="space-y-3">{rows.map(([label,value])=>(<div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"><span className="text-xs text-gray-400">{label}</span><span className="text-sm font-medium text-gray-700">{value||'—'}</span></div>))}</div></div>
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"><div className="flex items-center gap-2 mb-4"><Shield size={16} style={{color:'#F07820'}}/><h2 className="font-semibold text-gray-700 text-sm">Security</h2></div><p className="text-xs text-gray-400">Your data is secured with Row Level Security.</p></div>
  </div>)
}
