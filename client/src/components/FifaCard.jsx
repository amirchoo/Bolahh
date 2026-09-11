import { useState, useId, useRef, useEffect, memo } from 'react';
import { IoCameraOutline, IoCheckmark } from 'react-icons/io5';

export const STATS = [
  { key: 'pac', label: 'PAC' },
  { key: 'sho', label: 'SHO' },
  { key: 'pas', label: 'PAS' },
  { key: 'dri', label: 'DRI' },
  { key: 'def', label: 'DEF' },
  { key: 'phy', label: 'PHY' },
];

export const POSITION_ABBR = { Attacker: 'AT', Midfielder: 'MF', Defender: 'DF', Goalkeeper: 'GK' };

// Each color has its own base outline (not a shared crown recolored three
// ways) — Gangsa/Perak/Emas each get a distinct silhouette. All three share
// a 220-unit-wide card body, but their decorative top flourish overflows
// sideways past that body, so each viewBox is wider than 220 and the body
// sits inset by rectLeftX. topEdgeY is the y where the flourish ends and the
// plain rounded-rect body begins (used to reserve space above the content).
// Novis has no crown flourish, so its shape is just that plain rounded-rect
// body on its own (topEdgeY 0, no inset) — same 220×330 box the old CSS
// `border-radius: 16` rect drew, traced into a path so it renders through
// the same shape pipeline (and gradient/shine/tilt treatment) as the other
// three colors instead of a separate CSS-only fallback.
export const CARD_RECT_WIDTH = 220;
export const CARD_SHAPES = {
  novis: {
    viewBoxW: 220, viewBoxH: 330, rectLeftX: 0, topEdgeY: 0,
    path: 'M204,0 C208.243,0 212.313,1.686 215.314,4.687 C218.314,7.687 220,11.756 220,15.999 C220,71.898 220,258.103 220,314 C220,318.243 218.314,322.313 215.314,325.314 C212.313,328.314 208.243,329.999 204,329.999 C163.381,329.999 56.619,329.999 16,329.999 C11.757,329.999 7.687,328.314 4.686,325.314 C1.686,322.313 0,318.243 0,314 C0,258.103 0,71.898 0,15.999 C0,11.756 1.686,7.687 4.686,4.687 C7.687,1.686 11.757,0 16,0 C56.619,0 163.381,0 204,0Z',
  },
  gangsa: {
    viewBoxW: 220, viewBoxH: 360, rectLeftX: 0, topEdgeY: 43.7,
    path: 'M213.94,33.449c2.417,1.756 4.234,4.216 5.202,7.043c0.551,1.691 0.859,3.471 0.859,5.283l0,298c0,4.243 -1.686,8.313 -4.686,11.314c-3.001,3.001 -7.07,4.686 -11.314,4.686l-188,-0c-4.243,-0 -8.313,-1.686 -11.314,-4.686c-3.001,-3.001 -4.686,-7.07 -4.686,-11.314l-0,-298c-0,-2.964 0.822,-5.842 2.34,-8.332c0.914,-1.514 2.125,-2.828 3.561,-3.861c6.595,-4.804 38.415,-27.186 70.061,-33.205c0.522,-0.095 1.06,0.022 1.495,0.324c0.436,0.302 0.733,0.766 0.827,1.288c2.826,14.938 15.961,26.248 31.716,26.248c15.762,0 28.901,-11.32 31.724,-26.266c0.093,-0.521 0.39,-0.983 0.824,-1.285c0.434,-0.302 0.971,-0.419 1.491,-0.325c31.483,5.948 62.968,28.035 69.901,33.087Z',
  },
  perak: {
    viewBoxW: 254, viewBoxH: 361, rectLeftX: 16.7, topEdgeY: 35.8,
    path: 'M16.699,74.537c-1.714,-20.506 -7.497,-27.891 -15.718,-32.537c-0.764,-0.45 -1.139,-1.35 -0.92,-2.209c0.219,-0.859 0.979,-1.47 1.865,-1.499c12.684,-0.201 26.875,-2.892 24.968,-24.413c-0.051,-0.752 0.331,-1.467 0.984,-1.844c0.653,-0.376 1.463,-0.348 2.088,0.073c13.234,8.979 26.603,5.673 31.061,-10.73c0.25,-0.807 0.989,-1.362 1.833,-1.378c0.844,-0.016 1.604,0.511 1.884,1.308c9.507,24.32 46.624,39.931 60.252,17.17c0.36,-0.597 1.006,-0.962 1.702,-0.962c0.697,0 1.343,0.365 1.702,0.962c13.628,22.761 50.746,7.15 60.253,-17.17c0.28,-0.797 1.039,-1.324 1.884,-1.308c0.844,0.016 1.583,0.572 1.833,1.378c4.458,16.402 17.827,19.708 31.061,10.73c0.625,-0.421 1.435,-0.45 2.088,-0.073c0.653,0.376 1.035,1.092 0.984,1.844c-1.906,21.521 12.284,24.211 24.968,24.413c0.886,0.029 1.646,0.64 1.865,1.499c0.219,0.859 -0.156,1.759 -0.92,2.209c-8.221,4.646 -14.004,12.031 -15.718,32.537l-0,269.907c0,4.243 -1.686,8.313 -4.686,11.314c-3.001,3.001 -7.07,4.686 -11.314,4.686l-188,-0c-4.243,-0 -8.313,-1.686 -11.314,-4.686c-3.001,-3.001 -4.686,-7.07 -4.686,-11.314l-0,-269.907Z',
  },
  emas: {
    viewBoxW: 256, viewBoxH: 361, rectLeftX: 17.6, topEdgeY: 18.6,
    path: 'M17.572,60.406c-0.108,-4.516 -1.042,-13.802 -7.538,-23.318c-1.395,-2.179 -8.601,-9.764 -10.022,-21.324c-0.078,-0.704 0.237,-1.395 0.823,-1.803c0.586,-0.408 1.35,-0.47 1.995,-0.16c8.347,4.004 15.355,5.692 25.522,5.274c8.992,-0.218 19.559,4.341 26.946,8.099c0.588,0.256 1.275,0.11 1.704,-0.362c0.429,-0.472 0.504,-1.162 0.185,-1.713c-2.039,-2.855 -3.757,-6.08 -7.478,-10.245c-0.474,-0.622 -0.521,-1.465 -0.12,-2.135c0.401,-0.67 1.171,-1.036 1.951,-0.927c7.737,1.307 20.458,5.741 29.815,13.818c0.479,0.456 1.208,0.537 1.777,0.196c0.569,-0.341 0.833,-1.017 0.645,-1.648c-2.731,-6.637 -6.303,-16.152 -5.82,-22.62c0.122,-0.566 0.493,-1.048 1.011,-1.316c0.518,-0.268 1.131,-0.294 1.671,-0.071c5.032,3.595 14.285,13.55 24.152,15.533c10.82,2.683 17.674,8.499 21.501,14.568c0.009,0.015 0.018,0.03 0.028,0.045c0.273,0.428 0.746,0.688 1.255,0.688c0.509,-0 0.982,-0.26 1.255,-0.688c0.009,-0.015 0.019,-0.03 0.028,-0.045c3.828,-6.069 10.681,-11.885 21.501,-14.568c9.867,-1.983 19.119,-11.938 24.152,-15.533c0.54,-0.223 1.152,-0.197 1.671,0.071c0.518,0.268 0.889,0.751 1.011,1.316c0.483,6.468 -3.089,15.983 -5.82,22.62c-0.188,0.63 0.076,1.307 0.645,1.648c0.569,0.341 1.298,0.26 1.777,-0.196c9.357,-8.077 22.079,-12.511 29.815,-13.818c0.78,-0.109 1.55,0.256 1.951,0.927c0.401,0.67 0.353,1.513 -0.12,2.135c-3.722,4.165 -5.439,7.39 -7.478,10.245c-0.319,0.55 -0.245,1.241 0.185,1.713c0.429,0.472 1.117,0.618 1.704,0.362c7.387,-3.758 17.954,-8.317 26.946,-8.099c10.167,0.419 17.174,-1.27 25.522,-5.274c0.645,-0.309 1.409,-0.248 1.995,0.16c0.586,0.408 0.901,1.099 0.823,1.803c-1.421,11.559 -8.627,19.144 -10.022,21.324c-6.496,9.516 -7.43,18.802 -7.538,23.318c-0.028,1.181 0,2.036 0,2.484l0,281.407c0,4.243 -1.686,8.313 -4.686,11.314c-3.001,3.001 -7.07,4.686 -11.314,4.686l-188,-0c-4.243,-0 -8.313,-1.686 -11.314,-4.686c-3.001,-3.001 -4.686,-7.07 -4.686,-11.314l-0,-281.407c0,-0.447 0.028,-1.302 0,-2.484Z',
  },
};

// Star overlays, keyed by arrangement (not by color) — the same arrangement
// gets reused across whichever colors were assigned it, layered on top of
// that color's own shape.
export const STAR_SETS = {
  solo: { // 1 star — tier III, all colors
    viewBoxW: 15, viewBoxH: 15,
    paths: ['M8.081,13.429c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z'],
  },
  duoRow: { // 2 stars side-by-side — Gangsa II, Perak II
    viewBoxW: 39, viewBoxH: 15,
    paths: [
      'M32.081,13.429c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z',
      'M8.081,13.429c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z',
    ],
  },
  duoStack: { // 2 stars stacked vertically — Emas II
    viewBoxW: 15, viewBoxH: 33,
    paths: [
      'M8.081,31.266c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z',
      'M6.919,1.571c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696Z',
    ],
  },
  trioDown: { // 3 stars, center low / point-down — Gangsa I, Emas I
    viewBoxW: 39, viewBoxH: 27,
    paths: [
      'M20.081,24.848c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z',
      'M32.081,13.429c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z',
      'M8.081,13.429c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696Z',
    ],
  },
  trioUp: { // 3 stars, center high / point-up (matches the old crown design) — Perak I
    viewBoxW: 39, viewBoxH: 27,
    paths: [
      'M18.919,1.571c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696Z',
      'M6.919,12.99c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696Z',
      'M30.919,12.99c0.09,-0.243 0.322,-0.405 0.581,-0.405c0.259,-0 0.491,0.162 0.581,0.405c0.195,0.528 0.417,1.128 0.627,1.696c0.518,1.401 1.623,2.506 3.024,3.024c0.568,0.21 1.167,0.432 1.696,0.627c0.243,0.09 0.405,0.322 0.405,0.581c0,0.259 -0.162,0.491 -0.405,0.581c-0.528,0.195 -1.128,0.417 -1.696,0.627c-1.401,0.518 -2.506,1.623 -3.024,3.024c-0.21,0.568 -0.432,1.167 -0.627,1.696c-0.09,0.243 -0.322,0.405 -0.581,0.405c-0.259,0 -0.491,-0.162 -0.581,-0.405c-0.195,-0.528 -0.417,-1.128 -0.627,-1.696c-0.518,-1.401 -1.623,-2.506 -3.024,-3.024c-0.568,-0.21 -1.167,-0.432 -1.696,-0.627c-0.243,-0.09 -0.405,-0.322 -0.405,-0.581c-0,-0.259 0.162,-0.491 0.405,-0.581c0.528,-0.195 1.128,-0.417 1.696,-0.627c1.401,-0.518 2.506,-1.623 3.024,-3.024c0.21,-0.568 0.432,-1.167 0.627,-1.696Z',
    ],
  },
};

// Which star arrangement each color uses per sub-tier (III = 1 star, II = 2, I = 3).
export const STAR_SET_FOR_RANK = {
  gangsa: { 3: 'solo', 2: 'duoRow',   1: 'trioDown' },
  perak:  { 3: 'solo', 2: 'duoRow',   1: 'trioUp' },
  emas:   { 3: 'solo', 2: 'duoStack', 1: 'trioDown' },
};

// Starting placement (left/top/width/height, in each shape's own viewBox
// units) for each color+sub-tier combo — rough defaults, meant to be
// fine-tuned per combo with the card tuner rather than hand-derived exactly.
export const STAR_PLACEMENT = {
  'gangsa-3': { left: 98.75, top: -12,   width: 22.5, height: 18 },
  'gangsa-2': { left: 81.5,  top: -12,   width: 58.5, height: 18 },
  'gangsa-1': { left: 81,    top: -19,   width: 58.5, height: 32.5 },
  'perak-3':  { left: 99,    top: -12,   width: 22.5, height: 18 },
  'perak-2':  { left: 81.5,  top: -12,   width: 58.5, height: 18 },
  'perak-1':  { left: 80.5,  top: -18,   width: 58.5, height: 32.5 },
  'emas-3':   { left: 99,    top: -12,   width: 22.5, height: 18 },
  'emas-2':   { left: 99,    top: -26.5, width: 22.5, height: 39.5 },
  'emas-1':   { left: 81,    top: -19,   width: 58.5, height: 32.5 },
};

// Content positions ({n: normal size, s: small size} px) for the six
// elements, anchored from the BOTTOM of the card body — a bottom offset plus
// a horizontal nudge (applied as an extra translateX on top of each
// element's own left/right/centering, so it layers on cleanly regardless of
// how that element is anchored).
//
// Bottom-anchored rather than top-anchored deliberately: the three shapes'
// own SVG heights are nearly identical (360/361/361) even though their
// crown heights differ a lot (43.7/35.8/18.6), so a position counted up
// from the bottom lands in nearly the same spot on every color, while a
// position counted down from the top does not (that's the whole reason
// OVR/AT kept either overlapping the crown or landing at a different height
// per color in earlier iterations). One shared layout now covers Novis and
// all three shapes — no more per-combo numbers, and no more headroom
// reservation for content, since nothing needs to float above the crown.
// These values are exact — measured directly off Novis's real rendered
// output (position + height of each element), not hand-estimated.
// ovrBottom/rankBottom are nudged 4px (2.5px small) below their exact
// Novis-measured value (263/310 and 167/196) — Gangsa's body is the
// shortest of the three shapes (316.3 vs Novis's 330), and at the exact
// measured value OVR/rank would clip their own top edge by ~1.7px against
// the content box on Gangsa specifically. The nudge is imperceptible on
// Novis/Perak/Emas and gives Gangsa a couple of px of real clearance.
export const NOVIS_CONTENT_LAYOUT = {
  ovrBottom: { n: 270, s: 173 }, ovrLeft: { n: -1, s: 0 },
  posBottom: { n: 259, s: 162 }, posLeft: { n: 2, s: 0 },
  rankBottom:    { n: 302, s: 191 },   rankLeft:    { n: 0, s: 0 },
  avatarBottom:  { n: 172, s: 110 },   avatarLeft:  { n: 0, s: 0 },
  nameBottom:    { n: 143, s: 94.5 }, nameLeft:   { n: 0, s: 0 },
  statsBottom:   { n: 60,  s: 47 },    statsLeft:   { n: 0, s: 0 },
};
const CONTENT_LAYOUT = {
  novis:   NOVIS_CONTENT_LAYOUT,
  gangsa:  NOVIS_CONTENT_LAYOUT,
  perak:   NOVIS_CONTENT_LAYOUT,
  emas:    NOVIS_CONTENT_LAYOUT,
  default: NOVIS_CONTENT_LAYOUT,
};

// Achievement badge stack placement — ONE shared config for every rank color,
// same idea as NOVIS_CONTENT_LAYOUT above: every value is anchored from the
// BOTTOM of the card body rather than the top. The three shapes' crown
// heights differ enormously (43.7/35.8/18.6), which is exactly why a
// top-anchored stack needed separate hand-tuned numbers per color to clear
// each crown — but their body heights (bodyH) differ only slightly, so a
// bottom anchor lands the badge stack in essentially the same spot on every
// color without per-tier compensation, the same reason bottom-anchoring
// already lets OVR/rank/avatar/name/stats share one layout table.
// All fractions are of `w` (the card's plain body width — exactly 220 or 140
// for every color/sub-tier), so sizing is identical everywhere too.
export const ACHIEVEMENT_BADGE_LAYOUT = {
  badgeSizeFrac: 0.17,
  gapFrac: 0.01,
  // Distance from the card's bottom edge up to the bottom of the LAST
  // (lowest) badge in the stack.
  bottomFrac: 0.765,
  overflowFrac: 0.51,
};

// Exported so cardCanvas.js (the static share-image renderer) can classify
// a rank the exact same way the live card does, instead of re-deriving its
// own copy that could quietly drift out of sync.
export function getCardColorKey(rank) {
  return rank?.startsWith('Emas') ? 'emas' : rank?.startsWith('Perak') ? 'perak' : rank?.startsWith('Gangsa') ? 'gangsa' : rank === 'Novis' ? 'novis' : null;
}
export function getCardSubTier(rank) {
  return rank?.endsWith(' III') ? 3 : rank?.endsWith(' II') ? 2 : rank?.endsWith(' I') ? 1 : null;
}

// Single source of truth for each rank color's palette — keyed the same way
// getCardColorKey() classifies a rank, so cardCanvas.js (the static
// share-image renderer) can look a theme up by that same key instead of
// hand-duplicating these values, which is exactly how they drifted out of
// sync before (Perak silently stayed on its old blue in the saved image
// after the live card moved to silver).
export const CARD_COLOR_THEMES = {
  emas:   { stops: ['#b8860b', '#fad40f', '#b8860b'], border: '#fad40f', text: '#3a2a00', muted: '#6b4e00', statBg: 'rgba(0,0,0,0.2)' },
  perak:  { stops: ['#6e7378', '#d6d9dc', '#6e7378'], border: '#b0b4b8', text: '#202224', muted: '#4a4d50', statBg: 'rgba(0,0,0,0.15)' },
  gangsa: { stops: ['#7c4a1a', '#cd7f32', '#7c4a1a'], border: '#cd7f32', text: '#2a1400', muted: '#5a3010', statBg: 'rgba(0,0,0,0.2)' },
  novis:  { stops: ['#2a2d30', '#3d4144', '#2a2d30'], border: '#555',    text: '#e8e9eb', muted: '#aaa',    statBg: 'rgba(255,255,255,0.1)' },
};

export function getCardTheme(rank) {
  const t = CARD_COLOR_THEMES[getCardColorKey(rank) || 'novis'];
  return { bg: `linear-gradient(145deg, ${t.stops[0]}, ${t.stops[1]}, ${t.stops[2]})`, border: t.border, text: t.text, muted: t.muted, statBg: t.statBg };
}

export function calcOverall(stats) {
  return Math.round(STATS.map(s => stats[s.key] || 0).reduce((a, b) => a + b, 0) / 6);
}

// "28 JUL 26" — matches the card's own all-caps Space Mono labels (GAMES
// PLAYED, OVR, rank text) rather than a locale-formatted date. Returns null
// for a missing/invalid input so the caller can just skip rendering it
// instead of showing "Invalid Date" (some card call sites, e.g. the
// landing page's demo profile, don't pass a memberSince at all).
export function formatMemberSinceDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

export function buildCustomTheme(form) {
  const text   = form.textDark ? '#1a1200' : '#f0f0f0';
  const muted  = form.textDark ? '#5a4800' : '#999999';
  const statBg = form.textDark ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)';
  return {
    bg:          `linear-gradient(145deg, ${form.gradFrom}, ${form.gradMid}, ${form.gradTo})`,
    border:      form.borderColor,
    text,
    muted,
    statBg,
    glowColor:       form.glowColor,
    glowEnabled:     form.glowEnabled,
    foilEnabled:     form.foilEnabled,
    badgeColor:      form.badgeColor,
    textDark:        form.textDark,
    pattern:         form.pattern      || 'none',
    patternColor:    form.patternColor || '#ffffff',
    patternOpacity:  form.patternOpacity  ?? 0.15,
    elemCorners:      form.elemCorners      || false,
    elemSideBars:     form.elemSideBars     || false,
    elemCenterDiamond:form.elemCenterDiamond|| false,
    elemFrame:        form.elemFrame        || false,
    elemColor:        form.elemColor        || '#ffffff',
    elemOpacity:      form.elemOpacity      ?? 0.3,
    stickerIcon:      form.stickerIcon      || 'none',
    stickerPos:       form.stickerPos       || 'top-center',
    stickerSize:      form.stickerSize      ?? 36,
    stickerColor:     form.stickerColor     || '#ffffff',
    stickerOpacity:   form.stickerOpacity   ?? 0.9,
  };
}

export const STICKER_ICONS = [
  { key: 'star',    label: 'Star',    d: 'M12 2L14.3 8.9L21.7 9.1L16 13.2L18.1 20.2L12 16.1L5.9 20.2L8 13.2L2.3 9.1L9.7 8.9Z' },
  { key: 'burst',   label: 'Burst',   d: 'M22 12L16.6 13.9L19.1 19.1L13.9 16.6L12 22L10.1 16.6L4.9 19.1L7.4 13.9L2 12L7.4 10.1L4.9 4.9L10.1 7.4L12 2L13.9 7.4L19.1 4.9L16.6 10.1Z' },
  { key: 'diamond', label: 'Diamond', d: 'M12 2L22 12L12 22L2 12Z' },
  { key: 'shield',  label: 'Shield',  d: 'M12 2L4 5V12C4 17 7.6 21.5 12 23C16.4 21.5 20 17 20 12V5Z' },
  { key: 'bolt',    label: 'Bolt',    d: 'M13 2L4 14H11L10 22L19 10H12Z' },
  { key: 'crown',   label: 'Crown',   d: 'M2 19H22V21H2ZM4.5 17.5L2 9L6.5 13.5L12 3L17.5 13.5L22 9L19.5 17.5Z' },
  { key: 'heart',   label: 'Heart',   d: 'M12 21C12 21 2.5 15 2.5 8.5C2.5 5.5 5 3 8 3C9.8 3 11.4 4 12 5.5C12.6 4 14.2 3 16 3C19 3 21.5 5.5 21.5 8.5C21.5 15 12 21 12 21Z' },
  { key: 'fire',    label: 'Fire',    d: 'M12 2C9.5 6 8 9 9.5 13C8 11 8.5 8 10 9C8.5 13 10.5 17 12 19.5C13.5 17 15.5 13 14 9C15.5 8 16 11 14.5 13C16 9 14.5 6 12 2ZM9.5 18.5C9.5 20.4 10.6 22 12 22C13.4 22 14.5 20.4 14.5 18.5C14.5 16.8 13 15 12 13C11 15 9.5 16.8 9.5 18.5Z' },
];

export function getStickerPos(posKey, w, h) {
  switch (posKey) {
    case 'top-left':      return { x: w * 0.18, y: h * 0.08 };
    case 'top-right':     return { x: w * 0.82, y: h * 0.08 };
    case 'center':        return { x: w * 0.5,  y: h * 0.45 };
    case 'bottom-left':   return { x: w * 0.18, y: h * 0.9  };
    case 'bottom-right':  return { x: w * 0.82, y: h * 0.9  };
    case 'bottom-center': return { x: w * 0.5,  y: h * 0.9  };
    case 'top-center':
    default:              return { x: w * 0.5,  y: h * 0.08 };
  }
}

// Bakes the pattern + opacity directly into the card's background layers so it
// is structurally behind all positioned children and can never overlap content.
function patternBgStyle(pattern, hexColor, opacity, gradientBg) {
  const aa = Math.round((opacity ?? 0.15) * 255).toString(16).padStart(2, '0');
  const c  = `${hexColor || '#ffffff'}${aa}`;
  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${c} 1.5px, transparent 1.5px), ${gradientBg}`, backgroundSize: '12px 12px, 100% 100%' };
    case 'diagonal':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 9px), ${gradientBg}` };
    case 'grid':
      return { backgroundImage: `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px), ${gradientBg}`, backgroundSize: '16px 16px, 16px 16px, 100% 100%' };
    case 'crosshatch':
      return { backgroundImage: `repeating-linear-gradient(45deg, ${c} 0, ${c} 1px, transparent 0, transparent 9px), repeating-linear-gradient(-45deg, ${c} 0, ${c} 1px, transparent 0, transparent 9px), ${gradientBg}` };
    case 'carbon':
      return { backgroundImage: `repeating-linear-gradient(0deg, ${c} 0, ${c} 1px, transparent 0, transparent 8px), repeating-linear-gradient(90deg, ${c} 0, ${c} 1px, transparent 0, transparent 8px), ${gradientBg}`, backgroundSize: '8px 8px, 8px 8px, 100% 100%' };
    default:
      return null;
  }
}

// Achievement badge bracket — a chevron/zigzag path that hangs off the
// card's right edge (poking outward like the crown flourishes do). Color is
// caller-supplied so it can carry the achievement tier's color later
// (common/rare/epic/legendary); opacity keeps it reading as an overlay
// rather than a solid sticker.
// Achievement badges — diamond "gem" icons that hang off the card's right
// edge, one per earned achievement type, stacked in whatever order and
// rarity the admin picks. Each type's diamond-holder (base + frame) and
// icon glyph are lifted verbatim from the source Illustrator export: rather
// than hand-flattening each shape's chain of nested translate/rotate/scale
// groups into one set of coordinates (easy to get subtly wrong), every
// group's transform is concatenated into a single space-separated
// `transform` string in original-file order — mathematically identical to
// the nested <g> structure, since SVG composes multiple transform
// functions the same way it composes nested groups, but verified by
// construction instead of by hand.
export const BADGE_TYPES = {
  matches: {
    label: 'Matches Played',
    diamondTransform: 'translate(-2143.391315,-1436.857667) translate(1415.282746,1263.41941) matrix(0.68217,0.68217,-0.68217,0.68217,595.194448,-1868.676614)',
    path1: 'M1623.982,1389.419C1624.477,1389.419 1624.951,1389.615 1625.301,1389.965C1625.651,1390.315 1625.848,1390.79 1625.848,1391.285L1625.848,1407.431C1625.848,1407.926 1625.651,1408.401 1625.301,1408.751C1624.951,1409.1 1624.477,1409.297 1623.982,1409.297L1607.835,1409.297C1607.34,1409.297 1606.866,1409.1 1606.516,1408.751C1606.166,1408.401 1605.969,1407.926 1605.969,1407.431L1605.969,1391.285C1605.969,1390.79 1606.166,1390.315 1606.516,1389.965C1606.866,1389.615 1607.34,1389.419 1607.835,1389.419L1623.982,1389.419Z',
    path2: 'M1623.982,1388.123C1624.82,1388.123 1625.624,1388.456 1626.217,1389.049C1626.81,1389.642 1627.143,1390.446 1627.143,1391.285L1627.143,1407.431C1627.143,1408.27 1626.81,1409.074 1626.217,1409.667C1625.624,1410.26 1624.82,1410.593 1623.982,1410.593L1607.835,1410.593C1606.997,1410.593 1606.193,1410.26 1605.6,1409.667C1605.007,1409.074 1604.674,1408.27 1604.674,1407.431L1604.674,1391.285C1604.674,1390.446 1605.007,1389.642 1605.6,1389.049C1606.193,1388.456 1606.997,1388.123 1607.835,1388.123L1623.982,1388.123ZM1623.982,1389.419L1607.835,1389.419C1607.34,1389.419 1606.866,1389.615 1606.516,1389.965C1606.166,1390.315 1605.969,1390.79 1605.969,1391.285L1605.969,1407.431C1605.969,1407.926 1606.166,1408.401 1606.516,1408.751C1606.866,1409.1 1607.34,1409.297 1607.835,1409.297L1623.982,1409.297C1624.477,1409.297 1624.951,1409.1 1625.301,1408.751C1625.651,1408.401 1625.848,1407.926 1625.848,1407.431L1625.848,1391.285C1625.848,1390.79 1625.651,1390.315 1625.301,1389.965C1624.951,1389.615 1624.477,1389.419 1623.982,1389.419Z',
    iconTransform: 'translate(-2143.391315,-1436.857667) translate(1415.282746,1263.41941) matrix(0.149155,0,0,0.149155,742.918835,188.248524) translate(-50,-50) matrix(0.104167,0,0,0.104167,0,100)',
    iconPath: 'M480,-80C424.667,-80 372.667,-90.5 324,-111.5C275.333,-132.5 233,-161 197,-197C161,-233 132.5,-275.333 111.5,-324C90.5,-372.667 80,-424.667 80,-480C80,-535.333 90.5,-587.333 111.5,-636C132.5,-684.667 161,-727 197,-763C233,-799 275.333,-827.5 324,-848.5C372.667,-869.5 424.667,-880 480,-880C535.333,-880 587.333,-869.5 636,-848.5C684.667,-827.5 727,-799 763,-763C799,-727 827.5,-684.667 848.5,-636C869.5,-587.333 880,-535.333 880,-480C880,-424.667 869.5,-372.667 848.5,-324C827.5,-275.333 799,-233 763,-197C727,-161 684.667,-132.5 636,-111.5C587.333,-90.5 535.333,-80 480,-80ZM680,-580L734,-598L750,-652C728.667,-684 703,-711.5 673,-734.5C643,-757.5 610,-774.667 574,-786L520,-748L520,-692L680,-580ZM280,-580L440,-692L440,-748L386,-786C350,-774.667 317,-757.5 287,-734.5C257,-711.5 231.333,-684 210,-652L226,-598L280,-580ZM238,-272L284,-276L314,-330L256,-504L200,-524L160,-494C160,-450.667 166,-411.167 178,-375.5C190,-339.833 210,-305.333 238,-272ZM531,-164C547.667,-166.667 564,-170.667 580,-176L608,-236L582,-280L378,-280L352,-236L380,-176C396,-170.667 412.333,-166.667 429,-164C445.667,-161.333 462.667,-160 480,-160C497.333,-160 514.333,-161.333 531,-164ZM390,-360L570,-360L626,-520L480,-622L336,-520L390,-360ZM722,-272C750,-305.333 770,-339.833 782,-375.5C794,-411.167 800,-450.667 800,-494L760,-522L704,-504L646,-330L676,-276L722,-272Z',
  },
  mvp: {
    label: 'MVP Award',
    diamondTransform: 'translate(-2143.391315,-1374.559767) translate(1415.282746,1263.41941) matrix(0.68217,0.68217,-0.68217,0.68217,595.194448,-1930.974514)',
    path1: 'M1623.982,1389.419C1624.477,1389.419 1624.951,1389.615 1625.301,1389.965C1625.651,1390.315 1625.848,1390.79 1625.848,1391.285L1625.848,1407.431C1625.848,1407.926 1625.651,1408.401 1625.301,1408.751C1624.951,1409.1 1624.477,1409.297 1623.982,1409.297C1620.191,1409.297 1611.626,1409.297 1607.835,1409.297C1607.34,1409.297 1606.866,1409.1 1606.516,1408.751C1606.166,1408.401 1605.969,1407.926 1605.969,1407.431L1605.969,1391.285C1605.969,1390.79 1606.166,1390.315 1606.516,1389.965C1606.866,1389.615 1607.34,1389.419 1607.835,1389.419L1623.982,1389.419Z',
    path2: 'M1623.982,1388.123C1624.82,1388.123 1625.624,1388.456 1626.217,1389.049C1626.81,1389.642 1627.143,1390.446 1627.143,1391.285L1627.143,1407.431C1627.143,1408.27 1626.81,1409.074 1626.217,1409.667C1625.624,1410.26 1624.82,1410.593 1623.982,1410.593L1607.835,1410.593C1606.997,1410.593 1606.193,1410.26 1605.6,1409.667C1605.007,1409.074 1604.674,1408.27 1604.674,1407.431L1604.674,1391.285C1604.674,1390.446 1605.007,1389.642 1605.6,1389.049C1606.193,1388.456 1606.997,1388.123 1607.835,1388.123L1623.982,1388.123ZM1623.982,1389.419L1607.835,1389.419C1607.34,1389.419 1606.866,1389.615 1606.516,1389.965C1606.166,1390.315 1605.969,1390.79 1605.969,1391.285L1605.969,1407.431C1605.969,1407.926 1606.166,1408.401 1606.516,1408.751C1606.866,1409.1 1607.34,1409.297 1607.835,1409.297L1623.982,1409.297C1624.477,1409.297 1624.951,1409.1 1625.301,1408.751C1625.651,1408.401 1625.848,1407.926 1625.848,1407.431L1625.848,1391.285C1625.848,1390.79 1625.651,1390.315 1625.301,1389.965C1624.951,1389.615 1624.477,1389.419 1623.982,1389.419Z',
    iconTransform: 'translate(-2143.391315,-1374.559767) translate(1415.282746,1263.41941) matrix(0.159809,0,0,0.159809,742.918835,125.950623) translate(-50,-50) matrix(0.104167,0,0,0.104167,0,100)',
    iconPath: 'M480,-381L556,-335C563.333,-330.333 570.667,-330.5 578,-335.5C585.333,-340.5 588,-347.333 586,-356L566,-443L634,-502C640.667,-508 642.667,-515.167 640,-523.5C637.333,-531.833 631.333,-536.333 622,-537L533,-544L498,-626C494.667,-634 488.667,-638 480,-638C471.333,-638 465.333,-634 462,-626L427,-544L338,-537C328.667,-536.333 322.667,-531.833 320,-523.5C317.333,-515.167 319.333,-508 326,-502L394,-443L374,-356C372,-347.333 374.667,-340.5 382,-335.5C389.333,-330.5 396.667,-330.333 404,-335L480,-381ZM346,-160L240,-160C218,-160 199.167,-167.833 183.5,-183.5C167.833,-199.167 160,-218 160,-240L160,-346L83,-424C75.667,-432 70,-440.833 66,-450.5C62,-460.167 60,-470 60,-480C60,-490 62,-499.833 66,-509.5C70,-519.167 75.667,-528 83,-536L160,-614L160,-720C160,-742 167.833,-760.833 183.5,-776.5C199.167,-792.167 218,-800 240,-800L346,-800L424,-877C432,-884.333 440.833,-890 450.5,-894C460.167,-898 470,-900 480,-900C490,-900 499.833,-898 509.5,-894C519.167,-890 528,-884.333 536,-877L614,-800L720,-800C742,-800 760.833,-792.167 776.5,-776.5C792.167,-760.833 800,-742 800,-720L800,-614L877,-536C884.333,-528 890,-519.167 894,-509.5C898,-499.833 900,-490 900,-480C900,-470 898,-460.167 894,-450.5C890,-440.833 884.333,-432 877,-424L800,-346L800,-240C800,-218 792.167,-199.167 776.5,-183.5C760.833,-167.833 742,-160 720,-160L614,-160L536,-83C528,-75.667 519.167,-70 509.5,-66C499.833,-62 490,-60 480,-60C470,-60 460.167,-62 450.5,-66C440.833,-70 432,-75.667 424,-83L346,-160ZM380,-240L480,-140L580,-240L720,-240L720,-380L820,-480L720,-580L720,-720L580,-720L480,-820L380,-720L240,-720L240,-580L140,-480L240,-380L240,-240L380,-240Z',
  },
  ranked: {
    label: 'Ranked',
    diamondTransform: 'translate(-2143.391315,-1405.708717) translate(1415.282746,1263.41941) matrix(0.68217,0.68217,-0.68217,0.68217,595.194448,-1899.825564)',
    path1: 'M1623.982,1389.419C1624.477,1389.419 1624.951,1389.615 1625.301,1389.965C1625.651,1390.315 1625.848,1390.79 1625.848,1391.285L1625.848,1407.431C1625.848,1407.926 1625.651,1408.401 1625.301,1408.751C1624.951,1409.1 1624.477,1409.297 1623.982,1409.297C1620.191,1409.297 1611.626,1409.297 1607.835,1409.297C1607.34,1409.297 1606.866,1409.1 1606.516,1408.751C1606.166,1408.401 1605.969,1407.926 1605.969,1407.431L1605.969,1391.285C1605.969,1390.79 1606.166,1390.315 1606.516,1389.965C1606.866,1389.615 1607.34,1389.419 1607.835,1389.419L1623.982,1389.419Z',
    path2: 'M1623.982,1388.123C1624.82,1388.123 1625.624,1388.456 1626.217,1389.049C1626.81,1389.642 1627.143,1390.446 1627.143,1391.285L1627.143,1407.431C1627.143,1408.27 1626.81,1409.074 1626.217,1409.667C1625.624,1410.26 1624.82,1410.593 1623.982,1410.593L1607.835,1410.593C1606.997,1410.593 1606.193,1410.26 1605.6,1409.667C1605.007,1409.074 1604.674,1408.27 1604.674,1407.431L1604.674,1391.285C1604.674,1390.446 1605.007,1389.642 1605.6,1389.049C1606.193,1388.456 1606.997,1388.123 1607.835,1388.123L1623.982,1388.123ZM1623.982,1389.419L1607.835,1389.419C1607.34,1389.419 1606.866,1389.615 1606.516,1389.965C1606.166,1390.315 1605.969,1390.79 1605.969,1391.285L1605.969,1407.431C1605.969,1407.926 1606.166,1408.401 1606.516,1408.751C1606.866,1409.1 1607.34,1409.297 1607.835,1409.297L1623.982,1409.297C1624.477,1409.297 1624.951,1409.1 1625.301,1408.751C1625.651,1408.401 1625.848,1407.926 1625.848,1407.431L1625.848,1391.285C1625.848,1390.79 1625.651,1390.315 1625.301,1389.965C1624.951,1389.615 1624.477,1389.419 1623.982,1389.419Z',
    iconTransform: 'translate(-2143.391315,-1405.708717) translate(1415.282746,1263.41941) matrix(0.159809,0,0,0.159809,742.918835,157.660311) translate(-50,-50) matrix(0.104167,0,0,0.104167,0,100)',
    iconPath: 'M440,-200L440,-324C407.333,-331.333 378.167,-345.167 352.5,-365.5C326.833,-385.833 308,-411.333 296,-442C246,-448 204.167,-469.833 170.5,-507.5C136.833,-545.167 120,-589.333 120,-640L120,-680C120,-702 127.833,-720.833 143.5,-736.5C159.167,-752.167 178,-760 200,-760L280,-760C280,-782 287.833,-800.833 303.5,-816.5C319.167,-832.167 338,-840 360,-840L600,-840C622,-840 640.833,-832.167 656.5,-816.5C672.167,-800.833 680,-782 680,-760L760,-760C782,-760 800.833,-752.167 816.5,-736.5C832.167,-720.833 840,-702 840,-680L840,-640C840,-589.333 823.167,-545.167 789.5,-507.5C755.833,-469.833 714,-448 664,-442C652,-411.333 633.167,-385.833 607.5,-365.5C581.833,-345.167 552.667,-331.333 520,-324L520,-200L640,-200C651.333,-200 660.833,-196.167 668.5,-188.5C676.167,-180.833 680,-171.333 680,-160C680,-148.667 676.167,-139.167 668.5,-131.5C660.833,-123.833 651.333,-120 640,-120L320,-120C308.667,-120 299.167,-123.833 291.5,-131.5C283.833,-139.167 280,-148.667 280,-160C280,-171.333 283.833,-180.833 291.5,-188.5C299.167,-196.167 308.667,-200 320,-200L440,-200ZM280,-528L280,-680L200,-680L200,-640C200,-614.667 207.333,-591.833 222,-571.5C236.667,-551.167 256,-536.667 280,-528ZM565,-435C588.333,-458.333 600,-486.667 600,-520L600,-760L360,-760L360,-520C360,-486.667 371.667,-458.333 395,-435C418.333,-411.667 446.667,-400 480,-400C513.333,-400 541.667,-411.667 565,-435ZM680,-528C704,-536.667 723.333,-551.167 738,-571.5C752.667,-591.833 760,-614.667 760,-640L760,-680L680,-680L680,-528Z',
  },
};

export const BADGE_TYPE_LIST = Object.keys(BADGE_TYPES).map(key => ({ key, label: BADGE_TYPES[key].label }));

// Legendary uses ruby rather than the gold common/rare/epic would suggest —
// gold is already Emas's identity on the rank ladder, and a legendary
// achievement sitting right next to an Emas card would otherwise blend
// into it.
export const BADGE_RARITY_COLORS = {
  common: '#9aa0a6',
  rare: '#4a9eff',
  epic: '#b34aff',
  legendary: '#e0294b',
};

// Display label per rarity — kept separate from the `legendary` key itself
// (used in BADGE_RARITY_COLORS, stored achievement_badges rows, etc.) so
// relabeling it to "Legend" on screen doesn't touch the data model.
export const BADGE_RARITY_LABELS = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legend',
};

// Outline is a brightened tint of that same hue per tier (a darker rim read
// as an embossed edge, but made the icon glyph — which reuses this same
// color — hard to read against the fill); the icon glyph reuses this same
// outline color, so it stays part of the rim/frame rather than a
// separately-colored sticker on top.
const BADGE_OUTLINE_COLORS = {
  common: '#d5d8db',
  rare: '#8fc7ff',
  epic: '#dcaaff',
  legendary: '#ff96a8',
};

// Shine peaks with rarity — a common badge reads as flat, a legendary one
// visibly glints. Epic/legendary additionally sweep top-to-bottom (an SMIL
// animateTransform on the gradient itself) rather than sitting still: each
// cycle travels one way only (values has just a start and end point, so
// SMIL snaps back to the start for the next repeat instead of reversing),
// so it reads as one shine exiting the bottom and a fresh one entering from
// the top, not a back-and-forth bob. Epic and legendary share one duration
// (SHINE_DURATION) rather than each ticking at its own speed — two different
// periods only line up once every their-lengths'-LCM seconds, so every
// shimmering badge on a card needs the same period to actually stay in sync
// with the others, not just briefly coincide.
const SHINE_DURATION = 2.6;
const BADGE_SHINE = {
  common: { opacity: 0.08, shimmer: false },
  rare: { opacity: 0.25, shimmer: false },
  epic: { opacity: 0.35, shimmer: true },
  legendary: { opacity: 0.6, shimmer: true },
};

// A negative delay/begin-offset pinned to the wall clock (rather than 0,
// which starts counting from whenever an element happens to mount) puts
// every instance at the same point in its cycle — the phase only depends on
// the current time modulo the duration, not on mount order, so badges
// added, removed, or reordered (each remounts, e.g. via the admin editor)
// never drift out of sync with ones already on screen. Used for both the
// CSS float animation (as animation-delay) and the SMIL shine animation (as
// its begin offset — SMIL honors a negative begin the same way CSS honors a
// negative animation-delay).
function syncedDelay(durationS) {
  return -((Date.now() % (durationS * 1000)) / 1000);
}

// Shared by the crown star's idle bob and the achievement badges' idle bob
// (same keyframes, same duration, same syncedDelay call below) so the two
// float in lockstep — they used to drift apart because only the badges
// were wall-clock synced; the star free-ran from whenever it mounted.
const FLOAT_DURATION = 4;

export function getBadgeColors(rarity) {
  const outline = BADGE_OUTLINE_COLORS[rarity] || BADGE_OUTLINE_COLORS.common;
  return {
    fill: BADGE_RARITY_COLORS[rarity] || BADGE_RARITY_COLORS.common,
    outline,
    icon: outline,
  };
}

// memo — badges never depend on the card's tilt state, but every mousemove
// re-renders the whole FifaCard while dragging; without this each badge (its
// own <svg>, gradient, clipPath, and running shine animation) got rebuilt on
// every one of those frames for no visible change.
export const AchievementBadgeIcon = memo(function AchievementBadgeIcon({ type, rarity }) {
  const cfg = BADGE_TYPES[type];
  const uid = useId();
  if (!cfg) return null;
  const colors = getBadgeColors(rarity);
  const shine = BADGE_SHINE[rarity] || BADGE_SHINE.common;
  const shineId = `badgeShine${uid}`;
  const clipId = `badgeShineClip${uid}`;
  return (
    <svg viewBox="0 0 30 30" style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        {/* A finite bright band (0% and 100% both fully transparent) rather
            than a single fade-to-transparent stop — with only one transparent
            stop, SVG pads the *other* end with the bright color forever, so
            translating it revealed a diamond that looked fully lit instead of
            cleanly empty before the shine arrived. Symmetric stops mean both
            ends of the sweep are genuinely invisible, so the highlight
            visibly enters, crosses the gem, and fully exits before looping. */}
        <linearGradient id={shineId} x1="10%" y1="0%" x2="60%" y2="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity={shine.opacity} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Epic/legendary clip the gradient to the gem's own outline so the
            band below can be swept across it. */}
        {shine.shimmer && (
          <clipPath id={clipId}>
            <path d={cfg.path1} />
          </clipPath>
        )}
      </defs>
      <g transform={cfg.diamondTransform}>
        <path d={cfg.path1} fill={colors.fill} />
        <path d={cfg.path2} fill={colors.outline} fillRule="evenodd" />
        {shine.shimmer ? (
          // Sweeping the gradient itself used SMIL (animateTransform) with a
          // negative `begin` offset to phase-sync every badge to the wall
          // clock — WebKit doesn't reliably honor a negative SMIL begin, so
          // on iOS the animation silently never started at all. Moving the
          // gradient-filled rect with a plain CSS animation instead (clipped
          // to the gem's outline) gets the same sweep, and CSS honors a
          // negative animation-delay everywhere, same as fifaCardFloat below.
          <g clipPath={`url(#${clipId})`}>
            <rect
              x="1605.969" y="1389.419" width="19.879" height="19.878"
              fill={`url(#${shineId})`}
              style={{
                animation: `badgeShineSweep ${SHINE_DURATION}s linear infinite`,
                animationDelay: `${syncedDelay(SHINE_DURATION)}s`,
              }}
            />
          </g>
        ) : (
          <path d={cfg.path1} fill={`url(#${shineId})`} />
        )}
      </g>
      {shine.shimmer && (
        <style>{`
          @keyframes badgeShineSweep {
            0%   { transform: translate(0px, -29.8px); }
            100% { transform: translate(0px, 29.8px); }
          }
        `}</style>
      )}
      <g transform={cfg.iconTransform}>
        <path d={cfg.iconPath} fill={colors.icon} fillRule="nonzero" />
      </g>
    </svg>
  );
});

export default function FifaCard({ profile, cardStats, rank, size = 'normal', onAvatarClick, customTheme, badge, achievementBadges, interactive = false, memberSince }) {
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  // Touch/trackpad drags and raw mousemove can fire far more often than the
  // screen can paint (mobile Safari especially bursts these) — a coarse
  // pointer is also almost always weaker hardware, exactly where the sheen's
  // blur (see sheenBlurEnabled below) is most expensive to keep re-rendering.
  const [isCoarsePointer] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 30, active: false });
  const tiltOn = interactive && !reducedMotion;

  const applyTiltAt = (clientX, clientY, rect) => {
    // Clamped to [0,1] — a drag that continues past the card's own edge
    // (e.g. toward the screen edge) would otherwise push px/py, and so
    // rx/ry, arbitrarily far past their intended ±9deg max, which then had
    // to unwind on release at the same time the flip's own rotation was
    // animating and made the two rotations visibly fight each other.
    const px = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const maxTilt = 9;
    setTilt({ rx: (0.5 - py) * maxTilt * 2, ry: (px - 0.5) * maxTilt * 2, mx: px * 100, my: py * 100, active: true });
  };
  // Pointer/touch move events can fire many times per animation frame — each
  // one triggering a setTilt (and so a re-render of the whole card, badges
  // included) was doing several times the work the screen could ever show.
  // Collapsing every move within a frame down to one setTilt call, right
  // before that frame paints, caps the update rate at the screen's own
  // refresh rate no matter how chatty the input events are.
  const tiltRAF = useRef(null);
  useEffect(() => () => { if (tiltRAF.current) cancelAnimationFrame(tiltRAF.current); }, []);
  const scheduleTiltAt = (clientX, clientY, rect) => {
    if (tiltRAF.current) cancelAnimationFrame(tiltRAF.current);
    tiltRAF.current = requestAnimationFrame(() => {
      tiltRAF.current = null;
      applyTiltAt(clientX, clientY, rect);
    });
  };
  const handleTiltMove = (e) => {
    if (!tiltOn) return;
    scheduleTiltAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  };
  const handleTiltLeave = () => {
    if (!tiltOn) return;
    if (tiltRAF.current) { cancelAnimationFrame(tiltRAF.current); tiltRAF.current = null; }
    setTilt(t => ({ ...t, rx: 0, ry: 0, active: false }));
  };
  // Touch equivalent — a finger dragged across the card tilts it the same
  // way a mouse hover does, since touch devices never fire mouse events.
  // touch-action:none on the wrapper (below) stops the browser from
  // scrolling the page while a drag is in progress on the card itself.
  const handleTiltTouchMove = (e) => {
    if (!tiltOn) return;
    const touch = e.touches[0];
    if (!touch) return;
    scheduleTiltAt(touch.clientX, touch.clientY, e.currentTarget.getBoundingClientRect());
  };

  // Swipe-to-flip — a horizontal drag past SWIPE_THRESHOLD spins the card
  // another half-turn in the direction of the swipe (right swipe always
  // adds +180deg, left swipe always adds -180deg), rather than snapping
  // back — so two swipes the same way spin all the way around to the front
  // again instead of un-flipping. `rotation` accumulates unbounded; CSS
  // rotateY renders any multiple of 360 as the front and any odd multiple
  // of 180 as the back, so no wraparound/normalization is needed here.
  // Tracked separately from the tilt touch handlers above since flip should
  // work even when tilt is off (reducedMotion), and uses touchend rather
  // than touchmove so it fires once per gesture instead of fighting the
  // tilt's continuous updates.
  const SWIPE_THRESHOLD = 40;
  const [rotation, setRotation] = useState(0);
  const flipped = (rotation / 180) % 2 !== 0;
  // A drag that ends right as a flip triggers usually still has some tilt
  // (rx/ry) applied — normally that eases back to 0 over the slow 0.6s
  // "released" transition below, which was overlapping with the flip's own
  // 0.7s rotateY and made the two rotations (they share the Y axis, so
  // their angles just add together) visibly fight, occasionally reading as
  // spinning the wrong way on a fast edge-to-edge swipe. Snapping tilt to 0
  // with no transition the instant a flip fires removes the second
  // rotation from the animation entirely, leaving only the flip's.
  const [suppressTiltTransition, setSuppressTiltTransition] = useState(false);
  useEffect(() => {
    if (!suppressTiltTransition) return;
    const id = requestAnimationFrame(() => setSuppressTiltTransition(false));
    return () => cancelAnimationFrame(id);
  }, [suppressTiltTransition]);
  // Tracks the specific finger (by touch identifier) that started the
  // swipe, not just "whatever touch is at index 0" — a second finger
  // brushing the screen mid-gesture (easy to do near a card's edge while
  // holding the phone) fires its own touchstart/touchend, and reading
  // touches[0]/changedTouches[0] blindly could mix that second finger's
  // start or end point into the gesture, producing a near-random dx sign
  // and an occasional wrong-direction flip.
  const flipTouchStart = useRef(null);
  const handleFlipTouchStart = (e) => {
    if (flipTouchStart.current) return; // already tracking a finger — ignore any other one that touches down
    const touch = e.touches[0];
    if (!touch) return;
    flipTouchStart.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
  };
  const handleFlipTouchEnd = (e) => {
    const start = flipTouchStart.current;
    if (!start) return;
    let touch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === start.id) { touch = e.changedTouches[i]; break; }
    }
    if (!touch) return; // this touchend belongs to a different finger — keep waiting for ours
    flipTouchStart.current = null;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      // Swallows the synthetic click iOS/Android fire after touchend, so a
      // flip swipe on the profile card doesn't also trigger the card-tap
      // "open share modal" handler some pages wrap this component in.
      e.preventDefault();
      setSuppressTiltTransition(true);
      setTilt(t => ({ ...t, rx: 0, ry: 0, active: false }));
      // Which sign reads as "correct" for a given swipe direction is a
      // judgment call about the animation, not something provable from the
      // math — if a clean single-finger swipe still spins the wrong way,
      // swap the 180/-180 below (this exact line is the only thing that
      // needs to change).
      setRotation(r => r + (dx > 0 ? 180 : -180));
    }
  };
  const handleFlipTouchCancel = (e) => {
    // If the tracked finger is the one that got cancelled (e.g. the OS
    // intercepted it for a system gesture), stop tracking it so the next
    // real gesture isn't ignored by the "already tracking" guard above.
    const start = flipTouchStart.current;
    if (!start) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === start.id) { flipTouchStart.current = null; return; }
    }
  };

  // Mouse equivalent of the swipe-to-flip above, for laptop/desktop users
  // with no touchscreen. Tracked with a window-level mouseup listener
  // (rather than onMouseUp on the card itself) so a drag that's released
  // past the card's edge — easy to do on a fast swipe — still completes the
  // gesture instead of being silently dropped.
  const flipMouseStart = useRef(null);
  const activeFlipMouseUpListener = useRef(null);
  const handleFlipMouseUp = (e) => {
    window.removeEventListener('mouseup', handleFlipMouseUp);
    activeFlipMouseUpListener.current = null;
    const start = flipMouseStart.current;
    flipMouseStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      // Unlike touchend, preventDefault() on mouseup doesn't stop the click
      // event mouseup+mousedown-on-the-same-target normally synthesizes
      // next — swallow that one click at the window (capture phase, so it
      // never reaches the page's own onClick) so a flip swipe doesn't also
      // trigger whatever "open share modal" handler wraps this card.
      const swallowClick = (ce) => { ce.stopPropagation(); ce.preventDefault(); };
      window.addEventListener('click', swallowClick, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 350);
      setSuppressTiltTransition(true);
      setTilt(t => ({ ...t, rx: 0, ry: 0, active: false }));
      setRotation(r => r + (dx > 0 ? 180 : -180));
    }
  };
  const handleFlipMouseDown = (e) => {
    if (!interactive) return;
    if (e.button !== 0) return; // left button / primary touch-pad click only
    flipMouseStart.current = { x: e.clientX, y: e.clientY };
    activeFlipMouseUpListener.current = handleFlipMouseUp;
    window.addEventListener('mouseup', handleFlipMouseUp);
  };
  // window listeners aren't DOM nodes React owns, so they outlive an unmount
  // mid-drag (e.g. navigating away while still holding the mouse button)
  // unless cleaned up explicitly here.
  useEffect(() => () => {
    if (activeFlipMouseUpListener.current) window.removeEventListener('mouseup', activeFlipMouseUpListener.current);
  }, []);

  const rankTheme = getCardTheme(rank);
  const theme = customTheme
    ? { bg: customTheme.bg, border: customTheme.border, text: customTheme.text, muted: customTheme.muted, statBg: customTheme.statBg }
    : rankTheme;

  const isSmall = size === 'small';
  const w = isSmall ? 140 : 220;
  const h = isSmall ? 210 : 330;
  const isSubscribed = profile?.is_subscribed && profile?.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date();
  // Sourced from the Auth user's created_at (passed in by the caller), not
  // profile.created_at — the profiles table column of that name has no DB
  // default and nothing in signup ever sets it, so it's null for most
  // accounts; the Auth user's own created_at is always populated.
  const memberSinceDate = formatMemberSinceDate(memberSince);

  // Color decides which of the four base outlines is used; sub-tier (I/II/III,
  // read off the rank's numeral suffix) decides the star count/arrangement
  // layered on top of it — Novis has no sub-tier, so it never gets a star.
  // A rank with no recognized color at all (unranked/missing) isn't one of
  // the four shapes — it stays a plain rounded rect, same as a
  // user-customized card.
  const colorKey = getCardColorKey(rank);
  const subTier = getCardSubTier(rank);
  const useShapedCard = !customTheme && !!colorKey;
  const shapeDef = colorKey ? CARD_SHAPES[colorKey] : null;
  const starSetKey = colorKey && subTier ? STAR_SET_FOR_RANK[colorKey][subTier] : null;
  const starSet = starSetKey ? STAR_SETS[starSetKey] : null;
  const starPlacement = colorKey && subTier ? STAR_PLACEMENT[`${colorKey}-${subTier}`] : null;
  // Forces the star and every badge to remount together (see the `key`
  // props below) whenever the achievement set actually changes — reorder,
  // enable/disable, or rarity. A reorder only changes the array index of
  // whichever badges moved, so keying badges by index alone left untouched
  // ones running their old animation instance while moved ones restarted,
  // and the star (unaffected either way) never restarted at all — three
  // different start times fighting the same wall-clock sync. Remounting
  // everyone at once gives them one shared, freshly-computed syncedDelay
  // instead of relying on a live animation-delay update to resync an
  // already-running animation, which browsers don't reliably honor.
  const achievementResetKey = JSON.stringify(achievementBadges || []);

  const shapeScale = useShapedCard ? w / CARD_RECT_WIDTH : 0;
  const shapeCrownOffset = useShapedCard ? shapeDef.topEdgeY * shapeScale : 0;
  // If a star's placement pokes above the shape's own y=0 (a negative top),
  // reserve that much extra space above everything so it isn't clipped.
  const starOverflowTop = useShapedCard && starPlacement ? Math.max(0, -starPlacement.top) * shapeScale : 0;
  // Each shape keeps its own true (unstretched) proportions, so the body
  // height genuinely differs a little per color — the content box matches
  // that real extent rather than a fixed constant, so nothing clips.
  const bodyH = useShapedCard ? (shapeDef.viewBoxH - shapeDef.topEdgeY) * shapeScale : h;
  const contentLayout = CONTENT_LAYOUT[colorKey || 'default'];
  const sz = isSmall ? 's' : 'n';
  // Content is bottom-anchored (see CONTENT_LAYOUT above), so it never needs
  // to float above the body's own top — only the star does.
  const headroomTop = starOverflowTop;
  const shapeGradStops = theme.bg.match(/#[0-9a-fA-F]{3,8}/g) || ['#2a2d30', '#3d4144', '#2a2d30'];

  const glowEnabled = customTheme?.glowEnabled;
  const glowColor   = customTheme?.glowColor || theme.border;
  const foilEnabled = customTheme?.foilEnabled;
  const badgeColor  = customTheme?.badgeColor || theme.border;

  const boxShadow = glowEnabled
    ? `0 0 ${isSmall ? 14 : 28}px ${glowColor}cc, 0 0 ${isSmall ? 32 : 64}px ${glowColor}55, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)`
    : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)';

  // The shaped cards (Novis/Gangsa/Perak/Emas) can't use `box-shadow` — the
  // crown flourish pokes past a rectangular box, so a rect shadow would
  // either clip the crown's shadow or spill past the body's corners. A CSS
  // `filter: drop-shadow(...)` instead follows the SVG's own silhouette.
  // Two layered shadows (tight contact + soft ambient) read as more
  // premium than one flat blur — a common elevation trick. Applied directly
  // on the root <svg> (not a nested path), so the offsets are real CSS
  // pixels and need no shapeScale conversion, unlike the stroke width below.
  // Deepens on tilt.active to sell the same "lifting off the table" cue the
  // cursor-tracked sheen already gives, so the shadow reacts in lockstep.
  const shapeDropShadow = tiltOn && tilt.active
    ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.4)) drop-shadow(0 18px 28px rgba(0,0,0,0.45))'
    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35)) drop-shadow(0 10px 18px rgba(0,0,0,0.4))';

  // Perak/Emas run lighter overall (silver/gold) than Gangsa's bronze, so
  // the same sheen opacity reads as fainter against them — bumped up to
  // stay equally visible.
  const sheenPeakOpacity = colorKey === 'perak' || colorKey === 'emas' ? 0.65 : 0.32;
  // The blur is what makes the sheen read as soft light instead of a crisp
  // spotlight, but a blurred region has to be fully re-rendered every time
  // its input moves — on a coarse-pointer (touch) device that's every drag
  // frame, on hardware that can least afford it. The graduated gradient
  // stops alone (still applied either way, see below) already do most of
  // the softening cheaply, so touch devices just skip this extra layer.
  const sheenBlurEnabled = tiltOn && !isCoarsePointer;

  const patternStyle = customTheme?.pattern && customTheme.pattern !== 'none'
    ? patternBgStyle(customTheme.pattern, customTheme.patternColor, customTheme.patternOpacity, theme.bg)
    : null;

  return (
    <div
      onMouseMove={tiltOn ? handleTiltMove : undefined}
      onMouseLeave={tiltOn ? handleTiltLeave : undefined}
      onMouseDown={interactive ? handleFlipMouseDown : undefined}
      onTouchStart={(e) => { if (tiltOn) handleTiltTouchMove(e); if (interactive) handleFlipTouchStart(e); }}
      onTouchMove={tiltOn ? handleTiltTouchMove : undefined}
      onTouchEnd={(e) => { if (tiltOn) handleTiltLeave(); if (interactive) handleFlipTouchEnd(e); }}
      onTouchCancel={(e) => { if (tiltOn) handleTiltLeave(); if (interactive) handleFlipTouchCancel(e); }}
      style={{
        width: w, height: bodyH + shapeCrownOffset + headroomTop, position: 'relative', flexShrink: 0,
        perspective: 1000,
        ...(interactive ? { cursor: 'grab', WebkitUserSelect: 'none', userSelect: 'none' } : null),
        ...(tiltOn ? {
          transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.active ? 1.035 : 1})`,
          transition: suppressTiltTransition ? 'none' : (tilt.active ? 'transform 0.08s linear' : 'transform 0.6s cubic-bezier(0.22,1,0.36,1)'),
          willChange: 'transform',
          touchAction: 'none',
        } : null),
      }}
    >
    {/* Flip container — rotates 180deg on swipe. The card shape+content
        (front) and the plain back live inside as backface-hidden panes; the
        crown star and achievement badges are rendered outside this
        container further down so they don't rotate with the card (star
        stays put per design; badges fade instead — see below). */}
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
      transform: `rotateY(${rotation}deg)`,
      transition: reducedMotion ? 'none' : 'transform 0.7s cubic-bezier(0.22,1,0.36,1)',
    }}>
    {/* translateZ(1px) — Safari sometimes lets a backface-hidden pane show
        through anyway when it (or a descendant, here the shape SVG's own
        drop-shadow filter) shares exactly the same z=0 plane as the other
        pane; nudging each face its own hair's-width off that plane forces
        them onto separate compositing layers and reliably fixes it — this
        is what was showing the front's (mirrored) text through the back. */}
    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'translateZ(1px)', WebkitTransform: 'translateZ(1px)' }}>
    {useShapedCard && (
      <>
        <svg
          width={shapeDef.viewBoxW * shapeScale} height={shapeDef.viewBoxH * shapeScale}
          viewBox={`0 0 ${shapeDef.viewBoxW} ${shapeDef.viewBoxH}`}
          style={{ position: 'absolute', top: headroomTop, left: -shapeDef.rectLeftX * shapeScale, overflow: 'visible', filter: shapeDropShadow, transition: 'filter 0.3s' }}
        >
          <defs>
            <linearGradient id={`cardShapeGrad-${colorKey}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={shapeGradStops[0]} />
              <stop offset="50%" stopColor={shapeGradStops[1]} />
              <stop offset="100%" stopColor={shapeGradStops[2]} />
            </linearGradient>
            {tiltOn && (
              // userSpaceOnUse (with one radius reused for both axes) rather
              // than the default objectBoundingBox — the shape's bounding
              // box is much taller than wide, so a percentage radius there
              // gets stretched non-uniformly into an oval. Radius is a
              // fraction of viewBoxW specifically (not some blend with
              // height) so the highlight keeps the same size it always had.
              // Multiple graduated stops (rather than a hard peak-then-fade)
              // plus the feGaussianBlur below on the path itself, so the
              // highlight reads as a soft diffuse sheen instead of a crisp
              // spotlight — a wider radius spreads it further across the
              // card too.
              <radialGradient
                id={`cardSheen-${colorKey}`}
                gradientUnits="userSpaceOnUse"
                cx={(tilt.mx / 100) * shapeDef.viewBoxW} cy={(tilt.my / 100) * shapeDef.viewBoxH}
                r={shapeDef.viewBoxW * 0.9}
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={tilt.active ? sheenPeakOpacity : 0} style={{ transition: 'stop-opacity 0.3s' }} />
                <stop offset="18%" stopColor="#ffffff" stopOpacity={tilt.active ? sheenPeakOpacity * 0.55 : 0} style={{ transition: 'stop-opacity 0.3s' }} />
                <stop offset="45%" stopColor="#ffffff" stopOpacity={tilt.active ? sheenPeakOpacity * 0.18 : 0} style={{ transition: 'stop-opacity 0.3s' }} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            )}
            {sheenBlurEnabled && (
              <filter id={`cardSheenBlur-${colorKey}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation={shapeDef.viewBoxW * 0.035} />
              </filter>
            )}
            {/* Baked into the shape itself (rather than a separate div over just
                the body) so the highlight sweeps continuously across the crown
                and body as one silhouette, with no seam at their boundary. */}
            <linearGradient id="cardShapeShine" x1="10%" y1="0%" x2="60%" y2="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={shapeDef.path} fill={`url(#cardShapeGrad-${colorKey})`} />
          <path d={shapeDef.path} fill="url(#cardShapeShine)" />
          {/* Cursor-tracked specular highlight — filled through the exact
              same silhouette, so its only escape past the card's real edge
              is the soft blur bloom itself, not the highlight's hard shape. */}
          {tiltOn && <path d={shapeDef.path} fill={`url(#cardSheen-${colorKey})`} filter={sheenBlurEnabled ? `url(#cardSheenBlur-${colorKey})` : undefined} pointerEvents="none" />}
          {/* Stroke drawn as its own pass, on top, so the shine doesn't wash it out.
              Divided by shapeScale so the rendered stroke is always 2 physical
              pixels — matching the Novis card's flat `2px solid` CSS border —
              rather than 2 viewBox units that shrink along with the SVG. */}
          <path d={shapeDef.path} fill="none" stroke={theme.border} strokeWidth={1.7 / shapeScale} />
        </svg>
      </>
    )}
    <div style={{
      position: useShapedCard ? 'absolute' : 'relative',
      top: useShapedCard ? headroomTop + shapeCrownOffset : undefined,
      left: useShapedCard ? 0 : undefined,
      width: useShapedCard ? w : '100%', height: useShapedCard ? bodyH : '100%',
      borderRadius: isSmall ? 10 : 16,
      ...(useShapedCard ? {} : (patternStyle || { background: theme.bg })),
      border: useShapedCard ? 'none' : `2px solid ${theme.border}`,
      boxShadow: useShapedCard ? 'none' : boxShadow,
      overflow: 'hidden',
      fontFamily: "'DM Sans'",
    }}>

      {/* Foil shimmer */}
      {foilEnabled && (
        <>
          <style>{`
            @keyframes foilShimmer {
              0%   { background-position: 0% 50%;   }
              50%  { background-position: 100% 50%; }
              100% { background-position: 0% 50%;   }
            }
          `}</style>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit', zIndex: 5,
            background: 'linear-gradient(135deg, rgba(255,0,0,0.12), rgba(255,150,0,0.12), rgba(255,255,0,0.12), rgba(0,255,100,0.12), rgba(0,150,255,0.12), rgba(150,0,255,0.12), rgba(255,0,150,0.12))',
            backgroundSize: '300% 300%',
            animation: 'foilShimmer 4s ease infinite',
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }} />
        </>
      )}

      {/* Decorative element overlay — topmost layer */}
      {customTheme && (customTheme.elemCorners || customTheme.elemSideBars || customTheme.elemCenterDiamond || customTheme.elemFrame) && (() => {
        const c   = customTheme.elemColor   || '#ffffff';
        const op  = customTheme.elemOpacity ?? 0.3;
        const arm = isSmall ? 10 : 16;
        const pad = isSmall ?  7 : 11;
        const sw  = isSmall ?  1 :  1.5;
        const ds  = isSmall ?  3 :  5;
        const divY = h * 0.552;
        return (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 6, pointerEvents: 'none', opacity: op }}
            fill="none" strokeLinecap="round"
          >
            {customTheme.elemCorners && (
              <g stroke={c} strokeWidth={sw}>
                <path d={`M ${pad + arm} ${pad} H ${pad} V ${pad + arm}`} />
                <path d={`M ${w - pad - arm} ${pad} H ${w - pad} V ${pad + arm}`} />
                <path d={`M ${pad + arm} ${h - pad} H ${pad} V ${h - pad - arm}`} />
                <path d={`M ${w - pad - arm} ${h - pad} H ${w - pad} V ${h - pad - arm}`} />
              </g>
            )}
            {customTheme.elemSideBars && (
              <g stroke={c} strokeWidth={sw * 0.7} strokeDasharray={isSmall ? '3 5' : '4 7'}>
                <line x1={pad - 2} y1={h * 0.22} x2={pad - 2} y2={h * 0.78} />
                <line x1={w - pad + 2} y1={h * 0.22} x2={w - pad + 2} y2={h * 0.78} />
              </g>
            )}
            {customTheme.elemCenterDiamond && (
              <polygon
                fill={c}
                points={`${w/2},${divY - ds} ${w/2 + ds},${divY} ${w/2},${divY + ds} ${w/2 - ds},${divY}`}
              />
            )}
            {customTheme.elemFrame && (
              <rect x={6} y={6} width={w - 12} height={h - 12} rx={isSmall ? 6 : 10} stroke={c} strokeWidth={sw * 0.7} />
            )}
          </svg>
        );
      })()}

      {/* Icon sticker */}
      {customTheme?.stickerIcon && customTheme.stickerIcon !== 'none' && (() => {
        const icon = STICKER_ICONS.find(i => i.key === customTheme.stickerIcon);
        if (!icon) return null;
        const pos  = getStickerPos(customTheme.stickerPos, w, h);
        const size = customTheme.stickerSize ?? 36;
        const col  = customTheme.stickerColor || '#ffffff';
        const op   = customTheme.stickerOpacity ?? 0.9;
        return (
          <svg
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: pos.x - size / 2,
              top:  pos.y - size / 2,
              width: size, height: size,
              zIndex: 7, pointerEvents: 'none',
              opacity: op,
              filter: `drop-shadow(0 1px ${Math.round(size * 0.18)}px ${col}77)`,
              overflow: 'visible',
            }}
            fill={col}
          >
            <path d={icon.d} />
          </svg>
        );
      })()}

      {/* Shine overlay — shaped cards already get an equivalent highlight baked
          into the crown SVG shape itself, continuous across the whole silhouette. */}
      {!useShapedCard && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}

      {/* Cursor-tracked specular highlight for plain (customTheme) cards —
          shaped cards get the equivalent baked into their own SVG path instead. */}
      {!useShapedCard && tiltOn && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit',
          // Graduated stops (instead of one hard peak-to-transparent step)
          // plus a real blur, so this reads as a soft diffuse sheen rather
          // than a crisp circular spotlight — the parent's overflow:hidden
          // clips the blur's bloom at the card's own rounded edge.
          background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,${tilt.active ? 0.32 : 0}) 0%, rgba(255,255,255,${tilt.active ? 0.32 * 0.55 : 0}) 18%, rgba(255,255,255,${tilt.active ? 0.32 * 0.18 : 0}) 45%, transparent 85%)`,
          filter: sheenBlurEnabled ? 'blur(9px)' : undefined,
          transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: 5,
        }} />
      )}

      {/* OVR number — top left */}
      <div style={{ position: 'absolute', bottom: isSmall ? contentLayout.ovrBottom.s : contentLayout.ovrBottom.n, left: isSmall ? 8 : 14, transform: `translateX(${isSmall ? contentLayout.ovrLeft.s : contentLayout.ovrLeft.n}px)`, zIndex: 3 }}>
        <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 28 : 44, color: theme.text, lineHeight: 1, letterSpacing: 1 }}>
          {calcOverall(cardStats)}
        </div>
      </div>

      {/* Position abbreviation — independently positioned from the OVR number */}
      <div style={{ position: 'absolute', bottom: isSmall ? contentLayout.posBottom.s : contentLayout.posBottom.n, left: isSmall ? 8 : 14, transform: `translateX(${isSmall ? contentLayout.posLeft.s : contentLayout.posLeft.n}px)`, zIndex: 3 }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 7 : 11, color: theme.text, fontWeight: 700, letterSpacing: 1 }}>
          {POSITION_ABBR[profile?.position] || profile?.position || 'POS'}
        </div>
      </div>

      {/* Top right — badge label + rank, or rank alone */}
      <div style={{ position: 'absolute', bottom: isSmall ? contentLayout.rankBottom.s : contentLayout.rankBottom.n, right: isSmall ? 8 : 12, transform: `translateX(${isSmall ? contentLayout.rankLeft.s : contentLayout.rankLeft.n}px)`, zIndex: 3, textAlign: 'right' }}>
        {badge ? (
          <div>
            <div style={{
              fontFamily: "'Bebas Neue'",
              fontSize: isSmall ? 9 : 14,
              letterSpacing: 1.5,
              color: badgeColor,
              background: `${badgeColor}22`,
              border: `1px solid ${badgeColor}70`,
              borderRadius: 3,
              padding: isSmall ? '1px 4px' : '2px 8px',
              marginBottom: isSmall ? 1 : 3,
              lineHeight: 1.2,
              display: 'inline-block',
            }}>{badge}</div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 6 : 9, color: theme.muted, letterSpacing: 1 }}>
              {rank}
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 7 : 10, color: theme.muted, letterSpacing: 1 }}>
            {rank}
          </div>
        )}
      </div>

      {/* Avatar */}
      <div
        onClick={!isSmall && onAvatarClick ? (e) => { e.stopPropagation(); onAvatarClick(e); } : undefined}
        style={{
          position: 'absolute',
          bottom: isSmall ? contentLayout.avatarBottom.s : contentLayout.avatarBottom.n,
          left: '50%', transform: `translateX(calc(-50% + ${isSmall ? contentLayout.avatarLeft.s : contentLayout.avatarLeft.n}px))`,
          width: isSmall ? 68 : 108, height: isSmall ? 68 : 108,
          borderRadius: '50%', overflow: 'hidden',
          border: `${isSmall ? 2 : 3}px solid ${theme.border}`,
          background: theme.statBg, zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: !isSmall && onAvatarClick ? 'pointer' : 'default',
        }}
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <span style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 18 : 28, fontWeight: 700, color: theme.text }}>
              {(profile?.name?.[0] || '?').toUpperCase()}
            </span>
        }
        {!isSmall && onAvatarClick && (
          <div className="avatar-hover-overlay" style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            opacity: 0, transition: 'opacity 0.2s',
          }}>
            <IoCameraOutline size={20} />
            {isSubscribed && (
              <span style={{ fontSize: 8, fontFamily: "'Space Mono'", fontWeight: 700, letterSpacing: 1, background: '#4a9eff', color: '#fff', borderRadius: 3, padding: '2px 5px' }}>GIF</span>
            )}
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        position: 'absolute', bottom: isSmall ? contentLayout.nameBottom.s : contentLayout.nameBottom.n,
        left: 0, right: 0, transform: `translateX(${isSmall ? contentLayout.nameLeft.s : contentLayout.nameLeft.n}px)`, zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: isSmall ? 2 : 4, padding: `0 ${isSmall ? 4 : 8}px`,
      }}>
        <span style={{ fontFamily: "'Bebas Neue'", fontSize: isSmall ? 11 : 17, color: theme.text, letterSpacing: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {profile?.name || 'PLAYER'}
        </span>
        {isSubscribed && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: isSmall ? 9 : 14, height: isSmall ? 9 : 14, borderRadius: '50%', background: '#4a9eff', flexShrink: 0, color: '#fff', lineHeight: 1 }}>
            <IoCheckmark size={isSmall ? 5 : 9} />
          </span>
        )}
      </div>

      {/* Stats 3×2 grid */}
      <div style={{
        position: 'absolute', bottom: isSmall ? contentLayout.statsBottom.s : contentLayout.statsBottom.n,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10, transform: `translateX(${isSmall ? contentLayout.statsLeft.s : contentLayout.statsLeft.n}px)`,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: isSmall ? 2 : 4, zIndex: 3,
      }}>
        {STATS.map(s => (
          <div key={s.key} style={{ background: theme.statBg, borderRadius: isSmall ? 3 : 5, padding: isSmall ? '2px' : '4px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 9 : 14, fontWeight: 700, color: theme.text, lineHeight: 1 }}>
              {cardStats[s.key] || 0}
            </div>
            <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted, letterSpacing: 0.5, marginTop: 1 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{
        position: 'absolute', bottom: isSmall ? 5 : 8,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
        display: 'flex', justifyContent: 'space-between', zIndex: 3,
        borderTop: `1px solid ${theme.border}55`, paddingTop: isSmall ? 3 : 5,
      }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{profile?.games_played || 0}</span> GAMES PLAYED
        </div>
      </div>
    </div>
    </div>
    {/* Back face — same silhouette/gradient/border as the front, plus a
        skill-graph radar built from the front's own stats (below). */}
    <div style={{
      position: 'absolute', inset: 0,
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      transform: 'rotateY(180deg) translateZ(1px)',
      WebkitTransform: 'rotateY(180deg) translateZ(1px)',
    }}>
      {useShapedCard ? (
        <svg
          width={shapeDef.viewBoxW * shapeScale} height={shapeDef.viewBoxH * shapeScale}
          viewBox={`0 0 ${shapeDef.viewBoxW} ${shapeDef.viewBoxH}`}
          style={{ position: 'absolute', top: headroomTop, left: -shapeDef.rectLeftX * shapeScale, overflow: 'visible', filter: shapeDropShadow, transition: 'filter 0.3s' }}
        >
          <defs>
            <linearGradient id={`cardBackGrad-${colorKey}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={shapeGradStops[0]} />
              <stop offset="50%" stopColor={shapeGradStops[1]} />
              <stop offset="100%" stopColor={shapeGradStops[2]} />
            </linearGradient>
            {/* Own id (not the front's cardSheen-${colorKey}) even though the
                math is identical — an SVG id has to be unique per document,
                and front+back are both always in the DOM at once (just
                backface-hidden), not swapped in and out. */}
            {tiltOn && (
              <radialGradient
                id={`cardBackSheen-${colorKey}`}
                gradientUnits="userSpaceOnUse"
                cx={(tilt.mx / 100) * shapeDef.viewBoxW} cy={(tilt.my / 100) * shapeDef.viewBoxH}
                r={shapeDef.viewBoxW * 0.9}
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity={tilt.active ? sheenPeakOpacity : 0} style={{ transition: 'stop-opacity 0.3s' }} />
                <stop offset="18%" stopColor="#ffffff" stopOpacity={tilt.active ? sheenPeakOpacity * 0.55 : 0} style={{ transition: 'stop-opacity 0.3s' }} />
                <stop offset="45%" stopColor="#ffffff" stopOpacity={tilt.active ? sheenPeakOpacity * 0.18 : 0} style={{ transition: 'stop-opacity 0.3s' }} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            )}
            {sheenBlurEnabled && (
              <filter id={`cardBackSheenBlur-${colorKey}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation={shapeDef.viewBoxW * 0.035} />
              </filter>
            )}
          </defs>
          <path d={shapeDef.path} fill={`url(#cardBackGrad-${colorKey})`} />
          {/* cardShapeShine is defined once, in the front svg's own defs —
              referencing it here works fine since SVG id references resolve
              document-wide, not just within the <svg> that declared them. */}
          <path d={shapeDef.path} fill="url(#cardShapeShine)" />
          {tiltOn && <path d={shapeDef.path} fill={`url(#cardBackSheen-${colorKey})`} filter={sheenBlurEnabled ? `url(#cardBackSheenBlur-${colorKey})` : undefined} pointerEvents="none" />}
          <path d={shapeDef.path} fill="none" stroke={theme.border} strokeWidth={1.7 / shapeScale} />
        </svg>
      ) : (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: isSmall ? 10 : 16,
          background: theme.bg, border: `2px solid ${theme.border}`,
          boxShadow, overflow: 'hidden',
        }}>
          {tiltOn && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(255,255,255,${tilt.active ? 0.32 : 0}) 0%, rgba(255,255,255,${tilt.active ? 0.32 * 0.55 : 0}) 18%, rgba(255,255,255,${tilt.active ? 0.32 * 0.18 : 0}) 45%, transparent 85%)`,
              filter: sheenBlurEnabled ? 'blur(9px)' : undefined,
              transition: 'opacity 0.3s', pointerEvents: 'none',
            }} />
          )}
        </div>
      )}
      {/* Skill graph — the same six stats/labels as the front's 3x2 grid,
          plotted as a hexagon radar instead. Centered in the same body
          rect the front's content uses (bodyH x w), so it lines up
          identically on shaped and plain cards. Grid + fill both use
          theme.text (not theme.border): border is the rank's own hue,
          which on Emas/Perak is close to the background color itself and
          would nearly disappear as a fill — text is already the color
          this exact theme guarantees readable against its own card. */}
      {(() => {
        const n = STATS.length;
        const R = w * 0.25;
        const cx = w / 2;
        const cy = bodyH / 2;
        const STAT_MAX = 100;
        const angleFor = (i) => (-90 + i * (360 / n)) * (Math.PI / 180);
        const pointAt = (i, r) => {
          const a = angleFor(i);
          return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
        };
        const dataPoints = STATS.map((s, i) => pointAt(i, R * Math.min(1, (cardStats[s.key] || 0) / STAT_MAX)));
        const gridLevels = [0.25, 0.5, 0.75, 1];
        const labelOffset = isSmall ? 10 : 18;
        const fontSize = isSmall ? 6.5 : 10;
        const gridStroke = isSmall ? 0.75 : 1;

        return (
          <svg
            width={w} height={bodyH}
            viewBox={`0 0 ${w} ${bodyH}`}
            style={{ position: 'absolute', top: headroomTop + shapeCrownOffset, left: 0, overflow: 'visible' }}
          >
            {gridLevels.map((frac, gi) => (
              <polygon
                key={`grid-${gi}`}
                points={STATS.map((_, i) => { const p = pointAt(i, R * frac); return `${p.x},${p.y}`; }).join(' ')}
                fill="none" stroke={theme.text} strokeOpacity={0.18} strokeWidth={gridStroke}
              />
            ))}
            {STATS.map((_, i) => {
              const p = pointAt(i, R);
              return <line key={`spoke-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={theme.text} strokeOpacity={0.18} strokeWidth={gridStroke} />;
            })}
            <polygon
              points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill={theme.text} fillOpacity={0.32}
              stroke={theme.text} strokeWidth={isSmall ? 1.5 : 2.5} strokeLinejoin="round"
            />
            {STATS.map((s, i) => {
              const p = pointAt(i, R + labelOffset);
              const anchor = Math.abs(p.x - cx) < 2 ? 'middle' : (p.x > cx ? 'start' : 'end');
              return (
                <text
                  key={`label-${i}`} x={p.x} y={p.y}
                  textAnchor={anchor}
                  fontFamily="'Space Mono'" fontSize={fontSize} fill={theme.text}
                >
                  <tspan x={p.x} dy="-0.2em">{s.label}</tspan>
                  <tspan x={p.x} dy="1.15em" fontWeight="700">{cardStats[s.key] || 0}</tspan>
                </text>
              );
            })}
          </svg>
        );
      })()}
      {/* Bottom row — same position/style as the front's, swapping GAMES
          PLAYED for the debut date (front keeps GAMES PLAYED; OVR moved
          here from the front per request). */}
      <div style={{
        position: 'absolute', bottom: isSmall ? 5 : 8,
        left: isSmall ? 6 : 10, right: isSmall ? 6 : 10,
        display: 'flex', justifyContent: 'space-between', zIndex: 3,
        borderTop: `1px solid ${theme.border}55`, paddingTop: isSmall ? 3 : 5,
      }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted }}>
          {memberSinceDate && <>DEBUTED <span style={{ fontWeight: 700, color: theme.text }}>{memberSinceDate}</span></>}
        </div>
        <div style={{ fontFamily: "'Space Mono'", fontSize: isSmall ? 5 : 8, color: theme.muted }}>
          <span style={{ fontWeight: 700, color: theme.text }}>{calcOverall(cardStats)}</span> OVR
        </div>
      </div>
    </div>
    </div>
    {/* Crown star — deliberately left outside the flip container so it does
        not rotate with the card; it just stays put on top regardless of
        front/back state. */}
    {useShapedCard && starSet && starPlacement && (
      <>
        <style>{`
          @keyframes fifaCardFloat {
            0%, 100% { transform: translateY(2px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
        <svg
          key={achievementResetKey}
          className="fifa-card-star"
          width={starPlacement.width * shapeScale} height={starPlacement.height * shapeScale}
          viewBox={`0 0 ${starSet.viewBoxW} ${starSet.viewBoxH}`}
          style={{
            position: 'absolute',
            left: starPlacement.left * shapeScale,
            top: headroomTop + starPlacement.top * shapeScale,
            overflow: 'visible',
            // A continuous idle float — always on, independent of the
            // card's own tilt/touch/flip state. Wall-clock synced (see
            // syncedDelay) so it stays in phase with the achievement
            // badges' identical bob, no matter when either mounted.
            animation: `fifaCardFloat ${FLOAT_DURATION}s ease-in-out infinite`,
            animationDelay: `${syncedDelay(FLOAT_DURATION)}s`,
          }}
        >
          <defs>
            <linearGradient id={`cardStarGrad-${colorKey}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor={shapeGradStops[0]} />
              <stop offset="50%" stopColor={shapeGradStops[1]} />
              <stop offset="100%" stopColor={shapeGradStops[2]} />
            </linearGradient>
          </defs>
          {/* Same 2-physical-pixel target as the card body outline above,
              but converted through the star SVG's own width scale (its
              viewBox units map to px at a different rate than the card
              shape's) rather than shapeScale directly. */}
          <g fill={`url(#cardStarGrad-${colorKey})`} stroke={theme.border} strokeWidth={1.7 * starSet.viewBoxW / (starPlacement.width * shapeScale)}>
            {starSet.paths.map((d, i) => <path key={i} d={d} />)}
          </g>
        </svg>
      </>
    )}

    {/* Achievement badges — diamond gems stacked down the right edge, one
        per earned achievement, in whatever order/rarity the admin set.
        Each one floats with the same bob rhythm the crown's own star uses,
        synced to the wall clock (see syncedDelay) so every badge stays in
        phase with the others no matter when it mounted. Rendered outside
        the flip container and faded (rather than rotated) across a flip —
        a stack of flat gem icons reads as broken mid-3D-rotation. */}
    {achievementBadges && achievementBadges.length > 0 && (() => {
      const achievementLayout = ACHIEVEMENT_BADGE_LAYOUT;
      const badgeSize = w * achievementLayout.badgeSizeFrac;
      const gap = w * achievementLayout.gapFrac;
      const bodyBottom = headroomTop + shapeCrownOffset + bodyH;
      // Slot positions are fixed at BADGE_TYPE_LIST.length (3) regardless of
      // how many badges are actually shown, and filled from the top slot
      // down — so 1 badge sits alone at the top slot, 2 take the top two,
      // and only a full set reaches the bottom slot. Using the real count
      // here instead would bottom-anchor a partial set, which reads as
      // "docked at the bottom" rather than "stacked from the top".
      const lastBadgeTop = bodyBottom - w * achievementLayout.bottomFrac - badgeSize;
      const topStart = lastBadgeTop - (BADGE_TYPE_LIST.length - 1) * (badgeSize + gap);
      const overflowFrac = achievementLayout.overflowFrac;
      const floatDelay = `${syncedDelay(FLOAT_DURATION)}s`;
      return (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: flipped ? 0 : 1,
          transition: reducedMotion ? 'none' : 'opacity 0.35s ease',
        }}>
          <style>{`
            @keyframes fifaCardFloat {
              0%, 100% { transform: translateY(2px); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
          {achievementBadges.map((b, i) => (
            // Remounting on achievementResetKey also resets each badge's
            // own shimmer sweep (the SMIL animateTransform inside
            // AchievementBadgeIcon, keyed off the same syncedDelay
            // mechanism) — a child remounts whenever its parent does, so
            // one reset trigger covers both animations without duplicating
            // the key logic down into AchievementBadgeIcon itself.
            <div
              key={`${i}-${achievementResetKey}`}
              style={{
                position: 'absolute',
                top: topStart + i * (badgeSize + gap),
                right: -badgeSize * overflowFrac,
                width: badgeSize, height: badgeSize,
                animation: `fifaCardFloat ${FLOAT_DURATION}s ease-in-out infinite`,
                animationDelay: floatDelay,
                pointerEvents: 'none',
                zIndex: 8,
              }}
            >
              <AchievementBadgeIcon type={b.type} rarity={b.rarity} />
            </div>
          ))}
        </div>
      );
    })()}
    </div>
  );
}
