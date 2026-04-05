import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
export default function RegisterPage() {
  const [form,setForm]=useState({email:'',password:'',companyName:'',gst:'',phone:'',city:'',plan:'Starter'})
  const { signUp, isLoading } = useStore()
  const navigate = useNavigate()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const handleSubmit = async e => { e.preventDefault(); const r=await signUp(form); if(r.success)navigate('/') }
  return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"><div className="text-center mb-6"><div className="text-3xl font-bold tracking-tight mb-1"><span style={{color:'#2E6073'}}>next</span><span style={{color:'#F07820'}}>A</span><span style={{color:'#2E6073'}}>gen</span></div><p className="text-gray-500 text-sm">Create your fleet account</p></div>
      <form onSubmit={handleSubmit} className="space-y-3">{[['Company Name','companyName','text'],['Email','email','email'],['Password','password','password'],['GST Number','gst','text'],['Phone','phone','tel'],['City','city','text']].map(([label,key,type])=>(<div key={key}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label><input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} required={['companyName','email','password'].includes(key)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>))}
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Plan</label><select value={form.plan} onChange={e=>set('plan',e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"><option>Starter</option><option>Growth</option><option>Enterprise</option></select></div>
      <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold mt-2" style={{background:'#2E6073'}}>{isLoading?'Creating...':'Create Account'}</button></form>
      <p className="text-center text-sm text-gray-500 mt-4">Already registered? <Link to="/login" className="font-semibold" style={{color:'#F07820'}}>Sign In</Link></p>
    </div></div>)
}
