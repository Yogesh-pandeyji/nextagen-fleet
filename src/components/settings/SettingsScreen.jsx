import { useState, useRef, useEffect } from 'react'
import { Building2, Shield, Edit3, Save, X, Upload, Image, AlertCircle, CheckCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  const { company: storeCompany, user, setCompany } = useStore()
  const [company, setLocalCompany] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null) // { type: 'success'|'error', msg }
  const [form, setForm] = useState({})
  const [logoPreview, setLogoPreview] = useState(null)
  const fileRef = useRef(null)

  // Always fetch company directly from Supabase on mount
  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    setLoading(true)
    try {
      // Get the current user's company via company_users join
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setLoading(false); return }

      const { data: cuRow } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', authUser.id)
        .single()

      if (!cuRow?.company_id) { setLoading(false); return }

      const { data: comp, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', cuRow.company_id)
        .single()

      if (!error && comp) {
        setLocalCompany(comp)
        if (typeof setCompany === 'function') setCompany(comp)
      }
    } catch (err) {
      console.error('fetchCompany error:', err)
    }
    setLoading(false)
  }

  const startEdit = () => {
    setForm({
      name:         company?.name         || '',
      gst_number:   company?.gst_number   || '',
      phone:        company?.phone        || '',
      email:        company?.email        || '',
      city:         company?.city         || '',
      address:      company?.address      || '',
      bank_name:    company?.bank_name    || '',
      bank_account: company?.bank_account || '',
      bank_ifsc:    company?.bank_ifsc    || '',
    })
    setLogoPreview(company?.logo_base64 || null)
    setEditing(true)
  }

  const handleLogo = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Logo must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      setLogoPreview(ev.target.result)
      setForm(f => ({ ...f, logo_base64: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    if (!company?.id) {
      showToast('error', 'Company not found. Please refresh and try again.')
      return
    }
    setSaving(true)
    const payload = {
      name:         form.name,
      gst_number:   form.gst_number,
      phone:        form.phone,
      email:        form.email,
      city:         form.city,
      address:      form.address,
      bank_name:    form.bank_name,
      bank_account: form.bank_account,
      bank_ifsc:    form.bank_ifsc,
      logo_base64:  form.logo_base64 !== undefined ? form.logo_base64 : (company?.logo_base64 || null),
    }
    const { data, error } = await supabase
      .from('companies')
      .update(payload)
      .eq('id', company.id)
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setLocalCompany(data)
      if (typeof setCompany === 'function') setCompany(data)
      setEditing(false)
      showToast('success', 'Company profile saved!')
    } else {
      console.error('Save error:', error)
      showToast('error', 'Save failed: ' + (error?.message || 'Unknown error'))
    }
  }

  const showToast = (type, msg) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const f   = k => form[k] ?? ''
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const logo = editing ? logoPreview : company?.logo_base64

  if (loading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-32"></div>
          <div className="h-48 bg-gray-100 rounded-xl"></div>
          <div className="h-32 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        {!editing
          ? <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>
              <Edit3 size={14}/> Edit Profile
            </button>
          : <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-gray-600">
                <X size={14}/> Cancel
              </button>
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{background:'#2E6073'}}>
                <Save size={14}/> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
        }
      </div>

      {/* Company Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={16} style={{color:'#2E6073'}}/>
          <h2 className="font-semibold text-gray-700 text-sm">Company Profile</h2>
          <span className="text-xs text-gray-400 ml-1">— Used on all generated invoices</span>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-50">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
            {logo
              ? <img src={logo} alt="logo" className="w-full h-full object-contain p-1"/>
              : <Image size={24} className="text-gray-300"/>
            }
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Company Logo</p>
            <p className="text-xs text-gray-400 mb-2">Appears on invoice header (PNG/JPG, max 2MB)</p>
            {editing && (
              <>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
                  <Upload size={12}/> Upload Logo
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo}/>
              </>
            )}
          </div>
        </div>

        {/* Fields grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Company / Firm Name', 'name', 'text', 'full'],
            ['Address', 'address', 'text', 'full'],
            ['City', 'city', 'text', 'half'],
            ['Phone / Contact', 'phone', 'text', 'half'],
            ['GST Number', 'gst_number', 'text', 'half'],
            ['Email', 'email', 'email', 'half'],
          ].map(([label, key, type, span]) => (
            <div key={key} className={span === 'full' ? 'col-span-2' : 'col-span-1'}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              {editing
                ? <input type={type} value={f(key)} onChange={e => set(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"/>
                : <p className="text-sm font-medium text-gray-800 py-1.5">{company?.[key] || <span className="text-gray-300">—</span>}</p>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">🏦</span>
          <h2 className="font-semibold text-gray-700 text-sm">Bank Details</h2>
          <span className="text-xs text-gray-400 ml-1">— Printed on invoice footer</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            ['Bank Name', 'bank_name', 'full'],
            ['Account Number', 'bank_account', 'half'],
            ['IFSC Code', 'bank_ifsc', 'half'],
          ].map(([label, key, span]) => (
            <div key={key} className={span === 'full' ? 'col-span-2' : 'col-span-1'}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              {editing
                ? <input value={f(key)} onChange={e => set(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"/>
                : <p className="text-sm font-medium text-gray-800 py-1.5">{company?.[key] || <span className="text-gray-300">—</span>}</p>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{color:'#F07820'}}/>
          <h2 className="font-semibold text-gray-700 text-sm">Account</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-400">Admin Email</span>
            <span className="text-sm font-medium text-gray-700">{user?.email}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-xs text-gray-400">Plan</span>
            <span className="text-sm font-medium text-gray-700">{company?.plan || '—'}</span>
          </div>
          {company?.id && (
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-gray-400">Company ID</span>
              <span className="text-xs text-gray-400 font-mono">{company.id.substring(0,8)}…</span>
            </div>
          )}
        </div>
      </div>

      {!editing && (
        <p className="text-xs text-gray-400 text-center">
          Click <b>Edit Profile</b> to update your company details. These appear on every invoice PDF.
        </p>
      )}
    </div>
  )
    }
