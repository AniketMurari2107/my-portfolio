/**
 * Dynamic atmospheric weather presets (Clear, Foggy) — rain weather removed per user request.
 * Pure configuration module so weather cycling and atmospheric modifiers can be unit-tested.
 */

export const WEATHER_MODES = ['clear', 'foggy'];

export const WEATHER_PRESETS = {
  clear: {
    id: 'clear',
    label: 'Clear',
    subtitle: 'Crisp Open Sky',
    fogColor: '#081124',
    zenithColor: '#020612',
    fogDensity: 0.0058,
    fogTintMix: 0,
    starVisibility: 1.0,
    celestialVisibility: 1.0,
    cloudCoverage: 0.34,
    windStrength: 1.0,
    keyIntensityScale: 1.0,
    hemiIntensityScale: 1.0,
    envIntensityMultiplier: 1.0,
    neonLightMultiplier: 1.0,
    roadRoughnessScale: 1.0,
    roadClearcoat: 0.36,
    fogWispIntensity: 0,
  },
  foggy: {
    id: 'foggy',
    label: 'Foggy',
    subtitle: 'Dense Volumetric Mist',
    fogColor: '#485b74',
    zenithColor: '#1b2b44',
    fogDensity: 0.032,
    fogTintMix: 0.65,
    starVisibility: 0.14,
    celestialVisibility: 0.32,
    cloudCoverage: 0.78,
    windStrength: 0.7,
    keyIntensityScale: 0.58,
    hemiIntensityScale: 0.92,
    envIntensityMultiplier: 0.62,
    neonLightMultiplier: 0.72,
    roadRoughnessScale: 1.12,
    roadClearcoat: 0.22,
    fogWispIntensity: 1.0,
  },
};

export function getWeatherConfig(mode) {
  return WEATHER_PRESETS[mode] || WEATHER_PRESETS.clear;
}

export function getNextWeatherMode(currentMode) {
  const idx = WEATHER_MODES.indexOf(currentMode);
  if (idx === -1) return WEATHER_MODES[0];
  return WEATHER_MODES[(idx + 1) % WEATHER_MODES.length];
}
