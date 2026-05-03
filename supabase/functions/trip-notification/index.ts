// Supabase Edge Function — Trip Notification
// Sends WhatsApp (Meta Cloud API) + SMS (Fast2SMS) to driver on trip events
// Deploy: supabase functions deploy trip-notification --no-verify-jwt
//
// Required env vars (set in Supabase Dashboard -> Edge Functions -> Secrets):
//   WHATSAPP_TOKEN              -- Meta permanent access token
//   WHATSAPP_PHONE_ID           -- WhatsApp Business phone number ID
//   WHATSAPP_TEMPLATE_ASSIGNED  -- Template name for trip assigned (e.g. "trip_assigned")
//   WHATSAPP_TEMPLATE_UPDATE    -- Template name for status update (e.g. "trip_update")
//   FAST2SMS_KEY                -- Fast2SMS API key
//   FAST2SMS_SENDER_ID          -- 6-char sender ID (e.g. NEXTGN)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- WhatsApp Cloud API -------------------------------------------------------
async function sendWhatsApp(
  phone: string,
  templateName: string,
  components: unknown[],
) {
  const token   = Deno.env.get('WHATSAPP_TOKEN')
  const phoneId = Deno.env.get('WHATSAPP_PHONE_ID')
  if (!token || !phoneId) return { error: 'WhatsApp not configured' }

  // normalise to E.164 (assume India +91 if 10 digits)
  const digits = phone.replace(/\D/g, '')
  const e164   = digits.startsWith('91') && digits.length === 12
    ? '+' + digits
    : digits.length === 10
      ? '+91' + digits
      : '+' + digits

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

// --- Fast2SMS ----------------------------------------------------------------
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

// --- Message builder ---------------------------------------------------------
function buildMessage(event: string, trip: Record<string, string>) {
  const {
    trip_number, from_location, to_location, vehicle_registration,
    client_name, start_date, freight_amount, distance, notes,
    driver_name, status,
  } = trip

  const date = start_date
    ? new Date(start_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '-'

  const freight = freight_amount
    ? `Rs.${Number(freight_amount).toLocaleString('en-IN')}`
    : ''

  const distancePart = distance ? ` Dist: ${distance} km.` : ''
  const notesPart    = notes    ? ` Note: ${notes}.`       : ''

  // ── Trip Assigned ────────────────────────────────────────────────────────
  if (event === 'assigned') {
    const smsBody = [
      `New Trip Assigned: ${trip_number}`,
      `Route: ${from_location} to ${to_location}`,
      `Client: ${client_name || '-'}`,
      `Vehicle: ${vehicle_registration || '-'}`,
      `Start Date: ${date}`,
      freight ? `Freight: ${freight}` : null,
      distance ? `Distance: ${distance} km` : null,
      notes ? `Note: ${notes}` : null,
      `Manage: app.nextagen.in`,
      `- Nextagen Fleet`,
    ].filter(Boolean).join('\n')

    return {
      sms: smsBody,
      waComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: driver_name || 'Driver' },
            { type: 'text', text: trip_number },
            { type: 'text', text: `${from_location} to ${to_location}` },
            { type: 'text', text: vehicle_registration || '-' },
            { type: 'text', text: client_name || '-' },
            { type: 'text', text: date },
            { type: 'text', text: freight || '-' },
          ],
        },
      ],
    }
  }

  // ── Status Update ────────────────────────────────────────────────────────
  if (event === 'update') {
    return {
      sms: `Trip ${trip_number} status updated to: ${status}. Route: ${from_location} to ${to_location}.${distancePart}${notesPart} - Nextagen Fleet`,
      waComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: driver_name || 'Driver' },
            { type: 'text', text: trip_number },
            { type: 'text', text: status || 'Updated' },
            { type: 'text', text: `${from_location} to ${to_location}` },
          ],
        },
      ],
    }
  }

  // ── Reminder ─────────────────────────────────────────────────────────────
  if (event === 'reminder') {
    return {
      sms: `Reminder: Trip ${trip_number} starts today. Route: ${from_location} to ${to_location}. Vehicle: ${vehicle_registration}. Client: ${client_name}. Freight: ${freight}.${distancePart} - Nextagen Fleet`,
      waComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: driver_name || 'Driver' },
            { type: 'text', text: trip_number },
            { type: 'text', text: `${from_location} to ${to_location}` },
            { type: 'text', text: vehicle_registration || '-' },
          ],
        },
      ],
    }
  }

  return null
}

// --- Main handler ------------------------------------------------------------
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { event, trip, driver_phone } = body

    if (!event || !trip) {
      return new Response(
        JSON.stringify({ error: 'Missing event or trip' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const messages = buildMessage(event, trip)
    if (!messages) {
      return new Response(
        JSON.stringify({ error: `Unknown event: ${event}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const results: Record<string, unknown> = {}

    // Send SMS via Fast2SMS
    if (driver_phone && messages.sms) {
      results.sms = await sendSMS(driver_phone, messages.sms)
    }

    // Send WhatsApp if template name is configured
    const templateEnvKey = event === 'assigned'
      ? 'WHATSAPP_TEMPLATE_ASSIGNED'
      : 'WHATSAPP_TEMPLATE_UPDATE'
    const templateName = Deno.env.get(templateEnvKey)

    if (driver_phone && templateName && messages.waComponents) {
      results.whatsapp = await sendWhatsApp(driver_phone, templateName, messages.waComponents)
    }

    return new Response(
      JSON.stringify({ ok: true, event, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('trip-notification error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
