'use strict';

/* VenueMap FUTUR — modelo 3D del recinto (three.js r128, servido localmente).
   Construye cada día a partir de venue-data.js y navigation-data.js. Dibuja solo
   bajo demanda: no hay bucle de animación continuo. Las sombras se calculan una
   vez por día o por ambiente, porque la geometría es estática. */
window.VenueScene = (() => {
  if (!window.THREE) return {init: () => false, ready: false};
  const COL = {grass: 0x41a03c, sand: 0xd9b77a, path: 0xe89a9a, navy: 0x1d2b6b, navy2: 0x2b3d8c, white: 0xf2f3f7, gray: 0xd8dbe4, gen: 0xf29a3a,
    orange: 0xc8642f, orange2: 0x9e4a22, crane: 0xc4512b, water: 0x2f63d6, pool: 0x5cc0ea, trunk: 0x7a5434, rail: 0x5a6170, deck: 0x2a2f45, truss: 0xb9bfcc};
  const PX = 38; // px del plano por unidad del modelo
  let renderer = null, scene, camera, hemi, sun, mode = 'sun', current = 0, viewport = [1, 1];
  let MAT = {}, waterMat, poolMat, skyMat, lampMat, domeMat;
  const days = {};
  let D = null, G = null, seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // Los colores del diseño están en sRGB; three.js trabaja en lineal y convierte al mostrar.
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const mat = k => MAT[k] || (MAT[k] = new THREE.MeshStandardMaterial({color: lin(COL[k] !== undefined ? COL[k] : k), roughness: .85}));

  function init(canvas) {
    if (!window.THREE) return false;
    try {
      renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, powerPreference: 'high-performance'});
    } catch (error) { console.warn('WebGL no disponible', error); return false; }
    if (!renderer.getContext()) return false;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.outputEncoding = THREE.sRGBEncoding;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, 1, .1, 400);
    hemi = new THREE.HemisphereLight(0xfff1e0, 0x6d7aa8, 1); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0dc, 1); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; scene.add(sun, sun.target);
    waterMat = new THREE.MeshStandardMaterial({color: lin(COL.water), roughness: .15, metalness: .2, transparent: true, opacity: .92});
    poolMat = new THREE.MeshStandardMaterial({color: lin(COL.pool), roughness: .1, metalness: .2});
    skyMat = new THREE.MeshStandardMaterial({color: lin(0x8fa3e8), roughness: .4, emissive: lin(0xbfd0ff), emissiveIntensity: 0});
    lampMat = new THREE.MeshStandardMaterial({color: lin(0xfff2c8), emissive: lin(0xffd27a), emissiveIntensity: .25});
    domeMat = new THREE.MeshStandardMaterial({color: lin(0xe6ebf3), roughness: .22, metalness: .45});
    buildRouteLayer();
    return true;
  }

  /* ---------- coordenadas ---------- */
  function makeMapper(model) {
    const c = model.cal, ax = c.A[0] - c.O[0], ay = c.A[1] - c.O[1], bx = c.B[0] - c.O[0], by = c.B[1] - c.O[1], det = ax * by - ay * bx;
    const la = Math.hypot(ax, ay) / PX, lb = Math.hypot(bx, by) / PX;
    const raw = (px, py) => { const dx = px - c.O[0], dy = py - c.O[1]; return [(dx * by - dy * bx) / det * la, (ax * dy - ay * dx) / det * lb]; };
    let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    model.outline.forEach(p => { const [x, z] = raw(...p); mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mnz = Math.min(mnz, z); mxz = Math.max(mxz, z); });
    const cx = (mnx + mxx) / 2, cz = (mnz + mxz) / 2;
    return {W: (px, py) => { const [x, z] = raw(px, py); return [x - cx, z - cz]; }, ext: [mxx - mnx, mxz - mnz]};
  }
  const mappers = {};
  function toWorld(day, p) {
    if (!mappers[day]) mappers[day] = makeMapper(window.VenueModel[day]);
    return mappers[day].W(p[0], p[1]);
  }

  /* ---------- utilidades de construcción ---------- */
  function inPoly(x, z, poly) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) ins = !ins; } return ins; }
  function circlePoly(x, z, r) { const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; p.push([x + Math.cos(a) * r, z + Math.sin(a) * r]); } return p; }
  function addMesh(m, cast = true, parent = G) { m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; }
  function prism(ptsPx, h, material, y0 = 0) {
    const w = ptsPx.map(p => D.W(...p)); D.blockers.push(w);
    const s = new THREE.Shape(); w.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z));
    const geo = new THREE.ExtrudeGeometry(s, {depth: h, bevelEnabled: false}); geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0);
    return addMesh(new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material), h > .2);
  }
  function segBox(x1, z1, x2, z2, w, h, material, y0 = 0, block = false, cast = false) {
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, h, w), typeof material === 'string' ? mat(material) : material);
    m.position.set((x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2); m.rotation.y = -Math.atan2(dz, dx);
    if (block) { const ux = dx / L, uz = dz / L, nx = -uz * w / 2, nz = ux * w / 2; D.blockers.push([[x1 + nx, z1 + nz], [x2 + nx, z2 + nz], [x2 - nx, z2 - nz], [x1 - nx, z1 - nz]]); }
    return addMesh(m, cast);
  }
  function beam(a, b, t, material, parent = G) { const L = a.distanceTo(b); const m = new THREE.Mesh(new THREE.BoxGeometry(t, t, L), typeof material === 'string' ? mat(material) : material); m.position.copy(a).lerp(b, .5); m.lookAt(b); return addMesh(m, true, parent); }
  function cylinder(x, z, r, h, material, y0 = 0, seg = 20) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, h, seg), typeof material === 'string' ? mat(material) : material); m.position.set(x, y0 + h / 2, z); return addMesh(m); }
  /* ---------- piezas del recinto ---------- */
  function base() {
    const w = D.model.outline.map(p => D.W(...p)); D.outlineW = w;
    const s = new THREE.Shape(); w.forEach(([x, z], i) => i ? s.lineTo(x, -z) : s.moveTo(x, -z));
    const geo = new THREE.ExtrudeGeometry(s, {depth: 1, bevelEnabled: false}); geo.rotateX(-Math.PI / 2); geo.translate(0, -1, 0);
    const m = new THREE.Mesh(geo, [mat('grass'), mat('sand')]); m.receiveShadow = true; G.add(m);
    for (let i = 0; i < w.length; i++) { const a = w[i], b = w[(i + 1) % w.length]; beam(V(a[0], .22, a[1]), V(b[0], .22, b[1]), .05, 'rail'); }
  }
  // Caminos visibles = red peatonal de navegación. La ruta solo recorre lo que se ve como camino.
  function walkways(paths) {
    const disc = new THREE.CircleGeometry(.5, 18); disc.rotateX(-Math.PI / 2);
    for (const path of paths) {
      const pts = path.pts.map(p => D.W(...p)), w = path.w;
      for (let i = 1; i < pts.length; i++) segBox(...pts[i - 1], ...pts[i], w, .055, 'path', .015, true);
      for (const [x, z] of pts) { const j = new THREE.Mesh(disc, mat('path')); j.scale.setScalar(w); j.position.set(x, .071, z); addMesh(j, false); }
    }
  }
  function hall(ptsPx, h, label) {
    const w = ptsPx.map(p => D.W(...p)); D.blockers.push(w);
    const e01 = Math.hypot(w[1][0] - w[0][0], w[1][1] - w[0][1]), e12 = Math.hypot(w[2][0] - w[1][0], w[2][1] - w[1][1]);
    const e32 = Math.hypot(w[2][0] - w[3][0], w[2][1] - w[3][1]), e03 = Math.hypot(w[3][0] - w[0][0], w[3][1] - w[0][1]);
    const along = e01 + e32 > e12 + e03, L = (along ? e01 + e32 : e12 + e03) / 2, Wd = (along ? e12 + e03 : e01 + e32) / 2;
    const ax = along ? (w[1][0] - w[0][0] + w[2][0] - w[3][0]) : (w[2][0] - w[1][0] + w[3][0] - w[0][0]);
    const az = along ? (w[1][1] - w[0][1] + w[2][1] - w[3][1]) : (w[2][1] - w[1][1] + w[3][1] - w[0][1]);
    const cx = (w[0][0] + w[1][0] + w[2][0] + w[3][0]) / 4, cz = (w[0][1] + w[1][1] + w[2][1] + w[3][1]) / 4;
    const grp = new THREE.Group(); grp.position.set(cx, 0, cz); grp.rotation.y = -Math.atan2(az, ax); G.add(grp);
    const box = (sx, sy, sz, m, x, y, z, cast = true) => { const me = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z); return addMesh(me, cast, grp); };
    box(L, h, Wd, 'navy', 0, h / 2, 0);
    const bays = Math.max(3, Math.round(L / .7));
    for (let i = 0; i <= bays; i++) { const x = -L / 2 + i * L / bays; for (const s of [-1, 1]) box(.08, h, .06, 'navy2', x, h / 2, s * (Wd / 2 + .02), false); }
    for (const s of [-1, 1]) box(L * .94, h * .16, .03, skyMat, 0, h * .72, s * (Wd / 2 + .03), false);
    const rise = Math.min(.55, Wd * .22), sh = new THREE.Shape(); sh.moveTo(-Wd / 2 - .08, 0); sh.lineTo(Wd / 2 + .08, 0); sh.lineTo(0, rise); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, {depth: L + .16, bevelEnabled: false}); rg.translate(0, 0, -(L + .16) / 2); rg.rotateY(Math.PI / 2);
    const roof = addMesh(new THREE.Mesh(rg, mat('navy2')), true, grp); roof.position.y = h;
    const mw = Wd * .26, mh = rise * .75; box(L * .86, mh, mw, 'navy', 0, h + rise * .62 + mh / 2, 0);
    for (const s of [-1, 1]) box(L * .82, mh * .6, .03, skyMat, 0, h + rise * .62 + mh / 2, s * (mw / 2 + .02), false);
    box(L * .9, .05, mw + .2, 'navy2', 0, h + rise * .62 + mh + .03, 0);
    for (const s of [-1, 1]) box(.03, h * .7, Wd * .32, skyMat, s * (L / 2 + .02), h * .35, 0, false);
  }
  function horno(hn) {
    const [fx, fz] = D.W(...hn.furnace); D.blockers.push(circlePoly(fx, fz, 1.2));
    const rust = 'orange', dark = 'orange2', blk = 0x1b1d24;
    cylinder(fx, fz, .75, .5, dark);
    const body = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(.55, .72, 2.2, 20), mat(rust))); body.position.set(fx, 1.6, fz);
    const stack = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(.42, .55, 1.6, 18), mat(rust))); stack.position.set(fx, 3.5, fz);
    const top = addMesh(new THREE.Mesh(new THREE.ConeGeometry(.45, .7, 16), mat(dark))); top.position.set(fx, 4.65, fz);
    for (let y = 1; y < 4.2; y += .6) cylinder(fx, fz, .7 - (y > 2.7 ? .15 : 0), .06, dark, y);
    const s = 1.0, H = 5.4;
    for (const [dx, dz] of [[-s, -s], [s, -s], [s, s], [-s, s]]) beam(V(fx + dx, 0, fz + dz), V(fx + dx * .75, H, fz + dz * .75), .09, dark);
    for (const y of [1.3, 2.6, 3.8, 5.0]) {
      const k = 1 - (y / H) * .25; const c = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([dx, dz]) => V(fx + dx * k, y, fz + dz * k));
      for (let i = 0; i < 4; i++) beam(c[i], c[(i + 1) % 4], .06, dark);
      const pl = addMesh(new THREE.Mesh(new THREE.BoxGeometry(2 * s * k + .1, .04, .35), mat(blk))); pl.position.set(fx, y, fz + s * k);
    }
    const [dx2, dz2] = D.W(...hn.dust); beam(V(fx, 4.9, fz), V(fx + (dx2 - fx) * .5, 5.3, fz + (dz2 - fz) * .5), .22, dark);
    beam(V(fx + (dx2 - fx) * .5, 5.3, fz + (dz2 - fz) * .5), V(dx2, 3.3, dz2), .22, dark);
    cylinder(dx2, dz2, .42, 1.8, rust, 1.2); const dc = addMesh(new THREE.Mesh(new THREE.ConeGeometry(.42, .9, 14), mat(dark))); dc.position.set(dx2, .75, dz2); dc.rotation.x = Math.PI;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(V(dx2 + a * .3, 0, dz2 + b * .3), V(dx2 + a * .3, 1.25, dz2 + b * .3), .06, dark);
    D.blockers.push(circlePoly(dx2, dz2, .6));
    const [sx, sz] = D.W(...hn.skip); const p0 = V(sx, 0, sz), p1 = V(fx, 4.8, fz); const dir = p1.clone().sub(p0); const n = V(-dir.z, 0, dir.x).normalize().multiplyScalar(.22);
    beam(p0.clone().add(n), p1.clone().add(n), .08, blk); beam(p0.clone().sub(n), p1.clone().sub(n), .08, blk);
    for (let i = 1; i < 10; i++) { const q = p0.clone().lerp(p1, i / 10); beam(q.clone().add(n), q.clone().sub(n), .04, blk); beam(V(q.x, 0, q.z).add(n.clone().multiplyScalar(.6)), q.clone().add(n.clone().multiplyScalar(.6)), .04, dark); }
    const cab = addMesh(new THREE.Mesh(new THREE.BoxGeometry(.4, .35, .4), mat(0xe8eaf0))); cab.position.copy(p0.clone().lerp(p1, .55)).add(V(0, .25, 0));
    segBox(sx, sz, fx, fz, .6, .02, 'gray', 0, true, false);
    hn.stoves.forEach(([px, py, r, h]) => {
      const [x, z] = D.W(px, py); D.blockers.push(circlePoly(x, z, r + .15));
      cylinder(x, z, r * 1.15, .3, dark); cylinder(x, z, r, h, rust);
      const cap = addMesh(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, 6.283, 0, Math.PI / 2), mat(dark))); cap.position.set(x, h, z);
      for (let y = .7; y < h - .3; y += .7) cylinder(x, z, r * 1.05, .05, dark, y);
      beam(V(x, 1.1, z), V(fx, 1.3, fz), .16, dark); beam(V(x + r * .95, .3, z), V(x + r * .95, h, z), .035, blk);
    });
    const [cx, cz] = D.W(...hn.chimney); D.blockers.push(circlePoly(cx, cz, .4));
    cylinder(cx, cz, .32, .4, dark); const ch = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(.16, .24, 5.6, 14), mat(rust))); ch.position.set(cx, 3.2, cz);
    for (let y = 1.2; y < 5.8; y += .9) cylinder(cx, cz, .24 - (y / 6) * .07, .05, dark, y);
    const [gx, gz] = D.W(...hn.gallery.at), gr = hn.gallery.r; D.blockers.push(circlePoly(gx, gz, gr + .5));
    cylinder(gx, gz, gr, .55, blk, 0, 28);
    const facet = addMesh(new THREE.Mesh(new THREE.ConeGeometry(gr * 1.04, .42, 9), new THREE.MeshStandardMaterial({color: lin(0x2a2d36), roughness: .35, metalness: .6, flatShading: true}))); facet.position.set(gx, .76, gz);
    const berm = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(gr + .15, gr + .55, .35, 28, 1, true), mat('grass')), false); berm.position.set(gx, .17, gz);
  }
  function crane(c) {
    const [ax, az] = D.W(...c.a), [bx, bz] = D.W(...c.b); const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const h = c.h, w = c.w;
    for (const [ex, ez] of [[ax, az], [bx, bz]]) {
      const top = V(ex, h, ez); const l1 = V(ex + nx * w, 0, ez + nz * w), l2 = V(ex - nx * w, 0, ez - nz * w);
      beam(l1, top, .13, 'crane'); beam(l2, top, .13, 'crane');
      beam(V(ex + nx * w * .55, h * .45, ez + nz * w * .55), V(ex - nx * w * .55, h * .45, ez - nz * w * .55), .08, 'crane');
    }
    const over = 1.2, gap = .32, dH = .55;
    for (const sgn of [-1, 1]) {
      const ox = nx * gap * sgn, oz = nz * gap * sgn;
      const p1 = V(ax - ux * over + ox, h, az - uz * over + oz), p2 = V(bx + ux * over + ox, h, bz + uz * over + oz);
      const q1 = V(p1.x, h + dH, p1.z).addScaledVector(V(ux, 0, uz), .5), q2 = V(p2.x, h + dH, p2.z).addScaledVector(V(ux, 0, uz), -.5);
      beam(p1, p2, .12, 'crane'); beam(q1, q2, .09, 'crane'); beam(p1, q1, .07, 'crane'); beam(p2, q2, .07, 'crane');
      const N = 10; for (let i = 0; i < N; i++) { const a = q1.clone().lerp(q2, i / N), b = q1.clone().lerp(q2, (i + 1) / N); const la = p1.clone().lerp(p2, (i + .5) / N); beam(V(a.x, h + dH, a.z), la, .04, 'crane'); beam(la, V(b.x, h + dH, b.z), .04, 'crane'); }
    }
    const mx = (ax + bx) / 2 + ux * .6, mz = (az + bz) / 2 + uz * .6;
    const tro = new THREE.Mesh(new THREE.BoxGeometry(.7, .3, .95), mat('crane')); tro.position.set(mx, h + .72, mz); tro.rotation.y = -Math.atan2(uz, ux); addMesh(tro);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(.45, .42, .4), mat(0xf2f3f7)); cab.position.set(mx + ux * .4, h - .3, mz + uz * .4); addMesh(cab);
    beam(V(mx, h + .6, mz), V(mx, 1.1, mz), .025, 'rail'); const hook = addMesh(new THREE.Mesh(new THREE.BoxGeometry(.22, .2, .22), mat(0x30343f))); hook.position.set(mx, 1.0, mz);
    for (const sgn of [-1, 1]) segBox(ax - ux * 1.4 + nx * w * sgn, az - uz * 1.4 + nz * w * sgn, bx + ux * 1.4 + nx * w * sgn, bz + uz * 1.4 + nz * w * sgn, .07, .05, 'rail', 0, false, false);
  }
  function dome(d) {
    const [x, z] = D.W(...d.at); D.blockers.push(circlePoly(x, z, d.r + .1));
    const m = addMesh(new THREE.Mesh(new THREE.SphereGeometry(d.r, 36, 18, 0, 6.283, 0, Math.PI / 2), domeMat)); m.position.set(x, 0, z);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(d.r * 1.005, 2)), new THREE.LineBasicMaterial({color: 0xffffff, transparent: true, opacity: .45}));
    e.position.set(x, 0, z); G.add(e);
    const ring = addMesh(new THREE.Mesh(new THREE.CylinderGeometry(d.r * 1.08, d.r * 1.08, .12, 36), mat('gray')), false); ring.position.set(x, .06, z);
  }
  function tables(t) {
    const [x0, z0] = D.W(...t.from);
    for (let i = 0; i < t.cols; i++) for (let j = 0; j < t.rows; j++) {
      const x = x0 + i * t.step[0], z = z0 + j * t.step[1]; cylinder(x, z, .13, .04, 'gen', .28, 10); cylinder(x, z, .025, .28, 'rail', 0, 6);
      const um = addMesh(new THREE.Mesh(new THREE.ConeGeometry(.2, .1, 8), mat('white'))); um.position.set(x, .62, z); cylinder(x, z, .012, .3, 'rail', .32, 4);
      D.blockers.push(circlePoly(x, z, .2));
    }
  }
  function gate(gt) { const [ax, az] = D.W(...gt.a), [bx, bz] = D.W(...gt.b); beam(V(ax, 0, az), V(ax, 1.5, az), .12, 'white'); beam(V(bx, 0, bz), V(bx, 1.5, bz), .12, 'white'); beam(V(ax, 1.5, az), V(bx, 1.5, bz), .16, 'white'); }
  function arch(a) { const [ax, az] = D.W(...a.a), [bx, bz] = D.W(...a.b); const r = Math.hypot(bx - ax, bz - az) / 2; const m = addMesh(new THREE.Mesh(new THREE.TorusGeometry(r, .09, 10, 30, Math.PI), mat(0x3a5bd8))); m.position.set((ax + bx) / 2, 0, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax); }
  function flagpole([px, py]) { const [x, z] = D.W(px, py); beam(V(x, 0, z), V(x, 1.9, z), .05, 'rail'); const f = addMesh(new THREE.Mesh(new THREE.BoxGeometry(.7, .42, .02), mat(0x1d2b6b))); f.position.set(x + .36, 1.65, z); }
  const beamGeo = () => { const g = new THREE.CylinderGeometry(.3, .025, 6, 14, 1, true); g.translate(0, 3, 0); return g; };
  let lightGeo = null;
  function stageRig(s) {
    const [x, z] = D.W(...s.at), [fx, fz] = D.W(...s.face), k = s.scale || 1; D.blockers.push(circlePoly(x, z, 1.5 * k));
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = Math.atan2(fx - x, fz - z); grp.scale.setScalar(k); G.add(grp);
    const add = (geo, m, px, py, pz) => { const me = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m); me.position.set(px, py, pz); return addMesh(me, true, grp); };
    add(new THREE.BoxGeometry(2.5, .38, 1.6), 'deck', 0, .19, 0);
    add(new THREE.BoxGeometry(2.7, .08, .5), 'deck', 0, .04, 1.05);
    const scr = new THREE.MeshStandardMaterial({color: lin(0x10142a), emissive: lin(s.color), emissiveIntensity: .55, roughness: .4});
    add(new THREE.BoxGeometry(2.1, 1.15, .08), scr, 0, 1.05, -.66);
    for (const sx of [-1.2, 1.2]) for (const sz of [-.75, .65]) beam(V(sx, .38, sz), V(sx, 2.35, sz), .09, 'truss', grp);
    for (const sz of [-.75, .65]) beam(V(-1.2, 2.35, sz), V(1.2, 2.35, sz), .1, 'truss', grp);
    for (const sx of [-1.2, 1.2]) beam(V(sx, 2.35, -.75), V(sx, 2.35, .65), .1, 'truss', grp);
    for (const sx of [-1.5, 1.5]) { add(new THREE.BoxGeometry(.36, 1.15, .36), 0x15171f, sx, .58, .62); add(new THREE.BoxGeometry(.3, .5, .3), 0x15171f, sx, 2.0, .65); }
    for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(.12, .12, .16), 0x30343f, -.9 + i * .45, 2.24, .65);
    // Haces de luz estáticos: no hay animación continua del mapa.
    lightGeo = lightGeo || beamGeo();
    const bm = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide});
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(lightGeo, bm); b.position.set(-.9 + i * .6, 2.35, -.75); b.rotation.z = (i - 1.5) * .18; b.rotation.x = -.12; grp.add(b); }
    const pl = new THREE.PointLight(s.color, 0, 11, 2); pl.position.set(0, 1.8, 1.6); grp.add(pl);
    D.rigs.push({scr, bm, pl, color: s.color});
  }
  const foliageGeo = new THREE.IcosahedronGeometry(1, 1);
  function forest() {
    const greens = [0x2e8935, 0x3c9a3c, 0x4aa844, 0x2a7a32, 0x56b04a].map(lin);
    const pinks = [0xf0b4cf, 0xe79bbd, 0xf6c6da].map(lin);
    const pts = [];
    for (const [px, py, rpx, n, kind] of D.model.trees) {
      const [cx, cz] = D.W(px, py), R = rpx / PX * 1.25; let made = 0, tries = 0;
      while (made < n && tries < n * 6) {
        tries++; const a = rnd() * 6.283, rr = Math.sqrt(rnd()) * R, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
        if (!inPoly(x, z, D.outlineW) || D.blockers.some(b => inPoly(x, z, b))) continue;
        if (pts.some(p => Math.hypot(p.x - x, p.z - z) < .32)) continue; pts.push({x, z, s: .3 + rnd() * .24, kind}); made++;
      }
    }
    const n = pts.length, fm = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .9, flatShading: true});
    const fol = new THREE.InstancedMesh(foliageGeo, fm, n * 2), tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(.05, .08, .45, 6), mat('trunk'), n);
    const o = new THREE.Object3D(); let k = 0;
    pts.forEach((p, i) => {
      o.position.set(p.x, .22, p.z); o.scale.set(1, 1, 1); o.rotation.set(0, 0, 0); o.updateMatrix(); tr.setMatrixAt(i, o.matrix);
      const pal = p.kind === 'blossom' ? pinks : greens;
      o.position.set(p.x, .42 + p.s, p.z); o.scale.set(p.s, p.s * 1.05, p.s); o.rotation.set(rnd(), rnd(), rnd()); o.updateMatrix(); fol.setMatrixAt(k, o.matrix); fol.setColorAt(k++, pal[i % pal.length]);
      const s2 = p.s * .68; o.position.set(p.x + (rnd() - .5) * .2, .5 + p.s * 1.6, p.z + (rnd() - .5) * .2); o.scale.set(s2, s2, s2); o.updateMatrix(); fol.setMatrixAt(k, o.matrix); fol.setColorAt(k++, pal[(i + 2) % pal.length]);
    });
    fol.count = k; if (fol.instanceColor) fol.instanceColor.needsUpdate = true; fol.castShadow = tr.castShadow = true; fol.receiveShadow = true; G.add(fol, tr);
  }
  function lamps() {
    const pos = [];
    for (const line of D.model.lampLines) {
      const w = line.map(p => D.W(...p));
      for (let i = 1; i < w.length; i++) { const [x1, z1] = w[i - 1], [x2, z2] = w[i], L = Math.hypot(x2 - x1, z2 - z1), nx = -(z2 - z1) / L, nz = (x2 - x1) / L; for (let d = .6; d < L; d += 1.5) { const t = d / L; pos.push([x1 + (x2 - x1) * t + nx * .62, z1 + (z2 - z1) * t + nz * .62]); } }
    }
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(.025, .03, .9, 5), mat('rail'), pos.length);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 10, 8), lampMat, pos.length); const o = new THREE.Object3D();
    pos.forEach(([x, z], i) => { o.position.set(x, .45, z); o.updateMatrix(); post.setMatrixAt(i, o.matrix); o.position.set(x, .95, z); o.updateMatrix(); head.setMatrixAt(i, o.matrix); });
    post.castShadow = true; G.add(post, head);
  }
  // Ancla de cada zona: un trazo fino desde el suelo hasta su marcador HTML.
  const stemMat = () => new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: .75, depthWrite: false});
  function anchors(points) {
    const dot = new THREE.CircleGeometry(.13, 16); dot.rotateX(-Math.PI / 2);
    for (const p of points) {
      const [x, z] = D.W(...p.at), h = p.h || 2.1;
      const grp = new THREE.Group(); grp.position.set(x, 0, z);
      const line = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, h - .45, 4), stemMat()); line.position.y = (h - .45) / 2;
      const base = new THREE.Mesh(dot, stemMat()); base.position.y = .09;
      grp.add(line, base); G.add(grp); D.stems.set(p.id, grp);
    }
  }

  function build(day) {
    const model = window.VenueModel[day];
    if (!mappers[day]) mappers[day] = makeMapper(model);
    D = {model, W: mappers[day].W, ext: mappers[day].ext, blockers: [], rigs: [], stems: new Map()};
    G = new THREE.Group(); seed = day * 101 + 7;
    base();
    (model.plazas || []).forEach(([p, c, h]) => prism(p, h, c));
    walkways(window.VenueNavigationData.days[day].paths);
    (model.water || []).forEach(p => prism(p, .08, poolMat));
    (model.canals || []).forEach(([p, w]) => { const w3 = p.map(q => D.W(...q)); for (let i = 1; i < w3.length; i++) segBox(...w3[i - 1], ...w3[i], w, .09, waterMat, 0, true); });
    (model.halls || []).forEach(([p, h, l]) => hall(p, h, l));
    (model.blocks || []).forEach(([p, h, c]) => prism(p, h, c));
    (model.tanks || []).forEach(([px, py, r, h]) => { const [x, z] = D.W(px, py); cylinder(x, z, r, h, 'navy'); D.blockers.push(circlePoly(x, z, r + .1)); });
    if (model.horno) horno(model.horno);
    if (model.crane) crane(model.crane);
    if (model.dome) dome(model.dome);
    (model.tables || []).forEach(tables);
    (model.towers || []).forEach(([px, py, r, h]) => { const [x, z] = D.W(px, py); cylinder(x, z, r, h, 'orange'); cylinder(x, z, r * 1.6, .1, 'orange2', h); });
    (model.gates || []).forEach(gate); (model.arches || []).forEach(arch); (model.flags || []).forEach(flagpole);
    (model.stages || []).forEach(stageRig);
    // Los rótulos de edificios se dibujan como etiquetas HTML para que no tapen los marcadores.
    const landmarks = (model.landmarks || []).map(([text, at, y]) => { const [x, z] = D.W(...at); return {text, position: [x, y, z]}; });
    lamps(); forest(); anchors(window.VenueDays[day].points);
    G.visible = false; scene.add(G);
    // Esquinas del volumen para encuadrar la cámara.
    const corners = [];
    for (const [x, z] of D.outlineW) corners.push(V(x, -1, z), V(x, 3.2, z));
    days[day] = {group: G, rigs: D.rigs, stems: D.stems, ext: D.ext, corners, outline: D.outlineW, landmarks};
  }

  function setDay(day) {
    if (!renderer) return;
    if (!days[day]) build(day);
    for (const k in days) days[k].group.visible = false;
    days[day].group.visible = true; current = day;
    const e = days[day].ext, r = Math.max(e[0], e[1]) * .62;
    Object.assign(sun.shadow.camera, {left: -r, right: r, top: r, bottom: -r, near: 1, far: 90}); sun.shadow.camera.updateProjectionMatrix();
    clearRoute(); applyMode();
  }
  function applyMode() {
    const night = mode === 'night';
    hemi.color.set(night ? 0x5866a8 : 0xfff1e0); hemi.groundColor.set(night ? 0x141a35 : 0x6d7aa8); hemi.intensity = night ? .5 : 1;
    sun.color.set(night ? 0x9fb4ff : 0xfff0dc); sun.intensity = night ? .45 : 1.35; sun.position.set(night ? 12 : -14, 22, night ? -8 : 10);
    lampMat.emissiveIntensity = night ? 2.2 : .25; skyMat.emissiveIntensity = night ? .9 : 0;
    for (const k in days) days[k].rigs.forEach(r => { r.scr.emissiveIntensity = night ? 1.8 : .55; r.pl.intensity = night ? 2.2 : 0; r.bm.color.copy(night ? lin(r.color) : lin(0xffffff)); r.bm.opacity = night ? .3 : .1; });
    if (renderer) renderer.shadowMap.needsUpdate = true;
  }
  function setMode(m) { mode = m === 'night' ? 'night' : 'sun'; if (renderer) applyMode(); }

  /* ---------- cámara y proyección ---------- */
  function setSize(w, h) {
    if (!renderer) return;
    viewport = [w, h];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix();
  }
  function placeCamera(cam) {
    const t = cam.target;
    camera.position.set(t[0] + cam.dist * Math.cos(cam.el) * Math.sin(cam.az), t[1] + cam.dist * Math.sin(cam.el), t[2] + cam.dist * Math.cos(cam.el) * Math.cos(cam.az));
    camera.up.set(0, 1, 0); camera.lookAt(t[0], t[1], t[2]); camera.updateMatrixWorld();
    camera.near = Math.max(.1, cam.dist * .02); camera.far = cam.dist * 4 + 60; camera.updateProjectionMatrix();
  }
  function render(cam) {
    if (!renderer || !current) return;
    placeCamera(cam); renderer.render(scene, camera);
  }
  const tmp = new THREE.Vector3(), camSpace = new THREE.Vector3();
  // Devuelve coordenadas de pantalla (px CSS) o null si el punto queda detrás de la cámara.
  function project(p) {
    tmp.set(p[0], p[1], p[2]);
    camSpace.copy(tmp).applyMatrix4(camera.matrixWorldInverse);
    if (camSpace.z > -camera.near) return null;
    tmp.project(camera);
    return [(tmp.x + 1) / 2 * viewport[0], (1 - tmp.y) / 2 * viewport[1], -camSpace.z];
  }
  // Extensión del modelo en coordenadas normalizadas para una cámara candidata.
  function extentFor(cam, day = current) {
    placeCamera(cam);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of days[day].corners) {
      camSpace.copy(c).applyMatrix4(camera.matrixWorldInverse);
      if (camSpace.z > -camera.near) return {extent: Infinity};
      tmp.copy(c).project(camera);
      minX = Math.min(minX, tmp.x); maxX = Math.max(maxX, tmp.x); minY = Math.min(minY, tmp.y); maxY = Math.max(maxY, tmp.y);
    }
    return {minX, maxX, minY, maxY, extentX: Math.max(-minX, maxX), extentY: Math.max(-minY, maxY), x: (minX + maxX) / 2, y: (minY + maxY) / 2};
  }
  function cameraBasis(cam) {
    placeCamera(cam);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    return {right: right.toArray(), up: up.toArray(), halfHeight: Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), aspect: camera.aspect};
  }
  function setStems(visible, selectedId) {
    const d = days[current]; if (!d) return;
    for (const [id, grp] of d.stems) { grp.visible = visible(id); grp.children.forEach(m => { m.material.opacity = id === selectedId ? 1 : .75; m.material.color.copy(id === selectedId ? lin(0xffc48a) : lin(0xffffff)); }); }
  }

  /* ---------- capa de ruta: línea, destino, persona simulada y flecha ---------- */
  let routeGroup, routeOutline, routeLine, routeEnd, walkerDot, walkerArrow;
  function overlayMat(color, opacity = 1) { return new THREE.MeshBasicMaterial({color: lin(color), transparent: true, opacity, depthTest: false, depthWrite: false, side: THREE.DoubleSide}); }
  function buildRouteLayer() {
    routeGroup = new THREE.Group(); routeGroup.visible = false; scene.add(routeGroup);
    const endGeo = new THREE.RingGeometry(.2, .34, 32); endGeo.rotateX(-Math.PI / 2);
    const endFill = new THREE.CircleGeometry(.2, 32); endFill.rotateX(-Math.PI / 2);
    routeEnd = new THREE.Group();
    const ring = new THREE.Mesh(endGeo, overlayMat(0x167fdc)), fill = new THREE.Mesh(endFill, overlayMat(0xffffff));
    ring.renderOrder = fill.renderOrder = 23; routeEnd.add(fill, ring); routeEnd.position.y = .2; routeGroup.add(routeEnd);
    const dotGeo = new THREE.CircleGeometry(.24, 32); dotGeo.rotateX(-Math.PI / 2);
    const dotRim = new THREE.CircleGeometry(.34, 32); dotRim.rotateX(-Math.PI / 2);
    walkerDot = new THREE.Group();
    const rim = new THREE.Mesh(dotRim, overlayMat(0xffffff)), core = new THREE.Mesh(dotGeo, overlayMat(0x167fdc));
    rim.renderOrder = 24; core.renderOrder = 25; walkerDot.add(rim, core); routeGroup.add(walkerDot);
    // Flecha de navegación apoyada en el camino, apuntando en el sentido del recorrido (+Z local).
    const shape = new THREE.Shape(); shape.moveTo(0, .55); shape.lineTo(.38, -.38); shape.lineTo(0, -.18); shape.lineTo(-.38, -.38); shape.closePath();
    const arrowGeo = new THREE.ShapeGeometry(shape); arrowGeo.rotateX(-Math.PI / 2); arrowGeo.rotateY(Math.PI);
    const outlineShape = new THREE.Shape(); outlineShape.moveTo(0, .72); outlineShape.lineTo(.52, -.5); outlineShape.lineTo(0, -.28); outlineShape.lineTo(-.52, -.5); outlineShape.closePath();
    const outlineGeo = new THREE.ShapeGeometry(outlineShape); outlineGeo.rotateX(-Math.PI / 2); outlineGeo.rotateY(Math.PI);
    walkerArrow = new THREE.Group();
    const aOut = new THREE.Mesh(outlineGeo, overlayMat(0xffffff)), aIn = new THREE.Mesh(arrowGeo, overlayMat(0x167fdc));
    aOut.renderOrder = 26; aIn.renderOrder = 27; walkerArrow.add(aOut, aIn); routeGroup.add(walkerArrow);
  }
  function ribbon(points, width, y) {
    const pos = [], idx = [];
    const disc = 10;
    for (let i = 1; i < points.length; i++) {
      const [x1, z1] = points[i - 1], [x2, z2] = points[i], L = Math.hypot(x2 - x1, z2 - z1) || 1, nx = -(z2 - z1) / L * width / 2, nz = (x2 - x1) / L * width / 2, b = pos.length / 3;
      pos.push(x1 + nx, y, z1 + nz, x2 + nx, y, z2 + nz, x2 - nx, y, z2 - nz, x1 - nx, y, z1 - nz);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    for (const [x, z] of points) { // juntas redondeadas
      const c = pos.length / 3; pos.push(x, y, z);
      for (let k = 0; k <= disc; k++) { const a = k / disc * Math.PI * 2; pos.push(x + Math.cos(a) * width / 2, y, z + Math.sin(a) * width / 2); }
      for (let k = 1; k <= disc; k++) idx.push(c, c + k + 1, c + k);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
  }
  function setRoute(points) {
    if (routeOutline) { routeGroup.remove(routeOutline, routeLine); routeOutline.geometry.dispose(); routeLine.geometry.dispose(); routeOutline = routeLine = null; }
    if (!points || points.length < 2) { routeGroup.visible = false; return; }
    routeOutline = new THREE.Mesh(ribbon(points, .5, .16), overlayMat(0xf4f8ff)); routeOutline.renderOrder = 20;
    routeLine = new THREE.Mesh(ribbon(points, .26, .17), overlayMat(0x208fe9)); routeLine.renderOrder = 21;
    routeGroup.add(routeOutline, routeLine);
    const end = points[points.length - 1]; routeEnd.position.set(end[0], .2, end[1]);
    routeGroup.visible = true;
  }
  function setWalker(state) {
    if (!state) { walkerDot.visible = walkerArrow.visible = false; return; }
    const [x, z] = state.position;
    walkerDot.visible = !state.arrow; walkerArrow.visible = !!state.arrow;
    walkerDot.position.set(x, .22, z); walkerArrow.position.set(x, .24, z);
    if (state.direction) walkerArrow.rotation.y = Math.atan2(state.direction[0], state.direction[1]);
  }
  function clearRoute() { setRoute(null); setWalker(null); }

  const landmarks = day => days[day]?.landmarks || [];
  // Estado de la capa de ruta, útil para comprobar la demostración sin leer píxeles.
  const inspect = () => ({route: !!routeGroup?.visible, segments: routeLine ? routeLine.geometry.index.count / 3 : 0, arrow: !!walkerArrow?.visible && !!routeGroup?.visible, dot: !!walkerDot?.visible && !!routeGroup?.visible, walker: walkerArrow ? [walkerArrow.position.x, walkerArrow.position.z] : null, heading: walkerArrow ? walkerArrow.rotation.y : 0});
  return {init, setDay, landmarks, inspect, setMode, setSize, render, project, extentFor, cameraBasis, toWorld, setStems, setRoute, setWalker, clearRoute,
    get ready() { return !!renderer; }, get mode() { return mode; }};
})();
