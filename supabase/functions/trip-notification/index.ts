// Supabase Edge Function — Trip Notification
// Sends WhatsApp (Meta Cloud API) + SMS (Fast2SMS) to driver on trip events
// Deploy: supabase functions deploy trip-notification --no-verify-jwt
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   WHATSAPP_TOKEN          — Meta permanent access token
//   WHATSAPP_PHONE_ID       — WhatsApp Business phone number ID
//   WHATSAPP_TEMPLATE_ASSIGNED  — Template name for trip assigned (e.g. "trip_assigned")
//   WHATSAPP_TEMPLATE_UPDATE    — Template name for status update (e.g. "trip_update")
//   FAST2SMS_KEY            — Fast2SMS API key
//   FAST2SMS_SENDER_ID      — 6-char sender ID (e.g. NEXTGN)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── WhatsApp Cloud API ───────────────────────────────────────────────────────
async function sendWhatsApp(phone: string, templateName: string, components: object[]) {
  const token   = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  if (!token || !phoneId) return { error: 'WhatsApp credentials not configured' }

  const normalized = phone.replace(/\D/g, '')
  const e164 = normalized.startsWith('91') ? normalized : '91' + normalized// Supabase Edge Function — Trip Notification
// Sends WhatsApp (Meta Cloud API) + SMS (Fast2SMS) to driver on trip events
// Deploy: supabase functions deploy trip-notification --no-verify-jwt
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   WHATSAPP_TOKEN          — Meta permanent access token
//   WHATSAPP_PHONE_ID       — WhatsApp Business phone number ID
//   WHATSAPP_TEMPLATE_ASSIGNED  — Template name for trip assigned (e.g. "trip_assigned")
//   WHATSAPP_TEMPLATE_UPDATE    — Template name for status update (e.g. "trip_update")
//   FAST2SMS_KEY            — Fast2SMS API key
//   FAST2SMS_SENDER_ID      — 6-char sender ID (e.g. NEXTGN)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── WhatsApp Cloud API ───────────────────────────────────────────────────────
async function sendWhatsApp(phone: string, templateName: string, components: object[]) {
  const token   = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  if (!token || !phoneId) return { error: 'WhatsApp credentials not configured' }

  const normalized = phone.replace(/\D/g, '')
  const e164 = normalized.startsWith('91') ? normalized : '91' + normalized

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: e164,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components,
      },
    }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

// ─── Fast2SMS ─────────────────────────────────────────────────────────────────
async function sendSMS(phone: string, message: string) {
  const apiKey   = Deno.env.get('FAST2SMS_KEY')
  const senderId = Deno.env.get('FAST2SMS_SENDER_ID') || 'NEXTGN'
  if (!apiKey) return { error: 'Fast2SMS key not configured' }

  const normalized = phone.replace(/\D/g, '').slice(-10)

  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'dlt',
      sender_id: senderId,
      message,
      variables_values: '',
      flash: 0,
      numbers: normalized,
    }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

// ─── Message builder ──────────────────────────────────────────────────────────
function buildMessage(event: string, trip: Record<string, string>) {
  const { trip_number, from_location, to_location, vehicle_registration,
          client_name, start_date, freight_amount, driver_name, status } = trip

  const date = start_date
    ? new Date(start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const freight = freight_amount
    ? `Rs.${Number(freight_amount).toLocaleString('en-IN')}`
    : ''

  if (event === 'assigned') {
    return {
      sms: `Trip ${trip_number} assigned to you. Route: ${from_location} to ${to_location}. Vehicle: ${vehicle_registration}. Client: ${client_name}. Date: ${date}. Freight: ${freight}. Manage at app.nextagen.in - Nextagen Fleet`,
      waComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: driver_name || 'Driver' },
            { type: 'text', text: trip_number },
            { type: 'text', text: `${from_location} → ${to_location}` },
            { type: 'text', text: vehicle_registration },
            { type: 'text', text: client_name },
            { type: 'text', text: date },
            { type: 'text', text: freight },
          ],
        },
      ],
    }
  }

  if (event === 'status_update') {
    return {
      sms: `Trip ${trip_number} status updated to: ${status}. Route: ${from_location} to ${to_location}. Vehicle: ${vehicle_registration}. Track at app.nextagen.in - Nextagen Fleet`,
      waComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: driver_name || 'Driver' },
            { type: 'text', text: trip_number },
            { type: 'text', text: status },
            { type: 'text', text: `${from_location} → ${to_location}` },
          ],
        },
      ],
    }
  }

  if (event === 'reminder') {
    return {
      sms: `Reminder: Trip ${trip_number} starts today. Route: ${from_location} to ${to_location}. Vehicle: ${vehicle_registration}. Client: ${client_name}. Freight: ${freight}. app.nextagen.in - Nextagen Fleet`,
      waComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: driver_name || 'Driver' },
            { type: 'text', text: trip_number },
            { type: 'text', text: `${from_location} → ${to_location}` },
            { type: 'text', text: vehicle_registration },
          ],
        },
      ],
    }
  }

  return null
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { event, trip, driver_phone } = body

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: e164,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components,
      },
    }),
  })
  const data = await res.json()
  return { status: res.status, data }
}

// ─── Fast2SMS ─────────────────────────────────────────────────────────────────
async function sendSMS(phone: string, message: string) {
  const apiKey   = Deno.env.get('FAST2SMS_KEY')
  const senderId = Deno.env.get('FAST2SMS_SENDER_ID') || 'NEXTGN'
  if (!apiKey) return { error: 'Fast2SMS key not configured' }

  const normalized = phone.replace(/\D/g, '').slice(-10)

  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'dlt',
      sender_id: senderId,
      message,
      variables_values: '',
      flash: 0,
      numbers: normalized,
    }),
  })
  const data = await res.json()
  return { status: res.status, data }
      }

// ─── Message builder ──────────────────────────────────────────────────────────
function buildMessage(event: string, trip: Record<string, string>) {
  const { trip_number, from_location, to_location, vehicle_registration,
          client_name, start_date, freight_amount, driver_name, status } = trip

  const date = start_date
    ? new Date(start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const freight = freight_amount
    ? `Rs.${Number(freight_amount).toLocaleString('en-IN')}`
    : ''

  if (event === 'assigned') {
    return {
      sms: `Trip ${trip_number} assigned to you. Route: ${from_location} to ${to_location}. Vehicle: ${vehicle_registration}. Client: ${client_name}. Date: ${date}. Freight: ${freight}. Manage at app.nextagen.in - Nextagen Fleet`,
      waComponents: [
        {
          type: 'body',
// Sends WhatsApp (Meta Cloud API) + SMS (Fast2SMS) to driver on trip events
// Deploy: supabase functions deploy trip-notification --no-verify-jwt
//
// Required env vars (set in Supabase Dashboard → Edge Functions → Secrets):
//   WHATSAPP_TOKEN          — Meta permanent access token
//   WHATSAPP_PHONE_ID       — WhatsApp Business phone number ID
//   WHATSAPP_TEMPLATE_ASSIGNED  — Template name for trip assigned
//   WHATSAPP_TEMPLATE_UPDATE    — Template name for status update
//   FAST2SMS_KEY            — Fast2SMS API key
//   FAST2SMS_SENDER_ID      — 6-char sender ID (e.g. NEXTGN)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendWhatsApp(phone, templateName, components) {
  const token   = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  if (!token || !phoneId) return { error: 'WhatsApp credentials not configured' }
  const normalized = phone.replace(/\D/g, '')
  const e164 = normalized.startsWith('91') ? normalized : '91' + normalized
  const res = await fetch('https://graph.facebook.com/v18.0/' + phoneId + '/messages', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: e164, type: 'template', template: { name: templateName, language: { code: 'en' }, components } }),
  })
  return { status: res.status, data: await res.json() }
}

async function sendSMS(phone, message) {
  const apiKey   = Deno.env.get('FAST2SMS_KEY')
  const senderId = Deno.env.get('FAST2SMS_SENDER_ID') || 'NEXTGN'
  if (!apiKey) return { error: 'Fast2SMS key not configured' }
  const normalized = phone.replace(/\D/g, '').slice(-10)
  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ route: 'dlt', sender_id: senderId, message, variables_values: '', flash: 0, numbers: normalized }),
  })
  return { status: res.status, data: await res.json() }
}

function buildMessage(event, trip) {
  const { trip_number, from_location, to_location, vehicle_registration, client_name, start_date, freight_amount, driver_name, status } = trip
  const date = start_date ? new Date(start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  const freight = freight_amount ? 'Rs.' + Number(freight_amount).toLocaleString('en-IN') : ''
  if (event === 'assigned') return {
    sms: 'Trip ' + trip_number + ' assigned to you. Route: ' + from_location + ' to ' + to_location + '. Vehicle: ' + vehicle_registration + '. Client: ' + client_name + '. Date: ' + date + '. Freight: ' + freight + '. Manage at app.nextagen.in - Nextagen Fleet',
    waComponents: [{ type: 'body', parameters: [{ type: 'text', text: driver_name || 'Driver' }, { type: 'text', text: trip_number }, { type: 'text', text: from_location + ' to ' + to_location }, { type: 'text', text: vehicle_registration }, { type: 'text', text: client_name }, { type: 'text', text: date }, { type: 'text', text: freight }] }],
  }
  if (event === 'status_update') return {
    sms: 'Trip ' + trip_number + ' status updated to: ' + status + '. Route: ' + from_location + ' to ' + to_location + '. Vehicle: ' + vehicle_registration + '. Track at app.nextagen.in - Nextagen Fleet',
    waComponents: [{ type: 'body', parameters: [{ type: 'text', text: driver_name || 'Driver' }, { type: 'text', text: trip_number }, { type: 'text', text: status }, { type: 'text', text: from_location + ' to ' + to_location }] }],
  }
  if (event === 'reminder') return {
    sms: 'Reminder: Trip ' + trip_number + ' starts today. Route: ' + from_location + ' to ' + to_location + '. Vehicle: ' + vehicle_registration + '. Client: ' + client_name + '. Freight: ' + freight + '. app.nextagen.in - Nextagen Fleet',
    waComponents: [{ type: 'body', parameters: [{ type: 'text', text: driver_name || 'Driver' }, { type: 'text', text: trip_number }, { type: 'text', text: from_location + ' to ' + to_location }, { type: 'text', text: vehicle_registration }] }],
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json()
    const { event, trip, driver_phone } = body
    if (!event || !trip || !driver_phone) return new Response(JSON.stringify({ error: 'Missing: event, trip, driver_phone' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const templates = {
      assigned:      Deno.env.get('WHATSAPP_TEMPLATE_ASSIGNED') || 'trip_assigned',
      status_update: Deno.env.get('WHATSAPP_TEMPLATE_UPDATE')   || 'trip_update',
      reminder:      Deno.env.get('WHATSAPP_TEMPLATE_ASSIGNED') || 'trip_reminder',
    }
    const msgs = buildMessage(event, trip)
    if (!msgs) return new Response(JSON.stringify({ error: 'Unknown event: ' + event }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const [waResult, smsResult] = await Promise.all([sendWhatsApp(driver_phone, templates[event], msgs.waComponents), sendSMS(driver_phone, msgs.sms)])
    console.log('WA result:', JSON.stringify(waResult))
    console.log('SMS result:', JSON.stringify(smsResult))
    return new Response(JSON.stringify({ success: true, event, driver_phone, whatsapp: waResult, sms: smsResult }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
