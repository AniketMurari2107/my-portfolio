import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderCollider, RigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { generateTreePlacements } from './worldTrees.js';
import { getWeatherConfig } from './weatherConfig.js';
import {
  createBarkTextures,
  createContactShadowTexture,
  createFoliageBumpTexture,
} from './proceduralAssets.js';
import { carLiveState, useGameStore } from '../store/gameStore.js';

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Normalizes a geometry before mergeGeometries so every sub-part shares identical attributes.
 */
function preparePart(geo) {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  if (!nonIndexed.attributes.normal) {
    nonIndexed.computeVertexNormals();
  }
  if (!nonIndexed.attributes.uv) {
    const count = nonIndexed.attributes.position.count;
    nonIndexed.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  return nonIndexed;
}

/**
 * Builds an organic, root-flared, slightly curved tree trunk with 3 root buttresses.
 */
function createOrganicTrunkGeometry() {
  const parts = [];
  const profile = [
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.42, 0.35),
    new THREE.Vector2(0.32, 0.9),
    new THREE.Vector2(0.27, 1.85),
    new THREE.Vector2(0.21, 2.85),
    new THREE.Vector2(0.14, 3.75),
    new THREE.Vector2(0.06, 4.45),
  ];
  const mainTrunk = new THREE.LatheGeometry(profile, 10);
  const pos = mainTrunk.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Subtle organic trunk curve & root fluting near base
    const bendX = Math.sin(y * 0.55) * 0.08 * (y / 4.45);
    const bendZ = Math.cos(y * 0.42) * 0.06 * (y / 4.45);
    const angle = Math.atan2(z, x);
    const rootFlute = y < 0.7 ? 1 + Math.sin(angle * 4.0) * 0.14 * (1 - y / 0.7) : 1;
    pos.setXYZ(i, x * rootFlute + bendX, y, z * rootFlute + bendZ);
  }
  mainTrunk.computeVertexNormals();
  parts.push(preparePart(mainTrunk));

  // Add 3 tapered root spurs anchoring the trunk into terrain
  for (let r = 0; r < 3; r += 1) {
    const ang = r * ((Math.PI * 2) / 3) + 0.35;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(ang) * 0.24, 0.65, Math.sin(ang) * 0.24),
      new THREE.Vector3(Math.cos(ang) * 0.52, 0.24, Math.sin(ang) * 0.52),
      new THREE.Vector3(Math.cos(ang) * 0.78, 0.02, Math.sin(ang) * 0.78),
    ]);
    const rootGeo = new THREE.TubeGeometry(curve, 5, 0.11, 6, false);
    parts.push(preparePart(rootGeo));
  }

  return BufferGeometryUtils.mergeGeometries(parts, false);
}

/**
 * Builds a multi-limb gnarled branch network radiating organically from mid-to-upper trunk.
 */
function createBranchNetworkGeometry() {
  const parts = [];
  const limbDefs = [
    { h: 2.2, ang: 0.3, reach: 1.85, lift: 1.2, radius: 0.11 },
    { h: 2.55, ang: 1.85, reach: 1.9, lift: 1.25, radius: 0.105 },
    { h: 2.9, ang: 3.4, reach: 1.75, lift: 1.35, radius: 0.095 },
    { h: 3.25, ang: 4.95, reach: 1.55, lift: 1.3, radius: 0.085 },
  ];

  limbDefs.forEach((b, idx) => {
    const c = Math.cos(b.ang);
    const s = Math.sin(b.ang);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(c * 0.12, b.h, s * 0.12),
      new THREE.Vector3(c * b.reach * 0.52, b.h + b.lift * 0.42, s * b.reach * 0.52),
      new THREE.Vector3(c * b.reach, b.h + b.lift, s * b.reach),
    ]);
    parts.push(preparePart(new THREE.TubeGeometry(curve, 5, b.radius, 5, false)));

    if (idx < 3) {
      const forkAng = b.ang + (idx % 2 === 0 ? 0.55 : -0.55);
      const forkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(c * b.reach * 0.55, b.h + b.lift * 0.45, s * b.reach * 0.55),
        new THREE.Vector3(
          Math.cos(forkAng) * b.reach * 0.95,
          b.h + b.lift * 0.9,
          Math.sin(forkAng) * b.reach * 0.95
        ),
      ]);
      parts.push(preparePart(new THREE.TubeGeometry(forkCurve, 3, b.radius * 0.62, 4, false)));
    }
  });

  return BufferGeometryUtils.mergeGeometries(parts, false);
}

/**
 * Creates organically perturbed foliage lobes merged into a lush, irregular natural canopy tier.
 */
function createOrganicFoliageTierGeometry(tier) {
  const clusters =
    tier === 'lower'
      ? [
          [1.42, 3.18, 0.28, 1.3, 0.88, 1.22],
          [-1.32, 3.25, -0.35, 1.25, 0.85, 1.18],
          [0.32, 3.3, 1.38, 1.22, 0.86, 1.26],
          [-0.42, 3.12, -1.38, 1.22, 0.84, 1.2],
          [0.0, 3.72, 0.0, 1.42, 0.98, 1.42],
        ]
      : tier === 'mid'
        ? [
            [0.92, 4.48, 0.42, 1.15, 0.92, 1.12],
            [-0.9, 4.56, -0.38, 1.12, 0.9, 1.1],
            [-0.32, 4.62, 0.95, 1.08, 0.9, 1.08],
            [0.4, 4.52, -0.92, 1.06, 0.9, 1.08],
            [0.0, 4.9, 0.0, 1.28, 1.04, 1.28],
          ]
        : [
            [0.42, 5.68, 0.32, 0.86, 0.88, 0.86],
            [-0.44, 5.78, -0.26, 0.84, 0.86, 0.84],
            [0.12, 5.98, -0.42, 0.8, 0.84, 0.8],
            [0.0, 6.38, 0.0, 0.92, 1.08, 0.92],
          ];

  const parts = clusters.map(([cx, cy, cz, sx, sy, sz], idx) => {
    const lobe = new THREE.IcosahedronGeometry(1.0, 1);
    const pos = lobe.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      // Organic botanical leaf-tuft perturbation
      const ripple =
        1.0 +
        0.18 * Math.sin(vx * 3.1 + idx) * Math.cos(vz * 2.9 - idx) +
        0.12 * Math.sin(vy * 3.7 + vx * 2.1);
      pos.setXYZ(i, vx * sx * ripple + cx, vy * sy * ripple + cy, vz * sz * ripple + cz);
    }
    lobe.computeVertexNormals();
    return preparePart(lobe);
  });

  return BufferGeometryUtils.mergeGeometries(parts, false);
}

/**
 * Patches MeshStandardMaterial with GPU vertex-shader wind sway keyed per tree instance.
 */
function attachWindSwayShader(material, windUniforms, swayMultiplier = 1.0) {
  material.customProgramCacheKey = () => `realistic-tree-wind-${swayMultiplier.toFixed(2)}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.uniforms.uSwayMult = { value: swayMultiplier };

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uWindStrength;
      uniform float uSwayMult;
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float treePhase = 0.0;
      #ifdef USE_INSTANCING
        treePhase = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.53;
      #endif
      float heightFactor = max(0.0, transformed.y - 1.4);
      float gust = sin(uTime * 1.45 + treePhase + transformed.y * 0.45)
                 + 0.42 * sin(uTime * 2.85 + treePhase * 1.7 + transformed.x * 0.8);
      transformed.x += gust * 0.052 * heightFactor * uWindStrength * uSwayMult;
      transformed.z += cos(uTime * 1.2 + treePhase * 0.9) * 0.036 * heightFactor * uWindStrength * uSwayMult;
      `
    );
  };
  material.needsUpdate = true;
}

/**
 * Realistic, cinematic procedural 3D trees with:
 * - Root-flared curved bark trunks + multi-limb gnarled branching
 * - 3 sculpted organic foliage crown layers with botanical color variation & leaf micro-relief
 * - GPU vertex-shader wind sway responding dynamically to weather (Calm, Breezy, Storm)
 * - Grounded root contact shadows & subtle nocturnal forest fireflies
 * - Rapier CylinderCollider trunks for solid inner/mid grove collisions
 */
export function RealisticTrees({ maxAnisotropy = 4 }) {
  const weather = useGameStore((s) => s.weather);

  const trunkRef = useRef(null);
  const branchRef = useRef(null);
  const lowerCanopyRef = useRef(null);
  const midCanopyRef = useRef(null);
  const upperCanopyRef = useRef(null);
  const shadowDiscRef = useRef(null);
  const fireflyRef = useRef(null);
  const fireflyMatRef = useRef(null);

  const treePlacements = useMemo(() => generateTreePlacements(), []);
  const treeCount = treePlacements.length;
  const collidableTrees = useMemo(
    () => treePlacements.filter((t) => t.hasCollider),
    [treePlacements]
  );

  const windUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindStrength: { value: 1.0 },
    }),
    []
  );

  const {
    trunkGeo,
    branchGeo,
    lowerGeo,
    midGeo,
    upperGeo,
    barkMat,
    lowerMat,
    midMat,
    upperMat,
    contactShadowTex,
  } = useMemo(() => {
    const { map: barkMap, bumpMap: barkBump } = createBarkTextures(maxAnisotropy);
    const foliageBump = createFoliageBumpTexture(maxAnisotropy);
    const shadowTex = createContactShadowTexture();

    const bMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      map: barkMap,
      bumpMap: barkBump,
      bumpScale: 0.08,
      roughness: 0.92,
      metalness: 0.02,
      envMapIntensity: 0.25,
    });

    const lMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      bumpMap: foliageBump,
      bumpScale: 0.06,
      roughness: 0.84,
      metalness: 0.03,
      envMapIntensity: 0.3,
    });
    attachWindSwayShader(lMat, windUniforms, 0.72);

    const mMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      bumpMap: foliageBump,
      bumpScale: 0.06,
      roughness: 0.78,
      metalness: 0.04,
      envMapIntensity: 0.35,
    });
    attachWindSwayShader(mMat, windUniforms, 1.0);

    const uMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      bumpMap: foliageBump,
      bumpScale: 0.05,
      roughness: 0.72,
      metalness: 0.05,
      envMapIntensity: 0.4,
    });
    attachWindSwayShader(uMat, windUniforms, 1.25);

    return {
      trunkGeo: createOrganicTrunkGeometry(),
      branchGeo: createBranchNetworkGeometry(),
      lowerGeo: createOrganicFoliageTierGeometry('lower'),
      midGeo: createOrganicFoliageTierGeometry('mid'),
      upperGeo: createOrganicFoliageTierGeometry('upper'),
      barkMat: bMat,
      lowerMat: lMat,
      midMat: mMat,
      upperMat: uMat,
      contactShadowTex: shadowTex,
    };
  }, [maxAnisotropy, windUniforms]);

  useEffect(() => {
    return () => {
      trunkGeo.dispose();
      branchGeo.dispose();
      lowerGeo.dispose();
      midGeo.dispose();
      upperGeo.dispose();
      barkMat.dispose();
      lowerMat.dispose();
      midMat.dispose();
      upperMat.dispose();
      contactShadowTex.dispose();
    };
  }, [trunkGeo, branchGeo, lowerGeo, midGeo, upperGeo, barkMat, lowerMat, midMat, upperMat, contactShadowTex]);

  // Populate tree instance transforms & botanical color variations once
  useEffect(() => {
    if (
      !trunkRef.current ||
      !branchRef.current ||
      !lowerCanopyRef.current ||
      !midCanopyRef.current ||
      !upperCanopyRef.current ||
      !shadowDiscRef.current
    ) {
      return;
    }

    for (let i = 0; i < treeCount; i += 1) {
      const tree = treePlacements[i];
      const ws = tree.widthScale || tree.scale;
      const hs = tree.heightScale || tree.scale;

      _dummy.position.set(tree.x, 0, tree.z);
      _dummy.rotation.set(tree.leanX, tree.rotationY, tree.leanZ);
      _dummy.scale.set(ws, hs, ws);
      _dummy.updateMatrix();

      trunkRef.current.setMatrixAt(i, _dummy.matrix);
      branchRef.current.setMatrixAt(i, _dummy.matrix);
      lowerCanopyRef.current.setMatrixAt(i, _dummy.matrix);
      midCanopyRef.current.setMatrixAt(i, _dummy.matrix);
      upperCanopyRef.current.setMatrixAt(i, _dummy.matrix);

      _color.set(tree.foliage);
      lowerCanopyRef.current.setColorAt(i, _color);
      _color.set(tree.crown);
      midCanopyRef.current.setColorAt(i, _color);
      _color.set(tree.tips);
      upperCanopyRef.current.setColorAt(i, _color);

      // Soft root-grounding shadow disc flush at y = 0.022
      _dummy.position.set(tree.x, 0.022, tree.z);
      _dummy.rotation.set(-Math.PI / 2, 0, tree.rotationY);
      _dummy.scale.set(ws * 4.8, ws * 4.8, 1);
      _dummy.updateMatrix();
      shadowDiscRef.current.setMatrixAt(i, _dummy.matrix);
    }

    [trunkRef.current, branchRef.current, lowerCanopyRef.current, midCanopyRef.current, upperCanopyRef.current, shadowDiscRef.current].forEach(
      (mesh) => {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    );

    // Subtle forest fireflies near inner/mid groves
    if (fireflyRef.current) {
      for (let i = 0; i < treeCount; i += 1) {
        const tree = treePlacements[i];
        const ang = i * 2.1;
        _dummy.position.set(
          tree.x + Math.cos(ang) * 1.9 * tree.scale,
          2.2 + (i % 4) * 0.75,
          tree.z + Math.sin(ang) * 1.9 * tree.scale
        );
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.setScalar(0.055 + (i % 3) * 0.015);
        _dummy.updateMatrix();
        fireflyRef.current.setMatrixAt(i, _dummy.matrix);
        _color.set(tree.firefly || '#5eead4');
        fireflyRef.current.setColorAt(i, _color);
      }
      fireflyRef.current.instanceMatrix.needsUpdate = true;
      if (fireflyRef.current.instanceColor) fireflyRef.current.instanceColor.needsUpdate = true;
      fireflyRef.current.computeBoundingSphere();
    }
  }, [treeCount, treePlacements]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const wCfg = getWeatherConfig(weather);

    windUniforms.uTime.value = t;
    windUniforms.uWindStrength.value = THREE.MathUtils.damp(
      windUniforms.uWindStrength.value,
      wCfg.windStrength,
      2.6,
      dt
    );

    if (fireflyRef.current && fireflyMatRef.current) {
      fireflyRef.current.position.y = Math.sin(t * 0.85) * 0.32;
      fireflyRef.current.rotation.y = Math.sin(t * 0.14) * 0.018;
      // Fireflies glow gently at night/dusk/dawn and fade away in bright midday sun
      const tod = carLiveState.timeOfDay;
      const isDaylight = tod > 0.32 && tod < 0.7;
      const targetOpacity = isDaylight ? 0.05 : 0.72 + Math.sin(t * 2.4) * 0.18;
      fireflyMatRef.current.opacity = THREE.MathUtils.damp(
        fireflyMatRef.current.opacity,
        targetOpacity,
        3.0,
        dt
      );
    }
  });

  return (
    <group name="RealisticCinematicForest">
      {/* Solid Rapier Trunk Colliders for Accessible Grove Trees */}
      {collidableTrees.map((tree) => (
        <RigidBody key={tree.id} type="fixed" position={[tree.x, 0, tree.z]} restitution={0.2}>
          <CylinderCollider args={[2.0, 0.48 * tree.scale]} position={[0, 2.0, 0]} />
        </RigidBody>
      ))}

      {/* Grounded Root Contact Shadows */}
      <instancedMesh
        ref={shadowDiscRef}
        args={[null, null, treeCount]}
        frustumCulled={false}
      >
        <circleGeometry args={[1, 18]} />
        <meshBasicMaterial
          map={contactShadowTex}
          transparent
          opacity={0.58}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Sculpted Bark Trunks & Root Spurs */}
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, barkMat, treeCount]}
        castShadow
        receiveShadow
      />

      {/* Curved Multi-Limb Branch Network */}
      <instancedMesh
        ref={branchRef}
        args={[branchGeo, barkMat, treeCount]}
        castShadow
      />

      {/* 3-Tier Organic Wind-Swaying Botanical Canopy */}
      <instancedMesh
        ref={lowerCanopyRef}
        args={[lowerGeo, lowerMat, treeCount]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={midCanopyRef}
        args={[midGeo, midMat, treeCount]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        ref={upperCanopyRef}
        args={[upperGeo, upperMat, treeCount]}
        castShadow
        receiveShadow
      />

      {/* Subtle Grove Fireflies */}
      <instancedMesh ref={fireflyRef} args={[null, null, treeCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial
          ref={fireflyMatRef}
          color="#ffffff"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
