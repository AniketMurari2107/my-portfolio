import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { JUMP_RAMPS, PORTFOLIO_ZONES } from './worldZones.js';
import { getWeatherConfig } from './weatherConfig.js';
import {
  createAsphaltRoughnessTexture,
  createAsphaltTexture,
  createTerrainGridTexture,
  createTerrainRoughnessTexture,
} from './proceduralAssets.js';
import { PortfolioLocation } from './PortfolioBuildings.jsx';
import { WorldGameplayItems } from './WorldGameplayItems.jsx';
import { RealisticTrees } from './RealisticTrees.jsx';
import { GrassField } from './GrassField.jsx';
import { useGameStore } from '../store/gameStore.js';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Floating cyber-rock island with tapered crystal underside and subtle levitation.
 */
function FloatingIsland({ position, scale = 1, accent = '#06b6d4', speedOffset = 0 }) {
  const groupRef = useRef(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.7 + speedOffset) * 0.8;
    groupRef.current.rotation.y = t * 0.05;
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[6.5, 5.6, 1.2, 7]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.42} />
      </mesh>
      <mesh position={[0, -3.2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[5.5, 6.4, 7]} />
        <meshStandardMaterial color="#070b18" roughness={0.82} metalness={0.28} />
      </mesh>
      <mesh position={[0, -5.8, 0]}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[-1.4, 2.8, 0.4]}>
        <boxGeometry args={[1.4, 3.6, 1.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh position={[1.6, 2.1, -0.8]}>
        <boxGeometry args={[1.1, 2.2, 1.1]} />
        <meshStandardMaterial color="#172038" metalness={0.75} roughness={0.28} />
      </mesh>
      <mesh position={[-1.4, 4.7, 0.4]}>
        <boxGeometry args={[1.46, 0.14, 1.46]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.5} />
      </mesh>
    </group>
  );
}

/**
 * Full open-world environment: reflective wet-asphalt roads, cyber-grid ground,
 * mountain perimeter, instanced towers, animated circuit light beacons, floating islands,
 * and drifting cyan/purple environmental particles.
 */
export function WorldObjects({
  maxAnisotropy = 4,
  textureScale = 1,
  skyStarCount = 180,
  burstLimit = 32,
  grassCount = 8500,
  enableAnimatedLights = true,
}) {
  const nearbyZone = useGameStore((s) => s.nearbyZone);
  const openSection = useGameStore((s) => s.openSection);
  const weather = useGameStore((s) => s.weather);
  const weatherCfg = getWeatherConfig(weather);

  const mountainRef = useRef(null);
  const starsRef = useRef(null);
  const violetMotesRef = useRef(null);
  const circuitBeaconsRef = useRef(null);
  const beaconMatRef = useRef(null);

  const { gridTex, gridRoughTex, asphaltTex, asphaltRoughTex } = useMemo(() => {
    return {
      gridTex: createTerrainGridTexture(maxAnisotropy, textureScale),
      gridRoughTex: createTerrainRoughnessTexture(maxAnisotropy),
      asphaltTex: createAsphaltTexture(maxAnisotropy, 10, textureScale),
      asphaltRoughTex: createAsphaltRoughnessTexture(maxAnisotropy, 10),
    };
  }, [maxAnisotropy, textureScale]);

  // Precompute road segments connecting central plaza to every portfolio district
  const roadSegments = useMemo(() => {
    return PORTFOLIO_ZONES.map((zone) => {
      const dx = zone.position[0];
      const dz = zone.position[2];
      const length = Math.hypot(dx, dz) - 6;
      const angle = Math.atan2(dx, dz);
      return {
        id: zone.id,
        length,
        angle,
        midX: (dx / Math.hypot(dx, dz)) * (length * 0.5 + 3),
        midZ: (dz / Math.hypot(dx, dz)) * (length * 0.5 + 3),
      };
    });
  }, []);

  // Populate mountain ridge peaks, beacons, and ambient drifting motes
  useEffect(() => {
    const mountainCount = 36;
    if (mountainRef.current) {
      for (let i = 0; i < mountainCount; i += 1) {
        const angle = (i / mountainCount) * Math.PI * 2;
        const radius = 106 + ((i * 7) % 18);
        const height = 18 + ((i * 11) % 22);
        const scaleR = 11 + (i % 5) * 2.5;
        _dummy.position.set(Math.cos(angle) * radius, height * 0.45, Math.sin(angle) * radius);
        _dummy.rotation.set(0, angle + i, 0);
        _dummy.scale.set(scaleR, height, scaleR);
        _dummy.updateMatrix();
        mountainRef.current.setMatrixAt(i, _dummy.matrix);
      }
      mountainRef.current.instanceMatrix.needsUpdate = true;
      mountainRef.current.computeBoundingSphere();
    }

    // Ring-road neon circuit chevron markers (24 pairs around radius 39.4m)
    const beaconCount = 24;
    if (circuitBeaconsRef.current) {
      for (let i = 0; i < beaconCount; i += 1) {
        const angle = (i / beaconCount) * Math.PI * 2;
        const r = 39.6;
        _dummy.position.set(Math.cos(angle) * r, 0.45, Math.sin(angle) * r);
        _dummy.rotation.set(0, -angle, 0);
        _dummy.scale.set(0.18, 0.9, 0.18);
        _dummy.updateMatrix();
        circuitBeaconsRef.current.setMatrixAt(i, _dummy.matrix);
        _color.set(i % 2 === 0 ? '#06b6d4' : '#8b5cf6');
        circuitBeaconsRef.current.setColorAt(i, _color);
      }
      circuitBeaconsRef.current.instanceMatrix.needsUpdate = true;
      if (circuitBeaconsRef.current.instanceColor) {
        circuitBeaconsRef.current.instanceColor.needsUpdate = true;
      }
      circuitBeaconsRef.current.computeBoundingSphere();
    }

    // Ambient Cyan & Purple Environmental Particles (scaled by LOW/MEDIUM/HIGH preset)
    const starCount = Math.min(180, skyStarCount);
    const halfViolet = Math.floor(starCount * 0.45);
    if (starsRef.current) {
      for (let i = 0; i < 180; i += 1) {
        if (i >= starCount) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.set(0.001, 0.001, 0.001);
          _dummy.updateMatrix();
          starsRef.current.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        const angle = (i * 2.39996) % (Math.PI * 2);
        const radius = 16 + ((i * 17) % 92);
        const py = 2.5 + ((i * 13) % 34);
        _dummy.position.set(Math.cos(angle) * radius, py, Math.sin(angle) * radius);
        _dummy.rotation.set(0, 0, 0);
        const s = 0.12 + (i % 4) * 0.055;
        _dummy.scale.set(s, s, s);
        _dummy.updateMatrix();
        starsRef.current.setMatrixAt(i, _dummy.matrix);
      }
      starsRef.current.instanceMatrix.needsUpdate = true;
      starsRef.current.computeBoundingSphere();
    }

    if (violetMotesRef.current) {
      for (let i = 0; i < 84; i += 1) {
        if (i >= halfViolet) {
          _dummy.position.set(0, -100, 0);
          _dummy.scale.set(0.001, 0.001, 0.001);
          _dummy.updateMatrix();
          violetMotesRef.current.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        const angle = (i * 3.14159 * 0.618) % (Math.PI * 2);
        const radius = 12 + ((i * 23) % 78);
        const py = 1.6 + ((i * 11) % 22);
        _dummy.position.set(Math.cos(angle) * radius, py, Math.sin(angle) * radius);
        _dummy.rotation.set(0, 0, 0);
        const s = 0.1 + (i % 3) * 0.05;
        _dummy.scale.set(s, s, s);
        _dummy.updateMatrix();
        violetMotesRef.current.setMatrixAt(i, _dummy.matrix);
      }
      violetMotesRef.current.instanceMatrix.needsUpdate = true;
      violetMotesRef.current.computeBoundingSphere();
    }
  }, [skyStarCount]);

  // Animate environmental particle drift and circuit beacon pulse (zero per-instance rebuilds)
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    if (starsRef.current) {
      starsRef.current.rotation.y += dt * 0.018;
      starsRef.current.position.y = Math.sin(t * 0.35) * 0.35;
    }
    if (violetMotesRef.current) {
      violetMotesRef.current.rotation.y -= dt * 0.026;
      violetMotesRef.current.position.y = Math.cos(t * 0.45) * 0.3;
    }
    if (beaconMatRef.current && enableAnimatedLights) {
      beaconMatRef.current.emissiveIntensity = 1.85 + Math.sin(t * 3.2) * 0.65;
    }
  });

  const physicsCrates = useMemo(() => {
    const items = [];
    const positions = [
      [8.5, 0.55, 6],
      [9.8, 0.55, 6.2],
      [9.1, 1.5, 6.1],
      [-9.0, 0.55, 5.5],
      [-10.2, 0.55, 5.8],
      [-9.6, 1.5, 5.6],
      [12, 0.55, -10],
      [13.2, 0.55, -10.5],
      [-13, 0.55, -12],
      [-14.2, 0.55, -11.4],
      [6, 0.55, 22],
      [-6, 0.55, 22],
    ];
    positions.forEach((p, idx) => {
      items.push({ id: idx, position: p, color: idx % 2 === 0 ? '#06b6d4' : '#8b5cf6' });
    });
    return items;
  }, []);

  const floatingIslands = [
    { position: [-48, 17, -46], scale: 1.15, accent: '#06b6d4', offset: 0 },
    { position: [52, 20, -42], scale: 1.35, accent: '#3b82f6', offset: 1.2 },
    { position: [54, 18, 44], scale: 1.1, accent: '#8b5cf6', offset: 2.5 },
    { position: [-50, 22, 46], scale: 1.25, accent: '#6366f1', offset: 3.7 },
    { position: [0, 26, -68], scale: 1.45, accent: '#06b6d4', offset: 4.8 },
  ];

  return (
    <group name="FuturisticWorld">
      {/* Main Open-World Cyber-Grid Ground with Calibrated Reflections */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[280, 280]} />
        <meshStandardMaterial
          map={gridTex}
          roughnessMap={gridRoughTex}
          color="#94a3b8"
          roughness={Math.min(0.95, 0.9 * weatherCfg.roadRoughnessScale)}
          metalness={0.2}
          envMapIntensity={0.28}
        />
      </mesh>

      {/* Central Illuminated Roundabout Plaza (Balanced Satin Obsidian Surface) */}
      <mesh position={[0, 0.029, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[10.5, 48]} />
        <meshPhysicalMaterial
          color="#040814"
          roughness={Math.min(0.85, 0.36 * weatherCfg.roadRoughnessScale)}
          metalness={0.22}
          clearcoat={weatherCfg.roadClearcoat}
          clearcoatRoughness={0.32}
          envMapIntensity={0.32}
        />
      </mesh>
      <mesh position={[0, 0.033, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10.2, 10.65, 64]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      <mesh position={[0, 0.033, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.8, 6.05, 48]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>

      {/* Outer Ring Road Connecting Districts */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[32, 39, 64]} />
        <meshPhysicalMaterial
          color="#050918"
          roughness={Math.min(0.85, 0.38 * weatherCfg.roadRoughnessScale)}
          metalness={0.24}
          clearcoat={weatherCfg.roadClearcoat * 0.85}
          clearcoatRoughness={0.34}
          envMapIntensity={0.32}
        />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[31.8, 32.15, 64]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[38.85, 39.2, 64]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* 6 Radial Futuristic Highways Leading to Each District */}
      {roadSegments.map((seg) => (
        <mesh
          key={seg.id}
          position={[seg.midX, 0.025, seg.midZ]}
          rotation={[-Math.PI / 2, 0, seg.angle]}
          receiveShadow
        >
          <planeGeometry args={[5.4, seg.length]} />
          <meshStandardMaterial
            map={asphaltTex}
            roughnessMap={asphaltRoughTex}
            color="#94a3b8"
            roughness={Math.min(0.95, 0.82 * weatherCfg.roadRoughnessScale)}
            metalness={0.22}
            envMapIntensity={0.32}
          />
        </mesh>
      ))}

      {/* 6 Interactive Portfolio District Locations */}
      {PORTFOLIO_ZONES.map((zone) => (
        <PortfolioLocation
          key={zone.id}
          zone={zone}
          isNearby={nearbyZone?.id === zone.id}
          onSelect={openSection}
        />
      ))}

      {/* Checkpoints, Floating Energy Crystals & Hidden Easter Eggs */}
      <WorldGameplayItems burstLimit={burstLimit} />

      {/* 3 Stunt Jump Ramps with Rapier Fixed Colliders */}
      {JUMP_RAMPS.map((ramp) => (
        <group key={ramp.id} position={ramp.position} rotation={[0, ramp.rotationY, 0]}>
          <RigidBody type="fixed" restitution={0.05} friction={0}>
            <CuboidCollider args={[2.1, 0.35, 3.2]} position={[0, 0.38, 0]} rotation={[0.24, 0, 0]} />
          </RigidBody>
          <mesh position={[0, 0.4, 0]} rotation={[0.24, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[4.2, 0.25, 6.2]} />
            <meshStandardMaterial color="#101a33" metalness={0.78} roughness={0.22} />
          </mesh>
          <mesh position={[-2.02, 0.56, 0]} rotation={[0.24, 0, 0]}>
            <boxGeometry args={[0.14, 0.12, 6.2]} />
            <meshStandardMaterial color={ramp.color} emissive={ramp.color} emissiveIntensity={2.6} />
          </mesh>
          <mesh position={[2.02, 0.56, 0]} rotation={[0.24, 0, 0]}>
            <boxGeometry args={[0.14, 0.12, 6.2]} />
            <meshStandardMaterial color={ramp.color} emissive={ramp.color} emissiveIntensity={2.6} />
          </mesh>
        </group>
      ))}

      {/* Dynamic Pushable Energy Crates */}
      {physicsCrates.map((crate) => (
        <RigidBody
          key={crate.id}
          position={crate.position}
          mass={0.35}
          restitution={0.45}
          friction={0.5}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.92, 0.92, 0.92]} />
            <meshStandardMaterial
              color="#0f172a"
              emissive={crate.color}
              emissiveIntensity={0.65}
              metalness={0.72}
              roughness={0.26}
            />
          </mesh>
        </RigidBody>
      ))}

      {/* Realistic Cinematic Forest & Wind-Swaying Meadow Grass */}
      <RealisticTrees maxAnisotropy={maxAnisotropy} />
      <GrassField grassCount={grassCount} />

      {/* Floating Cyber Islands */}
      {floatingIslands.map((island, idx) => (
        <FloatingIsland
          key={idx}
          position={island.position}
          scale={island.scale}
          accent={island.accent}
          speedOffset={island.offset}
        />
      ))}

      {/* Instanced Animated Circuit Track Beacons */}
      <instancedMesh ref={circuitBeaconsRef} args={[null, null, 24]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={beaconMatRef}
          color="#ffffff"
          emissive="#38bdf8"
          emissiveIntensity={2.0}
        />
      </instancedMesh>

      {/* Instanced Mountain Ridge Perimeter */}
      <instancedMesh ref={mountainRef} args={[null, null, 36]} receiveShadow>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial color="#060a17" roughness={0.88} metalness={0.2} flatShading />
      </instancedMesh>

      {/* Drifting Environmental Particles: Cyan & Purple Atmospheric Motes */}
      <instancedMesh ref={starsRef} args={[null, null, 180]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.72} />
      </instancedMesh>
      <instancedMesh ref={violetMotesRef} args={[null, null, 84]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.62} />
      </instancedMesh>
    </group>
  );
}
