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

## Deploy
This folder is a static Cloudflare Pages site. Set build command empty and output directory to `nova-ai`, or deploy this folder's contents as the project root. Add an API Worker URL later in NOVA Settings. Keep all provider keys on the server as Worker secrets.

## Next steps
1. Verify the static deployment and test on Android Chrome.
2. Test microphone/speech output with multiple Bluetooth headsets.
3. Create a Cloudflare Worker `/chat` endpoint using an available AI binding or an explicitly configured provider.
4. Add rate limiting and usage controls before public access.
5. Implement Google Cast / TV integration only after testing official supported APIs.
