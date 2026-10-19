'use strict';

/* VenueMap FUTUR — «Cómo llegar», recorrido guiado simulado y ubicación del teléfono.
   Todo ocurre sobre el modelo propio: sin mapas, iframes ni enlaces externos.
   La red está en píxeles del plano (navigation-data.js); el grafo se resuelve ahí y
   el recorrido se convierte a coordenadas del modelo para dibujarlo y seguirlo. */
window.VenueNavigation = (() => {
  const data = window.VenueNavigationData;
  const byId = id => document.getElementById(id);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const PLAYBACK_MS = 18000;
  let initialized = false, route = null, playing = false, previousFrame = null;
  let watchId = null, watchToken = 0, locating = false;
  let guidance = null, following = false, guideSignature = '';
  let gpsMessage = 'Activa la ubicación para comprobar la señal de tu teléfono.';
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const interpolate = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const restricted = p => !!p.restricted || data.restrictedPointIds.includes(p.id);
  const pathPoints = path => path.pts || path;

  // Divide cada tramo en sus cruces y en los dos puntos de acceso. El camino más corto
  // solo puede recorrer estos tramos, nunca el espacio libre, y nunca entra en un radio
  // de zona restringida.
  function findRoute(paths, origin, destination, blocked = []) {
    const radius = data.restrictedRadius || 0;
    const segments = paths.flatMap(path => { const pts = pathPoints(path); return pts.slice(1).map((b, i) => ({a: pts[i], b, cuts: [0, 1]})); });
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const a = segments[i], b = segments[j], r = subtract(a.b, a.a), s = subtract(b.b, b.a), den = cross(r, s);
      if (Math.abs(den) < 1e-8) continue;
      const offset = subtract(b.a, a.a), t = cross(offset, s) / den, u = cross(offset, r) / den;
      if (t >= -1e-7 && t <= 1 + 1e-7 && u >= -1e-7 && u <= 1 + 1e-7) { a.cuts.push(Math.max(0, Math.min(1, t))); b.cuts.push(Math.max(0, Math.min(1, u))); }
    }
    const nearRestricted = p => blocked.some(q => distance(p, q) < radius);
    function attach(point) {
      let best = null;
      for (const segment of segments) {
        const ab = subtract(segment.b, segment.a), ap = subtract(point, segment.a), length = ab[0] * ab[0] + ab[1] * ab[1];
        if (!length) continue;
        const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / length)), position = interpolate(segment.a, segment.b, t), gap = distance(point, position);
        if (nearRestricted(position)) continue;
        if (!best || gap < best.gap) best = {segment, t, position, gap};
      }
      if (best) best.segment.cuts.push(best.t);
      return best;
    }
    const start = attach(origin), finish = attach(destination);
    if (!start || !finish) return null;
    const nodes = new Map(), key = p => p.map(n => n.toFixed(3)).join(',');
    function node(point) { const id = key(point); if (!nodes.has(id)) nodes.set(id, {point, edges: new Map()}); return id; }
    for (const segment of segments) {
      const cuts = [...new Set(segment.cuts)].sort((a, b) => a - b);
      for (let i = 1; i < cuts.length; i++) {
        const a = interpolate(segment.a, segment.b, cuts[i - 1]), b = interpolate(segment.a, segment.b, cuts[i]), length = distance(a, b);
        if (length < 1e-6) continue;
        // Muestreo del tramo: si toca una zona restringida, el tramo no existe para el público.
        let crosses = false;
        for (let k = 0; k <= 8 && !crosses; k++) crosses = nearRestricted(interpolate(a, b, k / 8));
        if (crosses) continue;
        const ak = node(a), bk = node(b); nodes.get(ak).edges.set(bk, length); nodes.get(bk).edges.set(ak, length);
      }
    }
    const source = key(start.position), target = key(finish.position);
    if (!nodes.has(source) || !nodes.has(target)) return null;
    const cost = new Map([[source, 0]]), parent = new Map(), pending = new Set(nodes.keys());
    while (pending.size) {
      let current = null, best = Infinity;
      for (const id of pending) { const c = cost.get(id) ?? Infinity; if (c < best) { best = c; current = id; } }
      if (current === null || current === target) break;
      pending.delete(current);
      for (const [neighbor, length] of nodes.get(current).edges) {
        const candidate = best + length;
        if (candidate < (cost.get(neighbor) ?? Infinity)) { cost.set(neighbor, candidate); parent.set(neighbor, current); }
      }
    }
    if (!Number.isFinite(cost.get(target))) return null;
    const ids = [target];
    while (ids[0] !== source) { const previous = parent.get(ids[0]); if (!previous) return null; ids.unshift(previous); }
    return {plan: ids.map(id => nodes.get(id).point), start: origin, finish: destination};
  }
  // Convierte el recorrido a coordenadas del modelo y elimina vértices casi alineados.
  function toModelRoute(planPoints) {
    const world = planPoints.map(p => VenueScene.toWorld(day, p));
    const points = [world[0]];
    for (let i = 1; i < world.length; i++) if (distance(world[i], points.at(-1)) > .05) points.push(world[i]);
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
    return {points, cumulative, total: cumulative.at(-1)};
  }

  /* ---------- reproducción ---------- */
  function setPlayLabels(on) {
    if (!initialized) return;
    for (const id of ['nav-play', 'guide-play']) { byId(id).textContent = on ? 'Pausar' : 'Reproducir'; byId(id).setAttribute('aria-pressed', String(on)); }
  }
  function pause() { playing = false; previousFrame = null; setPlayLabels(false); }
  function play() {
    if (playing) { pause(); return; }
    if (!route || reducedMotion.matches || route.progress >= 1) return;
    playing = true; previousFrame = null; setPlayLabels(true); schedule();
  }
  // Se llama en cada fotograma, antes de dibujar el modelo.
  function beforeRender(time) {
    if (!initialized || !route) return;
    if (playing) {
      if (document.hidden) { pause(); }
      else {
        if (previousFrame !== null) route.progress = Math.min(1, route.progress + Math.min(time - previousFrame, 100) / PLAYBACK_MS);
        previousFrame = time;
        updateProgress(false);
        if (route.progress >= 1) { pause(); announce('Fin del recorrido simulado.'); }
        else schedule();
      }
    }
    if (guidance && following) followRoute(time);
    const position = positionOnRoute();
    VenueScene.setWalker({position, direction: routeTangent().direction, arrow: !!guidance});
  }

  function stopRoute() {
    stopGuidance(); pause(); route = null;
    if (window.VenueScene?.ready) VenueScene.clearRoute();
    if (!initialized) return;
    byId('app').classList.remove('has-route');
    byId('route-dock').hidden = true; byId('route-badge').hidden = true; byId('route-progress-section').hidden = true;
    byId('nav-route-status').textContent = 'Elige dos zonas distintas para ver un recorrido de prueba.';
    schedule();
  }
  function showView(view) {
    byId('nav-panel').dataset.view = view;
    byId('nav-title').textContent = view === 'gps' ? 'Mi ubicación' : 'Cómo llegar';
    byId('nav-view-route').setAttribute('aria-pressed', String(view === 'route'));
    byId('nav-view-gps').setAttribute('aria-pressed', String(view === 'gps'));
  }
  function setPanel(open, view = 'route') {
    byId('nav-panel').hidden = !open; byId('app').classList.toggle('navigation-open', open);
    byId('navigation-toggle').setAttribute('aria-expanded', String(open));
    if (open) { showView(view); setBrowsing(false); pause(); byId('nav-close').focus({preventScroll: true}); }
    else { pause(); stopGPS('Ubicación detenida. Puedes volver a activarla cuando quieras.'); (guidance ? byId('guide-options') : byId('navigation-toggle')).focus({preventScroll: true}); }
  }
  function publicPoints() { return dayData[day].points.filter(p => !restricted(p)); }
  function populateDestinations(destinationId) {
    const from = byId('nav-from'), to = byId('nav-to'), points = publicPoints();
    from.replaceChildren(); to.replaceChildren();
    for (const select of [from, to]) for (const p of points) {
      const option = document.createElement('option'); option.value = p.id; option.textContent = p.name; select.append(option);
    }
    const gps = document.createElement('option'); gps.value = 'gps'; gps.disabled = true; gps.textContent = 'Mi ubicación · falta calibrar el plano'; from.append(gps);
    from.value = points.find(p => p.type === 'entry')?.id || points[0].id;
    to.value = destinationId && points.some(p => p.id === destinationId) && destinationId !== from.value ? destinationId : (points.find(p => p.type === 'stage')?.id || points[1]?.id || points[0].id);
    if (to.value === from.value) from.value = points.find(p => p.id !== to.value)?.id || from.value;
    byId('nav-day').textContent = dayData[day].label;
  }
  function planRoute() {
    pause();
    const points = dayData[day].points, from = points.find(p => p.id === byId('nav-from').value), to = points.find(p => p.id === byId('nav-to').value);
    stopRoute();
    if (!from || !to || restricted(from) || restricted(to) || from.id === to.id) {
      byId('nav-route-status').textContent = 'Elige un origen y un destino distintos, de acceso público.'; return false;
    }
    const blocked = points.filter(restricted).map(p => p.at);
    const result = findRoute(data.days[day].paths, from.access || from.at, to.access || to.at, blocked);
    const model = result && toModelRoute(result.plan);
    if (!model || model.total < .05) { byId('nav-route-status').textContent = 'No hay un recorrido de prueba entre estas zonas.'; return false; }
    route = {...model, originId: from.id, destinationId: to.id, origin: from.name, destination: to.name, day, progress: 0};
    route.maneuvers = makeManeuvers(route, to.name);
    VenueScene.setRoute(route.points);
    byId('app').classList.add('has-route');
    byId('route-dock').hidden = false; byId('route-badge').hidden = false; byId('route-progress-section').hidden = false;
    byId('nav-route-status').textContent = 'Desde ' + from.name + ' hasta un punto de referencia próximo a ' + to.name + '.';
    byId('route-summary').textContent = from.name + ' → ' + to.name;
    if (!guidance) { stopTween(); cam = defaultCam(); fitView(); }
    updateProgress(); announce('Ruta de prueba desde ' + from.name + ' hasta ' + to.name + '. ' + route.maneuvers.length + ' pasos.');
    return true;
  }
  function positionOnRoute() {
    if (!route) return [0, 0];
    const travelled = route.total * route.progress;
    for (let i = 1; i < route.points.length; i++) if (route.cumulative[i] >= travelled) {
      const length = route.cumulative[i] - route.cumulative[i - 1];
      return interpolate(route.points[i - 1], route.points[i], length ? (travelled - route.cumulative[i - 1]) / length : 0);
    }
    return route.points.at(-1);
  }
  function routeTangent() {
    if (!route) return {direction: [0, -1]};
    const travelled = route.progress * route.total;
    let segment = route.points.length - 1;
    for (let i = 1; i < route.points.length; i++) if (route.cumulative[i] > travelled + .001) { segment = i; break; }
    const delta = subtract(route.points[segment], route.points[segment - 1]), length = Math.hypot(...delta) || 1;
    return {direction: delta.map(x => x / length)};
  }
  function updateProgress(redraw = true) {
    if (!route) return;
    const percent = Math.round(route.progress * 100);
    byId('nav-progress').value = String(percent);
    byId('nav-progress-label').textContent = percent + '% del recorrido de prueba';
    byId('nav-advance').disabled = route.progress >= 1;
    byId('nav-play').disabled = reducedMotion.matches || route.progress >= 1;
    byId('guide-play').disabled = reducedMotion.matches || route.progress >= 1;
    byId('guide-next').disabled = route.progress >= 1; byId('guide-back').disabled = route.progress <= 0;
    byId('nav-instruction').textContent = route.progress >= 1 ? 'Fin de la simulación junto a ' + route.destination + '.' : route.progress === 0 ? 'El punto azul representa una persona simulada.' : 'Sigue la línea azul en esta demostración.';
    byId('route-badge-label').textContent = 'Simulación · ' + route.destination + ' · ' + percent + '%';
    updateGuidance();
    if (redraw) schedule();
  }

  /* ---------- instrucciones ---------- */
  function makeManeuvers(path, destination) {
    const turns = [];
    for (let i = 1; i < path.points.length - 1; i++) {
      const incoming = subtract(path.points[i], path.points[i - 1]), outgoing = subtract(path.points[i + 1], path.points[i]);
      // En el plano del modelo (x hacia la derecha, z hacia abajo vistos desde arriba) un producto cruzado positivo es un giro horario: a la derecha.
      const angle = Math.atan2(cross(incoming, outgoing), incoming[0] * outgoing[0] + incoming[1] * outgoing[1]);
      if (Math.abs(angle) > .5) turns.push({at: path.cumulative[i], label: (Math.abs(angle) > 1.9 ? 'Da la vuelta y continúa ' : 'En el próximo cruce, gira ') + (angle > 0 ? 'a la derecha' : 'a la izquierda'), direction: angle > 0 ? 'right' : 'left'});
    }
    turns.push({at: path.total, label: 'Continúa hacia ' + destination, direction: 'straight'});
    return turns;
  }
  function updateGuidance() {
    if (!route || !initialized) return;
    const travelled = route.progress * route.total, found = route.maneuvers.findIndex(m => m.at > travelled + .001), index = found < 0 ? route.maneuvers.length - 1 : found;
    const step = route.maneuvers[index], finished = route.progress >= 1;
    const signature = [route.day, route.originId, route.destinationId, Math.round(route.progress * 100), index, finished, following].join('|');
    if (signature === guideSignature) return;
    guideSignature = signature;
    byId('guide-context').textContent = 'Simulación · ' + Math.round(route.progress * 100) + '%';
    byId('guide-title').textContent = finished ? 'Fin de la demostración' : step.label;
    byId('guide-detail').textContent = finished ? 'Punto próximo a ' + route.destination : 'Hacia ' + route.destination + ' · Paso ' + (index + 1) + ' de ' + route.maneuvers.length;
    byId('guide-symbol').dataset.direction = finished ? 'finish' : step.direction;
    byId('guide-symbol').innerHTML = svgIcon(finished ? 'focus' : step.direction === 'straight' ? 'chevron' : 'route');
    byId('guide-recenter').setAttribute('aria-pressed', String(following));
    byId('guide-recenter').querySelector('span').textContent = following ? 'Siguiendo recorrido' : 'Recentrar';
  }

  /* ---------- cámara de seguimiento ---------- */
  let lastFollow = null;
  function followGoal() {
    const position = positionOnRoute(), {direction} = routeTangent();
    const ahead = 1.4;
    return {az: Math.atan2(-direction[0], -direction[1]), el: .62, dist: guidance.followDist, target: [position[0] + direction[0] * ahead, 0, position[1] + direction[1] * ahead]};
  }
  function followRoute(time, force = false) {
    if (!guidance || !following || !route) return;
    const goal = followGoal();
    if (force || reducedMotion.matches || lastFollow === null) { cam = goal; lastFollow = time ?? performance.now(); return; }
    const dt = Math.min(100, Math.max(0, (time ?? performance.now()) - lastFollow)); lastFollow = time ?? performance.now();
    const k = 1 - Math.exp(-dt / 140);
    const da = Math.atan2(Math.sin(goal.az - cam.az), Math.cos(goal.az - cam.az));
    cam = {az: cam.az + da * k, el: cam.el + (goal.el - cam.el) * k, dist: cam.dist + (goal.dist - cam.dist) * k, target: cam.target.map((v, i) => v + (goal.target[i] - v) * k)};
    // Mientras la cámara converge se pide otro fotograma; parada, deja de dibujar.
    if (Math.abs(da) > .002 || Math.abs(goal.target[0] - cam.target[0]) + Math.abs(goal.target[2] - cam.target[2]) > .01) schedule();
  }
  function release() { if (guidance && following) { following = false; lastFollow = null; updateGuidance(); announce('Exploración libre. Pulsa Recentrar para seguir el recorrido.'); } }
  function recenter() { if (!guidance) return; following = true; lastFollow = null; stopTween(); followRoute(performance.now(), true); updateGuidance(); schedule(); }
  function startGuidance() {
    if (!route || guidance) return;
    if (!byId('nav-panel').hidden) setPanel(false);
    const mapOnly = byId('app').classList.contains('map-only');
    guidance = {camera: {...cam, target: [...cam.target]}, mapOnly, followDist: 0};
    if (!mapOnly) setMapOnly(true);
    // Cámara cercana: un tercio del encuadre completo en vertical, algo más abierta en pantallas anchas.
    guidance.followDist = distLimits[1] / 1.7 * (viewport[0] > viewport[1] ? .42 : .34);
    byId('app').classList.add('route-guiding'); byId('route-guide').hidden = false; byId('guide-controls').hidden = false;
    if (route.progress >= 1) route.progress = 0;
    following = true; lastFollow = null; stopTween(); followRoute(performance.now(), true); updateProgress();
    if (!reducedMotion.matches) play();
    byId('guide-close').focus({preventScroll: true});
    announce('Demostración del recorrido. Puedes pausar, avanzar por pasos o explorar el mapa.');
  }
  function stopGuidance(restore = true) {
    if (!guidance) return;
    pause(); const previous = guidance; guidance = null; following = false; lastFollow = null;
    byId('app').classList.remove('route-guiding'); byId('route-guide').hidden = true; byId('guide-controls').hidden = true;
    if (restore) {
      if (!previous.mapOnly && byId('app').classList.contains('map-only')) setMapOnly(false);
      cam = {...previous.camera, target: [...previous.camera.target]}; schedule();
      if (route) byId('route-start').focus({preventScroll: true});
    }
  }
  function stepGuidance(direction) {
    if (!route) return;
    pause(); const travelled = route.progress * route.total, stops = [0, ...route.maneuvers.map(m => m.at)];
    const next = direction > 0 ? stops.find(at => at > travelled + .01) : [...stops].reverse().find(at => at < travelled - .01);
    route.progress = Math.max(0, Math.min(1, (next ?? (direction > 0 ? route.total : 0)) / route.total));
    if (guidance && following) followRoute(performance.now(), true);
    updateProgress();
  }

  /* ---------- ubicación del teléfono ---------- */
  function renderGPS() {
    if (!initialized) return;
    byId('gps-status').textContent = gpsMessage;
    byId('gps-toggle').textContent = locating ? 'Detener ubicación' : 'Activar ubicación';
    byId('gps-toggle').setAttribute('aria-pressed', String(locating));
    byId('locate').setAttribute('aria-pressed', String(locating));
  }
  function stopGPS(message) {
    watchToken++;
    if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null; locating = false;
    if (message) gpsMessage = message;
    renderGPS();
  }
  function startGPS() {
    if (locating) { stopGPS('Ubicación detenida.'); return; }
    if (!window.isSecureContext) { gpsMessage = 'Abre el enlace HTTPS de VenueMap para activar tu ubicación.'; renderGPS(); return; }
    if (!navigator.geolocation) { gpsMessage = 'Este navegador no ofrece ubicación. Puedes probar el recorrido simulado.'; renderGPS(); return; }
    locating = true; const token = ++watchToken; gpsMessage = 'Solicitando ubicación… Acepta el permiso del navegador si quieres continuar.'; renderGPS();
    try {
      const newWatch = navigator.geolocation.watchPosition(position => {
        if (token !== watchToken) return;
        const {latitude, longitude, accuracy} = position.coords;
        if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(accuracy) || accuracy < 0 || !Number.isFinite(position.timestamp) || Date.now() - position.timestamp > 15000) {
          gpsMessage = 'La lectura no es válida o está desactualizada. Esperando una señal reciente…'; renderGPS(); return;
        }
        // Las coordenadas no se guardan, registran, envían ni se proyectan sobre este modelo sin calibrar.
        gpsMessage = 'Ubicación recibida · precisión aproximada ±' + Math.ceil(accuracy) + ' m. ' + (accuracy > 50 ? 'La señal es imprecisa. ' : '') + 'Falta calibrar el plano para mostrarte en el recinto y calcular rutas reales.';
        renderGPS();
      }, error => {
        if (token !== watchToken) return;
        const messages = {1: 'Permiso de ubicación denegado. Puedes habilitarlo en los ajustes del sitio o usar la simulación.', 2: 'No se pudo obtener tu ubicación. Intenta de nuevo en un lugar con mejor señal.', 3: 'La ubicación tardó demasiado. Puedes volver a intentarlo.'};
        stopGPS(messages[error.code] || 'No se pudo obtener la ubicación. Puedes volver a intentarlo.');
      }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 5000});
      if (token === watchToken && locating) watchId = newWatch; else navigator.geolocation.clearWatch(newWatch);
    } catch { stopGPS('El navegador no permitió iniciar la ubicación. Puedes usar la simulación.'); }
  }

  /* ---------- enlaces con la interfaz ---------- */
  function onSelection(point) {
    if (!initialized) return;
    if (route) stopRoute();
    const button = document.createElement('button'); button.type = 'button'; button.id = 'route-to'; button.className = 'info-secondary'; button.innerHTML = svgIcon('route') + '<span>Cómo llegar</span>';
    if (restricted(point)) {
      button.disabled = true; button.title = 'Área restringida';
      const note = document.createElement('p'); note.className = 'route-restriction'; note.textContent = 'Área restringida: sin recorrido para el público.'; byId('infobody').append(note);
    } else button.onclick = () => { populateDestinations(point.id); setPanel(true); if (planRoute()) setPanel(false); };
    byId('infobody').append(button);
  }
  function onDayChanged() { if (!initialized) return; stopRoute(); populateDestinations(); }

  function initialize() {
    if (initialized) return;
    const panel = document.createElement('section'); panel.id = 'nav-panel'; panel.className = 'nav-panel'; panel.hidden = true; panel.setAttribute('aria-labelledby', 'nav-title');
    panel.innerHTML = '<header class="nav-panel-head"><h2 id="nav-title">Cómo llegar</h2><button type="button" id="nav-close" class="icon-btn" aria-label="Cerrar navegación">' + svgIcon('close') + '</button></header>' +
      '<div class="nav-view-tabs" role="group" aria-label="Herramientas del mapa"><button type="button" id="nav-view-route" aria-pressed="true">Rutas</button><button type="button" id="nav-view-gps" aria-pressed="false">Mi ubicación</button></div>' +
      '<div id="nav-route-content"><p class="nav-demo-note"><strong>Vista previa de rutas</strong><br>Recorridos simulados por los caminos del modelo. El plano aún no tiene coordenadas verificadas.</p>' +
      '<div class="nav-fields"><label for="nav-from">Desde</label><select id="nav-from"></select><label for="nav-to">Hasta</label><select id="nav-to"></select></div>' +
      '<button type="button" id="nav-plan" class="info-action">Ver ruta de prueba</button><p id="nav-route-status" class="nav-copy" role="status"></p>' +
      '<section id="route-progress-section" hidden aria-label="Simular recorrido"><label id="nav-progress-label" for="nav-progress">0% del recorrido de prueba</label><input id="nav-progress" type="range" min="0" max="100" value="0"><p id="nav-instruction" class="nav-copy"></p><div class="nav-actions"><button type="button" id="nav-play" aria-pressed="false">Reproducir</button><button type="button" id="nav-advance">Avanzar</button></div><button type="button" id="nav-stop" class="text-button">Quitar ruta</button></section></div>' +
      '<section class="nav-gps" aria-label="Ubicación del teléfono"><h3>Mi ubicación <span id="nav-day"></span></h3><p id="gps-status" class="nav-copy" role="status"></p><button type="button" id="gps-toggle" class="info-secondary" aria-pressed="false">Activar ubicación</button><p class="nav-privacy">VenueMap no guarda ni envía tus coordenadas GPS.</p></section>';
    byId('app').append(panel);
    const dock = document.createElement('section'); dock.id = 'route-dock'; dock.hidden = true; dock.setAttribute('aria-label', 'Vista previa del recorrido');
    dock.innerHTML = '<button type="button" id="route-badge" class="route-badge" hidden><strong id="route-badge-label"></strong><span id="route-summary"></span><span class="route-badge-hint">Origen, destino y opciones · Simulación</span></button><button type="button" id="route-start" class="info-action">Iniciar demo ' + svgIcon('chevron') + '</button>';
    byId('app').append(dock);
    const guide = document.createElement('section'); guide.id = 'route-guide'; guide.hidden = true; guide.setAttribute('aria-label', 'Instrucción del recorrido simulado');
    guide.innerHTML = '<div id="guide-symbol" aria-hidden="true">' + svgIcon('route') + '</div><div class="guide-copy" aria-live="polite"><p id="guide-context"></p><h2 id="guide-title"></h2><p id="guide-detail"></p></div><button type="button" id="guide-close" class="icon-btn" aria-label="Salir de la demostración">' + svgIcon('close') + '</button>';
    const guideControls = document.createElement('section'); guideControls.id = 'guide-controls'; guideControls.hidden = true; guideControls.setAttribute('aria-label', 'Controles del recorrido simulado');
    guideControls.innerHTML = '<div class="guide-topline"><button type="button" id="guide-recenter" aria-pressed="true">' + svgIcon('focus') + '<span>Siguiendo recorrido</span></button><button type="button" id="guide-options">Opciones</button></div>' +
      '<div class="guide-playback"><button type="button" id="guide-back" class="icon-btn" aria-label="Paso anterior de la simulación">' + svgIcon('chevron') + '</button><button type="button" id="guide-play" aria-pressed="false">Reproducir</button><button type="button" id="guide-next" class="icon-btn" aria-label="Siguiente paso de la simulación">' + svgIcon('chevron') + '</button></div><p>Recorrido simulado · No es orientación GPS</p>';
    byId('app').append(guide, guideControls);
    const gpsButton = document.createElement('button'); gpsButton.id = 'locate'; gpsButton.className = 'ctl'; gpsButton.type = 'button'; gpsButton.title = 'Mi ubicación'; gpsButton.setAttribute('aria-label', 'Mi ubicación'); gpsButton.setAttribute('aria-pressed', 'false'); gpsButton.innerHTML = svgIcon('locate');
    gpsButton.onclick = () => { setPanel(true, 'gps'); startGPS(); };
    const navButton = document.createElement('button'); navButton.id = 'navigation-toggle'; navButton.className = 'ctl'; navButton.type = 'button'; navButton.title = 'Cómo llegar'; navButton.setAttribute('aria-label', 'Cómo llegar'); navButton.setAttribute('aria-expanded', 'false'); navButton.setAttribute('aria-controls', 'nav-panel'); navButton.innerHTML = svgIcon('route');
    navButton.onclick = () => setPanel(byId('nav-panel').hidden);
    byId('reset').before(gpsButton, navButton);
    initialized = true; showView('route'); populateDestinations(); stopRoute(); renderGPS();

    byId('route-badge').onclick = () => setPanel(true);
    byId('route-start').onclick = startGuidance;
    byId('guide-close').onclick = () => stopGuidance();
    byId('guide-recenter').onclick = recenter;
    byId('guide-options').onclick = () => setPanel(true);
    byId('guide-play').onclick = play;
    byId('guide-next').onclick = () => stepGuidance(1);
    byId('guide-back').onclick = () => stepGuidance(-1);
    byId('nav-close').onclick = () => setPanel(false);
    byId('nav-plan').onclick = () => { if (planRoute()) setPanel(false); };
    byId('nav-view-route').onclick = () => showView('route');
    byId('nav-view-gps').onclick = () => showView('gps');
    byId('gps-toggle').onclick = startGPS;
    byId('nav-play').onclick = play;
    byId('nav-stop').onclick = () => { stopRoute(); byId('nav-plan').focus({preventScroll: true}); };
    for (const id of ['nav-from', 'nav-to']) byId(id).onchange = stopRoute;
    byId('nav-advance').onclick = () => { if (route) { pause(); route.progress = Math.min(1, route.progress + .2); updateProgress(); } };
    byId('nav-progress').oninput = event => { if (route) { pause(); route.progress = Number(event.target.value) / 100; updateProgress(); } };
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || byId('refmodal').open) return;
      if (!byId('nav-panel').hidden) { event.preventDefault(); event.stopImmediatePropagation(); setPanel(false); }
      else if (guidance) { event.preventDefault(); event.stopImmediatePropagation(); stopGuidance(); }
    }, true);
    // Cualquier gesto (app.js llama a onExplore al arrastrar o pellizcar), zoom o tecla de exploración suspende el seguimiento.
    byId('scene').addEventListener('wheel', release, {capture: true, passive: true});
    byId('canvas').addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) release(); }, {capture: true});
    for (const id of ['zoomplus', 'zoomminus', 'reset']) byId(id).addEventListener('click', release, {capture: true});
    document.addEventListener('visibilitychange', () => { if (document.hidden) { pause(); stopGPS(locating ? 'Ubicación pausada al salir de la página. Toca Activar ubicación para continuar.' : null); } });
    window.addEventListener('pagehide', () => { pause(); stopGPS(); });
    reducedMotion.addEventListener('change', () => { pause(); if (route) updateProgress(); });
    if (selected) onSelection(selected);
  }

  return {initialize, onSelection, onDayChanged, beforeRender, findRoute, planRoute, onExplore: release, isGuiding: () => !!guidance, onMapModeExit: () => stopGuidance(false),
    get route() { return route; }};
})();
