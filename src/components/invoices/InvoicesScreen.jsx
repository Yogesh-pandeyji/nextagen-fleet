import { useState, useRef, useEffect } from 'react'
import { Plus, X, Download, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { supabase } from '../../lib/supabase'

// ─── PDF libs ────────────────────────────────────────────────────────────────
function loadScript(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve
    document.head.appendChild(s)
  })
}
async function ensurePdfLibs() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
}

// ─── Number to Words ──────────────────────────────────────────────────────────
function numberToWords(n) {
  const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  if (n === 0) return 'Zero'
  if (n < 0) return 'Minus ' + numberToWords(-n)
  let str = ''
  if (Math.floor(n/10000000)) { str += numberToWords(Math.floor(n/10000000)) + ' Crore '; n %= 10000000 }
  if (Math.floor(n/100000))   { str += numberToWords(Math.floor(n/100000))   + ' Lakh ';  n %= 100000  }
  if (Math.floor(n/1000))     { str += numberToWords(Math.floor(n/1000))     + ' Thousand '; n %= 1000  }
  if (Math.floor(n/100))      { str += numberToWords(Math.floor(n/100))      + ' Hundred '; n %= 100   }
  if (n > 0) {
    if (str !== '') str += 'and '
    str += n < 20 ? a[n] + ' ' : b[Math.floor(n/10)] + ' ' + a[n%10] + ' '
  }
  return str.trim()
}

// ─── Invoice Template ─────────────────────────────────────────────────────────
function InvoiceTemplate({ inv, trip, company }) {
  const base    = Number(inv?.base_amount  || 0)
  const cgst    = Number(inv?.cgst_amount  || 0)
  const sgst    = Number(inv?.sgst_amount  || 0)
  const total   = Number(inv?.total_amount || 0)
  const gstRate = Number(inv?.gst_rate     || 18)
  const fmt     = n => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const date    = fmtDate(inv?.created_at)
  const due     = inv?.created_at ? fmtDate(new Date(new Date(inv.created_at).getTime() + 30*86400000)) : '—'

  return (
    <div id="invoice-print-area" style={{fontFamily:'Arial,sans-serif',background:'#fff',color:'#222',width:'794px',minHeight:'1123px',padding:'40px',boxSizing:'border-box',fontSize:'13px'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'32px',paddingBottom:'24px',borderBottom:'3px solid #2E6073'}}>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          {company?.logo_base64 && <img src={company.logo_base64} alt="logo" style={{height:'70px',width:'auto',objectFit:'contain'}}/>}
          <div>
            <div style={{fontSize:'20px',fontWeight:'800',color:'#2E6073'}}>{company?.name || 'Company Name'}</div>
            {company?.address && <div style={{fontSize:'12px',color:'#555',marginTop:'3px'}}>{company.address}{company.city ? `, ${company.city}` : ''}</div>}
            {company?.phone && <div style={{fontSize:'12px',color:'#555',marginTop:'2px'}}>📞 {company.phone}</div>}
            {company?.email && <div style={{fontSize:'12px',color:'#555',marginTop:'2px'}}>✉ {company.email}</div>}
            {company?.gst_number && <div style={{fontSize:'12px',color:'#555',marginTop:'2px'}}>GSTIN: <b>{company.gst_number}</b></div>}
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'28px',fontWeight:'900',color:'#2E6073',letterSpacing:'2px'}}>INVOICE</div>
          <div style={{marginTop:'8px',fontSize:'13px'}}><span style={{color:'#888'}}>Invoice No: </span><b>{inv?.invoice_number || '—'}</b></div>
          <div style={{fontSize:'13px',marginTop:'4px'}}><span style={{color:'#888'}}>Date: </span><b>{date}</b></div>
          <div style={{fontSize:'13px',marginTop:'4px'}}><span style={{color:'#888'}}>Due Date: </span><b>{due}</b></div>
          <div style={{marginTop:'8px',display:'inline-block',padding:'4px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:'700',
            background:inv?.status==='Paid'?'#dcfce7':'#fef9c3',color:inv?.status==='Paid'?'#16a34a':'#ca8a04'}}>
            {inv?.status||'Pending'}
          </div>
        </div>
      </div>

      {/* Bill To + Trip */}
      <div style={{display:'flex',gap:'24px',marginBottom:'28px'}}>
        <div style={{flex:1,background:'#f8fafc',borderRadius:'10px',padding:'16px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#2E6073',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Bill To</div>
          <div style={{fontWeight:'700',fontSize:'15px',color:'#111'}}>{trip?.client_name||'—'}</div>
          {trip?.trip_number && <div style={{fontSize:'12px',color:'#666',marginTop:'4px'}}>Trip Ref: {trip.trip_number}</div>}
        </div>
        <div style={{flex:1,background:'#f8fafc',borderRadius:'10px',padding:'16px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#2E6073',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Trip Details</div>
          {trip?.from_location && <div style={{fontSize:'12px',color:'#444',marginTop:'4px'}}>From: <b>{trip.from_location}</b></div>}
          {trip?.to_location   && <div style={{fontSize:'12px',color:'#444',marginTop:'4px'}}>To: <b>{trip.to_location}</b></div>}
          {trip?.vehicle_registration && <div style={{fontSize:'12px',color:'#444',marginTop:'4px'}}>Vehicle: <b>{trip.vehicle_registration}</b></div>}
          {trip?.driver_name   && <div style={{fontSize:'12px',color:'#444',marginTop:'4px'}}>Driver: <b>{trip.driver_name}</b></div>}
          {trip?.start_date    && <div style={{fontSize:'12px',color:'#444',marginTop:'4px'}}>Date: <b>{new Date(trip.start_date).toLocaleDateString('en-IN')}</b></div>}
        </div>
      </div>

      {/* Line Items */}
      <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'8px'}}>
        <thead>
          <tr style={{background:'#2E6073',color:'#fff'}}>
            <th style={{padding:'10px 14px',textAlign:'left',fontSize:'12px',fontWeight:'600'}}>Description</th>
            <th style={{padding:'10px 14px',textAlign:'center',fontSize:'12px',fontWeight:'600'}}>HSN/SAC</th>
            <th style={{padding:'10px 14px',textAlign:'center',fontSize:'12px',fontWeight:'600'}}>GST Rate</th>
            <th style={{padding:'10px 14px',textAlign:'right',fontSize:'12px',fontWeight:'600'}}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{borderBottom:'1px solid #e5e7eb'}}>
            <td style={{padding:'12px 14px',fontSize:'13px'}}>
              Freight Charges<br/>
              <span style={{fontSize:'11px',color:'#888'}}>{trip?.from_location} → {trip?.to_location}</span>
            </td>
            <td style={{padding:'12px 14px',textAlign:'center',fontSize:'13px',color:'#555'}}>9965</td>
            <td style={{padding:'12px 14px',textAlign:'center',fontSize:'13px',color:'#555'}}>{gstRate}%</td>
            <td style={{padding:'12px 14px',textAlign:'right',fontSize:'13px',fontWeight:'600'}}>{fmt(base)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'28px'}}>
        <div style={{width:'280px'}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:'7px 14px',fontSize:'12px',color:'#555'}}><span>Sub Total</span><span>₹ {fmt(base)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'7px 14px',fontSize:'12px',color:'#555'}}><span>CGST ({gstRate/2}%)</span><span>₹ {fmt(cgst)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'7px 14px',fontSize:'12px',color:'#555',borderBottom:'1px solid #e5e7eb'}}><span>SGST ({gstRate/2}%)</span><span>₹ {fmt(sgst)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',padding:'10px 14px',fontSize:'15px',fontWeight:'800',background:'#2E6073',color:'#fff',borderRadius:'8px',marginTop:'8px'}}>
            <span>TOTAL</span><span>₹ {fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{background:'#f0f9ff',borderRadius:'8px',padding:'10px 14px',marginBottom:'24px',fontSize:'12px',color:'#0369a1'}}>
        <b>Amount in Words:</b> {numberToWords(Math.round(total))} Rupees Only
      </div>

      {/* Bank Details */}
      {(company?.bank_name||company?.bank_account) && (
        <div style={{marginBottom:'24px',padding:'14px',background:'#f8fafc',borderRadius:'10px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#2E6073',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'8px'}}>Bank Details</div>
          <div style={{display:'flex',gap:'40px',flexWrap:'wrap'}}>
            {company?.bank_name    && <div style={{fontSize:'12px'}}><span style={{color:'#888'}}>Bank: </span><b>{company.bank_name}</b></div>}
            {company?.bank_account && <div style={{fontSize:'12px'}}><span style={{color:'#888'}}>A/c No: </span><b>{company.bank_account}</b></div>}
            {company?.bank_ifsc    && <div style={{fontSize:'12px'}}><span style={{color:'#888'}}>IFSC: </span><b>{company.bank_ifsc}</b></div>}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{borderTop:'1px solid #e5e7eb',paddingTop:'16px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
        <div style={{fontSize:'11px',color:'#888'}}>
          <div style={{fontWeight:'600',marginBottom:'4px'}}>Terms & Conditions</div>
          <div>• Payment due within 30 days of invoice date.</div>
          <div>• Subject to jurisdiction of {company?.city||'India'}.</div>
          <div>• This is a computer-generated invoice.</div>
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{height:'50px',borderBottom:'1px solid #222',width:'160px',marginBottom:'6px'}}></div>
          <div style={{fontSize:'11px',color:'#555',fontWeight:'600'}}>{company?.name}</div>
          <div style={{fontSize:'10px',color:'#888'}}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function InvoicesScreen() {
  const { invoices, trips, createInvoice } = useStore()
  const [company, setCompany] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showPreview, setShowPreview] = useState(null)
  const [tripId, setTripId] = useState('')
  const [gst, setGst] = useState(18)
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Fetch company directly from Supabase
  useEffect(() => {
    const fetchCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: cu } = await supabase.from('company_users').select('company_id').eq('user_id', user.id).single()
      if (!cu?.company_id) return
      const { data: comp } = await supabase.from('companies').select('*').eq('id', cu.company_id).single()
      if (comp) setCompany(comp)
    }
    fetchCompany()
  }, [])

  const completedTrips = trips.filter(t => t.status === 'Completed' && !t.invoice_raised)

  const submit = async e => {
    e.preventDefault()
    const trip = trips.find(t => t.id === tripId)
    if (!trip) return
    setGenerating(true)
    const base = Number(trip.freight_amount || 0)
    const tax  = base * gst / 100
    await createInvoice(tripId, {
      base_amount: base, cgst_amount: tax/2, sgst_amount: tax/2,
      total_amount: base + tax, gst_rate: gst, status: 'Pending'
    })
    setGenerating(false)
    setShowCreate(false)
    setTripId('')
  }

  const downloadPdf = async inv => {
    setDownloading(true)
    try {
      await ensurePdfLibs()
      await new Promise(r => setTimeout(r, 400))
      const el = document.getElementById('invoice-print-area')
      if (!el) { alert('Invoice preview not open. Click Preview first, then Download PDF.'); setDownloading(false); return }
      const canvas = await window.html2canvas(el, { scale:2, useCORS:true, backgroundColor:'#fff' })
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({ orientation:'portrait', unit:'px', format:[canvas.width/2, canvas.height/2] })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width/2, canvas.height/2)
      pdf.save(`${inv.invoice_number||'Invoice'}.pdf`)
    } catch(e) { alert('PDF error: ' + e.message) }
    setDownloading(false)
  }

  const previewInv  = invoices.find(i => i.id === showPreview)
  const previewTrip = previewInv ? (previewInv.trips || trips.find(t => t.id === previewInv.trip_id)) : null
  const profileMissing = !company?.name || !company?.gst_number

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">GST Invoices</h1>
          <p className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{background:'#2E6073'}}>
          <Plus size={16}/> Create Invoice
        </button>
      </div>

      {profileMissing && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle size={16}/>
          <span>Company profile incomplete. Go to <b>Settings → Edit Profile</b> to add your firm name, GST, logo, and bank details before creating invoices.</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {invoices.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm">No invoices yet. Create your first invoice above.</div>
        )}
        <div className="divide-y divide-gray-50">
          {invoices.map(inv => {
            const trip = inv.trips || trips.find(t => t.id === inv.trip_id)
            return (
              <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{inv.invoice_number}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {trip?.client_name && <span>{trip.client_name} · </span>}
                    ₹{Number(inv.total_amount).toLocaleString('en-IN')} · GST {inv.gst_rate}%
                  </div>
                  {inv.created_at && <div className="text-xs text-gray-400 mt-0.5">{new Date(inv.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${inv.status==='Paid'?'text-green-600 bg-green-50':'text-yellow-600 bg-yellow-50'}`}>
                    {inv.status==='Paid'?<CheckCircle size={11}/>:<Clock size={11}/>} {inv.status}
                  </span>
                  <button onClick={() => setShowPreview(inv.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    <Eye size={12}/> Preview
                  </button>
                  <button onClick={() => { setShowPreview(inv.id); setTimeout(() => downloadPdf(inv), 500) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium" style={{background:'#2E6073'}}>
                    <Download size={12}/> PDF
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Create Invoice</h2>
              <button onClick={() => setShowCreate(false)}><X size={18} className="text-gray-400"/></button>
            </div>
            {profileMissing && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0"/>
                Go to <b>Settings</b> to complete your company profile first.
              </div>
            )}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Completed Trip</label>
                <select value={tripId} onChange={e => setTripId(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Choose trip…</option>
                  {completedTrips.map(t => (
                    <option key={t.id} value={t.id}>{t.trip_number} · {t.client_name} · ₹{Number(t.freight_amount).toLocaleString('en-IN')}</option>
                  ))}
                </select>
                {completedTrips.length === 0 && <p className="text-xs text-gray-400 mt-1">No completed trips available.</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GST Rate</label>
                <select value={gst} onChange={e => setGst(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value={5}>5% (CGST 2.5% + SGST 2.5%)</option>
                  <option value={12}>12% (CGST 6% + SGST 6%)</option>
                  <option value={18}>18% (CGST 9% + SGST 9%)</option>
                  <option value={28}>28% (CGST 14% + SGST 14%)</option>
                </select>
              </div>
              {tripId && (() => {
                const t = trips.find(x => x.id === tripId)
                const base = Number(t?.freight_amount||0), tax = base*gst/100
                return (
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between"><span>Freight</span><span>₹{base.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>GST ({gst}%)</span><span>₹{tax.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between font-bold text-gray-800 border-t border-gray-200 pt-1"><span>Total</span><span>₹{(base+tax).toLocaleString('en-IN')}</span></div>
                  </div>
                )
              })()}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={generating||!tripId}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{background:'#2E6073'}}>
                  {generating ? 'Generating…' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewInv && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">Invoice Preview</h2>
                <p className="text-xs text-gray-400">{previewInv.invoice_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadPdf(previewInv)} disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{background:'#2E6073'}}>
                  <Download size={14}/> {downloading ? 'Generating…' : 'Download PDF'}
                </button>
                <button onClick={() => setShowPreview(null)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X size={18} className="text-gray-500"/>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <InvoiceTemplate inv={previewInv} trip={previewTrip} company={company}/>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }
