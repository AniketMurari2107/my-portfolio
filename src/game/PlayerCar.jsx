import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { carLiveState, useGameStore } from '../store/gameStore.js';
import {
  clampDelta,
  stepSuspensionSpring,
  stepVehicleState,
  syncCollisionSpeed,
  VEHICLE_CONSTANTS,
} from './vehicleMath.js';
import { findNearestZone, SPAWN_POINT, WORLD_RADIUS } from './worldZones.js';
import { createContactShadowTexture } from './proceduralAssets.js';
import { audioEngine } from './audioEngine.js';

// Pre-allocated scratch objects (zero GC inside useFrame)
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _dummy = new THREE.Object3D();
const _particleColor = new THREE.Color();

const NITRO_PARTICLE_COUNT = 48;

/**
 * Composite multi-part futuristic supercar with:
 * - Sculpted beveled chassis, sapphire glass cockpit, aggressive front aero splitter & intakes
 * - Dual LED headlights with forward light beams & brake-reactive LED taillight bar
 * - 5-spoke star alloy wheels with brake rotors, calipers, steering & rotation
 * - Ground neon underglow aura & animated dual exhaust plasma jets
 * - Pooled zero-GC Nitro Boost particle streaks & Rapier raycast ground/suspension physics
 */
export function PlayerCar({
  keysRef,
  jumpQueuedRef,
  nitroParticleLimit = NITRO_PARTICLE_COUNT,
  showHeadlightBeams = true,
}) {
  const { rapier, world } = useRapier();

  const rigidBodyRef = useRef(null);
  const visualGroupRef = useRef(null);
  const flWheelSteerRef = useRef(null);
  const frWheelSteerRef = useRef(null);
  const wheelSpinRefs = useRef([]);
  const thrusterLeftRef = useRef(null);
  const thrusterRightRef = useRef(null);
  const taillightMatRef = useRef(null);
  const underglowMatRef = useRef(null);
  const underglowFloorMatRef = useRef(null);
  const nitroParticlesRef = useRef(null);

  const simRef = useRef({
    speed: 0,
    boost: 100,
    nitroCooldown: 0,
    isBoosting: false,
    yaw: SPAWN_POINT.yaw,
    steerAngle: 0,
    wheelSpin: 0,
    pitchLean: 0,
    rollLean: 0,
  });

  const springRef = useRef({ offset: 0, velocity: 0 });
  const wasGroundedRef = useRef(true);
  const expectedSpeedRef = useRef(0);
  const lastBoostRef = useRef(false);
  const lastRefillNonceRef = useRef(carLiveState.refillNonce);
  const hudSyncAccumRef = useRef(0);
  const lastJumpTimeRef = useRef(0);
  const hadNitroParticlesRef = useRef(false);

  // Pre-allocated Nitro particle ring buffer (zero GC per frame)
  const particlePoolRef = useRef(
    Array.from({ length: NITRO_PARTICLE_COUNT }, () => ({
      active: false,
      life: 0,
      maxLife: 0.45,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      scale: 0.1,
    }))
  );
  const particleCursorRef = useRef(0);

  // Sculpted side profile for the aerodynamic chassis extruded along X
  const { chassisGeo, canopyGeo, contactTex, beamTex } = useMemo(() => {
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.22, 0.16); // Aggressive front nose tip
    bodyShape.lineTo(-1.82, 0.40); // Sculpted front hood
    bodyShape.lineTo(-0.76, 0.56); // Windshield base
    bodyShape.lineTo(0.28, 0.63);  // Roof deck
    bodyShape.lineTo(1.58, 0.56);  // Rear engine deck
    bodyShape.lineTo(2.14, 0.48);  // Rear tail
    bodyShape.lineTo(2.20, 0.20);  // Rear diffuser edge
    bodyShape.lineTo(1.52, 0.14);
    bodyShape.lineTo(-1.52, 0.14);
    bodyShape.closePath();

    const extrudedBody = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 1.76,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 3,
      steps: 1,
    });
    extrudedBody.translate(0, 0, -0.88);
    extrudedBody.rotateY(-Math.PI / 2);
    extrudedBody.computeVertexNormals();

    // Sculpted sapphire cockpit glass canopy
    const canopyShape = new THREE.Shape();
    canopyShape.moveTo(-0.84, 0.54);
    canopyShape.lineTo(-0.22, 0.93);
    canopyShape.lineTo(0.64, 0.91);
    canopyShape.lineTo(1.24, 0.54);
    canopyShape.closePath();

    const extrudedCanopy = new THREE.ExtrudeGeometry(canopyShape, {
      depth: 1.24,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 3,
    });
    extrudedCanopy.translate(0, 0, -0.62);
    extrudedCanopy.rotateY(-Math.PI / 2);
    extrudedCanopy.computeVertexNormals();

    // Procedural additive headlight beam gradient texture
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 128;
    bCanvas.height = 256;
    const bCtx = bCanvas.getContext('2d');
    const bGrad = bCtx.createLinearGradient(0, 256, 0, 0);
    bGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    bGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.14)');
    bGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(0, 0, 128, 256);
    const bTex = new THREE.CanvasTexture(bCanvas);
    bTex.colorSpace = THREE.SRGBColorSpace;
    bTex.needsUpdate = true;

    return {
      chassisGeo: extrudedBody,
      canopyGeo: extrudedCanopy,
      contactTex: createContactShadowTexture(),
      beamTex: bTex,
    };
  }, []);

  useEffect(() => {
    return () => {
      chassisGeo.dispose();
      canopyGeo.dispose();
      contactTex.dispose();
      beamTex.dispose();
    };
  }, [chassisGeo, canopyGeo, contactTex, beamTex]);

  // Listen for teleport or reset requests from Zustand store
  const teleportRequest = useGameStore((s) => s.teleportRequest);
  useEffect(() => {
    if (!teleportRequest || !rigidBodyRef.current) return;
    const rb = rigidBodyRef.current;
    rb.setTranslation({ x: teleportRequest.x, y: teleportRequest.y, z: teleportRequest.z }, true);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);

    simRef.current.speed = 0;
    simRef.current.boost = 100;
    simRef.current.nitroCooldown = 0;
    simRef.current.isBoosting = false;
    simRef.current.yaw = teleportRequest.yaw ?? 0;
    simRef.current.steerAngle = 0;
    simRef.current.pitchLean = 0;
    simRef.current.rollLean = 0;
    expectedSpeedRef.current = 0;
    springRef.current = { offset: 0, velocity: 0 };

    _euler.set(0, simRef.current.yaw, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    rb.setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }, true);

    carLiveState.x = teleportRequest.x;
    carLiveState.y = teleportRequest.y;
    carLiveState.z = teleportRequest.z;
    carLiveState.yaw = simRef.current.yaw;
    carLiveState.speed = 0;
    carLiveState.boost = 100;
    carLiveState.nitroCooldown = 0;
    carLiveState.isBoosting = false;
    carLiveState.trauma = 0;

    useGameStore.getState().clearTeleportRequest();
  }, [teleportRequest]);

  useFrame((state, rawDt) => {
    const rb = rigidBodyRef.current;
    if (!rb) return;

    const dt = clampDelta(rawDt);
    const store = useGameStore.getState();
    const isPlaying = store.gamePhase === 'playing' && !store.activeSection && !store.settingsOpen;

    // 1. Read current Rapier RigidBody position & actual post-collision velocity
    const pos = rb.translation();
    const curVel = rb.linvel();

    // Reconcile simulated speed with Rapier collision solver velocity
    const { syncedSpeed, impactMagnitude } = syncCollisionSpeed(
      expectedSpeedRef.current,
      simRef.current.yaw,
      curVel.x,
      curVel.z
    );
    if (impactMagnitude > 0) {
      simRef.current.speed = syncedSpeed;
      const shock = Math.min(0.95, impactMagnitude / 22);
      carLiveState.trauma = Math.min(1, carLiveState.trauma + shock * 0.7);
      audioEngine.playImpact(shock);
    }

    // 2. Real Rapier downward raycast for ground detection (works on terrain & ramps)
    let grounded = pos.y < 0.25 && Math.abs(curVel.y) < 1.5;
    if (world && rapier) {
      const rayOrigin = { x: pos.x, y: pos.y + 0.35, z: pos.z };
      const rayDir = { x: 0, y: -1, z: 0 };
      const ray = new rapier.Ray(rayOrigin, rayDir);
      const hit = world.castRay(ray, 0.72, true, undefined, undefined, undefined, rb);
      if (hit && hit.timeOfImpact <= 0.56) {
        grounded = true;
      }
    }

    // Landing suspension compression impulse when touching down from a jump
    if (grounded && !wasGroundedRef.current && curVel.y < -3.0) {
      const landStrength = Math.min(1, Math.abs(curVel.y) / 14);
      springRef.current.velocity -= 2.4 * landStrength;
      carLiveState.trauma = Math.min(1, carLiveState.trauma + landStrength * 0.45);
      audioEngine.playImpact(landStrength * 0.75);
    }
    wasGroundedRef.current = grounded;

    // 3. Merge keyboard and touch inputs (including analog virtual joystick & dedicated brake)
    const k = keysRef.current;
    const t = store.touchInput;
    const mergedInput = isPlaying
      ? {
          forward: k.forward || t.forward,
          backward: k.backward || t.backward,
          brake: Boolean(t.brake),
          left: k.left || t.left,
          right: k.right || t.right,
          steerAnalog: carLiveState.touchSteerAnalog || 0,
          boost: k.boost || t.boost,
          jump: k.jump || t.jump,
        }
      : {
          forward: false,
          backward: false,
          brake: false,
          left: false,
          right: false,
          steerAnalog: 0,
          boost: false,
          jump: false,
        };

    // Apply checkpoint / easter-egg full refill or crystal surge bonus before stepping
    if (carLiveState.refillNonce !== lastRefillNonceRef.current) {
      lastRefillNonceRef.current = carLiveState.refillNonce;
      simRef.current.boost = 100;
      simRef.current.nitroCooldown = 0;
    }
    if (carLiveState.crystalBoostBonus > 0) {
      simRef.current.boost = Math.min(100, simRef.current.boost + carLiveState.crystalBoostBonus);
      if (simRef.current.boost > 20) simRef.current.nitroCooldown = 0;
      carLiveState.crystalBoostBonus = 0;
    }

    const nextSim = stepVehicleState(simRef.current, mergedInput, dt, {
      steeringSensitivity: store.settings.steeringSensitivity,
    });
    simRef.current = nextSim;
    expectedSpeedRef.current = nextSim.speed;

    // 4. Jump impulse (edge-triggered with cooldown)
    const nowSec = state.clock.elapsedTime;
    const wantsJump = jumpQueuedRef.current || t.jump;
    let nextVy = curVel.y;
    if (wantsJump && isPlaying && grounded && nowSec - lastJumpTimeRef.current > 0.35) {
      nextVy = VEHICLE_CONSTANTS.JUMP_VELOCITY;
      springRef.current.velocity += 1.5; // Takeoff suspension extension
      lastJumpTimeRef.current = nowSec;
      audioEngine.playJump();
      jumpQueuedRef.current = false;
      if (t.jump) store.setTouchControl('jump', false);
    } else if (jumpQueuedRef.current) {
      jumpQueuedRef.current = false;
    }

    // Soft world-boundary safety containment inside mountain perimeter
    let targetVx = nextSim.vx;
    let targetVz = nextSim.vz;
    const distFromCenter = Math.hypot(pos.x, pos.z);
    if (distFromCenter > WORLD_RADIUS - 6) {
      const pullX = -pos.x / distFromCenter;
      const pullZ = -pos.z / distFromCenter;
      targetVx += pullX * 14;
      targetVz += pullZ * 14;
    }

    rb.setLinvel({ x: targetVx, y: nextVy, z: targetVz }, true);

    // Upright yaw orientation on RigidBody
    _euler.set(0, nextSim.yaw, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    rb.setRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w }, true);

    // 5. Second-order suspension spring & body pitch/roll lean
    const targetSuspension = grounded ? 0 : 0.08;
    springRef.current = stepSuspensionSpring(springRef.current, targetSuspension, dt);

    if (visualGroupRef.current) {
      visualGroupRef.current.position.y = springRef.current.offset;
      visualGroupRef.current.rotation.x = nextSim.pitchLean;
      visualGroupRef.current.rotation.z = nextSim.rollLean;
    }

    // 6. Front wheel steering & all-wheel spin
    if (flWheelSteerRef.current) flWheelSteerRef.current.rotation.y = nextSim.steerAngle;
    if (frWheelSteerRef.current) frWheelSteerRef.current.rotation.y = nextSim.steerAngle;
    for (let i = 0; i < wheelSpinRefs.current.length; i += 1) {
      const wheel = wheelSpinRefs.current[i];
      if (wheel) wheel.rotation.x = -nextSim.wheelSpin;
    }

    // 7. Animated boost thrusters, taillights, and neon underglow
    if (nextSim.isBoosting && !lastBoostRef.current) {
      audioEngine.playBoostIgnition();
    }
    lastBoostRef.current = nextSim.isBoosting;

    const absSpeed = Math.abs(nextSim.speed);
    const activeFlame = nextSim.isBoosting || absSpeed > 2.0;
    const flameScale = nextSim.isBoosting
      ? 2.25 + Math.sin(nowSec * 42) * 0.35
      : activeFlame
        ? Math.max(0.28, absSpeed / 36)
        : 0.001;
    if (thrusterLeftRef.current) {
      thrusterLeftRef.current.visible = activeFlame;
      thrusterLeftRef.current.scale.set(
        nextSim.isBoosting ? 1.45 : 0.9,
        nextSim.isBoosting ? 1.45 : 0.9,
        flameScale
      );
    }
    if (thrusterRightRef.current) {
      thrusterRightRef.current.visible = activeFlame;
      thrusterRightRef.current.scale.set(
        nextSim.isBoosting ? 1.45 : 0.9,
        nextSim.isBoosting ? 1.45 : 0.9,
        flameScale
      );
    }

    if (taillightMatRef.current) {
      const braking = mergedInput.backward || mergedInput.brake;
      taillightMatRef.current.emissiveIntensity = braking ? 4.2 : 1.8;
    }
    if (underglowMatRef.current) {
      underglowMatRef.current.emissiveIntensity = nextSim.isBoosting ? 3.2 : 1.4;
      underglowMatRef.current.emissive.set(nextSim.isBoosting ? '#8b5cf6' : '#06b6d4');
    }
    if (underglowFloorMatRef.current) {
      underglowFloorMatRef.current.opacity = nextSim.isBoosting ? 0.55 : 0.28;
      underglowFloorMatRef.current.color.set(nextSim.isBoosting ? '#8b5cf6' : '#06b6d4');
    }

    // 8. Pooled Zero-GC Nitro Boost & High-Speed Particle Streaks (scaled by preset)
    if (nitroParticlesRef.current) {
      const pool = particlePoolRef.current;
      const activePoolCap = Math.min(NITRO_PARTICLE_COUNT, Math.max(8, nitroParticleLimit));
      const forwardX = -Math.sin(nextSim.yaw);
      const forwardZ = -Math.cos(nextSim.yaw);
      const rightX = Math.cos(nextSim.yaw);
      const rightZ = -Math.sin(nextSim.yaw);

      // Spawn 1-2 exhaust/speed particles per frame while boosting
      if (nextSim.isBoosting && isPlaying) {
        const spawnPerFrame = activePoolCap <= 16 ? 1 : 2;
        for (let s = 0; s < spawnPerFrame; s += 1) {
          const p = pool[particleCursorRef.current];
          particleCursorRef.current = (particleCursorRef.current + 1) % activePoolCap;
          const side = s === 0 ? -0.42 : 0.42;
          p.active = true;
          p.life = 0;
          p.maxLife = 0.34 + ((particleCursorRef.current % 5) * 0.04);
          p.x = pos.x - forwardX * 2.25 + rightX * side;
          p.y = pos.y + 0.26 + (Math.sin(nowSec * 19 + s) * 0.05);
          p.z = pos.z - forwardZ * 2.25 + rightZ * side;
          p.vx = -forwardX * (16 + (particleCursorRef.current % 4) * 3) + rightX * (s === 0 ? -0.6 : 0.6);
          p.vy = 0.45 + (particleCursorRef.current % 3) * 0.25;
          p.vz = -forwardZ * (16 + (particleCursorRef.current % 4) * 3) + rightZ * (s === 0 ? -0.6 : 0.6);
          p.scale = 0.16;
        }
      }

      let hasActiveNitro = false;
      for (let i = 0; i < NITRO_PARTICLE_COUNT; i += 1) {
        if (pool[i].active) {
          hasActiveNitro = true;
          break;
        }
      }

      if (hasActiveNitro || hadNitroParticlesRef.current) {
        let anyRemaining = false;
        for (let i = 0; i < NITRO_PARTICLE_COUNT; i += 1) {
          const p = pool[i];
          if (!p.active) {
            _dummy.position.set(0, -50, 0);
            _dummy.scale.set(0.001, 0.001, 0.001);
            _dummy.updateMatrix();
            nitroParticlesRef.current.setMatrixAt(i, _dummy.matrix);
            continue;
          }

          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            _dummy.position.set(0, -50, 0);
            _dummy.scale.set(0.001, 0.001, 0.001);
            _dummy.updateMatrix();
            nitroParticlesRef.current.setMatrixAt(i, _dummy.matrix);
            continue;
          }

          anyRemaining = true;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const tNorm = 1 - p.life / p.maxLife;

          _dummy.position.set(p.x, p.y, p.z);
          _dummy.rotation.set(0, nextSim.yaw, 0);
          _dummy.scale.set(p.scale * tNorm, p.scale * tNorm, p.scale * 4.5 * tNorm);
          _dummy.updateMatrix();
          nitroParticlesRef.current.setMatrixAt(i, _dummy.matrix);

          _particleColor.set(i % 2 === 0 ? '#38bdf8' : '#a855f7');
          nitroParticlesRef.current.setColorAt(i, _particleColor);
        }

        nitroParticlesRef.current.instanceMatrix.needsUpdate = true;
        if (nitroParticlesRef.current.instanceColor) {
          nitroParticlesRef.current.instanceColor.needsUpdate = true;
        }
        hadNitroParticlesRef.current = anyRemaining;
      }
    }

    // 9. Update 60Hz shared mutable telemetry
    carLiveState.x = pos.x;
    carLiveState.y = pos.y;
    carLiveState.z = pos.z;
    carLiveState.yaw = nextSim.yaw;
    carLiveState.speed = nextSim.speed;
    carLiveState.boost = nextSim.boost;
    carLiveState.nitroCooldown = nextSim.nitroCooldown;
    carLiveState.isBoosting = nextSim.isBoosting;
    carLiveState.grounded = grounded;

    // 10. Update continuous Web Audio engine + acceleration + nitro jet + ambient pad
    const isAccelerating = mergedInput.forward && !mergedInput.backward;
    audioEngine.updateEngine(
      absSpeed / VEHICLE_CONSTANTS.MAX_SPEED,
      nextSim.isBoosting,
      isPlaying,
      isAccelerating
    );

    // 11. Throttle React HUD updates & proximity checks to ~10Hz
    hudSyncAccumRef.current += dt;
    if (hudSyncAccumRef.current >= 0.1) {
      hudSyncAccumRef.current = 0;
      store.syncTelemetry(
        nextSim.speedKmh,
        Math.round(nextSim.boost),
        nextSim.isBoosting,
        grounded,
        Number(nextSim.nitroCooldown.toFixed(1))
      );
      const nearest = findNearestZone(pos.x, pos.z);
      store.setNearbyZone(nearest);
    }
  });

  const wheelPositions = [
    [-1.0, 0.36, -1.34, true, 0],  // Front Left
    [1.0, 0.36, -1.34, true, 1],   // Front Right
    [-1.04, 0.39, 1.34, false, 2], // Rear Left
    [1.04, 0.39, 1.34, false, 3],  // Rear Right
  ];

  const spokeAngles = [0, (Math.PI * 2) / 5, (Math.PI * 4) / 5, (Math.PI * 6) / 5, (Math.PI * 8) / 5];

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        position={[SPAWN_POINT.x, SPAWN_POINT.y, SPAWN_POINT.z]}
        colliders={false}
        mass={1.6}
        linearDamping={0}
        angularDamping={2.5}
        enabledRotations={[false, true, false]}
        ccd
      >
        <CuboidCollider args={[1.05, 0.48, 2.18]} position={[0, 0.48, 0]} friction={0} restitution={0.15} />

        <group name="HypercarRoot">
          {/* Grounded radial contact shadow disc */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.5, 5.6]} />
            <meshBasicMaterial
              map={contactTex}
              transparent
              opacity={0.78}
              depthWrite={false}
            />
          </mesh>

          {/* Ground-projected Neon Underglow Aura */}
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.55, 4.4]} />
            <meshBasicMaterial
              ref={underglowFloorMatRef}
              color="#06b6d4"
              transparent
              opacity={0.28}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Suspension-animated car body */}
          <group ref={visualGroupRef}>
            {/* 1. Primary Sculpted Metallic Supercar Body */}
            <mesh geometry={chassisGeo} castShadow receiveShadow>
              <meshPhysicalMaterial
                color="#0b1326"
                metalness={0.85}
                roughness={0.22}
                clearcoat={0.85}
                clearcoatRoughness={0.14}
                envMapIntensity={0.82}
              />
            </mesh>

            {/* 2. Sapphire Tinted Glass Cockpit Canopy */}
            <mesh geometry={canopyGeo} castShadow>
              <meshPhysicalMaterial
                color="#09294d"
                metalness={0.18}
                roughness={0.08}
                ior={1.52}
                reflectivity={0.82}
                clearcoat={0.85}
                clearcoatRoughness={0.08}
                envMapIntensity={0.9}
                opacity={0.92}
                transparent
              />
            </mesh>

            {/* 3. Aggressive Front Fascia, Hood Spine & Twin Intakes */}
            <mesh position={[0, 0.52, -1.25]} rotation={[0.14, 0, 0]}>
              <boxGeometry args={[0.16, 0.035, 1.2]} />
              <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1.6} />
            </mesh>
            <mesh position={[0, 0.16, -2.14]} castShadow>
              <boxGeometry args={[1.96, 0.08, 0.44]} />
              <meshStandardMaterial color="#020617" metalness={0.45} roughness={0.62} />
            </mesh>
            <mesh position={[-0.62, 0.23, -2.16]}>
              <boxGeometry args={[0.42, 0.11, 0.12]} />
              <meshStandardMaterial color="#020617" roughness={0.8} />
            </mesh>
            <mesh position={[0.62, 0.23, -2.16]}>
              <boxGeometry args={[0.42, 0.11, 0.12]} />
              <meshStandardMaterial color="#020617" roughness={0.8} />
            </mesh>

            {/* 4. Side Aero Skirts & Neon Underglow Rails */}
            <mesh position={[-0.99, 0.19, 0]}>
              <boxGeometry args={[0.16, 0.09, 2.24]} />
              <meshStandardMaterial color="#1e293b" metalness={0.72} roughness={0.3} />
            </mesh>
            <mesh position={[0.99, 0.19, 0]}>
              <boxGeometry args={[0.16, 0.09, 2.24]} />
              <meshStandardMaterial color="#1e293b" metalness={0.72} roughness={0.3} />
            </mesh>
            <mesh position={[-1.02, 0.16, 0]}>
              <boxGeometry args={[0.05, 0.045, 2.16]} />
              <meshStandardMaterial
                ref={underglowMatRef}
                color="#06b6d4"
                emissive="#06b6d4"
                emissiveIntensity={1.4}
              />
            </mesh>
            <mesh position={[1.02, 0.16, 0]}>
              <boxGeometry args={[0.05, 0.045, 2.16]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#06b6d4"
                emissiveIntensity={1.4}
              />
            </mesh>

            {/* 5. Rear Engine Louvers, Active Wing & Diffuser Fins */}
            {[0.92, 1.15, 1.38].map((zPos, i) => (
              <mesh key={i} position={[0, 0.62, zPos]} rotation={[-0.18, 0, 0]}>
                <boxGeometry args={[0.94, 0.03, 0.14]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.28} />
              </mesh>
            ))}
            <mesh position={[-0.58, 0.78, 1.9]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.08, 0.48, 0.22]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
            </mesh>
            <mesh position={[0.58, 0.78, 1.9]} rotation={[0.2, 0, 0]} castShadow>
              <boxGeometry args={[0.08, 0.48, 0.22]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.28} />
            </mesh>
            <mesh position={[0, 1.03, 2.0]} rotation={[0.08, 0, 0]} castShadow>
              <boxGeometry args={[1.98, 0.07, 0.36]} />
              <meshPhysicalMaterial
                color="#2563eb"
                metalness={0.8}
                roughness={0.2}
                clearcoat={0.8}
                clearcoatRoughness={0.14}
                envMapIntensity={0.82}
              />
            </mesh>
            <mesh position={[-0.24, 0.16, 2.18]}>
              <boxGeometry args={[0.05, 0.15, 0.22]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0.24, 0.16, 2.18]}>
              <boxGeometry args={[0.05, 0.15, 0.22]} />
              <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* 6. Angular LED Headlights & Forward Ground Light Cones */}
            <mesh position={[-0.65, 0.34, -2.18]} rotation={[0, 0.18, 0]}>
              <boxGeometry args={[0.44, 0.07, 0.08]} />
              <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={3.5} />
            </mesh>
            <mesh position={[0.65, 0.34, -2.18]} rotation={[0, -0.18, 0]}>
              <boxGeometry args={[0.44, 0.07, 0.08]} />
              <meshStandardMaterial color="#e0f2fe" emissive="#38bdf8" emissiveIntensity={3.5} />
            </mesh>
            <mesh position={[0, 0.24, -2.22]}>
              <boxGeometry args={[0.88, 0.04, 0.05]} />
              <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.2} />
            </mesh>
            {/* Forward LED Headlight Road Beams (skipped on Low preset to reduce fillrate) */}
            {showHeadlightBeams && (
              <>
                <mesh position={[-0.65, 0.06, -5.1]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[1.35, 5.6]} />
                  <meshBasicMaterial
                    map={beamTex}
                    transparent
                    opacity={0.75}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
                <mesh position={[0.65, 0.06, -5.1]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[1.35, 5.6]} />
                  <meshBasicMaterial
                    map={beamTex}
                    transparent
                    opacity={0.75}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              </>
            )}

            {/* 7. Wraparound LED Taillight Bar */}
            <mesh position={[0, 0.47, 2.2]}>
              <boxGeometry args={[1.68, 0.075, 0.06]} />
              <meshStandardMaterial
                ref={taillightMatRef}
                color="#f43f5e"
                emissive="#e11d48"
                emissiveIntensity={1.8}
              />
            </mesh>

            {/* 8. Dual Rear Thruster Exhaust Housings & Animated Flame Jets */}
            {[-0.44, 0.44].map((exX, idx) => (
              <group key={idx} position={[exX, 0.26, 2.2]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.13, 0.15, 0.22, 16]} />
                  <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.25} />
                </mesh>
                <mesh
                  ref={idx === 0 ? thrusterLeftRef : thrusterRightRef}
                  position={[0, 0, 0.22]}
                  rotation={[Math.PI / 2, 0, 0]}
                  visible={false}
                >
                  <coneGeometry args={[0.1, 0.55, 12]} />
                  <meshStandardMaterial
                    color="#38bdf8"
                    emissive="#8b5cf6"
                    emissiveIntensity={3.2}
                    transparent
                    opacity={0.88}
                  />
                </mesh>
              </group>
            ))}
          </group>

          {/* 9. Four Detailed 5-Spoke Wheel Assemblies with Brake Calipers */}
          {wheelPositions.map(([wx, wy, wz, isFront, idx]) => {
            const radius = isFront ? 0.36 : 0.39;
            const outerSign = wx < 0 ? -1 : 1;
            return (
              <group
                key={idx}
                position={[wx, wy, wz]}
                ref={idx === 0 ? flWheelSteerRef : idx === 1 ? frWheelSteerRef : null}
              >
                {/* Stationary Brake Caliper */}
                <mesh position={[outerSign * 0.06, 0.06, 0.14]}>
                  <boxGeometry args={[0.08, 0.13, 0.12]} />
                  <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.6} metalness={0.7} roughness={0.3} />
                </mesh>

                <group
                  ref={(el) => {
                    wheelSpinRefs.current[idx] = el;
                  }}
                >
                  {/* Rubber Tire */}
                  <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[radius, radius, 0.29, 24]} />
                    <meshStandardMaterial color="#0a0e18" roughness={0.84} metalness={0.12} />
                  </mesh>
                  {/* Brake Rotor Disc */}
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.24, 0.24, 0.26, 20]} />
                    <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.35} />
                  </mesh>
                  {/* Center Hub Cap */}
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.31, 12]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.18} />
                  </mesh>
                  {/* 5-Spoke Alloy Blades */}
                  {spokeAngles.map((ang, sIdx) => (
                    <mesh
                      key={sIdx}
                      position={[outerSign * 0.135, Math.sin(ang) * 0.12, Math.cos(ang) * 0.12]}
                      rotation={[ang, 0, 0]}
                    >
                      <boxGeometry args={[0.03, 0.22, 0.045]} />
                      <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.22} />
                    </mesh>
                  ))}
                  {/* Glowing Cyan Rim Accent Ring */}
                  <mesh position={[outerSign * 0.15, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.245, 0.022, 8, 24]} />
                    <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.1} />
                  </mesh>
                </group>
              </group>
            );
          })}
        </group>
      </RigidBody>

      {/* Pooled World-Space Nitro Boost Speed Streaks */}
      <instancedMesh
        ref={nitroParticlesRef}
        args={[null, null, NITRO_PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
      </instancedMesh>
    </>
  );
}
