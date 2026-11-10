# Dastkaari (دستکاری)

Proof-of-work marketplace for skilled trade workers in Islamabad, Rawalpindi and Wah Cantt. Built for CUI Tech Fest, AI Web Forge.

## Run
```
npm install
node server.js        # http://localhost:3000
```
Needs internet for the CDN assets (Tailwind, Lucide icons, Google Fonts).

## Stack
Node + Express (static server, `/api/contact`), plain JavaScript, Tailwind (CDN), Lucide icons, Noto Naskh Arabic and Noto Nastaliq Urdu (logo wordmark only).
Voice in: browser Web Speech API (Chrome, `ur-PK`). Voice out: recorded Urdu mp3 files in `public/audio`, with the browser's Urdu voice as a fallback.

## Seeded or mocked (not real)
- 25 workers, areas and rates (`public/data/workers.json`) are seeded demo data.
- The "AI" job card (trade, urgency, fair-rate range) and the "AI check" on the proof screen are static samples. No AI API is called yet.
- Skill level ("استاد") is a demo label. Booking and free/busy state live in the browser and reset on reload.
- Payments and ID checks are out of scope and mocked.
- The before and after photos are stock samples, not a matched pair.

## Audio
Run `pip install edge-tts` then `python tools/make_audio.py` (needs internet) to generate every voice file the app asks for. Missing or empty files fall back to the browser voice.

## Credits
Photos in `public/images` are placeholders. Replace `work2.jpeg` (it has a stock-site watermark) before publishing.
