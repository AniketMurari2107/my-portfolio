import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGameStore } from '../store/gameStore.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Next-generation racing Main Menu layered cleanly over the live 3D hypercar showcase.
 * Clicking or tapping anywhere on the screen starts the game automatically.
 */
export function MainMenu() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const startGame = useGameStore((s) => s.startGame);

  const rootRef = useRef(null);

  const handleStart = () => {
    if (useGameStore.getState().gamePhase !== 'menu') return;
    audioEngine.unlock();
    audioEngine.playButtonClick();
    audioEngine.playUiChime();
    startGame();
  };

  useEffect(() => {
    if (gamePhase !== 'menu') return undefined;

    const onPointerDown = () => {
      if (activeSection || settingsOpen) return;
      handleStart();
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gamePhase, activeSection, settingsOpen]);

  useEffect(() => {
    if (gamePhase !== 'menu' || !rootRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gs-menu-reveal',
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.05,
          ease: 'power3.out',
          clearProps: 'transform',
        }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [gamePhase]);

  if (gamePhase !== 'menu') return null;

  const modalCovering = Boolean(activeSection || settingsOpen);

  return (
    <div
      ref={rootRef}
      onClick={handleStart}
      className={`fixed inset-0 z-20 flex flex-col justify-end p-4 sm:p-8 lg:p-12 cursor-pointer select-none pointer-events-auto ${
        modalCovering ? 'opacity-25 transition-opacity duration-200 pointer-events-none' : 'opacity-100 transition-opacity duration-200'
      }`}
      role="button"
      tabIndex={0}
      aria-label="Click anywhere to start game"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleStart();
        }
      }}
    >
      {/* Bottom Safe-Margin Control Hint with Click-to-Start CTA */}
      <div className="gs-menu-reveal hud-surface flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200 rounded-xl px-4 py-2.5 pointer-events-none">
        <div className="font-mono-tech tracking-wide">
          WASD / Arrows Drive · Space Jump · Shift Nitro · E Interact · ESC Menu
        </div>
        <div className="font-mono-tech text-cyan-300 font-bold tracking-wider animate-pulse">
          CLICK ANYWHERE TO START
        </div>
      </div>
    </div>
  );
}
