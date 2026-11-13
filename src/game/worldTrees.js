import { JUMP_RAMPS, PORTFOLIO_ZONES, WORLD_LANDMARKS } from './worldZones.js';
import { CHECKPOINTS, EASTER_EGGS, ENERGY_CRYSTALS } from './worldGameplayData.js';

/**
 * Deterministic 2D point-to-segment distance squared helper.
 */
function distSqToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq <= 1e-6) {
    return (px - ax) ** 2 + (pz - az) ** 2;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  const cx = ax + t * abx;
  const cz = az + t * abz;
  return (px - cx) ** 2 + (pz - cz) ** 2;
}

/**
 * Checks whether candidate tree coordinates (x, z) have safe clearance from
 * roads, portfolio districts, jump ramps, crystals, checkpoints, Easter eggs, and landmarks.
 */
export function isTreePlacementClear(x, z) {
  const r = Math.hypot(x, z);
  // Keep central roundabout & inner plaza completely open, and stay inside mountain ridge
  if (r < 17 || r > 95) return false;

  // Avoid outer ring road (radius 32..39 plus shoulder margin)
  if (r >= 29.5 && r <= 41.8) return false;

  // Avoid all 6 radial highway corridors (width 5.4m + shoulder)
  for (let i = 0; i < PORTFOLIO_ZONES.length; i += 1) {
    const zone = PORTFOLIO_ZONES[i];
    if (distSqToSegment(x, z, 0, 0, zone.position[0], zone.position[2]) < 7.2 * 7.2) {
      return false;
    }
    // Avoid portfolio building platforms & proximity rings
    const dzx = x - zone.position[0];
    const dzz = z - zone.position[2];
    if (dzx * dzx + dzz * dzz < 13.5 * 13.5) {
      return false;
    }
  }

  // Avoid stunt jump ramps
  for (let i = 0; i < JUMP_RAMPS.length; i += 1) {
    const ramp = JUMP_RAMPS[i];
    if ((x - ramp.position[0]) ** 2 + (z - ramp.position[2]) ** 2 < 9.5 * 9.5) {
      return false;
    }
  }

  // Avoid checkpoints, crystals, Easter eggs, and landmarks
  for (let i = 0; i < CHECKPOINTS.length; i += 1) {
    const cp = CHECKPOINTS[i];
    if ((x - cp.position[0]) ** 2 + (z - cp.position[2]) ** 2 < 8.0 * 8.0) {
      return false;
    }
  }
  for (let i = 0; i < ENERGY_CRYSTALS.length; i += 1) {
    const cr = ENERGY_CRYSTALS[i];
    if ((x - cr.position[0]) ** 2 + (z - cr.position[2]) ** 2 < 6.0 * 6.0) {
      return false;
    }
  }
  for (let i = 0; i < EASTER_EGGS.length; i += 1) {
    const egg = EASTER_EGGS[i];
    if ((x - egg.position[0]) ** 2 + (z - egg.position[2]) ** 2 < 7.5 * 7.5) {
      return false;
    }
  }

  const landmarks = Object.values(WORLD_LANDMARKS);
  for (let i = 0; i < landmarks.length; i += 1) {
    const lm = landmarks[i];
    if ((x - lm.position[0]) ** 2 + (z - lm.position[2]) ** 2 < 10.0 * 10.0) {
      return false;
    }
  }

  return true;
}

/**
 * Generates deterministic multi-scale procedural 3D trees with realistic botanical palettes.
 * Places outer forest groves (52..93m) plus curated inner park-grove trees in open meadows.
 */
export function generateTreePlacements() {
  const trees = [];
  // Realistic nocturnal forest palette: deep spruce, cedar, nocturnal cypress, silver birch-pine
  const palette = [
    { species: 'cedar', foliage: '#173830', crown: '#225042', tips: '#2f6856', firefly: '#5eead4' },
    { species: 'spruce', foliage: '#153429', crown: '#1f4938', tips: '#2d624a', firefly: '#7dd3fc' },
    { species: 'cypress', foliage: '#18343d', crown: '#224a54', tips: '#31656f', firefly: '#93c5fd' },
    { species: 'pine', foliage: '#1a3b2c', crown: '#24523c', tips: '#366f51', firefly: '#a7f3d0' },
  ];

  // Outer perimeter & parkland ring replacing former skyline buildings
  const outerSamples = 78;
  for (let i = 0; i < outerSamples; i += 1) {
    const angle = (i / outerSamples) * Math.PI * 2 + (i % 3) * 0.042;
    const radius = 52 + ((i * 19) % 39);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isTreePlacementClear(x, z)) continue;

    // Avoid overlapping an already placed neighbor
    let tooClose = false;
    for (let j = 0; j < trees.length; j += 1) {
      const dx = x - trees[j].x;
      const dz = z - trees[j].z;
      if (dx * dx + dz * dz < 6.8 * 6.8) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const pal = palette[i % palette.length];
    const baseScale = 0.92 + ((i * 7) % 13) * 0.045;
    trees.push({
      id: `tree-outer-${trees.length}`,
      x,
      z,
      scale: baseScale,
      widthScale: baseScale * (0.9 + ((i * 3) % 5) * 0.055),
      heightScale: baseScale * (0.94 + ((i * 5) % 6) * 0.055),
      rotationY: (i * 2.39996) % (Math.PI * 2),
      leanX: ((i % 5) - 2) * 0.018,
      leanZ: (((i * 3) % 5) - 2) * 0.018,
      hasCollider: radius < 72,
      ...pal,
    });
  }

  // Inner meadow groves (framing avenues cleanly while keeping roads & ramps open)
  const innerCandidates = [
    [22, -6],
    [23, 6],
    [-21, -13],
    [-21, 13],
    [13, -23],
    [-13, -23],
    [14, 24],
    [-14, 24],
  ];
  innerCandidates.forEach(([x, z], idx) => {
    if (!isTreePlacementClear(x, z)) return;
    const pal = palette[(idx + 1) % palette.length];
    const baseScale = 0.96 + (idx % 3) * 0.14;
    trees.push({
      id: `tree-inner-${idx}`,
      x,
      z,
      scale: baseScale,
      widthScale: baseScale * (0.95 + (idx % 3) * 0.06),
      heightScale: baseScale * (1.02 + (idx % 2) * 0.1),
      rotationY: idx * 1.37,
      leanX: ((idx % 3) - 1) * 0.014,
      leanZ: (((idx + 1) % 3) - 1) * 0.014,
      hasCollider: true,
      ...pal,
    });
  });

  return trees;
}

