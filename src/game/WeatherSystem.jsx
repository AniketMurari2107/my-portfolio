import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { carLiveState, useGameStore } from '../store/gameStore.js';
import { getWeatherConfig } from './weatherConfig.js';
import { computeTimeOfDayState, getTimePhaseLabel } from './timeOfDay.js';
import { createFogWispTexture } from './proceduralAssets.js';

const MAX_FOG_WISPS = 48;

const _dummy = new THREE.Object3D();

function wrapLocal(val, center, halfSpan) {
  const span = halfSpan * 2;
  let rel = val - center;
  rel = ((rel + halfSpan) % span + span) % span - halfSpan;
  return center + rel;
}

/**
 * Coordinates the continuous Time-of-Day celestial light rotation and dynamic Clear/Foggy weather:
 * - Gradually advances carLiveState.timeOfDay when autoTimeCycle is active
 * - Smoothly updates key light orbital position (Sun/Moon), hemisphere/fill/rim ambient colors,
 *   scene background, fog color/density, and studio environment intensity
 * - Renders drifting volumetric fog wisps in Foggy weather
 */
export function WeatherSystem({
  hemiLightRef,
  keyLightRef,
  fillLightRef,
  rimLightRef,
  baseEnvIntensity = 0.34,
  fogWispLimit = 30,
}) {
  const { scene, camera } = useThree();
  const weather = useGameStore((s) => s.weather);

  const fogWispRef = useRef(null);
  const smoothFogRef = useRef(weather === 'foggy' ? 1 : 0);
  const hudSyncAccumRef = useRef(0);
  const todStateRef = useMemo(() => computeTimeOfDayState(carLiveState.timeOfDay), []);

  const fogWispTex = useMemo(() => createFogWispTexture(), []);

  const wispPool = useMemo(
    () =>
      Array.from({ length: MAX_FOG_WISPS }, (_, i) => ({
        x: (((i * 29.7) % 1) - 0.5) * 86,
        y: 1.6 + (i % 6) * 0.9,
        z: (((i * 53.1) % 1) - 0.5) * 86,
        vx: (i % 2 === 0 ? 1 : -1) * (0.65 + (i % 4) * 0.25),
        vz: ((i % 3) - 1) * 0.45,
        scale: 7.5 + (i % 5) * 2.2,
      })),
    []
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.weather = weather;
      document.body.dataset.tod = getTimePhaseLabel(carLiveState.timeOfDay).toLowerCase();
    }
  }, [weather]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const store = useGameStore.getState();

    // 1. Gradually advance Time-of-Day when playing or on title showcase
    if (store.autoTimeCycle && store.gamePhase !== 'paused') {
      carLiveState.timeOfDay = (carLiveState.timeOfDay + dt * store.timeCycleSpeed) % 1;
      hudSyncAccumRef.current += dt;
      if (hudSyncAccumRef.current >= 0.45) {
        hudSyncAccumRef.current = 0;
        store.syncTimeOfDayDisplay(carLiveState.timeOfDay);
        if (typeof document !== 'undefined') {
          document.body.dataset.tod = getTimePhaseLabel(carLiveState.timeOfDay).toLowerCase();
        }
      }
    }

    const cfg = getWeatherConfig(weather);
    const tod = computeTimeOfDayState(carLiveState.timeOfDay, cfg, todStateRef);
    const blend = 1 - Math.exp(-3.4 * dt);

    // 2. Smoothly update background, fog, environment reflections, and rotating 3-point lights
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(tod.fogColor, blend);
    }

    if (scene.fog) {
      scene.fog.color.lerp(tod.fogColor, blend);
      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, tod.fogDensity, 3.2, dt);
    }

    const targetEnv = baseEnvIntensity * tod.envScale;
    scene.environmentIntensity = THREE.MathUtils.damp(
      scene.environmentIntensity ?? targetEnv,
      targetEnv,
      3.5,
      dt
    );

    if (hemiLightRef?.current) {
      hemiLightRef.current.color.lerp(tod.hemiSkyColor, blend);
      hemiLightRef.current.groundColor.lerp(tod.hemiGroundColor, blend);
      hemiLightRef.current.intensity = THREE.MathUtils.damp(
        hemiLightRef.current.intensity,
        tod.hemiIntensity,
        3.4,
        dt
      );
    }

    if (keyLightRef?.current) {
      keyLightRef.current.position.set(
        tod.activeKeyDir.x * 58,
        tod.activeKeyDir.y * 58,
        tod.activeKeyDir.z * 58
      );
      keyLightRef.current.color.lerp(tod.keyColor, blend);
      keyLightRef.current.intensity = THREE.MathUtils.damp(
        keyLightRef.current.intensity,
        tod.keyIntensity,
        3.4,
        dt
      );
    }

    if (fillLightRef?.current) {
      fillLightRef.current.color.lerp(tod.fillColor, blend);
      fillLightRef.current.intensity = THREE.MathUtils.damp(
        fillLightRef.current.intensity,
        tod.fillIntensity,
        3.4,
        dt
      );
    }

    if (rimLightRef?.current) {
      rimLightRef.current.color.lerp(tod.rimColor, blend);
      rimLightRef.current.intensity = THREE.MathUtils.damp(
        rimLightRef.current.intensity,
        tod.rimIntensity,
        3.4,
        dt
      );
    }

    // 3. Drifting Atmospheric Fog Wisps (Foggy weather)
    smoothFogRef.current = THREE.MathUtils.damp(smoothFogRef.current, cfg.fogWispIntensity, 3.0, dt);
    const fogWeight = smoothFogRef.current;

    if (fogWispRef.current) {
      if (fogWeight < 0.02) {
        fogWispRef.current.visible = false;
      } else {
        fogWispRef.current.visible = true;
        fogWispRef.current.material.opacity = 0.24 * fogWeight;
        const activeWisps = Math.min(MAX_FOG_WISPS, fogWispLimit);
        fogWispRef.current.count = activeWisps;

        const cx = carLiveState.x;
        const cz = carLiveState.z;
        const camYaw = Math.atan2(camera.position.x - cx, camera.position.z - cz);

        for (let i = 0; i < activeWisps; i += 1) {
          const w = wispPool[i];
          w.x += w.vx * dt;
          w.z += w.vz * dt;
          const wx = wrapLocal(w.x, cx, 42);
          const wz = wrapLocal(w.z, cz, 42);

          _dummy.position.set(wx, w.y, wz);
          _dummy.rotation.set(0, camYaw, 0);
          _dummy.scale.set(w.scale, w.scale * 0.48, 1);
          _dummy.updateMatrix();
          fogWispRef.current.setMatrixAt(i, _dummy.matrix);
        }
        fogWispRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group name="DynamicAtmosphereParticles">
      {/* Drifting Volumetric Fog Wisps */}
      <instancedMesh
        ref={fogWispRef}
        args={[null, null, MAX_FOG_WISPS]}
        frustumCulled={false}
        visible={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={fogWispTex}
          color="#bae6fd"
          transparent
          opacity={0.24}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}
