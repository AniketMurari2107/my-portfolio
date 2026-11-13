import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGameStore } from '../store/gameStore.js';

/**
 * Cinematic futuristic loading screen featuring the ANIKET monogram crest,
 * GSAP-animated orbital telemetry rings, progress bar, and welcome brief.
 */
export function LoadingScreen() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const worldReady = useGameStore((s) => s.worldReady);
  const [displayProgress, setDisplayProgress] = useState(18);
  const containerRef = useRef(null);

  useEffect(() => {
    if (gamePhase !== 'loading' || !containerRef.current) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gs-load-item',
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.09, ease: 'power3.out' }
      );
      if (!reduced) {
        gsap.to('.gs-load-ring-cw', {
          rotation: 360,
          duration: 14,
          repeat: -1,
          ease: 'none',
          transformOrigin: '50% 50%',
        });
        gsap.to('.gs-load-ring-ccw', {
          rotation: -360,
          duration: 9,
          repeat: -1,
          ease: 'none',
          transformOrigin: '50% 50%',
        });
      }
    }, containerRef);
    return () => ctx.revert();
  }, [gamePhase]);

  useEffect(() => {
    if (worldReady) {
      setDisplayProgress(100);
      return undefined;
    }
    const interval = window.setInterval(() => {
      setDisplayProgress((prev) => (prev < 94 ? Math.min(94, prev + 12) : prev));
    }, 80);
    return () => window.clearInterval(interval);
  }, [worldReady]);

  if (gamePhase !== 'loading') return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#03050c] px-6 overflow-hidden"
      role="status"
      aria-label="Loading 3D Portfolio"
    >
      {/* Subtle radial atmospheric backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(37, 99, 235, 0.16) 0%, rgba(139, 92, 246, 0.08) 34%, rgba(3, 5, 12, 0.98) 72%)',
        }}
      />

      <div className="relative w-full max-w-md space-y-6 text-center">
        {/* Animated ANIKET Logo Crest & Orbital Frame */}
        <div className="gs-load-item mx-auto flex flex-col items-center gap-4">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg
              viewBox="0 0 120 120"
              className="h-24 w-24"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="aniketCrestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="rgba(59,130,246,0.22)"
                strokeWidth="1.5"
              />
              <circle
                className="gs-load-ring-cw"
                cx="60"
                cy="60"
                r="46"
                fill="none"
                stroke="url(#aniketCrestGrad)"
                strokeWidth="2.5"
                strokeDasharray="64 26 18 26"
                strokeLinecap="round"
              />
              <circle
                className="gs-load-ring-ccw"
                cx="60"
                cy="60"
                r="36"
                fill="none"
                stroke="rgba(6,182,212,0.55)"
                strokeWidth="1.5"
                strokeDasharray="28 18"
                strokeLinecap="round"
              />
              {/* Stylized geometric A emblem */}
              <path
                d="M60 33 L79 81 H69.5 L65.2 69.5 H54.8 L50.5 81 H41 L60 33 Z M60 49 L56.8 61 H63.2 L60 49 Z"
                fill="url(#aniketCrestGrad)"
              />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[0.14em] text-white">
              ANIKET
            </h1>
            <p className="font-display text-xs font-semibold tracking-[0.3em] text-cyan-300 uppercase">
              3D Developer Portfolio
            </p>
          </div>
        </div>

        {/* Short Welcome Message */}
        <p className="gs-load-item text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
          Welcome to my digital universe. Preparing the 3D circuit, hypercar dynamics, and interactive portfolio zones.
        </p>

        {/* Glass Progress Bar Container */}
        <div className="gs-load-item hud-surface rounded-2xl p-4 space-y-2.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/90 border border-blue-500/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 transition-all duration-200 shadow-[0_0_14px_rgba(6,182,212,0.65)]"
              style={{ width: `${displayProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 font-mono-tech tabular-nums">
            <span>Loading 3D Environment</span>
            <span className="text-cyan-300 font-semibold">{displayProgress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
