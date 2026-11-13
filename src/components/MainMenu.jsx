import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowRight,
  Compass,
  Play,
  Settings,
  User,
  X,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { PORTFOLIO_ZONES } from '../game/worldZones.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Next-generation racing Main Menu layered cleanly over the live 3D hypercar showcase.
 * Provides: START ENGINE, EXPLORE PORTFOLIO (traditional non-driving directory),
 * SETTINGS, and ABOUT, while leaving the center hypercar clear.
 */
export function MainMenu() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const startGame = useGameStore((s) => s.startGame);
  const openSection = useGameStore((s) => s.openSection);
  const toggleSettings = useGameStore((s) => s.toggleSettings);

  const [directoryOpen, setDirectoryOpen] = useState(false);
  const rootRef = useRef(null);
  const directoryRef = useRef(null);

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

  useEffect(() => {
    if (!directoryOpen || !directoryRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        directoryRef.current,
        { opacity: 0, x: 16, scale: 0.98 },
        { opacity: 1, x: 0, scale: 1, duration: 0.24, ease: 'power2.out' }
      );
    }, directoryRef);
    return () => ctx.revert();
  }, [directoryOpen]);

  if (gamePhase !== 'menu') return null;

  const handleStart = (e) => {
    e.currentTarget.blur();
    audioEngine.unlock();
    audioEngine.playButtonClick();
    audioEngine.playUiChime();
    setDirectoryOpen(false);
    startGame();
  };

  const handleOpenAbout = (e) => {
    e.currentTarget.blur();
    audioEngine.unlock();
    audioEngine.playInteract();
    openSection('about');
  };

  const handleOpenSettings = (e) => {
    e.currentTarget.blur();
    audioEngine.unlock();
    audioEngine.playButtonClick();
    toggleSettings();
  };

  const handleToggleDirectory = (e) => {
    e.currentTarget.blur();
    audioEngine.unlock();
    audioEngine.playButtonClick();
    setDirectoryOpen((prev) => !prev);
  };

  const modalCovering = Boolean(activeSection || settingsOpen);

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-8 lg:p-12 pointer-events-none ${
        modalCovering ? 'opacity-25 transition-opacity duration-200' : 'opacity-100 transition-opacity duration-200'
      }`}
    >
      {/* Upper Row: Primary Left Command Card + Optional Traditional Portfolio Directory */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-4 max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar lg:overflow-visible">
        {/* Left Glassmorphic Command Lockup (leaves center 3D hypercar clear) */}
        <div className="menu-glass-card w-full max-w-[430px] rounded-2xl p-5 sm:p-7 space-y-5 pointer-events-auto shrink-0">
          <div className="space-y-2">
            <div className="gs-menu-reveal inline-flex items-center gap-2.5 text-xs font-medium tracking-[0.2em] text-cyan-300 uppercase">
              <span>Game Developer</span>
              <span className="text-slate-500" aria-hidden="true">·</span>
              <span>Software Developer</span>
            </div>

            <h1 className="gs-menu-reveal font-display text-5xl font-extrabold tracking-tight text-white sm:text-6xl drop-shadow-[0_4px_26px_rgba(59,130,246,0.35)]">
              ANIKET
            </h1>

            <p className="gs-menu-reveal font-display text-base sm:text-lg font-semibold tracking-[0.2em] text-cyan-300">
              3D DEVELOPER PORTFOLIO
            </p>
          </div>

          <p className="gs-menu-reveal text-sm sm:text-base text-slate-300 leading-relaxed">
            &ldquo;Welcome to my digital universe.&rdquo;
          </p>

          {/* Primary & Secondary Menu Actions */}
          <div className="gs-menu-reveal space-y-2.5 pt-1">
            <button
              type="button"
              data-start="true"
              onClick={handleStart}
              className="btn-racing-primary group flex w-full items-center justify-center gap-3 rounded-xl px-6 py-3.5 font-display text-sm font-bold tracking-wider text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 whitespace-nowrap"
            >
              <Play className="h-4 w-4 fill-white transition-transform group-hover:translate-x-0.5" />
              <span>START ENGINE</span>
            </button>

            <button
              type="button"
              data-testid="menu-explore-portfolio"
              onClick={handleToggleDirectory}
              aria-expanded={directoryOpen}
              className={`btn-racing-glass flex w-full items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-semibold text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 whitespace-nowrap ${
                directoryOpen ? 'border-cyan-400/75 text-cyan-200' : ''
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Compass className="h-4 w-4 text-cyan-400" />
                <span>EXPLORE PORTFOLIO</span>
              </span>
              <span className="font-mono-tech text-[11px] text-slate-400">
                {directoryOpen ? 'Hide' : 'No Driving'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="menu-settings"
                onClick={handleOpenSettings}
                className="btn-racing-glass flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 whitespace-nowrap"
              >
                <Settings className="h-4 w-4 text-blue-400" />
                <span>SETTINGS</span>
              </button>

              <button
                type="button"
                data-testid="menu-about"
                onClick={handleOpenAbout}
                className="btn-racing-glass flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 whitespace-nowrap"
              >
                <User className="h-4 w-4 text-violet-400" />
                <span>ABOUT</span>
              </button>
            </div>
          </div>
        </div>

        {/* Traditional Non-Driving Portfolio Navigator (opened by EXPLORE PORTFOLIO) */}
        {directoryOpen && (
          <nav
            ref={directoryRef}
            aria-label="Traditional Portfolio Navigation"
            data-testid="traditional-portfolio-nav"
            className="panel-surface w-full max-w-md rounded-2xl p-5 space-y-4 pointer-events-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-display text-lg font-bold text-white">
                  Direct Portfolio Navigation
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Browse any section immediately without driving.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close portfolio directory"
                onClick={handleToggleDirectory}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-cyan-400/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PORTFOLIO_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  data-testid={`nav-card-${zone.id}`}
                  onClick={() => {
                    audioEngine.unlock();
                    audioEngine.playInteract();
                    openSection(zone.id);
                  }}
                  className="hud-surface hud-interactive group flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {zone.shortLabel}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {zone.subtitle}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all"
                  />
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>

      {/* Bottom Safe-Margin Control Hint */}
      <div className="gs-menu-reveal hud-surface flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200 rounded-xl px-4 py-2.5 pointer-events-auto">
        <div className="font-mono-tech tracking-wide">
          WASD / Arrows Drive · Space Jump · Shift Nitro · E Interact · ESC Menu
        </div>
        <div className="font-mono-tech text-cyan-300">
          Prefer clicking? Use Explore Portfolio above
        </div>
      </div>
    </div>
  );
}
