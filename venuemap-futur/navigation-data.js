'use strict';

// Concept-model coordinates copied from the existing walkway geometry, NOT GPS.
// Real guidance remains disabled until a surveyed/calibrated network replaces it.
window.VenueNavigationData = Object.freeze({
  schemaVersion: 1,
  kind: 'concept-demo',
  calibration: null,
  restrictedPointIds: ['backstage'],
  days: {
    1: {paths: [
      [[-92,9],[-67,9],[-46,0],[-19,0],[10,-3],[36,-3],[63,-3],[89,-3]],
      [[-58,-36],[-39,-19],[-12,-6],[12,7],[37,22],[78,28]],
      [[-83,31],[-47,25],[-4,30],[30,34],[82,27]],
      [[65,-39],[65,-24],[65,5]],
      [[-27,-45],[-27,39]]
    ]},
    2: {paths: [
      [[-91,17],[-63,6],[-39,6],[-10,11],[14,18],[44,8],[94,19]],
      [[-73,-35],[-54,-18],[-33,-12],[7,-18],[41,-21],[88,-11]],
      [[-21,-36],[-8,-6],[12,16],[23,36]],
      [[60,-34],[55,1],[60,32]],
      [[-98,0],[10,0],[95,0]]
    ]}
  }
});
