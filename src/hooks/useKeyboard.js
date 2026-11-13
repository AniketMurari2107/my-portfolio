import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { audioEngine } from '../game/audioEngine.js';

/**
 * Unified keyboard input controller.
 * Stores high-frequency held keys in a mutable ref (zero React re-renders during driving)
 * and dispatches discrete one-shot actions (Interact, Pause, Start, Sound, Reset).
 */
export function useKeyboard() {
  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
    jump: false,
  });

  const jumpQueuedRef = useRef(false);

  useEffect(() => {
    const clearAllKeys = () => {
      keysRef.current.forward = false;
      keysRef.current.backward = false;
      keysRef.current.left = false;
      keysRef.current.right = false;
      keysRef.current.boost = false;
      keysRef.current.jump = false;
      jumpQueuedRef.current = false;
    };

    const handleKeyDown = (event) => {
      // Ignore keyboard driving shortcuts while typing inside an input/textarea
      const tag = event.target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select';

      const state = useGameStore.getState();

      // Escape always toggles pause or closes open modal
      if (event.code === 'Escape') {
        event.preventDefault();
        state.togglePause();
        return;
      }

      if (isTyping) return;

      // Menu Start handshake on Enter or Space
      if (state.gamePhase === 'menu' && (event.code === 'Enter' || event.code === 'Space')) {
        event.preventDefault();
        audioEngine.unlock();
        audioEngine.playUiChime();
        state.startGame();
        return;
      }

      // Mute toggle
      if (event.code === 'KeyM') {
        state.toggleSound();
        return;
      }

      // Reset car position
      if (event.code === 'KeyR' && state.gamePhase === 'playing' && !state.activeSection) {
        state.resetCar();
        return;
      }

      // Reset camera orientation
      if (event.code === 'KeyC' && state.gamePhase === 'playing' && !state.activeSection) {
        state.requestCameraReset();
        return;
      }

      // Cycle weather condition (Clear -> Foggy)
      if (event.code === 'KeyT' && !event.repeat && state.gamePhase === 'playing' && !state.activeSection) {
        audioEngine.unlock();
        audioEngine.playButtonClick();
        state.cycleWeather(true);
        return;
      }

      // Interact with nearby zone
      if (event.code === 'KeyE' && !event.repeat && state.gamePhase === 'playing') {
        if (state.activeSection) {
          state.closeSection();
          return;
        }
        if (state.nearbyZone) {
          audioEngine.playInteract();
          state.openSection(state.nearbyZone.id);
          return;
        }
      }

      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          audioEngine.unlock();
          keysRef.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          audioEngine.unlock();
          keysRef.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          audioEngine.unlock();
          keysRef.current.boost = true;
          break;
        case 'Space':
          if (state.gamePhase === 'playing' && !state.activeSection) {
            event.preventDefault();
            audioEngine.unlock();
            if (!event.repeat) {
              jumpQueuedRef.current = true;
            }
            keysRef.current.jump = true;
          }
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keysRef.current.boost = false;
          break;
        case 'Space':
          keysRef.current.jump = false;
          break;
        default:
          break;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) clearAllKeys();
    };

    const unsubscribeStore = useGameStore.subscribe((state, prevState) => {
      if (
        (state.activeSection && !prevState.activeSection) ||
        (state.gamePhase !== 'playing' && prevState.gamePhase === 'playing')
      ) {
        clearAllKeys();
      }
    });

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearAllKeys);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribeStore();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearAllKeys);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return { keysRef, jumpQueuedRef };
}
