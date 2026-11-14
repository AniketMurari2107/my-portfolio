import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Clock,
  CloudFog,
  Flag,
  Gem,
  Maximize2,
  Minimize2,
  Pause,
  Settings,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { Minimap } from './Minimap.jsx';
import { PORTFOLIO_ZONES } from '../game/worldZones.js';
import { CHECKPOINTS, EASTER_EGGS, ENERGY_CRYSTALS } from '../game/worldGameplayData.js';
import { shouldShowTouchControls } from '../game/graphicsConfig.js';
import { getWeatherConfig } from '../game/weatherConfig.js';
import { formatClockTime, getTimePhaseLabel } from '../game/timeOfDay.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Full-viewport Game HUD:
 * - Top-left: ANIKET // PORTFOLIO + counters + compact telemetry on touch screens + desktop district nav
 * - Top-right: Sound, Settings, Fullscreen, Menu controls
 * - Center: Proximity interaction prompt when near a location
 * - Bottom (Desktop): Speedometer + Nitro bar, Key hints bar, Minimap
 */
export function GameHUD() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const nearbyZone = useGameStore((s) => s.nearbyZone);
  const speedKmh = useGameStore((s) => s.speedKmh);
  const boostLevel = useGameStore((s) => s.boostLevel);
  const nitroCooldown = useGameStore((s) => s.nitroCooldown);
  const isBoosting = useGameStore((s) => s.isBoosting);
  const settings = useGameStore((s) => s.settings);
  const weather = useGameStore((s) => s.weather);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const score = useGameStore((s) => s.score);
  const checkpointsCleared = useGameStore((s) => s.checkpointsCleared);
  const collectedCrystals = useGameStore((s) => s.collectedCrystals);
  const discoveredEggs = useGameStore((s) => s.discoveredEggs);

  const toggleSound = useGameStore((s) => s.toggleSound);
  const cycleWeather = useGameStore((s) => s.cycleWeather);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const togglePause = useGameStore((s) => s.togglePause);
  const openSection = useGameStore((s) => s.openSection);
  const weatherCfg = getWeatherConfig(weather);
  const timePhaseLabel = getTimePhaseLabel(timeOfDay);
  const clockStr = formatClockTime(timeOfDay);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchVisible, setTouchVisible] = useState(() =>
    shouldShowTouchControls(settings.touchControlsMode)
  );
  const crystalChipRef = useRef(null);
  const checkpointChipRef = useRef(null);

  useEffect(() => {
    const syncTouch = () => {
      setTouchVisible(shouldShowTouchControls(settings.touchControlsMode));
    };
    syncTouch();
    window.addEventListener('resize', syncTouch);
    window.addEventListener('orientationchange', syncTouch);
    return () => {
      window.removeEventListener('resize', syncTouch);
      window.removeEventListener('orientationchange', syncTouch);
    };
  }, [settings.touchControlsMode]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // GSAP pop feedback whenever collectibles or checkpoints increase
  useEffect(() => {
    if (collectedCrystals.length > 0 && crystalChipRef.current) {
      gsap.fromTo(
        crystalChipRef.current,
        { scale: 1.22 },
        { scale: 1, duration: 0.35, ease: 'back.out(2)' }
      );
    }
  }, [collectedCrystals.length]);

  useEffect(() => {
    if (checkpointsCleared.length > 0 && checkpointChipRef.current) {
      gsap.fromTo(
        checkpointChipRef.current,
        { scale: 1.22 },
        { scale: 1, duration: 0.35, ease: 'back.out(2)' }
      );
    }
  }, [checkpointsCleared.length]);

  if (gamePhase === 'loading' || gamePhase === 'menu') return null;

  const handleFullscreen = async (e) => {
    e.currentTarget.blur();
    audioEngine.playButtonClick();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Ignore fullscreen denial inside restricted sandboxed iframes
    }
  };

  const nitroLabel = isBoosting
    ? 'NITRO ACTIVE'
    : nitroCooldown > 0.05
      ? `COOL ${nitroCooldown.toFixed(1)}s`
      : 'NITRO READY';

  const nitroBarColor = isBoosting
    ? 'bg-violet-400'
    : nitroCooldown > 0.05
      ? 'bg-amber-400'
      : 'bg-cyan-400';

  const nitroTextColor = isBoosting
    ? 'text-violet-300 font-semibold'
    : nitroCooldown > 0.05
      ? 'text-amber-300 font-semibold'
      : 'text-cyan-300';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4 lg:p-6">
      {/* Top Row: Brand Mark + Exploration Telemetry (Left) & Utility Controls (Right) */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        {/* Top-Left Brand + Direct Section Bar + Collectibles/Checkpoints Counters */}
        <div className="flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
          <div className="hud-surface rounded-xl px-2.5 py-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
            <span className="font-display text-[11px] sm:text-base font-bold tracking-wider text-slate-50 whitespace-nowrap">
              ANIKET // PORTFOLIO
            </span>

            {/* Live Gameplay Counters */}
            <div className="flex items-center gap-2 sm:gap-2.5 sm:border-l sm:border-slate-700/80 sm:pl-3 font-mono-tech text-[10px] sm:text-[11px]">
              <div
                ref={crystalChipRef}
                data-testid="hud-crystals"
                className="flex items-center gap-1 text-cyan-300 tabular-nums"
                title="Energy Crystals Collected"
              >
                <Gem className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-400" />
                <span>
                  {collectedCrystals.length}/{ENERGY_CRYSTALS.length}
                </span>
              </div>
              <div
                ref={checkpointChipRef}
                data-testid="hud-checkpoints"
                className="flex items-center gap-1 text-emerald-300 tabular-nums"
                title="Checkpoints Cleared"
              >
                <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />
                <span>
                  {checkpointsCleared.length}/{CHECKPOINTS.length}
                </span>
              </div>
              <div
                data-testid="hud-secrets"
                className="flex items-center gap-1 text-amber-300 tabular-nums"
                title="Easter Eggs Discovered"
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                <span>
                  {discoveredEggs.length}/{EASTER_EGGS.length}
                </span>
              </div>
              <div
                data-testid="hud-score"
                className="hidden md:block text-slate-300 tabular-nums border-l border-slate-700/70 pl-2.5"
              >
                {score} PTS
              </div>
            </div>
          </div>

          {/* Mobile / Touch Telemetry Pill (docks cleanly top-left so bottom-left stays clear for Virtual Joystick) */}
          {touchVisible && (
            <div className="hud-surface rounded-xl px-2.5 py-1.5 flex items-center gap-3 w-fit">
              <div className="flex items-baseline gap-1">
                <span
                  data-testid="hud-speed"
                  className="font-display text-lg font-bold text-white tabular-nums"
                >
                  {speedKmh}
                </span>
                <span className="font-mono-tech text-[10px] text-cyan-400">KM/H</span>
              </div>
              <div className="w-24 space-y-1 border-l border-slate-700/70 pl-2.5">
                <div className="flex items-center justify-between font-mono-tech text-[9px]">
                  <span data-testid="hud-nitro-status" className={nitroTextColor}>
                    {nitroLabel}
                  </span>
                  <span className="text-slate-300 tabular-nums">{boostLevel}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${nitroBarColor}`}
                    style={{ width: `${boostLevel}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subtle Quick-Inspect Bar for Desktop Users */}
          <nav
            aria-label="Portfolio sections"
            className="hidden lg:flex items-center gap-1 hud-surface rounded-lg px-2 py-1"
          >
            {PORTFOLIO_ZONES.map((zone) => (
              <button
                key={zone.id}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  audioEngine.playInteract();
                  openSection(zone.id);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap ${
                  activeSection === zone.id
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {zone.shortLabel}
              </button>
            ))}
          </nav>
        </div>

        {/* Top-Right Utility Controls: Time, Weather, Sound, Settings, Fullscreen, Game Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-time-of-day"
            aria-label={`Time of day: ${timePhaseLabel} ${clockStr}. Click to adjust in Settings`}
            title={`Time of Day: ${timePhaseLabel} (${clockStr})`}
            onClick={(e) => {
              e.currentTarget.blur();
              audioEngine.playButtonClick();
              toggleSettings();
            }}
            className="hud-surface hud-interactive hidden md:flex h-9 sm:h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            <Clock className="h-3.5 w-3.5 text-amber-300" />
            <span className="font-mono-tech tabular-nums">
              {timePhaseLabel} {clockStr}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-weather-toggle"
            aria-label={`Weather: ${weatherCfg.label}. Click to cycle weather`}
            title={`Weather: ${weatherCfg.label} (Press T)`}
            onClick={(e) => {
              e.currentTarget.blur();
              audioEngine.unlock();
              audioEngine.playButtonClick();
              cycleWeather(true);
            }}
            className="hud-surface hud-interactive flex h-9 sm:h-10 items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            {weather === 'foggy' ? (
              <CloudFog className="h-4 w-4 text-indigo-300" />
            ) : (
              <Sun className="h-4 w-4 text-cyan-300" />
            )}
            <span className="hidden sm:inline">{weatherCfg.label}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Enable sound'}
            onClick={(e) => {
              e.currentTarget.blur();
              audioEngine.unlock();
              toggleSound();
            }}
            className="hud-surface hud-interactive flex h-9 sm:h-10 items-center gap-2 rounded-xl px-2.5 sm:px-3 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            {settings.soundEnabled ? (
              <Volume2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-400" />
            )}
            <span className="hidden sm:inline">Sound</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open settings"
            onClick={(e) => {
              e.currentTarget.blur();
              audioEngine.playButtonClick();
              toggleSettings();
            }}
            className="hud-surface hud-interactive flex h-9 sm:h-10 items-center gap-2 rounded-xl px-2.5 sm:px-3 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            <Settings className="h-4 w-4 text-blue-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
oq
          <button
            type="button"
            tabIndex={-1}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={handleFullscreen}
            className="hud-surface hud-interactive hidden sm:flex h-9 sm:h-10 items-center gap-2 rounded-xl px-2.5 sm:px-3 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-violet-400" />
            ) : (
              <Maximize2 className="h-4 w-4 text-violet-400" />
            )}
            <span className="hidden lg:inline">Fullscreen</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open game menu"
            onClick={(e) => {
              e.currentTarget.blur();
              audioEngine.playButtonClick();
              togglePause();
            }}
            className="hud-surface hud-interactive flex h-9 sm:h-10 items-center gap-2 rounded-xl px-2.5 sm:px-3 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            <Pause className="h-4 w-4 text-cyan-300" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* Center Proximity Prompt when near a Location */}
      {nearbyZone && !activeSection && gamePhase === 'playing' && (
        <div className="mx-auto pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              audioEngine.playInteract();
              openSection(nearbyZone.id);
            }}
            className="hud-surface hud-interactive flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4 rounded-xl px-4 py-2 sm:px-5 sm:py-3 text-left text-white max-w-xl"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{
                  backgroundColor: nearbyZone.color,
                  boxShadow: `0 0 12px ${nearbyZone.color}`,
                }}
              />
              <div>
                <div className="font-display text-xs sm:text-sm font-bold tracking-wide text-white">
                  {nearbyZone.title}
                </div>
                <div className="hidden sm:block text-xs text-slate-300">
                  {nearbyZone.shortDescription || nearbyZone.subtitle}
                </div>
              </div>
            </div>
            <span className="rounded-md bg-cyan-400/15 border border-cyan-400/40 px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-mono-tech font-semibold text-cyan-300 whitespace-nowrap">
              {touchVisible ? 'TAP TO INTERACT' : 'PRESS E TO INTERACT'}
            </span>
          </button>
        </div>
      )}

      {/* Bottom Row (Desktop): Speedometer + Key Instructions + Minimap */}
      {!touchVisible && (
        <div className="flex items-end justify-between gap-4">
          {/* Bottom-Left: Speedometer & Nitro Boost Bar */}
          <div className="hud-surface rounded-xl px-4 py-3 flex items-center gap-5 pointer-events-auto">
            <div>
              <div className="font-mono-tech text-[10px] tracking-widest text-slate-400 uppercase">
                Speed
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  data-testid="hud-speed"
                  className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums"
                >
                  {speedKmh}
                </span>
                <span className="font-mono-tech text-[11px] text-cyan-400">KM/H</span>
              </div>
            </div>

            <div className="w-28 sm:w-32 space-y-1.5">
              <div className="flex items-center justify-between font-mono-tech text-[10px]">
                <span data-testid="hud-nitro-status" className={nitroTextColor}>
                  {nitroLabel}
                </span>
                <span className="text-slate-300 tabular-nums">{boostLevel}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${nitroBarColor}`}
                  style={{ width: `${boostLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom-Center: Controls Hint Bar */}
          {settings.showControlsHint && (
            <div className="hidden lg:flex hud-surface rounded-xl px-4 py-2.5 items-center gap-2.5 text-xs text-slate-300 font-mono-tech pointer-events-auto">
              <span>WASD / Arrows: Drive</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>Space: Jump</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>Shift: Nitro</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>E: Interact</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>R: Reset</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>Drag / C: Camera</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>T: Weather</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span>ESC: Menu</span>
            </div>
          )}

          {/* Bottom-Right: Minimap */}
          {settings.showMinimap && (
            <div className="hidden sm:block">
              <Minimap />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
