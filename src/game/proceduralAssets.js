import * as THREE from 'three';

const textureAssetCache = new Map();

/**
 * Probes WebGL2 hardware capabilities for texture compression & anisotropy support.
 */
export function detectTextureCapabilities(gl) {
  if (!gl) return { hasCompressedFormats: false, maxAnisotropy: 1 };
  const hasCompressedFormats = Boolean(
    gl.getExtension?.('WEBGL_compressed_texture_astc') ||
      gl.getExtension?.('WEBGL_compressed_texture_etc') ||
      gl.getExtension?.('WEBGL_compressed_texture_s3tc') ||
      gl.getExtension?.('EXT_texture_compression_bptc')
  );
  return {
    hasCompressedFormats,
    maxAnisotropy: gl.capabilities?.getMaxAnisotropy?.() || 4,
  };
}

/**
 * Retrieves a cached Three.js CanvasTexture or creates & stores it by key.
 */
export function getCachedTexture(key, factory) {
  if (textureAssetCache.has(key)) {
    return textureAssetCache.get(key);
  }
  const tex = factory();
  textureAssetCache.set(key, tex);
  return tex;
}

/**
 * Disposes all cached procedural Three.js textures cleanly.
 */
export function clearAssetCache() {
  for (const tex of textureAssetCache.values()) {
    tex?.dispose?.();
  }
  textureAssetCache.clear();
}

/**
 * Probes WebGL2 renderer string to detect CPU software rasterizers
 * (SwiftShader, llvmpipe, softpipe, WARP) for rendering budget pacing.
 */
export function detectSoftwareGl() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Generates a tileable cyber-grid ground texture with subtle hex/circuit lines (cached by tier).
 */
export function createTerrainGridTexture(maxAnisotropy = 4, textureScale = 1) {
  const size = textureScale <= 0.5 ? 256 : 512;
  return getCachedTexture(`terrain-${size}-${maxAnisotropy}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#070b19';
    ctx.fillRect(0, 0, size, size);

    const dots = size === 256 ? 600 : 1600;
    for (let i = 0; i < dots; i += 1) {
      const x = (i * 73) % size;
      const y = (i * 139) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 58, 138, 0.08)' : 'rgba(15, 23, 42, 0.25)';
      ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = 'rgba(37, 99, 235, 0.14)';
    ctx.lineWidth = 1;
    const step = size / 8;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.34)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.fillRect(0, 0, 5, 5);
    ctx.fillRect(size - 5, 0, 5, 5);
    ctx.fillRect(0, size - 5, 5, 5);
    ctx.fillRect(size - 5, size - 5, 5, 5);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 36);
    tex.anisotropy = maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a linear grayscale bump map for subtle surface micro-relief.
 */
export function createSurfaceBumpTexture(maxAnisotropy = 4) {
  return getCachedTexture(`bump-${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 2000; i += 1) {
      const x = (i * 83) % size;
      const y = (i * 157) % size;
      const shade = 105 + ((i * 29) % 50);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 3, 3);
    }

    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(28, 28);
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates an illuminated futuristic asphalt road surface with neon lane dividers (cached).
 */
export function createAsphaltTexture(maxAnisotropy = 4, repeatY = 10, textureScale = 1) {
  const size = textureScale <= 0.5 ? 256 : 512;
  return getCachedTexture(`asphalt-${size}-${repeatY}-${maxAnisotropy}`, () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0d1324';
    ctx.fillRect(0, 0, size, size);

    const dots = size === 256 ? 900 : 2400;
    for (let i = 0; i < dots; i += 1) {
      const x = (i * 97) % size;
      const y = (i * 193) % size;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(148, 163, 184, 0.06)' : 'rgba(2, 6, 23, 0.35)';
      ctx.fillRect(x, y, 2, 2);
    }

    const edge = size === 256 ? 8 : 16;
    const strip = size === 256 ? 5 : 10;
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(edge, 0, strip, size);
    ctx.fillRect(size - edge - strip, 0, strip, size);

    ctx.fillStyle = '#38bdf8';
    const dashStep = size / 4;
    for (let y = dashStep * 0.2; y < size; y += dashStep) {
      ctx.fillRect(size / 2 - (strip * 0.4), y, strip * 0.8, dashStep * 0.52);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, repeatY);
    tex.anisotropy = maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a linear grayscale roughness map for wet futuristic asphalt neon reflections.
 */
export function createAsphaltRoughnessTexture(maxAnisotropy = 4, repeatY = 10) {
  return getCachedTexture(`asphalt-rough-${repeatY}-${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base dark wet surface (lower value = glossier reflections)
    ctx.fillStyle = '#484848';
    ctx.fillRect(0, 0, size, size);

    // Glossy damp tire channels & puddle streaks
    for (let i = 0; i < 18; i += 1) {
      const rx = (i * 53) % size;
      const ry = (i * 97) % size;
      const rw = 24 + (i % 4) * 14;
      const rh = 44 + (i % 5) * 20;
      const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rw);
      grad.addColorStop(0, '#181818');
      grad.addColorStop(1, 'rgba(72,72,72,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(rx - rw, ry - rh * 0.5, rw * 2, rh);
    }

    // Slightly rougher aggregate noise
    for (let i = 0; i < 900; i += 1) {
      const x = (i * 67) % size;
      const y = (i * 131) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(130,130,130,0.22)' : 'rgba(28,28,28,0.22)';
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, repeatY);
    tex.anisotropy = maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a linear grayscale roughness map for cyber-grid terrain metallic reflections.
 */
export function createTerrainRoughnessTexture(maxAnisotropy = 4) {
  return getCachedTexture(`terrain-rough-${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#828282';
    ctx.fillRect(0, 0, size, size);

    // Glossy polished reflective strips along grid intersections
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    const step = size / 8;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(36, 36);
    tex.anisotropy = maxAnisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a metallic hexagonal floor pattern for the central futuristic garage bay.
 */
export function createGarageFloorTexture(maxAnisotropy = 4) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#091020';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // Hazard chevrons along side bays
  ctx.fillStyle = 'rgba(6, 182, 212, 0.65)';
  ctx.fillRect(14, 14, 14, size - 28);
  ctx.fillRect(size - 28, 14, 14, size - 28);

  // Center lane arrow
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(size / 2 - 36, size / 2 + 24);
  ctx.lineTo(size / 2, size / 2 - 20);
  ctx.lineTo(size / 2 + 36, size / 2 + 24);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft radial contact shadow alpha texture for grounding vehicles & props.
 */
export function createContactShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a soft translucent mist/fog wisp sprite texture (cached).
 */
export function createFogWispTexture() {
  return getCachedTexture('fog-wisp-sprite', () => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.06,
      size / 2,
      size / 2,
      size * 0.5
    );
    grad.addColorStop(0, 'rgba(186, 230, 253, 0.32)');
    grad.addColorStop(0.45, 'rgba(125, 211, 252, 0.12)');
    grad.addColorStop(1, 'rgba(12, 24, 44, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates realistic furrowed tree bark albedo & linear bump textures (cached).
 */
export function createBarkTextures(maxAnisotropy = 4) {
  const map = getCachedTexture(`bark-map-${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2d231e';
    ctx.fillRect(0, 0, size, size);

    // Organic vertical bark fissures and ridge highlights
    for (let i = 0; i < 420; i += 1) {
      const x = (i * 37.3) % size;
      const y = (i * 71.7) % size;
      const w = 2 + (i % 5);
      const h = 24 + (i % 7) * 14;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(84, 67, 56, 0.42)' : 'rgba(18, 13, 12, 0.58)';
      ctx.fillRect(x, y, w, h);
    }
    for (let i = 0; i < 24; i += 1) {
      const x = (i * 11) % size;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(102, 82, 68, 0.35)' : 'rgba(14, 10, 9, 0.5)';
      ctx.lineWidth = 2 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let py = 0; py <= size; py += 32) {
        const wobble = Math.sin(py * 0.08 + i) * 3.5;
        ctx.lineTo(x + wobble, py);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 3);
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });

  const bumpMap = getCachedTexture(`bark-bump-${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 480; i += 1) {
      const x = (i * 41.1) % size;
      const y = (i * 63.9) % size;
      const shade = i % 2 === 0 ? 185 : 36;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 2 + (i % 4), 22 + (i % 6) * 12);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 3);
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });

  return { map, bumpMap };
}

/**
 * Generates a linear grayscale leaf-cluster bump/roughness micro-texture for organic tree canopies.
 */
export function createFoliageBumpTexture(maxAnisotropy = 4) {
  return getCachedTexture(`foliage-bump-${maxAnisotropy}`, () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#686868';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 950; i += 1) {
      const x = (i * 73.13) % size;
      const y = (i * 139.37) % size;
      const r = 4 + (i % 6) * 1.4;
      const shade = 70 + ((i * 29) % 150);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},0.48)`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, (i * 0.7) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a detailed procedural full-moon disc texture with maria & craters (cached).
 */
export function createMoonTexture() {
  return getCachedTexture('cinematic-moon-disc', () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;
    const r = size * 0.44;

    ctx.clearRect(0, 0, size, size);

    // Soft atmospheric lunar corona outer glow
    const halo = ctx.createRadialGradient(c, c, r * 0.78, c, c, size * 0.5);
    halo.addColorStop(0, 'rgba(219, 234, 254, 0.55)');
    halo.addColorStop(0.55, 'rgba(147, 197, 253, 0.16)');
    halo.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);

    // Clip to moon sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.clip();

    const baseGrad = ctx.createRadialGradient(c - r * 0.25, c - r * 0.25, r * 0.1, c, c, r);
    baseGrad.addColorStop(0, '#f8fafc');
    baseGrad.addColorStop(0.65, '#dbeafe');
    baseGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Lunar maria & craters
    const maria = [
      [c - 22, c - 18, 28, 22, 0.22],
      [c + 18, c - 26, 22, 16, 0.18],
      [c - 10, c + 24, 30, 18, 0.16],
      [c + 26, c + 12, 18, 24, 0.2],
      [c - 38, c + 8, 16, 14, 0.15],
    ];
    maria.forEach(([mx, my, rx, ry, alpha]) => {
      ctx.fillStyle = `rgba(71, 85, 105, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(mx, my, rx, ry, 0.4, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < 36; i += 1) {
      const ang = i * 2.39996;
      const dist = ((i * 19) % 85) * 0.01 * r;
      const cx = c + Math.cos(ang) * dist;
      const cy = c + Math.sin(ang) * dist;
      const cr = 2.5 + (i % 5) * 2.1;
      ctx.fillStyle = 'rgba(100, 116, 139, 0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a tileable 512x512 multi-octave soft cloud & nebula texture (linear data map)
 * so CinematicSky renders volumetric-looking clouds with fast texture lookups.
 */
export function createSkyCloudTexture() {
  return getCachedTexture('cinematic-sky-clouds', () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 190; i += 1) {
      const cx = (i * 157.3) % size;
      const cy = (i * 263.7) % size;
      const r = 34 + (i % 7) * 16;
      const alpha = 0.045 + (i % 5) * 0.022;

      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const px = cx + ox * size;
          const py = cy + oy * size;
          if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
          const grad = ctx.createRadialGradient(px, py, r * 0.1, px, py, r);
          grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          grad.addColorStop(0.55, `rgba(195, 210, 235, ${alpha * 0.45})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a luminous procedural solar disc + soft atmospheric corona texture (cached).
 */
export function createSunTexture() {
  return getCachedTexture('cinematic-sun-disc', () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const c = size / 2;
    const r = size * 0.24;

    ctx.clearRect(0, 0, size, size);

    // Outer golden-amber atmospheric corona
    const corona = ctx.createRadialGradient(c, c, r * 0.55, c, c, size * 0.5);
    corona.addColorStop(0, 'rgba(255, 251, 235, 1.0)');
    corona.addColorStop(0.24, 'rgba(253, 224, 71, 0.85)');
    corona.addColorStop(0.5, 'rgba(251, 146, 60, 0.28)');
    corona.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = corona;
    ctx.fillRect(0, 0, size, size);

    // Bright photosphere core
    const core = ctx.createRadialGradient(c, c, 0, c, c, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.7, '#fef3c7');
    core.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Generates a crisp holographic billboard texture for portfolio district landmarks.
 */
export function createHoloSignTexture(title, subtitle, accentHex = '#06b6d4') {
  const width = 512;
  const height = 224;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#070c1c';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  ctx.fillStyle = accentHex;
  ctx.fillRect(8, 8, 44, 10);
  ctx.fillRect(width - 52, height - 18, 44, 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px "Oxanium", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase(), width / 2, height / 2 - 28);

  ctx.fillStyle = accentHex;
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, width / 2, height / 2 + 24);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '600 18px "JetBrains Mono", monospace';
  ctx.fillText('PRESS [E] TO INSPECT', width / 2, height - 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates glowing futuristic neon highway billboard displays.
 */
export function createNeonBillboardTexture(headline, subline, accentHex = '#38bdf8') {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, width, height);

  // Diagonal scan accent
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.fillRect(0, 0, width, 44);
  ctx.fillRect(0, height - 44, width, 44);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px "Oxanium", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(headline, width / 2, height / 2 - 20);

  ctx.fillStyle = accentHex;
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.fillText(subline, width / 2, height / 2 + 34);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a glowing holographic badge texture for floating 3D Skill Tower nodes.
 */
export function createSkillBadgeTexture(label, accentHex = '#38bdf8') {
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#060c1d';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 5;
  ctx.strokeRect(5, 5, width - 10, height - 10);

  ctx.fillStyle = accentHex;
  ctx.fillRect(5, 5, 28, 7);
  ctx.fillRect(width - 33, height - 12, 28, 7);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "Oxanium", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, width / 2, height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates a floating 3D holographic showroom display panel texture for a project.
 */
export function createProjectDisplayTexture(title, techLine, accentHex = '#8b5cf6') {
  const width = 384;
  const height = 224;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#070b1a';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(139, 92, 246, 0.12)';
  ctx.fillRect(0, 0, width, 42);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, width - 12, height - 12);

  ctx.fillStyle = accentHex;
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SHOWROOM DISPLAY', 22, 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Oxanium", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 102);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillText(techLine, width / 2, 152);

  ctx.fillStyle = accentHex;
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText('PRESS [E] TO OPEN', width / 2, 194);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
