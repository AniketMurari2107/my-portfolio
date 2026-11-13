import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { PROJECTS_DATA, SKILLS_DATA } from '../data/portfolioData.js';
import {
  createHoloSignTexture,
  createProjectDisplayTexture,
  createSkillBadgeTexture,
} from './proceduralAssets.js';
import { audioEngine } from './audioEngine.js';

/**
 * Shared architectural pedestal, Rapier stepped colliders, glowing proximity marker,
 * and interactive holographic billboard shared by all 6 portfolio locations.
 */
function LocationShell({ zone, isNearby, onSelect, signY = 8.4, children }) {
  const markerRef = useRef(null);
  const signTex = useMemo(
    () => createHoloSignTexture(zone.signTitle || zone.title, zone.subtitle, zone.color),
    [zone.signTitle, zone.title, zone.subtitle, zone.color]
  );

  useEffect(() => {
    return () => signTex.dispose();
  }, [signTex]);

  // Orient each building toward the central roundabout plaza (0, 0)
  const facingYaw = useMemo(
    () => Math.atan2(-zone.position[0], -zone.position[2]),
    [zone.position]
  );

  useFrame((state) => {
    if (!markerRef.current) return;
    const t = state.clock.elapsedTime;
    const pulse = isNearby ? 1 + Math.sin(t * 5) * 0.08 : 1;
    markerRef.current.scale.set(pulse, 1, pulse);
    markerRef.current.position.y = isNearby ? 0.05 : 0.03;
  });

  return (
    <group position={zone.position} rotation={[0, facingYaw, 0]}>
      {/* Solid Rapier colliders matching the stepped architectural plinth */}
      <RigidBody type="fixed" restitution={0.2} friction={0.4}>
        <CylinderCollider args={[0.16, 4.95]} position={[0, 0.16, 0]} />
        <CylinderCollider args={[2.0, 3.2]} position={[0, 2.0, 0]} />
      </RigidBody>

      {/* Base Stepped Pedestal */}
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <cylinderGeometry args={[4.6, 5.1, 0.32, 24]} />
        <meshStandardMaterial color="#0b1224" metalness={0.68} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.1, 3.5, 0.34, 8]} />
        <meshStandardMaterial color="#172038" metalness={0.78} roughness={0.26} />
      </mesh>

      {/* Outer Glowing Interaction Radius Ring */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zone.radius - 0.38, zone.radius, 56]} />
        <meshBasicMaterial
          color={zone.color}
          transparent
          opacity={isNearby ? 0.96 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glowing Entry Marker Ring & Vertical Beam when player is inside interaction radius */}
      <group ref={markerRef} position={[0, 0.04, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.4, 5.85, 48]} />
          <meshBasicMaterial
            color={zone.color}
            transparent
            opacity={isNearby ? 0.92 : 0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
        {isNearby && (
          <mesh position={[0, 4.5, 0]}>
            <cylinderGeometry args={[zone.radius - 0.25, zone.radius - 0.25, 9, 32, 1, true]} />
            <meshBasicMaterial
              color={zone.color}
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {/* Location-specific futuristic 3D architecture */}
      {children}

      {/* Holographic Building Header Sign (clickable or triggered via [E]) */}
      <mesh
        position={[0, signY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          audioEngine.playInteract();
          onSelect(zone.id);
        }}
      >
        <planeGeometry args={[6.8, 2.9]} />
        <meshBasicMaterial map={signTex} transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * LOCATION 1: ABOUT ME — Futuristic titanium & glowing cyan glass atrium building.
 */
function AboutBuilding({ color, isNearby }) {
  const coreRef = useRef(null);
  useFrame((state) => {
    if (!coreRef.current) return;
    const t = state.clock.elapsedTime;
    coreRef.current.rotation.y = t * 0.7;
    coreRef.current.position.y = 5.4 + Math.sin(t * 1.6) * 0.22;
  });

  return (
    <group>
      {/* Main Futuristic Glass & Titanium Hall */}
      <mesh position={[0, 2.4, -0.4]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 4.2, 3.2]} />
        <meshStandardMaterial color="#0e172c" metalness={0.82} roughness={0.24} />
      </mesh>
      {/* Illuminated Front Glass Facade */}
      <mesh position={[0, 2.4, 1.24]}>
        <boxGeometry args={[3.1, 3.1, 0.14]} />
        <meshStandardMaterial
          color="#0c365a"
          emissive={color}
          emissiveIntensity={isNearby ? 1.8 : 0.95}
          metalness={0.35}
          roughness={0.12}
        />
      </mesh>
      {/* Angled Architectural Wing Fins */}
      <mesh position={[-2.5, 2.6, 0]} rotation={[0, 0, 0.18]} castShadow>
        <boxGeometry args={[0.38, 4.8, 2.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[2.5, 2.6, 0]} rotation={[0, 0, -0.18]} castShadow>
        <boxGeometry args={[0.38, 4.8, 2.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.22} />
      </mesh>
      {/* Roof Light Crown */}
      <mesh position={[0, 4.65, -0.4]}>
        <boxGeometry args={[4.6, 0.18, 3.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.9} />
      </mesh>
      <mesh ref={coreRef} position={[0, 5.4, 0]}>
        <octahedronGeometry args={[0.75, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.1} />
      </mesh>
    </group>
  );
}

/**
 * LOCATION 2: SKILLS — Futuristic tall tower surrounded by floating holographic skill objects.
 */
function SkillsTower({ color, isNearby }) {
  const orbitGroupRef = useRef(null);

  const skillTextures = useMemo(
    () => SKILLS_DATA.map((skill) => createSkillBadgeTexture(skill.name, skill.color)),
    []
  );

  useEffect(() => {
    return () => {
      skillTextures.forEach((tex) => tex.dispose());
    };
  }, [skillTextures]);

  useFrame((state) => {
    if (!orbitGroupRef.current) return;
    orbitGroupRef.current.rotation.y = state.clock.elapsedTime * 0.34;
  });

  return (
    <group>
      {/* Tall Central Skill Spire */}
      <mesh position={[0, 3.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.85, 6.4, 8]} />
        <meshStandardMaterial color="#0d1528" metalness={0.84} roughness={0.22} />
      </mesh>
      {/* Glowing Tower Rings */}
      {[1.6, 3.3, 5.0].map((yPos, idx) => (
        <mesh key={idx} position={[0, yPos, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.95 - idx * 0.28, 0.065, 10, 36]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isNearby ? 2.4 : 1.4}
          />
        </mesh>
      ))}
      {/* Orbiting Floating Holographic Skill Objects */}
      <group ref={orbitGroupRef}>
        {SKILLS_DATA.map((skill, idx) => {
          const angle = (idx / SKILLS_DATA.length) * Math.PI * 2;
          const radius = 3.85;
          const height = 2.6 + (idx % 3) * 1.15;
          return (
            <group
              key={skill.id}
              position={[Math.cos(angle) * radius, height, Math.sin(angle) * radius]}
              rotation={[0, -angle + Math.PI / 2, 0]}
            >
              <mesh>
                <boxGeometry args={[1.7, 0.85, 0.14]} />
                <meshStandardMaterial
                  color="#0a1224"
                  emissive={skill.color}
                  emissiveIntensity={0.45}
                  metalness={0.7}
                  roughness={0.2}
                />
              </mesh>
              <mesh position={[0, 0, 0.08]}>
                <planeGeometry args={[1.65, 0.82]} />
                <meshBasicMaterial map={skillTextures[idx]} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 0, -0.08]} rotation={[0, Math.PI, 0]}>
                <planeGeometry args={[1.65, 0.82]} />
                <meshBasicMaterial map={skillTextures[idx]} side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

/**
 * LOCATION 3: PROJECTS — Futuristic Showroom with separate floating project displays.
 */
function ProjectShowroom({ color, isNearby, onSelect }) {
  const displaysRef = useRef([]);

  const displayTextures = useMemo(
    () =>
      PROJECTS_DATA.map((proj) =>
        createProjectDisplayTexture(
          proj.name,
          proj.technology.slice(0, 3).join(' · '),
          proj.accent || color
        )
      ),
    [color]
  );

  useEffect(() => {
    return () => {
      displayTextures.forEach((tex) => tex.dispose());
    };
  }, [displayTextures]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    displaysRef.current.forEach((el, idx) => {
      if (!el) return;
      el.position.y = 3.4 + Math.sin(t * 1.4 + idx * 1.3) * 0.22;
    });
  });

  const displayOffsets = [
    { pos: [-3.2, 3.4, 2.4], rotY: 0.38 },
    { pos: [0, 3.8, 3.0], rotY: 0 },
    { pos: [3.2, 3.4, 2.4], rotY: -0.38 },
  ];

  return (
    <group>
      {/* Showroom Canopy Arch */}
      <mesh position={[-2.2, 2.7, -0.6]} castShadow>
        <boxGeometry args={[0.55, 5.0, 1.4]} />
        <meshStandardMaterial color="#111930" metalness={0.82} roughness={0.24} />
      </mesh>
      <mesh position={[2.2, 2.7, -0.6]} castShadow>
        <boxGeometry args={[0.55, 5.0, 1.4]} />
        <meshStandardMaterial color="#111930" metalness={0.82} roughness={0.24} />
      </mesh>
      <mesh position={[0, 5.3, -0.4]} castShadow>
        <boxGeometry args={[5.8, 0.45, 2.2]} />
        <meshStandardMaterial color="#172038" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0, 5.58, -0.4]}>
        <boxGeometry args={[5.9, 0.12, 2.3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isNearby ? 2.5 : 1.5}
        />
      </mesh>

      {/* 3 Separate Floating Project Showroom Displays */}
      {PROJECTS_DATA.slice(0, 3).map((proj, idx) => {
        const slot = displayOffsets[idx];
        return (
          <group
            key={proj.id}
            ref={(el) => {
              displaysRef.current[idx] = el;
            }}
            position={slot.pos}
            rotation={[0, slot.rotY, 0]}
            onClick={(e) => {
              e.stopPropagation();
              audioEngine.playInteract();
              onSelect('projects');
            }}
          >
            {/* Glowing Pedestal Projector Node */}
            <mesh position={[0, -2.0, 0]}>
              <cylinderGeometry args={[0.35, 0.55, 0.4, 12]} />
              <meshStandardMaterial
                color={proj.accent || color}
                emissive={proj.accent || color}
                emissiveIntensity={1.6}
              />
            </mesh>
            {/* Floating Display Panel */}
            <mesh>
              <planeGeometry args={[2.55, 1.48]} />
              <meshBasicMaterial map={displayTextures[idx]} transparent opacity={0.96} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * LOCATION 4: EXPERIENCE — Futuristic stepped ascending Timeline Building.
 */
function ExperienceBuilding({ color, isNearby }) {
  const pulseRef = useRef(null);
  useFrame((state) => {
    if (!pulseRef.current) return;
    pulseRef.current.rotation.y = state.clock.elapsedTime * 0.6;
  });

  const pillars = [
    { x: -1.9, h: 2.4, z: 0.4 },
    { x: -0.65, h: 3.6, z: 0.1 },
    { x: 0.65, h: 4.8, z: -0.2 },
    { x: 1.9, h: 6.0, z: -0.5 },
  ];

  return (
    <group>
      {pillars.map((bar, idx) => (
        <group key={idx} position={[bar.x, 0, bar.z]}>
          <mesh position={[0, bar.h / 2 + 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.95, bar.h, 1.2]} />
            <meshStandardMaterial color="#111a31" metalness={0.82} roughness={0.25} />
          </mesh>
          <mesh position={[0, bar.h + 0.46, 0]}>
            <boxGeometry args={[1.05, 0.14, 1.3]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={isNearby ? 2.4 : 1.4}
            />
          </mesh>
        </group>
      ))}
      <mesh ref={pulseRef} position={[0, 5.6, 0.9]}>
        <torusGeometry args={[1.4, 0.06, 8, 32]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.8} />
      </mesh>
    </group>
  );
}

/**
 * LOCATION 5: ACHIEVEMENTS — Futuristic Trophy Spire & Orbiting Milestone Rings.
 */
function AchievementsMonument({ color, isNearby }) {
  const ringsRef = useRef(null);
  useFrame((state) => {
    if (!ringsRef.current) return;
    const t = state.clock.elapsedTime;
    ringsRef.current.rotation.y = t * 0.75;
    ringsRef.current.rotation.z = Math.sin(t * 0.9) * 0.22;
  });

  return (
    <group>
      {/* Monumental Faceted Obelisk */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.75, 1.65, 4.2, 6]} />
        <meshStandardMaterial color="#12182b" metalness={0.85} roughness={0.22} />
      </mesh>
      {/* Floating Trophy Core */}
      <group ref={ringsRef} position={[0, 5.4, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.95, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isNearby ? 2.8 : 1.6}
            metalness={0.4}
            roughness={0.15}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.65, 0.065, 10, 32]} />
          <meshStandardMaterial color="#fde047" emissive="#f59e0b" emissiveIntensity={1.8} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.95, 0.05, 10, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.4} />
        </mesh>
      </group>
      {/* 4 Mini Trophy Pedestals */}
      {[-2.2, 2.2].map((px) =>
        [-1.6, 1.6].map((pz) => (
          <mesh key={`${px}-${pz}`} position={[px, 1.0, pz]}>
            <cylinderGeometry args={[0.25, 0.35, 1.3, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
          </mesh>
        ))
      )}
    </group>
  );
}

/**
 * LOCATION 6: CONTACT — Futuristic Communication Relay Station with Rotating Signal Dish.
 */
function ContactStation({ color, isNearby }) {
  const dishRef = useRef(null);
  useFrame((state) => {
    if (!dishRef.current) return;
    dishRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.65;
  });

  return (
    <group>
      {/* Station Core */}
      <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.9, 3.8, 8]} />
        <meshStandardMaterial color="#0e172c" metalness={0.82} roughness={0.24} />
      </mesh>
      {/* Signal Mast */}
      <mesh position={[0, 4.9, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.32, 2.6, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Rotating Radar Dish & Transmission Beacon */}
      <group ref={dishRef} position={[0, 4.8, 0.5]} rotation={[-0.45, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[1.45, 0.35, 0.55, 18, 1, true]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive={color}
            emissiveIntensity={0.45}
            metalness={0.85}
            roughness={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.26, 14, 14]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={isNearby ? 3.2 : 2.0}
          />
        </mesh>
      </group>
      {/* Signal Ring */}
      <mesh position={[0, 6.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.05, 8, 28]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} />
      </mesh>
    </group>
  );
}

/**
 * Renders the appropriate bespoke 3D architecture for each of the 6 portfolio locations.
 */
export function PortfolioLocation({ zone, isNearby, onSelect }) {
  const signY = zone.id === 'skills' ? 8.4 : zone.id === 'projects' ? 7.8 : 8.2;

  return (
    <LocationShell zone={zone} isNearby={isNearby} onSelect={onSelect} signY={signY}>
      {zone.id === 'about' && <AboutBuilding color={zone.color} isNearby={isNearby} />}
      {zone.id === 'skills' && <SkillsTower color={zone.color} isNearby={isNearby} />}
      {zone.id === 'projects' && (
        <ProjectShowroom color={zone.color} isNearby={isNearby} onSelect={onSelect} />
      )}
      {zone.id === 'experience' && <ExperienceBuilding color={zone.color} isNearby={isNearby} />}
      {zone.id === 'achievements' && <AchievementsMonument color={zone.color} isNearby={isNearby} />}
      {zone.id === 'contact' && <ContactStation color={zone.color} isNearby={isNearby} />}
    </LocationShell>
  );
}
