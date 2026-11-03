const MODEL = "gemini-3.8-flash-tts";
const MAX_TEXT_CHARS = 1800;

function json(data, status = 200, origin = "") {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function allowedOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return "";
  try {
    const url = new URL(origin);
    if (url.hostname === "nova-ai-assistant.pages.dev" || url.hostname.endsWith(".nova-ai-assistant.pages.dev")) return origin;
  } catch {}
  return null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = allowedOrigin(request);
  if (origin === null) return json({ error: "Origin not allowed." }, 403);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }
    });
  }

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (!env.GEMINI_API_KEY) return json({ error: "مفتاح Gemini غير مضبوط في Cloudflare." }, 503, origin);

  let input;
  try { input = await request.json(); }
  catch { return json({ error: "Invalid JSON request." }, 400, origin); }

  const text = typeof input.text === "string" ? input.text.trim() : "";
  const dialect = input.dialect === "ma" ? "ma" : "msa";
  if (!text) return json({ error: "لا يوجد نص لتحويله إلى صوت." }, 400, origin);
  if (text.length > MAX_TEXT_CHARS) return json({ error: "النص طويل جدًا للصوت. قسّمه إلى أجزاء أقصر." }, 413, origin);

  const style = dialect === "ma"
    ? "Speak naturally in Moroccan Darija (Moroccan Arabic), with authentic everyday Moroccan pronunciation and a warm, clear, friendly conversational delivery. Do not use Egyptian Arabic. Read the supplied Arabic text as spoken Moroccan Darija while preserving its meaning."
    : "Speak in clear, natural Modern Standard Arabic (الفصحى), with warm, calm, articulate delivery and natural pauses. Do not use an artificial or robotic cadence.";

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{
              text,
              speech_metadata: { style }
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { voice: "Kore" }
            }
          }
        })
      }
    );

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = data?.error?.message || "Gemini TTS request failed.";
      return json({
        error: upstream.status === 429
          ? "وصلنا إلى حد الاستخدام المجاني للصوت. انتظر حتى تتجدد الحصة ثم أعد المحاولة."
          : "تعذر إنشاء الصوت من Gemini.",
        providerStatus: upstream.status,
        detail: detail.slice(0, 240)
      }, upstream.status === 429 ? 429 : 502, origin);
    }

    const parts = (data.candidates || []).flatMap(c => c.content?.parts || []);
    const audioPart = parts.find(p => p.inlineData?.data);
    if (!audioPart) return json({ error: "لم يُرجع Gemini ملفًا صوتيًا." }, 502, origin);

    const binary = Uint8Array.from(atob(audioPart.inlineData.data), c => c.charCodeAt(0));
    return new Response(binary, {
      status: 200,
      headers: {
        "Content-Type": audioPart.inlineData.mimeType || "audio/wav",
        "Cache-Control": "no-store",
        ...(origin ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {})
      }
    });
  } catch {
    return json({ error: "تعذر الاتصال بخدمة الصوت. تحقق من الإنترنت وحاول مجددًا." }, 502, origin);
  }
}
