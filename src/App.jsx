import { Component, Suspense, lazy, useEffect, useRef } from 'react';
import { useKeyboard } from './hooks/useKeyboard.js';
import { useGameStore } from './store/gameStore.js';
import { GameWorld } from './game/GameWorld.jsx';
import { GameControls } from './game/GameControls.jsx';
import { LoadingScreen } from './components/LoadingScreen.jsx';
import { MainMenu } from './components/MainMenu.jsx';
import { SpeedLinesOverlay } from './components/SpeedLinesOverlay.jsx';
import { HudNotifications } from './components/HudNotifications.jsx';
import { GameHUD } from './components/GameHUD.jsx';
import { GameMenuModal } from './components/GameMenuModal.jsx';
import { audioEngine } from './game/audioEngine.js';

const SettingsPanel = lazy(() => import('./components/SettingsPanel.jsx'));
const InteractionPanel = lazy(() => import('./components/InteractionPanel.jsx'));

class WorldErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unable to initialize 3D WebGL scene.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="panel-surface max-w-md rounded-2xl p-6 text-center space-y-4">
            <h2 className="font-display text-2xl font-bold text-white">
              3D Graphics Unavailable
            </h2>
            <p className="text-sm text-slate-300">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { keysRef, jumpQueuedRef } = useKeyboard();
  const webglError = useGameStore((s) => s.webglError);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const activeSection = useGameStore((s) => s.activeSection);
  const nearbyZone = useGameStore((s) => s.nearbyZone);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const openSection = useGameStore((s) => s.openSection);
  const lastZoneRef = useRef(null);

  // Automatically open the section when approaching its 3D landmark
  useEffect(() => {
    if (gamePhase !== 'playing') {
      lastZoneRef.current = null;
      return;
    }

    if (nearbyZone && nearbyZone.id !== lastZoneRef.current) {
      lastZoneRef.current = nearbyZone.id;
      audioEngine.unlock();
      audioEngine.playInteract();
      openSection(nearbyZone.id);
    } else if (!nearbyZone) {
      lastZoneRef.current = null;
    }
  }, [nearbyZone, gamePhase, openSection]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#050814] touch-none select-none">
      <WorldErrorBoundary>
        <GameWorld keysRef={keysRef} jumpQueuedRef={jumpQueuedRef} />
      </WorldErrorBoundary>

      {webglError && (
        <div
          role="alert"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-6"
        >
          <div className="panel-surface max-w-md rounded-2xl p-6 text-center space-y-4">
            <h2 className="font-display text-xl font-bold text-white">
              WebGL Context Interrupted
            </h2>
            <p className="text-sm text-slate-300">{webglError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950"
            >
              Restore 3D Scene
            </button>
          </div>
        </div>
      )}

      <LoadingScreen />
      <MainMenu />
      <SpeedLinesOverlay />
      <HudNotifications />
      <GameHUD />
      <GameControls />
      <GameMenuModal />
      <Suspense fallback={null}>
        {settingsOpen && <SettingsPanel />}
        {activeSection && <InteractionPanel />}
      </Suspense>
    </main>
  );
}
