import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { carLiveState, useGameStore } from '../store/gameStore.js';
import {
  CHECKPOINTS,
  EASTER_EGGS,
  ENERGY_CRYSTALS,
  findCollectibleCrystal,
  findDiscoverableEasterEgg,
  findTriggerableCheckpoint,
} from './worldGameplayData.js';
import { createContactShadowTexture } from './proceduralAssets.js';
import { audioEngine } from './audioEngine.js';

const _burstDummy = new THREE.Object3D();
const _burstColor = new THREE.Color();
const BURST_POOL_SIZE = 32;

function CheckpointGate({ cp, cleared }) {
  const ringRef = useRef(null);
  const accent = cleared ? '#10b981' : cp.color;

  useFrame((state) => {
    if (!ringRef.current) return;
    const t = state.clock.elapsedTime;
    ringRef.current.rotation.z = t * (cleared ? 0.6 : 1.6);
    ringRef.current.position.y = 3.2 + Math.sin(t * 2.4 + cp.order) * 0.14;
  });

  return (
    <group position={cp.position} rotation={[0, cp.rotationY, 0]}>
      {/* Ground trigger threshold disc */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[cp.radius - 0.35, cp.radius, 36]} />
        <meshBasicMaterial color={accent} transparent opacity={cleared ? 0.45 : 0.85} />
      </mesh>
      <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[cp.radius - 0.35, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={cleared ? 0.08 : 0.16} depthWrite={false} />
      </mesh>

      {/* Left & Right Glowing Checkpoint Pylons (placed outside driving lane) */}
      {[-3.4, 3.4].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          <mesh position={[0, 1.9, 0]} castShadow>
            <boxGeometry args={[0.38, 3.8, 0.38]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.28} />
          </mesh>
          <mesh position={[0, 2.0, 0]}>
            <boxGeometry args={[0.42, 3.1, 0.14]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={cleared ? 1.2 : 2.5} />
          </mesh>
          <mesh position={[0, 4.05, 0]}>
            <octahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} />
          </mesh>
        </group>
      ))}

      {/* Overhead Holographic Gate Arch */}
      <mesh position={[0, 3.85, 0]}>
        <boxGeometry args={[7.1, 0.24, 0.28]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 3.75, 0]}>
        <boxGeometry args={[6.5, 0.1, 0.12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={cleared ? 1.0 : 2.6} />
      </mesh>

      {/* Floating Overhead Beacon Diamond */}
      <mesh ref={ringRef} position={[0, 3.2, 0]}>
        <torusGeometry args={[0.55, 0.07, 8, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} />
      </mesh>
    </group>
  );
}

function EnergyCrystal({ crystal, collected, shadowTex }) {
  const groupRef = useRef(null);
  const ringRef = useRef(null);
  const pickupTimerRef = useRef(0);
  const wasCollectedRef = useRef(collected);

  useEffect(() => {
    if (!collected) {
      wasCollectedRef.current = false;
      pickupTimerRef.current = 0;
      if (groupRef.current) {
        groupRef.current.visible = true;
        groupRef.current.scale.setScalar(1);
      }
    }
  }, [collected]);

  useFrame((state, rawDt) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 0.05);

    if (collected && !wasCollectedRef.current) {
      wasCollectedRef.current = true;
      pickupTimerRef.current = 0.001;
    }

    if (pickupTimerRef.current > 0) {
      pickupTimerRef.current += dt;
      const p = Math.min(1, pickupTimerRef.current / 0.42);
      // Collection burst animation: ascend, spin fast, scale up then shrink out
      groupRef.current.position.y = crystal.position[1] + p * 3.4;
      groupRef.current.rotation.y += dt * 18;
      const s = p < 0.35 ? 1 + p * 1.6 : Math.max(0.001, (1 - p) * 2.1);
      groupRef.current.scale.setScalar(s);
      if (p >= 1) {
        groupRef.current.visible = false;
        pickupTimerRef.current = 0;
      }
      return;
    }

    if (collected) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position.y = crystal.position[1] + Math.sin(t * 2.8 + crystal.position[0]) * 0.22;
    groupRef.current.rotation.y = t * 1.9;
    if (ringRef.current) {
      ringRef.current.rotation.x = t * 2.2;
      ringRef.current.rotation.z = t * 1.4;
    }
  });

  return (
    <group position={[crystal.position[0], 0, crystal.position[2]]}>
      {!collected && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.1, 2.1]} />
          <meshBasicMaterial map={shadowTex} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
      <group ref={groupRef} position={[0, crystal.position[1], 0]}>
        <mesh>
          <octahedronGeometry args={[0.52, 0]} />
          <meshStandardMaterial
            color={crystal.color}
            emissive={crystal.color}
            emissiveIntensity={2.6}
            metalness={0.25}
            roughness={0.12}
          />
        </mesh>
        <mesh ref={ringRef}>
          <torusGeometry args={[0.82, 0.045, 8, 24]} />
          <meshStandardMaterial color="#e0f2fe" emissive={crystal.color} emissiveIntensity={2.2} />
        </mesh>
      </group>
    </group>
  );
}

function EasterEggRelic({ egg, discovered, shadowTex }) {
  const groupRef = useRef(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = 1.25 + Math.sin(t * 2.1 + egg.position[0]) * 0.22;
    groupRef.current.rotation.y = t * (discovered ? 0.8 : 1.5);
  });

  return (
    <group position={[egg.position[0], 0, egg.position[2]]}>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.7, 28]} />
        <meshBasicMaterial color={egg.color} transparent opacity={discovered ? 0.35 : 0.78} />
      </mesh>
      {/* Low Secret Pedestal */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.9, 1.15, 0.5, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.78} roughness={0.3} />
      </mesh>

      <group ref={groupRef} position={[0, 1.25, 0]}>
        {egg.variant === 'gamepad' && (
          <group>
            <mesh>
              <boxGeometry args={[1.5, 0.7, 0.32]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.25} />
            </mesh>
            <mesh position={[-0.42, 0.05, 0.2]}>
              <boxGeometry args={[0.32, 0.1, 0.08]} />
              <meshStandardMaterial color={egg.color} emissive={egg.color} emissiveIntensity={2.2} />
            </mesh>
            <mesh position={[-0.42, 0.05, 0.2]}>
              <boxGeometry args={[0.1, 0.32, 0.08]} />
              <meshStandardMaterial color={egg.color} emissive={egg.color} emissiveIntensity={2.2} />
            </mesh>
            <mesh position={[0.42, 0.1, 0.2]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2.4} />
            </mesh>
            <mesh position={[0.58, -0.05, 0.2]}>
              <sphereGeometry args={[0.1, 12, 12]} />
              <meshStandardMaterial color="#f43f5e" emissive="#f43f5e" emissiveIntensity={2.4} />
            </mesh>
          </group>
        )}

        {egg.variant === 'duck' && (
          <group>
            <mesh>
              <sphereGeometry args={[0.56, 16, 16]} />
              <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.85} metalness={0.45} roughness={0.22} />
            </mesh>
            <mesh position={[0.25, 0.52, 0]}>
              <sphereGeometry args={[0.34, 16, 16]} />
              <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={0.85} metalness={0.45} roughness={0.22} />
            </mesh>
            <mesh position={[0.62, 0.48, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.14, 0.34, 10]} />
              <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={1.2} />
            </mesh>
            <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.92, 0.04, 8, 24]} />
              <meshStandardMaterial color="#fde047" emissive="#facc15" emissiveIntensity={2.2} />
            </mesh>
          </group>
        )}

        {egg.variant === 'quantum' && (
          <group>
            <mesh rotation={[0.6, 0.8, 0]}>
              <boxGeometry args={[0.88, 0.88, 0.88]} />
              <meshStandardMaterial color="#8b5cf6" emissive="#a855f7" emissiveIntensity={2.0} metalness={0.65} roughness={0.2} />
            </mesh>
            <mesh rotation={[Math.PI / 3, 0, 0]}>
              <torusGeometry args={[1.05, 0.045, 8, 28]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2.4} />
            </mesh>
            <mesh rotation={[0, Math.PI / 3, Math.PI / 4]}>
              <torusGeometry args={[1.05, 0.045, 8, 28]} />
              <meshStandardMaterial color="#f472b6" emissive="#ec4899" emissiveIntensity={2.4} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/**
 * Renders and drives 60Hz proximity detection for:
 * - 6 Glowing Highway Checkpoints
 * - 12 Floating Energy Crystals + pooled pickup particle burst
 * - 3 Hidden Easter Egg Relics
 */
export function WorldGameplayItems({ burstLimit = BURST_POOL_SIZE }) {
  const runId = useGameStore((s) => s.runId);
  const checkpointsCleared = useGameStore((s) => s.checkpointsCleared);
  const collectedCrystals = useGameStore((s) => s.collectedCrystals);
  const discoveredEggs = useGameStore((s) => s.discoveredEggs);

  const burstRef = useRef(null);
  const burstCursorRef = useRef(0);
  const hadBurstParticlesRef = useRef(false);
  const prevCarPosRef = useRef({ x: null, z: null });
  const burstPoolRef = useRef(
    Array.from({ length: BURST_POOL_SIZE }, () => ({
      active: false,
      life: 0,
      maxLife: 0.5,
      x: 0,
      y: -50,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      color: '#38bdf8',
    }))
  );

  useEffect(() => {
    prevCarPosRef.current = { x: null, z: null };
  }, [runId]);

  const shadowTex = useMemo(() => createContactShadowTexture(), []);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);

  const spawnBurst = (px, py, pz, color) => {
    const pool = burstPoolRef.current;
    const cap = Math.min(BURST_POOL_SIZE, Math.max(6, burstLimit));
    const count = cap <= 12 ? 6 : cap <= 20 ? 9 : 12;
    for (let i = 0; i < count; i += 1) {
      const p = pool[burstCursorRef.current];
      burstCursorRef.current = (burstCursorRef.current + 1) % cap;
      const angle = (i / count) * Math.PI * 2;
      const speed = 5 + (i % 3) * 2.5;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.45 + (i % 3) * 0.08;
      p.x = px;
      p.y = py;
      p.z = pz;
      p.vx = Math.cos(angle) * speed;
      p.vy = 3.5 + (i % 4) * 1.1;
      p.vz = Math.sin(angle) * speed;
      p.color = color;
    }
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const store = useGameStore.getState();

    // Update burst particle pool (skip GPU uploads when idle)
    if (burstRef.current) {
      const pool = burstPoolRef.current;
      let hasActive = false;
      for (let i = 0; i < BURST_POOL_SIZE; i += 1) {
        if (pool[i].active) {
          hasActive = true;
          break;
        }
      }

      if (hasActive || hadBurstParticlesRef.current) {
        let anyRemaining = false;
        for (let i = 0; i < BURST_POOL_SIZE; i += 1) {
          const p = pool[i];
          if (!p.active) {
            _burstDummy.position.set(0, -50, 0);
            _burstDummy.scale.setScalar(0.001);
            _burstDummy.updateMatrix();
            burstRef.current.setMatrixAt(i, _burstDummy.matrix);
            continue;
          }
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            _burstDummy.position.set(0, -50, 0);
            _burstDummy.scale.setScalar(0.001);
            _burstDummy.updateMatrix();
            burstRef.current.setMatrixAt(i, _burstDummy.matrix);
            continue;
          }
          anyRemaining = true;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 9.8 * dt;
          const s = 0.22 * (1 - p.life / p.maxLife);
          _burstDummy.position.set(p.x, p.y, p.z);
          _burstDummy.scale.setScalar(s);
          _burstDummy.updateMatrix();
          burstRef.current.setMatrixAt(i, _burstDummy.matrix);
          _burstColor.set(p.color);
          burstRef.current.setColorAt(i, _burstColor);
        }
        burstRef.current.instanceMatrix.needsUpdate = true;
        if (burstRef.current.instanceColor) {
          burstRef.current.instanceColor.needsUpdate = true;
        }
        hadBurstParticlesRef.current = anyRemaining;
      }
    }

    if (store.gamePhase !== 'playing' || store.activeSection || store.settingsOpen) {
      prevCarPosRef.current = { x: null, z: null };
      return;
    }

    const { x, z } = carLiveState;
    const prev = prevCarPosRef.current;
    // Ignore large teleports (> 18m in a single step) so instant warp doesn't sweep intermediate items
    const isTeleport =
      prev.x !== null &&
      prev.z !== null &&
      (x - prev.x) ** 2 + (z - prev.z) ** 2 > 18 * 18;
    const prevX = isTeleport ? x : prev.x;
    const prevZ = isTeleport ? z : prev.z;
    prevCarPosRef.current = { x, z };

    const cp = findTriggerableCheckpoint(x, z, store.checkpointsCleared, CHECKPOINTS, prevX, prevZ);
    if (cp) {
      const ok = store.clearCheckpoint(cp);
      if (ok) {
        audioEngine.playCheckpoint();
        spawnBurst(cp.position[0], 1.5, cp.position[2], cp.color);
      }
    }

    const crys = findCollectibleCrystal(
      x,
      z,
      store.collectedCrystals,
      ENERGY_CRYSTALS,
      2.75,
      prevX,
      prevZ
    );
    if (crys) {
      const ok = store.collectCrystal(crys);
      if (ok) {
        audioEngine.playCollect(store.collectedCrystals.length + 1);
        spawnBurst(crys.position[0], crys.position[1], crys.position[2], crys.color);
      }
    }

    const egg = findDiscoverableEasterEgg(x, z, store.discoveredEggs, EASTER_EGGS, prevX, prevZ);
    if (egg) {
      const ok = store.discoverEasterEgg(egg);
      if (ok) {
        audioEngine.playEasterEgg();
        spawnBurst(egg.position[0], 1.6, egg.position[2], egg.color);
      }
    }
  });

  return (
    <group key={`gameplay-run-${runId}`} name="GameplayCollectiblesAndCheckpoints">
      {CHECKPOINTS.map((cp) => (
        <CheckpointGate
          key={cp.id}
          cp={cp}
          cleared={checkpointsCleared.includes(cp.id)}
        />
      ))}

      {ENERGY_CRYSTALS.map((crystal) => (
        <EnergyCrystal
          key={crystal.id}
          crystal={crystal}
          collected={collectedCrystals.includes(crystal.id)}
          shadowTex={shadowTex}
        />
      ))}

      {EASTER_EGGS.map((egg) => (
        <EasterEggRelic
          key={egg.id}
          egg={egg}
          discovered={discoveredEggs.includes(egg.id)}
          shadowTex={shadowTex}
        />
      ))}

      <instancedMesh ref={burstRef} args={[null, null, BURST_POOL_SIZE]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffffff" />
      </instancedMesh>
    </group>
  );
}
