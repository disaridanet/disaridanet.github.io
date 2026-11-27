/* Dışarıda — Ücretsiz bu hafta sonu listesi.
   Ana haritada #ucretsiz katmanı; bağımsız sayfada body.ucr-page ile aynı motor. */
(() => {
'use strict';

const LISTE = 'ucretsiz-haftasonu';
const SHARE_PATH = '/ucretsiz/';
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUN_KISA = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const CAT_NAME = {tiyatro:'Tiyatro & gösteri', atolye:'Atölye', muze:'Müze, bilim & sergi', spor:'Spor', konser:'Konser & müzik', doga:'Doğa & hayvan', festival:'Festival', diger:'Diğer'};
const KEEP = new Set(['İBB','CKM','BMKM','KKM','AKM','PSM','CRR','BKSM','BAKSM','ACU','MOİ','DJ','TV','II','III','IV','VR','3D']);

const fold = s => String(s||'').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
function fnv1a(str){
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function eventKey(e){
  const seed = [fold(e.title || ''), e.start_date || '', e.start_time || '', fold(e.venue || '')].join('\t');
  const n = (BigInt(fnv1a(seed)) << 32n) | BigInt(fnv1a(seed + '\u0001'));
  return n.toString(36).padStart(13, '0').slice(0, 10);
}


const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addDays = (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const istNow = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date()).map(x => [x.type, x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}`}; };

function nice(t){
  return String(t||'').split(/(\s+)/).map(w => {
    const letters = w.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g,'');
    if (letters.length > 2 && letters === letters.toLocaleUpperCase('tr') && !KEEP.has(letters)) {
      const l = w.toLocaleLowerCase('tr'); return l.charAt(0).toLocaleUpperCase('tr') + l.slice(1);
    }
    return w;
  }).join('');
}

/* Bu / gelecek hafta sonu: Cmt–Paz. Pazartesi–Cuma yaklaşan hafta sonunu,
   Cumartesi–Pazar içinde bulunulan hafta sonunu verir (Cuma akşamından itibaren bu hafta sonu). */
function weekendOf(today){
  const dow = new Date(today+'T12:00:00').getDay(); // 0 Pazar
  const sat = dow === 0 ? addDays(today, -1) : dow === 6 ? today : addDays(today, 6 - dow);
  return [sat, addDays(sat, 1)];
}
function rangeTxt(a, b){
  const da = new Date(a+'T12:00:00'), db = new Date(b+'T12:00:00');
  if (a === b) return `${da.getDate()} ${AYLAR[da.getMonth()]} ${GUN_KISA[da.getDay()]}`;
  return da.getMonth() === db.getMonth()
    ? `${da.getDate()}–${db.getDate()} ${AYLAR[db.getMonth()]}`
    : `${da.getDate()} ${AYLAR[da.getMonth()]} – ${db.getDate()} ${AYLAR[db.getMonth()]}`;
}
function dshort(iso){
  const d = new Date(iso+'T12:00:00');
  return `${d.getDate()} ${AYLAR[d.getMonth()].slice(0,3)} ${GUN_KISA[d.getDay()]}`;
}
function when(e){
  if (e.end_date && e.end_date !== e.start_date) {
    const a = dshort(e.start_date).replace(/ \S+$/,''), b = dshort(e.end_date).replace(/ \S+$/,'');
    return `${a} – ${b}`;
  }
  return dshort(e.start_date) + (e.start_time ? ' · ' + e.start_time : '');
}
function inWindow(e, a, b){
  const s = e.start_date, t = e.end_date || e.start_date;
  return s && s <= b && t >= a;
}
function passAud(e, opts){
  if (e.audience === 'yetiskin') return !!opts.showAdult;
  if (e.audience === 'belirsiz') return opts.showUnclear !== false;
  return true;
}
function collect(events, today, opts){
  const [a, b] = weekendOf(today);
  return (events || []).filter(e => e.is_free === 1 && inWindow(e, a, b) && passAud(e, opts));
}
function hiddenAdults(events, today, opts){
  const [a, b] = weekendOf(today);
  return (events || []).filter(e => e.is_free === 1 && inWindow(e, a, b) && e.audience === 'yetiskin' && !opts.showAdult).length;
}

function group(items){
  const sides = {Anadolu:[], Avrupa:[], '':[]};
  for (const e of items) {
    const s = e.side === 'Anadolu' || e.side === 'Avrupa' ? e.side : '';
    sides[s].push(e);
  }
  const cmp = (a, b) => (a.start_date||'').localeCompare(b.start_date||'')
    || (a.start_time||'').localeCompare(b.start_time||'')
    || (a.title||'').localeCompare(b.title||'', 'tr');
  const districts = (arr) => {
    const m = new Map();
    for (const e of arr) {
      const d = e.district || 'İlçe bilgisi yok';
      if (!m.has(d)) m.set(d, []);
      m.get(d).push(e);
    }
    for (const v of m.values()) v.sort(cmp);
    return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0], 'tr'));
  };
  const out = [];
  if (sides.Anadolu.length) out.push({key:'Anadolu', title:'Anadolu Yakası', items:sides.Anadolu, districts:districts(sides.Anadolu)});
  if (sides.Avrupa.length) out.push({key:'Avrupa', title:'Avrupa Yakası', items:sides.Avrupa, districts:districts(sides.Avrupa)});
  if (sides[''].length) out.push({key:'', title:'Yaka bilgisi yok', items:sides[''], districts:districts(sides[''])});
  return out;
}

const ICO = {
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6 12 2 8 6"/><path d="M12 2v13"/></svg>'
};

const STANDALONE = document.body.classList.contains('ucr-page');
let openFlag = false, pushed = false, toastTimer = 0, attached = false, standaloneEvents = null, standaloneToday = null;

function ctx(){
  if (STANDALONE) {
    return {
      events: standaloneEvents || [],
      today: standaloneToday || istNow().date,
      showAdult: false,
      showUnclear: true,
      ready: standaloneEvents != null
    };
  }
  const S = window.__S;
  if (!S || !S.data || !S.events) return {events:[], today:istNow().date, showAdult:false, showUnclear:true, ready:false};
  return {
    events: S.events,
    today: S.data.today || istNow().date,
    showAdult: !!(S.age && S.age.showAdult),
    showUnclear: !S.age || S.age.showUnclear !== false,
    ready: true
  };
}

function shareUrl(){
  try { return new URL(SHARE_PATH, location.origin).href; } catch(_) { return 'https://disarida.net/ucretsiz/'; }
}
function hasListeParam(){
  try { return new URLSearchParams(location.search).get('liste') === LISTE; } catch(_) { return false; }
}
function urlHasEntry(){
  try { return new URLSearchParams(location.search).get('liste') === LISTE; } catch(_) { return false; }
}
function setListeParam(on, how){
  const u = new URL(location.href);
  if (on) u.searchParams.set('liste', LISTE);
  else u.searchParams.delete('liste');
  const url = u.pathname + u.search + u.hash;
  if (how === 'push') history.pushState({ucretsiz: on}, '', url);
  else history.replaceState({ucretsiz: on}, '', url);
}

function cardHtml(e, sideKey){
  const venue = e.venue || 'Mekan: Bilgi bulunamadı';
  const cat = CAT_NAME[e.cat_group] || e.cat_label || '';
  const sideCls = sideKey === 'Avrupa' ? 'is-avrupa' : (sideKey === 'Anadolu' ? 'is-anadolu' : '');
  const go = STANDALONE ? 'Haritada aç' : 'Haritada göster';
  return `<button type="button" class="ucr-card ${sideCls}" data-id="${esc(e.id)}" aria-label="${esc(nice(e.title))}, ${esc(when(e))}, ${esc(venue)}">
    <span class="ucr-mark" aria-hidden="true"></span>
    <span class="ucr-card-body">
      ${cat ? `<span class="ucr-cat">${esc(cat)}</span>` : ''}
      <span class="ucr-name">${esc(nice(e.title))}</span>
      <span class="ucr-meta"><b>${esc(when(e))}</b></span>
      <span class="ucr-venue">${esc(venue)}${e.district ? ' · ' + esc(e.district) : ''}</span>
      <span class="ucr-go">${go} →</span>
    </span>
  </button>`;
}

function renderList(){
  const root = $('#ucretsiz'); if (!root) return;
  const c = ctx();
  const [a, b] = weekendOf(c.today);
  const items = collect(c.events, c.today, c);
  const hid = hiddenAdults(c.events, c.today, c);
  const groups = group(items);
  const title = 'Ücretsiz bu hafta sonu';
  const dates = rangeTxt(a, b);
  const sub = items.length
    ? `${items.length} ücretsiz etkinlik`
    : (c.ready ? 'Bu hafta sonu için işaretlenmiş ücretsiz etkinlik yok' : 'Liste yükleniyor…');

  const body = !c.ready
    ? `<div class="ucr-empty"><p>Liste yükleniyor…</p></div>`
    : (!items.length
      ? `<div class="ucr-empty"><p>Bu hafta sonu için işaretlenmiş ücretsiz etkinlik bulunamadı.</p><small>Yalnızca kaynağında ücretsiz olduğu doğrulanan etkinlikler listelenir.</small></div>`
      : groups.map(g => `<section class="ucr-side" aria-label="${esc(g.title)}">
          <div class="ucr-side-h"><h2>${esc(g.title)}</h2><small>${g.items.length}</small></div>
          ${g.districts.map(([d, evs]) => `<h3 class="ucr-ilce">${esc(d)}</h3><div class="ucr-list">${evs.map(e => cardHtml(e, g.key)).join('')}</div>`).join('')}
        </section>`).join(''))
      + (hid ? `<p class="ucr-note">${hid} yetişkin etkinliği gizli.${STANDALONE ? '' : ' <button type="button" id="ucr-adult">Göster</button>'}</p>` : '');

  const shareBtn = `<button type="button" class="ucr-share" id="ucr-share" title="Liste bağlantısını paylaş">${ICO.share}<span class="ucr-share-l">Paylaş</span></button>`;
  const closeBtn = STANDALONE
    ? `<a class="ucr-back" href="/" title="Haritaya dön">Haritaya dön</a>`
    : `<button type="button" class="ucr-x" id="ucr-x" aria-label="Listeyi kapat" title="Kapat">${ICO.x}</button>`;

  root.innerHTML = `<div class="ucr-sheet" role="dialog" aria-modal="${STANDALONE ? 'false' : 'true'}" aria-labelledby="ucr-title">
    <header class="ucr-head">
      <div class="ucr-kick">DIŞARIDA</div>
      <h1 class="ucr-title" id="ucr-title">${title}</h1>
      <p class="ucr-dates">${esc(dates)}</p>
      <p class="ucr-sub">${esc(sub)}</p>
      <div class="ucr-actions">${shareBtn}${closeBtn}</div>
    </header>
    <div class="ucr-body">${body}</div>
    <div class="ucr-toast" hidden></div>
  </div>`;

  root.querySelectorAll('.ucr-card').forEach(btn => btn.addEventListener('click', () => onCard(+btn.dataset.id)));
  $('#ucr-share', root)?.addEventListener('click', ev => { ev.preventDefault(); doShare(title, dates, items.length); });
  $('#ucr-x', root)?.addEventListener('click', () => close());
  $('#ucr-adult', root)?.addEventListener('click', showAdults);

  if (STANDALONE) {
    document.title = `${title} · ${dates} — Dışarıda`;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', ogDesc(dates, items.length));
  }
}

function ogDesc(dates, n){
  const sayi = n ? `${n} ücretsiz aile etkinliği` : 'ücretsiz aile etkinlikleri';
  return `İstanbul'da ${dates} hafta sonu ${sayi}. Tarih, mekan ve harita — Dışarıda.`;
}

function onCard(id){
  if (!id) return;
  if (STANDALONE) {
    const ev = (standaloneEvents || []).find(x => x.id === id);
    const key = ev ? eventKey(ev) : String(id);
    location.href = '/?e=' + encodeURIComponent(key);
    return;
  }
  close();
  if (typeof window.__open === 'function') window.__open(id);
}

function showAdults(){
  const S = window.__S;
  if (!S || !S.age) return;
  S.age.showAdult = true;
  try { localStorage.setItem('radar.age', JSON.stringify(S.age)); } catch(_){}
  renderList();
}

function showToast(msg){
  const t = $('#ucretsiz .ucr-toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

async function doShare(title, dates, n){
  const url = shareUrl();
  const text = `${title} · ${dates}\n${ogDesc(dates, n)}\n${url}`;
  if (navigator.share) {
    try { await navigator.share({title: `${title} · ${dates}`, text: ogDesc(dates, n), url}); return; }
    catch (err) { if (err && err.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(url);
    showToast('Bağlantı kopyalandı');
  } catch(_) {
    showToast(url);
  }
}

function injectVitrinLink(){
  const head = $('.vt-head');
  if (!head || head.querySelector('#vt-ucretsiz')) return;
  let row = head.querySelector('.vt-ucretsiz-row');
  if (!row) { row = document.createElement('div'); row.className = 'vt-ucretsiz-row'; head.appendChild(row); }
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'vt-ucretsiz';
  b.className = 'vt-ucretsiz';
  b.textContent = 'Ücretsiz hafta sonu →';
  b.title = 'Ücretsiz bu hafta sonu etkinlikleri';
  b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); open(); });
  row.appendChild(b);
}

function bindChrome(){
  const btn = $('#btn-ucretsiz');
  if (btn && !btn.dataset.ucrBound) {
    btn.dataset.ucrBound = '1';
    btn.addEventListener('click', ev => { ev.preventDefault(); open(); });
  }
  const vt = $('#vitrin');
  if (vt && !vt.dataset.ucrObs) {
    vt.dataset.ucrObs = '1';
    new MutationObserver(injectVitrinLink).observe(vt, {childList:true});
    injectVitrinLink();
  }
}

function open(fromUrl){
  const root = $('#ucretsiz'); if (!root) return;
  renderList();
  if (STANDALONE) { openFlag = true; root.hidden = false; return; }
  if (openFlag) return;
  openFlag = true;
  root.hidden = false;
  root.classList.add('ucr-root');
  document.body.classList.add('ucr-open');
  if (!fromUrl && !hasListeParam()) { pushed = true; setListeParam(true, 'push'); }
  else { pushed = false; if (!hasListeParam()) setListeParam(true, 'replace'); }
  $('#ucr-x', root)?.focus();
}

function close(opts){
  const silent = opts && opts.silent;
  const root = $('#ucretsiz');
  if (!openFlag && root && root.hidden) return;
  openFlag = false;
  if (root) { root.hidden = true; }
  document.body.classList.remove('ucr-open');
  if (silent || STANDALONE) return;
  if (pushed) { pushed = false; history.back(); }
  else if (hasListeParam()) setListeParam(false, 'replace');
}

function onPop(){
  if (STANDALONE) return;
  if (hasListeParam()) open(true);
  else close({silent:true});
}

function refresh(){
  bindChrome();
  if (openFlag || STANDALONE || (document.body.classList.contains('ucr-page'))) renderList();
  else injectVitrinLink();
}

function attach(){
  bindChrome();
  if (!attached) {
    attached = true;
    window.addEventListener('popstate', onPop);
    if (!STANDALONE) {
      document.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && openFlag) { ev.preventDefault(); ev.stopImmediatePropagation(); close(); }
      }, true);
    }
  }
  if (STANDALONE) { open(true); return {fromUrl:true}; }
  if (hasListeParam()) { open(true); return {fromUrl:true}; }
  injectVitrinLink();
  return {fromUrl:false};
}

async function bootStandalone(){
  const STATIC = document.querySelector('meta[name="disarida-static"]')?.content === '1';
  const url = STATIC ? '/data/events.json' : '/api/events';
  try {
    const r = await fetch(url, {cache:'no-cache'});
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    let ev = d.events || [];
    const n = istNow();
    ev = ev.filter(e => {
      const last = e.end_date || e.start_date;
      if (last < n.date) return false;
      if (!e.end_date && e.start_date === n.date && e.start_time && e.start_time < n.time) return false;
      return true;
    });
    standaloneEvents = ev;
    standaloneToday = d.today || n.date;
  } catch (err) {
    console.warn('Ücretsiz liste verisi yüklenemedi', err);
    standaloneEvents = [];
    standaloneToday = istNow().date;
  }
  attach();
}

window.DisaridaUcretsiz = {
  attach, refresh, open, close,
  isOpen: () => openFlag,
  fromUrl: urlHasEntry,
  weekendOf, collect, rangeTxt
};

if (STANDALONE) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootStandalone);
  else bootStandalone();
} else if (document.readyState !== 'loading') {
  bindChrome();
}
})();
