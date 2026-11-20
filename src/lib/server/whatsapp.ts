/**
 * Optional automatic WhatsApp alert for new briefs, sent from the server via
 * the official WhatsApp Business Cloud API (Meta).
 *
 * Visitors already hand their brief to you in WhatsApp from the form; this is
 * a second, automatic copy that arrives even if they never press "send".
 *
 * Setup (developers.facebook.com → WhatsApp → API Setup):
 *   WHATSAPP_TOKEN            permanent access token
 *   WHATSAPP_PHONE_NUMBER_ID  the sender number's ID
 *   WHATSAPP_NOTIFY_TO        your number, e.g. 233240832129
 *   WHATSAPP_TEMPLATE         (recommended) approved template with one {{1}}
 *                             body variable, e.g. "new_brief"
 * Without a template Meta only delivers free-form text if you messaged the
 * business number in the last 24 hours.
 */
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v23.0";

export const whatsappNotifyEnabled = () =>
  Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_NOTIFY_TO);

export async function notifyWhatsApp(text: string) {
  if (!whatsappNotifyEnabled()) return;
  const template = process.env.WHATSAPP_TEMPLATE;
  // Template parameters can't contain newlines or long runs of spaces.
  const flat = text.replace(/\s*\n+\s*/g, " · ").slice(0, 1000);

  const body = template
    ? {
        messaging_product: "whatsapp",
        to: process.env.WHATSAPP_NOTIFY_TO,
        type: "template",
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
          components: [{ type: "body", parameters: [{ type: "text", text: flat }] }],
        },
      }
    : { messaging_product: "whatsapp", to: process.env.WHATSAPP_NOTIFY_TO, type: "text", text: { body: text.slice(0, 4000) } };

  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) console.error("[whatsapp] notify failed", res.status, await res.text());
}
