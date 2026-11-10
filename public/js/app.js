// Dastkaari – frontend logic. Questions and workers load from public/data/*.json (SEEDED demo data, see README).
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let DATA, CITIES = [], WORKERS = [];
const S = { q: 0, answers: [], trade: null, city: 'isb', area: 'all', tr: 'all', worker: null, price: 1200, rating: 0, before: null };

// ---------- helpers ----------
const pos = p => Math.min(100, Math.max(0, (p - 400) / 16));        // Rs 400–2000 → 0–100%
const dist = m => (m < 1000 ? `${m} میٹر` : `${(m / 1000).toFixed(1)} کلومیٹر`);
const meter = p => `<div class="meter"><i style="left:${pos(p)}%"></i></div>`;
const bars = n => Array.from({ length: n }, () => `<b style="--h:${6 + (Math.random() * 24 | 0)}px"></b>`).join('');
const icons = () => lucide.createIcons();
const chip = (attr, key, label, icon, on) =>
  `<button class="chip ${on ? 'on' : ''}" data-${attr}="${key}">${icon ? `<i data-lucide="${icon}" class="h-4 w-4"></i>` : ''}${label}</button>`;
const tradeChips = (attr, cur, withAll) =>
  (withAll ? chip(attr, 'all', 'سب', 'layout-grid', cur === 'all') : '') +
  Object.entries(DATA.trades).map(([k, t]) => chip(attr, k, t.ur, t.icon, cur === k)).join('');

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('opacity-0');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.add('opacity-0'), 2600);
}

// ---------- voice out: recorded mp3 first, browser Urdu voice as fallback ----------
let voice, cur;
const pickVoice = () => { voice = speechSynthesis.getVoices().find(v => /^ur/i.test(v.lang)); };
speechSynthesis.onvoiceschanged = pickVoice; pickVoice();
function say(text) {
  speechSynthesis.cancel();
  if (!voice) return toast('اس فون میں اردو آواز نہیں ہے۔ audio فائلیں شامل کریں');
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang;
  speechSynthesis.speak(u);
}
function play(file, text) {
  cur?.pause(); speechSynthesis.cancel();
  let used = false; const fb = () => { if (!used) { used = true; say(text); } };
  cur = new Audio(file);
  cur.onerror = fb;                       // missing or 0-byte mp3 -> browser voice
  cur.play().catch(fb);
}
const APP = ['test', 'profile', 'request', 'workers', 'deal', 'proof'];
$('#speak').onclick = () => { const id = location.hash.slice(1); play(`audio/${APP.includes(id) ? id : 'home'}.mp3`, $('#speak').dataset.say || ''); };
$('#hear').onclick = () => $('#speak').click();
$('#menuBtn').onclick = () => $('#menu').classList.toggle('hidden');
$('#menu').onclick = () => $('#menu').classList.add('hidden');

// ---------- routing (one page, one hash per screen) ----------
const go = id => { location.hash = id; };
function show(id) {
  const isApp = APP.includes(id);
  $('#landing').classList.toggle('hidden', isApp);
  $('#app').classList.toggle('hidden', !isApp);
  $('#menu').classList.add('hidden');
  if (isApp) {
    $$('.screen').forEach(x => x.classList.toggle('hidden', x.id !== id));
    const x = $('#' + id);
    $('#title').textContent = x.dataset.title;
    $('#sub').textContent = x.dataset.sub;
    $('#speak').dataset.say = x.dataset.say || '';
    ({ test: () => renderQ(), profile: renderProfile, workers: renderWorkers, deal: renderDeal, proof: renderProof })[id]?.();
    scrollTo(0, 0);
  } else {
    $('#speak').dataset.say = $('#landing').dataset.say;
    const el = id !== 'home' && $('#' + id);
    el ? el.scrollIntoView() : scrollTo(0, 0);
  }
  icons();
}
addEventListener('hashchange', () => DATA && show(location.hash.slice(1) || 'home'));
$('#back').onclick = () => (history.length > 1 ? history.back() : go('home'));
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go);
  const t = e.target.closest('[data-pick]'); if (t) { S.tr = t.dataset.pick; S.area = 'all'; go('workers'); }
});
function renderLanding() {
  $('#sW').textContent = WORKERS.length; $('#sC').textContent = CITIES.length; $('#sT').textContent = Object.keys(DATA.trades).length;
  $('#tradeGrid').innerHTML = Object.entries(DATA.trades).map(([k, t]) => {
    const n = WORKERS.filter(w => w.trade === k).length;
    return `<button data-pick="${k}" class="tcard"><span class="tic"><i data-lucide="${t.icon}" class="h-6 w-6"></i></span><b class="text-lg">${t.ur}</b><small>${t.en} · ${n} کاریگر</small></button>`;
  }).join('');
}
$('#contactForm').onsubmit = async e => {
  e.preventDefault();
  try {
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    if (!r.ok) throw 0;
    e.target.reset(); toast('پیغام مل گیا۔ شکریہ!');
  } catch { toast('پیغام نہیں گیا۔ دوبارہ کوشش کریں'); }
};

// ---------- worker: adaptive oral test ----------
// step 1 asks the profession; the next questions depend on it (years + 2 trade-specific ones)
const steps = () => {
  const t = DATA.trades[S.trade];
  const first = [{ t: DATA.ask, f: 'q0' }];
  return t ? [...first, { t: DATA.yrs, f: 'q1' }, ...t.qs.map((x, i) => ({ t: x, f: S.trade + (i + 1) }))] : first;
};
const detect = text => Object.keys(DATA.trades).find(k => DATA.trades[k].keys.some(w => text.includes(w)));
function setTrade(k) {
  if (S.trade !== k) S.answers.length = 1;      // a new profession means new follow-up questions
  S.trade = k; S.answers[0] = DATA.trades[k].ur;
  renderQ(true); icons();
}
function renderQ(quiet) {
  const st = steps(), now = st[S.q] || st[0], total = S.trade ? st.length : 4;
  $('#qn').textContent = S.q + 1; $('#qt').textContent = total;
  $('#qtext').textContent = now.t;
  $('#heard').textContent = S.answers[S.q] || '';
  $('#next').disabled = S.q === 0 ? !S.trade : !S.answers[S.q];
  $('#wave').innerHTML = bars(44);
  $('#tradePick').classList.toggle('hidden', S.q !== 0);
  $('#tradePick').innerHTML = tradeChips('t', S.trade, false);
  $('#dots').innerHTML = Array.from({ length: total }, (_, i) => `<i data-lucide="sun" class="h-6 w-6 ${i <= S.q ? 'fill-sun' : ''}"></i>`).join('');
  if (!quiet) play(`audio/${now.f}.mp3`, now.t);
}
$('#tradePick').onclick = e => { const b = e.target.closest('[data-t]'); if (b) setTrade(b.dataset.t); };
$('#qspeak').onclick = () => { const n = steps()[S.q]; play(`audio/${n.f}.mp3`, n.t); };

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec;
$('#mic').onclick = () => {
  if (rec) return rec.stop();
  if (!SR) {
    toast(S.q === 0 ? 'آواز کے لیے Chrome استعمال کریں، یا نیچے سے اپنا کام چنیں' : 'آواز کے لیے Chrome استعمال کریں');
    if (S.q > 0) { S.answers[S.q] = '(آواز ریکارڈ ہوئی)'; $('#next').disabled = false; }
    return;
  }
  rec = new SR();
  rec.lang = 'ur-PK';
  rec.interimResults = true;
  rec.onresult = e => {
    const t = [...e.results].map(r => r[0].transcript).join(' ');
    $('#heard').textContent = t;
    if (S.q === 0) { const k = detect(t); if (k) setTrade(k); S.answers[0] = t; return; }
    S.answers[S.q] = t; $('#next').disabled = !t.trim();
  };
  rec.onerror = () => toast('آواز نہیں آئی، دوبارہ بولیں');
  rec.onend = () => {
    rec = null; $('#mic').classList.remove('live'); $('#wave').classList.remove('on');
    if (S.q === 0 && !S.trade) toast('سمجھ نہیں آیا۔ نیچے سے اپنا کام چنیں');
  };
  rec.start();
  $('#mic').classList.add('live'); $('#wave').classList.add('on');
};
$('#next').onclick = () => {
  if (S.q < steps().length - 1) { S.q++; renderQ(); icons(); } else go('profile');
};

// ---------- worker: profile + free / busy ----------
function renderProfile() {
  const t = DATA.trades[S.trade || 'electrician'];
  $('#pName').textContent = `رفیق احمد · ${t.ur}`;
  $('#pEn').textContent = `Rafiq Ahmed · ${t.en} · Ustaad (demo)`;
  $$('#profile .slot').forEach((s, i) => { if (!s.classList.contains('has')) seed(s, `images/work${i + 1}.jpeg`); });
}
function setMode(free) {
  WORKERS.find(w => w.id === 1).free = free;     // Rafiq's status is shared with the customer list
  $('#bFree').dataset.on = free; $('#bBusy').dataset.on = !free;
}
$('#bFree').onclick = () => setMode(true);
$('#bBusy').onclick = () => setMode(false);

// ---------- photos ----------
// seeded demo photos: used only if the file exists in public/images
function seed(slot, url) {
  const im = new Image();
  im.onload = () => { slot.style.backgroundImage = `url(${url})`; slot.classList.add('has'); };
  im.src = url;
}
document.addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (!f || e.target.type !== 'file') return;
  const url = URL.createObjectURL(f), slot = e.target.closest('.slot');
  slot.style.backgroundImage = `url(${url})`; slot.classList.add('has');
  if (slot.dataset.keep === 'before') { S.before = url; $('#aiCard').classList.remove('hidden'); icons(); }
});

// ---------- customer: find workers by city, area and trade ----------
function renderWorkers() {
  const city = CITIES.find(c => c.id === S.city);
  $('#cities').innerHTML = CITIES.map(c =>
    `<button class="tile flex-1 ${c.id === S.city ? 'on' : ''}" data-city="${c.id}">${c.ur}<small>${c.en}</small></button>`).join('');
  $('#tiles').innerHTML = [{ id: 'all', ur: 'سب علاقے', en: 'All areas' }, ...city.areas].map(a =>
    `<button class="tile ${a.id === S.area ? 'on' : ''}" data-area="${a.id}">${a.ur}<small>${a.en}</small></button>`).join('');
  $('#trades').innerHTML = tradeChips('tr', S.tr, true);
  const rows = WORKERS
    .filter(w => w.city === S.city && (S.area === 'all' || w.area === S.area) && (S.tr === 'all' || w.trade === S.tr))
    .sort((a, b) => b.free - a.free || a.m - b.m);
  $('#count').textContent = `${rows.length} کاریگر ملے · فری کاریگر پہلے`;
  $('#list').innerHTML = rows.map(w => {
    const area = city.areas.find(a => a.id === w.area).ur, t = DATA.trades[w.trade];
    return `
    <button class="card ${w.free ? '' : 'opacity-60'}" data-id="${w.id}">
      <span class="grid h-12 w-12 shrink-0 place-items-center self-start rounded-full bg-${['sky', 'mint', 'blush', 'lilac'][w.id % 4]} text-teal"><i data-lucide="${t.icon}"></i></span>
      <span class="flex-1 space-y-1">
        <span class="flex items-center gap-2"><b class="text-lg">${w.name}</b>
          <em class="rounded-md bg-gold/60 px-2 text-sm not-italic">${w.level}</em></span>
        <span class="block text-sm text-ink/60">${t.ur} · ${w.yrs} سال · ${area}</span>
        <span class="flex flex-wrap gap-1">${w.skills.map(k => `<em class="rounded-md bg-cream px-2 text-sm not-italic ring-1 ring-gold">${k}</em>`).join('')}</span>
        <span class="flex items-center gap-2"><i class="inline-block h-2.5 w-2.5 rounded-full ${w.free ? 'bg-leaf' : 'bg-ember'}"></i>
          ${w.free ? 'فری ہیں' : 'مصروف'} · ${dist(w.m)}</span>
        ${meter(w.rate)}
      </span>
    </button>`;
  }).join('') || '<p class="py-10 text-center text-ink/60">یہاں ابھی کوئی کاریگر نہیں۔ دوسرا علاقہ یا کام چنیں۔</p>';
}
$('#filters').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.city) { S.city = b.dataset.city; S.area = 'all'; }
  else if (b.dataset.area) S.area = b.dataset.area;
  else if (b.dataset.tr) S.tr = b.dataset.tr;
  else return;
  renderWorkers(); icons();
};
$('#list').onclick = e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  const w = WORKERS.find(x => x.id == b.dataset.id);
  if (!w.free) return toast(`${w.name} ابھی مصروف ہیں`);
  S.worker = w; go('deal');
};

// ---------- deal ----------
function renderDeal() {
  S.worker ||= WORKERS[0];
  $('#dealJob').textContent = DATA.trades[S.worker.trade].job;
  $('#dealWho').textContent = S.worker.name;
  $('#dealMark').style.left = pos(S.price) + '%';
  $('#warn').classList.toggle('hidden', S.price < 1500);
  $$('.price').forEach(b => b.dataset.on = b.dataset.p == S.price);
  $('#vnWave').innerHTML = bars(26);
  seed($('#dealPhoto'), S.before || 'images/before.jpeg');
}
$('#prices').onclick = e => { const b = e.target.closest('[data-p]'); if (b) { S.price = +b.dataset.p; renderDeal(); } };
$('#vn').onclick = () => { $('#vnWave').classList.add('on'); say('جناب، میں آج شام تک پہنچ جاؤں گا'); setTimeout(() => $('#vnWave').classList.remove('on'), 2500); };
$('#agree').onclick = () => {
  S.worker.free = false;                         // booked: the worker drops out of every "free" list
  toast(`بکنگ پکی ہو گئی · ${S.worker.name} اب مصروف ہیں`);
  go('proof');
};
$('#later').onclick = () => go('workers');

// ---------- proof ----------
function renderProof() {
  $('#paid').textContent = S.price;
  $('#paidMark').style.left = pos(S.price) + '%';
  seed($('#pBefore'), S.before || 'images/before.jpeg');
  if (!$('#pAfter').classList.contains('has')) seed($('#pAfter'), 'images/after.jpeg');
  const draw = () => {
    $('#stars').innerHTML = [1, 2, 3, 4, 5].map(n =>
      `<button data-r="${n}" aria-label="${n}"><i data-lucide="sun" class="h-7 w-7 ${n <= S.rating ? 'fill-sun' : ''}"></i></button>`).join('');
    icons();
  };
  draw();
  $('#stars').onclick = e => { const b = e.target.closest('[data-r]'); if (b) { S.rating = +b.dataset.r; draw(); } };
}
const finish = () => { toast('شکریہ! آپ کی رائے محفوظ ہو گئی'); setTimeout(() => go('home'), 1200); };
$('#good').onclick = finish;
$('#poor').onclick = finish;

// ---------- start: load seeded data, then show the screen ----------
Promise.all([fetch('data/questions.json').then(r => r.json()), fetch('data/workers.json').then(r => r.json())])
  .then(([q, w]) => { DATA = q; CITIES = w.cities; WORKERS = w.workers; renderLanding(); show(location.hash.slice(1) || 'home'); })
  .catch(() => toast('ڈیٹا لوڈ نہیں ہوا۔ server چلائیں: node server.js'));