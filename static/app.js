/* Dışarıda — Şehirde ne var? Harita arayüzü (MapLibre GL JS).
   Yerel sunucuyla (/api/...) ya da statik sitede (data/*.json, <meta name="disarida-static" content="1">) çalışır. */
(() => {
'use strict';
const UNK = '<span class="unk">Bilgi bulunamadı</span>';
const NOHOME = '<span class="unk">Ev konumu seçilmedi</span> <button class="linkbtn" data-act="home">Ev konumu seç</button>';
const CAT_ORDER = ['Tiyatro & Gösteri','Atölye','Müze & Bilim','Sergi','Doğa & Hayvan','Konser & Müzik','Festival & Şenlik','Spor','Diğer'];
const CAT_COLOR = {tiyatro:'#b0502a', atolye:'#c98a2e', muze:'#4f6f8f', spor:'#3f8a7a', konser:'#7d5a8c', doga:'#5d8a4a', festival:'#c5687a', diger:'#8a7f72'};
const CAT_ICON = {tiyatro:'drama', atolye:'palette', muze:'flask-conical', spor:'trophy', konser:'music', doga:'trees', festival:'party-popper', diger:'sparkles'};
const PLACE = {
  avm:{label:"AVM'ler", short:'AVM', icon:'shopping-bag', color:'#7b5a8f', desc:'Oyun alanları, akvaryum, sinema, bowling, yemek alanları'},
  park:{label:'Millet Bahçeleri ve Parklar', short:'Park', icon:'tree-deciduous', color:'#5f8f4e', desc:'Oyun parkları, yürüyüş yolları, piknik, gölet, yeşil alan'},
  acikhava:{label:'Açık Hava Etkinlikleri', short:'Açık hava', icon:'tent', color:'#d9822b', desc:'Festival, konser, şenlik, açık hava sahneleri'},
  doga:{label:'Hayvanlar ve Doğa', short:'Hayvan & doğa', icon:'paw-print', color:'#2f8a7e', desc:'Hayvanat bahçesi, çiftlik, akvaryum, botanik bahçesi, orman'},
  cocuk:{label:'Çocuk Eğlence ve Aktivite Merkezleri', short:'Çocuk eğlence', icon:'ferris-wheel', color:'#cf5679', desc:'Kapalı oyun alanı, trambolin, bilim merkezi, müze'},
  gezi:{label:'Gezi ve Keşif Noktaları', short:'Gezi & keşif', icon:'compass', color:'#3f6c9a', desc:'Sahil, tarihi yerler, seyir noktası, mesire, köyler, rotalar'}};
const PLACE_ORDER = ['avm','park','acikhava','doga','cocuk','gezi'];
const ico = (k, color, size=14) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(window.LUCIDE||{})[k]||''}</svg>`;
const badge = (k, color, size=20) => `<span class="cbadge" style="background:${color};width:${size}px;height:${size}px">${ico(k,'#fff',Math.round(size*.62))}</span>`;
function pinImage(color, icon, square){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#3a2a1a" flood-opacity=".35"/></filter></defs>
    ${square ? `<rect x="8" y="8" width="48" height="48" rx="13" fill="${color}" stroke="#fffaf0" stroke-width="4" filter="url(#s)"/>`
             : `<circle cx="32" cy="32" r="25" fill="${color}" stroke="#fffaf0" stroke-width="4" filter="url(#s)"/>`}
    <g transform="translate(18,18) scale(1.1667)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${window.LUCIDE[icon]}</g></svg>`;
  return new Promise((res, rej) => { const im = new Image(64, 64); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
}
const CAT_NAME = {tiyatro:'Tiyatro & gösteri', atolye:'Atölye', muze:'Müze, bilim & sergi', spor:'Spor', konser:'Konser & müzik', doga:'Doğa & hayvan', festival:'Festival', diger:'Diğer'};
const PAL = {Anadolu:['#e6c7b9','#d9b2a3','#ecd6c6','#d2bba9'], Avrupa:['#c7d1bb','#b8c6c8','#d6d2b1','#c2cab0']};
const CHIPS = [
  ['tumu','Tümü'],['__date','Tarih seç'],['__age','Yaş'],['bugun','Bugün'],['yarin','Yarın'],['hs','Bu hafta sonu'],['ghs','Gelecek hafta sonu'],['g7','7 gün'],['ucretsiz','Ücretsiz'],
  ['ucretli','Ücretli'],['acik','Açık hava'],['kapali','Kapalı'],['doga','Doğa'],['hayvan','Hayvan'],['tiyatro','Tiyatro & gösteri'],['atolye','Atölye'],['muze','Müze & bilim'],['spor','Spor'],['g3','3 gün']];
const PRIMARY = 9;
const DATECHIPS = ['bugun','yarin','g3','g7','hs','ghs'];
const EXCL = [DATECHIPS,['ucretsiz','ucretli'],['acik','kapali']];
const AGE_GROUPS = [['g0','0–2 yaş',0,2.99],['g3','3–5 yaş',3,5.99],['g6','6–8 yaş',6,8.99],['g9','9–12 yaş',9,12.99],['g13','13+ yaş',13,99]];
const AYLAR_UZUN = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const LS = { get(k, d){ try { const v = localStorage.getItem('radar.'+k); return v ? JSON.parse(v) : d; } catch(_) { return d; } },
             set(k, v){ try { v == null ? localStorage.removeItem('radar.'+k) : localStorage.setItem('radar.'+k, JSON.stringify(v)); } catch(_){} } };
LS.set('base', null);  // eski 'sokak altlığı kapalı' tercihi artık yok; altlık her zaman açık
const CATCHIPS = ['tiyatro','atolye','muze','spor'];
/* ---------- veri kaynağı: yerel sunucu ya da statik dosyalar ---------- */
const STATIC = document.querySelector('meta[name="disarida-static"]')?.content === '1';
const URLS = STATIC ? {districts:'data/districts.geojson', sides:'data/sides.geojson', events:'data/events.json', places:'data/places.json'}
                    : {districts:'/api/districts', sides:'/api/sides', events:'/api/events', places:'/api/places'};
const getJSON = async (u, fresh) => { const r = await fetch(u + (fresh && STATIC ? (u.includes('?')?'&':'?') + 't=' + Date.now() : ''), fresh ? {cache:'no-cache'} : {}); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); };
const istNow = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date()).map(x => [x.type, x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}`}; };
// statik sitede dosya günde bir kez üretilir: geçmiş etkinlikleri tarayıcıda ayıkla (sunucu da aynı kuralı uygular)
function freshen(d){
  if (!STATIC) return d;
  const n = istNow();
  const ev = d.events.filter(e => { const last = e.end_date || e.start_date; if (last < n.date) return false;
    if (!e.end_date && e.start_date === n.date && e.start_time && e.start_time < n.time) return false; return true; });
  const pins = ev.filter(e => e.lat != null).length;
  return {...d, today:n.date, events:ev, stats:{...d.stats, upcoming:ev.length, with_pin:pins, without_pin:ev.length - pins}};
}
// ilçe bulma: sunucuda /api/locate, statikte ilçe sınırlarıyla tarayıcıda (nokta-çokgen testi)
function inRing(x, y, r){ let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function localDistrict(lat, lon){
  for (const f of (districtFC?.features || [])) { const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    for (const poly of polys) if (inRing(lon, lat, poly[0]) && !poly.slice(1).some(h => inRing(lon, lat, h))) return f.properties.name; }
  return null;
}
async function locateDistrict(lat, lon){
  if (STATIC) return localDistrict(lat, lon);
  try { return (await (await fetch(`/api/locate?lat=${lat}&lon=${lon}`)).json()).district; } catch(_) { return localDistrict(lat, lon); }
}
// statik adres arama: önce ilçe/yer listesi (yazarken), OpenStreetMap Nominatim yalnızca kullanıcı "Adreste ara" deyince
// (Nominatim kuralları: otomatik tamamlama yok, en fazla 1 istek/sn, sonuçlar önbellekte, atıf gösterilir)
function localGeocode(v){
  const fq = fold(v), out = [];
  (districtFC?.features || []).forEach(f => { const p = f.properties; if (fold(p.name).includes(fq)) out.push({name:p.name, detail:`İlçe merkezi · ${p.side} Yakası`, lat:p.center_lat ?? p.label_lat, lon:p.center_lon ?? p.label_lon, district:p.name, kind:'ilce'}); });
  for (const p of S.places) { if (out.length >= 8) break; if (p.minzoom <= 11 && !p.from_events && fold(p.name).includes(fq)) out.push({name:p.name, detail:`${p.district || ''} · yer`, lat:p.lat, lon:p.lon, district:p.district, kind:'yer'}); }
  return out.slice(0, 8);
}
let nomLast = 0;
async function nominatim(v){
  const key = 'nom.' + fold(v);
  try { const c = sessionStorage.getItem(key); if (c) return JSON.parse(c); } catch(_){}
  const wait = 1100 - (Date.now() - nomLast); if (wait > 0) await new Promise(r => setTimeout(r, wait));
  nomLast = Date.now();
  const u = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({q:v, format:'jsonv2', limit:'6', countrycodes:'tr', viewbox:'27.95,41.60,29.95,40.80', bounded:'1', 'accept-language':'tr', addressdetails:'1'});
  const hits = await (await fetch(u, {headers:{'Accept':'application/json'}})).json();
  const res = [];
  const seen = new Set();
  for (const h of hits) { const lat = +h.lat, lon = +h.lon, d = localDistrict(lat, lon); if (!d) continue; const a = h.address || {};
    const nm = h.name || a.road || a.suburb || (h.display_name || '').split(',')[0];
    const k = nm + '|' + (a.suburb || a.neighbourhood || '') + '|' + d; if (seen.has(k)) continue; seen.add(k);
    res.push({name:nm, detail:[a.road !== nm ? a.road : null, a.suburb || a.neighbourhood, d].filter(Boolean).join(', '), lat:+lat.toFixed(6), lon:+lon.toFixed(6), district:d, kind:'adres'}); }
  try { sessionStorage.setItem(key, JSON.stringify(res)); } catch(_){}
  return res;
}

const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const GUN = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

const S = {home:LS.get('home', null), age:Object.assign({groups:[], kids:[], hideUnknown:false, showAdult:false, showUnclear:true}, LS.get('age', {})), date:null, pop:null, cal:null, favs:Object.assign({e:{}, p:{}}, LS.get('favs', {})), view:null, pickHome:false,
  catOn:new Set(LS.get('cats', null) || Object.keys(CAT_NAME)), places:[], placeOn:new Set(LS.get('placeLayers', null) || PLACE_ORDER), placeDetail:null, data:null, events:[], level:'city', side:null, district:null, venue:null, detail:null, filters:new Set(), q:'', sort:'date', chipsOpen:false, open:{}, mapFs:false};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = s => String(s||'').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const addDays = (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const dshort = iso => { const d = new Date(iso+'T12:00:00'); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${GUN[d.getDay()]}`; };
const dlong = iso => { const d = new Date(iso+'T12:00:00'); return d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'}); };
const KEEP = new Set(['İBB','CKM','BMKM','KKM','AKM','PSM','CRR','BKSM','BAKSM','ACU','MOİ','DJ','TV','II','III','IV','VR','3D']);
function nice(t){
  return String(t||'').split(/(\s+)/).map(w => {
    const letters = w.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g,'');
    if (letters.length > 2 && letters === letters.toLocaleUpperCase('tr') && !KEEP.has(letters)) { const l = w.toLocaleLowerCase('tr'); return l.charAt(0).toLocaleUpperCase('tr') + l.slice(1); }
    return w; }).join('');
}
function when(e){
  if (e.end_date && e.end_date !== e.start_date) return `${dshort(e.start_date).replace(/ \S+$/,'')} – ${dshort(e.end_date).replace(/ \S+$/,'')}`;
  return dshort(e.start_date) + (e.start_time ? ' · ' + e.start_time : '');
}

/* ---------- home / distance ---------- */
function hav(lat1, lon1, lat2, lon2){ const R=6371.0088, r=Math.PI/180, dp=(lat2-lat1)*r, dl=(lon2-lon1)*r;
  const a = Math.sin(dp/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dl/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
function dist(o){ return (S.home && o && o.lat != null) ? Math.round(hav(S.home.lat, S.home.lon, o.lat, o.lon)*10)/10 : null; }
const carMin = km => Math.round(km*1.3/32*60);
function gm(o, mode){
  if (o.lat == null) return mode==='driving' ? o.gmaps_car : o.gmaps_transit;
  const org = S.home ? `&origin=${S.home.lat},${S.home.lon}` : '';
  return `https://www.google.com/maps/dir/?api=1${org}&destination=${o.lat},${o.lon}&travelmode=${mode}`;
}
const kmTxt = km => km.toLocaleString('tr-TR');

/* ---------- age ---------- */
const fmtAge = a => String(a).replace('.', ',');
function ageText(e){
  if (!e.age_known) return null;
  const lo = e.age_min, hi = e.age_max;
  if (hi == null) return `${fmtAge(lo ?? 0)}+ yaş`;
  if (!lo) return `${fmtAge(hi)} yaşa kadar`;
  return `${fmtAge(lo)}–${fmtAge(hi)} yaş`;
}
function ageRanges(){
  const r = AGE_GROUPS.filter(g => S.age.groups.includes(g[0])).map(g => [g[2], g[3], g[1]]);
  S.age.kids.forEach(a => r.push([a, a, fmtAge(a)+' yaş']));
  return r;
}
function ageFits(e, lo, hi){ if (!e.age_known) return null; const a = e.age_min ?? 0, b = e.age_max ?? 99; return a <= hi && b >= lo; }
function ageActive(){ return S.age.groups.length + S.age.kids.length > 0; }
function ageLabel(){
  const g = AGE_GROUPS.filter(x => S.age.groups.includes(x[0])).map(x => x[1].replace(' yaş',''));
  const k = S.age.kids.map(fmtAge);
  return [...g, ...k].join(', ');
}
function saveAge(){ LS.set('age', S.age); }

/* ---------- dates ---------- */
function weekend(next){
  const T = S.data.today, dow = new Date(T+'T12:00:00').getDay();
  if (!next) { if (dow === 0) return [T, T]; const sat = addDays(T, 6 - dow); return [sat, addDays(sat, 1)]; }
  const sat = dow === 0 ? addDays(T, 6) : addDays(T, 13 - dow); return [sat, addDays(sat, 1)];
}
function rangeTxt(a, b){
  const da = new Date(a+'T12:00:00'), db = new Date(b+'T12:00:00');
  if (a === b) return `${da.getDate()} ${AYLAR[da.getMonth()]} ${GUN[da.getDay()]}`;
  return da.getMonth()===db.getMonth() ? `${da.getDate()}–${db.getDate()} ${AYLAR[db.getMonth()]}` : `${da.getDate()} ${AYLAR[da.getMonth()]} – ${db.getDate()} ${AYLAR[db.getMonth()]}`;
}

/* ---------- favourites ---------- */
const favKey = e => [fold(e.title).replace(/[^a-z0-9]/g,'').slice(0,40), e.start_date, fold(e.venue||'').replace(/[^a-z0-9]/g,'').slice(0,24)].join('|');
const isFavE = e => !!S.favs.e[favKey(e)];
const isFavP = p => !!S.favs.p[p.id];
function favCount(){ return Object.keys(S.favs.e).length + Object.keys(S.favs.p).length; }
function toggleFav(kind, id){
  if (kind === 'e') { const e = S.events.find(x => x.id === +id); if (!e) return; const k = favKey(e);
    if (S.favs.e[k]) delete S.favs.e[k]; else S.favs.e[k] = {id:e.id, title:e.title, start_date:e.start_date, end_date:e.end_date, start_time:e.start_time, venue:e.venue, district:e.district, cat_group:e.cat_group, official_url:e.official_url, added:new Date().toISOString()}; }
  else if (kind === 'p') { const p = S.placeById.get(id); if (!p) return;
    if (S.favs.p[id]) delete S.favs.p[id]; else S.favs.p[id] = {id:p.id, name:p.name, cat:p.cat, district:p.district, lat:p.lat, lon:p.lon, added:new Date().toISOString()}; }
  LS.set('favs', S.favs); render();
}
const heart = (kind, id, on, big) => `<button class="fav ${on?'on':''} ${big?'big':''}" data-fav="${kind}" data-fid="${esc(id)}" title="${on?'Favorilerden çıkar':'Favorilere ekle'}" aria-label="${on?'Favorilerden çıkar':'Favorilere ekle'}" aria-pressed="${on}">${ico('heart', 'currentColor', big?18:15)}</button>`;
function bindFavs(root){ root.querySelectorAll('.fav').forEach(b => b.onclick = ev => { ev.stopPropagation(); toggleFav(b.dataset.fav, b.dataset.fid); });
  root.querySelectorAll('[data-ics]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const e = S.events.find(x => x.id === +b.dataset.ics); if (e) downloadIcs(e); });
  root.querySelectorAll('a.wa, a.gcal').forEach(a => a.addEventListener('click', ev => ev.stopPropagation())); }

/* ---------- takvime ekle + WhatsApp ---------- */
// İstanbul sabit UTC+3 (2016'dan beri yaz saati yok)
const icsUTC = (date, time) => { const d = new Date(`${date}T${time}:00+03:00`); return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''); };
const icsDate = iso => iso.replace(/-/g,'');
function calTimes(e){
  // -> {allDay, start, end|null, note}; yalnızca kaynakta olan saat/süre kullanılır
  const range = e.end_date && e.end_date !== e.start_date;
  if (range || !e.start_time) {
    const last = range ? e.end_date : e.start_date;
    return {allDay:true, start:icsDate(e.start_date), end:icsDate(addDays(last, 1)),
      note: e.start_time ? `Seans/başlangıç saati: ${e.start_time}${e.end_time?'–'+e.end_time:''}` : 'Saat: Bilgi bulunamadı'};
  }
  const st = icsUTC(e.start_date, e.start_time);
  let en = null, note = '';
  if (e.end_time && e.end_time > e.start_time) en = icsUTC(e.start_date, e.end_time);
  else if (e.duration_minutes) en = new Date(new Date(`${e.start_date}T${e.start_time}:00+03:00`).getTime() + e.duration_minutes*60000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  else note = 'Bitiş saati: Bilgi bulunamadı';
  return {allDay:false, start:st, end:en, note};
}
const calLoc = e => [e.venue, e.address, e.district, 'İstanbul'].filter(Boolean).filter((v,i,a) => a.indexOf(v)===i).join(', ');
function calDesc(e, t){
  return [t.note, e.age_label ? 'Yaş: '+e.age_label : (ageText(e) ? 'Yaş: '+ageText(e) : ''), e.ticket_url ? 'Bilet: '+e.ticket_url : '', 'Kaynak: '+e.official_url].filter(Boolean).join('\n');
}
function gcalUrl(e){
  const t = calTimes(e);
  const dates = t.allDay ? `${t.start}/${t.end}` : `${t.start}/${t.end || t.start}`;
  const q = new URLSearchParams({action:'TEMPLATE', text:nice(e.title), dates, ctz:'Europe/Istanbul', details:calDesc(e, t), location:calLoc(e)});
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
function icsText(e){
  const t = calTimes(e), x = s => String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1');
  const fold75 = l => { const out = []; let cur = ''; for (const ch of l) { if (new TextEncoder().encode(cur+ch).length > 73) { out.push(cur); cur = ' '+ch; } else cur += ch; } out.push(cur); return out.join('\r\n'); };
  const now = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const L = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Disarida//Sehirde ne var//TR','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    `UID:etkinlik-${e.id}-${e.start_date}@disarida`, `DTSTAMP:${now}`,
    t.allDay ? `DTSTART;VALUE=DATE:${t.start}` : `DTSTART:${t.start}`];
  if (t.allDay) L.push(`DTEND;VALUE=DATE:${t.end}`); else if (t.end) L.push(`DTEND:${t.end}`);
  L.push('SUMMARY:'+x(nice(e.title)), 'LOCATION:'+x(calLoc(e)), 'DESCRIPTION:'+x(calDesc(e, t)), 'URL:'+e.official_url, 'END:VEVENT', 'END:VCALENDAR');
  return L.map(fold75).join('\r\n') + '\r\n';
}
function downloadIcs(e){
  const blob = new Blob([icsText(e)], {type:'text/calendar;charset=utf-8'});
  const a = document.createElement('a'), name = fold(e.title).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50) || 'etkinlik';
  a.href = URL.createObjectURL(blob); a.download = `${name}-${e.start_date}.ics`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function waText(e){
  let d = e.end_date && e.end_date !== e.start_date ? `${dlong(e.start_date)} – ${dlong(e.end_date)}` : dlong(e.start_date);
  if (e.start_time) d += (e.end_date && e.end_date !== e.start_date ? ' · saat ' : ', saat ') + e.start_time;
  const place = [e.venue, e.district].filter(Boolean).join(' · ') || 'Mekan: Bilgi bulunamadı';
  return `*${nice(e.title)}*\n📅 ${d}\n📍 ${place}\n🔗 ${e.official_url}`;
}
const waUrl = e => 'https://wa.me/?text=' + encodeURIComponent(waText(e));
const shareBtns = e => `<span class="acts"><button class="act" data-ics="${e.id}" title="Takvime ekle (.ics)" aria-label="Takvime ekle">${ico('calendar-plus','currentColor',15)}</button><a class="act wa" href="${esc(waUrl(e))}" target="_blank" rel="noopener" title="WhatsApp'ta paylaş" aria-label="WhatsApp'ta paylaş">${ico('message-circle','currentColor',15)}</a></span>`;

/* ---------- filtering ---------- */
// aile uygunluğu: kaynak açıkça yetişkin diyorsa varsayılan gizli; belirsizler varsayılan görünür
function passAud(e){
  if (S._ignAud) return true;
  if (e.audience === 'yetiskin') return !!S.age.showAdult;
  if (e.audience === 'belirsiz') return S.age.showUnclear !== false;
  return true;
}
function hiddenAdults(list){ S._ignAud = true; const n = list.filter(e => e.audience==='yetiskin' && passChips(e)).length; S._ignAud = false; return n; }
function inWindow(e, a, b){ const s = e.start_date, t = e.end_date || e.start_date; return s <= b && t >= a; }
function passChips(e, ignoreCat){
  const f = S.filters, T = S.data.today;
  if (ignoreCat !== true && !S.catOn.has(e.cat_group)) return false;
  if (f.has('ucretsiz') && e.is_free !== 1) return false;
  if (f.has('ucretli') && e.is_free !== 0) return false;
  if (!passAud(e)) return false;
  if (!e.age_known) { if (S.age.hideUnknown) return false; }
  else if (ageActive() && !ageRanges().some(([lo, hi]) => ageFits(e, lo, hi))) return false;
  if (f.has('acik') && !['acik','mixed'].includes(e.indoor_outdoor)) return false;
  if (f.has('kapali') && !['kapali','mixed'].includes(e.indoor_outdoor)) return false;
  if (f.has('doga') && e.nature !== 1) return false;
  if (f.has('hayvan') && e.animal !== 1) return false;
  const cats = CATCHIPS.filter(c => f.has(c));
  if (cats.length && !cats.includes(e.cat_group)) return false;
  if (f.has('bugun') && !inWindow(e, T, T)) return false;
  if (f.has('yarin') && !inWindow(e, addDays(T,1), addDays(T,1))) return false;
  if (f.has('g3') && !inWindow(e, T, addDays(T,2))) return false;
  if (f.has('g7') && !inWindow(e, T, addDays(T,6))) return false;
  if (f.has('hs')) { const [a, b] = weekend(false); if (!inWindow(e, a, b)) return false; }
  if (f.has('ghs')) { const [a, b] = weekend(true); if (!inWindow(e, a, b)) return false; }
  if (S.date && !inWindow(e, S.date.from, S.date.to)) return false;
  if (S.q) { const q = fold(S.q); if (!e._s.includes(q)) return false; }
  return true;
}
function inArea(e){
  if (S.level === 'side') return e.side === S.side;
  if (S.level === 'district') return e.district === S.district;
  return true;
}
const filtered = () => S.events.filter(passChips);

/* ---------- map ---------- */
const map = new maplibregl.Map({
  container:'map', attributionControl:{compact:true},
  style:{version:8, glyphs:'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources:{base:{type:'raster', tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize:256, maxzoom:19, attribution:'© OpenStreetMap katkıcıları'}},
    layers:[{id:'bg', type:'background', paint:{'background-color':'#f3ead9'}},
            {id:'base', type:'raster', source:'base', layout:{visibility:'visible'}, paint:{'raster-opacity':['interpolate',['linear'],['zoom'],10.5,0,13,.7],'raster-saturation':-.75,'raster-contrast':-.15,'raster-brightness-min':.08}}]},
  center:[28.98,41.08], zoom:8.6, minZoom:7.5, maxZoom:17, dragRotate:false, pitchWithRotate:false
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}), 'top-right');
map.touchZoomRotate.disableRotation();
let hoverId = null, selMarker = null, districtFC = null, labelMarkers = [], sideMarkers = {};

function districtBounds(name){
  const f = districtFC.features.find(x => x.properties.name === name); return f ? bbox(f.geometry) : null;
}
function bbox(g){
  let a=[180,90,-180,-90];
  const walk = c => typeof c[0] === 'number' ? (a=[Math.min(a[0],c[0]),Math.min(a[1],c[1]),Math.max(a[2],c[0]),Math.max(a[3],c[1])]) : c.forEach(walk);
  walk(g.coordinates); return [[a[0],a[1]],[a[2],a[3]]];
}
function sideBounds(side){
  let b=null; districtFC.features.filter(f=>f.properties.side===side).forEach(f=>{const x=bbox(f.geometry); b=b?[[Math.min(b[0][0],x[0][0]),Math.min(b[0][1],x[0][1])],[Math.max(b[1][0],x[1][0]),Math.max(b[1][1],x[1][1])]]:x;}); return b;
}
const PL_LAYERS = ['pl-0','pl-10','pl-11','pl-12','pl-13','pl-14'];
const CITY_B = [[28.0,40.80],[29.95,41.60]];

map.on('load', async () => {
  map.setLayoutProperty('base','visibility','visible');
  let sides;
  try {
    const [dj, sj, ej, pj] = await Promise.all([getJSON(URLS.districts), getJSON(URLS.sides), getJSON(URLS.events, true), getJSON(URLS.places, true)]);
    districtFC = dj; sides = sj; setData(ej); setPlaces(pj);
  } catch (err) { $('#panel-body').innerHTML = '<div class="empty">Veriler yüklenemedi. Sayfayı yenileyin.</div>'; console.warn(err); return; }
  await Promise.all([...Object.entries(CAT_ICON).map(([k,ic]) => pinImage(CAT_COLOR[k], ic, false).then(im => map.addImage('ev-'+k, im, {pixelRatio:2}))),
                     ...Object.entries(PLACE).map(([k,p]) => pinImage(p.color, p.icon, true).then(im => map.addImage('pl-'+k, im, {pixelRatio:2})))]);
  districtFC.features.forEach(f => { const p=f.properties; p.color = PAL[p.side][p.ci % 4]; });
  map.addSource('districts', {type:'geojson', data:districtFC, promoteId:'name'});
  map.addSource('sides', {type:'geojson', data:sides});
  map.addLayer({id:'d-fill', type:'fill', source:'districts', paint:{'fill-color':['get','color'],
    'fill-opacity':['interpolate',['linear'],['zoom'],
       11,['case',['boolean',['feature-state','sel'],false],1,['boolean',['feature-state','hover'],false],.98,['boolean',['feature-state','dim'],false],.45,.86],
       14,['case',['boolean',['feature-state','sel'],false],.35,['boolean',['feature-state','hover'],false],.4,['boolean',['feature-state','dim'],false],.2,.3]]}});
  map.addLayer({id:'d-hover', type:'fill', source:'districts', paint:{'fill-color':'#fff','fill-opacity':['case',['boolean',['feature-state','hover'],false],.22,0]}});
  map.addLayer({id:'d-line', type:'line', source:'districts', paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],8,.7,12,1.6]}});
  map.addLayer({id:'s-line', type:'line', source:'sides', paint:{'line-color':'#b0502a','line-width':['interpolate',['linear'],['zoom'],8,2.2,12,3.5],'line-opacity':['interpolate',['linear'],['zoom'],12,.9,14.5,.3]}});
  map.addLayer({id:'d-sel', type:'line', source:'districts', paint:{'line-color':'#8e3b1c','line-width':['case',['boolean',['feature-state','sel'],false],2.6,0]}});

  map.addSource('places', {type:'geojson', data:{type:'FeatureCollection',features:[]}});
  [0,10,11,12,13,14].forEach(mz => map.addLayer({id:'pl-'+mz, type:'symbol', source:'places', minzoom: mz ? mz - .01 : 0, filter:['==',['get','mz'],mz],
    layout:{'icon-image':['concat','pl-',['get','cat']], 'icon-size':['interpolate',['linear'],['zoom'],9,.62,13,.82,16,.95], 'icon-allow-overlap':false, 'icon-padding':1,
            'symbol-sort-key':['get','rank'],
            'text-field':['step',['zoom'],'',14,['get','name']], 'text-font':['Open Sans Semibold'], 'text-size':10.5, 'text-offset':[0,1.5], 'text-anchor':'top', 'text-optional':true, 'text-max-width':9},
    paint:{'text-color':'#5b4636','text-halo-color':'#fffaf0','text-halo-width':1.4}}));
  map.addSource('pins', {type:'geojson', data:{type:'FeatureCollection',features:[]}, cluster:true, clusterRadius:38, clusterMaxZoom:13, clusterProperties:{ne:['+',['get','n']]}});
  map.addLayer({id:'cl', type:'circle', source:'pins', filter:['has','point_count'], paint:{
    'circle-color':'#8e3b1c','circle-opacity':.88,'circle-stroke-color':'#faf4e8','circle-stroke-width':2.5,
    'circle-radius':['interpolate',['linear'],['get','ne'],2,13,20,18,100,25,300,31]}});
  map.addLayer({id:'cl-n', type:'symbol', source:'pins', filter:['has','point_count'], layout:{'text-field':['to-string',['get','ne']],'text-font':['Open Sans Semibold'],'text-size':12,'text-allow-overlap':true}, paint:{'text-color':'#fff'}});
  map.addLayer({id:'pt', type:'symbol', source:'pins', filter:['!',['has','point_count']], layout:{
    'icon-image':['concat','ev-',['get','cat']], 'icon-size':['interpolate',['linear'],['get','n'],1,.9,5,1,30,1.12,80,1.25], 'icon-allow-overlap':true, 'icon-ignore-placement':true}});
  map.addLayer({id:'pt-n', type:'symbol', source:'pins', filter:['all',['!',['has','point_count']],['>',['get','n'],1]], layout:{'text-field':['to-string',['get','n']],'text-font':['Open Sans Semibold'],'text-size':10,
    'text-offset':[1.15,-1.05],'text-allow-overlap':true,'text-ignore-placement':true}, paint:{'text-color':'#fff','text-halo-color':'#3a2a1a','text-halo-width':1.6}});

  // district + side labels
  districtFC.features.forEach(f => {
    const el = document.createElement('div'); el.className='dlabel'; el.textContent=f.properties.name;
    labelMarkers.push({el, area:f.properties.area_km2, m:new maplibregl.Marker({element:el}).setLngLat([f.properties.label_lon,f.properties.label_lat]).addTo(map)});
  });
  [['Avrupa',[28.36,41.36],'Avrupa Yakası'],['Anadolu',[29.62,41.13],'Anadolu Yakası']].forEach(([k,ll,t]) => {
    const el = document.createElement('div'); el.className='slabel'; el.innerHTML=`<div class="t">${t}</div><div class="s"></div>`;
    el.addEventListener('click', ev => { ev.stopPropagation(); go({level:'side', side:k}); });
    el.addEventListener('mouseenter', () => { showTip(null, k); districtFC.features.forEach(f => f.properties.side===k && map.setFeatureState({source:'districts',id:f.properties.name},{hover:true})); });
    el.addEventListener('mouseleave', () => { hideTip(); districtFC.features.forEach(f => map.setFeatureState({source:'districts',id:f.properties.name},{hover:false})); });
    el.addEventListener('mousemove', ev => ev.stopPropagation());
    sideMarkers[k] = {el, m:new maplibregl.Marker({element:el}).setLngLat(ll).addTo(map)};
  });
  placeHomeMarker();
  map.on('zoom', labelVis); 

  map.on('mousemove','d-fill', e => {
    const f = e.features[0]; if (!f) return;
    if (e.originalEvent.target.closest && e.originalEvent.target.closest('.slabel')) return;
    if (hoverId !== f.id) { if (hoverId) map.setFeatureState({source:'districts',id:hoverId},{hover:false}); hoverId=f.id; map.setFeatureState({source:'districts',id:hoverId},{hover:true}); }
    const pin = map.queryRenderedFeatures(e.point,{layers:['pt','cl']}).length;
    const pl = map.queryRenderedFeatures(e.point,{layers:PL_LAYERS});
    if (pin) hideTip(); else if (pl.length) placeTip(e.point, pl[0].properties); else showTip(e.point, null, f.properties.name);
    map.getCanvas().style.cursor='pointer';
  });
  map.on('mouseleave','d-fill', () => { if (hoverId) map.setFeatureState({source:'districts',id:hoverId},{hover:false}); hoverId=null; hideTip(); map.getCanvas().style.cursor=''; });
  map.on('click', e => {
    if (S.pickHome) return pickHomeAt(e.lngLat);
    const p = map.queryRenderedFeatures(e.point,{layers:['cl','pt']});
    if (p.length) return pinClick(p[0]);
    const pl = map.queryRenderedFeatures(e.point,{layers:PL_LAYERS});
    if (pl.length) return openPlace(pl[0].properties.id);
    const d = map.queryRenderedFeatures(e.point,{layers:['d-fill']});
    if (d.length) go({level:'district', district:d[0].properties.name, side:d[0].properties.side});
  });
  [...PL_LAYERS,'cl','pt'].forEach(l => { map.on('mouseenter',l,()=>{map.getCanvas().style.cursor='pointer'; hideTip();}); map.on('mouseleave',l,()=>map.getCanvas().style.cursor=''); });
  map.fitBounds(CITY_B, {padding:{top:60,bottom:40,left:30,right:30}, duration:0});
  render(); labelVis(); initVitrin();
  if (!LS.get('welcomed', false)) openHomeDialog(true);
  window.__ready = true;
});

function labelVis(){
  const z = map.getZoom();
  labelMarkers.forEach(l => l.el.style.display = (z >= 10.2 || l.area > (z >= 9.4 ? 25 : 100)) ? '' : 'none');
  Object.values(sideMarkers).forEach(s => s.el.style.opacity = z > 10.6 ? .0 : 1);
  Object.values(sideMarkers).forEach(s => s.el.style.pointerEvents = z > 10.6 ? 'none' : '');
}

async function pinClick(f){
  if (f.properties.cluster) {
    const src = map.getSource('pins');
    const z = await src.getClusterExpansionZoom(f.properties.cluster_id);
    if (z <= 14) return map.easeTo({center:f.geometry.coordinates, zoom:z+.2});
    const leaves = await src.getClusterLeaves(f.properties.cluster_id, 1000, 0);
    const keys = new Set(leaves.map(l => l.properties.vk));
    return go({venue:{title:'Bu bölgedeki mekanlar', keys}});
  }
  const ids = JSON.parse(f.properties.ids);
  if (ids.length === 1) return openDetail(ids[0], true);
  go({venue:{title:f.properties.venue || 'Mekan', keys:new Set([f.properties.vk])}});
}

function updatePins(list){
  const by = new Map();
  list.forEach(e => { if (e.lat == null) return; const k = e.lat.toFixed(4)+','+e.lon.toFixed(4); if(!by.has(k)) by.set(k,[]); by.get(k).push(e); });
  const feats = [...by.entries()].map(([k,arr]) => {
    const cnt = {}; arr.forEach(e => cnt[e.cat_group]=(cnt[e.cat_group]||0)+1);
    const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
    return {type:'Feature', geometry:{type:'Point', coordinates:[arr[0].lon, arr[0].lat]}, properties:{vk:k, n:arr.length, ids:JSON.stringify(arr.map(e=>e.id)), cat:top, color:CAT_COLOR[top], venue:arr[0].venue||''}};
  });
  map.getSource('pins')?.setData({type:'FeatureCollection', features:feats});
}

function districtCounts(list){
  const c = {}, s = {Anadolu:0, Avrupa:0}, cats = {};
  list.forEach(e => { if (e.district){ c[e.district]=(c[e.district]||0)+1; (cats[e.district] ||= {})[e.cat_label]=(cats[e.district][e.cat_label]||0)+1; }
                      if (e.side){ s[e.side]++; (cats[e.side] ||= {})[e.cat_label]=(cats[e.side][e.cat_label]||0)+1; } });
  return {c, s, cats};
}
let counts = {c:{}, s:{}, cats:{}};
function showTip(pt, side, district){
  const name = side ? side + ' Yakası' : district, key = side || district;
  const n = side ? counts.s[side] : (counts.c[district]||0);
  const cats = Object.entries(counts.cats[key]||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]).join(' · ');
  const tip = $('#tip'); tip.innerHTML = `<b>${esc(name)}</b><div class="n">${n||0} etkinlik</div>${cats?`<div class="c">${esc(cats)}</div>`:''}`;
  tip.hidden = false;
  if (pt) { tip.style.left = pt.x+'px'; tip.style.top = pt.y+'px'; }
  else { const r = sideMarkers[side].el.getBoundingClientRect(); tip.style.left = (r.left)+'px'; tip.style.top = (r.bottom)+'px'; }
}
function hideTip(){ $('#tip').hidden = true; }

/* ---------- navigation ---------- */
let prevSel = null;
function go(st){
  hideTip();
  S.placeDetail = null;
  if (st.venue) { S.venue = st.venue; S.detail = null; render(); return; }
  S.level = st.level; S.side = st.side || null; S.district = st.district || null; S.venue = null; S.detail = null; S.open = {};
  if (prevSel) map.setFeatureState({source:'districts', id:prevSel}, {sel:false});
  districtFC.features.forEach(f => map.setFeatureState({source:'districts', id:f.properties.name}, {dim: S.level==='side' ? f.properties.side!==S.side : (S.level==='district' ? f.properties.name!==S.district : false)}));
  if (S.level === 'district') { map.setFeatureState({source:'districts', id:S.district}, {sel:true}); prevSel = S.district; }
  const b = S.level==='city' ? CITY_B : S.level==='side' ? sideBounds(S.side) : districtBounds(S.district);
  if (!st.noFly && b) map.fitBounds(b, {padding:{top:70,bottom:50,left:40,right:40}, duration:900, maxZoom:12.6});
  if (selMarker) { selMarker.remove(); selMarker = null; }
  render();
}

function openDetail(id, fromPin){
  const e = S.events.find(x => x.id === id); if (!e) return;
  S.detail = e; S.placeDetail = null;
  if (selMarker) selMarker.remove(); selMarker = null;
  if (e.lat != null) {
    const el = document.createElement('div'); el.style.cssText='width:26px;height:26px;border-radius:50%;border:3px solid #8e3b1c;box-shadow:0 0 0 3px rgba(250,244,232,.9);pointer-events:none';
    selMarker = new maplibregl.Marker({element:el}).setLngLat([e.lon,e.lat]).addTo(map);
    if (!fromPin) map.easeTo({center:[e.lon,e.lat], zoom:Math.max(map.getZoom(), 12.5)});
  }
  render();
}

/* ---------- places ---------- */
function setPlaces(d){
  S.places = d.places.map((p,i) => ({...p, _i:i, _s: fold([p.name, p.district, PLACE[p.cat]?.label, ...(p.subtypes||[])].join(' '))}));
  S.placeById = new Map(S.places.map(p => [p.id, p]));
  S.placeCounts = d.counts || {};
}
function placeRank(p){ return p.minzoom*1000 - Math.min(999, (p.event_ids?.length||0)*50 + Math.log1p(p.area_ha||0)*40); }
function updatePlaces(){
  const src = map.getSource('places'); if (!src) return;
  const q = S.q ? fold(S.q) : null;
  const feats = S.places.filter(p => S.placeOn.has(p.cat) && (!q || p._s.includes(q))).map(p => ({type:'Feature', geometry:{type:'Point', coordinates:[p.lon, p.lat]},
    properties:{id:p.id, cat:p.cat, name:p.name, sub:(p.subtypes||[])[0]||'', mz:[0,10,11,12,13,14].includes(p.minzoom)?p.minzoom:14, rank:placeRank(p)}}));
  src.setData({type:'FeatureCollection', features:feats});
}
function placeTip(pt, pr){
  const tip = $('#tip'); const P = PLACE[pr.cat];
  tip.innerHTML = `<b>${esc(pr.name)}</b><div class="n" style="color:${P.color}">${esc(pr.sub || P.short)}</div><div class="c">Ayrıntı için tıklayın</div>`;
  tip.hidden = false; tip.style.left = pt.x+'px'; tip.style.top = pt.y+'px';
}
function openPlace(id, fly){
  const p = S.placeById.get(id); if (!p) return;
  S.placeDetail = p; S.detail = null;
  if (selMarker) selMarker.remove();
  const el = document.createElement('div'); el.style.cssText=`width:30px;height:30px;border-radius:10px;border:3px solid ${PLACE[p.cat].color};box-shadow:0 0 0 3px rgba(250,244,232,.9);pointer-events:none`;
  selMarker = new maplibregl.Marker({element:el}).setLngLat([p.lon,p.lat]).addTo(map);
  if (fly) map.easeTo({center:[p.lon,p.lat], zoom:Math.max(map.getZoom(), Math.max(13, p.minzoom+.3))});
  render();
}
function placeRow(p){
  const P = PLACE[p.cat]; const ne = (p.event_ids||[]).filter(id => S.events.some(e => e.id===id)).length;
  const d = dist(p), km = d!=null ? ` · ${kmTxt(d)} km` : '';
  return `<div class="row prow" data-pid="${esc(p.id)}"><div class="l1">${badge(P.icon, P.color, 18)}<span class="nm">${esc(p.name)}</span><span class="dots"></span><span class="dt">${ne?ne+' etkinlik':''}</span>${heart('p', p.id, isFavP(p))}</div>
    <div class="l2"><span>${esc([(p.subtypes||[]).join(', '), p.district].filter(Boolean).join(' · '))}${km}</span></div></div>`;
}
function renderPlace(p){
  const P = PLACE[p.cat];
  $('#panel-head').innerHTML = `<button class="back" id="back">← Listeye dön</button><div class="dhead"><div class="pbadge">${badge(P.icon, P.color, 30)}</div><div class="kicker dcat" style="color:${P.color}">${esc(P.label.toLocaleUpperCase('tr'))}</div>
    <h1 class="ptitle ${p.name.length>22?'small':''}">${esc(p.name)}</h1><div class="favline">${heart('p', p.id, isFavP(p), true)}</div><div class="psub">${esc([p.district, p.side ? p.side+' Yakası' : ''].filter(Boolean).join(' · '))}</div><div class="diam">◆◆◆</div></div>`;
  $('#back').onclick = () => { S.placeDetail=null; if (selMarker){selMarker.remove(); selMarker=null;} render(); };
  bindFavs($('#panel-head'));
  $('#toolbar').innerHTML = '';
  const evs = (p.event_ids||[]).map(id => S.events.find(e => e.id===id)).filter(Boolean).filter(passChips);
  const pd = dist(p);
  const km = pd!=null ? `${kmTxt(pd)} km kuş uçuşu<small>Araba: ~${carMin(pd)} dk <i>(kaba tahmin; gerçek rota değil)</i></small>` : NOHOME;
  const web = p.website ? `<a href="${esc(/^https?:/.test(p.website)?p.website:'https://'+p.website)}" target="_blank" rel="noopener">${esc(p.website.replace(/^https?:\/\//,'').replace(/\/$/,''))}</a>` : UNK;
  const src = p.source_url ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener">${esc(p.source)}</a>` : esc(p.source||UNK);
  const oh = p.opening_hours ? esc(p.opening_hours) : UNK;
  const fee = p.fee==='yes' ? 'Ücretli' : p.fee==='no' ? 'Ücretsiz' : (p.fee ? esc(p.fee) : UNK);
  const desc = p.description ? `<p class="desc">${esc(p.description)}</p>` : '';
  const note = p.notes ? `<p class="psub" style="margin-top:6px">${esc(p.notes)}</p>` : '';
  $('#panel-body').innerHTML = `
    ${desc}
    <table class="facts">
      <tr><th>Tür</th><td>${esc((p.subtypes||[]).join(', ') || P.short)}<small>Harita katmanı: ${esc(P.label)}</small></td></tr>
      <tr><th>İlçe</th><td>${p.district?esc(p.district):UNK}</td></tr>
      <tr><th>Adres</th><td>${p.address?esc(p.address):UNK}</td></tr>
      <tr><th>Evime uzaklık</th><td>${km}</td></tr>
      <tr><th>Web sitesi</th><td>${web}</td></tr>
      <tr><th>Açılış saatleri</th><td>${oh}${p.opening_hours?'<small>Kaynak kaydına göre; gitmeden önce teyit edin.</small>':''}</td></tr>
      <tr><th>Giriş</th><td>${fee}</td></tr>
      <tr><th>Yaş</th><td>${p.age_label?esc(p.age_label):UNK}</td></tr>
      <tr><th>Kaynak</th><td>${src}${p.from_events?'<small>Bu nokta yaklaşan açık hava etkinliklerinin mekanından oluşturuldu.</small>':''}</td></tr>
    </table>
    ${note}
    <div class="links">
      <a class="btn fill" href="${esc(p.gmaps)}" target="_blank" rel="noopener">Google Haritalar'da aç</a>
      <a class="btn" href="${esc(gm(p,'driving'))}" target="_blank" rel="noopener">Yol tarifi · araba</a>
      <a class="btn" href="${esc(gm(p,'transit'))}" target="_blank" rel="noopener">Toplu taşıma</a>
    </div>
    <div class="sec"><span>Bu mekandaki yaklaşan etkinlikler · ${evs.length}</span></div>
    ${evs.length ? evs.sort((a,b)=>eff(a).localeCompare(eff(b))).map(row).join('') : '<div class="empty" style="padding:14px 4px">Bu mekan için yaklaşan etkinlik bulunamadı.</div>'}`;
  $('#panel-body').querySelectorAll('.row').forEach(r => r.onclick = () => { S.placeDetail=null; openDetail(+r.dataset.id); });
  bindFavs($('#panel-body'));
  $('#panel-body').scrollTop = 0;
  foot();
}
function inAreaP(p){
  if (S.level==='side') return p.side===S.side;
  if (S.level==='district') return p.district===S.district;
  return false;
}

/* ---------- vitrin: "Şehirde öne çıkanlar" (bilet koçanı kartlı şerit) ----------
   Liste data/one_cikanlar.json'dan gelir (payload.featured); rozetler gerçek tarih/ücret verisinden üretilir.
   Açılışta günde bir kez görünür; ✕ ile kapanınca araç satırında "Öne çıkanlar" düğmesine dönüşür, tekrar açılabilir. */
const VT_PAL = [['#b0502a','#7a2f14'],['#4f7f3a','#2a4a22'],['#c98a2e','#85501a'],['#7d5a8c','#43284f'],['#4f6f8f','#25384f']];   // site paleti: kiremit, yeşil, hardal, mor, mavi
const daysTo = (a, b) => Math.round((new Date(b+'T12:00:00') - new Date(a+'T12:00:00')) / 864e5);
function vitrinBadge(e, over){
  if (over) return over;
  const t = S.data.today, last = e.end_date || e.start_date, multi = last !== e.start_date;
  const toStart = daysTo(t, e.start_date), toEnd = daysTo(t, last);
  if (toStart > 0) return toStart === 1 ? (multi ? 'Yarın Başlıyor' : 'Yarın') : (toStart <= 14 ? 'Yakında' : null);
  if (!multi) return 'Bugün';
  return toEnd === 0 ? 'Son Gün' : toEnd <= 2 ? 'Son Günler' : 'Devam Ediyor';
}
function vitrinItems(){
  const byId = new Map(S.events.map(e => [e.id, e])), out = [];
  for (const it of (S.data.featured || [])) {
    const e = (it.ids || []).map(i => byId.get(i)).find(Boolean);   // tarihi geçen kayıt düşer, aynı başlıklı sonraki devralır
    if (e && !out.some(o => o.e.id === e.id)) out.push({e, over: it.rozet, img: e.image || it.gorsel || null});
  }
  return out.slice(0, 5);
}
function vitrinCard(e, i){   // i: sıra (0'dan); her numaraya farklı renk
  const [c1, c2] = VT_PAL[(i || 0) % VT_PAL.length];
  const loc = [e.district, e.venue].filter(Boolean)[0] || '';
  return `<span class="vt-card" style="background:linear-gradient(165deg,${c1},${c2})"><span class="vt-ic">${ico(CAT_ICON[e.cat_group]||'sparkles','#fff',120)}</span><span class="vt-k">${esc((e.cat_label||'').toLocaleUpperCase('tr'))}</span><span class="vt-t">${esc(nice(e.title))}</span><span class="vt-l">${esc(loc)}</span></span>`;
}
function renderVitrin(){
  const el = $('#vitrin'), btn = $('#btn-vitrin'); if (!el || !btn) return;
  const items = vitrinItems(), n = items.length;
  S.vitrinN = n;
  if (!n) { el.hidden = true; btn.hidden = true; document.body.classList.remove('vitrin-open'); return; }
  el.innerHTML = `<div class="vt-head"><div class="vt-kick">DIŞARIDA · SEÇKİLER</div><h2 class="vt-title">Şehirde öne çıkanlar</h2><span class="vt-sub">${n} seçme etkinlik · kaydırın →</span>
      <button type="button" class="vt-x" id="vt-x" aria-label="Vitrini kapat" title="Kapat">${ico('x','currentColor',16)}</button></div>
    <div class="vt-wrap"><div class="vt-strip" id="vt-strip" role="list">${items.map((o, i) => {
      const e = o.e, b = vitrinBadge(e, o.over), free = e.is_free === 1 && b !== 'Ücretsiz';
      return `<button type="button" class="vt-item" role="listitem" data-id="${e.id}" aria-label="${i+1}. ${esc(nice(e.title))}${b ? ', ' + esc(b) : ''}">
        <span class="vt-num" aria-hidden="true">${i+1}</span>
        <span class="vt-tk"><span class="vt-poster">${o.img ? `<img src="${esc(o.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fb="${e.id}" data-i="${i}">` : vitrinCard(e, i)}<span class="vt-tags">${b ? `<span class="vt-badge">${esc(b)}</span>` : ''}${free ? '<span class="vt-free">Ücretsiz</span>' : ''}</span></span>
        <span class="vt-perf" aria-hidden="true"></span>
        <span class="vt-cap"><b>${esc(nice(e.title))}</b><i class="vt-w">${esc(when(e))}</i><i class="vt-d">${esc(e.district || '')}</i></span></span></button>`; }).join('')}</div></div>`;
  el.querySelectorAll('img[data-fb]').forEach(im => im.addEventListener('error', () => {   // afiş yüklenemezse başlık kartı
    const e = S.events.find(x => x.id === +im.dataset.fb); if (e) im.outerHTML = vitrinCard(e, +im.dataset.i); }, {once:true}));
  el.querySelectorAll('.vt-item').forEach(b => b.onclick = () => { setVitrin(false); openDetail(+b.dataset.id); });
  $('#vt-x').onclick = () => setVitrin(false);
  btn.innerHTML = `${ico('trophy','currentColor',13)}<span class="lf">Öne çıkanlar</span><span class="ls">Seçkiler</span>`;
  btn.title = 'Şehirde öne çıkan etkinlikleri aç';
  setVitrin(S.vitrinOpen, true);
}
function setVitrin(open, quiet){
  const el = $('#vitrin'), btn = $('#btn-vitrin'); if (!el || !btn || !S.vitrinN) return;
  S.vitrinOpen = open;
  el.hidden = !open; btn.hidden = open; btn.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('vitrin-open', open);
  if (!quiet) LS.set('vitrin', {d: S.data.today, kapali: !open});
  if (open && !quiet) $('#vt-strip')?.scrollTo({left:0});
}
function initVitrin(){
  const v = LS.get('vitrin', null);
  S.vitrinOpen = !(v && v.d === S.data.today && v.kapali);   // günde bir kez açık başlar; kapatılırsa o gün küçük düğme olarak kalır
  renderVitrin();
}
$('#btn-vitrin').onclick = () => setVitrin(true);

/* ---------- render ---------- */
function setData(d){
  d = freshen(d); S.data = d;
  S.events = d.events.map(e => ({...e, _s: fold([e.title, e.venue, e.district, e.cat_label, e.address, e.age_label, e.side ? e.side+' yakasi' : ''].join(' '))}));
}
let lastViewKey = '';
function render(){
  // görünüm değişince (ilçe, detay, yer, favoriler) panel başa sarılır; mobilde tüm panel kayar
  const vk = [S.level, S.side, S.district, S.detail?.id, S.placeDetail?.id, S.view, S.venue?.title].join('|');
  if (vk !== lastViewKey) { lastViewKey = vk; const pi = $('.panel-inner'); if (pi) pi.scrollTop = 0; }
  const list = filtered();
  counts = districtCounts(list);
  updatePins(list); updatePlaces(); renderLegend();
  Object.entries(sideMarkers).forEach(([k,s]) => s.el.querySelector('.s').textContent = `${counts.s[k]||0} ETKİNLİK`);
  renderCrumbs(); renderChips();
  $('#chips').style.display = (S.detail || S.placeDetail || S.view==='favs') ? 'none' : '';
  renderPop(); renderTools(); applyFsDetail();
  if (S.detail) return renderDetail(S.detail);
  if (S.placeDetail) return renderPlace(S.placeDetail);
  if (S.view === 'favs') return renderFavs();
  let area = list.filter(inArea), title, kicker, sub;
  if (S.venue) { area = list.filter(e => e.lat!=null && S.venue.keys.has(e.lat.toFixed(4)+','+e.lon.toFixed(4))); title = S.venue.title; kicker='MEKAN'; sub = area[0]?.district ? `${area[0].district} · ${area.length} etkinlik` : `${area.length} etkinlik`; }
  else if (S.level==='city') { title='İstanbul'; kicker='DIŞARIDA'; sub=`Şehirde ne var? · etkinlikler ve yerler · ${S.data.stats.sources} kaynak`; }
  else if (S.level==='side') { title=S.side+' Yakası'; kicker='YAKA'; sub=`${S.side==='Anadolu'?14:25} ilçe`; }
  else { title=S.district; kicker=(S.side||'').toLocaleUpperCase('tr')+' YAKASI'; sub = (S.home && S.home.district===S.district) ? 'Evinizin olduğu ilçe' : ''; }
  $('#panel-head').innerHTML = `${(S.level!=='city'||S.venue)?'<button class="back" id="back">← Geri</button>':''}
    <div class="kicker">${esc(kicker)}</div><h1 class="ptitle ${title.length>14?'small':''}">${esc(title)}</h1>${sub?`<div class="psub">${esc(sub)}</div>`:''}<div class="diam">◆◆◆</div>`;
  $('#back')?.addEventListener('click', () => {
    if (S.venue) { S.venue=null; render(); } else if (S.level==='district') go({level:'side', side:S.side}); else go({level:'city'}); });
  const pins = area.filter(e=>e.lat!=null).length;
  const hidA = S.age.showAdult ? 0 : hiddenAdults(S.venue ? S.events.filter(e => e.lat!=null && S.venue.keys.has(e.lat.toFixed(4)+','+e.lon.toFixed(4))) : S.events.filter(inArea));
  $('#toolbar').innerHTML = `<span>${area.length} etkinlik · ${pins} haritada${hidA ? ` · <button class="linkbtn" id="showadult" title="Kaynakta yetişkinlere yönelik olarak işaretlenmiş etkinlikler">${hidA} yetişkin etkinliği gizli · göster</button>` : ''}</span><span class="sort">Sırala: <button data-s="date" class="${S.sort==='date'?'on':''}">Tarih</button>|<button data-s="near" class="${S.sort==='near'?'on':''}" title="${S.home?'Ev konumunuza yakınlığa göre':'Önce ev konumunuzu seçin'}">Evime yakın</button></span>`;
  $('#showadult')?.addEventListener('click', ev => { ev.stopPropagation(); S.age.showAdult = true; saveAge(); render(); });
  $('#toolbar').querySelectorAll('button[data-s]').forEach(b => b.onclick = () => { if (b.dataset.s==='near' && !S.home) return openHomeDialog(); S.sort=b.dataset.s; render(); });
  const body = $('#panel-body');
  const yer = placesSection();
  if (!area.length) { body.innerHTML = `<div class="empty">Bu seçimle eşleşen yaklaşan etkinlik bulunamadı.</div>` + yer; bindRows(body); return foot(); }
  const groups = {};
  area.forEach(e => (groups[e.cat_label] ||= []).push(e));
  const so = (a,b) => (a.sold_out===1) - (b.sold_out===1);
  const cmp = (S.sort==='near' && S.home) ? (a,b)=>so(a,b) || (dist(a)??1e9)-(dist(b)??1e9) || a.start_date.localeCompare(b.start_date)
                               : (a,b)=>so(a,b) || eff(a).localeCompare(eff(b)) || isLong(a)-isLong(b) || (a.start_time||'').localeCompare(b.start_time||'');
  let html = '';
  CAT_ORDER.filter(c => groups[c]).forEach(c => {
    const arr = groups[c].sort(cmp), lim = S.open[c] ? arr.length : 10;
    html += `<div class="sec"><span>${esc(c)} · ${arr.length}</span></div>`;
    arr.slice(0, lim).forEach(e => html += row(e));
    if (arr.length > lim) html += `<button class="morebtn" data-c="${esc(c)}">+${arr.length-lim} etkinlik daha</button>`;
  });
  body.innerHTML = html + yer;
  bindRows(body);
  foot();
}
function bindRows(body){
  body.querySelectorAll('.row').forEach(r => r.onclick = () => r.dataset.pid ? openPlace(r.dataset.pid, true) : openDetail(+r.dataset.id));
  bindFavs(body);
  body.querySelectorAll('.morebtn').forEach(b => b.onclick = () => { S.open[b.dataset.c]=true; render(); });
}
function placesSection(){
  if (S.venue || S.level==='city') return '';
  const q = S.q ? fold(S.q) : null;
  const ps = S.places.filter(p => inAreaP(p) && S.placeOn.has(p.cat) && (!q || p._s.includes(q)));
  if (!ps.length) return '';
  let h = `<div class="yerhead"><span>Yerler</span><small>${ps.length} kalıcı mekan · OpenStreetMap ve kaynak listesi</small></div>`;
  PLACE_ORDER.forEach(c => {
    const arr = ps.filter(p => p.cat===c).sort((a,b) => (b.event_ids?.length||0)-(a.event_ids?.length||0) || a.minzoom-b.minzoom || (b.area_ha||0)-(a.area_ha||0));
    if (!arr.length) return;
    const key = 'pl-'+c, lim = S.open[key] ? arr.length : 6;
    h += `<div class="sec"><span>${badge(PLACE[c].icon, PLACE[c].color, 16)} ${esc(PLACE[c].label)} · ${arr.length}</span></div>`;
    arr.slice(0, lim).forEach(p => h += placeRow(p));
    if (arr.length > lim) h += `<button class="morebtn" data-c="${key}">+${arr.length-lim} yer daha</button>`;
  });
  return h;
}
function eff(e){ return e.start_date < S.data.today ? S.data.today : e.start_date; }
function isLong(e){ return e.end_date && e.end_date > addDays(e.start_date, 13) ? 1 : 0; }
function row(e){
  const tags = [];
  if (e.is_free===1) tags.push('<span class="tag free">ÜCRETSİZ</span>');
  const at = ageText(e);
  if (at) tags.push(`<span class="tag age ${ageActive()?'fit':''}">${esc(at.toLocaleUpperCase('tr'))}</span>`);
  else if (ageActive()) tags.push('<span class="tag nopin" title="Kaynakta yaş bilgisi yok">YAŞ BİLGİSİ YOK</span>');
  if (e.audience==='yetiskin') tags.push(`<span class="tag adult" title="${esc(e.audience_reason||'')}">YETİŞKİN</span>`);
  else if (e.audience==='belirsiz') tags.push(`<span class="tag unclear" title="${esc(e.audience_reason||'Kaynakta yaş/hedef kitle bilgisi yok')}">UYGUNLUK BELİRSİZ</span>`);
  if (e.sold_out===1) tags.push('<span class="tag so">TÜKENDİ</span>');
  if (e.lat==null) tags.push('<span class="tag nopin" title="Konum bulunamadı; haritada gösterilemiyor">KONUMSUZ</span>');
  const loc = [e.district || (e.outside_istanbul ? 'İstanbul dışı' : 'İlçe bilinmiyor'), e.venue].filter(Boolean).join(' · ');
  const d = dist(e), km = d!=null ? ` · ${kmTxt(d)} km` : '';
  return `<div class="row" data-id="${e.id}"><div class="l1">${badge(CAT_ICON[e.cat_group]||'sparkles', CAT_COLOR[e.cat_group]||'#888', 18)}<span class="nm" title="${esc(nice(e.title))}">${esc(nice(e.title))}</span><span class="ra">${shareBtns(e)}${heart('e', e.id, isFavE(e))}</span></div>
    <div class="l2"><span class="meta"><b class="dt">${esc(when(e))}</b><span class="sep">·</span>${esc(loc)}${km}</span><span class="tags">${tags.join('')}</span></div></div>`;
}
function yn(v, y='Var', n='Yok'){ return v===1 ? y : v===0 ? n : UNK; }
function renderDetail(e){
  $('#panel-head').innerHTML = `<button class="back" id="back">← Listeye dön</button><div class="dhead"><div class="pbadge">${badge(CAT_ICON[e.cat_group]||'sparkles', CAT_COLOR[e.cat_group], 30)}</div><div class="kicker dcat" style="color:${CAT_COLOR[e.cat_group]}">${esc(e.cat_label.toLocaleUpperCase('tr'))}</div>
    <h1 class="ptitle">${esc(nice(e.title))}</h1><div class="psub">${esc([e.district, e.venue].filter(Boolean).join(' · ') || '')}</div><div class="favline">${heart('e', e.id, isFavE(e), true)}</div><div class="diam">◆◆◆</div></div>`;
  $('#back').onclick = () => { S.detail=null; if (selMarker){selMarker.remove(); selMarker=null;} render(); };
  bindFavs($('#panel-head'));
  $('#toolbar').innerHTML = '';
  const ageBadge = (v,l) => `<span class="${v===true?'y':v===false?'n':'u'}">${esc(l)}: ${v===true?'Uygun':v===false?'Uygun değil':'Yaş bilgisi yok'}</span>`;
  const sel = ageRanges();
  const ageBadges = sel.length ? sel.map(([lo,hi,l]) => ageBadge(ageFits(e, lo, hi), l)).join('') : '<span class="u">Yaş seçerseniz uygunluk burada görünür</span>';
  let date = esc(e.end_date && e.end_date!==e.start_date ? `${dlong(e.start_date)} – ${dlong(e.end_date)}` : dlong(e.start_date));
  date += e.start_time ? `<small>Başlangıç ${esc(e.start_time)}${e.end_time?' · Bitiş '+esc(e.end_time):''}</small>` : '<small>Saat: Bilgi bulunamadı</small>';
  if (e.session_notes) date += `<small>${esc(e.session_notes)}</small>`;
  let price = e.is_free===1 ? 'Ücretsiz' : e.is_free===0 ? 'Ücretli' : UNK;
  if (e.price_per_person_try) price += `<small>Kişi başı ${e.price_per_person_try.toLocaleString('tr-TR')} ₺ (kaynakta yazan)</small>`;
  if (e.price_notes) price += `<small>${esc(e.price_notes)}</small>`;
  const io = {kapali:'Kapalı alan', acik:'Açık hava', mixed:'Açık + kapalı'}[e.indoor_outdoor] || UNK;
  const addr = [e.venue && `<b>${esc(e.venue)}</b>`, e.address && esc(e.address)].filter(Boolean).join('<br>') || UNK;
  const dnote = e.district ? `<small>İlçe: ${esc(e.district)}${e.district_how==='kaynak ilçesi'?' (etkinliği yayınlayan belediye)':''}</small>` : (e.outside_istanbul?'<small>İstanbul dışında</small>':'');
  const pinNote = e.lat==null ? '<small>Konum bulunamadı, haritada gösterilmiyor.</small>' : (e.geo_source==='nominatim' ? '<small>Konum: mekan adından OpenStreetMap ile bulundu.</small>' : '<small>Konum: kaynakta yazan koordinat.</small>');
  const ed = dist(e);
  const distH = ed!=null ? `${kmTxt(ed)} km kuş uçuşu<small>Araba: ~${carMin(ed)} dk <i>(kaba tahmin: kuş uçuşu × 1,3, ort. 32 km/sa; gerçek rota değil)</i></small><small>Toplu taşıma: Bilgi bulunamadı, aşağıdaki Google Maps bağlantısına bakın.</small>` : (e.lat==null ? UNK : NOHOME);
  const srcs = e.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join('<br>');
  const ver = e.collected_at ? `<small>Kaynaktan alındı: ${esc(new Date(e.collected_at).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'}))}</small>` : '';
  const AUD = {aile:['y','Çocuk/aile için uygun görünüyor'], yetiskin:['n','Yetişkinlere yönelik'], belirsiz:['u','Belirsiz']};
  const [ac, at] = AUD[e.audience] || AUD.belirsiz;
  const audH = `<div class="age3"><span class="${ac}">${esc(at)}</span></div><small>${esc(e.audience_reason ? 'Dayanak: '+e.audience_reason : 'Kaynakta yaş/hedef kitle bilgisi yok')}</small>`;
  const body = `
    ${e.image ? `<img class="dimg" src="${esc(e.image)}" alt="">` : ''}
    <table class="facts">
      <tr><th>Tarih</th><td>${date}</td></tr>
      <tr><th>Yaş</th><td>${e.age_label?esc(e.age_label):(ageText(e)?esc(ageText(e)):'<span class="unk">Yaş bilgisi yok</span>')}<div class="age3" style="margin-top:6px">${ageBadges}</div></td></tr>
      <tr><th>Aile uygunluğu</th><td>${audH}</td></tr>
      <tr><th>Ücret</th><td>${price}${e.companion_fee?`<small>Refakatçi: ${esc(e.companion_fee)}</small>`:''}</td></tr>
      <tr><th>Alan</th><td>${io}</td></tr>
      <tr><th>Rezervasyon</th><td>${yn(e.reservation_required,'Gerekli','Gerekmiyor')}</td></tr>
      <tr><th>Doğa</th><td>${yn(e.nature)}</td></tr>
      <tr><th>Hayvan</th><td>${yn(e.animal)}</td></tr>
      <tr><th>Süre</th><td>${e.duration_minutes?e.duration_minutes+' dk':UNK}</td></tr>
      <tr><th>Mekan</th><td>${addr}${dnote}${pinNote}</td></tr>
      <tr><th>Evime uzaklık</th><td>${distH}</td></tr>
      <tr><th>Durum</th><td>${e.sold_out===1?'<b style="color:#a33">Biletler tükendi</b>':'Yaklaşan'}</td></tr>
      <tr><th>Kaynak</th><td>${srcs}${ver}</td></tr>
    </table>
    ${e.description ? `<p class="desc">${esc(e.description.length>700?e.description.slice(0,700)+'…':e.description)}</p>` : ''}
    <div class="links">
      ${e.ticket_url ? `<a class="btn fill" href="${esc(e.ticket_url)}" target="_blank" rel="noopener">Bilet / kayıt</a>` : ''}
      <a class="btn ${e.ticket_url?'':'fill'}" href="${esc(e.official_url)}" target="_blank" rel="noopener">Resmi sayfa</a>
      ${gm(e,'driving') ? `<a class="btn" href="${esc(gm(e,'driving'))}" target="_blank" rel="noopener">Yol tarifi · araba</a>` : ''}
      ${gm(e,'transit') ? `<a class="btn" href="${esc(gm(e,'transit'))}" target="_blank" rel="noopener">Toplu taşıma</a>` : ''}
    </div>
    <div class="links share">
      <button class="btn ico-btn" id="d-ics">${ico('calendar-plus','currentColor',16)} Takvime ekle (.ics)</button>
      <a class="btn ico-btn gcal" href="${esc(gcalUrl(e))}" target="_blank" rel="noopener">${ico('calendar','currentColor',16)} Google Takvim</a>
      <a class="btn ico-btn wa" href="${esc(waUrl(e))}" target="_blank" rel="noopener">${ico('message-circle','currentColor',16)} WhatsApp'ta paylaş</a>
    </div>
    ${e.ticket_url ? '' : '<p class="psub" style="margin-top:6px">Bilet bağlantısı: Bilgi bulunamadı</p>'}`;
  $('#panel-body').innerHTML = body; $('#panel-body').scrollTop = 0;
  $('#d-ics').onclick = () => downloadIcs(e);
  foot();
}
function renderChips(){
  const active = S.filters;
  const vis = CHIPS.filter((c,i) => i < PRIMARY || S.chipsOpen || active.has(c[0]));
  // keep the filter bar compact: popovers render under it
  const hidden = CHIPS.length - vis.length;
  const lab = (k, l) => {
    if (k === '__date') return `${ico('calendar','currentColor',13)} ${S.date ? esc(rangeTxt(S.date.from, S.date.to)) : 'Tarih seç'}`;
    if (k === '__age') return `${ico('baby','currentColor',13)} ${ageActive() ? 'Yaş: '+esc(ageLabel()) : 'Yaş'}`;
    if (k === 'hs' || k === 'ghs') { const [a,b] = weekend(k==='ghs'); return `${l} <small>${esc(rangeTxt(a,b))}</small>`; }
    return l; };
  const isOn = k => k==='tumu' ? (active.size===0 && !S.date && !ageActive()) : k==='__date' ? (!!S.date || S.pop==='date') : k==='__age' ? (ageActive() || S.pop==='age') : active.has(k);
  $('#chips').innerHTML = vis.map(([k,l]) => `<button class="chip ${isOn(k)?'on':''} ${k.startsWith('__')?'special':''}" data-k="${k}">${lab(k,l)}</button>`).join('')
    + (hidden ? `<button class="chip more" data-k="__more">+${hidden}</button>` : (S.chipsOpen ? `<button class="chip more" data-k="__less">−</button>` : ''));
  $('#chips').querySelectorAll('.chip').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k==='__date' || k==='__age') { S.pop = S.pop===k.slice(2) ? null : k.slice(2); if (S.pop==='date' && !S.cal) S.cal = (S.date?.from || S.data.today).slice(0,7); return render(); }
    if (k==='__more') S.chipsOpen = true; else if (k==='__less') S.chipsOpen = false;
    else if (k==='tumu') { S.filters.clear(); S.date = null; S.age.groups = []; S.age.kids = []; saveAge(); S.pop = null; }
    else if (S.filters.has(k)) S.filters.delete(k);
    else { EXCL.forEach(g => g.includes(k) && g.forEach(x => S.filters.delete(x))); S.filters.add(k); if (DATECHIPS.includes(k)) S.date = null; }
    S.detail = null; S.open = {}; render();
  });
}
function renderCrumbs(){
  const parts = [['İstanbul', () => go({level:'city'}), S.level==='city']];
  if (S.side) parts.push([S.side+' Yakası', () => go({level:'side', side:S.side}), S.level==='side']);
  if (S.district) parts.push([S.district, () => go({level:'district', district:S.district, side:S.side}), S.level==='district']);
  const c = $('#crumbs'); c.innerHTML = '';
  const t = document.createElement('button'); t.textContent='Türkiye'; t.onclick = () => go({level:'city'}); c.appendChild(t);
  parts.forEach(([l, fn, on]) => { const s = document.createElement('span'); s.className='sep'; s.textContent='›'; c.appendChild(s);
    const b = document.createElement('button'); b.textContent=l; if (on) b.className='on'; b.onclick=fn; c.appendChild(b); });
  c.scrollLeft = c.scrollWidth; // mobilde yatay kayan satırda son (seçili) adım görünsün
}
function foot(){
  const st = S.data.stats, last = S.data.last_scrape ? new Date(S.data.last_scrape).toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'}) : 'bilinmiyor';
  $('#panel-foot').innerHTML = `Son tarama: ${esc(last)} · ${st.upcoming} yaklaşan etkinlik · ${st.with_pin} haritada, ${st.without_pin} konumsuz`;
}
const legend = $('#legend');
function renderLegend(){
  if (!legend) return;
  const pc = {}; S.places.forEach(p => pc[p.cat] = (pc[p.cat]||0)+1);
  // event counts: all other active filters (date, weekend, age, search, area) applied, category toggle ignored
  const ec = {}; S.events.forEach(e => { if (passChips(e, true) && (S.level==='city' || inArea(e))) ec[e.cat_group] = (ec[e.cat_group]||0)+1; });
  legend.innerHTML = `<button class="lg-x" data-act="legend-close" aria-label="Katmanları kapat">${ico('x','currentColor',14)}</button><div class="lg-h">Etkinlikler <small>(açıp kapatın)</small></div><div class="lg-pl lg-evc">${Object.entries(CAT_NAME).map(([k,l]) => `<label class="${S.catOn.has(k)?'on':''}"><input type="checkbox" data-c="${k}" ${S.catOn.has(k)?'checked':''}>${badge(CAT_ICON[k], CAT_COLOR[k], 18)}<span>${esc(l)}</span><em>${ec[k]||0}</em></label>`).join('')}</div>
    <div class="lg-h">Yerler <small>(açıp kapatın)</small></div><div class="lg-pl">${PLACE_ORDER.map(k => `<label class="${S.placeOn.has(k)?'on':''}" title="${esc(PLACE[k].desc)}"><input type="checkbox" data-k="${k}" ${S.placeOn.has(k)?'checked':''}>${badge(PLACE[k].icon, PLACE[k].color, 18)}<span>${esc(PLACE[k].label)}</span><em>${pc[k]||0}</em></label>`).join('')}</div>
    <div class="lg-note">Küçük parklar ve oyun alanları yakınlaştırınca görünür.</div>`;
  legend.querySelectorAll('input[data-k]').forEach(i => i.onchange = () => { i.checked ? S.placeOn.add(i.dataset.k) : S.placeOn.delete(i.dataset.k); LS.set('placeLayers', [...S.placeOn]); S.open = {}; render(); });
  legend.querySelectorAll('input[data-c]').forEach(i => i.onchange = () => { i.checked ? S.catOn.add(i.dataset.c) : S.catOn.delete(i.dataset.c); LS.set('cats', [...S.catOn]); S.open = {}; render(); });
}

/* ---------- popovers: date picker + age ---------- */
function renderPop(){
  const el = $('#pop'); if (!el) return;
  if (!S.pop || S.detail || S.placeDetail || S.view==='favs') { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  if (S.pop === 'date') return renderCal(el);
  const kids = S.age.kids.map((a,i) => `<span class="kid">${esc(fmtAge(a))} yaş<button data-rm="${i}" aria-label="Kaldır">${ico('x','currentColor',11)}</button></span>`).join('');
  el.innerHTML = `<div class="pop-h">Yaş grubu <small>birden fazla seçebilirsiniz</small></div>
    <div class="agechips">${AGE_GROUPS.map(([k,l]) => `<button class="chip ${S.age.groups.includes(k)?'on':''}" data-g="${k}">${l}</button>`).join('')}</div>
    <div class="pop-h">Çocuklarımın yaşları <small>her çocuk için ayrı ekleyin</small></div>
    <div class="kids">${kids}<form id="kidform"><input id="kidage" type="number" min="0" max="18" step="0.5" inputmode="decimal" placeholder="örn. 4" aria-label="Çocuğun yaşı"><button class="chip" type="submit">+ Ekle</button></form></div>
    <label class="chk"><input type="checkbox" id="hideunk" ${S.age.hideUnknown?'checked':''}> Yaş bilgisi olmayan etkinlikleri gizle</label>
    <div class="pop-h">Aile uygunluğu <small>kaynaktaki yaş/hedef kitle bilgisine göre</small></div>
    <label class="chk"><input type="checkbox" id="showadult2" ${S.age.showAdult?'checked':''}> <span>Yetişkinlere yönelik etkinlikleri de göster <small>(+18, yetişkin oyunu vb.)</small></span></label>
    <label class="chk"><input type="checkbox" id="showunc" ${S.age.showUnclear!==false?'checked':''}> <span>Uygunluğu belirsiz etkinlikleri göster <small>(kaynakta bilgi yok)</small></span></label>
    <div class="pop-note">Etkinliğin kaynakta yazan yaş aralığı seçtiğiniz yaşlardan en az birini kapsıyorsa gösterilir. Yaş bilgisi olmayanlar “Yaş bilgisi yok” etiketiyle listelenir.</div>
    <div class="pop-f"><button class="linkbtn" id="ageclr">Temizle</button><button class="btn fill" id="popok">Tamam</button></div>`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const k = b.dataset.g, g = S.age.groups; g.includes(k) ? g.splice(g.indexOf(k),1) : g.push(k); saveAge(); render(); });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { S.age.kids.splice(+b.dataset.rm, 1); saveAge(); render(); });
  $('#kidform').onsubmit = ev => { ev.preventDefault(); const v = parseFloat(String($('#kidage').value).replace(',','.'));
    if (isNaN(v) || v < 0 || v > 18) return; const a = Math.round(v*2)/2; if (!S.age.kids.includes(a)) S.age.kids.push(a); S.age.kids.sort((x,y)=>x-y); saveAge(); render(); setTimeout(()=>$('#kidage')?.focus(), 0); };
  $('#hideunk').onchange = ev => { S.age.hideUnknown = ev.target.checked; saveAge(); render(); };
  $('#showadult2').onchange = ev => { S.age.showAdult = ev.target.checked; saveAge(); render(); };
  $('#showunc').onchange = ev => { S.age.showUnclear = ev.target.checked; saveAge(); render(); };
  $('#ageclr').onclick = () => { S.age = {groups:[], kids:[], hideUnknown:false, showAdult:false, showUnclear:true}; saveAge(); render(); };
  $('#popok').onclick = () => { S.pop = null; render(); };
}
function renderCal(el){
  const T = S.data.today, [y, m] = S.cal.split('-').map(Number);
  const first = new Date(y, m-1, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m, 0).getDate();
  const iso = d => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  // events per day with all other filters applied (date filters ignored)
  const keepD = S.date, keepF = new Set(S.filters); S.date = null; DATECHIPS.forEach(k => S.filters.delete(k));
  const base = S.events.filter(passChips); S.date = keepD; S.filters = keepF;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cd empty"></span>';
  for (let d = 1; d <= days; d++) {
    const D = iso(d), past = D < T, n = past ? 0 : base.filter(e => inWindow(e, D, D)).length;
    const inR = S.date && D >= S.date.from && D <= S.date.to, edge = S.date && (D === S.date.from || D === S.date.to);
    const dow = (lead + d - 1) % 7;
    cells += `<button class="cd ${past?'past':''} ${inR?'inr':''} ${edge?'edge':''} ${D===T?'today':''} ${dow>=5?'we':''}" data-d="${D}" ${past?'disabled':''} title="${n} etkinlik">${d}${n?`<i>${n>99?'99+':n}</i>`:''}</button>`;
  }
  const canPrev = S.cal > T.slice(0,7);
  el.innerHTML = `<div class="cal-h"><button class="nav" id="cprev" ${canPrev?'':'disabled'} aria-label="Önceki ay">‹</button><b>${AYLAR_UZUN[m-1]} ${y}</b><button class="nav" id="cnext" aria-label="Sonraki ay">›</button></div>
    <div class="cal-g">${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(g => `<span class="dn">${g}</span>`).join('')}${cells}</div>
    <div class="pop-note">${S.date ? `Seçili: <b>${esc(rangeTxt(S.date.from, S.date.to))}</b>${S.date.from===S.date.to?' · aralık için bitiş gününe tıklayın':''}` : 'Bir güne tıklayın; aralık için ikinci bir güne tıklayın.'}</div>
    <div class="pop-f"><button class="linkbtn" id="calclr">Temizle</button><button class="btn fill" id="popok">Tamam</button></div>`;
  const mv = k => { const d = new Date(y, m-1+k, 1); S.cal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; render(); };
  $('#cprev').onclick = () => canPrev && mv(-1); $('#cnext').onclick = () => mv(1);
  el.querySelectorAll('.cd[data-d]').forEach(b => b.onclick = () => {
    const D = b.dataset.d;
    if (S.date && S.date.from === S.date.to && D > S.date.from && !S._rangeDone) { S.date = {from:S.date.from, to:D}; S._rangeDone = true; }
    else { S.date = {from:D, to:D}; S._rangeDone = false; }
    DATECHIPS.forEach(k => S.filters.delete(k)); S.open = {}; render(); });
  $('#calclr').onclick = () => { S.date = null; render(); };
  $('#popok').onclick = () => { S.pop = null; render(); };
}

/* ---------- favourites view ---------- */
function renderFavs(){
  const T = S.data.today, n = favCount();
  $('#panel-head').innerHTML = `<button class="back" id="back">← Geri</button><div class="kicker">KİŞİSEL LİSTE</div><h1 class="ptitle">Favorilerim</h1><div class="psub">${n} kayıt · bu tarayıcıda saklanır, hesap gerekmez</div><div class="diam">◆◆◆</div>`;
  $('#back').onclick = () => { S.view = null; render(); };
  $('#toolbar').innerHTML = '';
  const cur = [], old = [];
  Object.entries(S.favs.e).forEach(([k, snap]) => {
    const e = S.events.find(x => favKey(x) === k) || S.events.find(x => x.id === snap.id && x.title === snap.title);
    if (e) cur.push(e); else old.push({k, ...snap});
  });
  cur.sort((a,b) => eff(a).localeCompare(eff(b)));
  old.sort((a,b) => (b.end_date||b.start_date).localeCompare(a.end_date||a.start_date));
  let h = '';
  if (!n) h = `<div class="empty">Henüz favori yok.<br><small>Etkinlik veya yer satırlarındaki ${ico('heart','currentColor',13)} simgesine tıklayarak ekleyin.</small></div>`;
  if (cur.length) { h += `<div class="sec"><span>Yaklaşan etkinlikler · ${cur.length}</span></div>`; cur.forEach(e => h += row(e)); }
  if (old.length) {
    h += `<div class="sec"><span>Geçmiş / listeden kalkan · ${old.length}</span></div>`;
    old.forEach(o => { const past = (o.end_date || o.start_date) < T;
      h += `<div class="row old"><div class="l1">${badge(CAT_ICON[o.cat_group]||'sparkles', '#b3a898', 18)}<span class="nm">${esc(nice(o.title))}</span><span class="dots"></span><span class="dt">${esc(when(o))}</span><button class="fav on" data-oldk="${esc(o.k)}" title="Favorilerden çıkar">${ico('heart','currentColor',15)}</button></div>
        <div class="l2"><span>${esc([o.district, o.venue].filter(Boolean).join(' · '))}</span><span class="tags"><span class="tag past">${past?'GEÇMİŞ':'LİSTEDE YOK'}</span>${o.official_url?`<a class="tag" href="${esc(o.official_url)}" target="_blank" rel="noopener">KAYNAK</a>`:''}</span></div></div>`; });
  }
  const ps = Object.values(S.favs.p).map(sn => S.placeById.get(sn.id) || null).filter(Boolean);
  if (ps.length) { h += `<div class="sec"><span>Yerler · ${ps.length}</span></div>`; ps.forEach(p => h += placeRow(p)); }
  const body = $('#panel-body'); body.innerHTML = h; body.scrollTop = 0;
  bindRows(body);
  body.querySelectorAll('[data-oldk]').forEach(b => b.onclick = ev => { ev.stopPropagation(); delete S.favs.e[b.dataset.oldk]; LS.set('favs', S.favs); render(); });
  foot();
}
function renderTools(){
  // uzun + kısa etiket: dar ekranda kısa olan görünür (CSS .lf/.ls)
  const lab = (i, full, short) => `${ico(i,'currentColor',13)}<span class="lf">${full}</span><span class="ls">${short}</span>`;
  $('#btn-legend').innerHTML = lab('layers', 'Katmanlar', 'Katmanlar'); $('#btn-legend').classList.toggle('on', S.legendOpen); $('#btn-legend').setAttribute('aria-expanded', String(S.legendOpen));
  const n = favCount();
  $('#btn-fav').innerHTML = lab('heart', 'Favorilerim', 'Favoriler') + (n?`<b>${n}</b>`:''); $('#btn-fav').classList.toggle('on', S.view==='favs');
  $('#btn-home').innerHTML = lab('house', S.home ? 'Ev: '+esc(S.home.short || S.home.name) : 'Ev seç', S.home ? 'Ev' : 'Ev seç');
  $('#btn-home').title = S.home ? `Ev konumu: ${S.home.name}. Değiştirmek için tıklayın.` : 'Uzaklıkları görmek için ev konumunuzu seçin';
  const fsOn = !!S.mapFs, fsLab = fsOn ? 'Tam ekrandan çık' : 'Tam ekran';
  const fsBtn = $('#btn-fs');
  if (fsBtn) {
    fsBtn.innerHTML = `${ico(fsOn ? 'minimize-2' : 'maximize-2','currentColor',16)}<span class="lf">${fsLab}</span>`;
    fsBtn.title = fsLab; fsBtn.setAttribute('aria-label', fsLab); fsBtn.setAttribute('aria-pressed', String(fsOn));
    fsBtn.classList.toggle('on', fsOn);
  }
}

/* ---------- home location ---------- */
let homeMarker = null;
function placeHomeMarker(){
  if (homeMarker) { homeMarker.remove(); homeMarker = null; }
  if (!S.home) return;
  const h = document.createElement('div'); h.innerHTML='<div class="home"></div><div class="home-l">EV</div>'; h.style.textAlign='center'; h.title='Ev konumunuz: ' + S.home.name;
  homeMarker = new maplibregl.Marker({element:h, anchor:'top'}).setLngLat([S.home.lon, S.home.lat]).addTo(map);
}
function setHome(h){
  S.home = h; LS.set('home', h); LS.set('welcomed', true);
  placeHomeMarker(); closeHomeDialog();
  if (h) { if (S.sort !== 'near') S.sort = 'near'; map.flyTo({center:[h.lon, h.lat], zoom:Math.max(map.getZoom(), 11.5)}); }
  else if (S.sort === 'near') S.sort = 'date';
  render();
}
function openHomeDialog(first){
  const d = $('#homedlg'); d.hidden = false;
  d.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt">
    ${first ? '' : `<button class="dlg-x" id="dlgx" aria-label="Kapat">${ico('x','currentColor',16)}</button>`}
    <div class="kicker">${first ? 'HOŞ GELDİNİZ' : 'EV KONUMU'}</div>
    <h2 id="dlgt">${first ? 'Etkinlikleri evinize göre sıralayalım' : 'Ev konumunuzu değiştirin'}</h2>
    <p class="dlg-p">Ev konumunuz yalnızca bu tarayıcıda saklanır; sunucuya kaydedilmez. Uzaklıklar ve “Evime yakın” sıralaması buna göre hesaplanır.</p>
    ${S.home ? `<div class="dlg-cur">${ico('house','currentColor',14)} Şu anki: <b>${esc(S.home.name)}</b>${S.home.district?` · ${esc(S.home.district)}`:''}</div>` : ''}
    <div class="dlg-s">${ico('search','currentColor',15)}<input id="hq" type="search" placeholder="İlçe, mahalle, cadde veya yer adı yazın" autocomplete="off" aria-label="Adres ara"></div>
    <div id="hres" class="hres"></div>
    <div class="dlg-b">
      <button class="btn" id="hgeo">${ico('locate','currentColor',14)} Konumumu kullan</button>
      <button class="btn" id="hmap">${ico('map-pin','currentColor',14)} Haritada seç</button>
    </div>
    <div class="dlg-f">${S.home ? '<button class="linkbtn" id="hdel">Ev konumunu kaldır</button>' : ''}<button class="linkbtn" id="hskip">${first ? 'Şimdilik geç' : 'Vazgeç'}</button></div>
    <div id="hmsg" class="hmsg"></div>
  </div>`;
  const q = $('#hq'), res = $('#hres'), msg = $('#hmsg'); let t, last = [];
  setTimeout(() => q.focus(), 50);
  const show = list => { last = list; res.innerHTML = list.length ? list.map((r,i) => `<button data-i="${i}"><b>${esc(r.name)}</b><small>${esc(r.detail || r.district || '')}</small></button>`).join('') : (q.value.trim().length >= 3 ? '<div class="hnone">Sonuç bulunamadı. Daha genel yazmayı ya da haritada seçmeyi deneyin.</div>' : '');
    res.querySelectorAll('button').forEach(b => b.onclick = () => { const r = last[+b.dataset.i]; setHome({name:r.name + (r.kind==='adres' && r.district ? `, ${r.district}` : ''), short:r.name.length>18 ? (r.district||r.name.slice(0,18)) : r.name, lat:r.lat, lon:r.lon, district:r.district, how:r.kind}); }); };
  const nomBtn = v => `<button class="hnom" id="hnom">${ico('search','currentColor',13)} “${esc(v)}” için adres ara <small>OpenStreetMap Nominatim</small></button>`;
  const runNom = async () => { const v = q.value.trim(); if (v.length < 3) return; msg.textContent = 'Aranıyor…';
    try { const loc = localGeocode(v), r = await nominatim(v); if (q.value.trim() !== v) return; const seen = new Set(loc.map(x => x.name + '|' + x.district));
      show([...loc, ...r.filter(x => !seen.has(x.name + '|' + x.district))].slice(0, 10)); msg.innerHTML = r.length ? 'Adres sonuçları: © OpenStreetMap katkıcıları (Nominatim)' : 'OpenStreetMap’te İstanbul içinde adres bulunamadı.'; }
    catch(_) { msg.textContent = 'Adres servisine ulaşılamadı.'; } };
  if (STATIC) q.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); runNom(); } };
  q.oninput = () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) return show([]);
    if (STATIC) { // yazarken yalnızca yerel liste; adres araması kullanıcı isteyince (Nominatim otomatik tamamlamaya izin vermez)
      show(localGeocode(v)); if (v.length >= 3) { res.insertAdjacentHTML('beforeend', nomBtn(v)); $('#hnom').onclick = runNom; } msg.textContent = ''; return; }
    t = setTimeout(async () => { try { msg.textContent = 'Aranıyor…'; const r = await (await fetch('/api/geocode?q=' + encodeURIComponent(v))).json(); if (q.value.trim() !== v) return; show(r.results || []); msg.textContent = r.note || ''; } catch(_) { msg.textContent = 'Arama yapılamadı.'; } }, 380); };
  $('#hgeo').onclick = () => {
    if (!navigator.geolocation) { msg.textContent = 'Tarayıcınız konum paylaşımını desteklemiyor.'; return; }
    msg.textContent = 'Konum alınıyor… (tarayıcı izin isteyebilir)';
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = +pos.coords.latitude.toFixed(5), lon = +pos.coords.longitude.toFixed(5);
      const d = await locateDistrict(lat, lon);
      setHome({name: d ? `Konumum (${d})` : 'Konumum', short: d || 'Konumum', lat, lon, district:d, how:'gps'});
      if (!d) setTimeout(() => alert('Konumunuz İstanbul il sınırları dışında görünüyor. Uzaklıklar yine de bu noktaya göre hesaplanacak.'), 300);
    }, err => { msg.textContent = err.code === 1 ? 'Konum izni verilmedi. Adres yazarak veya haritada seçerek devam edebilirsiniz.' : 'Konum alınamadı.'; }, {enableHighAccuracy:false, timeout:12000, maximumAge:600000});
  };
  $('#hmap').onclick = () => { closeHomeDialog(); S.pickHome = true; $('#pickbar').hidden = false; map.getCanvas().style.cursor = 'crosshair'; };
  $('#hskip').onclick = () => { LS.set('welcomed', true); closeHomeDialog(); };
  $('#dlgx') && ($('#dlgx').onclick = () => closeHomeDialog());
  $('#hdel') && ($('#hdel').onclick = () => setHome(null));
  d.onclick = ev => { if (ev.target === d && !first) closeHomeDialog(); };
}
function closeHomeDialog(){ const d = $('#homedlg'); d.hidden = true; d.innerHTML = ''; }
function stopPick(){ S.pickHome = false; $('#pickbar').hidden = true; map.getCanvas().style.cursor = ''; }
async function pickHomeAt(ll){
  stopPick();
  const d = await locateDistrict(ll.lat, ll.lng);
  setHome({name: d ? `Haritada seçilen nokta (${d})` : 'Haritada seçilen nokta', short: d || 'Seçilen nokta', lat:+ll.lat.toFixed(5), lon:+ll.lng.toFixed(5), district:d, how:'harita'});
}
$('#pickbar-x').onclick = () => { stopPick(); };

/* ---------- search ---------- */
const q = $('#q'), sug = $('#suggest'); let sugItems = [], sugIdx = -1, tmr;
document.addEventListener('keydown', ev => { if (ev.key==='/' && document.activeElement!==q) { ev.preventDefault(); q.focus(); } });
q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { S.q = q.value.trim(); S.detail=null; render(); suggest(); }, 160); });
q.addEventListener('keydown', ev => {
  if (ev.key==='Escape') { q.value=''; S.q=''; hideSug(); render(); q.blur(); }
  if (ev.key==='ArrowDown'||ev.key==='ArrowUp') { ev.preventDefault(); sugIdx = Math.max(0, Math.min(sugItems.length-1, sugIdx + (ev.key==='ArrowDown'?1:-1))); paintSug(); }
  if (ev.key==='Enter' && sugItems.length) { pick(sugItems[Math.max(0,sugIdx)]); }
});
q.addEventListener('blur', () => setTimeout(hideSug, 150));
function hideSug(){ sug.hidden = true; syncSugOpen(); }
function syncSugOpen(){ document.body.classList.toggle('suggest-open', !sug.hidden); }
function suggest(){
  const v = fold(q.value.trim()); sugItems = []; sugIdx = -1;
  if (!v) { hideSug(); return; }
  ['Anadolu','Avrupa'].forEach(s => fold(s+' yakasi').includes(v) && sugItems.push({t:s+' Yakası', k:'YAKA', a:()=>go({level:'side', side:s})}));
  districtFC.features.filter(f => fold(f.properties.name).includes(v)).slice(0,5).forEach(f => sugItems.push({t:f.properties.name, k:'İLÇE · '+(counts.c[f.properties.name]||0), a:()=>go({level:'district', district:f.properties.name, side:f.properties.side})}));
  S.events.filter(e => fold(e.title).includes(v) && passChips(e)).slice(0,6).forEach(e => sugItems.push({t:e.title, k:dshort(e.start_date), a:()=>openDetail(e.id)}));
  S.places.filter(p => fold(p.name).includes(v)).sort((a,b)=>a.minzoom-b.minzoom).slice(0,4).forEach(p => sugItems.push({t:p.name, k:'YER · '+PLACE[p.cat].short, a:()=>{ q.value=''; S.q=''; openPlace(p.id, true); }}));
  paintSug();
}
function paintSug(){
  sug.hidden = !sugItems.length;
  syncSugOpen();
  sug.innerHTML = sugItems.map((s,i) => `<button class="${i===sugIdx?'on':''}" data-i="${i}"><span>${esc(s.t)}</span><small>${esc(s.k)}</small></button>`).join('');
  sug.querySelectorAll('button').forEach(b => b.onmousedown = ev => { ev.preventDefault(); pick(sugItems[+b.dataset.i]); });
}
function pick(s){ hideSug(); if (s.k.startsWith('İLÇE')||s.k==='YAKA') { q.value=''; S.q=''; } s.a(); }

/* ---------- tools & refresh ---------- */
$('#btn-home').onclick = () => openHomeDialog();
/* ---------- katmanlar (lejant) aç/kapa + mobil alt panel ---------- */
const MOBILE = window.matchMedia('(max-width:900px)');
S.legendOpen = MOBILE.matches ? false : LS.get('legend', true);
function applyLegend(){ document.body.classList.toggle('legend-open', S.legendOpen); document.body.classList.toggle('legend-closed', !S.legendOpen); renderTools(); }
$('#btn-legend').onclick = () => { S.legendOpen = !S.legendOpen; if (!MOBILE.matches) LS.set('legend', S.legendOpen); applyLegend(); };
document.addEventListener('click', ev => { if (ev.target.closest('[data-act="legend-close"]')) { S.legendOpen = false; applyLegend(); } });
function setSheet(full){
  document.body.classList.toggle('sheet-full', full);
  const h = $('#sheet-handle'); h.setAttribute('aria-expanded', String(full)); h.setAttribute('aria-label', full ? 'Paneli küçült, haritayı göster' : 'Paneli büyüt');
  h.querySelector('.sh-t').innerHTML = full ? `${ico('chevron-down','currentColor',13)} Haritayı göster` : `${ico('chevron-up','currentColor',13)} Listeyi büyüt`;
  if (full && S.legendOpen && MOBILE.matches) { S.legendOpen = false; applyLegend(); }
}
$('#sheet-handle').onclick = () => setSheet(!document.body.classList.contains('sheet-full'));
{ let y0 = null; const hd = $('#sheet-handle');
  hd.addEventListener('touchstart', ev => { y0 = ev.touches[0].clientY; }, {passive:true});
  hd.addEventListener('touchend', ev => { if (y0 == null) return; const dy = ev.changedTouches[0].clientY - y0; y0 = null; if (Math.abs(dy) > 30) { ev.preventDefault(); setSheet(dy < 0); } }); }
setSheet(false); applyLegend();
// telefonda OSM atfı açık başlayıp alttaki düğmelerin üstüne biniyor: (i) düğmesine kapat (tıklayınca yine açılır)
map.once('idle', () => { if (MOBILE.matches) document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'); });
$('#btn-fav').onclick = () => { S.view = S.view==='favs' ? null : 'favs'; S.detail = null; S.placeDetail = null; render(); };
document.addEventListener('click', ev => { const b = ev.target.closest('[data-act="home"]'); if (b) { ev.preventDefault(); openHomeDialog(); } });
document.addEventListener('keydown', ev => { if (ev.key==='Escape') {
  if (!$('#homedlg').hidden && LS.get('welcomed', false)) closeHomeDialog();
  else if (S.vitrinOpen && !$('#vitrin').hidden) setVitrin(false);
  else if (S.pop) { S.pop=null; render(); }
  else if (S.pickHome) stopPick();
  else if (S.mapFs && (S.detail || S.placeDetail || S.venue)) {
    S.detail=null; S.placeDetail=null; S.venue=null;
    if (selMarker){ selMarker.remove(); selMarker=null; }
    render();
  } else if (S.mapFs) setMapFs(false);
} });

function browserFsEl(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
function resizeMap(){ try { map.resize(); } catch(_){} }
let _fsLegend = null;
function applyFsDetail(){
  document.body.classList.toggle('fs-detail', !!(S.mapFs && (S.detail || S.placeDetail || S.venue)));
}
async function setMapFs(on){
  on = !!on;
  if (on === S.mapFs) {
    if (!on && browserFsEl()) {
      try { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch(_){}
    }
    return;
  }
  if (on) {
    _fsLegend = S.legendOpen;
    if (S.legendOpen) { S.legendOpen = false; applyLegend(); }
    if (S.pop) { S.pop = null; render(); }
    if (S.pickHome) stopPick();
    if (document.body.classList.contains('sheet-full')) setSheet(false);
  } else if (_fsLegend != null) {
    S.legendOpen = _fsLegend; _fsLegend = null; applyLegend();
  }
  S.mapFs = on;
  document.body.classList.toggle('map-fs', on);
  applyFsDetail();
  renderTools();
  resizeMap();
  requestAnimationFrame(resizeMap);
  try {
    if (on) {
      const el = document.documentElement;
      if (!browserFsEl()) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } else if (browserFsEl()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    }
  } catch(_){ /* iOS Safari ve bazı PWA'lar Fullscreen API desteklemez; CSS modu yeter */ }
  resizeMap();
  setTimeout(resizeMap, 120);
}
document.addEventListener('fullscreenchange', () => { if (!browserFsEl() && S.mapFs) setMapFs(false); else if (S.mapFs) resizeMap(); });
document.addEventListener('webkitfullscreenchange', () => { if (!browserFsEl() && S.mapFs) setMapFs(false); else if (S.mapFs) resizeMap(); });
$('#btn-fs').onclick = () => { setMapFs(!S.mapFs); };
setInterval(async () => { try { const d = await getJSON(URLS.events, true); if (d.generated_at !== S.data.generated_at) { const keep = S.detail?.id; setData(d); if (keep) S.detail = S.events.find(e=>e.id===keep)||null; render(); renderVitrin(); } } catch(_){} }, 10*60*1000);
window.__home = openHomeDialog; window.__S = S; window.__go = go; window.__open = openDetail; window.__place = openPlace; window.__map = map; window.__setMapFs = setMapFs;
})();
