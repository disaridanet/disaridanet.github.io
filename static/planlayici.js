/* Dışarıda — Hafta sonu planlayıcı (t114).
   Tamamen istemci taraflı: app.js'in yüklediği etkinlik (window.__S.events) ve yer (window.__S.places) verisini kullanır.
   Rota: sabah bir etkinlik → öğle yemeği (yakındaki AVM) → öğleden sonra park/oyun alanı ya da ikinci etkinlik.
   Paylaşım: ?plan=1&yas=5&ilce=Çekmeköy&gun=2026-11-28[&ucretsiz=1][&kapali=1][&konum=41.03,29.17]&d=<kalıcı anahtarlar>
   Etkinlik anahtarı id değil (id'ler her DB yenilemesinde değişiyor): başlık+saat+mekan kısaltması. Yer anahtarı: OSM/kaynak kimliği. */
(() => {
'use strict';
const DC = {"Adalar":[40.8742,29.1293],"Arnavutköy":[41.1845,28.7412],"Ataşehir":[40.9929,29.1135],"Avcılar":[40.9799,28.7217],"Bahçelievler":[41.0031,28.8658],"Bakırköy":[40.9783,28.8744],"Bayrampaşa":[41.0346,28.9118],"Bağcılar":[41.0345,28.8568],"Başakşehir":[41.1076,28.7951],"Beykoz":[41.1343,29.092],"Beylikdüzü":[41.0038,28.6373],"Beyoğlu":[41.0284,28.9737],"Beşiktaş":[41.0428,29.0075],"Büyükçekmece":[41.0217,28.5798],"Esenler":[41.0376,28.8825],"Esenyurt":[41.0343,28.6801],"Eyüpsultan":[41.0478,28.9327],"Fatih":[41.0064,28.9759],"Gaziosmanpaşa":[41.0578,28.9122],"Güngören":[41.0253,28.8727],"Kadıköy":[40.9913,29.0246],"Kartal":[40.8885,29.1859],"Kağıthane":[41.0812,28.973],"Küçükçekmece":[40.9919,28.7712],"Maltepe":[40.9248,29.1311],"Pendik":[40.8769,29.235],"Sancaktepe":[40.9905,29.2289],"Sarıyer":[41.1686,29.0573],"Silivri":[41.0742,28.2482],"Sultanbeyli":[40.967,29.2671],"Sultangazi":[41.1043,28.8614],"Tuzla":[40.8162,29.3034],"Zeytinburnu":[40.9899,28.9037],"Çatalca":[41.1437,28.4605],"Çekmeköy":[41.0352,29.1739],"Ümraniye":[41.0256,29.0963],"Üsküdar":[41.0266,29.0151],"Şile":[41.1744,29.6125],"Şişli":[41.0638,28.9832]};
const DISTRICTS = Object.keys(DC).sort((a, b) => a.localeCompare(b, 'tr'));
const XI = {   // Lucide (ISC) — icons.js'de olmayanlar
  route:'<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  utensils:'<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  left:'<path d="m15 18-6-6 6-6"/>'};
const ico = (k, size = 14, color = 'currentColor') => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${XI[k] || (window.LUCIDE || {})[k] || ''}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = s => String(s || '').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const slug = (s, n) => fold(s).replace(/[^a-z0-9]/g, '').slice(0, n);
const KEEP = new Set(['İBB','CKM','BMKM','KKM','AKM','PSM','CRR','BKSM','BAKSM','ACU','MOİ','DJ','TV','II','III','IV','VR','3D']);
function nice(t){   // app.js'teki büyük harf düzeltmesinin sadeleştirilmiş hali
  t = String(t || '').trim(); const letters = t.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
  if (letters.length < 4 || letters !== letters.toLocaleUpperCase('tr')) return t;
  return t.toLocaleLowerCase('tr').replace(/(^|[\s"'(«“-])(\S)/g, (m, a, b) => a + b.toLocaleUpperCase('tr')).split(' ').map(w => KEEP.has(w.toLocaleUpperCase('tr')) ? w.toLocaleUpperCase('tr') : w).join(' ');
}
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const dt = iso => new Date(iso + 'T12:00:00');
const addDays = (iso, n) => { const d = dt(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const dayLabel = iso => { const d = dt(iso); return `${GUNLER[d.getDay()]} ${d.getDate()} ${AYLAR[d.getMonth()]}`; };
const dayShort = iso => { const d = dt(iso); return `${GUNLER[d.getDay()].slice(0, 3).replace('Cum', d.getDay() === 6 ? 'Cmt' : 'Cum')} ${d.getDate()} ${AYLAR[d.getMonth()].slice(0, 3)}`; };
const toMin = t => { if (!t) return null; const m = /^(\d{1,2}):(\d{2})/.exec(t); return m ? +m[1] * 60 + +m[2] : null; };
const hhmm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const ceil5 = m => Math.ceil(m / 5) * 5;
function hav(a, b){ const R = 6371.0088, r = Math.PI / 180, dp = (b.lat - a.lat) * r, dl = (b.lon - a.lon) * r;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dl / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
const carMin = km => Math.max(5, ceil5(km * 1.3 / 32 * 60));   // app.js ile aynı kaba tahmin (yol katsayısı 1,3 · 32 km/sa)
const kmTxt = km => (Math.round(km * 10) / 10).toLocaleString('tr-TR');
const durTxt = m => m % 60 === 0 ? `${m / 60} saat` : m > 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`;
const gmDir = (a, b) => `https://www.google.com/maps/dir/?api=1${a ? `&origin=${a.lat},${a.lon}` : ''}&destination=${b.lat},${b.lon}&travelmode=driving`;
const gmFood = p => `https://www.google.com/maps/search/restoran/@${p.lat},${p.lon},16z`;

/* ---------- yer sınıfları (places.json alt türleri) ---------- */
const PARK_SUB = new Set(['Park', 'Oyun parkı', 'Millet Bahçesi', 'Bahçe / yeşil alan', 'Piknik / mesire alanı', 'Mesire alanı', 'Botanik bahçesi']);
const INDOOR_SUB = new Set(['Kapalı oyun alanı', 'Akvaryum', 'Trambolin parkı', 'Planetaryum', 'Oyun salonu', 'Buz pisti', 'Bowling', 'Müze']);
const OUT_SUB = new Set(['Oyun parkı', 'Tema / lunapark', 'Su parkı', 'Mini golf', 'Park']);
const isMall = p => p.cat === 'avm' && (String(p.id).startsWith('src-mall') || (p.subtypes || []).includes('AVM'));
const isPark = p => (p.cat === 'park' || p.cat === 'cocuk') && (p.subtypes || []).some(s => PARK_SUB.has(s));
const isIndoorPlace = p => (p.subtypes || []).some(s => INDOOR_SUB.has(s));
const isKidPlace = p => p.cat === 'cocuk' && !(p.subtypes || []).every(s => OUT_SUB.has(s));

/* ---------- durum ---------- */
const P = {open:false, min:false, step:'form', ages:[], origin:null, day:null, free:false, indoor:false, keys:[null, null, null], stops:null, markers:[], warn:[]};
const S = () => window.__S;
const map = () => window.__map;
const ready = () => !!(window.__ready && window.__S && S().data && S().events && S().places && S().places.length);

function dayOptions(){
  const T = S().data.today, dow = dt(T).getDay(), out = [];
  let sat = dow === 6 ? T : addDays(T, (6 - dow + 7) % 7);
  if (dow === 0) out.push(T);   // pazar günü: bugün + sonraki hafta sonu
  for (let w = 0; w < 2; w++) { out.push(addDays(sat, 7 * w)); out.push(addDays(sat, 7 * w + 1)); }
  return [...new Set(out)].filter(d => d >= T).slice(0, 4);
}

/* ---------- etkinlik anahtarı ve uygunluk ---------- */
const evKey = e => 'e' + slug(e.title, 26) + '.' + (e.start_time || '').replace(':', '') + '.' + slug(e.venue || e.district, 10);
const plKey = p => 'p' + p.id;
const onDay = (e, D) => e.start_date <= D && (e.end_date || e.start_date) >= D;
const multi = e => !!(e.end_date && e.end_date !== e.start_date);
const soldOutNote = e => /t[uü]kendi/i.test(e.session_notes || '');
function ageCheck(e){   // true: uygun, null: bilinmiyor, false: uygun değil
  if (e.audience === 'yetiskin') return false;
  if (!P.ages.length) return true;
  const lo = Math.min(...P.ages), hi = Math.max(...P.ages);
  if (!e.age_known) return null;
  return (e.age_min ?? 0) <= lo && (e.age_max ?? 99) >= hi;
}
function evBase(e, D){
  if (e.lat == null || !onDay(e, D) || e.sold_out === 1) return null;
  const a = ageCheck(e); if (a === false) return null;
  if (P.free && e.is_free !== 1) return null;
  if (P.indoor && e.indoor_outdoor === 'acik') return null;
  const notes = []; let sc = 0;
  if (a === true && P.ages.length) sc += 4;
  else if (a === null) { if (e.audience === 'aile') { sc += 1; notes.push('Yaş bilgisi yok'); } else { sc -= 4; notes.push('Yaş / hedef kitle bilgisi yok'); } }
  if (P.indoor && e.indoor_outdoor !== 'kapali') notes.push('Kapalı/açık mekan bilgisi yok');
  if (soldOutNote(e)) { sc -= 6; notes.push('Kaynakta “Biletler tükendi” ibaresi var'); }
  if ((S().data.featured || []).some(f => (f.ids || []).includes(e.id))) sc += 3;
  if (e.is_free === 1) sc += .5;
  return {sc, notes};
}
/* Etkinliğin o günkü saati: tek günlük kayıtta seans saati kesin; çok günlü kayıtta kaynaktaki saat (her gün aynı mı bilinmiyor) */
function evTime(e){
  const t = toMin(e.start_time);
  if (t == null) return {t:null, exact:false, note: multi(e) ? 'Saat bilgisi yok (çok günlü etkinlik)' : 'Seans saati bilinmiyor, kaynağa bakın'};
  if (multi(e)) return {t, exact:false, note:`Kaynakta ${e.start_time} yazıyor; o günkü saati kaynaktan doğrulayın`};
  return {t, exact:true, note:null};
}
function evDur(e){ return e.duration_minutes ? {d:e.duration_minutes, est:false} : {d:90, est:true}; }

/* ---------- aday listeleri ---------- */
function cands1(o, D){   // sabah: 09:30–13:00 arası başlayan etkinlik, başlangıca yakın
  const out = [];
  for (const e of S().events) {
    const b = evBase(e, D); if (!b) continue;
    const tm = evTime(e), km = hav(o, e);
    if (km > 30) continue;
    let t = tm.t, sc = b.sc - km * .9;
    if (t == null) { if (!multi(e)) continue; t = 600; sc -= 2; }   // tek günlük saatsiz kayıtlar rota için kullanılmaz
    if (t < 570 || t > 780) continue;
    if (!tm.exact) sc -= 1;
    if (t > 720) sc -= 3; else if (t > 660) sc -= 1;   // “sabah” durağı: 12:00 sonrası seanslar geride
    out.push({kind:'e', key:evKey(e), e, lat:e.lat, lon:e.lon, km, t, tm, sc, notes:[...b.notes, tm.note].filter(Boolean)});
  }
  if (out.length) return out.sort((a, b) => b.sc - a.sc);
  return placeCands(o, 600, 12, 'sabah');   // sabah etkinliği yoksa yakın park / oyun alanı
}
function lunchCands(a, t){   // öğle: yakındaki AVM (places.json, AVM katmanı)
  const out = [];
  for (const p of S().places) {
    if (!isMall(p)) continue;
    const km = hav(a, p); if (km > 6) continue;
    out.push({kind:'p', key:plKey(p), p, lat:p.lat, lon:p.lon, km, t, sc: -km - (km < .35 ? -3 : 0), same: km < .35});
  }
  return out.sort((x, y) => y.sc - x.sc);
}
function placeCands(a, t, maxKm, slot){
  const out = [];
  for (const p of S().places) {
    let ok = P.indoor ? isIndoorPlace(p) : (isPark(p) || isKidPlace(p) || isIndoorPlace(p));
    if (!ok) continue;
    if (P.free && (p.fee === 'yes' || !isPark(p))) continue;
    const km = hav(a, p); if (km > maxKm) continue;
    let sc = -km * 1.3 + Math.min(3, Math.log1p(p.area_ha || 0));
    const st = p.subtypes || [];
    if (st.includes('Millet Bahçesi')) sc += 3;
    if (st.includes('Oyun parkı') || st.includes('Kapalı oyun alanı')) sc += 2;
    if (isKidPlace(p)) sc += 1.5;
    if (st.length === 1 && st[0] === 'Park' && (p.area_ha || 0) < 1) sc -= 2;   // küçük mahalle parkları geride
    if (st.includes('Müze')) sc -= 1;
    out.push({kind:'p', key:plKey(p), p, lat:p.lat, lon:p.lon, km, t, sc, slot});
  }
  return out.sort((x, y) => y.sc - x.sc);
}
function cands3(a, arrive, D, used){   // öğleden sonra: ikinci etkinlik (varıştan sonra, en geç 17:30) ya da park / oyun alanı
  const ev = [];
  for (const e of S().events) {
    if (used.has(slug(e.title, 26))) continue;
    const b = evBase(e, D); if (!b) continue;
    const tm = evTime(e), km = hav(a, e); if (km > 10) continue;
    let t = tm.t, sc = b.sc - km * 1.1 + 1.5;
    const reach = arrive + carMin(km);
    if (t == null) { if (!multi(e)) continue; t = reach; sc -= 2; }
    if (tm.exact && (t < reach || t > 1050)) continue;
    if (!tm.exact && t > 1050) continue;
    if (!tm.exact) { t = Math.max(t, reach); sc -= 1; }
    ev.push({kind:'e', key:evKey(e), e, lat:e.lat, lon:e.lon, km, t, tm, sc, notes:[...b.notes, tm.note].filter(Boolean)});
  }
  const pl = placeCands(a, arrive, 5, 'ogleden').map(c => ({...c, t: ceil5(arrive + carMin(c.km))}));
  return [...ev, ...pl].sort((x, y) => y.sc - x.sc);
}
function pick(list, key, skip){
  const ok = list.filter(c => !skip || !skip.has(c.key));
  return ok.find(c => c.key === key) || ok[0] || null;
}

/* ---------- plan kur ---------- */
function build(){
  const o = P.origin, D = P.day; P.warn = [];
  const L1 = cands1(o, D), s1 = pick(L1, P.keys[0]);
  if (P.keys[0] && s1 && s1.key !== P.keys[0]) P.warn.push('Paylaşılan plandaki sabah durağı artık listede yok; yerine yenisi önerildi.');
  if (!s1) { P.stops = null; P.lists = null; return; }
  s1.km0 = hav(o, s1); s1.role = 0;
  let end1;
  if (s1.kind === 'e') { const du = evDur(s1.e); s1.dur = du.d; s1.durEst = du.est; end1 = s1.t + s1.dur; }
  else { s1.dur = 90; s1.durEst = true; s1.t = 600; end1 = 690; }
  const L2 = lunchCands(s1, end1);
  let s2 = pick(L2, P.keys[1]);
  if (P.keys[1] && s2 && s2.key !== P.keys[1]) P.warn.push('Paylaşılan plandaki öğle durağı artık listede yok; yerine yenisi önerildi.');
  const leg2 = s2 ? (s2.km < .35 ? 5 : carMin(s2.km)) : 0;
  // etkinlik 12:45 ve sonrasındaysa öğle yemeği önce: etkinlik mekanının yakınında yenir, sonra seansa geçilir
  let lunchFirst = s1.kind === 'e' && s1.t >= 765 && (s1.t - 15 - leg2 - 60) >= 690;
  if (s2) { s2.dur = 60; s2.t = lunchFirst ? Math.floor((s1.t - 15 - leg2 - 60) / 5) * 5 : Math.max(ceil5(end1 + leg2), 720); }
  else s2 = {kind:'x', key:null, lat:s1.lat, lon:s1.lon, km:0, dur:60, t: lunchFirst ? s1.t - 90 : Math.max(ceil5(end1), 720)};
  s2.role = 1; s2.before = lunchFirst;
  const anchor = lunchFirst || s2.kind === 'x' ? s1 : s2, anchorEnd = lunchFirst ? end1 : s2.t + s2.dur;
  const used = new Set(s1.kind === 'e' ? [slug(s1.e.title, 26)] : []);
  const L3 = cands3(anchor, anchorEnd, D, used), skip3 = new Set([s1.key]);
  const s3 = pick(L3, P.keys[2], skip3);
  if (P.keys[2] && s3 && s3.key !== P.keys[2]) P.warn.push('Paylaşılan plandaki öğleden sonra durağı artık listede yok; yerine yenisi önerildi.');
  if (s3) { s3.role = 2; if (s3.kind === 'e') { const du = evDur(s3.e); s3.dur = du.d; s3.durEst = du.est; } else { s3.dur = 90; s3.durEst = true; } }
  P.stops = (lunchFirst ? [s2, s1, s3] : [s1, s2, s3]).filter(Boolean);
  P.lists = [L1, L2, L3];
  P.keys = [s1.key, s2.key, s3 ? s3.key : null];
}
function swap(i){
  const L = P.lists[i]; if (!L || L.length < 2) return;
  const skip = i === 2 ? new Set([P.keys[0]]) : null;
  const ok = L.filter(c => !skip || !skip.has(c.key));
  const j = ok.findIndex(c => c.key === P.keys[i]);
  P.keys[i] = ok[(j + 1) % ok.length].key;
  build(); render(); draw(); syncUrl();
}

/* ---------- URL ---------- */
const PKEYS = ['plan', 'yas', 'ilce', 'konum', 'gun', 'ucretsiz', 'kapali', 'd'];
function planUrl(){
  const u = new URL(location.href); PKEYS.forEach(k => u.searchParams.delete(k));
  u.searchParams.set('plan', '1');
  if (P.ages.length) u.searchParams.set('yas', P.ages.join(','));
  if (P.origin.kind === 'ilce') u.searchParams.set('ilce', P.origin.name);
  else u.searchParams.set('konum', `${P.origin.lat.toFixed(3)},${P.origin.lon.toFixed(3)}`);
  u.searchParams.set('gun', P.day);
  if (P.free) u.searchParams.set('ucretsiz', '1');
  if (P.indoor) u.searchParams.set('kapali', '1');
  if (P.stops) u.searchParams.set('d', P.keys.map(k => k || '').join('~'));
  u.hash = '';
  return u.toString();
}
function syncUrl(){ try { history.replaceState(history.state, '', P.open && P.step === 'plan' ? planUrl() : clearUrl()); } catch(_){} }
function clearUrl(){ const u = new URL(location.href); PKEYS.forEach(k => u.searchParams.delete(k)); return u.toString(); }
function fromUrl(){
  const q = new URLSearchParams(location.search); if (q.get('plan') !== '1') return false;
  P.ages = (q.get('yas') || '').split(',').map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 13).slice(0, 3);
  const il = q.get('ilce'), ko = (q.get('konum') || '').split(',').map(Number);
  if (il && DC[il]) P.origin = {kind:'ilce', name:il, lat:DC[il][0], lon:DC[il][1]};
  else if (ko.length === 2 && ko.every(Number.isFinite)) P.origin = {kind:'konum', name:'Paylaşılan başlangıç noktası', lat:ko[0], lon:ko[1]};
  const g = q.get('gun'); P.day = /^\d{4}-\d{2}-\d{2}$/.test(g || '') ? g : null;
  P.free = q.get('ucretsiz') === '1'; P.indoor = q.get('kapali') === '1';
  const d = (q.get('d') || '').split('~'); P.keys = [0, 1, 2].map(i => d[i] || null);
  return true;
}

/* ---------- harita çizimi ---------- */
function clearDraw(){
  P.markers.forEach(m => m.remove()); P.markers = [];
  const m = map(); if (m && m.getSource('plan-line')) m.getSource('plan-line').setData({type:'FeatureCollection', features:[]});
}
function draw(){
  const m = map(); if (!m) return; clearDraw();
  if (!P.stops || !P.open) return;
  const pts = [P.origin, ...P.stops.filter(s => s.kind !== 'x')];
  const fc = {type:'FeatureCollection', features:[{type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:pts.map(p => [p.lon, p.lat])}}]};
  if (!m.getSource('plan-line')) {
    m.addSource('plan-line', {type:'geojson', data:fc});
    m.addLayer({id:'plan-line-c', type:'line', source:'plan-line', layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':'#fffaf0', 'line-width':7, 'line-opacity':.9}});
    m.addLayer({id:'plan-line', type:'line', source:'plan-line', layout:{'line-cap':'round', 'line-join':'round'}, paint:{'line-color':'#8e3b1c', 'line-width':3.2, 'line-dasharray':[1.4, 1.6]}});
  } else m.getSource('plan-line').setData(fc);
  const add = (el, ll) => P.markers.push(new maplibregl.Marker({element:el}).setLngLat(ll).addTo(m));
  const o = document.createElement('div'); o.className = 'pl-mk pl-mk-o'; o.title = 'Başlangıç: ' + P.origin.name; o.innerHTML = ico('home', 13, '#fff'); add(o, [P.origin.lon, P.origin.lat]);
  P.stops.forEach((s, i) => { if (s.kind === 'x') return;
    const el = document.createElement('button'); el.type = 'button'; el.className = 'pl-mk r' + s.role; el.textContent = String(i + 1); el.title = stopName(s);
    el.onclick = ev => { ev.stopPropagation(); openStop(s.role); }; add(el, [s.lon, s.lat]); });
  const b = pts.reduce((bb, p) => [[Math.min(bb[0][0], p.lon), Math.min(bb[0][1], p.lat)], [Math.max(bb[1][0], p.lon), Math.max(bb[1][1], p.lat)]], [[180, 90], [-180, -90]]);
  const mob = matchMedia('(max-width:900px)').matches;
  m.fitBounds(b, {padding: mob ? {top:110, bottom:40, left:40, right:40} : {top:90, bottom:70, left:440, right:70}, maxZoom:14, duration:800});
}

/* ---------- arayüz ---------- */
let root, cta, pill;
const stopName = s => s.kind === 'e' ? nice(s.e.title) : s.kind === 'p' ? s.p.name : 'Öğle yemeği';
function chips(){
  const ages = [0,1,2,3,4,5,6,7,8,9,10,11,12,13];
  const days = dayOptions();
  if (!P.day || !days.includes(P.day)) P.day = days.find(d => dt(d).getDay() === 6) || days[0];
  const o = P.origin;
  const H = S().home;
  return `<div class="pl-f">
    <div class="pl-q"><div class="pl-l">Çocuğun yaşı <small>birden fazla çocuk için birkaç yaş seçebilirsiniz</small></div>
      <div class="pl-chips" role="group" aria-label="Çocuğun yaşı">${ages.map(a => `<button type="button" class="pl-c ${P.ages.includes(a) ? 'on' : ''}" data-age="${a}" aria-pressed="${P.ages.includes(a)}">${a === 13 ? '13+' : a}</button>`).join('')}</div></div>
    <div class="pl-q"><div class="pl-l">Nereden başlıyorsunuz?</div>
      <div class="pl-orig"><select id="pl-ilce" aria-label="İlçe"><option value="">İlçe seçin</option>${DISTRICTS.map(d => `<option ${o && o.kind === 'ilce' && o.name === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select>
      <button type="button" class="pl-c ${o && o.kind === 'konum' ? 'on' : ''}" id="pl-loc">${ico('locate', 13)} Konumum</button>
      ${H ? `<button type="button" class="pl-c ${o && o.kind === 'ev' ? 'on' : ''}" id="pl-home">${ico('home', 13)} Ev</button>` : ''}</div>
      <div class="pl-msg" id="pl-msg">${o && o.kind !== 'ilce' ? esc(o.name) : ''}</div></div>
    <div class="pl-q"><div class="pl-l">Hangi gün?</div>
      <div class="pl-chips">${days.map(d => `<button type="button" class="pl-c ${P.day === d ? 'on' : ''}" data-day="${d}" aria-pressed="${P.day === d}">${esc(dayShort(d))}</button>`).join('')}</div></div>
    <div class="pl-q"><div class="pl-l">Tercihler</div>
      <div class="pl-chips"><button type="button" class="pl-c ${P.free ? 'on' : ''}" id="pl-free" aria-pressed="${P.free}">Ücretsiz olsun</button>
      <button type="button" class="pl-c ${P.indoor ? 'on' : ''}" id="pl-in" aria-pressed="${P.indoor}">Kapalı mekan</button></div></div>
    <button type="button" class="pl-go" id="pl-go" ${o ? '' : 'disabled'}>${ico('route', 16)} Planı oluştur</button>
    ${o ? '' : '<div class="pl-hint">Başlamak için bir ilçe ya da konumunuzu seçin.</div>'}
  </div>`;
}
function meta(s, prev, i){
  const bits = [];
  if (s.kind === 'e') {
    const tt = s.tm.exact ? `${hhmm(s.t)} seansı` : `${hhmm(s.t)} (tahmini)`;
    bits.push(`${ico('clock', 12)} ${tt} · ${s.durEst ? `~${durTxt(s.dur)} <span class="pl-unk">(süre bilinmiyor)</span>` : durTxt(s.dur)}`);
  } else if (s.kind === 'p') {
    bits.push(`${ico('clock', 12)} ${hhmm(s.t)} civarı · ~${durTxt(s.dur)} önerilir`);
    bits.push(s.p.opening_hours ? `Açılış saatleri (OSM): ${esc(s.p.opening_hours)}` : '<span class="pl-unk">Açılış saatleri: Bilgi bulunamadı</span>');
  }
  return bits.map(b => `<div class="pl-m">${b}</div>`).join('');
}
function card(s, pos){
  const i = s.role;
  let prev = P.origin; for (let k = pos - 1; k >= 0; k--) if (P.stops[k].kind !== 'x') { prev = P.stops[k]; break; }
  const km = hav(prev, s);
  const slot = i === 1 ? 'ÖĞLE YEMEĞİ' : s.t < 750 ? 'SABAH' : s.t < 840 ? 'ÖĞLE' : 'ÖĞLEDEN SONRA';
  const alt = (P.lists[i] || []).length > 1;
  let kind = '', title = '', sub = '', extra = '', notes = [];
  if (s.kind === 'e') {
    kind = esc(s.e.cat_label || 'Etkinlik'); title = esc(nice(s.e.title));
    sub = esc([s.e.venue, s.e.district].filter(Boolean).join(' · '));
    notes = s.notes || [];
    const tags = [];
    if (s.e.is_free === 1) tags.push('<span class="pl-tag g">Ücretsiz</span>');
    if (s.e.age_label) tags.push(`<span class="pl-tag">${esc(s.e.age_label)}</span>`);
    if (s.e.indoor_outdoor === 'kapali') tags.push('<span class="pl-tag">Kapalı mekan</span>');
    if (s.e.indoor_outdoor === 'acik') tags.push('<span class="pl-tag">Açık hava</span>');
    extra = tags.join('');
  } else if (s.kind === 'p') {
    const lunch = i === 1;
    kind = lunch ? 'AVM' : (s.p.subtypes || []).join(', ');
    title = esc(s.p.name); sub = esc([s.p.district, s.p.side ? s.p.side + ' Yakası' : ''].filter(Boolean).join(' · '));
    if (lunch) { notes = [s.same ? 'Etkinlik mekanıyla aynı yerde' : (s.before ? 'Seanstan önce, etkinlik mekanına yakın' : null), 'Restoran / yemek katı bilgisi kaynakta yok'].filter(Boolean);
      extra = `<a class="pl-a" href="${gmFood(s)}" target="_blank" rel="noopener">${ico('utensils', 12)} Yakındaki yemek yerleri (Google Haritalar)</a>`; }
    else if (P.free && isPark(s.p)) extra = '<span class="pl-tag g">Park</span>';
  } else {
    kind = ''; title = 'Yakında kayıtlı AVM yok';
    sub = 'Haritamızda bu durağa 6 km içinde yemek alanı olan bir AVM kaydı bulunamadı.';
    extra = `<a class="pl-a" href="${gmFood(s)}" target="_blank" rel="noopener">${ico('utensils', 12)} Yakındaki yemek yerleri (Google Haritalar)</a>`;
  }
  const leg = s.kind === 'x' || km < .35 ? (pos ? '<div class="pl-leg sp"></div>' : '') :
    `<div class="pl-leg"><span>${pos === 0 ? 'Başlangıçtan' : 'Önceki duraktan'} ${kmTxt(km)} km · arabayla ~${carMin(km)} dk</span><a href="${gmDir(prev, s)}" target="_blank" rel="noopener">Yol tarifi ${ico('navigation', 11)}</a></div>`;
  const time = s.kind === 'x' ? `${ico('clock', 12)} ${hhmm(s.t)} civarı · ~1 saat` : '';
  return `${leg}<article class="pl-card k-${s.kind}" data-i="${i}">
    <div class="pl-n">${pos + 1}</div>
    <div class="pl-b">
      <div class="pl-k">${slot}${s.kind !== 'x' ? ' · ' + hhmm(s.t) : ''} <span>${kind}</span></div>
      <button type="button" class="pl-t" data-open="${i}" ${s.kind === 'x' ? 'disabled' : ''}>${title}</button>
      <div class="pl-s">${sub}</div>
      ${s.kind === 'x' ? `<div class="pl-m">${time}</div>` : meta(s, prev, i)}
      ${notes.length ? `<div class="pl-notes">${notes.map(n => `<span>${ico('info', 11)} ${esc(n)}</span>`).join('')}</div>` : ''}
      <div class="pl-x">${extra}</div>
      <div class="pl-acts">${s.kind !== 'x' ? `<button type="button" class="pl-btn" data-open="${i}">Detay</button>` : ''}${alt ? `<button type="button" class="pl-btn" data-swap="${i}">${ico('refresh', 12)} Başka öneri</button>` : ''}</div>
    </div></article>`;
}
function head(){
  return `<div class="pl-h"><div class="pl-kick">DIŞARIDA · HAFTA SONU PLANI</div><h2>${P.step === 'plan' ? esc(dayLabel(P.day)) : 'Günü birlikte planlayalım'}</h2>
    <button type="button" class="pl-close" id="pl-close" aria-label="Planlayıcıyı kapat" title="Kapat">${ico('x', 16)}</button></div>`;
}
function render(){
  if (!root) return;
  if (!ready()) { root.innerHTML = head() + '<div class="pl-f"><div class="pl-hint">Etkinlikler yükleniyor…</div></div>'; bind(); return; }
  if (P.step === 'form') { root.innerHTML = head() + chips(); bind(); return; }
  const sumBits = [P.ages.length ? P.ages.map(a => a === 13 ? '13+' : a).join(', ') + ' yaş' : 'Yaş fark etmez', P.origin.name, P.free ? 'Ücretsiz' : null, P.indoor ? 'Kapalı mekan' : null].filter(Boolean);
  const sum = `<div class="pl-sum"><span>${sumBits.map(esc).join(' · ')}</span><button type="button" class="pl-link" id="pl-edit">${ico('left', 12)} Değiştir</button></div>`;
  if (!P.stops) {
    root.innerHTML = head() + sum + `<div class="pl-empty">Bu seçimlerle ${esc(dayLabel(P.day))} için 30 km içinde uygun bir sabah etkinliği ya da yer bulamadık.${P.free || P.indoor ? ' “Ücretsiz” ya da “Kapalı mekan” tercihini kaldırıp tekrar deneyebilirsiniz.' : ' Başka bir gün ya da başlangıç noktası seçebilirsiniz.'}</div>`;
    bind(); return;
  }
  const end = Math.max(...P.stops.map(x => x.t + (x.dur || 0)));
  root.innerHTML = head() + sum + (P.warn.length ? `<div class="pl-warn">${P.warn.map(esc).join('<br>')}</div>` : '') +
    `<div class="pl-tl">${P.stops.map(card).join('')}</div>
    ${!P.stops.some(x => x.role === 2) ? '<div class="pl-empty sm">Öğleden sonra için yakında uygun bir etkinlik ya da park bulamadık.</div>' : ''}
    <div class="pl-end">Gün ~${hhmm(end)} civarı biter.</div>
    <div class="pl-share"><button type="button" class="pl-go" id="pl-share">${ico('share', 15)} Planı paylaş</button>
      <a class="pl-wa" id="pl-wa" href="#" target="_blank" rel="noopener">${ico('message-circle', 15)} WhatsApp</a></div>
    <div class="pl-fine">Mesafeler kuş uçuşu, süreler kaba tahmindir. Saatleri ve biletleri gitmeden önce etkinliğin kaynağından doğrulayın. Yalnızca haritadaki gerçek kayıtlar önerilir.</div>`;
  root.querySelector('#pl-wa').href = 'https://wa.me/?text=' + encodeURIComponent(shareText());
  bind();
}
function shareText(){
  const lines = [`Hafta sonu planı · ${dayLabel(P.day)}`];
  P.stops.forEach((s, i) => lines.push(`${i + 1}) ${hhmm(s.t)} ${stopName(s)}${s.role === 1 ? ' (öğle yemeği)' : ''}`));
  lines.push(planUrl());
  return lines.join('\n');
}
function bind(){
  const $ = s => root.querySelector(s);
  $('#pl-close') && ($('#pl-close').onclick = () => setOpen(false));
  root.querySelectorAll('[data-age]').forEach(b => b.onclick = () => { const a = +b.dataset.age;
    P.ages = P.ages.includes(a) ? P.ages.filter(x => x !== a) : [...P.ages, a].slice(-3); render(); });
  root.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { P.day = b.dataset.day; render(); });
  $('#pl-free') && ($('#pl-free').onclick = () => { P.free = !P.free; render(); });
  $('#pl-in') && ($('#pl-in').onclick = () => { P.indoor = !P.indoor; render(); });
  $('#pl-ilce') && ($('#pl-ilce').onchange = ev => { const d = ev.target.value; P.origin = d ? {kind:'ilce', name:d, lat:DC[d][0], lon:DC[d][1]} : null; render(); });
  $('#pl-home') && ($('#pl-home').onclick = () => { const h = S().home; P.origin = {kind:'ev', name:'Ev konumunuz', lat:h.lat, lon:h.lon}; render(); });
  $('#pl-loc') && ($('#pl-loc').onclick = () => {
    const msg = $('#pl-msg'); if (!navigator.geolocation) { msg.textContent = 'Tarayıcınız konum vermiyor; ilçe seçin.'; return; }
    msg.textContent = 'Konum alınıyor…';
    navigator.geolocation.getCurrentPosition(p => { P.origin = {kind:'konum', name:'Konumunuz', lat:p.coords.latitude, lon:p.coords.longitude}; render(); },
      () => { msg.textContent = 'Konum alınamadı; bir ilçe seçin.'; }, {timeout:10000, maximumAge:300000});
  });
  $('#pl-go') && $('#pl-go').id === 'pl-go' && ($('#pl-go').onclick = () => { P.keys = [null, null, null]; P.step = 'plan'; build(); render(); draw(); syncUrl(); root.scrollTop = 0; });
  $('#pl-edit') && ($('#pl-edit').onclick = () => { P.step = 'form'; clearDraw(); render(); syncUrl(); });
  root.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => swap(+b.dataset.swap));
  root.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openStop(+b.dataset.open));
  $('#pl-share') && ($('#pl-share').onclick = async () => {
    const url = planUrl(), btn = $('#pl-share');
    try { if (navigator.share && matchMedia('(pointer:coarse)').matches) { await navigator.share({title:'Hafta sonu planı', text:shareText().split('\n').slice(0, -1).join('\n'), url}); return; } } catch(_){ return; }
    try { await navigator.clipboard.writeText(url); btn.innerHTML = 'Bağlantı kopyalandı ✓'; } catch(_) { prompt('Plan bağlantısı:', url); }
    setTimeout(() => { if (btn.isConnected) btn.innerHTML = `${ico('share', 15)} Planı paylaş`; }, 2200);
  });
}
function openStop(i){
  const s = P.stops && P.stops.find(x => x.role === i); if (!s || s.kind === 'x') return;
  setMin(true);
  if (s.kind === 'e') window.__open && window.__open(s.e.id);
  else window.__place && window.__place(s.p.id, true);
  if (matchMedia('(max-width:900px)').matches && !document.body.classList.contains('sheet-full')) document.getElementById('sheet-handle')?.click();   // telefonda ayrıntı büyük panelde
}
function setMin(on){
  P.min = on; document.body.classList.toggle('plan-min', on && P.open);
  if (pill) pill.hidden = !(on && P.open);
  if (!on && document.body.classList.contains('sheet-full')) document.getElementById('sheet-handle')?.click();
}
function setOpen(on){
  P.open = on; document.body.classList.toggle('plan-open', on);
  root.hidden = !on; setMin(false);
  if (on) { if (!P.origin) { const h = S() && S().home; if (h) P.origin = {kind:'ev', name:'Ev konumunuz', lat:h.lat, lon:h.lon}; }
    if (!P.ages.length && S() && S().age && S().age.kids) P.ages = S().age.kids.filter(a => a >= 0 && a <= 13).map(a => Math.min(13, Math.floor(a))).slice(0, 3);
    render(); if (P.step === 'plan') draw(); }
  else { clearDraw(); }
  syncUrl();
}
function placeCta(){
  const wide = matchMedia('(min-width:1381px)').matches, tools = document.querySelector('.map-tools');
  if (wide) { if (cta.parentNode !== document.body) document.body.appendChild(cta); cta.classList.add('pl-float'); }
  else if (tools && cta.parentNode !== tools) { tools.insertBefore(cta, tools.firstChild); cta.classList.remove('pl-float'); }
}
function init(){
  root = document.createElement('section'); root.className = 'planner'; root.id = 'planner'; root.hidden = true; root.setAttribute('aria-label', 'Hafta sonu planlayıcı');
  document.body.appendChild(root);
  cta = document.createElement('button'); cta.type = 'button'; cta.id = 'btn-plan'; cta.title = 'Çocuğunuzun yaşına ve semtinize göre hazır gün rotası';
  cta.innerHTML = `${ico('route', 14)}<span class="lf">Hafta sonu planı yap</span><span class="ls">Plan yap</span>`;
  cta.onclick = () => setOpen(!P.open || P.min ? true : false);
  placeCta(); matchMedia('(min-width:1381px)').addEventListener('change', placeCta);
  // vitrin açıkken (telefonda haritanın üstünü kaplar) başlığına da küçük bir giriş düğmesi; vitrin yeniden çizilince yeniden eklenir
  const vt = document.getElementById('vitrin');
  const addVt = () => { const h = vt && vt.querySelector('.vt-head'); if (!h || h.querySelector('.pl-vt')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pl-vt'; b.innerHTML = `${ico('route', 13)}<span class="lf">Hafta sonu planı yap</span><span class="ls">Plan yap</span>`;
    b.onclick = () => setOpen(true); const x = h.querySelector('.vt-x'); x ? h.insertBefore(b, x) : h.appendChild(b); };
  if (vt) { new MutationObserver(addVt).observe(vt, {childList:true}); addVt(); }
  pill = document.createElement('button'); pill.type = 'button'; pill.className = 'pl-pill'; pill.hidden = true;
  pill.innerHTML = `${ico('route', 13)} Plana dön`; pill.onclick = () => { setMin(false); draw(); };
  document.body.appendChild(pill);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && P.open && !P.min) setOpen(false); });
  const shared = fromUrl();
  const wait = setInterval(() => { if (!ready()) return; clearInterval(wait);
    if (shared) { P.step = P.origin && P.day ? 'plan' : 'form'; setOpen(true); if (P.step === 'plan') { build(); render(); draw(); syncUrl(); } }
    else if (P.open) render();
  }, 150);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
window.__planner = {open:() => setOpen(true), state:P};
})();
