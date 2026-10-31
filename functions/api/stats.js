const KEY = "qbg-stats-2026-10-31-private";
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== KEY) return new Response("unauthorized", { status: 401 });
  const totals = await env.ANALYTICS_DB.prepare("SELECT SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS views, SUM(CASE WHEN event_type='purchase_click' THEN 1 ELSE 0 END) AS clicks FROM events WHERE created_at >= datetime('now','-30 days')").first();
  const rows = await env.ANALYTICS_DB.prepare("SELECT date(created_at) AS day, SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS views, SUM(CASE WHEN event_type='purchase_click' THEN 1 ELSE 0 END) AS clicks FROM events WHERE created_at >= datetime('now','-30 days') GROUP BY date(created_at) ORDER BY day DESC").all();
  const views = Number(totals?.views || 0), clicks = Number(totals?.clicks || 0);
  return Response.json({ views, clicks, rate: views ? (clicks * 100 / views).toFixed(1) : "0.0", days: rows.results || [] }, { headers: { "Cache-Control": "no-store" } });
}