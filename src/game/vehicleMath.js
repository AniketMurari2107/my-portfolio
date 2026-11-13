/**
 * Pure vehicle kinematics & arcade physics helper functions.
 * Decoupled from Three.js / React so core driving math can be unit-tested cleanly.
 */

export const VEHICLE_CONSTANTS = {
  MAX_SPEED: 30,
  BOOST_MAX_SPEED: 48,
  REVERSE_SPEED: 14,
  ACCEL_RATE: 26,
  BOOST_ACCEL_RATE: 48,
  BRAKE_RATE: 38,
  COAST_DECEL: 11,
  TURN_SPEED: 2.55,
  BOOST_DRAIN_PER_SEC: 36,
  BOOST_REGEN_PER_SEC: 32,
  NITRO_COOLDOWN_SEC: 3.2,
  JUMP_VELOCITY: 9.2,
  SUSPENSION_STIFFNESS: 145,
  SUSPENSION_DAMPING: 15,
};

/**
 * Clamp frame delta time to prevent physics tunneling after tab switches.
 */
export function clampDelta(rawDt) {
  if (!Number.isFinite(rawDt) || rawDt <= 0) return 0;
  return Math.min(rawDt, 0.05);
}

/**
 * Frame-rate independent exponential damping.
 */
export function expDamp(current, target, lambda, dt) {
  const alpha = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * alpha;
}

/**
 * Reconciles simulated forward speed with actual Rapier planar velocity after collisions.
 * Returns { syncedSpeed, impactMagnitude }.
 */
export function syncCollisionSpeed(expectedSpeed, yaw, bodyVx, bodyVz) {
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const actualForwardSpeed = bodyVx * forwardX + bodyVz * forwardZ;
  const delta = Math.abs(expectedSpeed - actualForwardSpeed);

  // If physics solver pushed back hard against an obstacle, adopt the solver velocity
  if (delta > 3.2) {
    return {
      syncedSpeed: actualForwardSpeed,
      impactMagnitude: delta,
    };
  }
  return {
    syncedSpeed: expectedSpeed,
    impactMagnitude: 0,
  };
}

/**
 * Second-order spring-damper solver for realistic chassis suspension compression & rebound.
 */
export function stepSuspensionSpring(springState, targetOffset, rawDt) {
  const dt = clampDelta(rawDt);
  let offset = springState.offset ?? 0;
  let velocity = springState.velocity ?? 0;

  const force = (targetOffset - offset) * VEHICLE_CONSTANTS.SUSPENSION_STIFFNESS;
  velocity += force * dt;
  velocity *= Math.exp(-VEHICLE_CONSTANTS.SUSPENSION_DAMPING * dt);
  offset += velocity * dt;

  // Clamp travel to physical suspension limits
  offset = Math.max(-0.22, Math.min(0.18, offset));

  return { offset, velocity };
}

/**
 * Advances arcade hypercar planar velocity, Nitro boost + cooldown, yaw, wheel spin, and suspension lean.
 */
export function stepVehicleState(state, input, rawDt, options = {}) {
  const dt = clampDelta(rawDt);
  const sensitivity = options.steeringSensitivity ?? 1.0;

  let speed = state.speed ?? 0;
  let boost = state.boost ?? 100;
  let nitroCooldown = state.nitroCooldown ?? 0;
  const wasBoosting = Boolean(state.isBoosting);
  let yaw = state.yaw ?? 0;
  let steerAngle = state.steerAngle ?? 0;
  let wheelSpin = state.wheelSpin ?? 0;
  let pitchLean = state.pitchLean ?? 0;
  let rollLean = state.rollLean ?? 0;

  const wantsForward = Boolean(input.forward);
  const wantsBackward = Boolean(input.backward);
  const wantsBrake = Boolean(input.brake);
  const nitroReady = nitroCooldown <= 0.001 && boost > 1;
  const wantsBoost = Boolean(input.boost) && !wantsBackward && !wantsBrake && nitroReady;

  // Nitro boost drain, depletion cooldown, and recharge
  if (wantsBoost) {
    boost = Math.max(0, boost - VEHICLE_CONSTANTS.BOOST_DRAIN_PER_SEC * dt);
    if (boost <= 0.5) {
      boost = 0;
      nitroCooldown = VEHICLE_CONSTANTS.NITRO_COOLDOWN_SEC;
    }
  } else {
    if (wasBoosting && boost < 25 && nitroCooldown <= 0) {
      nitroCooldown = VEHICLE_CONSTANTS.NITRO_COOLDOWN_SEC * 0.65;
    }
    if (nitroCooldown > 0) {
      nitroCooldown = Math.max(0, nitroCooldown - dt);
    } else {
      boost = Math.min(100, boost + VEHICLE_CONSTANTS.BOOST_REGEN_PER_SEC * dt);
    }
  }

  const maxSpeed = wantsBoost
    ? VEHICLE_CONSTANTS.BOOST_MAX_SPEED
    : VEHICLE_CONSTANTS.MAX_SPEED;
  const accelRate = wantsBoost
    ? VEHICLE_CONSTANTS.BOOST_ACCEL_RATE
    : VEHICLE_CONSTANTS.ACCEL_RATE;

  let throttleIntent = 0;

  if (wantsBrake) {
    // Dedicated brake decelerates cleanly toward 0 from either forward or reverse
    throttleIntent = speed >= 0 ? -1.1 : 0.9;
    if (speed > 0) {
      speed = Math.max(0, speed - VEHICLE_CONSTANTS.BRAKE_RATE * 1.35 * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + VEHICLE_CONSTANTS.BRAKE_RATE * 1.35 * dt);
    }
  } else if ((wantsForward || wantsBoost) && !wantsBackward) {
    // Pressing Shift engages forward Nitro thrust even without holding W
    throttleIntent = wantsBoost ? 1.4 : 1;
    if (speed < 0) {
      speed = Math.min(0, speed + VEHICLE_CONSTANTS.BRAKE_RATE * dt);
    } else {
      speed = Math.min(maxSpeed, speed + accelRate * dt);
    }
  } else if (wantsBackward && !wantsForward) {
    throttleIntent = -1;
    if (speed > 0) {
      speed = Math.max(0, speed - VEHICLE_CONSTANTS.BRAKE_RATE * dt);
    } else {
      speed = Math.max(-VEHICLE_CONSTANTS.REVERSE_SPEED, speed - accelRate * 0.75 * dt);
    }
  } else {
    // Natural aerodynamic & rolling resistance friction
    if (speed > 0) {
      speed = Math.max(0, speed - VEHICLE_CONSTANTS.COAST_DECEL * dt);
    } else if (speed < 0) {
      speed = Math.min(0, speed + VEHICLE_CONSTANTS.COAST_DECEL * dt);
    }
    // Gently bleed excess speed down from boost top speed to normal top speed
    if (speed > VEHICLE_CONSTANTS.MAX_SPEED && !wantsBoost) {
      speed = expDamp(speed, VEHICLE_CONSTANTS.MAX_SPEED, 2.2, dt);
    }
  }

  // Steering input: smooth analog joystick overrides digital keys when pushed outside deadzone
  const digitalSteer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const rawAnalog = Number.isFinite(input.steerAnalog) ? input.steerAnalog : 0;
  const steerDir = Math.abs(rawAnalog) > 0.04
    ? Math.max(-1, Math.min(1, rawAnalog))
    : digitalSteer;
  const targetSteerAngle = steerDir * 0.44;
  steerAngle = expDamp(steerAngle, targetSteerAngle, 12, dt);

  // Speed-scaled turning (allow responsive low-speed pivot and smooth high-speed arcs)
  const absSpeed = Math.abs(speed);
  const speedTurnFactor = absSpeed > 0.35
    ? Math.min(1, 0.35 + absSpeed / 14)
    : 0;
  const reverseFlip = speed < -0.2 ? -1 : 1;
  yaw += steerDir * VEHICLE_CONSTANTS.TURN_SPEED * sensitivity * speedTurnFactor * reverseFlip * dt;

  // Wheel rotation accumulates proportionally to distance traveled
  wheelSpin += (speed * dt) / 0.42;

  // Dynamic suspension squat/dive & cornering roll
  const targetPitch = throttleIntent * -0.038;
  const targetRoll = steerDir * Math.min(1, absSpeed / 22) * 0.06;
  pitchLean = expDamp(pitchLean, targetPitch, 9, dt);
  rollLean = expDamp(rollLean, targetRoll, 9, dt);

  // Forward direction vector (car faces -Z when yaw = 0)
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);

  return {
    speed,
    boost,
    nitroCooldown,
    isBoosting: wantsBoost,
    yaw,
    steerAngle,
    wheelSpin,
    pitchLean,
    rollLean,
    vx: forwardX * speed,
    vz: forwardZ * speed,
    speedKmh: Math.round(Math.abs(speed) * 4.2),
  };
}
