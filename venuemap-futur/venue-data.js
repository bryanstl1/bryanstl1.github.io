'use strict';

/* VenueMap FUTUR — datos del recinto.
   Todas las posiciones están en PÍXELES de los planos oficiales del festival
   (Día 1: 1206 × 1494, Día 2: 1206 × 1509). `cal` toma tres esquinas del terreno
   (O, A, B) para convertir el plano isométrico en coordenadas del modelo 3D.
   Son coordenadas de una reconstrucción conceptual: NO son GPS ni metros. */
window.VenueModel = Object.freeze({
  1: {
    cal: {O: [745, 275], A: [1165, 515], B: [40, 690]},
    outline: [[745, 275], [1165, 515], [1120, 545], [430, 932], [150, 760], [40, 690], [150, 628]],
    plazas: [ // [polígono, color, alto]
      [[[255, 640], [760, 335], [985, 455], [455, 760]], 'gray', .06],
      [[[85, 672], [205, 600], [320, 672], [195, 745]], 'path', .05],
      [[[488, 422], [648, 328], [712, 372], [548, 462]], 'path', .07],
      [[[880, 398], [930, 380], [962, 405], [912, 424]], 'path', .05],
      [[[640, 700], [700, 668], [790, 720], [730, 752]], 'path', .05],
    ],
    halls: [ // naves con techo a dos aguas: [polígono, alto, rótulo]
      [[[195, 690], [290, 635], [345, 665], [250, 725]], .85],
      [[[222, 735], [330, 668], [470, 738], [358, 805]], 1.0, 'NAVE LEWIS'],
    ],
    blocks: [ // [polígono, alto, color]
      [[[680, 540], [842, 470], [872, 500], [712, 575]], .45, 'navy'],
      [[[622, 462], [790, 400], [800, 412], [634, 475]], .4, 'navy'],
      [[[408, 600], [470, 568], [500, 590], [438, 622]], .45, 'navy'],
      [[[300, 648], [345, 622], [372, 640], [328, 665]], .45, 'navy'],
      [[[530, 522], [575, 500], [598, 516], [553, 538]], .35, 'navy'],
      [[[630, 468], [800, 408], [852, 440], [680, 505]], .1, 'gen', 'walkable'],
    ],
    water: [
      [[575, 605], [620, 582], [650, 612], [605, 636]],
      [[330, 745], [380, 720], [430, 770], [385, 795]],
      [[760, 515], [815, 490], [845, 520], [790, 545]],
      [[540, 452], [598, 422], [640, 446], [582, 476]],
    ],
    dome: {at: [440, 522], r: 1.3},
    tables: [{from: [470, 500], cols: 5, rows: 3, step: [.55, .55]}, {from: [700, 368], cols: 6, rows: 2, step: [.5, .5]}],
    towers: [[882, 468, .13, 2]],
    gates: [{a: [630, 652], b: [680, 628]}],
    stages: [{key: 'dj', at: [818, 436], face: [740, 480], color: 0x6aa2ff}],
    trees: [ // [x, y, radio px, cantidad, tipo]
      [330, 805, 48, 16], [420, 780, 55, 20], [500, 738, 52, 18], [590, 705, 48, 16], [680, 672, 50, 18], [770, 628, 50, 18],
      [855, 585, 50, 18], [945, 545, 50, 18], [1040, 505, 48, 16], [1110, 520, 30, 8], [230, 800, 35, 8],
      [560, 392, 45, 10, 'blossom'], [612, 360, 40, 8, 'blossom'],
    ],
    lampLines: [[[255, 640], [760, 335]], [[455, 760], [985, 455]]],
    landmarks: [['NAVE LEWIS', [346, 736], 2.3]],
  },
  2: {
    cal: {O: [690, 268], A: [1075, 520], B: [175, 790]},
    outline: [[690, 268], [1075, 520], [970, 580], [880, 612], [868, 640], [720, 738], [470, 880], [330, 1032], [285, 990], [230, 945], [185, 890], [192, 842], [212, 822], [170, 790], [178, 700], [240, 610], [300, 560], [400, 470], [480, 410], [585, 335]],
    plazas: [
      [[[390, 712], [560, 640], [655, 700], [480, 790]], 'path', .05],
      [[[620, 385], [700, 350], [780, 430], [700, 468]], 'white', .07],
      [[[288, 872], [365, 832], [420, 880], [340, 915]], 'white', .07],
      [[[880, 540], [940, 515], [975, 560], [915, 590]], 'path', .05],
    ],
    halls: [
      [[[392, 748], [458, 722], [518, 790], [452, 830]], 1.6],
      [[[715, 575], [790, 555], [815, 600], [740, 620]], 1.3],
    ],
    blocks: [
      [[[458, 840], [500, 822], [520, 850], [478, 868]], .7, 'navy'],
      [[[650, 672], [745, 600], [770, 620], [680, 700]], 1.0, 'navy'],
      [[[500, 700], [590, 668], [628, 712], [540, 752]], .07, 'white', 'walkable'],
      [[[640, 688], [680, 672], [700, 700], [660, 715]], .35, 'white'],
    ],
    canals: [[[[365, 522], [430, 470], [505, 416]], .75], [[[205, 750], [232, 790]], .45]],
    tanks: [[375, 742, .32, 1.1]],
    // Horno 3 (Museo del Acero): alto horno, estufas, chimenea y Galería del Acero.
    horno: {furnace: [462, 716], dust: [425, 703], skip: [452, 640], chimney: [545, 648],
      stoves: [[490, 692, .36, 3.9], [510, 679, .36, 3.9], [528, 665, .36, 3.9]], gallery: {at: [505, 742], r: .62}},
    crane: {a: [650, 374], b: [745, 432], h: 2.4, w: 1.1},
    arches: [{a: [893, 592], b: [922, 553]}],
    flags: [[935, 535]],
    stages: [
      {key: 'kosmo', at: [412, 826], face: [370, 870], color: 0x7b8cff, scale: .85},
      {key: 'voyager', at: [590, 712], face: [540, 712], color: 0x5bc0ff, scale: .7},
      {key: 'lab', at: [670, 694], face: [705, 728], color: 0xff7aa8, scale: .7},
      {key: 'nova', at: [628, 368], face: [690, 410], color: 0xffb347},
    ],
    trees: [
      [560, 430, 72, 34], [900, 450, 110, 56], [660, 540, 40, 14], [380, 600, 82, 44], [250, 690, 55, 24], [220, 880, 45, 16],
      [255, 950, 35, 10], [600, 528, 30, 8], [330, 782, 30, 9], [300, 640, 30, 10], [820, 420, 40, 12], [470, 500, 42, 14], [560, 600, 30, 8], [1000, 520, 40, 10],
    ],
    lampLines: [[[700, 465], [800, 505], [965, 575]], [[300, 560], [420, 470], [540, 410], [690, 300]], [[700, 465], [600, 505], [480, 540], [340, 590]]],
    landmarks: [['HORNO 3', [462, 716], 6.6], ['LA GRÚA', [697, 403], 4.0]],
  },
});

/* Zonas seleccionables. `at` es la posición del marcador en el plano (px) y `h` su
   altura sobre el terreno. `access` (opcional) es el punto del camino desde el que
   se llega a la zona, por ejemplo el frente de un escenario. */
window.VenueDays = Object.freeze({
  1: {
    label: 'Día 1', short: 'Vie 13', venue: 'Nave Lewis',
    date: 'Viernes 13 de noviembre · 18:00 a 02:00',
    points: [
      {id: 'entrada', name: 'Entrada', type: 'entry', at: [655, 641], access: [657, 650], desc: 'Acceso señalado en el plano del día 1. Comprueba las puertas oficiales antes de asistir.'},
      {id: 'dj', name: 'DJ Booth', type: 'stage', at: [818, 430], h: 3.6, access: [770, 456], desc: 'Cabina principal del día 1, al fondo de la pista General. Estructura recreada de forma conceptual.'},
      {id: 'general', name: 'Pista General', type: 'area', at: [735, 494], desc: 'Área de público general frente al DJ Booth.'},
      {id: 'premium', name: 'Zona Premium', type: 'vip', at: [711, 438], access: [700, 470], desc: 'Área Premium junto a la pista, según el plano de referencia.'},
      {id: 'backstage', name: 'Backstage', type: 'vip', at: [860, 425], restricted: true, desc: 'Área de producción de acceso restringido.'},
      {id: 'food', name: 'Food Court', type: 'food', at: [533, 471], desc: 'Zona de comida con mesas, junto al domo.'},
      {id: 'food-premium', name: 'Premium Food Court', type: 'food', at: [781, 348], desc: 'Comida para asistentes Premium, en el extremo norte.'},
      {id: 'wc-nave', name: 'Baños · Nave Lewis', type: 'wc', at: [318, 621], desc: 'Sanitarios junto a la Nave Lewis. Ubicación ilustrativa.'},
      {id: 'wc-este', name: 'Baños · Extremo este', type: 'wc', at: [912, 432], desc: 'Sanitarios cerca del servicio médico. Ubicación ilustrativa.'},
      {id: 'wc-premium', name: 'WC Premium', type: 'wc', at: [705, 345], desc: 'Sanitarios de la zona Premium. Ubicación ilustrativa.'},
      {id: 'medico', name: 'Servicio médico', type: 'medical', at: [920, 398], desc: 'Atención médica señalada en el plano. Sigue siempre la señalización oficial.'},
      {id: 'barra-norte', name: 'Barra · Norte', type: 'bar', at: [842, 376], desc: 'Barra junto al Premium Food Court.'},
      {id: 'barra-torre', name: 'Barra · Torre', type: 'bar', at: [880, 471], access: [900, 470], desc: 'Barra al lado de la torre, detrás del DJ Booth.'},
      {id: 'barra-domo', name: 'Barra · Domo', type: 'bar', at: [490, 489], desc: 'Barra entre el domo y el Food Court.'},
      {id: 'barra-corredor', name: 'Barra · Corredor central', type: 'bar', at: [591, 525], desc: 'Barra sobre el corredor central.'},
      {id: 'barra-pista', name: 'Barra · Pista', type: 'bar', at: [655, 561], desc: 'Barra a la entrada de la pista General.'},
      {id: 'barra-entrada', name: 'Barra · Entrada', type: 'bar', at: [567, 585], desc: 'Barra próxima a la entrada.'},
      {id: 'barra-nave', name: 'Barra · Nave Lewis', type: 'bar', at: [383, 641], desc: 'Barra en el extremo oeste del corredor.'},
    ],
  },
  2: {
    label: 'Día 2', short: 'Sáb 14', venue: 'La Grúa y Horno 3',
    date: 'Sábado 14 de noviembre · 12:00 a 02:00',
    points: [
      {id: 'entrada', name: 'Entrada', type: 'entry', at: [932, 532], h: 2.6, access: [925, 560], desc: 'Acceso bajo el arco del extremo este, según el plano del día 2.'},
      {id: 'kosmo', name: 'Escenario Kosmo', type: 'stage', at: [410, 823], h: 3.6, access: [366, 878], desc: 'Escenario Kosmo, en el extremo sur junto a la Nave. Estructura recreada de forma conceptual.'},
      {id: 'voyager', name: 'Escenario Voyager', type: 'stage', at: [591, 712], h: 3.4, access: [540, 712], desc: 'Escenario Voyager, al este de Horno 3.'},
      {id: 'lab', name: 'Escenario LAB', type: 'stage', at: [663, 681], h: 3.4, access: [705, 730], desc: 'Escenario LAB, junto a la nave azul.'},
      {id: 'nova', name: 'Escenario Nova', type: 'stage', at: [633, 370], h: 3.6, access: [690, 412], desc: 'Escenario Nova, bajo La Grúa en el extremo norte.'},
      {id: 'backstage-nova', name: 'Backstage Nova', type: 'vip', at: [607, 350], restricted: true, desc: 'Área de producción de acceso restringido.'},
      {id: 'backstage-voyager', name: 'Backstage Voyager', type: 'vip', at: [607, 735], restricted: true, desc: 'Área de producción de acceso restringido.'},
      {id: 'premium-grua', name: 'Premium · La Grúa', type: 'vip', at: [725, 352], desc: 'Zona Premium junto a Nova.'},
      {id: 'premium-horno', name: 'Premium · Horno 3', type: 'vip', at: [495, 703], access: [548, 700], desc: 'Zona Premium frente a Horno 3.'},
      {id: 'food', name: 'Food Court', type: 'food', at: [304, 637], desc: 'Zona de comida en el bosque oeste.'},
      {id: 'activaciones', name: 'Activaciones', type: 'area', at: [628, 568], desc: 'Espacio de activaciones de marca entre los caminos centrales.'},
      {id: 'wc-canal', name: 'Baños · Canal', type: 'wc', at: [490, 500], desc: 'Sanitarios junto al canal norte. Ubicación ilustrativa.'},
      {id: 'wc-oeste', name: 'Baños · Bosque oeste', type: 'wc', at: [231, 722], desc: 'Sanitarios en el borde oeste. Ubicación ilustrativa.'},
      {id: 'wc-lab', name: 'Baños · LAB', type: 'wc', at: [686, 703], access: [690, 745], desc: 'Sanitarios cerca del escenario LAB. Ubicación ilustrativa.'},
      {id: 'wc-premium', name: 'WC Premium', type: 'wc', at: [394, 758], desc: 'Sanitarios Premium junto a la Nave. Ubicación ilustrativa.'},
      {id: 'medico-nova', name: 'Servicio médico · Nova', type: 'medical', at: [543, 383], desc: 'Atención médica cerca de Nova. Sigue siempre la señalización oficial.'},
      {id: 'medico-lab', name: 'Servicio médico · LAB', type: 'medical', at: [720, 655], access: [700, 598], desc: 'Atención médica cerca de LAB. Sigue siempre la señalización oficial.'},
      {id: 'medico-oeste', name: 'Servicio médico · Oeste', type: 'medical', at: [258, 763], desc: 'Atención médica en el borde oeste. Sigue siempre la señalización oficial.'},
      {id: 'barra-nova', name: 'Barra · Nova', type: 'bar', at: [517, 368], desc: 'Barra en el camino norte, cerca de Nova.'},
      {id: 'barra-explanada', name: 'Barra · Explanada', type: 'bar', at: [796, 494], desc: 'Barra sobre el camino principal desde la entrada.'},
      {id: 'barra-canal', name: 'Barra · Canal', type: 'bar', at: [330, 546], desc: 'Barra en el extremo oeste del camino norte.'},
      {id: 'barra-bosque', name: 'Barra · Bosque', type: 'bar', at: [474, 610], desc: 'Barra junto al bosque central.'},
      {id: 'barra-lab', name: 'Barra · Activaciones', type: 'bar', at: [629, 630], desc: 'Barra en el cruce hacia LAB y Voyager.'},
      {id: 'barra-nave', name: 'Barra · Nave', type: 'bar', at: [342, 773], desc: 'Barra al oeste de la Nave.'},
      {id: 'barra-voyager', name: 'Barra · Voyager', type: 'bar', at: [541, 768], desc: 'Barra frente al escenario Voyager.'},
      {id: 'barra-kosmo', name: 'Barra · Kosmo', type: 'bar', at: [438, 862], desc: 'Barra junto al escenario Kosmo.'},
    ],
  },
});
