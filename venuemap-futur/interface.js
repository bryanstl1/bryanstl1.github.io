'use strict';

// Local vector icons keep the map usable offline, without icon/font dependencies.
const iconPaths = {
  all: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  stage: '<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  bar: '<path d="M4 4h16l-8 9-8-9Zm8 9v7m-4 0h8M7 7h10"/>',
  food: '<path d="M5 3v6m3-6v6M3 3v4a3 3 0 0 0 6 0V3M6 10v11m12-18c-3 3-4 6-3 9h4M19 3v18"/>',
  wc: '<circle cx="7" cy="4" r="1.5"/><path d="M4 9h6m-6 6V9m6 6V9m-5 5v7m4-7v7"/><circle cx="17" cy="4" r="1.5"/><path d="m17 8-4 9h8l-4-9Zm-2 9v4m4-4v4"/>',
  medical: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  entry: '<path d="M14 3h6v18h-6M3 12h12m-4-4 4 4-4 4"/>',
  vip: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M4 9a8 8 0 1 1 0 6m0-11v5h5"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/>',
  focus: '<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  move: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>'
};
iconPaths.expand = '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>';
iconPaths.collapse = '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>';
let mapModeCamera = null;
function setMapOnly(enabled) {
  const app = document.getElementById('app');
  const button = document.getElementById('mapmode');
  if (app.classList.contains('map-only') === enabled) return;
  if (enabled) {
    mapModeCamera = {...cam, target: [...cam.target]};
    setBrowsing(false);
    document.getElementById('query').blur();
  }
  app.classList.toggle('map-only', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', enabled ? 'Volver a la vista completa' : 'Ampliar mapa y ocultar información');
  button.title = enabled ? 'Volver a la vista completa (Escape)' : 'Ampliar mapa';
  button.innerHTML = svgIcon(enabled ? 'collapse' : 'expand') + '<span>' + (enabled ? 'Volver' : 'Ampliar mapa') + '</span>';
  resize();
  if (enabled) fitView();
  else if (mapModeCamera) { cam = {...mapModeCamera, target: [...mapModeCamera.target]}; mapModeCamera = null; }
  schedule();
  button.focus({preventScroll: true});
  announce(enabled ? 'Solo mapa. Pulsa Volver o Escape para mostrar la información.' : 'Vista completa del festival.');
}
const categoryNames = {all: 'Todo', stage: 'Escenarios', bar: 'Barras', food: 'Comida', wc: 'Baños', medical: 'Médicos', entry: 'Accesos', vip: 'Premium'};
const categorySingular = {stage: 'Escenario', bar: 'Barra', food: 'Comida', wc: 'Sanitarios', medical: 'Servicio médico', entry: 'Acceso', vip: 'Área Premium'};
function svgIcon(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (iconPaths[name] || iconPaths.map) + '</svg>';
}
function normalized(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function matchesPoint(p) {
  return (filter === 'all' || p.type === filter) && (!search || normalized([p.name, p.desc, categoryNames[p.type]].join(' ')).includes(normalized(search)));
}
function announce(message) { document.getElementById('map-status').textContent = message; }
function setBrowsing(open) {
  document.getElementById('app').classList.toggle('is-browsing', open);
  document.getElementById('browse').setAttribute('aria-expanded', String(open));
  document.getElementById('browse').setAttribute('aria-label', open ? 'Cerrar lista de zonas' : 'Ver lista de zonas');
}
function renderResults() {
  const list = document.getElementById('results');
  if (!list) return;
  const points = dayData[day].points.filter(matchesPoint);
  document.getElementById('result-count').textContent = points.length + (points.length === 1 ? ' zona' : ' zonas');
  document.getElementById('clear-search').hidden = !search;
  list.replaceChildren();
  for (const p of points) {
    const row = document.createElement('button');
    row.className = 'zone-row'; row.type = 'button'; row.dataset.point = p.id;
    row.setAttribute('aria-pressed', String(selected?.id === p.id));
    row.setAttribute('aria-label', 'Ver ' + p.name);
    row.innerHTML = '<span class="zone-symbol" style="--zone-color:' + colors[p.type] + '">' + svgIcon(p.type) + '</span><span class="zone-text"><span class="zone-name"></span><span class="zone-type"></span></span>' + svgIcon('chevron');
    row.querySelector('.zone-name').textContent = p.name;
    row.querySelector('.zone-type').textContent = categorySingular[p.type];
    row.onclick = () => {
      selectPoint(p);
      setBrowsing(false);
      document.getElementById('close').focus({preventScroll: true});
    };
    list.append(row);
  }
  if (!points.length) {
    const empty = document.createElement('div'); empty.className = 'empty-results';
    const copy = document.createElement('p'); copy.textContent = search ? 'No encontramos esa zona. Prueba otro nombre o cambia la categoría.' : 'No hay zonas de esta categoría en este día.';
    const clear = document.createElement('button'); clear.className = 'text-button'; clear.type = 'button'; clear.textContent = 'Mostrar todas las zonas'; clear.onclick = clearFilters;
    empty.append(copy, clear); list.append(empty);
  }
  document.querySelectorAll('.chip').forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.filter === filter)));
  document.getElementById('d1').setAttribute('aria-pressed', String(day === 1));
  document.getElementById('d2').setAttribute('aria-pressed', String(day === 2));
  document.getElementById('selection-type').textContent = selected ? categorySingular[selected.type] + ' · Día ' + day : 'Información de la zona';
  announce('Día ' + day + '. ' + points.length + ' zonas disponibles.');
}
function clearFilters() {
  search = ''; filter = 'all'; document.getElementById('query').value = '';
  document.getElementById('filters').scrollLeft = 0;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  resetInfo(); renderResults(); schedule();
}
function fitView() {
  // Fit the actual model, including its near edge, to every viewport aspect ratio.
  // No automatic orbit or continuous render loop: the map draws only on demand.
  if (!softwareMesh || !viewport[0] || !viewport[1]) return;
  const bounds = () => {
    const matrix = worldMat();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const vertices = softwareMesh.v;
    for (let i = 0; i < vertices.length; i += 3) {
      const p = project(matrix, [vertices[i], vertices[i + 1], vertices[i + 2]]);
      if (!p) return {extent: Infinity};
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    }
    return {extent: Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minY), Math.abs(maxY)), x: (minX + maxX) / 2, y: (minY + maxY) / 2};
  };
  for (let pass = 0; pass < 2; pass++) {
    let near = 80, far = 490;
    for (let attempt = 0; attempt < 10; attempt++) {
      cam.dist = (near + far) / 2;
      if (bounds().extent > .88) near = cam.dist; else far = cam.dist;
    }
    cam.dist = far;
    if (pass === 0) {
      const box = bounds(), scale = cam.dist * Math.tan(Math.PI / 8);
      const dx = box.x * scale * viewport[0] / viewport[1];
      const dy = box.y * scale;
      const right = [Math.cos(cam.az), 0, -Math.sin(cam.az)];
      const up = [-Math.sin(cam.el) * Math.sin(cam.az), Math.cos(cam.el), -Math.sin(cam.el) * Math.cos(cam.az)];
      cam.target = cam.target.map((value, i) => value + right[i] * dx + up[i] * dy);
    }
  }
}
function declutterPins() {
  const nodes = [...document.querySelectorAll('.pin:not(.hidden)')];
  nodes.forEach(node => node.classList.remove('label-hidden'));
  nodes.sort((a, b) => Number(b.classList.contains('selected')) - Number(a.classList.contains('selected')) || Number(b.dataset.type === 'stage') - Number(a.dataset.type === 'stage'));
  const occupied = [];
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (!node.classList.contains('selected') && occupied.some(r => rect.left < r.right + 4 && rect.right > r.left - 4 && rect.top < r.bottom + 4 && rect.bottom > r.top - 4)) node.classList.add('label-hidden');
    occupied.push(node.getBoundingClientRect());
  }
}
function openReference() {
  document.getElementById('refday').textContent = 'Día ' + day;
  document.getElementById('refimage').src = references[day - 1];
  setBrowsing(false);
  const modal = document.getElementById('refmodal');
  if (!modal.open) modal.showModal();
}
function initializeInterface() {
  const mapMode = document.createElement('button');
  mapMode.type = 'button'; mapMode.id = 'mapmode'; mapMode.className = 'icon-btn map-mode-btn';
  mapMode.setAttribute('aria-pressed', 'false');
  mapMode.setAttribute('aria-label', 'Ampliar mapa y ocultar información');
  mapMode.title = 'Ampliar mapa';
  mapMode.innerHTML = svgIcon('expand') + '<span>Ampliar mapa</span>';
  mapMode.onclick = () => setMapOnly(!document.getElementById('app').classList.contains('map-only'));
  document.getElementById('app').append(mapMode);
  const referenceImage = document.createElement('img');
  referenceImage.id = 'refimage'; referenceImage.alt = 'Plano de referencia del festival';
  referenceImage.src = references[0];
  document.getElementById('reference-image').append(referenceImage);
  document.getElementById('close').onclick = () => { resetInfo(); canvas.focus({preventScroll: true}); };
  document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = svgIcon(node.dataset.icon); });
  document.querySelectorAll('.chip').forEach(chip => { chip.innerHTML = svgIcon(chip.dataset.filter) + '<span>' + categoryNames[chip.dataset.filter] + '</span>'; });
  document.getElementById('clear-search').onclick = () => { search = ''; document.getElementById('query').value = ''; renderResults(); schedule(); document.getElementById('query').focus(); };
  document.getElementById('browse').onclick = () => setBrowsing(!document.getElementById('app').classList.contains('is-browsing'));
  document.getElementById('query').addEventListener('focus', () => setBrowsing(true));
  document.getElementById('query').addEventListener('input', () => { setBrowsing(true); renderResults(); if (selected && !matchesPoint(selected)) resetInfo(); });
  document.addEventListener('pointerdown', event => {
    document.getElementById('app').classList.remove('keyboard-input');
    if (!event.target.closest('.panel-left')) setBrowsing(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') document.getElementById('app').classList.add('keyboard-input');
    if (event.key === 'Escape' && document.getElementById('app').classList.contains('map-only')) {
      event.preventDefault(); setMapOnly(false); return;
    }
    if (event.key === 'Escape' && !document.getElementById('refmodal').open) {
      const browsing = document.getElementById('app').classList.contains('is-browsing');
      if (browsing) { setBrowsing(false); document.getElementById('browse').focus(); }
      else if (selected) { resetInfo(); canvas.focus(); }
    }
  });
  canvas.addEventListener('keydown', event => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(key)) return;
    event.preventDefault();
    if (key === 'ArrowLeft') cam.az -= .12;
    if (key === 'ArrowRight') cam.az += .12;
    if (key === 'ArrowUp') cam.el = clamp(cam.el + .08, .22, 1.49);
    if (key === 'ArrowDown') cam.el = clamp(cam.el - .08, .22, 1.49);
    if (key === '+' || key === '=') scrollZoom(-100);
    if (key === '-') scrollZoom(100);
    if (key === 'Home') { cam = defaultCam(); fitView(); }
    schedule();
  });
  const modal = document.getElementById('refmodal');
  document.getElementById('reference').onclick = openReference;
  document.getElementById('closemodal').onclick = () => modal.close();
  modal.onclick = event => { if (event.target === modal) { const r = modal.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close(); } };
  modal.addEventListener('close', () => document.getElementById('reference').focus({preventScroll: true}));
  new ResizeObserver(() => {
    document.getElementById('app').style.setProperty('--info-height', document.getElementById('info').offsetHeight + 'px');
  }).observe(document.getElementById('info'));
  // Visual-viewport resize covers a mobile keyboard without rebuilding map geometry.
  window.visualViewport?.addEventListener('resize', () => { if (document.activeElement === document.getElementById('query')) setBrowsing(true); });
  renderResults();
}
