'use strict';

/* VenueMap FUTUR — estado del mapa, cámara, gestos, marcadores y selección.
   El modelo 3D vive en scene3d.js; la interfaz en interface.js y la navegación en navigation.js. */
const dayData = window.VenueDays;
const references = ['planos/dia-1.webp', 'planos/dia-2.webp'];
const colors = {stage: '#3a56a8', bar: '#e2627f', food: '#e8961c', wc: '#178f8b', medical: '#d93f42', entry: '#4f78a3', vip: '#5a6cc0', area: '#a8539a'};
const $ = selector => document.querySelector(selector);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduceMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

// Posición de cada zona en el modelo (x, z) a partir de sus píxeles en el plano.
for (const n of [1, 2]) for (const p of dayData[n].points) {
  const [x, z] = window.VenueScene.toWorld ? window.VenueScene.toWorld(n, p.at) : [0, 0];
  p.x = x; p.z = z; p.y = p.h || 2.1;
}

const scene = $('#scene'), canvas = $('#canvas'), pins = $('#pins'), info = $('#info'), infobody = $('#infobody');
let viewport = [1, 1], day = 1, filter = 'all', search = '', selected = null, raf = null, has3D = false;
let cam = {az: .78, el: .8, dist: 60, target: [0, 0, 0]};
let distLimits = [6, 160];
const pointers = new Map();
let lastTouchDistance = 0, cameraTween = null;

const isMobile = () => window.innerWidth <= 670;
const isShortLandscape = () => window.innerHeight < 540 && window.innerWidth > window.innerHeight;

const POSTER_AZ = {1: .74, 2: .78};
let preferredAz = {};
function defaultCam() {
  // Vista isométrica del póster; en pantallas verticales gira lo necesario para que el recinto llene la pantalla.
  const portrait = viewport[1] > viewport[0] * 1.05;
  const el = portrait ? 1.0 : isShortLandscape() ? .82 : .74;
  const key = day + ':' + Math.round(viewport[0] / 40) + 'x' + Math.round(viewport[1] / 40);
  if (has3D && preferredAz[key] === undefined) {
    let best = {az: POSTER_AZ[day], dist: Infinity};
    for (let k = -4; k <= 4; k++) {
      const candidate = {az: POSTER_AZ[day] + k * Math.PI / 8, el, dist: 60, target: [0, 0, 0]};
      const saved = cam; cam = candidate; fitView(); cam = saved;
      // Se prefiere el ángulo del póster salvo que otro acerque claramente el recinto.
      const score = candidate.dist * (1 + Math.abs(k) * .025);
      if (score < best.dist) best = {az: candidate.az, dist: score};
    }
    preferredAz[key] = best.az;
  }
  return {az: preferredAz[key] ?? POSTER_AZ[day], el, dist: 60, target: [0, 0, 0]};
}

function fitView() {
  if (!has3D || !viewport[0] || !viewport[1]) return;
  const limitX = .9, limitY = .84;
  for (let pass = 0; pass < 2; pass++) {
    let near = 2, far = 400;
    for (let i = 0; i < 24; i++) {
      cam.dist = (near + far) / 2;
      const e = VenueScene.extentFor(cam);
      if (!Number.isFinite(e.extentX) || e.extentX > limitX || e.extentY > limitY) near = cam.dist; else far = cam.dist;
    }
    cam.dist = far;
    if (pass === 0) {
      const e = VenueScene.extentFor(cam), basis = VenueScene.cameraBasis(cam);
      const halfH = cam.dist * basis.halfHeight, halfW = halfH * basis.aspect;
      cam.target = cam.target.map((v, i) => v + basis.right[i] * e.x * halfW + basis.up[i] * e.y * halfH);
      cam.target[1] = 0;
    }
  }
  distLimits = [cam.dist * .2, cam.dist * 1.7];
}

function resize() {
  const w = Math.max(1, scene.clientWidth), h = Math.max(1, scene.clientHeight);
  viewport = [w, h];
  if (has3D) VenueScene.setSize(w, h);
  schedule();
}

function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
function draw(time) {
  raf = null;
  if (cameraTween) stepTween(time);
  window.VenueNavigation?.beforeRender(time);
  if (has3D) VenueScene.render(cam);
  updatePins();
  if (cameraTween) schedule();
}

/* ---------- marcadores ---------- */
function updatePins() {
  if (!has3D) return 0;
  let visibleCount = 0;
  const showLabels = !(isMobile() || isShortLandscape()) || filter !== 'all';
  for (const p of dayData[day].points) {
    const e = document.getElementById('pin-' + p.id);
    if (!e) continue;
    const pr = matchesPoint(p) ? VenueScene.project([p.x, p.y, p.z]) : null;
    if (!pr) { e.classList.add('hidden'); continue; }
    const [x, y] = pr;
    if (x < 16 || x > viewport[0] - 16 || y < 16 || y > viewport[1] - 4) { e.classList.add('hidden'); continue; }
    e.classList.remove('hidden');
    e.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%)';
    e.classList.toggle('subtle', !showLabels && p.type !== 'stage' && selected?.id !== p.id);
    e.classList.toggle('selected', selected?.id === p.id);
    visibleCount++;
  }
  for (const label of pins.querySelectorAll('.landmark')) {
    const pr = VenueScene.project(JSON.parse(label.dataset.position));
    label.classList.toggle('hidden', !pr || pr[0] < 30 || pr[0] > viewport[0] - 30 || pr[1] < 12 || pr[1] > viewport[1] - 12);
    if (pr) label.style.transform = 'translate3d(' + pr[0].toFixed(1) + 'px,' + pr[1].toFixed(1) + 'px,0) translate(-50%,-50%)';
  }
  VenueScene.setStems(id => { const p = dayData[day].points.find(q => q.id === id); return !!p && matchesPoint(p); }, selected?.id);
  declutterPins();
  return visibleCount;
}
function createPins() {
  pins.replaceChildren();
  if (has3D) for (const landmark of VenueScene.landmarks(day)) {
    const label = document.createElement('span');
    label.className = 'landmark hidden'; label.textContent = landmark.text; label.setAttribute('aria-hidden', 'true');
    label.dataset.position = JSON.stringify(landmark.position);
    pins.append(label);
  }
  for (const p of dayData[day].points) {
    const b = document.createElement('button');
    b.className = 'pin hidden'; b.id = 'pin-' + p.id; b.type = 'button'; b.dataset.type = p.type;
    b.style.setProperty('--pin', colors[p.type]);
    b.setAttribute('aria-label', 'Ver ' + p.name);
    b.innerHTML = '<span class="pincore">' + svgIcon(p.type) + '</span><span class="pintext"></span>';
    b.querySelector('.pintext').textContent = p.name;
    b.addEventListener('click', () => { selectPoint(p); setBrowsing(false); });
    pins.append(b);
  }
  schedule();
}

/* ---------- selección ---------- */
function selectPoint(p) {
  selected = p;
  $('#app').classList.add('has-selection');
  $('#close').hidden = false;
  infobody.innerHTML = '<div class="info-icon" style="--zone-color:' + colors[p.type] + '">' + svgIcon(p.type) + '</div><h2 class="info-title"></h2><p class="info-desc"></p><span class="status">' + (p.restricted ? 'Acceso restringido' : 'Punto de referencia ilustrativo') + '</span><button type="button" class="info-action" id="focuspoint">Centrar esta zona ' + svgIcon('focus') + '</button>';
  infobody.querySelector('.info-title').textContent = p.name;
  infobody.querySelector('.info-desc').textContent = p.desc;
  $('#focuspoint').onclick = () => focusPoint(p);
  window.VenueNavigation?.onSelection(p);
  renderResults();
  announce(p.name + '. ' + p.desc);
  schedule();
}
function resetInfo() {
  selected = null;
  $('#app').classList.remove('has-selection');
  $('#close').hidden = true;
  infobody.replaceChildren();
  renderResults(); schedule();
}
function focusPoint(p) {
  const goal = {az: cam.az, el: clamp(cam.el, .62, .95), dist: clamp(cam.dist * .62, distLimits[0] * 1.6, distLimits[1]), target: [p.x, 0, p.z]};
  tweenCamera(goal);
  announce('Vista centrada en ' + p.name + '.');
}

/* ---------- cámara: transición breve al centrar una zona ---------- */
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function tweenCamera(goal, duration = 320) {
  if (reduceMotionQuery.matches || !has3D) { cam = goal; cameraTween = null; schedule(); return; }
  cameraTween = {from: {...cam, target: [...cam.target]}, to: goal, start: null, duration};
  schedule();
}
function stepTween(time) {
  const t = cameraTween;
  if (t.start === null) t.start = time;
  const k = easeInOut(Math.min(1, (time - t.start) / t.duration));
  const da = Math.atan2(Math.sin(t.to.az - t.from.az), Math.cos(t.to.az - t.from.az));
  cam = {az: t.from.az + da * k, el: t.from.el + (t.to.el - t.from.el) * k, dist: t.from.dist + (t.to.dist - t.from.dist) * k, target: t.from.target.map((v, i) => v + (t.to.target[i] - v) * k)};
  if (k >= 1) cameraTween = null;
}
function stopTween() { cameraTween = null; }

/* ---------- días ---------- */
function setDay(n) {
  day = n;
  window.VenueNavigation?.onDayChanged();
  $('#filters').scrollLeft = 0;
  $('#d1').classList.toggle('active', n === 1); $('#d2').classList.toggle('active', n === 2);
  $('#daydesc').textContent = dayData[n].date + ' · ' + dayData[n].venue;
  $('#query').value = ''; search = ''; filter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'all'));
  stopTween();
  resetInfo();
  if (has3D) VenueScene.setDay(n);
  cam = defaultCam(); fitView();
  createPins(); renderResults(); setBrowsing(false); schedule();
}

/* ---------- gestos ---------- */
function zoomBy(delta) {
  stopTween();
  cam.dist = clamp(cam.dist * Math.exp(delta * .0015), distLimits[0], distLimits[1]);
  schedule();
}
// Un gesto puede empezar sobre un marcador: si el dedo se desplaza, gira o hace zoom y el
// toque deja de contar como selección; si no se mueve, el marcador recibe su clic normal.
let dragDistance = 0, suppressPinClick = false;
scene.addEventListener('pointerdown', event => {
  stopTween();
  const onPin = !!event.target.closest('.pin');
  if (!onPin) scene.setPointerCapture(event.pointerId);
  if (!pointers.size) { dragDistance = 0; suppressPinClick = false; }
  pointers.set(event.pointerId, [event.clientX, event.clientY]);
  lastTouchDistance = 0; scene.classList.add('dragging');
});
scene.addEventListener('pointermove', event => {
  if (!pointers.has(event.pointerId)) return;
  const old = pointers.get(event.pointerId), now = [event.clientX, event.clientY];
  pointers.set(event.pointerId, now);
  const dx = now[0] - old[0], dy = now[1] - old[1];
  dragDistance += Math.hypot(dx, dy);
  if (dragDistance > 6 || pointers.size > 1) { suppressPinClick = true; window.VenueNavigation?.onExplore(); }
  if (pointers.size === 1) { cam.az -= dx * .0075; cam.el = clamp(cam.el + dy * .0055, .25, 1.45); }
  else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (lastTouchDistance > 0) cam.dist = clamp(cam.dist * (lastTouchDistance / distance), distLimits[0], distLimits[1]);
    lastTouchDistance = distance;
  }
  schedule();
});
function endPointer(event) { pointers.delete(event.pointerId); if (!pointers.size) scene.classList.remove('dragging'); lastTouchDistance = 0; }
scene.addEventListener('pointerup', endPointer);
scene.addEventListener('pointercancel', endPointer);
pins.addEventListener('click', event => { if (suppressPinClick && event.target.closest('.pin')) { event.preventDefault(); event.stopPropagation(); suppressPinClick = false; } }, true);
scene.addEventListener('wheel', event => { event.preventDefault(); zoomBy(event.deltaY); }, {passive: false});
// Safari envía gestos propios de pellizco: se evitan para que no amplíe la página entera.
for (const type of ['gesturestart', 'gesturechange']) scene.addEventListener(type, event => event.preventDefault());

$('#zoomplus').onclick = () => zoomBy(-260);
$('#zoomminus').onclick = () => zoomBy(260);
$('#reset').onclick = () => { stopTween(); cam = defaultCam(); fitView(); schedule(); };
$('#close').onclick = resetInfo;
$('#d1').onclick = () => setDay(1);
$('#d2').onclick = () => setDay(2);
document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => {
  filter = chip.dataset.filter;
  document.querySelectorAll('.chip').forEach(k => k.classList.toggle('active', k === chip));
  if (selected && !matchesPoint(selected)) resetInfo();
  renderResults(); schedule();
}));
$('#query').addEventListener('input', event => { search = event.target.value.trim(); schedule(); });
let resizeFrame = null;
window.addEventListener('resize', () => {
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null; resize();
    // El teclado del móvil cambia el alto: no se reencuadra mientras se escribe ni durante un recorrido.
    if (document.activeElement?.id !== 'query' && !window.VenueNavigation?.isGuiding()) { cam = defaultCam(); fitView(); schedule(); }
  });
});

/* ---------- arranque ---------- */
function start() {
  has3D = window.VenueScene.init(canvas);
  if (!has3D) {
    $('#fallback').classList.add('shown');
    scene.classList.add('no-3d');
  }
  resize();
  setDay(1);
  $('#loading').hidden = true;
  initializeInterface();
  window.__venue3Dready = true;
  window.__venue3Dmode = has3D ? 'WebGL' : 'Sin 3D';
}
const fontReady = document.fonts ? Promise.race([document.fonts.load('800 40px Archivo'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontReady.then(start, start).catch(error => {
  console.error('Error del visor 3D', error);
  $('#fallback').classList.add('shown');
  $('#loading').hidden = true;
});
