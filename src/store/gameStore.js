import { create } from 'zustand';
import { PORTFOLIO_ZONES, SPAWN_POINT } from '../game/worldZones.js';
import { CHECKPOINTS, EASTER_EGGS, ENERGY_CRYSTALS } from '../game/worldGameplayData.js';
import { detectDefaultGraphicsPreset } from '../game/graphicsConfig.js';
import {
  getNextWeatherMode,
  getWeatherConfig,
  WEATHER_MODES,
} from '../game/weatherConfig.js';

// High-frequency mutable state shared across 60Hz R3F loop, camera, and minimap
// without triggering 60Hz React component reconciliations.
export const carLiveState = {
  x: SPAWN_POINT.x,
  y: SPAWN_POINT.y,
  z: SPAWN_POINT.z,
  yaw: SPAWN_POINT.yaw,
  speed: 0,
  boost: 100,
  nitroCooldown: 0,
  isBoosting: false,
  grounded: true,
  trauma: 0,
  refillNonce: 0,
  crystalBoostBonus: 0,
  touchSteerAnalog: 0,
  timeOfDay: 0.78,
};

const checkAutostart = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
};

const getInitialWeather = () => {
  if (typeof window === 'undefined') return 'clear';
  const param = new URLSearchParams(window.location.search).get('weather');
  return WEATHER_MODES.includes(param) ? param : 'clear';
};

const getInitialTimeOfDay = () => {
  if (typeof window === 'undefined') return 0.78;
  const raw = new URLSearchParams(window.location.search).get('tod');
  if (raw !== null) {
    const num = Number(raw);
    if (Number.isFinite(num)) {
      const norm = ((num % 1) + 1) % 1;
      carLiveState.timeOfDay = norm;
      return norm;
    }
  }
  carLiveState.timeOfDay = 0.78;
  return 0.78;
};

let notifSeq = 1;

export const useGameStore = create((set, get) => ({
  // 'loading' | 'menu' | 'playing' | 'paused'
  gamePhase: 'loading',
  autostartPending: checkAutostart(),
  worldReady: false,
  loadProgress: 12,
  webglError: null,

  // Active interactive portfolio section ('about' | 'skills' | 'projects' | 'experience' | 'achievements' | 'contact' | null)
  activeSection: null,
  nearbyZone: null,
  visitedZones: [],

  // Gameplay exploration & progression state
  runId: 0,
  score: 0,
  checkpointsCleared: [],
  collectedCrystals: [],
  discoveredEggs: [],
  notifications: [],

  // Throttled (~10Hz) telemetry for DOM HUD readouts
  speedKmh: 0,
  boostLevel: 100,
  nitroCooldown: 0,
  isBoosting: false,
  isGrounded: true,

  // Modal panels
  settingsOpen: false,

  // Dynamic atmospheric weather ('clear' | 'foggy') & continuous Time-of-Day cycle
  weather: getInitialWeather(),
  timeOfDay: getInitialTimeOfDay(),
  autoTimeCycle: true,
  timeCycleSpeed: 1 / 110, // Full 24h sun/moon rotation every ~110 seconds

  // Teleport and camera reset triggers
  teleportRequest: null,
  cameraResetNonce: 0,
  cameraSnapNonce: 0,

  // Mobile / tablet virtual touch inputs
  touchInput: {
    forward: false,
    backward: false,
    brake: false,
    left: false,
    right: false,
    boost: false,
    jump: false,
  },

  // User-configurable settings
  settings: {
    soundEnabled: true,
    volume: 0.65,
    graphicsQuality: detectDefaultGraphicsPreset(), // 'low' | 'medium' | 'high'
    touchControlsMode: 'auto', // 'auto' | 'always' | 'off'
    cameraFov: 60,
    steeringSensitivity: 1.0,
    showMinimap: true,
    showControlsHint: true,
  },

  setLoadProgress: (loadProgress) => set({ loadProgress }),

  setWorldReady: () => {
    const { autostartPending, gamePhase } = get();
    if (gamePhase !== 'loading') return;
    const nextPhase = autostartPending ? 'playing' : 'menu';
    if (typeof document !== 'undefined') {
      document.body.dataset.state = nextPhase === 'menu' ? 'title' : 'playing';
    }
    set({
      worldReady: true,
      loadProgress: 100,
      gamePhase: nextPhase,
      autostartPending: false,
    });
  },

  setWebglError: (webglError) => set({ webglError }),

  startGame: () => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
    set({ gamePhase: 'playing', settingsOpen: false, activeSection: null });
  },

  returnToMenu: () => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'title';
    }
    set({
      gamePhase: 'menu',
      activeSection: null,
      settingsOpen: false,
    });
  },

  togglePause: () => {
    const { gamePhase, activeSection, settingsOpen } = get();
    if (activeSection) {
      set({ activeSection: null });
      return;
    }
    if (settingsOpen) {
      set({ settingsOpen: false });
      return;
    }
    if (gamePhase === 'playing') {
      if (typeof document !== 'undefined') {
        document.body.dataset.state = 'paused';
      }
      set({ gamePhase: 'paused' });
    } else if (gamePhase === 'paused') {
      if (typeof document !== 'undefined') {
        document.body.dataset.state = 'playing';
      }
      set({ gamePhase: 'playing' });
    }
  },

  setPaused: (paused) => {
    const nextPhase = paused ? 'paused' : 'playing';
    if (typeof document !== 'undefined') {
      document.body.dataset.state = nextPhase;
    }
    set({ gamePhase: nextPhase });
  },

  openSection: (sectionId) => {
    if (!sectionId) return;
    const { visitedZones } = get();
    const updatedVisited = visitedZones.includes(sectionId)
      ? visitedZones
      : [...visitedZones, sectionId];
    set({
      activeSection: sectionId,
      settingsOpen: false,
      visitedZones: updatedVisited,
    });
  },

  closeSection: () => {
    set({ activeSection: null });
  },

  setNearbyZone: (zone) => {
    const current = get().nearbyZone;
    if ((current?.id || null) === (zone?.id || null)) return;
    set({ nearbyZone: zone || null });
  },

  syncTelemetry: (speedKmh, boostLevel, isBoosting, isGrounded, nitroCooldown = 0) => {
    const s = get();
    if (
      s.speedKmh === speedKmh &&
      s.boostLevel === boostLevel &&
      s.isBoosting === isBoosting &&
      s.isGrounded === isGrounded &&
      s.nitroCooldown === nitroCooldown
    ) {
      return;
    }
    set({ speedKmh, boostLevel, isBoosting, isGrounded, nitroCooldown });
  },

  pushNotification: ({ type = 'info', title, message, accent = '#06b6d4', durationMs = 3600 }) => {
    const id = notifSeq;
    notifSeq += 1;
    const item = { id, type, title, message, accent, durationMs, createdAt: Date.now() };
    set((state) => ({
      // Keep max 3 concurrent notifications so HUD stays clean
      notifications: [...state.notifications.slice(-2), item],
    }));
    return id;
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearCheckpoint: (checkpoint) => {
    if (!checkpoint) return false;
    const { checkpointsCleared, pushNotification } = get();
    if (checkpointsCleared.includes(checkpoint.id)) return false;
    const nextCleared = [...checkpointsCleared, checkpoint.id];
    const allCleared = nextCleared.length >= CHECKPOINTS.length;

    carLiveState.boost = 100;
    carLiveState.nitroCooldown = 0;
    carLiveState.refillNonce += 1;

    set((state) => ({
      checkpointsCleared: nextCleared,
      score: state.score + (allCleared ? 400 : 150),
    }));

    pushNotification({
      type: 'checkpoint',
      title: allCleared
        ? 'Circuit Mastered!'
        : `Checkpoint ${nextCleared.length}/${CHECKPOINTS.length}: ${checkpoint.name}`,
      message: allCleared
        ? 'All 6 glowing checkpoints cleared · +400 PTS · Nitro Full!'
        : checkpoint.rewardText,
      accent: checkpoint.color || '#06b6d4',
      durationMs: 3600,
    });
    return true;
  },

  collectCrystal: (crystal) => {
    if (!crystal) return false;
    const { collectedCrystals, pushNotification } = get();
    if (collectedCrystals.includes(crystal.id)) return false;
    const nextCollected = [...collectedCrystals, crystal.id];
    const allCollected = nextCollected.length >= ENERGY_CRYSTALS.length;

    carLiveState.crystalBoostBonus = Math.min(100, carLiveState.crystalBoostBonus + 28);

    set((state) => ({
      collectedCrystals: nextCollected,
      score: state.score + (allCollected ? 350 : 100),
    }));

    if (allCollected || nextCollected.length === 1 || nextCollected.length % 4 === 0) {
      pushNotification({
        type: 'crystal',
        title: allCollected
          ? 'Energy Grid Complete!'
          : `Energy Crystal (${nextCollected.length}/${ENERGY_CRYSTALS.length})`,
        message: allCollected
          ? 'All 12 energy crystals harvested · +350 PTS!'
          : '+100 PTS · +28% Nitro Surge',
        accent: '#38bdf8',
        durationMs: 2800,
      });
    }
    return true;
  },

  discoverEasterEgg: (egg) => {
    if (!egg) return false;
    const { discoveredEggs, pushNotification } = get();
    if (discoveredEggs.includes(egg.id)) return false;
    const nextEggs = [...discoveredEggs, egg.id];

    carLiveState.boost = 100;
    carLiveState.nitroCooldown = 0;
    carLiveState.refillNonce += 1;

    set((state) => ({
      discoveredEggs: nextEggs,
      score: state.score + 300,
    }));

    pushNotification({
      type: 'easter-egg',
      title: `Secret Discovered (${nextEggs.length}/${EASTER_EGGS.length}): ${egg.title}`,
      message: `${egg.discoveryMessage} Unlocked Secret Achievement: "${egg.secretAchievement}"`,
      accent: egg.color || '#f59e0b',
      durationMs: 5200,
    });
    return true;
  },

  toggleSound: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        soundEnabled: !state.settings.soundEnabled,
      },
    }));
  },

  toggleSettings: () => {
    set((state) => ({
      settingsOpen: !state.settingsOpen,
      activeSection: null,
    }));
  },

  updateSettings: (partial) => {
    set((state) => ({
      settings: { ...state.settings, ...partial },
    }));
  },

  setWeather: (mode, notify = false) => {
    const next = WEATHER_MODES.includes(mode) ? mode : 'clear';
    if (typeof document !== 'undefined') {
      document.body.dataset.weather = next;
    }
    set({ weather: next });
    if (notify) {
      const cfg = getWeatherConfig(next);
      get().pushNotification({
        type: 'info',
        title: `Weather: ${cfg.label}`,
        message: cfg.subtitle,
        accent: next === 'foggy' ? '#a5b4fc' : '#22d3ee',
        durationMs: 2400,
      });
    }
  },

  cycleWeather: (notify = true) => {
    const next = getNextWeatherMode(get().weather);
    get().setWeather(next, notify);
  },

  setTimeOfDay: (value) => {
    const num = Number(value);
    const norm = Number.isFinite(num) ? ((num % 1) + 1) % 1 : 0.78;
    carLiveState.timeOfDay = norm;
    set({ timeOfDay: norm });
  },

  syncTimeOfDayDisplay: (norm) => {
    if (Math.abs(get().timeOfDay - norm) < 0.004) return;
    set({ timeOfDay: norm });
  },

  toggleAutoTimeCycle: () => {
    set((state) => ({ autoTimeCycle: !state.autoTimeCycle }));
  },

  requestTeleport: (x, y, z, yaw = 0) => {
    set((state) => ({
      teleportRequest: { x, y, z, yaw, nonce: Date.now() + Math.random() },
      cameraSnapNonce: state.cameraSnapNonce + 1,
    }));
  },

  teleportToZone: (zoneId) => {
    const zone = PORTFOLIO_ZONES.find((z) => z.id === zoneId);
    if (!zone) return;
    const approach = zone.spawnOffset || { x: 0, z: 7.8 };
    set((state) => ({
      gamePhase: 'playing',
      settingsOpen: false,
      cameraSnapNonce: state.cameraSnapNonce + 1,
      teleportRequest: {
        x: zone.position[0] + approach.x,
        y: 0.75,
        z: zone.position[2] + approach.z,
        yaw: zone.approachYaw ?? 0,
        nonce: Date.now() + Math.random(),
      },
    }));
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
  },

  resetCar: () => {
    carLiveState.boost = 100;
    carLiveState.nitroCooldown = 0;
    carLiveState.refillNonce += 1;
    set((state) => ({
      gamePhase: 'playing',
      settingsOpen: false,
      activeSection: null,
      cameraSnapNonce: state.cameraSnapNonce + 1,
      teleportRequest: {
        x: SPAWN_POINT.x,
        y: SPAWN_POINT.y,
        z: SPAWN_POINT.z,
        yaw: SPAWN_POINT.yaw,
        nonce: Date.now() + Math.random(),
      },
    }));
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
  },

  restartGame: () => {
    carLiveState.boost = 100;
    carLiveState.nitroCooldown = 0;
    carLiveState.crystalBoostBonus = 0;
    carLiveState.refillNonce += 1;
    set((state) => ({
      gamePhase: 'playing',
      settingsOpen: false,
      activeSection: null,
      score: 0,
      checkpointsCleared: [],
      collectedCrystals: [],
      discoveredEggs: [],
      notifications: [],
      runId: state.runId + 1,
      cameraSnapNonce: state.cameraSnapNonce + 1,
      teleportRequest: {
        x: SPAWN_POINT.x,
        y: SPAWN_POINT.y,
        z: SPAWN_POINT.z,
        yaw: SPAWN_POINT.yaw,
        nonce: Date.now() + Math.random(),
      },
    }));
    if (typeof document !== 'undefined') {
      document.body.dataset.state = 'playing';
    }
  },

  clearTeleportRequest: () => set({ teleportRequest: null }),

  requestCameraReset: () =>
    set((state) => ({ cameraResetNonce: state.cameraResetNonce + 1 })),

  setTouchControl: (key, value) => {
    set((state) => ({
      touchInput: { ...state.touchInput, [key]: value },
    }));
  },
}));
