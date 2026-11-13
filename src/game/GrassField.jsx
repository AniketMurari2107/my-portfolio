import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateGrassTufts } from './worldGrass.js';
import { getWeatherConfig } from './weatherConfig.js';
import { useGameStore } from '../store/gameStore.js';

const MAX_GRASS_TUFTS = 8500;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

/**
 * Builds a single lush 3-blade curved grass tuft BufferGeometry (rooted at y = 0).
 * Each blade tapers smoothly to a point and carries uv.y in [0..1] for root-to-tip
 * ambient occlusion and quadratic GPU wind bend.
 */
function createGrassTuftGeometry() {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const bladeCount = 3;
  const segments = 2;
  const bladeHeight = 0.58;
  const baseHalfWidth = 0.065;

  let vertOffset = 0;

  for (let b = 0; b < bladeCount; b += 1) {
    const yaw = (b / bladeCount) * Math.PI * 2 + 0.35;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const lean = 0.14 + (b % 2) * 0.06;
    const offsetR = 0.04;

    for (let s = 0; s <= segments; s += 1) {
      const t = s / segments;
      const y = t * bladeHeight;
      const curveOut = t * t * lean + offsetR;
      const halfW = baseHalfWidth * (1 - t * 0.92);

      // Local blade tangent along +Z rotated by yaw, width along +X rotated by yaw
      const cx = sinY * curveOut;
      const cz = cosY * curveOut;
      const wx = cosY * halfW;
      const wz = -sinY * halfW;

      // Left and right vertices of segment row
      positions.push(cx - wx, y, cz - wz);
      positions.push(cx + wx, y, cz + wz);

      // Soft upward-tilted outward normal for natural diffuse grass shading
      const nx = sinY * 0.55;
      const ny = 0.82;
      const nz = cosY * 0.55;
      normals.push(nx, ny, nz, nx, ny, nz);

      uvs.push(0, t, 1, t);

      if (s < segments) {
        const row0 = vertOffset + s * 2;
        const row1 = row0 + 2;
        indices.push(row0, row0 + 1, row1);
        indices.push(row0 + 1, row1 + 1, row1);
      }
    }

    vertOffset += (segments + 1) * 2;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  return geom;
}

/**
 * Instanced realistic meadow grass field across open park basins & tree groves.
 * Uses GPU vertex wind waves and root-to-tip shading with zero per-frame JS matrix updates.
 */
export function GrassField({ grassCount = 8500 }) {
  const weather = useGameStore((s) => s.weather);
  const meshRef = useRef(null);

  const tufts = useMemo(() => generateGrassTufts(MAX_GRASS_TUFTS), []);

  const windUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWindStrength: { value: 1.0 },
    }),
    []
  );

  const { geometry, material } = useMemo(() => {
    const geom = createGrassTuftGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.78,
      metalness: 0.04,
      envMapIntensity: 0.26,
      side: THREE.DoubleSide,
    });

    mat.customProgramCacheKey = () => 'realistic-grass-wind-v1';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.uniforms.uWindStrength = windUniforms.uWindStrength;

      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uWindStrength;
        varying float vGrassHeight;
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vGrassHeight = uv.y;
        float worldX = 0.0;
        float worldZ = 0.0;
        #ifdef USE_INSTANCING
          worldX = instanceMatrix[3][0];
          worldZ = instanceMatrix[3][2];
        #endif
        float bend = uv.y * uv.y;
        float wave = sin(uTime * 1.9 + worldX * 0.22 + worldZ * 0.17)
                   + 0.45 * cos(uTime * 3.1 + worldX * 0.45 - worldZ * 0.3);
        transformed.x += wave * 0.095 * bend * uWindStrength;
        transformed.z += cos(uTime * 1.6 + worldZ * 0.24) * 0.065 * bend * uWindStrength;
        `
      );

      shader.fragmentShader =
        `
        varying float vGrassHeight;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        // Natural root-to-tip ambient occlusion so bases blend into dark terrain
        diffuseColor.rgb *= mix(0.38, 1.18, vGrassHeight);
        `
      );
    };
    mat.needsUpdate = true;

    return { geometry: geom, material: mat };
  }, [windUniforms]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Populate instance matrices and botanical color variations once
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < tufts.length; i += 1) {
      const tuft = tufts[i];
      _dummy.position.set(tuft.x, 0.012, tuft.z);
      _dummy.rotation.set(0, tuft.rotationY, 0);
      _dummy.scale.set(tuft.scaleXZ, tuft.scaleY, tuft.scaleXZ);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);
      _color.set(tuft.color);
      meshRef.current.setColorAt(i, _color);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
    meshRef.current.computeBoundingSphere();
  }, [tufts]);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.count = Math.min(tufts.length, Math.max(0, grassCount));
  }, [grassCount, tufts.length]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const wCfg = getWeatherConfig(weather);
    windUniforms.uTime.value = state.clock.elapsedTime;
    windUniforms.uWindStrength.value = THREE.MathUtils.damp(
      windUniforms.uWindStrength.value,
      wCfg.windStrength,
      2.5,
      dt
    );
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_GRASS_TUFTS]}
      receiveShadow
      frustumCulled={false}
    />
  );
}
