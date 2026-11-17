import * as THREE from 'three';

/**
 * Pure Time-of-Day celestial & atmospheric lighting calculator.
 * tNormalized in [0, 1):
 *   0.00 = Midnight (Moon high)
 *   0.25 = Dawn / Sunrise (+X)
 *   0.50 = Solar Noon (Sun high)
 *   0.75 = Dusk / Sunset (-X)
 */

export const TIME_PRESETS = [
  { id: 'dawn', label: 'Dawn', t: 0.27 },
  { id: 'day', label: 'Day', t: 0.48 },
  { id: 'dusk', label: 'Dusk', t: 0.74 },
];

// Keyframe palette anchors around the 24-hour cycle
const KEYFRAMES = [
  {
    t: 0.0, // Midnight
    zenith: '#020612',
    horizon: '#122242',
    fog: '#071022',
    cloud: '#1c2f50',
    cloudLit: '#8ab4f8',
    hemiSky: '#38bdf8',
    hemiGround: '#050816',
    hemiIntensity: 0.48,
    keyColor: '#cfe4ff',
    keyIntensity: 0.95,
    fillColor: '#8b5cf6',
    fillIntensity: 0.58,
    rimColor: '#38bdf8',
    rimIntensity: 0.42,
    sunGlow: '#f97316',
    starVis: 1.0,
    envScale: 0.85,
  },
  {
    t: 0.25, // Dawn / Sunrise
    zenith: '#16284c',
    horizon: '#d97757',
    fog: '#5e3c4c',
    cloud: '#4a3d5c',
    cloudLit: '#fdba74',
    hemiSky: '#fb923c',
    hemiGround: '#1a1626',
    hemiIntensity: 0.72,
    keyColor: '#ffedd5',
    keyIntensity: 1.45,
    fillColor: '#60a5fa',
    fillIntensity: 0.52,
    rimColor: '#f59e0b',
    rimIntensity: 0.55,
    sunGlow: '#fb923c',
    starVis: 0.22,
    envScale: 1.0,
  },
  {
    t: 0.5, // High Noon
    zenith: '#0f3c78',
    horizon: '#7dd3fc',
    fog: '#5ca4d6',
    cloud: '#9dbbd8',
    cloudLit: '#ffffff',
    hemiSky: '#bae6fd',
    hemiGround: '#1e3a2f',
    hemiIntensity: 0.95,
    keyColor: '#fffbeb',
    keyIntensity: 2.1,
    fillColor: '#7dd3fc',
    fillIntensity: 0.48,
    rimColor: '#e0f2fe',
    rimIntensity: 0.45,
    sunGlow: '#fde68a',
    starVis: 0.0,
    envScale: 1.15,
  },
  {
    t: 0.75, // Dusk / Sunset
    zenith: '#1a1f4b',
    horizon: '#e06358',
    fog: '#4c2c4a',
    cloud: '#452c4e',
    cloudLit: '#fda4af',
    hemiSky: '#f472b6',
    hemiGround: '#161124',
    hemiIntensity: 0.7,
    keyColor: '#fed7aa',
    keyIntensity: 1.4,
    fillColor: '#818cf8',
    fillIntensity: 0.62,
    rimColor: '#fb7185',
    rimIntensity: 0.52,
    sunGlow: '#fb7185',
    starVis: 0.35,
    envScale: 0.98,
  },
  {
    t: 1.0, // Wrap smoothly back to Midnight
    zenith: '#020612',
    horizon: '#122242',
    fog: '#071022',
    cloud: '#1c2f50',
    cloudLit: '#8ab4f8',
    hemiSky: '#38bdf8',
    hemiGround: '#050816',
    hemiIntensity: 0.48,
    keyColor: '#cfe4ff',
    keyIntensity: 0.95,
    fillColor: '#8b5cf6',
    fillIntensity: 0.58,
    rimColor: '#38bdf8',
    rimIntensity: 0.42,
    sunGlow: '#f97316',
    starVis: 1.0,
    envScale: 0.85,
  },
];

const _cA = new THREE.Color();
const _cB = new THREE.Color();

function lerpHex(hexA, hexB, alpha, targetColor) {
  _cA.set(hexA);
  _cB.set(hexB);
  targetColor.copy(_cA).lerp(_cB, alpha);
}

export function normalizeTimeOfDay(t) {
  const mod = t % 1;
  return mod < 0 ? mod + 1 : mod;
}

export function getTimePhaseLabel(tNormalized) {
  const t = normalizeTimeOfDay(tNormalized);
  if (t >= 0.21 && t < 0.34) return 'Dawn';
  if (t >= 0.34 && t < 0.67) return 'Day';
  if (t >= 0.67 && t < 0.82) return 'Dusk';
  return 'Night';
}

export function formatClockTime(tNormalized) {
  const t = normalizeTimeOfDay(tNormalized);
  const totalMinutes = Math.round(t * 24 * 60) % (24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Computes rotating sun & moon unit vectors plus smoothly interpolated sky & ambient light state.
 * Reuses `out` when provided so 60Hz render loops allocate zero heap objects.
 */
export function computeTimeOfDayState(tNormalized, weatherCfg = null, out = null) {
  const t = normalizeTimeOfDay(tNormalized);
  const state = out || {
    sunDir: new THREE.Vector3(),
    moonDir: new THREE.Vector3(),
    activeKeyDir: new THREE.Vector3(),
    zenithColor: new THREE.Color(),
    horizonColor: new THREE.Color(),
    fogColor: new THREE.Color(),
    cloudColor: new THREE.Color(),
    cloudLitColor: new THREE.Color(),
    hemiSkyColor: new THREE.Color(),
    hemiGroundColor: new THREE.Color(),
    keyColor: new THREE.Color(),
    fillColor: new THREE.Color(),
    rimColor: new THREE.Color(),
    sunGlowColor: new THREE.Color(),
    hemiIntensity: 0.5,
    keyIntensity: 1.0,
    fillIntensity: 0.5,
    rimIntensity: 0.4,
    sunVisibility: 0,
    moonVisibility: 1,
    starVisibility: 1,
    envScale: 1,
    fogDensity: 0.0064,
  };

  // Celestial rotation: t=0.25 -> +X sunrise, t=0.50 -> +Y noon, t=0.75 -> -X sunset
  // Tilted slightly toward -Z so both sun & moon sweep visibly across the northern mountain sky
  const sunAngle = (t - 0.25) * Math.PI * 2;
  const sx = Math.cos(sunAngle);
  const sy = Math.sin(sunAngle);
  const sz = -0.34;
  const sLen = Math.hypot(sx, sy, sz);
  state.sunDir.set(sx / sLen, sy / sLen, sz / sLen);
  state.moonDir.set(-state.sunDir.x, -state.sunDir.y, -state.sunDir.z);

  // Locate surrounding keyframes and smooth-step alpha
  let kfA = KEYFRAMES[0];
  let kfB = KEYFRAMES[1];
  for (let i = 0; i < KEYFRAMES.length - 1; i += 1) {
    if (t >= KEYFRAMES[i].t && t <= KEYFRAMES[i + 1].t) {
      kfA = KEYFRAMES[i];
      kfB = KEYFRAMES[i + 1];
      break;
    }
  }
  const span = Math.max(0.0001, kfB.t - kfA.t);
  const rawAlpha = Math.max(0, Math.min(1, (t - kfA.t) / span));
  const alpha = rawAlpha * rawAlpha * (3 - 2 * rawAlpha);

  lerpHex(kfA.zenith, kfB.zenith, alpha, state.zenithColor);
  lerpHex(kfA.horizon, kfB.horizon, alpha, state.horizonColor);
  lerpHex(kfA.fog, kfB.fog, alpha, state.fogColor);
  lerpHex(kfA.cloud, kfB.cloud, alpha, state.cloudColor);
  lerpHex(kfA.cloudLit, kfB.cloudLit, alpha, state.cloudLitColor);
  lerpHex(kfA.hemiSky, kfB.hemiSky, alpha, state.hemiSkyColor);
  lerpHex(kfA.hemiGround, kfB.hemiGround, alpha, state.hemiGroundColor);
  lerpHex(kfA.keyColor, kfB.keyColor, alpha, state.keyColor);
  lerpHex(kfA.fillColor, kfB.fillColor, alpha, state.fillColor);
  lerpHex(kfA.rimColor, kfB.rimColor, alpha, state.rimColor);
  lerpHex(kfA.sunGlow, kfB.sunGlow, alpha, state.sunGlowColor);

  state.hemiIntensity = THREE.MathUtils.lerp(kfA.hemiIntensity, kfB.hemiIntensity, alpha);
  state.keyIntensity = THREE.MathUtils.lerp(kfA.keyIntensity, kfB.keyIntensity, alpha);
  state.fillIntensity = THREE.MathUtils.lerp(kfA.fillIntensity, kfB.fillIntensity, alpha);
  state.rimIntensity = THREE.MathUtils.lerp(kfA.rimIntensity, kfB.rimIntensity, alpha);
  state.envScale = THREE.MathUtils.lerp(kfA.envScale, kfB.envScale, alpha);

  // Smooth celestial disc visibility around horizon
  state.sunVisibility = THREE.MathUtils.smoothstep(state.sunDir.y, -0.08, 0.12);
  state.moonVisibility = THREE.MathUtils.smoothstep(state.moonDir.y, -0.08, 0.12);

  // Smoothly switch directional key shadow caster between sun (day) and moon (night)
  if (state.sunDir.y >= 0) {
    state.activeKeyDir.copy(state.sunDir);
    state.activeKeyDir.y = Math.max(0.22, state.activeKeyDir.y);
    state.activeKeyDir.normalize();
  } else {
    state.activeKeyDir.copy(state.moonDir);
    state.activeKeyDir.y = Math.max(0.24, state.activeKeyDir.y);
    state.activeKeyDir.normalize();
  }

  let baseStars = THREE.MathUtils.lerp(kfA.starVis, kfB.starVis, alpha);
  let fogDensity = 0.0056;

  if (weatherCfg) {
    baseStars *= weatherCfg.starVisibility;
    state.sunVisibility *= weatherCfg.celestialVisibility ?? 1;
    state.moonVisibility *= weatherCfg.celestialVisibility ?? 1;
    state.keyIntensity *= weatherCfg.keyIntensityScale ?? 1;
    state.hemiIntensity *= weatherCfg.hemiIntensityScale ?? 1;
    state.envScale *= weatherCfg.envIntensityMultiplier ?? 1;
    fogDensity = weatherCfg.fogDensity;

    // In foggy weather, lift and cool the fog/horizon tone slightly for dense atmospheric mist
    if (weatherCfg.fogTintMix > 0) {
      _cA.set(weatherCfg.fogColor);
      state.fogColor.lerp(_cA, weatherCfg.fogTintMix);
      state.horizonColor.lerp(_cA, weatherCfg.fogTintMix * 0.85);
      _cB.set(weatherCfg.zenithColor);
      state.zenithColor.lerp(_cB, weatherCfg.fogTintMix * 0.55);
    }
  }

  state.starVisibility = baseStars;
  state.fogDensity = fogDensity;
  return state;
}
