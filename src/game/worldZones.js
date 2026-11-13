/**
 * World zone definitions and spatial coordinate helpers.
 * Pure module for 3D landmarks, interaction detection, and minimap projection.
 */

export const WORLD_RADIUS = 124;

export const SPAWN_POINT = {
  x: 0,
  y: 0.72,
  z: 18,
  yaw: 0, // Facing -Z (North toward Central Plaza & Central Futuristic Garage)
};

export const WORLD_LANDMARKS = {
  garage: { label: 'Central Garage', position: [0, 0, 0] },
  tunnel: { label: 'Neon Tunnel', position: [0, 0, -76] },
  viewpoint: { label: 'Scenic Viewpoint', position: [0, 4.2, 88] },
};

export const PORTFOLIO_ZONES = [
  {
    id: 'about',
    title: 'About Me',
    signTitle: 'ABOUT',
    shortLabel: 'About',
    subtitle: 'Aniket — Aspiring Software Developer',
    shortDescription: 'Developer profile, background & interactive 3D engineering vision.',
    position: [0, 0, -48],
    radius: 9.8,
    color: '#06b6d4',
    spawnOffset: { x: 0, z: 7.8 },
    approachYaw: 0,
  },
  {
    id: 'skills',
    title: 'Skills Tower',
    signTitle: 'SKILLS',
    shortLabel: 'Skills',
    subtitle: 'JavaScript · React · Three.js · Firebase',
    shortDescription: 'Floating holographic skill matrix & core technical stack.',
    position: [42, 0, -24],
    radius: 9.8,
    color: '#3b82f6',
    spawnOffset: { x: -6.8, z: 3.9 },
    approachYaw: -Math.PI / 3,
  },
  {
    id: 'projects',
    title: 'Project Showroom',
    signTitle: 'PROJECTS',
    shortLabel: 'Projects',
    subtitle: 'Class Attendance · Gym System · 3D Portfolio',
    shortDescription: 'Floating project displays with tech stacks & configurable links.',
    position: [42, 0, 24],
    radius: 9.8,
    color: '#8b5cf6',
    spawnOffset: { x: -6.8, z: -3.9 },
    approachYaw: (-2 * Math.PI) / 3,
  },
  {
    id: 'experience',
    title: 'Experience & Timeline',
    signTitle: 'EXPERIENCE',
    shortLabel: 'Experience',
    subtitle: 'Education, Experience & Milestones',
    shortDescription: 'Chronological timeline of studies, builds & engineering growth.',
    position: [0, 0, 48],
    radius: 9.8,
    color: '#6366f1',
    spawnOffset: { x: 0, z: -7.8 },
    approachYaw: Math.PI,
  },
  {
    id: 'achievements',
    title: 'Achievement Zone',
    signTitle: 'ACHIEVEMENTS',
    shortLabel: 'Achievements',
    subtitle: 'Projects · Tech Learned · Milestones · Certs',
    shortDescription: 'Completed projects, technologies mastered & certifications.',
    position: [-42, 0, 24],
    radius: 9.8,
    color: '#f59e0b',
    spawnOffset: { x: 6.8, z: -3.9 },
    approachYaw: (2 * Math.PI) / 3,
  },
  {
    id: 'contact',
    title: 'Communication Station',
    signTitle: 'CONTACT',
    shortLabel: 'Contact',
    subtitle: 'Email · GitHub · LinkedIn · Direct Relay',
    shortDescription: 'Communication hub with configurable links & direct message.',
    position: [-42, 0, -24],
    radius: 9.8,
    color: '#14b8a6',
    spawnOffset: { x: 6.8, z: 3.9 },
    approachYaw: Math.PI / 3,
  },
];

export const JUMP_RAMPS = [
  { id: 'ramp-north-east', position: [18, 0, -30], rotationY: -Math.PI / 5, color: '#06b6d4' },
  { id: 'ramp-east', position: [56, 0, 0], rotationY: Math.PI, color: '#8b5cf6' },
  { id: 'ramp-west', position: [-28, 0, 0], rotationY: Math.PI / 2, color: '#3b82f6' },
];

/**
 * Returns the closest interactive portfolio zone if the car is within its trigger radius.
 */
export function findNearestZone(x, z, zones = PORTFOLIO_ZONES) {
  let closest = null;
  let minDistSq = Infinity;

  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    const dx = x - zone.position[0];
    const dz = z - zone.position[2];
    const distSq = dx * dx + dz * dz;
    const triggerRadius = zone.radius;
    if (distSq <= triggerRadius * triggerRadius && distSq < minDistSq) {
      minDistSq = distSq;
      closest = zone;
    }
  }

  return closest;
}

/**
 * Projects world (x, z) coordinates into minimap pixel coordinates [0..mapSize].
 */
export function worldToMinimap(x, z, mapSize = 148, worldSpan = 160) {
  const half = mapSize * 0.5;
  const scale = half / (worldSpan * 0.5);
  const px = Math.max(6, Math.min(mapSize - 6, half + x * scale));
  const py = Math.max(6, Math.min(mapSize - 6, half + z * scale));
  return { x: px, y: py };
}
