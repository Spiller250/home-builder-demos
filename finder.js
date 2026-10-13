'use strict';
/* Dealer locator demo. "Brightroof" and every installer are invented; positions are
   scattered around real city centres. In a client project the list comes from a
   spreadsheet, CMS, Firebase or an API. */
(function () {
  const CITIES = [
    ['London', 51.507, -0.128, 6], ['Manchester', 53.48, -2.242, 3], ['Birmingham', 52.486, -1.89, 3],
    ['Leeds', 53.8, -1.549, 2], ['Glasgow', 55.864, -4.252, 2], ['Edinburgh', 55.953, -3.189, 2],
    ['Bristol', 51.454, -2.587, 2], ['Cardiff', 51.481, -3.179, 2], ['Newcastle', 54.978, -1.617, 2],
    ['Liverpool', 53.408, -2.991, 2], ['Nottingham', 52.954, -1.158, 1], ['Sheffield', 53.381, -1.47, 2],
    ['Belfast', 54.597, -5.93, 1], ['Norwich', 52.63, 1.297, 1], ['Plymouth', 50.375, -4.143, 1],
    ['Southampton', 50.909, -1.404, 2], ['Cambridge', 52.205, 0.119, 1], ['Oxford', 51.752, -1.258, 1],
    ['Aberdeen', 57.149, -2.094, 1], ['Inverness', 57.478, -4.224, 1], ['York', 53.96, -1.08, 1],
    ['Exeter', 50.718, -3.534, 1], ['Brighton', 50.822, -0.137, 2],
  ];
  const AREAS = ['North', 'South', 'East', 'West', 'Central', 'Riverside'];
  const SERVICES = [
    { key: 'res', label: 'Homes', color: '#0f6b5c' },
    { key: 'com', label: 'Business', color: '#2f6fb3' },
    { key: 'bat', label: 'Battery storage', color: '#b3742f' },
    { key: 'ev', label: 'EV chargers', color: '#7a4bb3' },
  ];
  let seed = 4242; const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const items = [];
  for (const [city, lat, lon, n] of CITIES) {
    const areas = AREAS.slice().sort(() => rand() - 0.5);
    for (let i = 0; i < n; i++) {
      const svc = SERVICES.filter((s, k) => k === 0 || rand() > 0.5).map((s) => s.key);
      items.push({
        id: items.length + 1, city,
        name: n > 1 ? `Brightroof ${city} ${areas[i]}` : `Brightroof ${city}`,
        ll: [lat + (rand() - 0.5) * 0.12, lon + (rand() - 0.5) * 0.2],
        svc, since: 2015 + Math.floor(rand() * 10), radius: 15 + Math.floor(rand() * 5) * 5,
      });
    }
  }

  const map = L.map('map', { zoomSnap: 0.5, zoomControl: false }).setView([52.6, -3.2], 4.5);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const wide = window.innerWidth > 760;
  map.fitBounds([[50, -6.5], [58.7, 1.8]], { paddingTopLeft: wide ? [420, 20] : [20, 70], paddingBottomRight: wide ? [20, 20] : [20, Math.round(window.innerHeight * 0.52) + 10] });
  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 45,
    iconCreateFunction: (c) => {
      const n = c.getChildCount(); const size = n < 5 ? 34 : n < 10 ? 40 : 48;
      return L.divIcon({ html: String(n), className: 'cluster', iconSize: [size, size] });
    },
  }).addTo(map);
  const roof = (active) => L.divIcon({
    className: 'roof' + (active ? ' active' : ''), iconSize: [30, 34], iconAnchor: [15, 34], popupAnchor: [0, -30],
    html: '<svg width="30" height="34" viewBox="0 0 30 34"><path d="M15 33 L4 20 V12 L15 2 L26 12 V20 Z" fill="#14284b" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M8 13 L15 7 L22 13" fill="none" stroke="#ffc633" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  });
  const markers = new Map();
  for (const it of items) {
    const m = L.marker(it.ll, { title: it.name, icon: roof(false) }).bindPopup(() => popupHtml(it));
    markers.set(it.id, m);
  }

  const state = { q: '', svc: new Set(), inView: false, me: null, active: null };
  const chips = document.getElementById('svcChips');
  for (const s of SERVICES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${s.label}`;
    b.addEventListener('click', () => {
      if (state.svc.has(s.key)) state.svc.delete(s.key); else state.svc.add(s.key);
      b.setAttribute('aria-pressed', String(state.svc.has(s.key))); render(true);
    });
    chips.appendChild(b);
  }
  const qEl = document.getElementById('q');
  qEl.addEventListener('input', () => { state.q = qEl.value.trim().toLowerCase(); render(false); });
  document.getElementById('searchForm').addEventListener('submit', (e) => { e.preventDefault(); state.q = qEl.value.trim().toLowerCase(); render(true); });
  document.getElementById('inView').addEventListener('change', (e) => { state.inView = e.target.checked; render(false); });
  map.on('moveend', () => { if (state.inView) render(false); });
  document.getElementById('mobileToggle').addEventListener('click', (e) => {
    const p = document.getElementById('panel'); p.classList.toggle('collapsed');
    e.target.textContent = p.classList.contains('collapsed') ? 'Show list' : 'Hide list';
  });

  document.getElementById('near').addEventListener('click', () => {
    const msg = document.getElementById('nearMsg');
    if (!navigator.geolocation) { msg.textContent = 'Location is not available in this browser.'; return; }
    msg.textContent = 'Waiting for your browser to share your location.';
    navigator.geolocation.getCurrentPosition((pos) => {
      state.me = [pos.coords.latitude, pos.coords.longitude];
      msg.textContent = 'Nearest first, measured in a straight line. Your location is not sent anywhere.';
      L.circleMarker(state.me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f7fb5', fillOpacity: 1 }).addTo(map).bindTooltip('You are here');
      render(false);
      const first = filtered()[0];
      if (first) map.fitBounds(L.latLngBounds([state.me, first.ll]), { padding: [60, 60], maxZoom: 11 });
    }, () => { msg.textContent = 'Location was not shared. Type your town in the search box instead.'; }, { timeout: 8000 });
  });

  function km(a, b) {
    const R = 6371, r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b[0] - a[0]) / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(r(b[1] - a[1]) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function matches(it) {
    if (state.q && !(it.name.toLowerCase().includes(state.q) || it.city.toLowerCase().includes(state.q))) return false;
    for (const k of state.svc) if (!it.svc.includes(k)) return false;
    return true;
  }
  function filtered() {
    let list = items.filter(matches);
    if (state.me) list = list.map((it) => ({ ...it, dist: km(state.me, it.ll) })).sort((a, b) => a.dist - b.dist);
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }
  function popupHtml(it) {
    const tags = it.svc.map((k) => `<span>${SERVICES.find((s) => s.key === k).label}</span>`).join('');
    return `<h3>${esc(it.name)}</h3><div class="tags">${tags}</div>
      <div>Certified since ${it.since}. Works within ${it.radius} miles of ${esc(it.city)}.</div>
      <button class="quote" onclick="this.nextElementSibling.textContent='On a live site this opens a quote form that goes to this installer. This demo sends nothing.'">Get a quote</button>
      <div class="quote-msg"></div>`;
  }

  function render(refit) {
    const list = filtered();
    cluster.clearLayers();
    cluster.addLayers(list.map((it) => markers.get(it.id)));
    const bounds = map.getBounds();
    const shown = state.inView ? list.filter((it) => bounds.contains(it.ll)) : list;
    const cities = new Set(list.map((i) => i.city)).size;
    document.getElementById('stats').innerHTML = list.length
      ? `<b>${shown.length}</b> installer${shown.length === 1 ? '' : 's'}${state.inView ? ' on the map' : ` in ${cities} ${cities === 1 ? 'city' : 'cities'}`}`
      : 'No matches';
    const ul = document.getElementById('list');
    ul.innerHTML = shown.length ? shown.slice(0, 100).map((it) => `
      <li data-id="${it.id}" class="${state.active === it.id ? 'active' : ''}">
        <div><div class="name">${esc(it.name)}</div><div class="sub">${it.svc.map((k) => SERVICES.find((s) => s.key === k).label).join(', ')}</div></div>
        <div class="dist">${it.dist != null ? it.dist.toFixed(0) + ' km' : ''}</div>
      </li>`).join('') : '<li class="empty">Nothing here yet. Try a nearby city, or clear a service filter.</li>';
    if (refit && list.length && (state.q || state.svc.size)) {
      map.fitBounds(L.latLngBounds(list.map((i) => i.ll)), { paddingTopLeft: [wide ? 420 : 40, 40], paddingBottomRight: [40, wide ? 40 : 300], maxZoom: 11 });
    }
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.svc.size) params.set('svc', [...state.svc].join(','));
    history.replaceState(null, '', params.toString() ? '#' + params : location.pathname);
  }
  document.getElementById('list').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]'); if (!li) return;
    const id = Number(li.dataset.id); state.active = id;
    document.querySelectorAll('#list li').forEach((x) => x.classList.toggle('active', x === li));
    markers.forEach((m, k) => m.setIcon(roof(k === id)));
    cluster.zoomToShowLayer(markers.get(id), () => markers.get(id).openPopup());
  });

  // Restore shared state from the URL, e.g. #q=leeds&svc=bat
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('q')) { state.q = p.get('q').toLowerCase(); qEl.value = p.get('q'); }
  for (const k of (p.get('svc') || '').split(',')) {
    const i = SERVICES.findIndex((s) => s.key === k);
    if (i >= 0) { state.svc.add(k); chips.children[i].setAttribute('aria-pressed', 'true'); }
  }
  render(true);
})();
