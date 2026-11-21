// guard.js — the archive's night watch: patrol routes, vision cones,
// a suspicion meter that gives the thief a chance to recover, the
// chase when the alarm goes off, and investigating noises.

import { TILE, hasLineOfSight, tileCenter } from './level.js';

export const CONE_RANGE = 195;
export const CONE_HALF_ANGLE = 0.58; // about 33 degrees each side
export const PATROL_SPEED = 56;
export const CHASE_SPEED = 112;
export const CATCH_DISTANCE = 24;
export const SUSPICION_DECAY = 26;
export const GIVE_UP_SECONDS = 4;

export function createGuard(route, index) {
  const first = tileCenter(route.waypoints[0].x, route.waypoints[0].y);
  const second = tileCenter(route.waypoints[1].x, route.waypoints[1].y);
  return {
    name: route.name,
    color: route.color,
    waypoints: route.waypoints.map((w) => tileCenter(w.x, w.y)),
    waypointIndex: 1,
    x: first.x,
    y: first.y,
    facing: Math.atan2(second.y - first.y, second.x - first.x),
    suspicion: 0,
    mode: 'patrol', // patrol | investigate | chase
    investigateTarget: null,
    lastSeen: null,
    unseenTimer: 0,
    pauseTimer: index * 0.7,
    stepPhase: 0,
  };
}

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

// How clearly this guard can see the thief right now, 0 to 1.
// Zero outside the cone, behind a wall, or beyond the cone's reach.
export function guardSeesThief(guard, grid, thief) {
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > CONE_RANGE) return 0;
  const angleToThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToThief, guard.facing)) > CONE_HALF_ANGLE) return 0;
  if (!hasLineOfSight(grid, guard, thief)) return 0;
  // Nearer is clearer: full strength up close, fading to the edge.
  return 1 - (distance / CONE_RANGE) * 0.65;
}

function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  guard.stepPhase += dt * 9;
  return dist - step < 2;
}

export function updateGuard(guard, grid, thief, thiefState, dt, onCaught) {
  const visibility = guardSeesThief(guard, grid, thief);

  if (visibility > 0) {
    // Spotted: suspicion climbs, faster up close, slower when the
    // thief sneaks or hides in a bush — never instant, always a
    // chance to slip back behind cover.
    let rate = 34 + visibility * 62;
    if (thiefState.sneaking) rate *= 0.45;
    if (thiefState.inBush) rate *= 0.25;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.unseenTimer = 0;
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
    guard.unseenTimer += dt;
  }

  if (guard.suspicion >= 100 && guard.mode !== 'chase') {
    guard.mode = 'chase';
    guard.unseenTimer = 0;
  }

  if (guard.mode === 'chase') {
    const target = guard.lastSeen ?? { x: thief.x, y: thief.y };
    moveToward(guard, target, CHASE_SPEED, dt);
    if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < CATCH_DISTANCE) {
      onCaught();
      return;
    }
    // Lost the thief for a while: give up, cool off, go back on patrol.
    if (guard.unseenTimer > GIVE_UP_SECONDS) {
      guard.mode = 'patrol';
      guard.suspicion = 35;
      guard.waypointIndex = nearestWaypoint(guard);
    }
    return;
  }

  if (guard.mode === 'investigate') {
    // Eyes on the thief: keep closing in on where they were last seen.
    // Otherwise walk to the noise and look around, then give up.
    const target = visibility > 0 ? { x: thief.x, y: thief.y } : guard.investigateTarget;
    const arrived = moveToward(guard, target, PATROL_SPEED * 1.35, dt);
    if (arrived && visibility <= 0) {
      guard.mode = 'patrol';
      guard.investigateTarget = null;
      guard.waypointIndex = nearestWaypoint(guard);
    }
    return;
  }

  // Patrol: walk the loop, pausing a beat at each waypoint to look around.
  if (guard.pauseTimer > 0) {
    guard.pauseTimer -= dt;
    guard.facing += dt * 0.9;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  if (moveToward(guard, target, PATROL_SPEED, dt)) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseTimer = 0.9;
  }
}

function nearestWaypoint(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((point, index) => {
    const dist = Math.hypot(point.x - guard.x, point.y - guard.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}

// A noise ping within earshot sends a patrolling guard to look.
export function guardHearsNoise(guard, noise) {
  if (guard.mode !== 'patrol') return;
  const dist = Math.hypot(noise.x - guard.x, noise.y - guard.y);
  if (dist > noise.radius + 40) return;
  guard.mode = 'investigate';
  guard.investigateTarget = { x: noise.x, y: noise.y };
  guard.suspicion = Math.max(guard.suspicion, 30);
}
