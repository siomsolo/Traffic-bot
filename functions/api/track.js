function classifySource(referrer) {
  try {
    const h = new URL(referrer).hostname.toLowerCase();
    if (h.includes("facebook") || h.includes("fb.com") || h.includes("fb.watch") || h.includes("instagram")) return "Facebook / Instagram";
    if (h.includes("google.")) return "Google";
    if (h.includes("t.co") || h.includes("twitter") || h.includes("x.com")) return "X";
    if (h.includes("whatsapp")) return "WhatsApp";
    if (h.includes("t.me") || h.includes("telegram")) return "Telegram";
    if (h.includes("youtube")) return "YouTube";
    return h.replace(/^www\./, "");
  } catch { return "دخول مباشر"; }
}
function classifyBrowser(ua) {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/CriOS|Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "غير معروف";
}
function classifyDevice(ua) {
  if (/tablet|ipad/i.test(ua)) return "لوحي";
  if (/mobile|android|iphone/i.test(ua)) return "هاتف";
  return "حاسوب";
}
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const allowed = ["page_view", "purchase_click"];
    if (!allowed.includes(body.event)) return new Response("bad event", { status: 400 });
    const sid = String(body.session_id || "").slice(0, 80);
    const ref = String(request.headers.get("Referer") || "").slice(0, 500);
    const path = String(body.path || "/").slice(0, 200);
    const cf = request.cf || {};
    const country = String(cf.country || "غير معروف").slice(0, 80);
    const city = String(cf.city || "غير معروفة").slice(0, 100);
    const ua = request.headers.get("User-Agent") || "";
    const browser = classifyBrowser(ua);
    const device = classifyDevice(ua);
    const source = classifySource(ref);
    await env.ANALYTICS_DB.prepare(
      "INSERT INTO events (event_type, session_id, referrer, page_path, country, city, browser, device, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(body.event, sid, ref, path, country, city, browser, device, source).run();
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
  } catch {
    return new Response("tracking error", { status: 500 });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}