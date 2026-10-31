export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const allowed = ["page_view", "purchase_click"];
    if (!allowed.includes(body.event)) return new Response("bad event", { status: 400 });
    const sid = String(body.session_id || "").slice(0, 80);
    const ref = String(request.headers.get("Referer") || "").slice(0, 500);
    const path = String(body.path || "/").slice(0, 200);
    await env.ANALYTICS_DB.prepare(
      "INSERT INTO events (event_type, session_id, referrer, page_path) VALUES (?, ?, ?, ?)"
    ).bind(body.event, sid, ref, path).run();
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
  } catch {
    return new Response("tracking error", { status: 500 });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}