const MODEL = "gemini-3.5-flash-lite";
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_ITEMS = 10;

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
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }
    });
  }

  if (request.method === "GET") {
    return json({
      ok: true,
      service: "NOVA AI Gemini gateway",
      configured: Boolean(env.GEMINI_API_KEY),
      model: MODEL
    }, 200, origin);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405, origin);
  if (!env.GEMINI_API_KEY) {
    return json({ error: "لم تتم إضافة مفتاح Gemini إلى Cloudflare بعد. أضفه باسم GEMINI_API_KEY ثم أعد النشر." }, 503, origin);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400, origin);
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  const language = ["ar", "en", "fr"].includes(input.language) ? input.language : "ar";
  if (!message) return json({ error: "اكتب رسالة أولاً." }, 400, origin);
  if (message.length > MAX_MESSAGE_CHARS) return json({ error: "الرسالة طويلة جدًا. اختصرها ثم أعد المحاولة." }, 413, origin);

  const suppliedHistory = Array.isArray(input.history) ? input.history.slice(-MAX_HISTORY_ITEMS) : [];
  const contents = suppliedHistory
    .filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content.slice(0, MAX_MESSAGE_CHARS) }]
    }));

  // The frontend history already includes the latest user message.
  if (!contents.length || contents[contents.length - 1].role !== "user" ||
      contents[contents.length - 1].parts[0].text !== message) {
    contents.push({ role: "user", parts: [{ text: message }] });
  }

  const languageInstruction = language === "ar"
    ? "أجب باللغة العربية الواضحة، وافهم الدارجة المغربية قدر الإمكان. كن مفيدًا ومباشرًا."
    : language === "fr"
      ? "Réponds en français clair, de façon utile et concise."
      : "Answer in clear, helpful English.";

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
          systemInstruction: { parts: [{ text: `You are NOVA AI, a helpful multilingual voice assistant. ${languageInstruction} Do not claim to control devices unless an integration is actually available.` }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
        })
      }
    );

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = data?.error?.message || "Gemini request failed.";
      return json({
        error: upstream.status === 429
          ? "وصلنا إلى حد الاستخدام المؤقت في Gemini. انتظر قليلًا ثم أعد المحاولة."
          : upstream.status === 400 || upstream.status === 404
            ? "رفض Gemini الطلب أو أن النموذج غير متاح لهذا المفتاح. تحقق من صلاحية المفتاح والنموذج."
            : "حدث خطأ أثناء الاتصال بـ Gemini.",
        providerStatus: upstream.status,
        detail: providerMessage.slice(0, 240)
      }, upstream.status === 429 ? 429 : 502, origin);
    }

    const answer = (data.candidates || [])
      .flatMap(candidate => candidate.content?.parts || [])
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) return json({ error: "لم يُرجع Gemini إجابة نصية. أعد المحاولة." }, 502, origin);
    return json({ response: answer, model: MODEL }, 200, origin);
  } catch {
    return json({ error: "تعذر الوصول إلى خدمة Gemini الآن. تحقق من الاتصال وحاول مجددًا." }, 502, origin);
  }
}
