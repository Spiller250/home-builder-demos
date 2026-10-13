'use strict';
/* Lot map demo. All data below is invented. In a real project the lots come from
   the builder's site plan (GeoJSON) and statuses/prices from a sheet, CMS or API. */
(function () {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const STATUS = {
    available: { label: 'Available', fill: css('--available') },
    reserved: { label: 'Reserved', fill: css('--reserved') },
    sold: { label: 'Sold', fill: 'url(#hatch)' },
  };
  const INK = css('--ink');
  const PLANS = ['The Aspen', 'The Birch', 'The Cedar', 'The Dogwood', 'The Elm'];
  const SQFT_PER_UNIT = 1.6;
  const FT_PER_UNIT = 1.25;

  let seed = 20261013;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const money = (n) => '$' + n.toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Fictional site plan; coordinates are [y, x] in plan units ----------
  const lots = [];
  function addLot(y0, y1, x0, x1, phase, street, frontage, extra) {
    const area = Math.abs((y1 - y0) * (x1 - x0));
    const sqft = Math.round((area * SQFT_PER_UNIT * (0.9 + rand() * 0.22)) / 10) * 10;
    const r = rand();
    const status = r < 0.5 ? 'available' : r < 0.68 ? 'reserved' : 'sold';
    const premium = extra && extra.premium ? extra.premium : 0;
    const price = Math.round((62000 + sqft * 8.2 + premium + rand() * 9000) / 500) * 500;
    const plans = PLANS.filter(() => rand() > 0.45);
    lots.push({
      id: lots.length + 1, phase, street, status, sqft, frontage: Math.round(frontage * FT_PER_UNIT), price,
      plans: plans.length ? plans : [PLANS[0]], note: extra && extra.note, bounds: [[y0, x0], [y1, x1]],
    });
  }
  for (const [x0, x1] of [[330, 870], [930, 1170]]) {
    for (let x = x0; x + 60 <= x1 + 0.1; x += 60) {
      addLot(412, 522, x, x + 60, 1, 'Willow Creek Dr', 60);
      addLot(278, 388, x, x + 60, 1, 'Willow Creek Dr', 60);
    }
  }
  for (const [sx, phase, name] of [[300, 2, 'Aspen Ct'], [900, 3, 'Birch Ct']]) {
    for (const [y0, y1] of [[534, 734], [66, 266]]) {
      for (let y = y0; y + 50 <= y1 + 0.1; y += 50) {
        const parkSide = phase === 2 && y0 === 534;
        addLot(y, y + 50, sx - 122, sx - 12, phase, name, 50, parkSide ? { premium: 14000, note: 'Backs onto the park' } : null);
        addLot(y, y + 50, sx + 12, sx + 122, phase, name, 50);
      }
    }
  }

  // ---------- Map ----------
  const map = L.map('map', { crs: L.CRS.Simple, minZoom: -3, maxZoom: 2, zoomSnap: 0.25, renderer: L.svg({ padding: 0.5 }) });
  map.attributionControl.setPrefix('Leaflet');
  map.attributionControl.addAttribution('Fictional site plan');
  const planBounds = [[0, 0], [800, 1200]];
  map.fitBounds(planBounds, { padding: [16, 16] });
  map.setMaxBounds([[-200, -200], [1000, 1400]]);

  // Hatch pattern for sold lots, added to Leaflet's own SVG
  L.rectangle(planBounds, { color: INK, weight: 1.5, dashArray: '10 6', fillColor: '#eef2ea', fillOpacity: 1, interactive: false }).addTo(map);
  const svg = map.getPane('overlayPane').querySelector('svg');
  svg.insertAdjacentHTML('afterbegin', `<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="7" height="7" fill="#fff"/><line x1="0" y1="0" x2="0" y2="7" stroke="${INK}" stroke-width="1.6"/></pattern></defs>`);

  const label = (layer, text) => layer.bindTooltip(text, { permanent: true, direction: 'center', className: 'plan-label' });
  label(L.rectangle([[430, 20], [720, 160]], { color: '#6f9a5f', weight: 1, fillColor: '#cfe3bf', fillOpacity: 1, interactive: false }), 'Park &amp; trail').addTo(map);
  label(L.circle([150, 95], { radius: 60, color: '#6d9cba', weight: 1, fillColor: '#bcd8e8', fillOpacity: 1, interactive: false }), 'Pond').addTo(map);
  label(L.rectangle([[290, 20], [380, 150]], { color: INK, weight: 1, fillColor: '#fff', fillOpacity: 1, interactive: false }), 'Amenity center').addTo(map);

  const streets = [
    { name: 'WILLOW CREEK DR', line: [[400, -60], [400, 1190]], at: [400, 600] },
    { name: 'ASPEN CT', line: [[60, 300], [740, 300]], at: [640, 300] },
    { name: 'BIRCH CT', line: [[60, 900], [740, 900]], at: [640, 900] },
  ];
  streets.forEach((s) => L.polyline(s.line, { color: INK, weight: 21, lineCap: 'round', interactive: false }).addTo(map));
  streets.forEach((s) => L.polyline(s.line, { color: '#fff', weight: 18, lineCap: 'round', interactive: false }).addTo(map));
  streets.forEach((s) => L.polyline(s.line, { color: INK, weight: 1, dashArray: '6 8', opacity: 0.5, interactive: false }).addTo(map));
  const textMarker = (at, cls, html) => L.marker(at, { interactive: false, keyboard: false, icon: L.divIcon({ className: cls, html: `<span>${html}</span>`, iconSize: [0, 0] }) }).addTo(map);
  streets.forEach((s) => textMarker(s.at, 'street-label', esc(s.name)));
  textMarker([400, -40], 'entry-label', 'Entrance');

  const layers = new Map();
  const styleFor = (lot, active) => ({
    color: INK, weight: active ? 3.5 : 1.2, fillColor: STATUS[lot.status].fill, fillOpacity: 1,
  });
  for (const lot of lots) {
    const rect = L.rectangle(lot.bounds, styleFor(lot, false));
    rect.on('click', () => select(lot.id, false));
    rect.bindTooltip(String(lot.id), { direction: 'center', className: 'lot-num', permanent: true });
    rect.addTo(map);
    layers.set(lot.id, rect);
  }
  const toggleNums = () => map.getContainer().classList.toggle('hide-nums', map.getZoom() < -0.6);
  map.on('zoomend', toggleNums); toggleNums();

  const ctl = (pos, build) => { const c = L.control({ position: pos }); c.onAdd = build; c.addTo(map); };
  ctl('bottomright', () => {
    const d = L.DomUtil.create('div', 'plat-legend');
    d.innerHTML = Object.entries(STATUS).map(([k, s]) => `<div><span class="dot ${k}" style="${k === 'sold' ? '' : 'background:' + s.fill}"></span>${s.label}</div>`).join('');
    return d;
  });
  ctl('topright', () => {
    const d = L.DomUtil.create('div', 'north');
    d.innerHTML = `<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true"><path d="M13 2 L23 32 L13 25 L3 32 Z" fill="#fff" stroke="${INK}" stroke-width="1.5"/><path d="M13 2 L13 25 L3 32 Z" fill="${INK}"/></svg>N`;
    d.setAttribute('aria-label', 'North');
    return d;
  });
  ctl('bottomleft', () => {
    const d = L.DomUtil.create('div', 'scalebar');
    const update = () => {
      const px = map.latLngToContainerPoint([0, 160]).x - map.latLngToContainerPoint([0, 0]).x;
      d.innerHTML = `<div class="bar" style="width:${Math.round(px)}px"></div>200 ft`;
    };
    map.on('zoomend', update); setTimeout(update);
    return d;
  });

  // ---------- Filters and list ----------
  const state = { statuses: new Set(Object.keys(STATUS)), phase: '', maxPrice: 0, minSize: 0, active: null };
  const chipsEl = document.getElementById('statusChips');
  for (const [key, s] of Object.entries(STATUS)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', 'true');
    b.innerHTML = `<span class="dot ${key}" style="${key === 'sold' ? '' : 'background:' + s.fill}"></span>${s.label}`;
    b.addEventListener('click', () => {
      if (state.statuses.has(key)) state.statuses.delete(key); else state.statuses.add(key);
      b.setAttribute('aria-pressed', String(state.statuses.has(key)));
      render();
    });
    chipsEl.appendChild(b);
  }
  const maxPriceEl = document.getElementById('maxPrice');
  const minSizeEl = document.getElementById('minSize');
  const prices = lots.map((l) => l.price); const sizes = lots.map((l) => l.sqft);
  maxPriceEl.min = Math.floor(Math.min(...prices) / 5000) * 5000; maxPriceEl.max = Math.ceil(Math.max(...prices) / 5000) * 5000;
  minSizeEl.min = Math.floor(Math.min(...sizes) / 250) * 250; minSizeEl.max = Math.ceil(Math.max(...sizes) / 250) * 250;
  maxPriceEl.value = state.maxPrice = Number(maxPriceEl.max);
  minSizeEl.value = state.minSize = Number(minSizeEl.min);
  maxPriceEl.addEventListener('input', () => { state.maxPrice = Number(maxPriceEl.value); render(); });
  minSizeEl.addEventListener('input', () => { state.minSize = Number(minSizeEl.value); render(); });
  document.getElementById('phase').addEventListener('change', (e) => { state.phase = e.target.value; render(); });
  document.getElementById('mobileToggle').addEventListener('click', () => document.getElementById('side').classList.toggle('open'));

  const visible = (lot) => state.statuses.has(lot.status) && (!state.phase || String(lot.phase) === state.phase)
    && lot.price <= state.maxPrice && lot.sqft >= state.minSize;
  const swatch = (l) => `<span class="dot ${l.status}" style="${l.status === 'sold' ? '' : 'background:' + STATUS[l.status].fill}"></span>`;

  function render() {
    document.getElementById('maxPriceOut').textContent = money(state.maxPrice);
    document.getElementById('minSizeOut').textContent = state.minSize.toLocaleString('en-US') + ' sq ft';
    const shown = lots.filter(visible);
    for (const lot of lots) {
      const layer = layers.get(lot.id);
      if (visible(lot)) { if (!map.hasLayer(layer)) layer.addTo(map); } else if (map.hasLayer(layer)) map.removeLayer(layer);
    }
    const count = (s) => lots.filter((l) => l.status === s).length;
    document.getElementById('stats').innerHTML =
      `<div><b>${count('available')}</b>available</div><div><b>${count('reserved')}</b>reserved</div><div><b>${count('sold')}</b>sold</div><div><b>${shown.length}</b>shown</div>`;
    const list = document.getElementById('list');
    if (!shown.length) { list.innerHTML = '<li class="empty">No homesites match. Widen the price or size range.</li>'; return; }
    list.innerHTML = shown.map((l) => `
      <li data-id="${l.id}" class="${state.active === l.id ? 'active' : ''}">
        <span class="lotno">${swatch(l)}${l.id}</span>
        <span><div>${esc(l.street)}, phase ${l.phase}</div><div class="sub">${l.sqft.toLocaleString('en-US')} sq ft${l.note ? ', ' + esc(l.note.toLowerCase()) : ''}</div></span>
        <span class="price ${l.status === 'sold' ? 'muted' : ''}">${l.status === 'sold' ? 'Sold' : money(l.price)}</span>
      </li>`).join('');
  }
  document.getElementById('list').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]'); if (li) select(Number(li.dataset.id), true);
  });

  function popupHtml(lot) {
    return `<h3>Lot ${lot.id} <span class="status ${lot.status}">${STATUS[lot.status].label}</span></h3>
      <div class="pop-row"><span>Street</span><span>${esc(lot.street)}</span></div>
      <div class="pop-row"><span>Phase</span><span>${lot.phase}</span></div>
      <div class="pop-row"><span>Lot size</span><span>${lot.sqft.toLocaleString('en-US')} sq ft</span></div>
      <div class="pop-row"><span>Frontage</span><span>${lot.frontage} ft</span></div>
      <div class="pop-row"><span>Price</span><span><b>${lot.status === 'sold' ? 'Sold' : money(lot.price)}</b></span></div>
      <div class="pop-row"><span>Fits</span><span>${lot.plans.map(esc).join(', ')}</span></div>
      ${lot.note ? `<p style="margin:8px 0 0">${esc(lot.note)}.</p>` : ''}
      <div style="display:flex;gap:6px;margin-top:12px">
        <button class="btn" data-ask="${lot.id}" ${lot.status === 'sold' ? 'disabled' : ''}>Ask about this lot</button>
        <button class="btn ghost" data-copy="${lot.id}">Copy link</button>
      </div>
      <div class="pop-msg" data-msg></div>`;
  }

  function select(id, fly) {
    const lot = lots.find((l) => l.id === id); if (!lot) return;
    if (state.active) layers.get(state.active).setStyle(styleFor(lots.find((l) => l.id === state.active), false));
    state.active = id;
    layers.get(id).setStyle(styleFor(lot, true)).bringToFront();
    if (fly) map.flyToBounds(lot.bounds, { maxZoom: 0, duration: 0.5 });
    L.popup({ autoPanPadding: [24, 24] }).setLatLng(L.latLngBounds(lot.bounds).getCenter()).setContent(popupHtml(lot)).openOn(map);
    history.replaceState(null, '', '#lot-' + id);
    render();
    document.querySelector(`#list li[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  map.on('popupopen', (e) => {
    const el = e.popup.getElement(); const msg = el.querySelector('[data-msg]');
    el.querySelector('[data-ask]')?.addEventListener('click', (ev) => {
      msg.textContent = `On a live site this opens your inquiry form with lot ${ev.target.dataset.ask} filled in. This demo sends nothing.`;
    });
    el.querySelector('[data-copy]')?.addEventListener('click', async (ev) => {
      const url = location.href.split('#')[0] + '#lot-' + ev.target.dataset.copy;
      try { await navigator.clipboard.writeText(url); msg.textContent = 'Link copied. It opens the map on this lot.'; }
      catch { msg.textContent = url; }
    });
  });

  render();
  const m = location.hash.match(/^#lot-(\d+)$/);
  if (m) select(Number(m[1]), true);
})();
