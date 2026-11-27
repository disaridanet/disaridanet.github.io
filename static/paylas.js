/* Dışarıda — okul ve kreş gruplarına paylaşım kartı.
   Derin link: https://disarida.net/?e=<anahtar>
   Anahtar, id değil; başlık + başlangıç tarihi + saat (varsa) + mekân (fold) üzerinden kararlı bir özet. */
(() => {
'use strict';

const SITE = 'https://disarida.net/';
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUN = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const KEEP = new Set(['İBB','CKM','BMKM','KKM','AKM','PSM','CRR','BKSM','BAKSM','ACU','MOİ','DJ','TV','II','III','IV','VR','3D']);
const PAPER = '#f3ead9', PAPER2 = '#faf4e8', INK = '#2c241d', INK2 = '#5f554b', MUTE = '#8d8377', RUST = '#b0502a', RUST_D = '#8e3b1c', LINE = '#cdbda3';

const fold = s => String(s||'').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function nice(t){
  return String(t||'').split(/(\s+)/).map(w => {
    const letters = w.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g,'');
    if (letters.length > 2 && letters === letters.toLocaleUpperCase('tr') && !KEEP.has(letters)) {
      const l = w.toLocaleLowerCase('tr'); return l.charAt(0).toLocaleUpperCase('tr') + l.slice(1);
    }
    return w;
  }).join('');
}
function dlong(iso){
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d)) return iso;
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()} ${GUN[d.getDay()]}`;
}
function tarihSatiri(e){
  let d = (e.end_date && e.end_date !== e.start_date) ? `${dlong(e.start_date)} – ${dlong(e.end_date)}` : dlong(e.start_date);
  if (e.start_time) d += ((e.end_date && e.end_date !== e.start_date) ? ' · saat ' : ', saat ') + e.start_time + (e.end_time ? '–' + e.end_time : '');
  return d;
}
function yasText(e){
  if (e.age_label) return String(e.age_label).trim();
  if (!e.age_known) return null;
  const lo = e.age_min, hi = e.age_max;
  const fmt = a => String(a).replace('.', ',');
  if (hi == null) return `${fmt(lo ?? 0)}+ yaş`;
  if (!lo) return `${fmt(hi)} yaşa kadar`;
  return `${fmt(lo)}–${fmt(hi)} yaş`;
}
function ucretText(e){
  if (e.is_free === 1) return 'Ücretsiz';
  if (e.price_per_person_try) return 'Kişi başı ' + Number(e.price_per_person_try).toLocaleString('tr-TR') + ' ₺';
  const notes = e.price_notes ? String(e.price_notes).trim() : '';
  if (notes && notes.length <= 80) return notes;
  if (e.is_free === 0) return 'Ücretli';
  return null;
}
function fnv1a(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function eventSeed(e){
  return [fold(e.title || ''), e.start_date || '', e.start_time || '', fold(e.venue || '')].join('\t');
}
function eventKey(e){
  const seed = eventSeed(e);
  const n = (BigInt(fnv1a(seed)) << 32n) | BigInt(fnv1a(seed + '\u0001'));
  return n.toString(36).padStart(13, '0').slice(0, 10);
}
function findByKey(key){
  const evs = (window.__S && window.__S.events) || [];
  if (!key) return null;
  const hits = evs.filter(e => eventKey(e) === key);
  if (!hits.length) return null;
  hits.sort((a, b) => {
    const so = (a.sold_out === 1) - (b.sold_out === 1);
    if (so) return so;
    return String(a.start_time || '').localeCompare(String(b.start_time || ''));
  });
  return hits[0];
}
function shareUrl(e){
  return SITE + '?e=' + eventKey(e);
}
function paylasMetni(e){
  const lines = ['*' + nice(e.title) + '*', ''];
  const tarih = tarihSatiri(e);
  if (tarih) lines.push('Tarih: ' + tarih);
  if (e.venue) lines.push('Mekan: ' + e.venue);
  if (e.district) lines.push('İlçe: ' + e.district);
  const ucret = ucretText(e);
  if (ucret) lines.push('Ücret: ' + ucret);
  const yas = yasText(e);
  if (yas) lines.push('Yaş: ' + yas);
  lines.push('', 'Ayrıntılar ve harita: ' + shareUrl(e));
  return lines.join('\n');
}
function slug(t){
  return (fold(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'etkinlik');
}

function setParam(key){
  try {
    const u = new URL(location.href);
    if (key) u.searchParams.set('e', key);
    else u.searchParams.delete('e');
    const next = u.pathname + u.search + u.hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, '', next);
  } catch (_){}
}

function icoMsg(size=18, color='currentColor'){
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>`;
}
function icoX(size=16){
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
}

/* ---------- canvas kart ---------- */
function wrapText(ctx, text, maxWidth){
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words){
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width <= maxWidth) line = t;
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
function fitTitle(ctx, text, maxWidth, maxLines, maxPx, minPx){
  let size = maxPx;
  let lines = [];
  while (size >= minPx){
    ctx.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
    lines = wrapText(ctx, text, maxWidth);
    const widest = Math.max(...lines.map(l => ctx.measureText(l).width));
    if (lines.length <= maxLines && widest <= maxWidth) break;
    size -= 4;
  }
  if (lines.length > maxLines){
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    let t = last;
    while (t.length && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    lines[maxLines - 1] = t + '…';
  }
  return {size, lines};
}
function drawRoundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}
function paperNoise(ctx, w, h){
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4){
    const n = (Math.random() * 14) - 7;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i+1] = Math.max(0, Math.min(255, d[i+1] + n * .9));
    d[i+2] = Math.max(0, Math.min(255, d[i+2] + n * .7));
  }
  ctx.putImageData(img, 0, 0);
}
async function waitFonts(){
  try {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('italic 600 80px "Cormorant Garamond"'),
      document.fonts.load('600 80px "Cormorant Garamond"'),
      document.fonts.load('italic 500 40px "Cormorant Garamond"'),
      document.fonts.load('600 28px Inter'),
      document.fonts.load('500 24px Inter')
    ]);
  } catch (_){}
}
async function cizKart(e){
  await waitFonts();
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  paperNoise(ctx, W, H);

  ctx.fillStyle = PAPER2;
  drawRoundRect(ctx, 48, 48, W-96, H-96, 18);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  drawRoundRect(ctx, 64, 64, W-128, H-128, 12);
  ctx.stroke();

  const midX = W/2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = RUST;
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '10px';
  ctx.fillText('DIŞARIDA', midX, 150);
  ctx.letterSpacing = '0px';

  ctx.fillStyle = INK2;
  ctx.font = 'italic 500 34px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Şehirde ne var?', midX, 196);

  ctx.fillStyle = RUST;
  ctx.font = '20px serif';
  ctx.fillText('◆   ◆   ◆', midX, 250);

  if (e.cat_label){
    ctx.fillStyle = RUST;
    ctx.font = '600 20px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(String(e.cat_label).toLocaleUpperCase('tr'), midX, 320);
    ctx.letterSpacing = '0px';
  }

  const title = nice(e.title);
  const fitted = fitTitle(ctx, title, W - 200, 5, 86, 44);
  ctx.fillStyle = INK;
  ctx.font = `italic 600 ${fitted.size}px "Cormorant Garamond", Georgia, serif`;
  const titleTop = 390;
  const lh = fitted.size * 0.98;
  fitted.lines.forEach((ln, i) => ctx.fillText(ln, midX, titleTop + i * lh));
  let y = titleTop + fitted.lines.length * lh + 36;

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(180, y); ctx.lineTo(W-180, y); ctx.stroke();
  y += 70;

  const rows = [];
  const tarih = tarihSatiri(e);
  if (tarih) rows.push(['TARİH', tarih]);
  if (e.venue) rows.push(['MEKAN', e.venue]);
  if (e.district) rows.push(['İLÇE', e.district]);
  const ucret = ucretText(e);
  if (ucret) rows.push(['ÜCRET', ucret]);
  const yas = yasText(e);
  if (yas) rows.push(['YAŞ', yas]);

  const labelX = 200, valueX = 400, maxVal = W - 200;
  rows.forEach(([lab, val]) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = RUST;
    ctx.font = '600 18px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '3px';
    ctx.fillText(lab, labelX, y);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = INK;
    ctx.font = '600 32px "Cormorant Garamond", Georgia, serif';
    const vLines = wrapText(ctx, val, maxVal - valueX);
    vLines.forEach((ln, i) => ctx.fillText(ln, valueX, y + i * 38));
    y += Math.max(56, vLines.length * 38 + 18);
  });

  // yırtma çizgisi ve alt bilgi
  const footY = H - 170;
  ctx.setLineDash([6, 10]);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(130, footY); ctx.lineTo(W-130, footY); ctx.stroke();
  ctx.setLineDash([]);

  // delikli kenar noktaları
  ctx.fillStyle = PAPER;
  for (let i = 0; i < 11; i++){
    const py = 160 + i * ((H - 280) / 10);
    ctx.beginPath(); ctx.arc(48, py, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(W-48, py, 7, 0, Math.PI*2); ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = RUST_D;
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('disarida.net', midX, H - 110);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = MUTE;
  ctx.font = 'italic 500 22px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Okul ve kreş gruplarıyla paylaşın', midX, H - 72);

  return new Promise((resolve, reject) => {
    c.toBlob(b => b ? resolve(b) : reject(new Error('Kart üretilemedi')), 'image/png');
  });
}

/* ---------- arayüz ---------- */
let _sheet = null, _toastT = 0, _urlTimer = 0;

function toast(msg){
  let el = document.getElementById('paylas-toast');
  if (!el){ el = document.createElement('div'); el.id = 'paylas-toast'; el.className = 'paylas-toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on');
  clearTimeout(_toastT); _toastT = setTimeout(() => el.classList.remove('on'), 2200);
}
function isMobile(){
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ((navigator.maxTouchPoints||0) > 1 && window.innerWidth < 901);
}
function kapatSheet(){
  if (_sheet){ _sheet.remove(); _sheet = null; }
  document.removeEventListener('keydown', onEsc);
}
function onEsc(ev){ if (ev.key === 'Escape') kapatSheet(); }

async function kopyala(text){
  try {
    await navigator.clipboard.writeText(text);
    toast('Metin kopyalandı');
    return true;
  } catch (_){
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly',''); ta.style.cssText='position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove();
      if (ok) { toast('Metin kopyalandı'); return true; }
    } catch(__){}
  }
  toast('Kopyalanamadı, metni elinizle seçin');
  return false;
}
function indirPng(blob, title){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'disarida-' + slug(title) + '.png';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function waHref(text){ return 'https://wa.me/?text=' + encodeURIComponent(text); }

async function nativeShare(e, blob, text){
  if (!navigator.share) return false;
  const data = { title: nice(e.title), text };
  try {
    if (blob && navigator.canShare){
      const file = new File([blob], 'disarida-' + slug(e.title) + '.png', {type:'image/png'});
      if (navigator.canShare({files:[file]})) {
        await navigator.share({ title: data.title, text, files:[file] });
        return true;
      }
    }
    await navigator.share(data);
    return true;
  } catch (err){
    if (err && err.name === 'AbortError') return true;
    return false;
  }
}

async function acSheet(e){
  kapatSheet();
  const text = paylasMetni(e);
  const wrap = document.createElement('div');
  wrap.className = 'paylas-wrap';
  wrap.setAttribute('role', 'presentation');
  wrap.innerHTML = `<div class="paylas-dlg" role="dialog" aria-modal="true" aria-labelledby="paylas-baslik">
    <button type="button" class="paylas-x" aria-label="Kapat">${icoX(18)}</button>
    <div class="paylas-hd">
      <div class="kicker">GRUBA GÖNDER</div>
      <h2 id="paylas-baslik">Paylaşım kartı</h2>
      <p>WhatsApp grubuna görseli ve metni birlikte gönderebilirsiniz.</p>
    </div>
    <div class="paylas-body">
      <img class="paylas-kart-onizleme" alt="Paylaşım kartı önizlemesi" hidden>
      <pre class="paylas-metin">${esc(text)}</pre>
    </div>
    <div class="paylas-act">
      <button type="button" class="btn fill" data-act="paylas">${icoMsg(16,'#fff')} Paylaş</button>
      <a class="btn wa" data-act="wa" href="${esc(waHref(text))}" target="_blank" rel="noopener">${icoMsg(16)} WhatsApp</a>
      <button type="button" class="btn" data-act="indir">Görseli indir</button>
      <button type="button" class="btn" data-act="kopyala">Metni kopyala</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  _sheet = wrap;
  document.addEventListener('keydown', onEsc);
  wrap.addEventListener('click', ev => { if (ev.target === wrap) kapatSheet(); });
  wrap.querySelector('.paylas-x').onclick = kapatSheet;

  let blob = null;
  const img = wrap.querySelector('.paylas-kart-onizleme');
  try {
    blob = await cizKart(e);
    img.src = URL.createObjectURL(blob);
    img.hidden = false;
    img.onload = () => { try { URL.revokeObjectURL(img.src); } catch(_){} };
  } catch (err){
    console.warn('Paylaşım kartı çizilemedi', err);
  }

  wrap.querySelector('[data-act="indir"]').onclick = () => {
    if (blob) indirPng(blob, e.title);
    else toast('Görsel şu anda üretilemedi');
  };
  wrap.querySelector('[data-act="kopyala"]').onclick = () => kopyala(text);
  wrap.querySelector('[data-act="wa"]').addEventListener('click', ev => ev.stopPropagation());
  wrap.querySelector('[data-act="paylas"]').onclick = async () => {
    const ok = await nativeShare(e, blob, text);
    if (!ok) window.open(waHref(text), '_blank', 'noopener');
  };
}

function bindDetail(e){
  const body = document.getElementById('panel-body');
  if (!body || !e) return;
  const eskiWa = body.querySelector('.links.share a.wa');
  if (eskiWa) eskiWa.hidden = true;

  if (!body.querySelector('.btn-gruba')){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-gruba';
    btn.id = 'btn-gruba';
    btn.innerHTML = `${icoMsg(18,'#fff')}<span>Gruba gönder<small>WhatsApp görseli ve metni</small></span>`;
    const first = body.firstElementChild;
    if (first && first.tagName === 'IMG') first.insertAdjacentElement('afterend', btn);
    else body.insertBefore(btn, body.firstChild);
  }
  const btn = body.querySelector('.btn-gruba');
  if (btn) btn.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); acSheet(e); };
  setParam(eventKey(e));
}

function onReady(){
  const key = new URLSearchParams(location.search).get('e');
  if (key){
    const dlg = document.getElementById('homedlg');
    if (dlg && !dlg.hidden){ dlg.hidden = true; dlg.innerHTML = ''; }
    const ev = findByKey(key);
    if (ev && typeof window.__open === 'function'){
      window.__open(ev.id);
      const vx = document.getElementById('vt-x');
      if (vx) vx.click();
    } else if (key){
      toast('Bu bağlantıdaki etkinlik artık listede yok');
    }
  }
  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('a.wa');
    if (!a || (_sheet && _sheet.contains(a))) return;
    ev.preventDefault();
    ev.stopPropagation();
    const row = a.closest('[data-id]');
    const id = row ? +row.dataset.id : (window.__S && window.__S.detail && window.__S.detail.id);
    const evn = ((window.__S && window.__S.events) || []).find(x => x.id === id) || (window.__S && window.__S.detail);
    if (evn) acSheet(evn);
  }, true);

  clearInterval(_urlTimer);
  _urlTimer = setInterval(() => {
    const e = window.__S && window.__S.detail;
    const want = e ? eventKey(e) : null;
    const cur = new URLSearchParams(location.search).get('e');
    if ((cur || null) !== want) setParam(want);
  }, 500);
}

window.__paylas = {
  onReady, onDetail: bindDetail, eventKey, findByKey, paylasMetni, shareUrl, cizKart, acSheet, SITE
};
})();
