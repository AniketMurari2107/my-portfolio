import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWeatherConfig } from './weatherConfig.js';
import { computeTimeOfDayState } from './timeOfDay.js';
import {
  createMoonTexture,
  createSkyCloudTexture,
  createSunTexture,
} from './proceduralAssets.js';
import { carLiveState, useGameStore } from '../store/gameStore.js';

const SKY_RADIUS = 224;
const STAR_RADIUS = 212;
const SUN_DIST = 190;
const MOON_DIST = 192;

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uCloudMap;
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uFogColor;
  uniform vec3 uCloudColor;
  uniform vec3 uCloudLitColor;
  uniform vec3 uSunGlowColor;
  uniform vec3 uSunDir;
  uniform vec3 uMoonDir;
  uniform float uCloudCoverage;
  uniform float uStarVisibility;
  uniform float uSunVisibility;
  uniform float uMoonVisibility;

  varying vec3 vWorldDir;

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, -0.15, 1.0);
    float posH = max(h, 0.0);

    // 1. Atmospheric zenith-to-horizon scattering gradient
    vec3 sky = mix(uHorizonColor, uZenithColor, pow(posH, 0.56));

    // 2. Solar Mie forward scattering & golden-hour horizon bloom
    float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
    float sunHorizonScatter = exp(-posH * 7.5) * (0.35 + 0.65 * pow(sunDot, 2.0));
    float sunHalo = pow(sunDot, 8.0) * 0.24 + pow(sunDot, 48.0) * 0.42;
    sky += uSunGlowColor * (sunHorizonScatter * 0.42 + sunHalo) * (0.2 + 0.8 * uSunVisibility);

    // 3. Subtle Milky Way galactic band across the clear night sky
    vec3 galaxyAxis = normalize(vec3(0.55, 0.38, -0.74));
    float band = exp(-pow(dot(dir, galaxyAxis) * 3.2, 2.0));
    float dust = texture2D(uCloudMap, dir.xz * 0.42 + vec2(0.17, 0.63)).r;
    sky += vec3(0.05, 0.085, 0.17) * band * smoothstep(0.18, 0.78, dust) * uStarVisibility * smoothstep(0.05, 0.45, posH);

    // 4. Directional lunar atmospheric scattering halo
    float moonDot = max(dot(dir, normalize(uMoonDir)), 0.0);
    float moonHalo = pow(moonDot, 10.0) * 0.16 + pow(moonDot, 64.0) * 0.28;
    sky += vec3(0.46, 0.70, 1.0) * moonHalo * uMoonVisibility;

    // 5. Perspective-foreshortened dual-layer cloud deck lit by active sun/moon
    if (h > 0.005) {
      vec2 cloudUV = dir.xz / (posH + 0.16);
      vec2 driftA = cloudUV * 0.14 + vec2(uTime * 0.0035, uTime * 0.0018);
      vec2 driftB = cloudUV * 0.26 - vec2(uTime * 0.0052, -uTime * 0.0028);

      float nA = texture2D(uCloudMap, driftA).r;
      float nB = texture2D(uCloudMap, driftB).r;
      float cloudField = nA * 0.66 + nB * 0.34;

      float thresh = mix(0.62, 0.16, clamp(uCloudCoverage, 0.0, 1.0));
      float cloudAlpha = smoothstep(thresh, thresh + 0.34, cloudField);
      cloudAlpha *= smoothstep(0.005, 0.22, posH);

      vec2 activeBodyXZ = normalize(uSunVisibility >= uMoonVisibility ? uSunDir : uMoonDir).xz;
      float activeDot = uSunVisibility >= uMoonVisibility ? sunDot : moonDot;
      float litSample = texture2D(uCloudMap, driftA - activeBodyXZ * 0.045).r;
      float silverRim = smoothstep(0.24, 0.72, litSample) * (0.45 + 0.55 * pow(activeDot, 3.0));
      vec3 cloudShade = mix(uCloudColor, uCloudLitColor, clamp(silverRim, 0.0, 1.0));

      sky = mix(sky, cloudShade, cloudAlpha * (0.64 + 0.3 * uCloudCoverage));
    }

    // 6. Seamless horizon blend into scene fog color
    float fogBlend = smoothstep(0.11, -0.02, h);
    sky = mix(sky, uFogColor, fogBlend);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

const STAR_VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vElevation;

  void main() {
    vColor = aColor;
    vElevation = normalize(position).y;
    float twinkle = 0.72 + 0.28 * sin(uTime * (1.4 + mod(aPhase, 2.2)) + aPhase * 6.2831);
    vTwinkle = twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (185.0 / max(1.0, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
  uniform float uStarVisibility;

  varying vec3 vColor;
  varying float vTwinkle;
  varying float vElevation;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float dist = length(centered);
    if (dist > 0.5) discard;

    float core = smoothstep(0.5, 0.04, dist);
    float halo = pow(core, 1.8);
    float horizonFade = smoothstep(0.04, 0.26, vElevation);
    float alpha = halo * vTwinkle * horizonFade * uStarVisibility;

    gl_FragColor = vec4(vColor * (0.85 + 0.35 * core), alpha);
  }
`;

/**
 * Realistic, cinematic sky dome driven by continuous Time-of-Day & Weather:
 * - Rotating Sun & Moon discs with solar/lunar atmospheric scattering
 * - Continuous dawn, day, dusk, and starlit night gradient + cloud illumination
 * - Scintillating multi-magnitude starfield rotating gently with the night sky
 */
export function CinematicSky({ starCount = 750 }) {
  const { camera, gl } = useThree();
  const weather = useGameStore((s) => s.weather);

  const rigRef = useRef(null);
  const sunMeshRef = useRef(null);
  const sunMatRef = useRef(null);
  const moonMeshRef = useRef(null);
  const moonMatRef = useRef(null);

  const sunTexture = useMemo(() => createSunTexture(), []);
  const moonTexture = useMemo(() => createMoonTexture(), []);
  const cloudTexture = useMemo(() => createSkyCloudTexture(), []);

  const todStateRef = useMemo(() => computeTimeOfDayState(carLiveState.timeOfDay), []);

  const skyMaterial = useMemo(() => {
    const initialWeather = getWeatherConfig('clear');
    const initialTod = computeTimeOfDayState(carLiveState.timeOfDay, initialWeather);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCloudMap: { value: cloudTexture },
        uZenithColor: { value: initialTod.zenithColor.clone() },
        uHorizonColor: { value: initialTod.horizonColor.clone() },
        uFogColor: { value: initialTod.fogColor.clone() },
        uCloudColor: { value: initialTod.cloudColor.clone() },
        uCloudLitColor: { value: initialTod.cloudLitColor.clone() },
        uSunGlowColor: { value: initialTod.sunGlowColor.clone() },
        uSunDir: { value: initialTod.sunDir.clone() },
        uMoonDir: { value: initialTod.moonDir.clone() },
        uCloudCoverage: { value: initialWeather.cloudCoverage },
        uStarVisibility: { value: initialTod.starVisibility },
        uSunVisibility: { value: initialTod.sunVisibility },
        uMoonVisibility: { value: initialTod.moonVisibility },
      },
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
  }, [cloudTexture]);

  const { starGeometry, starMaterial } = useMemo(() => {
    const count = Math.max(250, Math.min(900, starCount));
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#f8fafc'),
      new THREE.Color('#dbeafe'),
      new THREE.Color('#bae6fd'),
      new THREE.Color('#fef3c7'),
    ];
    const tmp = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const phi = Math.acos(1 - t * 0.94);
      const theta = i * 2.39996323;

      tmp.set(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      );
      tmp.normalize().multiplyScalar(STAR_RADIUS);

      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      sizes[i] = i % 17 === 0 ? 3.4 : i % 5 === 0 ? 2.2 : 1.4;
      phases[i] = ((i * 37.7) % 100) / 100;

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(2, gl.getPixelRatio() || 1) },
        uStarVisibility: { value: 1.0 },
      },
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    return { starGeometry: geom, starMaterial: mat };
  }, [gl, starCount]);

  useEffect(() => {
    return () => {
      skyMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, [skyMaterial, starGeometry, starMaterial]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const cfg = getWeatherConfig(weather);
    const tod = computeTimeOfDayState(carLiveState.timeOfDay, cfg, todStateRef);
    const blend = 1 - Math.exp(-3.5 * dt);

    if (rigRef.current) {
      rigRef.current.position.set(camera.position.x, 0, camera.position.z);
    }

    // Rotate Sun & Moon discs across the sky dome
    if (sunMeshRef.current && sunMatRef.current) {
      sunMeshRef.current.position.set(
        tod.sunDir.x * SUN_DIST,
        tod.sunDir.y * SUN_DIST,
        tod.sunDir.z * SUN_DIST
      );
      sunMeshRef.current.lookAt(camera.position);
      sunMeshRef.current.visible = tod.sunVisibility > 0.01;
      sunMatRef.current.opacity = tod.sunVisibility;
    }

    if (moonMeshRef.current && moonMatRef.current) {
      moonMeshRef.current.position.set(
        tod.moonDir.x * MOON_DIST,
        tod.moonDir.y * MOON_DIST,
        tod.moonDir.z * MOON_DIST
      );
      moonMeshRef.current.lookAt(camera.position);
      moonMeshRef.current.visible = tod.moonVisibility > 0.01;
      moonMatRef.current.opacity = 0.94 * tod.moonVisibility;
    }

    const u = skyMaterial.uniforms;
    u.uTime.value = t;
    u.uSunDir.value.copy(tod.sunDir);
    u.uMoonDir.value.copy(tod.moonDir);

    u.uZenithColor.value.lerp(tod.zenithColor, blend);
    u.uHorizonColor.value.lerp(tod.horizonColor, blend);
    u.uFogColor.value.lerp(tod.fogColor, blend);
    u.uCloudColor.value.lerp(tod.cloudColor, blend);
    u.uCloudLitColor.value.lerp(tod.cloudLitColor, blend);
    u.uSunGlowColor.value.lerp(tod.sunGlowColor, blend);

    u.uCloudCoverage.value = THREE.MathUtils.damp(u.uCloudCoverage.value, cfg.cloudCoverage, 2.8, dt);
    u.uStarVisibility.value = THREE.MathUtils.damp(u.uStarVisibility.value, tod.starVisibility, 3.2, dt);
    u.uSunVisibility.value = THREE.MathUtils.damp(u.uSunVisibility.value, tod.sunVisibility, 4.0, dt);
    u.uMoonVisibility.value = THREE.MathUtils.damp(u.uMoonVisibility.value, tod.moonVisibility, 4.0, dt);

    starMaterial.uniforms.uTime.value = t;
    starMaterial.uniforms.uStarVisibility.value = u.uStarVisibility.value;
  });

  return (
    <group ref={rigRef} name="CinematicSkyRig">
      {/* Procedural Atmospheric & Volumetric-Cloud Sky Dome */}
      <mesh material={skyMaterial} renderOrder={-20} frustumCulled={false}>
        <sphereGeometry args={[SKY_RADIUS, 28, 18]} />
      </mesh>

      {/* Multi-Magnitude Scintillating Starfield */}
      <points
        geometry={starGeometry}
        material={starMaterial}
        renderOrder={-18}
        frustumCulled={false}
      />

      {/* Rotating Solar Disc + Golden Atmospheric Corona */}
      <mesh ref={sunMeshRef} renderOrder={-17} frustumCulled={false}>
        <planeGeometry args={[34, 34]} />
        <meshBasicMaterial
          ref={sunMatRef}
          map={sunTexture}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Rotating Cratered Lunar Disc + Atmospheric Corona */}
      <mesh ref={moonMeshRef} renderOrder={-16} frustumCulled={false}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial
          ref={moonMatRef}
          map={moonTexture}
          transparent
          opacity={0.94}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}
