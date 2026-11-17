import { Suspense, lazy, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { useGameStore } from '../store/gameStore.js';
import { PORTFOLIO_ZONES } from '../game/worldZones.js';
import { audioEngine } from '../game/audioEngine.js';

const About = lazy(() =>
  import('../sections/About.jsx').then((m) => ({ default: m.About }))
);
const Skills = lazy(() =>
  import('../sections/Skills.jsx').then((m) => ({ default: m.Skills }))
);
const Projects = lazy(() =>
  import('../sections/Projects.jsx').then((m) => ({ default: m.Projects }))
);
const Experience = lazy(() =>
  import('../sections/Experience.jsx').then((m) => ({ default: m.Experience }))
);
const Achievements = lazy(() =>
  import('../sections/Achievements.jsx').then((m) => ({ default: m.Achievements }))
);
const Contact = lazy(() =>
  import('../sections/Contact.jsx').then((m) => ({ default: m.Contact }))
);

function SectionLoadingFallback() {
  return (
    <div className="py-12 text-center font-mono-tech text-xs text-cyan-300 tracking-widest uppercase">
      Loading Module...
    </div>
  );
}

/**
 * Interactive portfolio modal displayed when driving into any of the 6 locations and pressing [E],
 * or selecting a section directly from the HUD / holographic sign.
 * Sections are lazy-loaded to keep initial mobile load light, with GSAP panel transitions.
 */
export function InteractionPanel() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);
  const openSection = useGameStore((s) => s.openSection);
  const closeSection = useGameStore((s) => s.closeSection);
  const startGame = useGameStore((s) => s.startGame);
  const teleportToZone = useGameStore((s) => s.teleportToZone);

  const panelRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!activeSection || !panelRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 20, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power3.out' }
      );
      if (bodyRef.current) {
        gsap.fromTo(
          bodyRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.32, delay: 0.05, ease: 'power2.out' }
        );
      }
    }, panelRef);
    return () => ctx.revert();
  }, [activeSection]);

  if (!activeSection) return null;

  const handleResumeOrJump = (nextSection) => {
    audioEngine.playButtonClick();
    if (typeof nextSection === 'string') {
      openSection(nextSection);
    } else {
      closeSection();
      if (gamePhase === 'menu') {
        startGame();
      }
    }
  };

  const isFromMenu = gamePhase === 'menu';
  const currentZone = PORTFOLIO_ZONES.find((z) => z.id === activeSection);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Portfolio section: ${activeSection}`}
    >
      <div
        ref={panelRef}
        className="panel-surface flex w-full max-w-4xl flex-col rounded-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Active Zone Header & Close Button */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-neutral-950/40 backdrop-blur-md px-4 py-3 sm:px-6 shrink-0">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: currentZone?.color || '#06b6d4' }}
            />
            <h2 className="font-display text-sm sm:text-base font-bold tracking-wide text-white uppercase">
              {currentZone?.title || activeSection}
            </h2>
            <span className="hidden sm:inline-block rounded-md border border-white/10 bg-neutral-900/60 px-2 py-0.5 font-mono-tech text-[10px] text-cyan-300 uppercase">
              {currentZone?.shortLabel || 'Zone'} Module
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isFromMenu ? 'Back to Menu' : 'Close panel and resume driving'}
              onClick={() => {
                audioEngine.playButtonClick();
                closeSection();
                if (isFromMenu) {
                  startGame();
                }
              }}
              className="btn-racing-glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
            >
              <span>{isFromMenu ? 'Back to Menu' : 'Close & Drive'}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Panel Body */}
        <div ref={bodyRef} className="overflow-y-auto p-5 sm:p-8 custom-scrollbar">
          <Suspense fallback={<SectionLoadingFallback />}>
            {activeSection === 'about' && <About />}
            {activeSection === 'skills' && <Skills />}
            {activeSection === 'projects' && (
              <Projects onCloseAndDrive={handleResumeOrJump} />
            )}
            {activeSection === 'experience' && <Experience />}
            {activeSection === 'achievements' && <Achievements />}
            {activeSection === 'contact' && <Contact />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default InteractionPanel;
