import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import gsap from 'gsap';
import * as THREE from 'three';
import { carLiveState, useGameStore } from '../store/gameStore.js';
import { SPAWN_POINT } from './worldZones.js';
import { clampDelta, expDamp } from './vehicleMath.js';

// Pre-allocated scratch vectors for zero GC
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _menuPos = new THREE.Vector3();
const _menuLook = new THREE.Vector3();
const _chasePos = new THREE.Vector3();
const _chaseLook = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

/**
 * Third-person follow & showcase camera controller:
 * - Smooth GSAP transition from Title showcase orbit into gameplay chase cam
 * - Exponentially damped follow tracking & speed-adaptive distance + FOV kick
 * - Mouse drag camera rotation + scroll wheel zoom
 * - Camera reset via [C] key or HUD button, plus instant snap on vehicle reset/teleport
 * - Anti-clipping terrain clamp + Rapier obstacle raycast pull-in
 * - Decaying trauma*trauma rotational shake on impacts & landings
 */
export function CameraController() {
  const { camera, gl } = useThree();
  const { rapier, world } = useRapier();

  const gamePhase = useGameStore((s) => s.gamePhase);
  const baseFov = useGameStore((s) => s.settings.cameraFov);
  const cameraResetNonce = useGameStore((s) => s.cameraResetNonce);
  const cameraSnapNonce = useGameStore((s) => s.cameraSnapNonce);

  const transitionRef = useRef({ blend: gamePhase === 'playing' ? 1 : 0 });
  const currentLookRef = useRef(new THREE.Vector3(SPAWN_POINT.x, 1.2, SPAWN_POINT.z));
  const initializedRef = useRef(false);
  const lastSnapNonceRef = useRef(cameraSnapNonce);
  const lastCarPosRef = useRef({ x: SPAWN_POINT.x, z: SPAWN_POINT.z });

  // Manual mouse-orbit offsets & zoom state
  const orbitRef = useRef({
    yawOffset: 0,
    pitchOffset: 0,
    zoomDist: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Reset manual orbit offsets when requested via [C] or HUD Reset Camera
  useEffect(() => {
    if (cameraResetNonce === 0) return;
    gsap.killTweensOf(orbitRef.current);
    gsap.to(orbitRef.current, {
      yawOffset: 0,
      pitchOffset: 0,
      zoomDist: 0,
      duration: 0.32,
      ease: 'power2.out',
    });
  }, [cameraResetNonce]);

  // Animate camera blend cleanly with GSAP when START ENGINE is clicked
  useEffect(() => {
    if (gamePhase === 'playing') {
      gsap.to(transitionRef.current, {
        blend: 1,
        duration: 1.35,
        ease: 'power3.inOut',
      });
    } else if (gamePhase === 'menu') {
      gsap.killTweensOf(orbitRef.current);
      orbitRef.current.yawOffset = 0;
      orbitRef.current.pitchOffset = 0;
      orbitRef.current.zoomDist = 0;
      gsap.to(transitionRef.current, {
        blend: 0,
        duration: 1.0,
        ease: 'power2.out',
      });
    }
  }, [gamePhase]);

  // Bind pointer drag & scroll wheel zoom on WebGL canvas for manual camera rotation
  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return undefined;

    const onPointerDown = (e) => {
      const state = useGameStore.getState();
      if (state.gamePhase !== 'playing' || state.activeSection || state.settingsOpen) return;
      orbitRef.current.dragging = true;
      orbitRef.current.lastX = e.clientX;
      orbitRef.current.lastY = e.clientY;
    };

    const onPointerMove = (e) => {
      if (!orbitRef.current.dragging) return;
      const dx = e.clientX - orbitRef.current.lastX;
      const dy = e.clientY - orbitRef.current.lastY;
      orbitRef.current.lastX = e.clientX;
      orbitRef.current.lastY = e.clientY;

      orbitRef.current.yawOffset -= dx * 0.0065;
      orbitRef.current.pitchOffset = Math.max(
        -0.35,
        Math.min(0.65, orbitRef.current.pitchOffset + dy * 0.005)
      );
    };

    const onPointerUp = () => {
      orbitRef.current.dragging = false;
    };

    const onWheel = (e) => {
      const state = useGameStore.getState();
      if (state.gamePhase !== 'playing' || state.activeSection || state.settingsOpen) return;
      orbitRef.current.zoomDist = Math.max(
        -2.5,
        Math.min(6.0, orbitRef.current.zoomDist + e.deltaY * 0.004)
      );
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  useFrame((state, rawDt) => {
    const dt = clampDelta(rawDt);
    const t = state.clock.elapsedTime;
    const blend = transitionRef.current.blend;

    // Detect instantaneous vehicle teleport / reset so camera snaps cleanly behind car
    const movedDist = Math.hypot(
      carLiveState.x - lastCarPosRef.current.x,
      carLiveState.z - lastCarPosRef.current.z
    );
    const snapRequested = lastSnapNonceRef.current !== cameraSnapNonce || movedDist > 8;
    lastCarPosRef.current.x = carLiveState.x;
    lastCarPosRef.current.z = carLiveState.z;

    if (snapRequested) {
      lastSnapNonceRef.current = cameraSnapNonce;
      gsap.killTweensOf(orbitRef.current);
      orbitRef.current.yawOffset = 0;
      orbitRef.current.pitchOffset = 0;
      orbitRef.current.zoomDist = 0;
      orbitRef.current.dragging = false;
    }

    // 1. Showcase orbital framing around the hypercar on the main menu
    const orbitAngle = t * 0.22 + 0.55;
    _menuPos.set(
      carLiveState.x + Math.sin(orbitAngle) * 7.8,
      carLiveState.y + 2.6 + Math.sin(t * 0.45) * 0.25,
      carLiveState.z + Math.cos(orbitAngle) * 7.8
    );
    _menuLook.set(carLiveState.x, carLiveState.y + 0.75, carLiveState.z - 0.6);

    // 2. Third-person follow camera behind car + optional mouse orbit offset
    const effectiveYaw = carLiveState.yaw + orbitRef.current.yawOffset;
    const forwardX = -Math.sin(effectiveYaw);
    const forwardZ = -Math.cos(effectiveYaw);

    const carForwardX = -Math.sin(carLiveState.yaw);
    const carForwardZ = -Math.cos(carLiveState.yaw);

    const speedRatio = Math.min(1.6, Math.abs(carLiveState.speed) / 30);
    const boostLag = carLiveState.isBoosting ? 1.15 : 0;
    const followDist = 8.4 + speedRatio * 1.45 + boostLag + orbitRef.current.zoomDist;
    const followHeight =
      3.45 + speedRatio * 0.42 + (carLiveState.isBoosting ? -0.18 : 0) + orbitRef.current.pitchOffset * 5.2;

    _chasePos.set(
      carLiveState.x - forwardX * followDist,
      carLiveState.y + followHeight,
      carLiveState.z - forwardZ * followDist
    );

    // Prevent camera from clipping below terrain surface
    if (_chasePos.y < 0.72) _chasePos.y = 0.72;

    _chaseLook.set(
      carLiveState.x + carForwardX * 4.2,
      carLiveState.y + 1.05,
      carLiveState.z + carForwardZ * 4.2
    );

    // Raycast from car anchor toward desired chase position to avoid clipping behind monoliths
    if (world && rapier && blend > 0.8) {
      const originY = carLiveState.y + 1.25;
      _rayDir.set(
        _chasePos.x - carLiveState.x,
        _chasePos.y - originY,
        _chasePos.z - carLiveState.z
      );
      const rayLen = _rayDir.length();
      if (rayLen > 0.5) {
        _rayDir.divideScalar(rayLen);
        const camRay = new rapier.Ray(
          { x: carLiveState.x, y: originY, z: carLiveState.z },
          { x: _rayDir.x, y: _rayDir.y, z: _rayDir.z }
        );
        const hit = world.castRay(camRay, rayLen, true);
        if (hit && hit.timeOfImpact > 1.8 && hit.timeOfImpact < rayLen - 0.4) {
          const safeDist = hit.timeOfImpact - 0.45;
          _chasePos.set(
            carLiveState.x + _rayDir.x * safeDist,
            Math.max(0.72, originY + _rayDir.y * safeDist),
            carLiveState.z + _rayDir.z * safeDist
          );
        }
      }
    }

    // Blend showcase -> chase during GSAP transition
    _targetPos.lerpVectors(_menuPos, _chasePos, blend);
    _targetLook.lerpVectors(_menuLook, _chaseLook, blend);

    if (!initializedRef.current || snapRequested) {
      camera.position.copy(_targetPos);
      currentLookRef.current.copy(_targetLook);
      camera.lookAt(currentLookRef.current);
      if (Math.abs(camera.fov - baseFov) > 0.05) {
        camera.fov = baseFov;
        camera.updateProjectionMatrix();
      }
      initializedRef.current = true;
      return;
    }

    const posLambda = blend > 0.95 ? 8.0 : 10.5;
    const lookLambda = blend > 0.95 ? 12.0 : 12.5;

    camera.position.x = expDamp(camera.position.x, _targetPos.x, posLambda, dt);
    camera.position.y = Math.max(0.65, expDamp(camera.position.y, _targetPos.y, posLambda, dt));
    camera.position.z = expDamp(camera.position.z, _targetPos.z, posLambda, dt);

    currentLookRef.current.x = expDamp(currentLookRef.current.x, _targetLook.x, lookLambda, dt);
    currentLookRef.current.y = expDamp(currentLookRef.current.y, _targetLook.y, lookLambda, dt);
    currentLookRef.current.z = expDamp(currentLookRef.current.z, _targetLook.z, lookLambda, dt);

    camera.lookAt(currentLookRef.current);

    // Apply decaying trauma*trauma shake on collisions / landings + subtle Nitro rumble
    if (carLiveState.trauma > 0.005 || carLiveState.isBoosting) {
      const impactShake = carLiveState.trauma * carLiveState.trauma * 0.14;
      const boostShake = carLiveState.isBoosting ? 0.0045 : 0;
      const shake = impactShake + boostShake;
      camera.rotation.z += Math.sin(t * 52) * shake;
      camera.rotation.x += Math.cos(t * 43) * shake * 0.6;
      carLiveState.trauma = Math.max(0, carLiveState.trauma - dt * 2.4);
    }

    // Dynamic FOV warp during Nitro boost & high-speed driving
    const targetFov = baseFov + (carLiveState.isBoosting ? 13.5 : speedRatio * 4.5);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = expDamp(camera.fov, targetFov, 7.2, dt);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
