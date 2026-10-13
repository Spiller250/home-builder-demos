'use strict';
/* Tour route demo. Sample itinerary written for this demo; coordinates are approximate. */
(function () {
  const DAYS = [
    {
      label: 'Day 1', title: 'Old Town', color: '#6b4e7a', subtitle: 'Castle to Arthur\u2019s Seat',
      intro: 'Castle to palace along the Royal Mile, then up Arthur’s Seat for sunset.',
      stops: [
        { name: 'Edinburgh Castle', ll: [55.9486, -3.1999], time: '9:30', mins: 120, text: 'Start at the top of the Royal Mile. Book a morning entry slot.' },
        { name: 'Camera Obscura', ll: [55.9490, -3.1957], time: '11:45', mins: 60, text: 'Rooftop views over the Old Town.' },
        { name: 'St Giles’ Cathedral', ll: [55.9495, -3.1909], time: '13:00', mins: 40, text: 'Lunch nearby on the Royal Mile.' },
        { name: 'Greyfriars Kirkyard', ll: [55.9468, -3.1925], time: '14:15', mins: 30, text: 'Short detour south of George IV Bridge.' },
        { name: 'National Museum of Scotland', ll: [55.9470, -3.1890], time: '14:50', mins: 90, text: 'Free entry. Roof terrace on level 7.' },
        { name: 'Palace of Holyroodhouse', ll: [55.9527, -3.1722], time: '16:45', mins: 60, text: 'Walk down the Canongate to the end of the Mile.' },
        { name: 'Arthur’s Seat', ll: [55.9441, -3.1618], time: '18:00', mins: 90, text: 'Steep but short climb. Bring a layer.' },
      ],
    },
    {
      label: 'Day 2', title: 'New Town', color: '#b5762a', subtitle: 'Gardens and the river',
      intro: 'Gardens, Georgian streets and a riverside walk, ending on Calton Hill.',
      stops: [
        { name: 'Scott Monument', ll: [55.9524, -3.1933], time: '9:30', mins: 45, text: 'Climb the 287 steps early, before the queue.' },
        { name: 'Princes Street Gardens', ll: [55.9505, -3.2000], time: '10:30', mins: 40, text: 'Stroll west under the castle rock.' },
        { name: 'Dean Village', ll: [55.9526, -3.2170], time: '11:30', mins: 45, text: 'Old mill buildings on the Water of Leith.' },
        { name: 'Stockbridge', ll: [55.9583, -3.2083], time: '12:45', mins: 75, text: 'Follow the river path. Lunch in the village.' },
        { name: 'Royal Botanic Garden', ll: [55.9653, -3.2090], time: '14:15', mins: 90, text: 'Free gardens; glasshouses are ticketed.' },
        { name: 'Calton Hill', ll: [55.9555, -3.1826], time: '17:00', mins: 60, text: 'Finish with the classic view over the city.' },
      ],
    },
  ];
  const WALK_KMH = 4.5;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function km(a, b) {
    const R = 6371, toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b[0] - a[0]), dLon = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const map = L.map('map', { zoomSnap: 0.5 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const group = L.layerGroup().addTo(map);
  let markers = [];
  const state = { day: 0, stop: 0 };
  const icon = (n, active) => L.divIcon({ className: 'stop-icon' + (active ? ' active' : ''), html: `<span>${n}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16] });
  const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}` : `${m} min`).trim();

  function showDay(i) {
    state.day = i; state.stop = 0;
    const day = DAYS[i];
    document.documentElement.style.setProperty('--day', day.color);
    group.clearLayers(); markers = [];
    const lls = day.stops.map((s) => s.ll);
    L.polyline(lls, { color: '#fff', weight: 8, opacity: 0.9 }).addTo(group);
    L.polyline(lls, { color: day.color, weight: 4, opacity: 0.95 }).addTo(group);
    day.stops.forEach((s, j) => {
      const m = L.marker(s.ll, { icon: icon(j + 1, false), title: s.name })
        .bindPopup(`<h3>${esc(s.name)}</h3><div>Arrive ${s.time}, stay ${fmtMin(s.mins)}</div><p>${esc(s.text)}</p>`)
        .on('click', () => goTo(j, false));
      m.addTo(group); markers.push(m);
    });
    map.fitBounds(L.latLngBounds(lls), { padding: [50, 50] });

    let dist = 0; for (let j = 1; j < lls.length; j++) dist += km(lls[j - 1], lls[j]);
    const walk = Math.round(((dist / WALK_KMH) * 60) / 5) * 5;
    const visit = day.stops.reduce((a, s) => a + s.mins, 0);
    document.getElementById('intro').textContent = day.intro;
    document.getElementById('facts').innerHTML = `${day.stops.length} stops, <b>${dist.toFixed(1)} km</b> on foot (about ${walk} min of walking) and roughly ${Math.round(visit / 60)} hours at the stops.`;
    document.querySelectorAll('#days button').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    renderList();
    history.replaceState(null, '', '#day-' + (i + 1));
  }

  function renderList() {
    const day = DAYS[state.day];
    document.getElementById('timeline').innerHTML = day.stops.map((s, j) => `
      <li data-i="${j}" class="${j === state.stop ? 'active' : ''}">
        <span class="time">${s.time}</span><span class="pin">${j + 1}</span>
        <span><div class="name">${esc(s.name)}</div><div class="note">${esc(s.text)}</div><div class="stay">Allow ${fmtMin(s.mins)}</div></span>
      </li>`).join('');
    document.getElementById('prev').disabled = state.stop === 0;
    document.getElementById('next').disabled = state.stop === day.stops.length - 1;
  }

  function goTo(j, fly) {
    const day = DAYS[state.day];
    state.stop = j;
    markers.forEach((m, k) => m.setIcon(icon(k + 1, k === j)));
    if (fly) map.flyTo(day.stops[j].ll, Math.max(map.getZoom(), 15), { duration: 0.6 });
    markers[j].openPopup();
    renderList();
    document.querySelector(`#timeline li[data-i="${j}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  const daysEl = document.getElementById('days');
  DAYS.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'tab');
    b.innerHTML = `<strong>${esc(d.label)}, ${esc(d.title)}</strong><span>${esc(d.subtitle)}</span>`;
    b.addEventListener('click', () => showDay(i));
    daysEl.appendChild(b);
  });
  document.getElementById('timeline').addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) goTo(Number(li.dataset.i), true); });
  document.getElementById('prev').addEventListener('click', () => goTo(Math.max(0, state.stop - 1), true));
  document.getElementById('next').addEventListener('click', () => goTo(Math.min(DAYS[state.day].stops.length - 1, state.stop + 1), true));
  document.getElementById('mobileToggle').addEventListener('click', () => document.getElementById('guide').classList.toggle('open'));

  const h = location.hash.match(/^#day-(\d)$/);
  showDay(h && DAYS[Number(h[1]) - 1] ? Number(h[1]) - 1 : 0);
})();
