import { useState, useRef } from 'react'
import { Building2, Shield, Edit3, Save, X, Upload, Image } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

export default function SettingsScreen() {
  const { company, user, setCompany } = useStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [logoPreview, setLogoPreview] = useState(null)
  const fileRef = useRef(null)

  const startEdit = () => {
    setForm({
      name:        company?.name        || '',
      gst_number:  company?.gst_number  || '',
      phone:       company?.phone       || '',
      email:       company?.email       || '',
      city:        company?.city        || '',
      address:     company?.address     || '',
      bank_name:   company?.bank_name   || '',
      bank_account:company?.bank_account|| '',
      bank_ifsc:   company?.bank_ifsc   || '',
    })
    setLogoPreview(company?.logo_base64 || null)
    setEditing(true)
  }

  const handleLogo = e => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setLogoPreview(ev.target.result)
      setForm(f => ({ ...f, logo_base64: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    if (!company?.id) return
    setSaving(true)
    const { data, error } = await supabase
      .from('companies')
      .update({
        name:         form.name,
        gst_number:   form.gst_number,
        phone:        form.phone,
        email:        form.email,
        city:         form.city,
        address:      form.address,
        bank_name:    form.bank_name,
        bank_account: form.bank_account,
        bank_ifsc:    form.bank_ifsc,
        logo_base64:  form.logo_base64 || company?.logo_base64 || null,
      })
      .eq('id', company.id)
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setCompany(data)
      setEditing(false)
    } else if (error) {
      alert('Save failed: ' + error.message)
    }
  }

  const f = (k) => form[k] ?? ''
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const logo = editing ? logoPreview : company?.logo_base64

  return (
    <div className="p-6 max-w-2xl">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <Building2 size={16} style={{color:'#2E6073'}}/>
          <h2 className="font-semibold text-gray-700 text-sm">Company Profile</h2>
          <span className="text-xs text-gray-400 ml-1">— Used on all generated invoices</span>
        </div>

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

        <div className="grid grid-cols-1 gap-4">
          {[
            ['Company / Firm Name','name','text'],
            ['Address','address','text'],
            ['City','city','text'],
            ['Phone / Contact','phone','text'],
            ['GST Number','gst_number','text'],
            ['Email','email','email'],
          ].map(([label,key,type]) => (
            <div key={key}>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">🏦</span>
          <h2 className="font-semibold text-gray-700 text-sm">Bank Details</h2>
          <span className="text-xs text-gray-400 ml-1">— Printed on invoice footer</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[
            ['Bank Name','bank_name'],
            ['Account Number','bank_account'],
            ['IFSC Code','bank_ifsc'],
          ].map(([label,key]) => (
            <div key={key}>
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
        </div>
      </div>

      {!editing && (
        <p className="text-xs text-gray-400 text-center">
          Click <b>Edit Profile</b> to update company details. These appear on every invoice PDF.
        </p>
      )}
    </div>
  )
    }
