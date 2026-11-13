import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGameStore } from '../store/gameStore.js';
import { getGraphicsConfig } from '../game/graphicsConfig.js';

const SPEED_LINE_ANGLES = Array.from({ length: 24 }, (_, i) => i * 15);

/**
 * Lightweight radial SVG speed lines around screen edges during Nitro Boost
 * or hyper-velocity driving. Automatically disabled on LOW mobile preset.
 */
export function SpeedLinesOverlay() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const isBoosting = useGameStore((s) => s.isBoosting);
  const speedKmh = useGameStore((s) => s.speedKmh);
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);

  const layerRef = useRef(null);
  const svgRef = useRef(null);

  const preset = getGraphicsConfig(graphicsQuality);
  const active =
    preset.enableSpeedLines &&
    gamePhase === 'playing' &&
    !activeSection &&
    (isBoosting || speedKmh >= 135);

  useEffect(() => {
    const el = layerRef.current;
    const svg = svgRef.current;
    if (!el || !svg) return undefined;

    if (active) {
      gsap.to(el, {
        opacity: isBoosting ? 0.92 : 0.45,
        duration: 0.22,
        ease: 'power2.out',
      });
      const tween = gsap.to(svg, {
        scale: 1.06,
        rotation: 2.5,
        duration: 0.16,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      return () => tween.kill();
    }

    gsap.to(el, {
      opacity: 0,
      duration: 0.28,
      ease: 'power2.out',
    });
    return undefined;
  }, [active, isBoosting]);

  if (gamePhase === 'loading' || gamePhase === 'menu') return null;

  return (
    <div
      ref={layerRef}
      data-testid="nitro-speed-lines"
      aria-hidden="true"
      className="fixed inset-0 z-10 pointer-events-none overflow-hidden opacity-0"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="nitroStreakCyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {SPEED_LINE_ANGLES.map((deg, idx) => {
          const rad = (deg * Math.PI) / 180;
          const innerR = idx % 2 === 0 ? 350 : 385;
          const outerR = 540;
          const x1 = 500 + Math.cos(rad) * innerR;
          const y1 = 500 + Math.sin(rad) * innerR;
          const x2 = 500 + Math.cos(rad) * outerR;
          const y2 = 500 + Math.sin(rad) * outerR;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#nitroStreakCyan)"
              strokeWidth={idx % 3 === 0 ? 3.2 : 1.8}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
    </div>
  );
}
