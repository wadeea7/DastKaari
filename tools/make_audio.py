# Generates all Urdu voice files once. Needs: pip install edge-tts (and internet).
# Run from the project root:  python tools/make_audio.py
import asyncio, json, edge_tts

Q = json.load(open("public/data/questions.json", encoding="utf-8"))
TEXTS = {"q0": Q["ask"], "q1": Q["yrs"]}
for key, trade in Q["trades"].items():
    for i, q in enumerate(trade["qs"], 1):
        TEXTS[f"{key}{i}"] = q
TEXTS.update({
 "home": "دستکاری میں خوش آمدید۔ کاریگر ہیں تو پہلا بٹن دبائیں۔ کاریگر چاہیے تو دوسرا بٹن دبائیں۔",
 "test": "بولنے کے لیے بڑا بٹن دبائیں اور جواب دیں۔",
 "profile": "آپ کا پروفائل تیار ہے۔ نیچے فری یا مصروف کا بٹن دبائیں۔",
 "request": "خراب چیز کی تصویر کھینچیں۔",
 "workers": "اپنا شہر اور علاقہ چنیں، پھر فری کاریگر پر دبائیں۔",
 "deal": "کاریگر کا پیغام سنیں اور قیمت چنیں۔",
 "proof": "پہلے اور بعد کی تصویر دیکھیں اور بتائیں کام کیسا تھا۔",
})

async def main():
    for name, text in TEXTS.items():
        await edge_tts.Communicate(text, "ur-PK-UzmaNeural").save(f"public/audio/{name}.mp3")
        print("saved", name)

asyncio.run(main())