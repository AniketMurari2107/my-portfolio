/**
 * Pure gameplay world data & trigger math for:
 * - Glowing Checkpoints
 * - Floating Energy Crystals (collectibles)
 * - Hidden Easter Eggs & Secret Achievements
 */

export const CHECKPOINTS = [
  {
    id: 'cp-north-gate',
    order: 1,
    name: 'North Cyber Gate',
    rewardText: '+150 PTS · NITRO RECHARGED',
    position: [0, 0, -24],
    rotationY: 0,
    radius: 4.5,
    color: '#06b6d4',
  },
  {
    id: 'cp-ne-circuit',
    order: 2,
    name: 'Northeast Velocity Curve',
    rewardText: '+150 PTS · NITRO RECHARGED',
    position: [25, 0, -25],
    rotationY: -Math.PI / 4,
    radius: 4.5,
    color: '#3b82f6',
  },
  {
    id: 'cp-east-ring',
    order: 3,
    name: 'East Horizon Ring',
    rewardText: '+150 PTS · NITRO RECHARGED',
    position: [35.5, 0, 2],
    rotationY: Math.PI / 2,
    radius: 4.5,
    color: '#8b5cf6',
  },
  {
    id: 'cp-south-plaza',
    order: 4,
    name: 'South Meridian Crossing',
    rewardText: '+150 PTS · NITRO RECHARGED',
    position: [0, 0, 35.5],
    rotationY: 0,
    radius: 4.5,
    color: '#6366f1',
  },
  {
    id: 'cp-sw-loop',
    order: 5,
    name: 'Southwest Apex Turn',
    rewardText: '+150 PTS · NITRO RECHARGED',
    position: [-29, 0, 19],
    rotationY: Math.PI / 3,
    radius: 4.5,
    color: '#f59e0b',
  },
  {
    id: 'cp-nw-spire',
    order: 6,
    name: 'Northwest Skyline Approach',
    rewardText: '+150 PTS · NITRO RECHARGED',
    position: [-29, 0, -19],
    rotationY: -Math.PI / 3,
    radius: 4.5,
    color: '#14b8a6',
  },
];

export const ENERGY_CRYSTALS = [
  { id: 'crys-01', position: [0, 1.15, -12], color: '#38bdf8' },
  { id: 'crys-02', position: [14, 1.15, -22], color: '#06b6d4' },
  { id: 'crys-03', position: [30, 1.15, -14], color: '#3b82f6' },
  { id: 'crys-04', position: [35.5, 1.15, 14], color: '#8b5cf6' },
  { id: 'crys-05', position: [24, 1.15, 27], color: '#a855f7' },
  { id: 'crys-06', position: [0, 1.15, 27], color: '#6366f1' },
  { id: 'crys-07', position: [-22, 1.15, 29], color: '#f59e0b' },
  { id: 'crys-08', position: [-35.5, 1.15, 8], color: '#14b8a6' },
  { id: 'crys-09', position: [-35.5, 1.15, -8], color: '#06b6d4' },
  { id: 'crys-10', position: [-18, 1.15, -28], color: '#38bdf8' },
  { id: 'crys-11', position: [56, 1.9, -7], color: '#a855f7' },
  { id: 'crys-12', position: [-36, 1.8, 0], color: '#38bdf8' },
];

export const EASTER_EGGS = [
  {
    id: 'egg-arcade',
    title: 'Retro Cyber Gamepad',
    discoveryMessage:
      'Found Aniket’s classic arcade controller relic — where the passion for interactive games began!',
    secretAchievement: 'Retro Relic Hunter',
    position: [16, 0.9, 64],
    radius: 3.8,
    color: '#f59e0b',
    variant: 'gamepad',
  },
  {
    id: 'egg-duck',
    title: 'Golden Holo-Duck Debugger',
    discoveryMessage:
      'Uncovered the legendary Golden Holo-Duck — chief advisor for squashing tough 3D physics bugs!',
    secretAchievement: 'Rubber Duck Whisperer',
    position: [18, 0.9, -68],
    radius: 3.8,
    color: '#facc15',
    variant: 'duck',
  },
  {
    id: 'egg-quantum',
    title: 'Quantum "Hello, World!" Core',
    discoveryMessage:
      'Decrypted the hidden Quantum Source Core pulsing at the northwest perimeter!',
    secretAchievement: 'Quantum Explorer',
    position: [-58, 0.9, -40],
    radius: 3.8,
    color: '#a855f7',
    variant: 'quantum',
  },
];

/**
 * Computes squared shortest distance from point (px, pz) to 2D segment (ax, az)->(bx, bz).
 */
export function pointToSegmentDistSq(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq <= 1e-6) {
    const dx = px - bx;
    const dz = pz - bz;
    return dx * dx + dz * dz;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  const cx = ax + t * abx;
  const cz = az + t * abz;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}

/**
 * Returns the first unclaimed checkpoint whose trigger gate the car is inside
 * (or swept through between prevX/prevZ and x/z).
 */
export function findTriggerableCheckpoint(
  x,
  z,
  clearedIds = [],
  checkpoints = CHECKPOINTS,
  prevX = null,
  prevZ = null
) {
  const hasPrev = Number.isFinite(prevX) && Number.isFinite(prevZ);
  for (let i = 0; i < checkpoints.length; i += 1) {
    const cp = checkpoints[i];
    if (clearedIds.includes(cp.id)) continue;
    const distSq = hasPrev
      ? pointToSegmentDistSq(cp.position[0], cp.position[2], prevX, prevZ, x, z)
      : (x - cp.position[0]) ** 2 + (z - cp.position[2]) ** 2;
    if (distSq <= cp.radius * cp.radius) {
      return cp;
    }
  }
  return null;
}

/**
 * Returns the first uncollected Energy Crystal within pickup radius
 * (including swept segment checks during high-speed Nitro runs).
 */
export function findCollectibleCrystal(
  x,
  z,
  collectedIds = [],
  crystals = ENERGY_CRYSTALS,
  pickupRadius = 2.75,
  prevX = null,
  prevZ = null
) {
  const rSq = pickupRadius * pickupRadius;
  const hasPrev = Number.isFinite(prevX) && Number.isFinite(prevZ);
  for (let i = 0; i < crystals.length; i += 1) {
    const crys = crystals[i];
    if (collectedIds.includes(crys.id)) continue;
    const distSq = hasPrev
      ? pointToSegmentDistSq(crys.position[0], crys.position[2], prevX, prevZ, x, z)
      : (x - crys.position[0]) ** 2 + (z - crys.position[2]) ** 2;
    if (distSq <= rSq) {
      return crys;
    }
  }
  return null;
}

/**
 * Returns an undiscovered Easter Egg when the car drives within discovery radius.
 */
export function findDiscoverableEasterEgg(
  x,
  z,
  discoveredIds = [],
  eggs = EASTER_EGGS,
  prevX = null,
  prevZ = null
) {
  const hasPrev = Number.isFinite(prevX) && Number.isFinite(prevZ);
  for (let i = 0; i < eggs.length; i += 1) {
    const egg = eggs[i];
    if (discoveredIds.includes(egg.id)) continue;
    const distSq = hasPrev
      ? pointToSegmentDistSq(egg.position[0], egg.position[2], prevX, prevZ, x, z)
      : (x - egg.position[0]) ** 2 + (z - egg.position[2]) ** 2;
    if (distSq <= egg.radius * egg.radius) {
      return egg;
    }
  }
  return null;
}

/**
 * Evaluates live gameplay achievements unlocked through exploration, racing, and Easter eggs.
 */
export function evaluateExplorationAchievements({
  checkpointsCleared = [],
  collectedCrystals = [],
  discoveredEggs = [],
  visitedZones = [],
}) {
  return [
    {
      id: 'ach-secret-hunter',
      title: 'Secret Relic Hunter',
      description: 'Discover at least one hidden Easter Egg tucked across the futuristic island.',
      unlocked: discoveredEggs.length >= 1,
      progressLabel: `${Math.min(1, discoveredEggs.length)}/1 Secret`,
      isSecret: true,
    },
    {
      id: 'ach-master-explorer',
      title: 'Master of Secrets',
      description: 'Uncover all 3 hidden Easter Eggs across the cyber-world.',
      unlocked: discoveredEggs.length >= EASTER_EGGS.length,
      progressLabel: `${discoveredEggs.length}/${EASTER_EGGS.length} Secrets`,
      isSecret: true,
    },
    {
      id: 'ach-circuit-pilot',
      title: 'Apex Circuit Pilot',
      description: 'Clear all 6 glowing highway checkpoints around the portfolio ring.',
      unlocked: checkpointsCleared.length >= CHECKPOINTS.length,
      progressLabel: `${checkpointsCleared.length}/${CHECKPOINTS.length} Gates`,
      isSecret: false,
    },
    {
      id: 'ach-crystal-surge',
      title: 'Energy Grid Harvester',
      description: 'Collect floating Energy Crystals to supercharge your hypercar.',
      unlocked: collectedCrystals.length >= ENERGY_CRYSTALS.length,
      progressLabel: `${collectedCrystals.length}/${ENERGY_CRYSTALS.length} Crystals`,
      isSecret: false,
    },
    {
      id: 'ach-world-tour',
      title: 'Digital Universe Navigator',
      description: 'Inspect all 6 interactive developer portfolio districts.',
      unlocked: visitedZones.length >= 6,
      progressLabel: `${visitedZones.length}/6 Zones`,
      isSecret: false,
    },
  ];
}
