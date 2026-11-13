import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Home, Play, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Full-featured Pause / Game Menu modal triggered via [ESC] or HUD Menu button.
 * Includes Resume, Restart, Settings, Sound (mute + live volume slider), and Exit to Main Menu.
 */
export function GameMenuModal() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const settings = useGameStore((s) => s.settings);
  const score = useGameStore((s) => s.score);
  const checkpointsCleared = useGameStore((s) => s.checkpointsCleared);
  const collectedCrystals = useGameStore((s) => s.collectedCrystals);
  const discoveredEggs = useGameStore((s) => s.discoveredEggs);

  const togglePause = useGameStore((s) => s.togglePause);
  const restartGame = useGameStore((s) => s.restartGame);
  const toggleSettings = useGameStore((s) => s.toggleSettings);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const returnToMenu = useGameStore((s) => s.returnToMenu);

  const cardRef = useRef(null);

  const visible = gamePhase === 'paused' && !activeSection && !settingsOpen;

  useEffect(() => {
    if (!visible || !cardRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 18, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.28, ease: 'power3.out' }
      );
    }, cardRef);
    return () => ctx.revert();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#030612]/82 p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Game Menu"
    >
      <div
        ref={cardRef}
        className="panel-surface w-full max-w-md rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="font-mono-tech text-xs tracking-widest text-cyan-400 uppercase">
              Game Menu · Paused
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              ANIKET PORTFOLIO
            </h2>
          </div>
          <div className="text-right">
            <div className="font-mono-tech text-[10px] uppercase text-slate-400">Score</div>
            <div className="font-display text-xl font-bold text-cyan-300 tabular-nums">
              {score}
            </div>
          </div>
        </div>

        {/* Live Session Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 py-2 px-2">
            <div className="font-mono-tech text-[10px] text-slate-400 uppercase">Checkpoints</div>
            <div className="font-display text-sm font-bold text-white tabular-nums">
              {checkpointsCleared.length}/6
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 py-2 px-2">
            <div className="font-mono-tech text-[10px] text-slate-400 uppercase">Crystals</div>
            <div className="font-display text-sm font-bold text-cyan-300 tabular-nums">
              {collectedCrystals.length}/12
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 py-2 px-2">
            <div className="font-mono-tech text-[10px] text-slate-400 uppercase">Secrets</div>
            <div className="font-display text-sm font-bold text-amber-300 tabular-nums">
              {discoveredEggs.length}/3
            </div>
          </div>
        </div>

        {/* Primary Menu Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playButtonClick();
              togglePause();
            }}
            className="btn-racing-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playButtonClick();
              restartGame();
            }}
            className="btn-racing-glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-100"
          >
            <RotateCcw className="h-4 w-4 text-cyan-400" />
            <span>Restart</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playButtonClick();
              toggleSettings();
            }}
            className="btn-racing-glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-100"
          >
            <Settings className="h-4 w-4 text-blue-400" />
            <span>Settings</span>
          </button>

          {/* Inline Sound Mute + Volume Control */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-cyan-400" />
                ) : (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                )}
                <span>Sound</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.unlock();
                  toggleSound();
                }}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  settings.soundEnabled
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? 'On' : 'Muted'}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="menu-volume" className="text-[11px] font-mono-tech text-slate-400">
                Vol
              </label>
              <input
                id="menu-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
                className="w-full accent-cyan-400"
              />
              <span className="font-mono-tech text-[11px] text-slate-300 tabular-nums w-9 text-right">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              audioEngine.playButtonClick();
              returnToMenu();
            }}
            className="btn-racing-glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white"
          >
            <Home className="h-4 w-4 text-violet-400" />
            <span>Exit to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
