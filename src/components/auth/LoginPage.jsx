import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
export default function LoginPage() {
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const { signIn, isLoading } = useStore()
  const navigate = useNavigate()
  const handleSubmit = async e => { e.preventDefault(); const r=await signIn(email,password); if(r.success)navigate('/') }
  return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"><div className="text-center mb-8"><div className="text-3xl font-bold tracking-tight mb-1"><span style={{color:'#2E6073'}}>next</span><span style={{color:'#F07820'}}>A</span><span style={{color:'#2E6073'}}>gen</span></div><p className="text-gray-500 text-sm">Fleet Platform</p></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/></div>
        <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>{isLoading?'Signing in...':'Sign In'}</button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">New company? <Link to="/register" className="font-semibold" style={{color:'#F07820'}}>Register Free</Link></p>
    </div></div>)
}
