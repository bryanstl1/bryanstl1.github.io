'use strict';

window.VenueNavigation = (() => {
  const data = window.VenueNavigationData;
  const byId = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let initialized = false, route = null, animation = null, previousFrame = null;
  let watchId = null, watchToken = 0, locating = false;
  let gpsMessage = 'Activa la ubicación para comprobar la señal de tu teléfono.';
  const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
  const cross = (a,b) => a[0]*b[1]-a[1]*b[0];
  const subtract = (a,b) => [a[0]-b[0],a[1]-b[1]];
  const interpolate = (a,b,t) => [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const restricted = p => data.restrictedPointIds.includes(p.id);

  // Split every walkway at intersections and at the two nearest access points.
  // The shortest path can only traverse these walkway edges, never free space.
  function findRoute(paths, origin, destination) {
    const segments = paths.flatMap(path => path.slice(1).map((b,i) => ({a:path[i],b,cuts:[0,1]})));
    for (let i=0;i<segments.length;i++) for(let j=i+1;j<segments.length;j++) {
      const a=segments[i],b=segments[j],r=subtract(a.b,a.a),s=subtract(b.b,b.a),den=cross(r,s);
      if(Math.abs(den)<1e-8) continue;
      const offset=subtract(b.a,a.a),t=cross(offset,s)/den,u=cross(offset,r)/den;
      if(t>=-1e-7&&t<=1+1e-7&&u>=-1e-7&&u<=1+1e-7) {
        a.cuts.push(Math.max(0,Math.min(1,t)));b.cuts.push(Math.max(0,Math.min(1,u)));
      }
    }
    function attach(point) {
      let best=null;
      for(const segment of segments) {
        const ab=subtract(segment.b,segment.a),ap=subtract(point,segment.a),length=ab[0]*ab[0]+ab[1]*ab[1];
        if(!length) continue;
        const t=Math.max(0,Math.min(1,(ap[0]*ab[0]+ap[1]*ab[1])/length)),position=interpolate(segment.a,segment.b,t),gap=distance(point,position);
        if(!best||gap<best.gap) best={segment,t,position,gap};
      }
      if(best)best.segment.cuts.push(best.t);
      return best;
    }
    const start=attach(origin),finish=attach(destination);
    if(!start||!finish)return null;
    const nodes=new Map(),key=p=>p.map(n=>n.toFixed(4)).join(',');
    function node(point){const id=key(point);if(!nodes.has(id))nodes.set(id,{point,edges:new Map()});return id;}
    for(const segment of segments) {
      const cuts=[...new Set(segment.cuts)].sort((a,b)=>a-b);
      for(let i=1;i<cuts.length;i++) {
        const a=interpolate(segment.a,segment.b,cuts[i-1]),b=interpolate(segment.a,segment.b,cuts[i]),ak=node(a),bk=node(b),length=distance(a,b);
        if(length>1e-6){nodes.get(ak).edges.set(bk,length);nodes.get(bk).edges.set(ak,length);}
      }
    }
    const source=key(start.position),target=key(finish.position),cost=new Map([[source,0]]),parent=new Map(),pending=new Set(nodes.keys());
    while(pending.size) {
      let current=null,best=Infinity;
      for(const id of pending){if((cost.get(id)??Infinity)<best){best=cost.get(id);current=id;}}
      if(current===null)break;
      if(current===target)break;
      pending.delete(current);
      for(const [neighbor,length] of nodes.get(current).edges) {
        const candidate=best+length;
        if(candidate<(cost.get(neighbor)??Infinity)){cost.set(neighbor,candidate);parent.set(neighbor,current);}
      }
    }
    if(!Number.isFinite(cost.get(target)))return null;
    const ids=[target];
    while(ids[0]!==source){const previous=parent.get(ids[0]);if(!previous)return null;ids.unshift(previous);}
    const points=ids.map(id=>nodes.get(id).point),cumulative=[0];
    for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+distance(points[i-1],points[i]));
    return {points,cumulative,total:cumulative.at(-1),start:origin,finish:destination};
  }

  function pause() {
    if(animation!==null)cancelAnimationFrame(animation);
    animation=null;previousFrame=null;
    if(initialized){byId('nav-play').textContent='Reproducir';byId('nav-play').setAttribute('aria-pressed','false');}
  }
  function stopRoute() {
    pause();route=null;
    if(!initialized)return;
    byId('app').classList.remove('has-route');byId('route-overlay').setAttribute('hidden','');
    byId('route-badge').hidden=true;byId('route-progress-section').hidden=true;
    byId('nav-route-status').textContent='Elige dos zonas distintas para ver un recorrido de prueba.';
  }
  function showView(view) {
    byId('nav-panel').dataset.view=view;
    byId('nav-title').textContent=view==='gps'?'Mi ubicación':'Cómo llegar';
    byId('nav-view-route').setAttribute('aria-pressed',String(view==='route'));
    byId('nav-view-gps').setAttribute('aria-pressed',String(view==='gps'));
  }
  function setPanel(open,view='route') {
    byId('nav-panel').hidden=!open;byId('app').classList.toggle('navigation-open',open);
    byId('navigation-toggle').setAttribute('aria-expanded',String(open));
    if(open){showView(view);setBrowsing(false);byId('nav-close').focus({preventScroll:true});}
    else {pause();stopGPS('Ubicación detenida. Puedes volver a activarla cuando quieras.');byId('navigation-toggle').focus({preventScroll:true});}
  }
  function populateDestinations(destinationId) {
    const from=byId('nav-from'),to=byId('nav-to'),points=dayData[day].points.filter(p=>!restricted(p));
    from.replaceChildren();to.replaceChildren();
    for(const select of [from,to])for(const p of points) {
      const option=document.createElement('option');option.value=p.id;option.textContent=p.name;select.append(option);
    }
    const gps=document.createElement('option');gps.value='gps';gps.disabled=true;gps.textContent='Mi ubicación · falta calibrar el plano';from.append(gps);
    from.value=points.find(p=>p.type==='entry')?.id||points[0].id;
    to.value=destinationId&&points.some(p=>p.id===destinationId)?destinationId:(points.find(p=>p.type==='stage')?.id||points[1]?.id||points[0].id);
    byId('nav-day').textContent='Día '+day;
  }
  function planRoute() {
    pause();
    const points=dayData[day].points,from=points.find(p=>p.id===byId('nav-from').value),to=points.find(p=>p.id===byId('nav-to').value);
    stopRoute();
    if(!from||!to||restricted(from)||restricted(to)||from.id===to.id) {
      byId('nav-route-status').textContent='Elige un origen y un destino distintos, de acceso público.';return false;
    }
    const result=findRoute(data.days[day].paths,[from.x,from.z],[to.x,to.z]);
    if(!result||result.total<.01){byId('nav-route-status').textContent='No hay un recorrido de prueba entre estas zonas.';return false;}
    route={...result,originId:from.id,destinationId:to.id,destination:to.name,day,progress:0};
    byId('app').classList.add('has-route');byId('route-overlay').removeAttribute('hidden');byId('route-badge').hidden=false;byId('route-progress-section').hidden=false;
    byId('nav-route-status').textContent='Desde '+from.name+' hasta un punto de referencia próximo a '+to.name+'.';
    cam=defaultCam();fitView();schedule();updateProgress();return true;
  }
  function positionOnRoute() {
    if(!route)return null;
    const travelled=route.total*route.progress;
    for(let i=1;i<route.points.length;i++)if(route.cumulative[i]>=travelled) {
      const length=route.cumulative[i]-route.cumulative[i-1];return interpolate(route.points[i-1],route.points[i],length?(travelled-route.cumulative[i-1])/length:0);
    }
    return route.points.at(-1);
  }
  function updateProgress() {
    if(!route)return;
    const percent=Math.round(route.progress*100);
    byId('nav-progress').value=String(percent);
    byId('nav-progress-label').textContent=percent+'% del recorrido de prueba';
    byId('nav-advance').disabled=route.progress>=1;
    byId('nav-play').disabled=reducedMotion.matches||route.progress>=1;
    byId('nav-instruction').textContent=route.progress>=1?'Fin de la simulación junto a '+route.destination+'.':route.progress===0?'El punto azul representa una persona simulada.':'Sigue la línea azul en esta demostración.';
    byId('route-badge-label').textContent='Simulación · '+route.destination+' · '+percent+'%';
    draw();
  }
  function play() {
    if(animation!==null){pause();return;}
    if(!route||reducedMotion.matches||route.progress>=1)return;
    byId('nav-play').textContent='Pausar';byId('nav-play').setAttribute('aria-pressed','true');
    function step(time) {
      if(!route||document.hidden){pause();return;}
      if(previousFrame!==null)route.progress=Math.min(1,route.progress+Math.min(time-previousFrame,100)/12000);
      previousFrame=time;updateProgress();
      if(route.progress>=1){pause();announce('Fin del recorrido simulado.');return;}
      animation=requestAnimationFrame(step);
    }
    animation=requestAnimationFrame(step);
  }
  function draw() {
    if(!initialized||!route||!mat)return;
    const overlay=byId('route-overlay');overlay.setAttribute('viewBox','0 0 '+viewport[0]+' '+viewport[1]);
    const screen=p=>{const projected=project(mat,[p[0],.7,p[1]]);return projected?[(projected[0]+1)*viewport[0]/2,(1-projected[1])*viewport[1]/2]:null;};
    let path='',previousVisible=false;
    for(const point of route.points){const p=screen(point);if(!p){previousVisible=false;continue;}path+=(previousVisible?' L':' M')+p.map(n=>n.toFixed(2)).join(' ');previousVisible=true;}
    byId('route-outline').setAttribute('d',path);byId('route-line').setAttribute('d',path);
    const point=screen(positionOnRoute());
    byId('route-person').style.display=point?'':'none';
    if(point){byId('route-person').setAttribute('cx',point[0]);byId('route-person').setAttribute('cy',point[1]);}
    const end=screen(route.points.at(-1));byId('route-end').style.display=end?'':'none';
    if(end){byId('route-end').setAttribute('cx',end[0]);byId('route-end').setAttribute('cy',end[1]);}
  }
  function renderGPS() {
    if(!initialized)return;
    byId('gps-status').textContent=gpsMessage;
    byId('gps-toggle').textContent=locating?'Detener ubicación':'Activar ubicación';
    byId('gps-toggle').setAttribute('aria-pressed',String(locating));
    byId('locate').setAttribute('aria-pressed',String(locating));
  }
  function stopGPS(message) {
    watchToken++;
    if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);
    watchId=null;locating=false;
    if(message)gpsMessage=message;
    renderGPS();
  }
  function startGPS() {
    if(locating){stopGPS('Ubicación detenida.');return;}
    if(!window.isSecureContext){gpsMessage='Abre el enlace HTTPS de VenueMap para activar tu ubicación.';renderGPS();return;}
    if(!navigator.geolocation){gpsMessage='Este navegador no ofrece ubicación. Puedes probar el recorrido simulado.';renderGPS();return;}
    locating=true;const token=++watchToken;gpsMessage='Solicitando ubicación… Acepta el permiso del navegador si quieres continuar.';renderGPS();
    try {
      const newWatch=navigator.geolocation.watchPosition(position=>{
        if(token!==watchToken)return;
        const {latitude,longitude,accuracy}=position.coords;
        if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||!Number.isFinite(accuracy)||accuracy<0||!Number.isFinite(position.timestamp)||Date.now()-position.timestamp>15000){gpsMessage='La lectura no es válida o está desactualizada. Esperando una señal reciente…';renderGPS();return;}
        // No coordinates are persisted, logged, transmitted, or projected onto this uncalibrated model.
        gpsMessage='Ubicación recibida · precisión aproximada ±'+Math.ceil(accuracy)+' m. '+(accuracy>50?'La señal es imprecisa. ':'')+'Falta calibrar el plano para mostrarte en el recinto y calcular rutas reales.';
        renderGPS();
      },error=>{
        if(token!==watchToken)return;
        const messages={1:'Permiso de ubicación denegado. Puedes habilitarlo en los ajustes del sitio o usar la simulación.',2:'No se pudo obtener tu ubicación. Intenta de nuevo en un lugar con mejor señal.',3:'La ubicación tardó demasiado. Puedes volver a intentarlo.'};
        stopGPS(messages[error.code]||'No se pudo obtener la ubicación. Puedes volver a intentarlo.');
      },{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
      if(token===watchToken&&locating)watchId=newWatch;else navigator.geolocation.clearWatch(newWatch);
    } catch { stopGPS('El navegador no permitió iniciar la ubicación. Puedes usar la simulación.'); }
  }
  function onSelection(point) {
    if(!initialized)return;
    const button=document.createElement('button');button.type='button';button.id='route-to';button.className='info-secondary';button.innerHTML=svgIcon('route')+'<span>Cómo llegar</span>';
    if(restricted(point)) {
      button.disabled=true;button.title='Área restringida';
      const note=document.createElement('p');note.className='route-restriction';note.textContent='Área restringida: sin recorrido para el público.';byId('infobody').append(note);
    } else button.onclick=()=>{populateDestinations(point.id);setPanel(true);if(planRoute())setPanel(false);};
    byId('infobody').append(button);
  }
  function onDayChanged() {
    if(!initialized)return;
    stopRoute();populateDestinations();
  }
  function initialize() {
    if(initialized)return;
    iconPaths.route='<path d="M5 20V9a4 4 0 0 1 4-4h10m-4-4 4 4-4 4"/><circle cx="5" cy="20" r="2"/>';
    iconPaths.locate='<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>';
    const overlay=document.createElementNS(svgNS,'svg');overlay.id='route-overlay';overlay.setAttribute('aria-hidden','true');overlay.setAttribute('hidden','');
    overlay.innerHTML='<path id="route-outline"/><path id="route-line"/><circle id="route-end" r="6"/><circle id="route-person" r="7"/>';
    byId('scene').insertBefore(overlay,byId('pins'));
    const panel=document.createElement('section');panel.id='nav-panel';panel.className='nav-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','nav-title');
    panel.innerHTML='<header class="nav-panel-head"><h2 id="nav-title">Cómo llegar</h2><button type="button" id="nav-close" class="icon-btn" aria-label="Cerrar navegación">'+svgIcon('close')+'</button></header><div class="nav-view-tabs" role="group" aria-label="Herramientas del mapa"><button type="button" id="nav-view-route" aria-pressed="true">Rutas</button><button type="button" id="nav-view-gps" aria-pressed="false">Mi ubicación</button></div><div id="nav-route-content"><p class="nav-demo-note"><strong>Vista previa de rutas</strong><br>Recorridos simulados. El plano aún no tiene coordenadas verificadas.</p><div class="nav-fields"><label for="nav-from">Desde</label><select id="nav-from"></select><label for="nav-to">Hasta</label><select id="nav-to"></select></div><button type="button" id="nav-plan" class="info-action">Ver ruta de prueba</button><p id="nav-route-status" class="nav-copy" role="status"></p><section id="route-progress-section" hidden aria-label="Simular recorrido"><label id="nav-progress-label" for="nav-progress">0% del recorrido de prueba</label><input id="nav-progress" type="range" min="0" max="100" value="0" aria-label="Avance del recorrido de demostración"><p id="nav-instruction" class="nav-copy"></p><div class="nav-actions"><button type="button" id="nav-play" aria-pressed="false">Reproducir</button><button type="button" id="nav-advance">Avanzar</button></div><button type="button" id="nav-stop" class="text-button">Quitar ruta</button></section></div><section class="nav-gps" aria-label="Ubicación del teléfono"><h3>Mi ubicación <span id="nav-day"></span></h3><p id="gps-status" class="nav-copy" role="status"></p><button type="button" id="gps-toggle" class="info-secondary" aria-pressed="false">Activar ubicación</button><p class="nav-privacy">VenueMap no guarda ni envía tus coordenadas GPS.</p></section>';
    byId('app').append(panel);
    const badge=document.createElement('button');badge.id='route-badge';badge.type='button';badge.hidden=true;badge.className='route-badge';badge.innerHTML='<strong id="route-badge-label"></strong><span>No usar para orientarte en el recinto</span>';badge.onclick=()=>setPanel(true);byId('app').append(badge);
    const gpsButton=document.createElement('button');gpsButton.id='locate';gpsButton.className='ctl';gpsButton.type='button';gpsButton.title='Mi ubicación';gpsButton.setAttribute('aria-label','Mi ubicación');gpsButton.setAttribute('aria-pressed','false');gpsButton.innerHTML=svgIcon('locate');gpsButton.onclick=()=>{setPanel(true,'gps');startGPS();};
    const navButton=document.createElement('button');navButton.id='navigation-toggle';navButton.className='ctl';navButton.type='button';navButton.title='Cómo llegar';navButton.setAttribute('aria-label','Cómo llegar');navButton.setAttribute('aria-expanded','false');navButton.setAttribute('aria-controls','nav-panel');navButton.innerHTML=svgIcon('route');navButton.onclick=()=>setPanel(byId('nav-panel').hidden);
    byId('reset').before(gpsButton,navButton);
    initialized=true;showView('route');populateDestinations();stopRoute();renderGPS();
    byId('nav-close').onclick=()=>setPanel(false);byId('nav-plan').onclick=()=>{if(planRoute())setPanel(false);};byId('nav-view-route').onclick=()=>showView('route');byId('nav-view-gps').onclick=()=>showView('gps');byId('gps-toggle').onclick=startGPS;byId('nav-play').onclick=play;byId('nav-stop').onclick=stopRoute;
    for(const id of ['nav-from','nav-to'])byId(id).onchange=stopRoute;
    byId('nav-advance').onclick=()=>{if(route){pause();route.progress=Math.min(1,route.progress+.2);updateProgress();}};
    byId('nav-progress').oninput=event=>{if(route){pause();route.progress=Number(event.target.value)/100;updateProgress();}};
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!byId('nav-panel').hidden){event.preventDefault();event.stopImmediatePropagation();setPanel(false);}},true);
    document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopGPS('Ubicación pausada al salir de la página. Toca Activar ubicación para continuar.');}});
    window.addEventListener('pagehide',()=>{pause();stopGPS();});
    reducedMotion.addEventListener('change',()=>{pause();if(route)updateProgress();});
    if(selected)onSelection(selected);
  }
  return {initialize,onSelection,onDayChanged,draw,findRoute,suspend:()=>setPanel(false)};
})();
