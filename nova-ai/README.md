# NOVA AI — MVP 0.1

Mobile-first Arabic/English/French voice-assistant PWA prototype.

## Current capabilities
- Text chat with clearly labeled local demo replies.
- Browser speech recognition where supported; browser speech synthesis for spoken replies.
- Uses the phone's normal Android audio route. A paired Bluetooth headset may act as mic/speaker when browser and Android support it.
- No always-on listening and no audio recording/storage.
- Optional configurable Worker endpoint; frontend contains no API keys.
- TV integration preview only; no false claim of TV connectivity.

## Important limitations
- Web Speech recognition support varies by browser and may use a browser/cloud recognition service. Demo replies are local and not an AI model.
- A PWA cannot guarantee background listening or direct access to headset internals.
- TV control requires device-specific official APIs, compatible network/account permissions, and testing.

## Gemini backend
- Cloudflare Pages Function: `functions/api/chat.js` (route `/api/chat`).
- Model: `gemini-3.5-flash-lite` via Google's `generateContent` API.
- Add a Cloudflare Pages Secret named `GEMINI_API_KEY` before testing. Never put the key in frontend code, GitHub, or the NOVA settings field.
- The frontend defaults to `/api/chat`; the settings field is only for changing the endpoint.
- `GET /api/chat` reports whether the secret is configured; `POST /api/chat` sends chat requests to Gemini.
- The function limits message/history sizes and output tokens. Add proper rate limiting and abuse protection before public launch.

## Next steps
1. Verify the static deployment and test on Android Chrome.
2. Test microphone/speech output with multiple Bluetooth headsets.
3. Add `GEMINI_API_KEY` as an encrypted Pages Secret and test `/api/chat`.
4. Add rate limiting and usage controls before public access.
5. Implement Google Cast / TV integration only after testing official supported APIs.
