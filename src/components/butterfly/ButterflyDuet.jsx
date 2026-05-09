import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import Butterfly from "./Butterfly";

const BUTTERFLY_SRC = "/butterfly.glb";
const SIZE = 96;

/* -------------------------------------------------------------------------- */
/*  Element-perch hook                                                        */
/* -------------------------------------------------------------------------- */

function useElementListPerches(refsArrayRef, options = {}) {
  const { dx = 0, dy = 0 } = options;
  const [positions, setPositions] = useState([]);

  useLayoutEffect(() => {
    const update = () => {
      const els = refsArrayRef?.current || [];
      const next = els
        .filter(Boolean)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.left + r.width / 2 + dx,
            y: r.top + dy,
          };
        });
      setPositions(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const t = setTimeout(update, 250);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clearTimeout(t);
    };
  }, [refsArrayRef, dx, dy]);

  return positions;
}

function useElementPerch(ref, options = {}) {
  const { anchor = "top-center", dx = 0, dy = 0 } = options;
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!ref?.current) return;

    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      let x, y;
      if (anchor === "top-left") {
        x = r.left + dx;
        y = r.top + dy;
      } else if (anchor === "top-right") {
        x = r.right + dx;
        y = r.top + dy;
      } else if (anchor === "top-center") {
        x = r.left + r.width / 2 + dx;
        y = r.top + dy;
      } else {
        x = r.left + r.width / 2 + dx;
        y = r.top + r.height / 2 + dy;
      }
      setPos({ x, y });
    };

    update();
    const ro = new ResizeObserver(update);
    if (ref.current) ro.observe(ref.current);
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const timeout = setTimeout(update, 250);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clearTimeout(timeout);
    };
  }, [ref, anchor, dx, dy]);

  return pos;
}

/* -------------------------------------------------------------------------- */
/*  Cursor tracker                                                            */
/* -------------------------------------------------------------------------- */

function useCursorRef() {
  const ref = useRef({ x: -9999, y: -9999, active: false });
  useEffect(() => {
    const move = (e) => {
      ref.current = { x: e.clientX, y: e.clientY, active: true };
    };
    const leave = () => {
      ref.current = { ...ref.current, active: false };
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseout", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseout", leave);
    };
  }, []);
  return ref;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const CURSOR_FLEE_RADIUS = 130;

function clampToViewport(p, margin = 70) {
  return {
    x: Math.max(margin, Math.min(window.innerWidth - margin, p.x)),
    y: Math.max(margin, Math.min(window.innerHeight - margin, p.y)),
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/* -------------------------------------------------------------------------- */
/*  Trip planning — sequence of waypoints, last is always home                */
/* -------------------------------------------------------------------------- */

function randomViewport() {
  const margin = 80;
  return {
    x: margin + Math.random() * (window.innerWidth - margin * 2),
    y: margin + Math.random() * (window.innerHeight - margin * 2),
  };
}

function pickAnchor(anchors, exclude) {
  const choices = anchors.filter((a) => a !== exclude);
  if (!choices.length) return null;
  return choices[Math.floor(Math.random() * choices.length)];
}

function restingMs() {
  return 1300 + Math.random() * 2200;
}

function planTrip(home, anchors, cursor) {
  // Flee from cursor
  if (cursor.active && distance(cursor, home) < CURSOR_FLEE_RADIUS) {
    const angle = Math.atan2(home.y - cursor.y, home.x - cursor.x);
    const dist = 280 + Math.random() * 140;
    const flee = clampToViewport({
      x: home.x + Math.cos(angle) * dist,
      y: home.y + Math.sin(angle) * dist,
    });
    return [
      { pos: flee, lingerMs: restingMs(), kind: "rest" },
      { pos: home, lingerMs: 0, kind: "home" },
    ];
  }

  // 60% chance the trip rests at a non-home anchor before returning home —
  // butterfly visibly perches on social icons, sayHi, avatar, chalkboard, etc.
  // 40% chance it just wanders the page without picking an anchor.
  const visitsAnchor = anchors.length > 1 && Math.random() < 0.6;

  // Pick a strategy
  const strategies = visitsAnchor
    ? ["anchor-rest", "anchor-tour", "anchor-arc", "anchor-explore"]
    : ["wander-far", "wander-zigzag", "wander-loop"];
  const strategy = pickRandom(strategies);

  switch (strategy) {
    /* ------------------------ Anchor-visiting trips ------------------------ */
    case "anchor-rest": {
      // Direct flight to an anchor, rest there, return home
      const target = pickAnchor(anchors, home);
      return [
        { pos: target, lingerMs: restingMs(), kind: "rest" },
        { pos: home, lingerMs: 0, kind: "home" },
      ];
    }
    case "anchor-tour": {
      // Visit 2–3 anchors, rest at the last one
      const numStops = 2 + Math.floor(Math.random() * 2);
      const stops = [];
      let last = home;
      const used = new Set([home]);
      for (let i = 0; i < numStops; i++) {
        const remaining = anchors.filter((a) => !used.has(a));
        if (!remaining.length) break;
        const next = remaining[Math.floor(Math.random() * remaining.length)];
        used.add(next);
        const isLast = i === numStops - 1;
        stops.push({
          pos: next,
          lingerMs: isLast ? restingMs() : (Math.random() < 0.4 ? 600 + Math.random() * 700 : 0),
          kind: isLast ? "rest" : "passthrough",
        });
        last = next;
      }
      return [...stops, { pos: home, lingerMs: 0, kind: "home" }];
    }
    case "anchor-arc": {
      // Long curving flight to an anchor via a far waypoint, brief rest
      const target = pickAnchor(anchors, home);
      const detour = randomViewport();
      return [
        { pos: detour, lingerMs: 0, kind: "passthrough" },
        { pos: target, lingerMs: restingMs(), kind: "rest" },
        { pos: home, lingerMs: 0, kind: "home" },
      ];
    }
    case "anchor-explore": {
      // Wander to 2 random points, then land on an anchor
      const target = pickAnchor(anchors, home);
      return [
        { pos: randomViewport(), lingerMs: 0, kind: "passthrough" },
        { pos: randomViewport(), lingerMs: 0, kind: "passthrough" },
        { pos: target, lingerMs: restingMs(), kind: "rest" },
        { pos: home, lingerMs: 0, kind: "home" },
      ];
    }

    /* ------------------------ Free-flight (no anchor) ---------------------- */
    case "wander-far": {
      // Big sweep to a random spot anywhere on the page
      const target = randomViewport();
      return [
        { pos: target, lingerMs: 800 + Math.random() * 1200, kind: "passthrough" },
        { pos: home, lingerMs: 0, kind: "home" },
      ];
    }
    case "wander-zigzag": {
      // Zigzag across the page
      const z1 = randomViewport();
      const z2 = randomViewport();
      const z3 = randomViewport();
      return [
        { pos: z1, lingerMs: 0, kind: "passthrough" },
        { pos: z2, lingerMs: 0, kind: "passthrough" },
        { pos: z3, lingerMs: 200 + Math.random() * 500, kind: "passthrough" },
        { pos: home, lingerMs: 0, kind: "home" },
      ];
    }
    case "wander-loop":
    default: {
      // Loop through 3 random page points
      return [
        { pos: randomViewport(), lingerMs: 0, kind: "passthrough" },
        { pos: randomViewport(), lingerMs: 0, kind: "passthrough" },
        { pos: home, lingerMs: 0, kind: "home" },
      ];
    }
  }
}

function randomNear(p, range) {
  return clampToViewport({
    x: p.x + (Math.random() - 0.5) * range * 2,
    y: p.y + (Math.random() - 0.5) * range * 1.4,
  });
}

/* -------------------------------------------------------------------------- */
/*  Steering helpers                                                          */
/* -------------------------------------------------------------------------- */

function steerToward(pos, vel, target, maxSpeed, maxForce, slowOnArrival = true) {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.01) return { x: 0, y: 0 };

  // Arrival slowing only for landing waypoints. For passthrough, fly at full
  // speed through them — gives one continuous curving flight, not stop-start.
  let desiredSpeed = maxSpeed;
  if (slowOnArrival) {
    const slowingRadius = 100;
    desiredSpeed *= Math.min(1, dist / slowingRadius);
  }

  const desiredVx = (dx / dist) * desiredSpeed;
  const desiredVy = (dy / dist) * desiredSpeed;

  let sx = desiredVx - vel.x;
  let sy = desiredVy - vel.y;
  const sm = Math.hypot(sx, sy);
  if (sm > maxForce) {
    sx = (sx / sm) * maxForce;
    sy = (sy / sm) * maxForce;
  }
  return { x: sx, y: sy };
}

/* -------------------------------------------------------------------------- */
/*  PhysicsButterfly — single butterfly with a physics-driven flight loop     */
/* -------------------------------------------------------------------------- */

function PhysicsButterfly({
  src,
  size,
  homePerch,
  allPerches,
  cursorRef,
  overlayRef,
}) {
  // Motion values for transform — driven from the physics loop, no React
  // re-renders per frame.
  const halfSize = size / 2;
  const mvX = useMotionValue(homePerch.x - halfSize);
  const mvY = useMotionValue(homePerch.y - halfSize);
  const mvRotate = useMotionValue(0);
  const mvScale = useMotionValue(1);
  const isBehindRef = useRef(false);

  // 3D pose (read by the Butterfly canvas inside)
  const poseRef = useRef({
    pitch: 0,
    yaw: 0,
    bank: 0,
    baseTilt: -Math.PI / 2,
    flapPhase: 0,
    flapAmplitude: 0.45,
    responsive: false,
  });

  // Physics state
  const physRef = useRef({
    pos: { x: homePerch.x, y: homePerch.y },
    vel: { x: 0, y: 0 },
    heading: -Math.PI / 2,
    targetHeading: -Math.PI / 2,
    depth: 0,
    depthTarget: 0,
    depthChangeAt: 0,
    flapPhase: 0,
    flapRate: 3,
    flapAmplitude: 0.4,
    mode: "resting",
    modeStartedAt: 0,
    nextEventAt: 1500,
    nextFlutterAt: 0,
    waypoints: [],
    waypointIdx: 0,
    targetBaseTilt: -Math.PI / 2,
    targetBaseTiltSetAt: 0,
    pitchTarget: 0,
    bankTarget: 0,
    yawTarget: 0,
    smoothBank: 0,
    smoothPitch: 0,
    landingTarget: null,
    landingLinger: 0,
    midRestUntil: 0,
    hoverDuration: 0,
  });

  const homeRef = useRef(homePerch);
  const anchorsRef = useRef(allPerches);
  useEffect(() => {
    homeRef.current = homePerch;
  }, [homePerch]);
  useEffect(() => {
    anchorsRef.current = allPerches;
  }, [allPerches]);

  useAnimationFrame((time, delta) => {
    const dt = Math.min(delta / 1000, 1 / 30); // clamp to avoid huge steps after tab focus
    const phys = physRef.current;
    const home = homeRef.current;
    if (!home) return;

    /* ------------------------------ MODE FSM ------------------------------ */

    const elapsed = time - phys.modeStartedAt;

    if (phys.mode === "resting") {
      // Sit at home. Tiny breathing wobble via depth + small flap rate.
      phys.flapRate = 0.9;
      phys.flapAmplitude = 0.35;
      phys.vel.x *= 0.6;
      phys.vel.y *= 0.6;
      // Stay anchored
      phys.pos.x += (home.x - phys.pos.x) * dt * 8;
      phys.pos.y += (home.y - phys.pos.y) * dt * 8;

      if (time > phys.nextEventAt) {
        // Plan next trip
        const cursor = cursorRef?.current || { active: false };
        const anchors = (anchorsRef.current || []).filter(Boolean);
        phys.waypoints = planTrip(home, anchors, cursor);
        phys.waypointIdx = 0;
        phys.mode = "preparing";
        phys.modeStartedAt = time;
        // Pick a fresh base tilt for this trip
        phys.targetBaseTilt =
          -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      }
    } else if (phys.mode === "preparing") {
      // Slower anticipation (~520 ms) — wings spool up gradually, body crouches
      // very slightly. No sudden kick; takeoff blends into flying naturally.
      phys.flapRate = 1.2 + Math.min(elapsed / 80, 7);
      phys.flapAmplitude = 0.4 + Math.min(elapsed / 1200, 0.2);
      // Tiny crouch in first half, tiny rise in second half
      const halfMs = 260;
      if (elapsed < halfMs) {
        phys.pos.y += dt * 7; // gentle dip
      } else {
        phys.pos.y -= dt * 9; // start rising
      }
      if (elapsed > 520) {
        phys.mode = "flying";
        phys.modeStartedAt = time;
        // Soft initial nudge — let steering build speed organically
        const wp = phys.waypoints[0]?.pos || home;
        const dx = wp.x - phys.pos.x;
        const dy = wp.y - phys.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        phys.vel.x = (dx / d) * 28;
        phys.vel.y = (dy / d) * 28 - 25; // small upward bias
      }
    } else if (phys.mode === "flying" || phys.mode === "gliding" || phys.mode === "hovering") {
      const wpEntry = phys.waypoints[phys.waypointIdx];
      const target = wpEntry?.pos || home;
      const isLastWaypoint = phys.waypointIdx >= phys.waypoints.length - 1;
      const willRestHere = wpEntry?.lingerMs > 0 || isLastWaypoint;

      // Pulsed flutter — emit a strong random impulse every ~0.4–1.0 s instead
      // of constant jitter every frame. This creates the natural burst-and-drift
      // pattern of real butterfly flight.
      if (time > phys.nextFlutterAt && phys.mode === "flying") {
        const burst = 80 + Math.random() * 60;
        const angle = Math.random() * Math.PI * 2;
        phys.vel.x += Math.cos(angle) * burst;
        phys.vel.y += Math.sin(angle) * burst;
        phys.nextFlutterAt = time + 400 + Math.random() * 700;
      }

      if (phys.mode === "flying") {
        // Steering — slow only on arrival waypoints (rest/home), fly through others
        const speedRamp = Math.min(1, elapsed / 1200);
        const maxSpeed = 100 + 120 * speedRamp;
        const steer = steerToward(
          phys.pos,
          phys.vel,
          target,
          maxSpeed,
          280,
          willRestHere
        );
        phys.vel.x += steer.x * dt;
        phys.vel.y += steer.y * dt;

        // Flap rate scales with speed; ramps smoothly toward target each frame
        const speed = Math.hypot(phys.vel.x, phys.vel.y);
        const targetFlapRate = 1.6 + speed / 80;
        phys.flapRate += (targetFlapRate - phys.flapRate) * Math.min(1, dt * 4);
        phys.flapAmplitude += (0.6 - phys.flapAmplitude) * Math.min(1, dt * 5);

        // Occasionally enter glide (4–6s avg interval) or mid-flight hover (rare)
        if (elapsed > 1400) {
          const r = Math.random();
          if (r < dt * 0.16) {
            phys.mode = "gliding";
            phys.modeStartedAt = time;
          } else if (r < dt * 0.16 + dt * 0.06) {
            phys.mode = "hovering";
            phys.modeStartedAt = time;
            phys.hoverDuration = 600 + Math.random() * 700;
          }
        }
      } else if (phys.mode === "gliding") {
        // Wings frozen at near-max spread, no flap, only drag.
        // No "gravity" — that read as falling. Glide is just gentle deceleration.
        phys.flapRate += (0 - phys.flapRate) * Math.min(1, dt * 4);
        phys.flapAmplitude += (0.55 - phys.flapAmplitude) * Math.min(1, dt * 4);
        if (elapsed > 700 + Math.random() * 300) {
          phys.mode = "flying";
          phys.modeStartedAt = time;
        }
      } else if (phys.mode === "hovering") {
        // Hover-decide: stop forward motion, wings flutter quickly, body holds
        // roughly in place for a moment before continuing toward target.
        phys.vel.x *= Math.pow(0.04, dt);
        phys.vel.y *= Math.pow(0.04, dt);
        const targetFlapRate = 4.5;
        phys.flapRate += (targetFlapRate - phys.flapRate) * Math.min(1, dt * 6);
        phys.flapAmplitude += (0.55 - phys.flapAmplitude) * Math.min(1, dt * 6);
        if (elapsed > phys.hoverDuration) {
          phys.mode = "flying";
          phys.modeStartedAt = time;
          phys.nextFlutterAt = time + 100; // give a flutter shortly after
        }
      }

      // Light drag — let the butterfly carry momentum so motion is fluid.
      // 0.85 per second (was 0.65) gives much more glide-friendly physics.
      phys.vel.x *= Math.pow(0.85, dt);
      phys.vel.y *= Math.pow(0.85, dt);

      // Cursor avoidance
      const cursor = cursorRef?.current;
      if (cursor?.active) {
        const cdx = phys.pos.x - cursor.x;
        const cdy = phys.pos.y - cursor.y;
        const cd = Math.hypot(cdx, cdy);
        if (cd < CURSOR_FLEE_RADIUS && cd > 0.1) {
          const push = ((CURSOR_FLEE_RADIUS - cd) / CURSOR_FLEE_RADIUS) * 600;
          phys.vel.x += (cdx / cd) * push * dt;
          phys.vel.y += (cdy / cd) * push * dt;
        }
      }

      phys.pos.x += phys.vel.x * dt;
      phys.pos.y += phys.vel.y * dt;

      // Waypoint check
      const distToTarget = Math.hypot(target.x - phys.pos.x, target.y - phys.pos.y);
      const reachThreshold = wpEntry?.kind === "home" ? 30 : willRestHere ? 50 : 80;
      if (distToTarget < reachThreshold) {
        if (wpEntry?.lingerMs > 0) {
          phys.mode = "landing";
          phys.modeStartedAt = time;
          phys.landingTarget = target;
          phys.landingLinger = wpEntry.lingerMs;
        } else if (isLastWaypoint) {
          phys.mode = "landing";
          phys.modeStartedAt = time;
          phys.landingTarget = home;
          phys.landingLinger = 3000 + Math.random() * 4500;
        } else {
          phys.waypointIdx++;
        }
      }
    } else if (phys.mode === "landing") {
      // Decelerate, settle to landing target with mild overshoot/follow-through
      const target = phys.landingTarget;
      const dx = target.x - phys.pos.x;
      const dy = target.y - phys.pos.y;
      const d = Math.hypot(dx, dy);
      // Strong attraction toward target
      phys.vel.x += (dx) * dt * 7;
      phys.vel.y += (dy) * dt * 7;
      phys.vel.x *= Math.pow(0.18, dt); // strong damping = settle quickly
      phys.vel.y *= Math.pow(0.18, dt);
      phys.pos.x += phys.vel.x * dt;
      phys.pos.y += phys.vel.y * dt;
      phys.flapRate = 1.4;
      phys.flapAmplitude = 0.4;

      const speed = Math.hypot(phys.vel.x, phys.vel.y);
      if (d < 6 && speed < 30) {
        // Settled
        phys.pos.x = target.x;
        phys.pos.y = target.y;
        phys.vel.x = 0;
        phys.vel.y = 0;

        // If landing was at home, become resting until next trip
        const isHome = phys.waypoints[phys.waypoints.length - 1]?.pos === target;
        if (isHome || phys.waypointIdx >= phys.waypoints.length - 1) {
          phys.mode = "resting";
          phys.modeStartedAt = time;
          phys.nextEventAt = time + phys.landingLinger;
        } else {
          // Mid-trip rest — pause briefly, then continue
          phys.mode = "midRest";
          phys.modeStartedAt = time;
          phys.midRestUntil = time + phys.landingLinger;
        }
      }
    } else if (phys.mode === "midRest") {
      phys.flapRate = 1.0;
      phys.flapAmplitude = 0.35;
      phys.vel.x *= 0.5;
      phys.vel.y *= 0.5;
      // Hold at landing target
      const t = phys.landingTarget;
      phys.pos.x += (t.x - phys.pos.x) * dt * 6;
      phys.pos.y += (t.y - phys.pos.y) * dt * 6;

      if (time > phys.midRestUntil) {
        phys.waypointIdx++;
        phys.mode = "flying";
        phys.modeStartedAt = time;
      }
    }

    /* --------------------------- POSE FROM PHYSICS ------------------------ */

    // Heading lag — body rotates toward velocity direction
    const speed = Math.hypot(phys.vel.x, phys.vel.y);
    if (speed > 25) {
      const newTargetHeading = Math.atan2(phys.vel.y, phys.vel.x);
      let diff = newTargetHeading - phys.targetHeading;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      phys.targetHeading += diff;
    }
    let hdiff = phys.targetHeading - phys.heading;
    while (hdiff > Math.PI) hdiff -= 2 * Math.PI;
    while (hdiff < -Math.PI) hdiff += 2 * Math.PI;
    // Tighter heading lag at high speed (body locks onto motion direction
    // when flying fast), looser at low speed (free rotation while hovering).
    const speed2 = Math.hypot(phys.vel.x, phys.vel.y);
    const headingResponsiveness = 1.8 + Math.min(speed2 / 90, 2.2);
    phys.heading += hdiff * Math.min(1, dt * headingResponsiveness);

    // Bank from turn rate — smoothed via low-pass so it's not jittery
    const rawBank = clamp(hdiff * 1.4, -0.45, 0.45);
    phys.smoothBank = (phys.smoothBank ?? 0) * 0.85 + rawBank * 0.15;
    phys.bankTarget = phys.smoothBank;

    // Pitch from vertical velocity, smoothed (raw vy can flip rapidly)
    let pitchFromV = clamp(-phys.vel.y / 350, -0.35, 0.35);
    if (phys.mode === "gliding") pitchFromV = 0.18; // mild down-pitch glide
    if (phys.mode === "preparing") pitchFromV = -0.15; // slight wind-up
    phys.smoothPitch = phys.smoothPitch * 0.88 + pitchFromV * 0.12;
    phys.pitchTarget = phys.smoothPitch;

    // Yaw target — small random drift (separate from heading rotation that we
    // apply at the DOM level via mvRotate)
    phys.yawTarget = Math.sin(time * 0.001) * 0.12;

    // Depth (z) drift — slowly wanders
    if (time > phys.depthChangeAt) {
      const range = phys.mode === "flying" ? 0.45 : 0.15;
      phys.depthTarget = (Math.random() - 0.5) * range;
      phys.depthChangeAt = time + 1800 + Math.random() * 2200;
    }
    phys.depth += (phys.depthTarget - phys.depth) * dt * 1.4;

    // Flap phase
    phys.flapPhase = (phys.flapPhase + phys.flapRate * dt) % 1;

    // Body bob — vertical offset from each downstroke
    const flapSin = Math.sin(phys.flapPhase * Math.PI * 2);
    const bobAmp =
      phys.mode === "flying"
        ? 4
        : phys.mode === "preparing"
          ? 6
          : phys.mode === "gliding"
            ? 1
            : phys.mode === "resting"
              ? 1.2
              : 2;
    const bobOffset = flapSin * bobAmp;

    /* ------------------------ APPLY TO DOM / SCENE ------------------------ */

    mvX.set(phys.pos.x - halfSize);
    mvY.set(phys.pos.y - halfSize + bobOffset);
    // Body heading in screen-space — atan2 gives angle from +x, butterfly's
    // default head direction is "up" (-y) so we add 90°.
    const headingDeg = (phys.heading * 180) / Math.PI + 90;
    mvRotate.set(headingDeg);
    mvScale.set(1 + phys.depth * 0.35);

    // Behind / over elements: z-index switches with hysteresis when depth
    // crosses thresholds. depth < -0.2 → behind cards. depth > -0.05 → in front.
    if (overlayRef?.current) {
      if (!isBehindRef.current && phys.depth < -0.2) {
        isBehindRef.current = true;
        overlayRef.current.style.zIndex = "0";
      } else if (isBehindRef.current && phys.depth > -0.05) {
        isBehindRef.current = false;
        overlayRef.current.style.zIndex = "9999";
      }
    }

    // Ease the displayed pose toward the targets
    const poseLerp = 1 - Math.exp(-dt * 4);
    poseRef.current.pitch += (phys.pitchTarget - poseRef.current.pitch) * poseLerp;
    poseRef.current.bank += (phys.bankTarget - poseRef.current.bank) * poseLerp;
    poseRef.current.yaw += (phys.yawTarget - poseRef.current.yaw) * poseLerp;
    poseRef.current.baseTilt +=
      (phys.targetBaseTilt - poseRef.current.baseTilt) * dt * 0.9;
    poseRef.current.flapPhase = phys.flapPhase;
    poseRef.current.flapAmplitude = phys.flapAmplitude;
    poseRef.current.responsive = phys.mode !== "resting";
  });

  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{
        x: mvX,
        y: mvY,
        rotate: mvRotate,
        scale: mvScale,
        width: size,
        height: size,
        willChange: "transform",
      }}
    >
      <Butterfly src={src} size={size} poseRef={poseRef} />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ButterflyDuet                                                             */
/* -------------------------------------------------------------------------- */

export default function ButterflyDuet({
  titleRef,
  avatarRef,
  sayHiRef,
  chalkboardRef,
  socialRefs,
}) {
  const reduce = useReducedMotion();
  const cursorRef = useCursorRef();

  // dy offsets are negative so the butterfly's silhouette BOTTOM touches the
  // element top — visually "perches on" the element rather than floating above.
  const titlePerch = useElementPerch(titleRef, {
    anchor: "top-left",
    dx: 18,
    dy: -28,
  });
  const avatarPerch = useElementPerch(avatarRef, {
    anchor: "top-center",
    dy: -32,
  });
  const sayHiPerch = useElementPerch(sayHiRef, {
    anchor: "top-center",
    dy: -28,
  });
  const chalkPerch = useElementPerch(chalkboardRef, {
    anchor: "top-center",
    dy: -28,
  });
  const socialPerches = useElementListPerches(socialRefs, { dy: -28 });

  const overlayRef = useRef(null);

  if (!titlePerch || reduce) return null;

  const allPerches = [
    titlePerch,
    avatarPerch,
    sayHiPerch,
    chalkPerch,
    ...socialPerches,
  ].filter(Boolean);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 9999 }}
    >
      <PhysicsButterfly
        src={BUTTERFLY_SRC}
        size={SIZE}
        homePerch={titlePerch}
        allPerches={allPerches}
        cursorRef={cursorRef}
        overlayRef={overlayRef}
      />
    </div>
  );
}
