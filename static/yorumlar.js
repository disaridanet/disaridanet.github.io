/* Dışarıda — veli yorumları (etkinlik ve mekan detayında).
   Veri: Cloudflare Worker "disarida-yorumlar" (D1). Yalnızca onaylı yorumlar gösterilir;
   yeni yorumlar onay kuyruğuna düşer. Etkinlik anahtarı paylas.js'teki ?e= anahtarıyla aynı algoritmadır
   (yorum_key: başlık + mekan, tarih/saat yok), mekan anahtarı place id.
   Puan/yıldız yok: kısa not, isteğe bağlı yaş ve ad. */
(() => {
'use strict';

const API = (window.DISARIDA_YORUM_API || 'https://disarida-yorumlar.disaridanet.workers.dev').replace(/\/$/, '');
const TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const cache = new Map();          // "t|k" -> {at, data}
let ayar = null, ayarP = null, tsP = null, seq = 0;

function tarih(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${+m[3]} ${AYLAR[+m[2]-1]} ${m[1]}` : '';
}
/* Gizli form kontrolü (eski yıldız radyoları) veya odaktaki input, body/html'i
   kaydırırsa harita ~70px'e sıkışır, panel yukarı kaçar. Kaydırmayı geri al. */
function sayfaDuzelt(){
  const h = document.documentElement, b = document.body;
  if (h.scrollTop || h.scrollLeft || b.scrollTop || b.scrollLeft) {
    h.scrollTop = 0; h.scrollLeft = 0; b.scrollTop = 0; b.scrollLeft = 0;
  }
}
/* Anahtar: paylas.js eventKey() ile aynı algoritma (FNV-1a 64 bit, base36, 10 karakter).
   Yorumlar seansa değil gösteriye bağlıdır: tohumda tarih/saat boş, yalnızca başlık + mekan.
   Böylece aynı oyunun farklı seansları ve sonraki ayları da aynı yorumları paylaşır. */
const fold = s => String(s||'').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function fnv1a(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function yorumKey(e){
  if (e && e.yorum_key) return e.yorum_key;
  const seed = [fold(e.title || ''), '', '', fold(e.venue || '')].join('\t');
  const n = (BigInt(fnv1a(seed)) << 32n) | BigInt(fnv1a(seed + '\u0001'));
  return n.toString(36).padStart(13, '0').slice(0, 10);
}
function getAyar(){
  if (ayar) return Promise.resolve(ayar);
  if (!ayarP) ayarP = fetch(API + '/api/yorumlar/ayar').then(r => r.json()).then(j => (ayar = j)).catch(() => { ayarP = null; return { acik: false }; });
  return ayarP;
}
async function getList(t, k, taze){
  const ck = t + '|' + k, c = cache.get(ck);
  if (!taze && c && Date.now() - c.at < 60000) return c.data;
  const r = await fetch(`${API}/api/yorumlar?t=${t}&k=${encodeURIComponent(k)}`, taze ? { cache: 'reload' } : {});
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'hata');
  cache.set(ck, { at: Date.now(), data: j });
  return j;
}
function loadTurnstile(){
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!tsP) tsP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = TS_SRC; s.async = true; s.defer = true;
    s.onload = () => res(window.turnstile); s.onerror = () => { tsP = null; rej(new Error('turnstile')); };
    document.head.appendChild(s);
  });
  return tsP;
}

function iskelet(baslik){
  const sec = document.createElement('section');
  sec.className = 'yorumlar';
  sec.id = 'yorumlar';
  sec.setAttribute('aria-labelledby', 'yr-baslik');
  sec.innerHTML = `<div class="yr-hd"><h2 id="yr-baslik">Veli yorumları</h2><div class="yr-ozet" aria-live="polite"></div></div>
    <p class="yr-alt">${esc(baslik)}</p>
    <div class="yr-liste"><div class="yr-bos">Yorumlar yükleniyor…</div></div>
    <div class="yr-form-yer"></div>`;
  sec.addEventListener('focusin', sayfaDuzelt);
  return sec;
}
function ozetCiz(sec, j){
  const o = sec.querySelector('.yr-ozet');
  const n = j.count || 0;
  o.textContent = n ? (n === 1 ? '1 yorum' : n + ' yorum') : '';
}
function listeCiz(sec, j){
  const L = sec.querySelector('.yr-liste');
  if (!j.items.length){ L.innerHTML = '<div class="yr-bos">Henüz onaylı yorum yok. İlk yorumu siz yazın.</div>'; return; }
  L.innerHTML = j.items.map(y => `<article class="yr-kart">
      ${y.age ? `<div class="yr-ust"><span class="yr-etiket">${esc(y.age)}</span></div>` : ''}
      <p class="yr-metin">${esc(y.text)}</p>
      <div class="yr-kim">${esc(y.name || 'Bir veli')} · ${esc(tarih(y.date))}</div>
    </article>`).join('');
}

function formCiz(sec, hedef, a){
  const yer = sec.querySelector('.yr-form-yer');
  if (!a.acik){
    yer.innerHTML = '<p class="yr-not">Yorum gönderimi yakında açılacak.</p>';
    return;
  }
  yer.innerHTML = `<button type="button" class="yr-ac">Yorum yaz</button>`;
  yer.querySelector('.yr-ac').onclick = () => formAc(sec, hedef, a);
}
function formAc(sec, hedef, a){
  const yer = sec.querySelector('.yr-form-yer');
  const yasOpt = (a.yaslar || []).map(y => `<option>${esc(y)}</option>`).join('');
  yer.innerHTML = `<form class="yr-form" novalidate>
    <label class="yr-lbl" for="yr-metin">Kısa notunuz</label>
    <textarea id="yr-metin" name="metin" rows="3" maxlength="${a.max||500}" placeholder="Örn. Gittik, 4 yaş için uygundu, otopark yok." required></textarea>
    <div class="yr-sayac"><span>0</span> / ${a.max||500}</div>
    <div class="yr-satir">
      <label>Çocuğun yaşı <small>(isteğe bağlı)</small><select name="yas"><option value="">Seçmeyin</option>${yasOpt}</select></label>
      <label>Adınız <small>(isteğe bağlı)</small><input name="ad" maxlength="${a.maxAd||40}" placeholder="Bir veli" autocomplete="off"></label>
    </div>
    <div class="yr-ts"></div>
    <div class="yr-hata" role="alert"></div>
    <button type="submit" class="yr-gonder">Gönder</button>
    <p class="yr-aydinlatma">Yorumunuz onaylandıktan sonra metin, yaş etiketi ve yazdıysanız adınızla birlikte herkese açık görünür. E-posta istemiyoruz. Kötüye kullanımı önlemek için IP adresinizin geri çevrilemez bir özeti 7 gün saklanır; doğrulama için Cloudflare Turnstile kullanılır. Çocuğunuzun adını, telefon ya da adres yazmayın. Yorumunuzun silinmesi için Instagram'dan <a href="https://www.instagram.com/disaridanet/" target="_blank" rel="noopener">@disaridanet</a>'e yazabilirsiniz.</p>
  </form>`;
  const f = yer.querySelector('form');
  const ta = f.querySelector('textarea'), sayac = f.querySelector('.yr-sayac span'), hata = f.querySelector('.yr-hata');
  ta.oninput = () => { sayac.textContent = ta.value.length; };
  let token = '', wid = null;
  loadTurnstile().then(ts => {
    wid = ts.render(f.querySelector('.yr-ts'), { sitekey: a.sitekey, action: 'yorum', language: 'tr', theme: 'light',
      callback: t => { token = t; }, 'expired-callback': () => { token = ''; }, 'error-callback': () => { token = ''; } });
    sayfaDuzelt();
  }).catch(() => { hata.textContent = 'Doğrulama yüklenemedi. Sayfayı yenileyip tekrar deneyin.'; });
  try { ta.focus({ preventScroll: true }); } catch (_) { /* eski tarayıcı */ }
  sayfaDuzelt();
  f.onsubmit = async ev => {
    ev.preventDefault();
    hata.textContent = '';
    const metin = ta.value.trim();
    if (metin.length < (a.min||10)) { hata.textContent = `En az ${a.min||10} karakter yazın.`; return; }
    if (!token) { hata.textContent = 'Doğrulamanın tamamlanmasını bekleyin.'; return; }
    const btn = f.querySelector('.yr-gonder'); btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    try {
      const r = await fetch(API + '/api/yorumlar', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: hedef.t, k: hedef.k, text: metin, age: f.yas.value || null, name: f.ad.value.trim() || null,
          token, title: hedef.title, venue: hedef.venue, date: hedef.date }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok){
        yer.innerHTML = '<div class="yr-tamam"><b>Teşekkürler!</b> Yorumunuz onaylandıktan sonra görünecek.</div>';
        sayfaDuzelt();
        return;
      }
      hata.textContent = j.mesaj || 'Yorum gönderilemedi. Biraz sonra tekrar deneyin.';
    } catch (_){
      hata.textContent = 'Bağlantı kurulamadı. Biraz sonra tekrar deneyin.';
    }
    btn.disabled = false; btn.textContent = 'Gönder';
    token = '';
    try { if (window.turnstile && wid != null) window.turnstile.reset(wid); } catch (_){}
    sayfaDuzelt();
  };
}

async function bagla(hedef, baslik){
  const body = document.getElementById('panel-body');
  if (!body || !hedef.k) return;
  const my = ++seq;
  const eski = body.querySelector('section.yorumlar'); if (eski) eski.remove();
  const sec = iskelet(baslik);
  body.appendChild(sec);
  getAyar().then(a => { if (my === seq && sec.isConnected) formCiz(sec, hedef, a); });
  try {
    const j = await getList(hedef.t, hedef.k);
    if (my !== seq || !sec.isConnected) return;
    ozetCiz(sec, j); listeCiz(sec, j);
  } catch (_){
    if (my !== seq || !sec.isConnected) return;
    sec.querySelector('.yr-liste').innerHTML = '<div class="yr-bos">Yorumlar şu anda yüklenemedi.</div>';
  }
}

function onEvent(e){
  if (!e) return;
  bagla({ t: 'event', k: yorumKey(e), title: e.title, venue: e.venue || '', date: e.start_date || '' },
        'Gidenlerin kısa notları. Bu gösterinin tüm seansları için ortaktır.');
}
function onPlace(p){
  if (!p || !p.id) return;
  bagla({ t: 'place', k: String(p.id), title: p.name, venue: p.district || '', date: '' },
        'Bu mekana gidenlerin kısa notları.');
}

window.__yorumlar = { onEvent, onPlace, yorumKey, API };
})();
