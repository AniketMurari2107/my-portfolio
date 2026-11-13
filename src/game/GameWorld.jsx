import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  clearAssetCache,
  detectSoftwareGl,
  detectTextureCapabilities,
} from './proceduralAssets.js';
import { getGraphicsConfig } from './graphicsConfig.js';
import { PhysicsController } from './PhysicsController.jsx';
import { WorldObjects } from './WorldObjects.jsx';
import { PlayerCar } from './PlayerCar.jsx';
import { CameraController } from './CameraController.jsx';
import { PostEffects } from './PostEffects.jsx';
import { WeatherSystem } from './WeatherSystem.jsx';
import { CinematicSky } from './CinematicSky.jsx';
import { getWeatherConfig } from './weatherConfig.js';
import { carLiveState, useGameStore } from '../store/gameStore.js';

/**
 * Generates procedural RoomEnvironment reflections via PMREMGenerator,
 * enforces adaptive DPR scaling on mid-range mobile GPUs, and paces software-WebGL frames.
 */
function SceneEnvironmentAndPacer({ isSoftwareGl, preset }) {
  const { gl, scene, invalidate } = useThree();
  const fpsCheckRef = useRef({ frames: 0, elapsed: 0, lowered: false });

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = preset.envIntensity;
    detectTextureCapabilities(gl.getContext());
    roomEnv.dispose();
    pmrem.dispose();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene]);

  // Dispose cached textures when the canvas unmounts
  useEffect(() => {
    return () => clearAssetCache();
  }, []);

  // Adaptive DPR monitoring on real hardware GPUs (never throttles software-WebGL)
  useFrame((_, dt) => {
    if (isSoftwareGl || fpsCheckRef.current.lowered) return;
    fpsCheckRef.current.frames += 1;
    fpsCheckRef.current.elapsed += Math.min(dt, 0.2);
    if (fpsCheckRef.current.elapsed >= 3.0) {
      const avgFps = fpsCheckRef.current.frames / fpsCheckRef.current.elapsed;
      if (avgFps < 28) {
        gl.setPixelRatio(Math.min(1, window.devicePixelRatio || 1));
        fpsCheckRef.current.lowered = true;
      }
      fpsCheckRef.current.frames = 0;
      fpsCheckRef.current.elapsed = 0;
    }
  });

  // Software-WebGL frame pacer (afterDraw -> wait fenceSync -> 80ms pause -> invalidate)
  useEffect(() => {
    if (!isSoftwareGl) return undefined;
    let active = true;
    let timerId = 0;

    const scheduleNext = () => {
      if (!active) return;
      const context = gl.getContext();
      if (context && typeof context.fenceSync === 'function') {
        const sync = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
        context.flush();
        const poll = () => {
          if (!active) return;
          const status = sync && context.getSyncParameter(sync, context.SYNC_STATUS);
          if (status === context.UNSIGNALED) {
            timerId = window.setTimeout(poll, 8);
          } else {
            if (sync) context.deleteSync(sync);
            timerId = window.setTimeout(() => {
              if (!active) return;
              invalidate();
              scheduleNext();
            }, 120);
          }
        };
        timerId = window.setTimeout(poll, 10);
      } else {
        timerId = window.setTimeout(() => {
          if (!active) return;
          invalidate();
          scheduleNext();
        }, 120);
      }
    };

    invalidate();
    scheduleNext();

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [gl, invalidate, isSoftwareGl]);

  return null;
}

/**
 * Dynamic animated neon lights sweeping gently over asphalt and hypercar clearcoat.
 * Calibrated intensity avoids harsh white specular glare while reacting to weather.
 */
function AnimatedNeonLights({ enabled }) {
  const cyanSweeperRef = useRef(null);
  const purpleSweeperRef = useRef(null);
  const weather = useGameStore((s) => s.weather);
  const weatherMult = getWeatherConfig(weather).neonLightMultiplier;

  useFrame((state) => {
    if (!enabled) return;
    const t = state.clock.elapsedTime;
    const boostAdd = carLiveState.isBoosting ? 7 : 0;

    if (cyanSweeperRef.current) {
      cyanSweeperRef.current.position.set(
        carLiveState.x + Math.sin(t * 0.7) * 16,
        6.5,
        carLiveState.z + Math.cos(t * 0.7) * 16
      );
      cyanSweeperRef.current.intensity = (8.5 + Math.sin(t * 2.2) * 2.0 + boostAdd) * weatherMult;
    }
    if (purpleSweeperRef.current) {
      purpleSweeperRef.current.position.set(
        Math.cos(t * 0.35) * 34,
        8.5,
        Math.sin(t * 0.35) * 34
      );
      purpleSweeperRef.current.intensity = (10.5 + Math.cos(t * 1.8) * 2.4) * weatherMult;
    }
  });

  if (!enabled) return null;

  return (
    <>
      <pointLight
        ref={cyanSweeperRef}
        color="#06b6d4"
        intensity={9}
        distance={40}
        decay={2}
      />
      <pointLight
        ref={purpleSweeperRef}
        color="#8b5cf6"
        intensity={10.5}
        distance={52}
        decay={2}
      />
    </>
  );
}

/**
 * Coordinates the 3-point lighting rig, exponential fog, and dynamic WeatherSystem particles.
 */
function LightingAndWeatherRig({ preset, shadowsEnabled }) {
  const hemiLightRef = useRef(null);
  const keyLightRef = useRef(null);
  const fillLightRef = useRef(null);
  const rimLightRef = useRef(null);

  return (
    <>
      <hemisphereLight ref={hemiLightRef} args={['#38bdf8', '#050816', 0.5]} />
      <directionalLight
        ref={keyLightRef}
        position={[32, 46, 26]}
        intensity={1.25}
        color="#dbeafe"
        castShadow={shadowsEnabled}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={2}
        shadow-camera-far={130}
      />
      <directionalLight
        ref={fillLightRef}
        position={[-34, 24, -30]}
        intensity={0.68}
        color="#8b5cf6"
      />
      <directionalLight
        ref={rimLightRef}
        position={[0, 14, -44]}
        intensity={0.4}
        color="#3b82f6"
      />

      <AnimatedNeonLights enabled={preset.enableAnimatedLights} />

      <WeatherSystem
        hemiLightRef={hemiLightRef}
        keyLightRef={keyLightRef}
        fillLightRef={fillLightRef}
        rimLightRef={rimLightRef}
        baseEnvIntensity={preset.envIntensity}
        fogWispLimit={preset.fogWisps}
      />
    </>
  );
}

/**
 * Root 3D WebGL Canvas mounting the futuristic open-world environment,
 * calibrated PBR reflections, dynamic WeatherSystem, Bloom/AO/Color Grading, Rapier physics, and hypercar.
 */
export function GameWorld({ keysRef, jumpQueuedRef }) {
  const graphicsQuality = useGameStore((s) => s.settings.graphicsQuality);
  const setWebglError = useGameStore((s) => s.setWebglError);

  const isSoftwareGl = useMemo(() => detectSoftwareGl(), []);
  const preset = useMemo(() => getGraphicsConfig(graphicsQuality), [graphicsQuality]);
  const shadowsEnabled = !isSoftwareGl && preset.shadows;
  const postEffectsEnabled = !isSoftwareGl && preset.enableBloom;

  return (
    <div
      className="fixed inset-0 z-0 h-full w-full touch-none select-none"
      data-testid="game-canvas-container"
    >
      <Canvas
        frameloop={isSoftwareGl ? 'demand' : 'always'}
        dpr={isSoftwareGl ? 1 : preset.dpr}
        shadows={shadowsEnabled}
        camera={{ fov: 60, near: 0.2, far: 360, position: [6, 3.2, 22] }}
        gl={{
          antialias: !isSoftwareGl && preset.antialias,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.95,
        }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setWebglError('WebGL rendering context was interrupted. Reload to restore 3D view.');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            setWebglError(null);
          });
        }}
      >
        <color attach="background" args={['#050a18']} />
        <fogExp2 attach="fog" args={['#081124', 0.0064]} />

        <CinematicSky starCount={preset.skyStars * 6} />
        <SceneEnvironmentAndPacer isSoftwareGl={isSoftwareGl} preset={preset} />
        <LightingAndWeatherRig preset={preset} shadowsEnabled={shadowsEnabled} />

        <Suspense fallback={null}>
          <PhysicsController>
            <WorldObjects
              maxAnisotropy={isSoftwareGl ? 1 : preset.maxAnisotropy}
              textureScale={preset.textureScale}
              skyStarCount={preset.skyStars}
              burstLimit={preset.burstParticles}
              grassCount={isSoftwareGl ? Math.min(preset.grassBlades, 1400) : preset.grassBlades}
              enableAnimatedLights={preset.enableAnimatedLights}
            />
            <PlayerCar
              keysRef={keysRef}
              jumpQueuedRef={jumpQueuedRef}
              nitroParticleLimit={preset.nitroParticles}
              showHeadlightBeams={preset.enableHeadlightBeams}
            />
            <CameraController />
          </PhysicsController>
        </Suspense>

        {postEffectsEnabled && <PostEffects preset={preset} />}
      </Canvas>
    </div>
  );
}
