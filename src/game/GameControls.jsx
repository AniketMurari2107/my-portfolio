import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpFromLine,
  CornerDownRight,
  Octagon,
  Zap,
} from 'lucide-react';
import { carLiveState, useGameStore } from '../store/gameStore.js';
import { audioEngine } from './audioEngine.js';
import { shouldShowTouchControls } from './graphicsConfig.js';
import { VirtualJoystick } from '../components/VirtualJoystick.jsx';

function readViewportTouchState(touchControlsMode) {
  if (typeof window === 'undefined') {
    return { enabled: false, compactLandscape: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    enabled: shouldShowTouchControls(touchControlsMode),
    compactLandscape: h <= 500 && w > h,
  };
}

/**
 * Syncs audio settings to the procedural audio engine and renders responsive
 * multi-touch gaming controls (Left analog joystick, Right 6-button racing pad)
 * for Android/tablet devices and narrow touch viewports.
 */
export function GameControls() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const nearbyZone = useGameStore((s) => s.nearbyZone);
  const isBoosting = useGameStore((s) => s.isBoosting);
  const nitroCooldown = useGameStore((s) => s.nitroCooldown);
  const touchInput = useGameStore((s) => s.touchInput);
  const soundEnabled = useGameStore((s) => s.settings.soundEnabled);
  const volume = useGameStore((s) => s.settings.volume);
  const touchControlsMode = useGameStore((s) => s.settings.touchControlsMode);
  const setTouchControl = useGameStore((s) => s.setTouchControl);
  const openSection = useGameStore((s) => s.openSection);

  const [viewportState, setViewportState] = useState(() =>
    readViewportTouchState(touchControlsMode)
  );

  useEffect(() => {
    audioEngine.setConfig(soundEnabled, volume);
  }, [soundEnabled, volume]);

  useEffect(() => {
    const syncViewport = () => {
      setViewportState(readViewportTouchState(touchControlsMode));
    };
    syncViewport();

    const mql = window.matchMedia?.('(pointer: coarse)');
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    mql?.addEventListener?.('change', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      mql?.removeEventListener?.('change', syncViewport);
    };
  }, [touchControlsMode]);

  const showTouchControls =
    viewportState.enabled && gamePhase === 'playing' && !activeSection && !settingsOpen;

  // Release all held touch controls whenever controls hide
  useEffect(() => {
    if (showTouchControls) return undefined;
    carLiveState.touchSteerAnalog = 0;
    const keys = ['forward', 'backward', 'brake', 'left', 'right', 'boost', 'jump'];
    keys.forEach((k) => setTouchControl(k, false));
    return undefined;
  }, [showTouchControls, setTouchControl]);

  if (!showTouchControls) return null;

  const compact = viewportState.compactLandscape;

  const bindTouch = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.stopPropagation();
      audioEngine.unlock();
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore in synthetic event environments
      }
      setTouchControl(key, true);
    },
    onPointerUp: (e) => {
      e.preventDefault();
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
      setTouchControl(key, false);
    },
    onPointerCancel: () => setTouchControl(key, false),
    onLostPointerCapture: () => setTouchControl(key, false),
    onContextMenu: (e) => e.preventDefault(),
  });

  const btnSizeClass = compact
    ? 'h-[50px] w-[60px] rounded-xl text-[9px]'
    : 'h-[58px] w-[62px] sm:h-[64px] sm:w-[74px] rounded-2xl text-[10px]';

  const accelSizeClass = compact
    ? 'h-[54px] w-[68px] rounded-xl text-[9px]'
    : 'h-[62px] w-[70px] sm:h-[68px] sm:w-[82px] rounded-2xl text-[10px]';

  const nitroCooling = nitroCooldown > 0.05;

  return (
    <div
      data-testid="mobile-touch-controls"
      className={`fixed inset-x-0 bottom-0 z-20 flex items-end justify-between pointer-events-none touch-none select-none ${
        compact ? 'px-3 pb-2.5' : 'px-3 pb-3 sm:px-5 sm:pb-5'
      }`}
    >
      {/* Left Side: Analog Steering Joystick */}
      <div className="pointer-events-auto touch-none select-none">
        <VirtualJoystick compact={compact} />
      </div>

      {/* Right Side: Action & Pedal Cluster (Interact, Jump, Nitro, Brake, Reverse, Accelerate) */}
      <div
        className={`flex flex-col items-end pointer-events-auto touch-none select-none ${
          compact ? 'gap-1.5' : 'gap-2'
        }`}
      >
        {/* Upper Action Row: Interact + Jump + Nitro */}
        <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
          <button
            type="button"
            tabIndex={-1}
            aria-label={nearbyZone ? `Interact with ${nearbyZone.title}` : 'Interact'}
            data-testid="touch-btn-interact"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              audioEngine.unlock();
              if (nearbyZone) {
                audioEngine.playInteract();
                openSection(nearbyZone.id);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={`${btnSizeClass} touch-none select-none flex flex-col items-center justify-center gap-0.5 font-mono-tech font-semibold uppercase tracking-wider transition-transform active:scale-95 ${
              nearbyZone
                ? 'bg-[#070b18]/90 border-2 border-cyan-400 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
                : 'bg-[#070b18]/75 border border-blue-400/35 text-slate-400 opacity-75'
            }`}
          >
            <CornerDownRight className="h-4 w-4" />
            <span>{nearbyZone ? 'Open' : 'Interact'}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Jump"
            data-testid="touch-btn-jump"
            className={`${btnSizeClass} touch-none select-none flex flex-col items-center justify-center gap-0.5 font-mono-tech font-semibold uppercase tracking-wider transition-transform active:scale-95 ${
              touchInput.jump
                ? 'bg-blue-500/35 border-2 border-cyan-300 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)]'
                : 'bg-[#070b18]/80 border border-blue-400/60 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
            }`}
            {...bindTouch('jump')}
          >
            <ArrowUpFromLine className="h-4 w-4" />
            <span>Jump</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Nitro Boost"
            data-testid="touch-btn-nitro"
            className={`${btnSizeClass} touch-none select-none flex flex-col items-center justify-center gap-0.5 font-mono-tech font-semibold uppercase tracking-wider transition-transform active:scale-95 ${
              isBoosting || touchInput.boost
                ? 'bg-violet-500/35 border-2 border-violet-300 text-violet-100 shadow-[0_0_18px_rgba(139,92,246,0.55)]'
                : nitroCooling
                  ? 'bg-[#070b18]/80 border border-amber-400/50 text-amber-300'
                  : 'bg-[#070b18]/80 border border-blue-400/60 text-violet-200 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
            }`}
            {...bindTouch('boost')}
          >
            <Zap className="h-4 w-4" />
            <span>{nitroCooling ? `${nitroCooldown.toFixed(1)}s` : 'Nitro'}</span>
          </button>
        </div>

        {/* Lower Pedal Row: Brake + Reverse + Accelerate */}
        <div className={`flex items-end ${compact ? 'gap-1.5' : 'gap-2'}`}>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Brake"
            data-testid="touch-btn-brake"
            className={`${btnSizeClass} touch-none select-none flex flex-col items-center justify-center gap-0.5 font-mono-tech font-semibold uppercase tracking-wider transition-transform active:scale-95 ${
              touchInput.brake
                ? 'bg-amber-500/35 border-2 border-amber-300 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                : 'bg-[#070b18]/80 border border-blue-400/60 text-amber-200 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
            }`}
            {...bindTouch('brake')}
          >
            <Octagon className="h-4 w-4" />
            <span>Brake</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Reverse"
            data-testid="touch-btn-reverse"
            className={`${btnSizeClass} touch-none select-none flex flex-col items-center justify-center gap-0.5 font-mono-tech font-semibold uppercase tracking-wider transition-transform active:scale-95 ${
              touchInput.backward
                ? 'bg-rose-500/35 border-2 border-rose-300 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.45)]'
                : 'bg-[#070b18]/80 border border-blue-400/60 text-rose-200 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
            }`}
            {...bindTouch('backward')}
          >
            <ArrowDown className="h-4 w-4" />
            <span>Rev</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Accelerate"
            data-testid="touch-btn-accelerate"
            className={`${accelSizeClass} touch-none select-none flex flex-col items-center justify-center gap-0.5 font-mono-tech font-bold uppercase tracking-wider transition-transform active:scale-95 ${
              touchInput.forward
                ? 'bg-cyan-400/35 border-2 border-cyan-300 text-white shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                : 'bg-blue-500/20 border-2 border-blue-400/80 text-cyan-100 shadow-[0_0_16px_rgba(59,130,246,0.3)]'
            }`}
            {...bindTouch('forward')}
          >
            <ArrowUp className="h-5 w-5" />
            <span>Gas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
