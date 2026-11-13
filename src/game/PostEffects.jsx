import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { carLiveState } from '../store/gameStore.js';

const RacingColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.07 },
    uSaturation: { value: 1.14 },
    uVignette: { value: 0.24 },
    uBoost: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignette;
    uniform float uBoost;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;

      // Subtle cool-navy shadow tint & crisp electric highlight grading
      vec3 shadows = vec3(0.95, 0.98, 1.06);
      vec3 highlights = vec3(0.98, 1.02, 1.05);
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col *= mix(shadows, highlights, smoothstep(0.08, 0.75, lum));

      // Saturation & contrast polish
      vec3 gray = vec3(lum);
      col = mix(gray, col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      col = max(col, vec3(0.0));

      // Subtle cinematic edge vignette (intensifies gently under Nitro)
      vec2 centered = vUv - 0.5;
      float dist = dot(centered, centered);
      float vig = 1.0 - dist * (uVignette + uBoost * 0.22);
      col *= clamp(vig, 0.55, 1.0);

      gl_FragColor = vec4(col, texel.a);
    }
  `,
};

/**
 * Hardware-accelerated Three.js EffectComposer pipeline:
 * - Screen-Space Ambient Occlusion (SSAOPass on High preset)
 * - HDR-thresholded Neon Bloom (UnrealBloomPass)
 * - Next-gen racing color grading + Nitro vignette (ShaderPass)
 * - ACESFilmic tone mapping + sRGB conversion (OutputPass)
 * Automatically bypassed on software WebGL or Low mobile preset.
 */
export function PostEffects({ preset }) {
  const { gl, scene, camera, size } = useThree();

  const pipeline = useMemo(() => {
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    const composer = new EffectComposer(gl);
    composer.setPixelRatio(gl.getPixelRatio());
    composer.setSize(width, height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    let ssaoPass = null;
    if (preset.enableAO) {
      try {
        ssaoPass = new SSAOPass(scene, camera, width, height);
        ssaoPass.kernelRadius = 0.75;
        ssaoPass.minDistance = 0.002;
        ssaoPass.maxDistance = 0.08;
        ssaoPass.output = SSAOPass.OUTPUT.Default;
        composer.addPass(ssaoPass);
      } catch {
        ssaoPass = null;
      }
    }

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      preset.bloomStrength ?? 0.5,
      0.42,
      0.78
    );
    composer.addPass(bloomPass);

    let gradePass = null;
    if (preset.enableColorGrading) {
      gradePass = new ShaderPass(RacingColorGradeShader);
      composer.addPass(gradePass);
    }

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    return { composer, ssaoPass, bloomPass, gradePass, outputPass };
  }, [gl, scene, camera, preset.enableAO, preset.enableColorGrading]);

  useEffect(() => {
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    pipeline.composer.setPixelRatio(gl.getPixelRatio());
    pipeline.composer.setSize(width, height);
    pipeline.bloomPass.resolution.set(width, height);
    if (pipeline.ssaoPass) {
      pipeline.ssaoPass.setSize(width, height);
    }
  }, [gl, size.width, size.height, pipeline]);

  useEffect(() => {
    return () => {
      pipeline.ssaoPass?.dispose?.();
      pipeline.bloomPass?.dispose?.();
      pipeline.gradePass?.dispose?.();
      pipeline.outputPass?.dispose?.();
      pipeline.composer.dispose();
    };
  }, [pipeline]);

  useFrame((_, dt) => {
    const targetBoost = carLiveState.isBoosting ? 1.0 : 0.0;
    const baseStrength = preset.bloomStrength ?? 0.5;
    pipeline.bloomPass.strength = THREE.MathUtils.damp(
      pipeline.bloomPass.strength,
      baseStrength + targetBoost * 0.22,
      7,
      Math.min(dt, 0.05)
    );
    if (pipeline.gradePass) {
      pipeline.gradePass.uniforms.uBoost.value = THREE.MathUtils.damp(
        pipeline.gradePass.uniforms.uBoost.value,
        targetBoost,
        8,
        Math.min(dt, 0.05)
      );
    }
    pipeline.composer.render();
  }, 1);

  return null;
}
