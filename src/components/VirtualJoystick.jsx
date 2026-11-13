import { useEffect, useRef, useState } from 'react';
import { carLiveState } from '../store/gameStore.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Analog virtual steering joystick for Android/tablet touchscreens.
 * Tracks a dedicated pointerId so steering works concurrently with right-hand pedals,
 * and writes smooth -1..+1 values to carLiveState.touchSteerAnalog without 60Hz React renders.
 */
export function VirtualJoystick({ compact = false }) {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const activePointerIdRef = useRef(null);
  const [engaged, setEngaged] = useState(false);

  const diameter = compact ? 112 : 128;
  const maxTravel = compact ? 34 : 40;
  const deadzonePx = 3;

  const resetStick = () => {
    activePointerIdRef.current = null;
    carLiveState.touchSteerAnalog = 0;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
    setEngaged(false);
  };

  useEffect(() => {
    const onWindowBlur = () => resetStick();
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      carLiveState.touchSteerAnalog = 0;
    };
  }, []);

  const updateFromClient = (clientX, clientY) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxTravel) {
      const scale = maxTravel / dist;
      dx *= scale;
      dy *= scale;
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${dx.toFixed(1)}px, ${(dy * 0.55).toFixed(1)}px, 0)`;
    }

    // In vehicleMath, steerDir > 0 turns LEFT (-X) and steerDir < 0 turns RIGHT (+X).
    // Dragging joystick left produces dx < 0 -> positive steerAnalog.
    if (Math.abs(dx) <= deadzonePx) {
      carLiveState.touchSteerAnalog = 0;
    } else {
      carLiveState.touchSteerAnalog = Math.max(-1, Math.min(1, -dx / maxTravel));
    }
  };

  const handlePointerDown = (e) => {
    if (activePointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    audioEngine.unlock();
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events in automated browsers may not support capture
    }
    setEngaged(true);
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerEnd = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }
    resetStick();
  };

  return (
    <div
      ref={baseRef}
      role="slider"
      aria-label="Steering joystick"
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={0}
      data-testid="virtual-joystick"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: `${diameter}px`, height: `${diameter}px` }}
      className={`relative flex items-center justify-center rounded-full touch-none select-none transition-colors ${
        engaged
          ? 'bg-[#070b18]/90 border-2 border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.4)]'
          : 'bg-[#070b18]/80 border-2 border-blue-400/65 shadow-[0_0_18px_rgba(59,130,246,0.25)]'
      }`}
    >
      {/* Inner neon guide ring & L/R orientation markers */}
      <div className="pointer-events-none absolute inset-3 rounded-full border border-blue-400/25" />
      <div className="pointer-events-none absolute inset-x-3 h-px bg-blue-400/20" />
      <span className="pointer-events-none absolute left-2.5 font-mono-tech text-[10px] font-semibold text-blue-300/75">
        L
      </span>
      <span className="pointer-events-none absolute right-2.5 font-mono-tech text-[10px] font-semibold text-blue-300/75">
        R
      </span>
      <span className="pointer-events-none absolute bottom-1.5 font-mono-tech text-[9px] tracking-widest text-slate-400 uppercase">
        Steer
      </span>

      {/* Movable thumbstick knob */}
      <div
        ref={knobRef}
        data-testid="virtual-joystick-knob"
        className={`pointer-events-none flex items-center justify-center rounded-full border-2 will-change-transform transition-colors ${
          compact ? 'h-11 w-11' : 'h-12 w-12'
        } ${
          engaged
            ? 'border-cyan-200 bg-cyan-400/40 shadow-[0_0_18px_rgba(34,211,238,0.65)]'
            : 'border-blue-300/80 bg-blue-500/30 shadow-[0_0_14px_rgba(59,130,246,0.45)]'
        }`}
      >
        <div className="h-3.5 w-3.5 rounded-full bg-cyan-200/90" />
      </div>
    </div>
  );
}
