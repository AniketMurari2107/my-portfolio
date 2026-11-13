import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampDelta,
  expDamp,
  stepSuspensionSpring,
  stepVehicleState,
  syncCollisionSpeed,
  VEHICLE_CONSTANTS,
} from './vehicleMath.js';
import {
  findNearestZone,
  PORTFOLIO_ZONES,
  SPAWN_POINT,
  worldToMinimap,
} from './worldZones.js';

test('clampDelta bounds extreme frame times safely', () => {
  assert.equal(clampDelta(-0.2), 0);
  assert.equal(clampDelta(0.016), 0.016);
  assert.equal(clampDelta(2.5), 0.05);
});

test('expDamp approaches target smoothly', () => {
  const next = expDamp(0, 10, 8, 0.016);
  assert.ok(next > 0 && next < 10);
});

test('stepVehicleState accelerates forward, steers, and drains boost', () => {
  const initial = {
    speed: 0,
    boost: 100,
    yaw: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitchLean: 0,
    rollLean: 0,
  };

  const stepped = stepVehicleState(
    initial,
    { forward: true, backward: false, left: true, right: false, boost: true },
    0.05
  );

  assert.ok(stepped.speed > 0);
  assert.equal(stepped.isBoosting, true);
  assert.ok(stepped.boost < 100);
  assert.ok(stepped.yaw > 0);
  assert.ok(stepped.vz < 0); // Forward at yaw=0 points toward -Z
  assert.ok(stepped.speedKmh > 0);
});

test('stepVehicleState respects top speed cap and regenerates boost when idle', () => {
  const fastState = {
    speed: VEHICLE_CONSTANTS.MAX_SPEED,
    boost: 50,
    yaw: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitchLean: 0,
    rollLean: 0,
  };

  const coasting = stepVehicleState(
    fastState,
    { forward: false, backward: false, left: false, right: false, boost: false },
    0.05
  );

  assert.ok(coasting.speed < VEHICLE_CONSTANTS.MAX_SPEED);
  assert.ok(coasting.boost > 50);
  assert.equal(coasting.isBoosting, false);
});

test('syncCollisionSpeed reconciles hard physics impacts and preserves smooth driving', () => {
  const unobstructed = syncCollisionSpeed(20, 0, 0, -19.5);
  assert.equal(unobstructed.impactMagnitude, 0);
  assert.equal(unobstructed.syncedSpeed, 20);

  const collided = syncCollisionSpeed(24, 0, 0, -2);
  assert.ok(collided.impactMagnitude > 20);
  assert.equal(collided.syncedSpeed, 2);
});

test('stepSuspensionSpring compresses and rebounds within physical travel bounds', () => {
  let spring = { offset: 0, velocity: -2.5 };
  for (let i = 0; i < 6; i += 1) {
    spring = stepSuspensionSpring(spring, 0, 0.016);
  }
  assert.ok(spring.offset < 0 && spring.offset >= -0.22);
});

test('findNearestZone detects entry into district trigger radius and null outside', () => {
  const spawnCheck = findNearestZone(SPAWN_POINT.x, SPAWN_POINT.z);
  assert.equal(spawnCheck, null);

  const aboutZone = PORTFOLIO_ZONES.find((z) => z.id === 'about');
  const insideAbout = findNearestZone(aboutZone.position[0], aboutZone.position[2] + 3);
  assert.equal(insideAbout?.id, 'about');
});

test('worldToMinimap maps origin to center and clamps bounds', () => {
  const center = worldToMinimap(0, 0, 148, 120);
  assert.equal(center.x, 74);
  assert.equal(center.y, 74);

  const far = worldToMinimap(500, -500, 148, 120);
  assert.equal(far.x, 142);
  assert.equal(far.y, 6);
});

test('stepVehicleState brakes smoothly from forward motion then enters reverse', () => {
  let state = {
    speed: 12,
    boost: 100,
    yaw: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitchLean: 0,
    rollLean: 0,
  };

  // Braking should reduce positive forward speed before going negative
  state = stepVehicleState(
    state,
    { forward: false, backward: true, left: false, right: false, boost: false },
    0.05
  );
  assert.ok(state.speed > 0 && state.speed < 12);

  // Sustained reverse from standstill moves backward (+Z at yaw=0) and flips turn direction
  let revState = { ...state, speed: 0 };
  for (let i = 0; i < 12; i += 1) {
    revState = stepVehicleState(
      revState,
      { forward: false, backward: true, left: true, right: false, boost: false },
      0.05
    );
  }
  assert.ok(revState.speed < 0 && revState.speed >= -VEHICLE_CONSTANTS.REVERSE_SPEED);
  assert.ok(revState.vz > 0);
  assert.ok(revState.yaw < 0);
});

test('all six interactive portfolio zones exist and detect entry inside radius', async () => {
  const expectedIds = ['about', 'skills', 'projects', 'experience', 'achievements', 'contact'];
  assert.deepEqual(
    PORTFOLIO_ZONES.map((z) => z.id),
    expectedIds
  );

  for (const zone of PORTFOLIO_ZONES) {
    const detected = findNearestZone(zone.position[0], zone.position[2]);
    assert.equal(detected?.id, zone.id);
    assert.ok(zone.shortDescription && zone.shortDescription.length > 0);
  }
});

test('centralized portfolioData provides editable entries for all 6 sections', async () => {
  const data = await import('../data/portfolioData.js');
  assert.equal(data.ABOUT_DATA.name, 'Aniket');
  assert.equal(data.ABOUT_DATA.role, 'Aspiring Software Developer');

  const skillNames = data.SKILLS_DATA.map((s) => s.name);
  for (const reqSkill of [
    'JavaScript',
    'React',
    'React Native',
    'HTML',
    'CSS',
    'Three.js',
    'Firebase',
    'Git and GitHub',
  ]) {
    assert.ok(skillNames.includes(reqSkill), `Missing skill: ${reqSkill}`);
  }

  const projectNames = data.PROJECTS_DATA.map((p) => p.name);
  assert.deepEqual(projectNames, [
    'Class Attendance App',
    'Gym Management System',
    '3D Portfolio Website',
  ]);
  assert.ok(data.EXPERIENCE_DATA.length >= 3);
  assert.ok(data.ACHIEVEMENTS_DATA.completedProjects.length >= 3);
  assert.ok(data.ACHIEVEMENTS_DATA.certifications.length >= 1);
  assert.ok(data.CONTACT_DATA.email.includes('@'));
});

test('Nitro system triggers cooldown on depletion, blocks boost during cooldown, and recharges after', () => {
  let state = {
    speed: 20,
    boost: 3,
    nitroCooldown: 0,
    isBoosting: false,
    yaw: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitchLean: 0,
    rollLean: 0,
  };

  // Burn remaining boost until tank hits 0 -> cooldown engages
  for (let i = 0; i < 4; i += 1) {
    state = stepVehicleState(
      state,
      { forward: true, backward: false, left: false, right: false, boost: true },
      0.05
    );
  }
  assert.equal(state.boost, 0);
  assert.ok(state.nitroCooldown > 0);
  assert.equal(state.isBoosting, false);

  // Attempting to boost during cooldown stays blocked
  const duringCooldown = stepVehicleState(
    state,
    { forward: true, backward: false, left: false, right: false, boost: true },
    0.05
  );
  assert.equal(duringCooldown.isBoosting, false);
  assert.equal(duringCooldown.boost, 0);

  // Advance past cooldown duration -> boost starts regenerating
  let recovered = state;
  for (let i = 0; i < 80; i += 1) {
    recovered = stepVehicleState(
      recovered,
      { forward: false, backward: false, left: false, right: false, boost: false },
      0.05
    );
  }
  assert.equal(recovered.nitroCooldown, 0);
  assert.ok(recovered.boost > 0);
});

test('Checkpoints, Energy Crystals, Easter Eggs, and Secret Achievements evaluate accurately', async () => {
  const gp = await import('./worldGameplayData.js');

  assert.equal(gp.CHECKPOINTS.length, 6);
  assert.equal(gp.ENERGY_CRYSTALS.length, 12);
  assert.equal(gp.EASTER_EGGS.length, 3);

  const firstCp = gp.CHECKPOINTS[0];
  assert.equal(
    gp.findTriggerableCheckpoint(firstCp.position[0], firstCp.position[2], [])?.id,
    firstCp.id
  );
  assert.equal(
    gp.findTriggerableCheckpoint(firstCp.position[0], firstCp.position[2], [firstCp.id]),
    null
  );

  const firstCrys = gp.ENERGY_CRYSTALS[0];
  assert.equal(
    gp.findCollectibleCrystal(firstCrys.position[0], firstCrys.position[2], [])?.id,
    firstCrys.id
  );
  assert.equal(
    gp.findCollectibleCrystal(firstCrys.position[0], firstCrys.position[2], [firstCrys.id]),
    null
  );

  const firstEgg = gp.EASTER_EGGS[0];
  assert.equal(
    gp.findDiscoverableEasterEgg(firstEgg.position[0], firstEgg.position[2], [])?.id,
    firstEgg.id
  );

  const partial = gp.evaluateExplorationAchievements({
    checkpointsCleared: [firstCp.id],
    collectedCrystals: [firstCrys.id],
    discoveredEggs: [firstEgg.id],
    visitedZones: ['about'],
  });
  const secretHunter = partial.find((a) => a.id === 'ach-secret-hunter');
  const masterSecrets = partial.find((a) => a.id === 'ach-master-explorer');
  assert.equal(secretHunter?.unlocked, true);
  assert.equal(masterSecrets?.unlocked, false);

  // Swept high-speed segment: driving from z = -2 to z = -20 skips over z = -12 if point-only,
  // but swept segment detection catches crys-01 cleanly.
  assert.equal(gp.findCollectibleCrystal(0, -20, []), null);
  assert.equal(
    gp.findCollectibleCrystal(0, -20, [], gp.ENERGY_CRYSTALS, 2.75, 0, -2)?.id,
    'crys-01'
  );
  assert.equal(
    gp.findTriggerableCheckpoint(0, -32, [], gp.CHECKPOINTS, 0, -16)?.id,
    'cp-north-gate'
  );
});

test('GRAPHICS_PRESETS define Low, Medium, and High mobile/desktop optimization budgets', async () => {
  const gfx = await import('./graphicsConfig.js');
  assert.ok(gfx.GRAPHICS_PRESETS.low && gfx.GRAPHICS_PRESETS.medium && gfx.GRAPHICS_PRESETS.high);

  const low = gfx.getGraphicsConfig('low');
  const med = gfx.getGraphicsConfig('medium');
  const high = gfx.getGraphicsConfig('high');

  assert.equal(low.shadows, false);
  assert.equal(med.shadows, true);
  assert.equal(high.shadows, true);
  assert.equal(low.enableBloom, false);
  assert.equal(med.enableBloom, true);
  assert.equal(high.enableBloom, true);
  assert.equal(low.enableAO, false);
  assert.equal(med.enableAO, false);
  assert.equal(high.enableAO, true);
  assert.equal(low.enableColorGrading, false);
  assert.equal(high.enableColorGrading, true);
  assert.equal(low.enableAnimatedLights, false);
  assert.equal(high.enableAnimatedLights, true);
  assert.ok(low.nitroParticles < med.nitroParticles && med.nitroParticles < high.nitroParticles);
  assert.ok(low.skyStars < med.skyStars && med.skyStars < high.skyStars);
  assert.ok(low.textureScale < med.textureScale && med.textureScale < high.textureScale);

  // Weak Android phone -> low
  assert.equal(
    gfx.detectDefaultGraphicsPreset({
      userAgent: 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Mobile',
      deviceMemory: 2,
      hardwareConcurrency: 4,
    }),
    'low'
  );

  // Mid-range Android -> medium
  assert.equal(
    gfx.detectDefaultGraphicsPreset({
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 Mobile',
      deviceMemory: 6,
      hardwareConcurrency: 8,
    }),
    'medium'
  );

  // Desktop -> high
  assert.equal(
    gfx.detectDefaultGraphicsPreset({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      deviceMemory: 16,
      hardwareConcurrency: 8,
    }),
    'high'
  );

  assert.equal(gfx.shouldShowTouchControls('always', { width: 1440 }), true);
  assert.equal(gfx.shouldShowTouchControls('off', { isCoarsePointer: true, width: 390 }), false);
  assert.equal(gfx.shouldShowTouchControls('auto', { isCoarsePointer: true, width: 844 }), true);
  assert.equal(
    gfx.shouldShowTouchControls('auto', { isCoarsePointer: false, maxTouchPoints: 0, width: 1440 }),
    false
  );
});

test('stepVehicleState supports analog virtual joystick steering and dedicated brake pedal', () => {
  const drivingForward = {
    speed: 18,
    boost: 100,
    nitroCooldown: 0,
    isBoosting: false,
    yaw: 0,
    steerAngle: 0,
    wheelSpin: 0,
    pitchLean: 0,
    rollLean: 0,
  };

  // Positive analog left stick turns left (+yaw) proportionally less than full lock when 0.5
  const gentleLeft = stepVehicleState(
    drivingForward,
    { forward: true, backward: false, brake: false, steerAnalog: 0.5, boost: false },
    0.05
  );
  const fullLeft = stepVehicleState(
    drivingForward,
    { forward: true, backward: false, brake: false, steerAnalog: 1.0, boost: false },
    0.05
  );
  assert.ok(gentleLeft.yaw > 0 && fullLeft.yaw > gentleLeft.yaw);

  // Negative analog right stick turns right (-yaw)
  const rightTurn = stepVehicleState(
    drivingForward,
    { forward: true, backward: false, brake: false, steerAnalog: -0.8, boost: false },
    0.05
  );
  assert.ok(rightTurn.yaw < 0);

  // Dedicated brake brings car to 0 without entering negative reverse speed
  let braked = { ...drivingForward, speed: 3 };
  for (let i = 0; i < 15; i += 1) {
    braked = stepVehicleState(
      braked,
      { forward: false, backward: false, brake: true, steerAnalog: 0, boost: false },
      0.05
    );
  }
  assert.equal(braked.speed, 0);
});

test('WEATHER_PRESETS and getNextWeatherMode cycle cleanly across clear and foggy (rain removed)', async () => {
  const weather = await import('./weatherConfig.js');
  assert.deepEqual(weather.WEATHER_MODES, ['clear', 'foggy']);
  assert.equal(weather.getNextWeatherMode('clear'), 'foggy');
  assert.equal(weather.getNextWeatherMode('foggy'), 'clear');
  assert.equal(weather.getNextWeatherMode('rainy'), 'clear');
  assert.equal(weather.getNextWeatherMode('unknown'), 'clear');

  const clear = weather.getWeatherConfig('clear');
  const foggy = weather.getWeatherConfig('foggy');

  assert.ok(foggy.fogDensity > clear.fogDensity);
  assert.ok(foggy.fogWispIntensity > clear.fogWispIntensity && clear.fogWispIntensity === 0);
  assert.ok(clear.starVisibility > foggy.starVisibility);
  assert.ok(clear.celestialVisibility > foggy.celestialVisibility);
  assert.ok(foggy.cloudCoverage > clear.cloudCoverage);
  assert.ok(foggy.windStrength > 0 && clear.windStrength >= foggy.windStrength);
  assert.ok(foggy.fogTintMix > 0 && clear.fogTintMix === 0);
});

test('computeTimeOfDayState rotates sun and moon smoothly and transitions ambient light colors', async () => {
  const tod = await import('./timeOfDay.js');
  const weather = await import('./weatherConfig.js');
  const clearCfg = weather.getWeatherConfig('clear');

  assert.equal(tod.getTimePhaseLabel(0.27), 'Dawn');
  assert.equal(tod.getTimePhaseLabel(0.5), 'Day');
  assert.equal(tod.getTimePhaseLabel(0.75), 'Dusk');
  assert.equal(tod.getTimePhaseLabel(0.95), 'Night');
  assert.equal(tod.formatClockTime(0.5), '12:00');
  assert.equal(tod.formatClockTime(0.0), '00:00');

  const midnight = tod.computeTimeOfDayState(0.0, clearCfg);
  const dawn = tod.computeTimeOfDayState(0.25, clearCfg);
  const noon = tod.computeTimeOfDayState(0.5, clearCfg);
  const dusk = tod.computeTimeOfDayState(0.75, clearCfg);

  // Sun and Moon stay opposite each other across orbit
  const dotNoon = noon.sunDir.dot(noon.moonDir);
  assert.ok(Math.abs(dotNoon + 1) < 1e-5);
  assert.ok(noon.sunDir.y > 0.85 && noon.moonDir.y < -0.85);
  assert.ok(midnight.moonDir.y > 0.85 && midnight.sunDir.y < -0.85);
  assert.ok(dawn.sunDir.x > 0.85 && dusk.sunDir.x < -0.85);

  // Visibility & ambient lighting smoothly transition across phases
  assert.ok(noon.sunVisibility > 0.9 && noon.moonVisibility === 0);
  assert.ok(midnight.moonVisibility > 0.9 && midnight.sunVisibility === 0);
  assert.ok(midnight.starVisibility > 0.9 && noon.starVisibility === 0);
  assert.ok(noon.keyIntensity > dawn.keyIntensity && dawn.keyIntensity > midnight.keyIntensity);
  assert.ok(noon.hemiIntensity > midnight.hemiIntensity);
  assert.notEqual(dawn.horizonColor.getHexString(), noon.horizonColor.getHexString());
  assert.notEqual(dusk.hemiSkyColor.getHexString(), midnight.hemiSkyColor.getHexString());
});

test('generateTreePlacements replaces buildings with safe non-overlapping realistic trees', async () => {
  const { generateTreePlacements, isTreePlacementClear } = await import('./worldTrees.js');
  const gp = await import('./worldGameplayData.js');
  const { JUMP_RAMPS } = await import('./worldZones.js');

  // Spawn center and road lanes must stay clear
  assert.equal(isTreePlacementClear(0, 0), false);
  assert.equal(isTreePlacementClear(0, -35), false); // Ring road
  assert.equal(isTreePlacementClear(0, -25), false); // North radial highway

  const trees = generateTreePlacements();
  assert.ok(trees.length >= 45, `Expected >=45 trees, got ${trees.length}`);

  const speciesSeen = new Set();
  for (const tree of trees) {
    speciesSeen.add(tree.species);
    assert.ok(tree.foliage && tree.crown && tree.tips, `Tree ${tree.id} missing foliage tiers`);
    assert.ok(tree.widthScale > 0 && tree.heightScale > 0);
    assert.ok(isTreePlacementClear(tree.x, tree.z), `Tree ${tree.id} violates clearance`);
    for (const zone of PORTFOLIO_ZONES) {
      const dist = Math.hypot(tree.x - zone.position[0], tree.z - zone.position[2]);
      assert.ok(dist >= 13.5, `Tree ${tree.id} too close to zone ${zone.id}`);
    }
    for (const ramp of JUMP_RAMPS) {
      const dist = Math.hypot(tree.x - ramp.position[0], tree.z - ramp.position[2]);
      assert.ok(dist >= 9.5, `Tree ${tree.id} too close to ramp ${ramp.id}`);
    }
    for (const cp of gp.CHECKPOINTS) {
      const dist = Math.hypot(tree.x - cp.position[0], tree.z - cp.position[2]);
      assert.ok(dist >= 8.0, `Tree ${tree.id} too close to checkpoint ${cp.id}`);
    }
    for (const cr of gp.ENERGY_CRYSTALS) {
      const dist = Math.hypot(tree.x - cr.position[0], tree.z - cr.position[2]);
      assert.ok(dist >= 6.0, `Tree ${tree.id} too close to crystal ${cr.id}`);
    }
  }
  assert.ok(speciesSeen.size >= 3, 'Expected diverse botanical tree species');
});

test('generateGrassTufts populates open park meadows while keeping roads, platforms, and ramps clear', async () => {
  const { generateGrassTufts, isGrassPlacementClear } = await import('./worldGrass.js');

  assert.equal(isGrassPlacementClear(0, 0), false); // Central roundabout
  assert.equal(isGrassPlacementClear(0, -35.5), false); // Outer ring road
  assert.equal(isGrassPlacementClear(0, -24), false); // Radial highway

  const tufts = generateGrassTufts(1200);
  assert.equal(tufts.length, 1200);
  for (const tuft of tufts) {
    assert.ok(isGrassPlacementClear(tuft.x, tuft.z), 'Grass tuft violates road/platform clearance');
    assert.ok(tuft.scaleXZ > 0 && tuft.scaleY > 0);
    assert.ok(tuft.color.startsWith('#'));
  }
});


