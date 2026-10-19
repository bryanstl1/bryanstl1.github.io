'use strict';

// Red peatonal del modelo conceptual de VenueMap, en PÍXELES de los planos oficiales
// (las mismas coordenadas que venue-data.js). NO son coordenadas GPS ni metros.
// Estos tramos son también los caminos que dibuja el modelo 3D: la ruta solo recorre
// lo que se ve como camino. La orientación real queda desactivada hasta sustituir
// esta red por una medición calibrada.
window.VenueNavigationData = Object.freeze({
  schemaVersion: 2,
  kind: 'concept-demo',
  units: 'plan-px',
  calibration: null,
  restrictedPointIds: ['backstage', 'backstage-nova', 'backstage-voyager'],
  // Radio (px del plano) alrededor de cada zona restringida que ningún tramo puede cruzar.
  restrictedRadius: 24,
  days: {
    1: {paths: [
      {w: .9, pts: [[412, 890], [520, 810], [640, 705], [657, 650]]},
      {w: .7, pts: [[150, 628], [255, 636], [336, 608], [392, 612], [425, 645], [470, 645], [525, 632], [565, 642], [612, 655], [657, 650]]},
      {w: .7, pts: [[657, 650], [668, 600], [655, 545], [650, 505], [660, 486], [720, 466], [770, 456]]},
      {w: .6, pts: [[655, 545], [605, 555], [560, 565], [525, 600], [525, 632]]},
      {w: .55, pts: [[560, 565], [512, 535], [510, 500], [525, 475]]},
      {w: .55, pts: [[525, 475], [515, 445], [560, 410], [620, 380], [680, 352], [705, 355], [745, 358], [790, 362], [840, 380], [880, 375], [912, 388], [918, 425], [900, 470]]},
      {w: .5, pts: [[255, 636], [200, 672]]},
    ]},
    2: {paths: [
      {w: 1.15, pts: [[925, 560], [907, 572], [870, 548], [800, 505], [690, 478]]},
      {w: .7, pts: [[690, 478], [600, 505], [480, 540], [340, 590], [300, 600]]},
      {w: .7, pts: [[300, 600], [330, 575], [384, 545], [449, 493], [520, 447], [590, 440], [650, 444], [700, 420], [690, 478]]},
      {w: .5, pts: [[520, 447], [540, 405], [528, 378]]},
      {w: .5, pts: [[700, 420], [730, 385]]},
      {w: .5, pts: [[300, 600], [262, 680], [245, 760], [250, 830], [300, 860], [340, 872], [366, 878]]},
      {w: .6, pts: [[650, 490], [652, 560], [625, 595], [612, 640], [602, 668], [570, 662], [548, 690], [540, 712]]},
      {w: .5, pts: [[652, 560], [700, 592]]},
      {w: .6, pts: [[540, 712], [575, 760], [620, 775], [690, 745], [705, 730]]},
      {w: .6, pts: [[612, 640], [560, 620], [500, 615], [440, 630], [400, 660], [370, 690], [330, 720], [262, 700]]},
      {w: .5, pts: [[330, 720], [355, 760], [350, 800], [340, 850], [340, 872]]},
      {w: .5, pts: [[366, 878], [400, 895], [440, 882]]},
    ]},
  },
});
