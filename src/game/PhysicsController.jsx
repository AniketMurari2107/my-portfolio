import { useEffect } from 'react';
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier';
import { useGameStore } from '../store/gameStore.js';
import { WORLD_RADIUS } from './worldZones.js';

/**
 * Sets up the Rapier 3D physics world, static island plateau collider,
 * and outer perimeter safety barriers so the player can explore the entire island safely.
 */
export function PhysicsController({ children }) {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const activeSection = useGameStore((s) => s.activeSection);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      useGameStore.getState().setWorldReady();
    }, 200);
    return () => window.clearTimeout(timer);
  }, []);

  const wallOffset = WORLD_RADIUS - 2;

  return (
    <Physics
      gravity={[0, -24, 0]}
      paused={gamePhase === 'paused' || Boolean(activeSection)}
      timeStep="vary"
    >
      {/* Main island terrain floor collider (top surface sits flush at y = 0) */}
      <RigidBody type="fixed" restitution={0.05} friction={0}>
        <CuboidCollider args={[140, 0.5, 140]} position={[0, -0.5, 0]} />
      </RigidBody>

      {/* Outer island perimeter safety walls */}
      <RigidBody type="fixed" restitution={0.35}>
        <CuboidCollider args={[130, 8, 2]} position={[0, 4, -wallOffset]} />
        <CuboidCollider args={[130, 8, 2]} position={[0, 4, wallOffset]} />
        <CuboidCollider args={[2, 8, 130]} position={[-wallOffset, 4, 0]} />
        <CuboidCollider args={[2, 8, 130]} position={[wallOffset, 4, 0]} />
      </RigidBody>

      {children}
    </Physics>
  );
}
