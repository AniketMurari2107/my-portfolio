/**
 * Graphics quality presets and adaptive mobile capability detection.
 * Pure module so preset selection and resource budgets can be unit-tested cleanly.
 */

export const GRAPHICS_PRESETS = {
  low: {
    id: 'low',
    label: 'Low',
    subtitle: 'Weaker Phones',
    dpr: [0.75, 1],
    shadows: false,
    shadowMapSize: 256,
    antialias: false,
    maxAnisotropy: 1,
    textureScale: 0.5,
    nitroParticles: 16,
    skyStars: 50,
    burstParticles: 12,
    grassBlades: 2200,
    fogWisps: 18,
    envIntensity: 0.24,
    enableHeadlightBeams: false,
    enableSpeedLines: false,
    enableBloom: false,
    enableAO: false,
    enableColorGrading: false,
    bloomStrength: 0,
    enableAnimatedLights: false,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    subtitle: 'Normal Android',
    dpr: [1, 1.35],
    shadows: true,
    shadowMapSize: 512,
    antialias: true,
    maxAnisotropy: 2,
    textureScale: 0.75,
    nitroParticles: 28,
    skyStars: 100,
    burstParticles: 20,
    grassBlades: 4800,
    fogWisps: 30,
    envIntensity: 0.34,
    enableHeadlightBeams: true,
    enableSpeedLines: true,
    enableBloom: true,
    enableAO: false,
    enableColorGrading: true,
    bloomStrength: 0.34,
    enableAnimatedLights: true,
  },
  high: {
    id: 'high',
    label: 'High',
    subtitle: 'Desktop & Flagship',
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 1024,
    antialias: true,
    maxAnisotropy: 4,
    textureScale: 1.0,
    nitroParticles: 48,
    skyStars: 180,
    burstParticles: 32,
    grassBlades: 8500,
    fogWisps: 48,
    envIntensity: 0.44,
    enableHeadlightBeams: true,
    enableSpeedLines: true,
    enableBloom: true,
    enableAO: true,
    enableColorGrading: true,
    bloomStrength: 0.42,
    enableAnimatedLights: true,
  },
};

export function getGraphicsConfig(presetId) {
  return GRAPHICS_PRESETS[presetId] || GRAPHICS_PRESETS.high;
}

/**
 * Picks a sensible default graphics preset based on device memory, CPU cores, and mobile/touch hints.
 */
export function detectDefaultGraphicsPreset(envInfo) {
  const info = envInfo || (typeof navigator !== 'undefined' ? navigator : {});
  const ua = String(info.userAgent || '');
  const isMobile =
    Boolean(info.isMobile) ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const cores = Number(info.hardwareConcurrency || 0);
  const memory = Number(info.deviceMemory || 0);

  if (isMobile) {
    if ((memory > 0 && memory <= 3) || (cores > 0 && cores <= 4)) {
      return 'low';
    }
    if ((memory > 0 && memory >= 8) && cores >= 8) {
      return 'high';
    }
    return 'medium';
  }

  if ((memory > 0 && memory <= 2) || (cores > 0 && cores <= 2)) {
    return 'low';
  }
  return 'high';
}

/**
 * Detects whether touchscreen controls should auto-enable for phones, tablets, or narrow viewports.
 */
export function shouldShowTouchControls(mode = 'auto', envInfo = null) {
  if (mode === 'always') return true;
  if (mode === 'off') return false;

  if (envInfo) {
    return Boolean(envInfo.isCoarsePointer || envInfo.maxTouchPoints > 0 || envInfo.width < 1024);
  }
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const touchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  return coarse || touchPoints > 0 || window.innerWidth < 1024;
}
