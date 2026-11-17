import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { RotateCcw, X } from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { PORTFOLIO_ZONES } from '../game/worldZones.js';
import { GRAPHICS_PRESETS } from '../game/graphicsConfig.js';
import { formatClockTime, getTimePhaseLabel, TIME_PRESETS } from '../game/timeOfDay.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Functional Settings drawer/modal allowing live adjustments to audio,
 * graphics quality, time of day, camera FOV, steering sensitivity, HUD visibility, and quick teleport.
 */
export function SettingsPanel() {
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const settings = useGameStore((s) => s.settings);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const autoTimeCycle = useGameStore((s) => s.autoTimeCycle);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);
  const toggleAutoTimeCycle = useGameStore((s) => s.toggleAutoTimeCycle);
  const resetCar = useGameStore((s) => s.resetCar);
  const requestCameraReset = useGameStore((s) => s.requestCameraReset);
  const teleportToZone = useGameStore((s) => s.teleportToZone);

  const panelRef = useRef(null);

  useEffect(() => {
    if (!settingsOpen || !panelRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 18, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'power3.out' }
      );
    }, panelRef);
    return () => ctx.revert();
  }, [settingsOpen]);

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        ref={panelRef}
        className="panel-surface w-full max-w-lg rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Control &amp; World Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tune audio, camera, graphics quality, or warp directly to a district.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => {
              audioEngine.playButtonClick();
              toggleSettings();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-neutral-900/60 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Audio Toggle & Volume */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">Engine, Ambient &amp; UI Audio</span>
              <button
                type="button"
                onClick={() => {
                  audioEngine.unlock();
                  updateSettings({ soundEnabled: !settings.soundEnabled });
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  settings.soundEnabled
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-neutral-900 border border-white/10 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <label htmlFor="settings-volume">Master Volume</label>
                <span className="font-mono-tech tabular-nums">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                id="settings-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Graphics Quality Presets: Low / Medium / High */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-200">Graphics Quality</div>
              <div className="text-[11px] text-slate-400">
                {GRAPHICS_PRESETS[settings.graphicsQuality]?.subtitle || 'Adaptive Performance'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur-md p-1">
              {['low', 'medium', 'high'].map((mode) => {
                const preset = GRAPHICS_PRESETS[mode];
                const active = settings.graphicsQuality === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`graphics-preset-${mode}`}
                    onClick={() => {
                      audioEngine.playButtonClick();
                      updateSettings({ graphicsQuality: mode });
                    }}
                    className={`rounded-lg px-2.5 py-2 text-center transition-colors ${
                      active
                        ? 'bg-blue-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="text-xs font-semibold">{preset.label}</div>
                    <div
                      className={`text-[10px] leading-tight mt-0.5 ${
                        active ? 'text-slate-900/80' : 'text-slate-500'
                      }`}
                    >
                      {preset.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time of Day: Rotating Sun / Moon & Auto Cycle */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-slate-200">Time of Day</div>
                <div className="text-[11px] text-slate-400 font-mono-tech tabular-nums">
                  {getTimePhaseLabel(timeOfDay)} &middot; {formatClockTime(timeOfDay)}
                </div>
              </div>
              <button
                type="button"
                data-testid="tod-auto-toggle"
                onClick={() => {
                  audioEngine.playButtonClick();
                  toggleAutoTimeCycle();
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  autoTimeCycle
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-neutral-900 border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                Auto Cycle: {autoTimeCycle ? 'On' : 'Paused'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-neutral-950/60 backdrop-blur-md p-1">
              {TIME_PRESETS.map((preset) => {
                const dist = Math.min(
                  Math.abs(timeOfDay - preset.t),
                  1 - Math.abs(timeOfDay - preset.t)
                );
                const active = dist < 0.08;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`tod-preset-${preset.id}`}
                    onClick={() => {
                      audioEngine.playButtonClick();
                      setTimeOfDay(preset.t);
                    }}
                    className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <label htmlFor="settings-tod">Sun &amp; Moon Orbit</label>
                <span className="font-mono-tech tabular-nums">
                  {Math.round(timeOfDay * 100)}%
                </span>
              </div>
              <input
                id="settings-tod"
                data-testid="tod-slider"
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                value={Number(timeOfDay.toFixed(2))}
                onChange={(e) => setTimeOfDay(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Touchscreen Controls Mode */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-200">Touch Controls</div>
              <div className="text-xs text-slate-400">Virtual joystick &amp; mobile pedals</div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-neutral-950/60 backdrop-blur-md p-1">
              {[
                { id: 'auto', label: 'Auto' },
                { id: 'always', label: 'On' },
                { id: 'off', label: 'Off' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`touch-mode-${opt.id}`}
                  onClick={() => {
                    audioEngine.playButtonClick();
                    updateSettings({ touchControlsMode: opt.id });
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    settings.touchControlsMode === opt.id
                      ? 'bg-cyan-400 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Camera FOV */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <label htmlFor="settings-fov">Camera Field of View</label>
              <span className="font-mono-tech tabular-nums">{settings.cameraFov}&deg;</span>
            </div>
            <input
              id="settings-fov"
              type="range"
              min="50"
              max="78"
              step="1"
              value={settings.cameraFov}
              onChange={(e) => updateSettings({ cameraFov: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* Steering Sensitivity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <label htmlFor="settings-steer">Steering Sensitivity</label>
              <span className="font-mono-tech tabular-nums">
                {settings.steeringSensitivity.toFixed(1)}x
              </span>
            </div>
            <input
              id="settings-steer"
              type="range"
              min="0.6"
              max="1.5"
              step="0.1"
              value={settings.steeringSensitivity}
              onChange={(e) => updateSettings({ steeringSensitivity: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </div>

          {/* HUD Visibility Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                audioEngine.playButtonClick();
                updateSettings({ showMinimap: !settings.showMinimap });
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                settings.showMinimap
                  ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200'
                  : 'border-white/10 bg-neutral-950/60 backdrop-blur-md text-slate-400'
              }`}
            >
              Minimap: {settings.showMinimap ? 'Shown' : 'Hidden'}
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playButtonClick();
                updateSettings({ showControlsHint: !settings.showControlsHint });
              }}
              className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                settings.showControlsHint
                  ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-200'
                  : 'border-white/10 bg-neutral-950/60 backdrop-blur-md text-slate-400'
              }`}
            >
              Controls Bar: {settings.showControlsHint ? 'Shown' : 'Hidden'}
            </button>
          </div>

          {/* Quick Warp & Vehicle Reset */}
          <div className="space-y-2.5 border-t border-white/10 pt-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Quick Teleport &amp; Recovery
            </div>
            <div className="flex flex-wrap gap-2">
              {PORTFOLIO_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => {
                    audioEngine.playButtonClick();
                    teleportToZone(zone.id);
                  }}
                  className="rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/20 transition-colors"
                >
                  {zone.shortLabel}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  audioEngine.playButtonClick();
                  resetCar();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:border-white/20 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Car
              </button>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playButtonClick();
                  requestCameraReset();
                  toggleSettings();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:border-white/20 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Camera
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;

