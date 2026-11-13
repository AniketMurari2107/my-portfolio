import { PORTFOLIO_ZONES, JUMP_RAMPS } from './worldZones.js';

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
 * Checks whether (x, z) is clear of roads, central roundabout, portfolio platforms, and stunt ramps
 * so realistic grass tufts frame avenues naturally without poking through asphalt or concrete.
 */
export function isGrassPlacementClear(x, z) {
  const r = Math.hypot(x, z);
  // Keep central illuminated roundabout (r <= 11.1) and distant mountain slopes (r > 94) clear
  if (r < 11.2 || r > 94) return false;

  // Keep outer ring road clear (radius 32..39 plus clean border)
  if (r >= 31.3 && r <= 39.7) return false;

  // Keep all 6 radial highway corridors clear (road half-width 2.7m + 0.55m neon strip margin)
  for (let i = 0; i < PORTFOLIO_ZONES.length; i += 1) {
    const zone = PORTFOLIO_ZONES[i];
    if (distSqToSegment(x, z, 0, 0, zone.position[0], zone.position[2]) < 3.25 * 3.25) {
      return false;
    }
    // Keep interactive district platforms clear
    const dzx = x - zone.position[0];
    const dzz = z - zone.position[2];
    if (dzx * dzx + dzz * dzz < 9.4 * 9.4) {
      return false;
    }
  }

  // Keep stunt jump ramps clear
  for (let i = 0; i < JUMP_RAMPS.length; i += 1) {
    const ramp = JUMP_RAMPS[i];
    if ((x - ramp.position[0]) ** 2 + (z - ramp.position[2]) ** 2 < 5.6 * 5.6) {
      return false;
    }
  }

  return true;
}

/**
 * Generates deterministic meadow grass tuft placements using golden-angle spiral sampling
 * with gentle organic clumping and botanical green variation.
 */
export function generateGrassTufts(maxCount = 8500) {
  const palette = ['#1b4332', '#26533d', '#2d6a4f', '#1f4d3a', '#356847', '#215444'];
  const tufts = [];
  const sampleLimit = maxCount * 2;

  for (let i = 0; i < sampleLimit && tufts.length < maxCount; i += 1) {
    // Golden-angle spiral coverage across [11.5, 92] radius with subtle organic clustering
    const frac = (i + 0.5) / sampleLimit;
    const baseR = 11.4 + Math.sqrt(frac) * 80.5;
    const theta = i * 2.39996323;
    const jitterR = Math.sin(i * 12.9898) * 1.45;
    const jitterA = Math.cos(i * 78.233) * 0.04;

    const r = baseR + jitterR;
    const a = theta + jitterA;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (!isGrassPlacementClear(x, z)) continue;

    // Slight lush height variation near trees/meadow edges
    const clump = 0.72 + ((Math.sin(x * 0.21) * Math.cos(z * 0.21) + 1) * 0.5) * 0.55;
    const scaleXZ = 0.68 + ((i * 7) % 9) * 0.065;
    const scaleY = (0.65 + ((i * 11) % 10) * 0.075) * clump;

    tufts.push({
      x,
      z,
      scaleXZ,
      scaleY,
      rotationY: (i * 1.91) % (Math.PI * 2),
      color: palette[i % palette.length],
    });
  }

  return tufts;
}
