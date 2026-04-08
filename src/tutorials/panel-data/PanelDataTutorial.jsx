import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TableProperties,
  RefreshCw,
  BarChart3,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  TutorialShell,
  StepContent,
  QuizCard,
  StatCard,
  InfoBox,
  LabeledSlider,
  Tex,
} from "@/components/tutorial";

/* ================================================================== */
/*  Running example — Restaurant Health Inspections                    */
/*                                                                     */
/*  We track N=50 restaurants across T=6 annual periods (300 obs).    */
/*  Treatment: whether the restaurant received a city hygiene grant.   */
/*  Outcome: health inspection score (0–100).                          */
/*  Confounder: baseline cleanliness culture (unobserved, time-invar.) */
/*                                                                     */
/*  Two focal restaurants highlighted throughout:                      */
/*    Bella Cucina  — high cleanliness culture                         */
/*    Corner Diner  — low cleanliness culture                          */
/* ================================================================== */

function fmt(x, d = 1) {
  return Number(x).toFixed(d);
}

/* ------------------------------------------------------------------ */
/*  Seeded RNG                                                         */
/* ------------------------------------------------------------------ */

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxMuller(rng) {
  const u1 = rng() || 1e-10;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function logistic(x) {
  return 1 / (1 + Math.exp(-x));
}

/* ------------------------------------------------------------------ */
/*  Simulation engine                                                  */
/* ------------------------------------------------------------------ */

const TRUE_EFFECT = 5;
const N_RESTAURANTS = 50;
const T_PERIODS = 6;
const YEARS = [1, 2, 3, 4, 5, 6];

/**
 * Generate the full panel dataset.
 *
 * Each restaurant i has:
 *   culture_i ~ N(65, 10)   — unobserved time-invariant cleanliness culture
 *   grant_it  — assigned with higher probability for high-culture restaurants
 *               (confounding), staggered adoption starting at period 2
 *   score_it  = culture_i + TRUE_EFFECT * grant_it + time_trend_t + noise_it
 *   time_trend_t = (t-1) * timeTrendPerYear
 *   noise_it ~ N(0, 3)
 *
 * Returns { restaurants, obs }
 *   restaurants: array of N restaurant objects with metadata
 *   obs: flat array of N*T observation objects
 */
function generatePanel({ confoundingStrength = 2.0, timeTrend = 0, seed = 42 } = {}) {
  const rng = mulberry32(seed);

  const restaurants = [];
  for (let i = 0; i < N_RESTAURANTS; i++) {
    const culture = 65 + boxMuller(rng) * 10;
    const grantProb = logistic((culture - 65) * confoundingStrength * 0.15 - 0.5);
    let treated = false;
    const grantByPeriod = [];
    for (let t = 0; t < T_PERIODS; t++) {
      if (t === 0) {
        grantByPeriod.push(0);
      } else if (!treated) {
        if (rng() < grantProb) {
          treated = true;
        }
        grantByPeriod.push(treated ? 1 : 0);
      } else {
        grantByPeriod.push(1);
      }
    }
    restaurants.push({
      id: i,
      name: i === 0 ? "Bella Cucina" : i === 1 ? "Corner Diner" : `Restaurant ${i + 1}`,
      culture,
      grantByPeriod,
      isFocal: i === 0 || i === 1,
      color: i === 0 ? "#1e293b" : i === 1 ? "#94a3b8" : null,
    });
  }

  // Override focal restaurants for pedagogical clarity
  restaurants[0].culture = 72;
  restaurants[0].grantByPeriod = [0, 0, 1, 1, 1, 1];
  restaurants[1].culture = 50;
  restaurants[1].grantByPeriod = [0, 0, 0, 0, 0, 0];

  const obs = [];
  for (const r of restaurants) {
    const rawScores = [];
    for (let t = 0; t < T_PERIODS; t++) {
      const trend = t * timeTrend;
      const noise = boxMuller(rng) * 3;
      const score = r.culture + TRUE_EFFECT * r.grantByPeriod[t] + trend + noise;
      rawScores.push(score);
      obs.push({
        restaurantId: r.id,
        name: r.name,
        culture: r.culture,
        period: t,
        grant: r.grantByPeriod[t],
        score,
        isFocal: r.isFocal,
      });
    }
    r.scores = rawScores;
    r.scoreMean = rawScores.reduce((a, b) => a + b, 0) / T_PERIODS;
    r.demeanedScores = rawScores.map((s) => s - r.scoreMean);
  }

  return { restaurants, obs };
}

/**
 * Compute OLS slope of Y on D from a flat array of {score, grant} pairs.
 */
function olsSlope(pairs) {
  const n = pairs.length;
  if (n === 0) return 0;
  const mD = pairs.reduce((s, p) => s + p.grant, 0) / n;
  const mY = pairs.reduce((s, p) => s + p.score, 0) / n;
  const num = pairs.reduce((s, p) => s + (p.grant - mD) * (p.score - mY), 0);
  const den = pairs.reduce((s, p) => s + (p.grant - mD) ** 2, 0);
  return den > 1e-10 ? num / den : 0;
}

/**
 * Compute within (entity FE) estimator from a panel obs array.
 */
function feEstimator(obs) {
  const unitMeans = {};
  const unitGrantMeans = {};
  const counts = {};
  for (const o of obs) {
    unitMeans[o.restaurantId] = (unitMeans[o.restaurantId] || 0) + o.score;
    unitGrantMeans[o.restaurantId] = (unitGrantMeans[o.restaurantId] || 0) + o.grant;
    counts[o.restaurantId] = (counts[o.restaurantId] || 0) + 1;
  }
  for (const id in unitMeans) {
    unitMeans[id] /= counts[id];
    unitGrantMeans[id] /= counts[id];
  }
  const demeaned = obs.map((o) => ({
    score: o.score - unitMeans[o.restaurantId],
    grant: o.grant - unitGrantMeans[o.restaurantId],
  }));
  return olsSlope(demeaned);
}

/**
 * Compute Two-Way FE estimator: demean by unit AND period.
 */
function twfeEstimator(obs) {
  const unitSums = {};
  const unitGrantSums = {};
  const unitCounts = {};
  for (const o of obs) {
    unitSums[o.restaurantId] = (unitSums[o.restaurantId] || 0) + o.score;
    unitGrantSums[o.restaurantId] = (unitGrantSums[o.restaurantId] || 0) + o.grant;
    unitCounts[o.restaurantId] = (unitCounts[o.restaurantId] || 0) + 1;
  }
  for (const id in unitSums) {
    unitSums[id] /= unitCounts[id];
    unitGrantSums[id] /= unitCounts[id];
  }
  const periodSums = {};
  const periodGrantSums = {};
  const periodCounts = {};
  for (const o of obs) {
    periodSums[o.period] = (periodSums[o.period] || 0) + o.score;
    periodGrantSums[o.period] = (periodGrantSums[o.period] || 0) + o.grant;
    periodCounts[o.period] = (periodCounts[o.period] || 0) + 1;
  }
  for (const t in periodSums) {
    periodSums[t] /= periodCounts[t];
    periodGrantSums[t] /= periodCounts[t];
  }
  const grandMeanScore = obs.reduce((s, o) => s + o.score, 0) / obs.length;
  const grandMeanGrant = obs.reduce((s, o) => s + o.grant, 0) / obs.length;

  const demeaned = obs.map((o) => ({
    score: o.score - unitSums[o.restaurantId] - periodSums[o.period] + grandMeanScore,
    grant: o.grant - unitGrantSums[o.restaurantId] - periodGrantSums[o.period] + grandMeanGrant,
  }));
  return olsSlope(demeaned);
}

/* ------------------------------------------------------------------ */
/*  Base dataset — no time trend, used by steps 0, 2, 3, 5            */
/* ------------------------------------------------------------------ */

const BASE_PANEL = generatePanel({ confoundingStrength: 2.0, timeTrend: 0, seed: 42 });

/* ------------------------------------------------------------------ */
/*  SVG chart constants                                                 */
/* ------------------------------------------------------------------ */

const W = 460;
const H = 195;
const PAD = { top: 18, right: 20, bottom: 36, left: 52 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function scaleX(tIdx, nPeriods) {
  return PAD.left + (tIdx / (nPeriods - 1)) * PW;
}

function scaleY(val, yMin, yMax) {
  return PAD.top + PH - ((val - yMin) / (yMax - yMin)) * PH;
}

function YAxis({ ticks, yMin, yMax, label }) {
  return (
    <>
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} />
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} x2={W - PAD.right}
            y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)}
            stroke="#f1f5f9" strokeWidth={0.5}
          />
          <text x={PAD.left - 5} y={scaleY(v, yMin, yMax) + 4} textAnchor="end" fontSize={9} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      {label && (
        <text
          x={10} y={PAD.top + PH / 2} textAnchor="middle" fontSize={9} fill="#94a3b8"
          transform={`rotate(-90, 10, ${PAD.top + PH / 2})`}
        >
          {label}
        </text>
      )}
    </>
  );
}

function XAxisYears({ nPeriods }) {
  return (
    <>
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} />
      {YEARS.slice(0, nPeriods).map((yr, i) => (
        <text key={yr} x={scaleX(i, nPeriods)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">
          Yr {yr}
        </text>
      ))}
    </>
  );
}

/* ================================================================== */
/*  Step 0 chart — Culture distribution histogram                      */
/* ================================================================== */

function CultureHistogram({ restaurants }) {
  const bins = useMemo(() => {
    const min = 35, max = 95, nBins = 10;
    const width = (max - min) / nBins;
    const counts = new Array(nBins).fill(0);
    for (const r of restaurants) {
      const idx = Math.min(Math.floor((r.culture - min) / width), nBins - 1);
      counts[idx]++;
    }
    return counts.map((c, i) => ({ lo: min + i * width, hi: min + (i + 1) * width, count: c }));
  }, [restaurants]);

  const maxCount = Math.max(...bins.map((b) => b.count));
  const yMin = 0, yMax = maxCount + 1;
  const xMin = 35, xMax = 95;
  const yTicks = [0, 2, 4, 6, 8].filter((v) => v <= yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        distribution of cleanliness culture across 50 restaurants
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label="Count" />
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} />

      {bins.map((b, i) => {
        const xL = PAD.left + ((b.lo - xMin) / (xMax - xMin)) * PW;
        const xR = PAD.left + ((b.hi - xMin) / (xMax - xMin)) * PW;
        const yTop = scaleY(b.count, yMin, yMax);
        const yBot = scaleY(0, yMin, yMax);
        return (
          <rect key={i} x={xL + 1} y={yTop} width={xR - xL - 2} height={yBot - yTop}
            fill="#1e293b" opacity={0.55} rx={1} />
        );
      })}

      {[{ culture: 72, label: "Bella", color: "#1e293b" }, { culture: 50, label: "Corner", color: "#94a3b8" }].map(({ culture, label, color }) => (
        <g key={label}>
          <line
            x1={PAD.left + ((culture - xMin) / (xMax - xMin)) * PW}
            x2={PAD.left + ((culture - xMin) / (xMax - xMin)) * PW}
            y1={PAD.top} y2={H - PAD.bottom}
            stroke={color} strokeWidth={1.5} strokeDasharray="4,2"
          />
          <text
            x={PAD.left + ((culture - xMin) / (xMax - xMin)) * PW + 3}
            y={PAD.top + 10} fontSize={8} fill={color}
          >
            {label}
          </text>
        </g>
      ))}

      {[40, 50, 60, 70, 80, 90].map((v) => (
        <text key={v} x={PAD.left + ((v - xMin) / (xMax - xMin)) * PW}
          y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">
          {v}
        </text>
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="#94a3b8">culture score</text>
    </svg>
  );
}

/* ================================================================== */
/*  Step 1 chart — Cross-section scatter: score vs grant status        */
/* ================================================================== */

function CrossSectionScatter({ obs, periodIdx, naiveBeta, naiveAlpha, trueEffect }) {
  const periodObs = useMemo(() => obs.filter((o) => o.period === periodIdx), [obs, periodIdx]);
  const yMin = 25, yMax = 110;
  const yTicks = [30, 50, 70, 90];

  const treatedObs = periodObs.filter((o) => o.grant === 1);
  const untreatedObs = periodObs.filter((o) => o.grant === 0);

  function xPos(grant, idx, groupSize) {
    const base = PAD.left + (grant === 1 ? 0.72 : 0.28) * PW;
    const spread = 32;
    return base + (idx - (groupSize - 1) / 2) * (spread / Math.max(groupSize - 1, 1));
  }

  const x0Px = PAD.left + 0.28 * PW;
  const x1Px = PAD.left + 0.72 * PW;
  const y0Px = scaleY(naiveAlpha, yMin, yMax);
  const y1Px = scaleY(naiveAlpha + naiveBeta, yMin, yMax);

  const untreatedMeanScore = untreatedObs.length > 0
    ? untreatedObs.reduce((s, o) => s + o.score, 0) / untreatedObs.length
    : 60;
  const trueY0Px = scaleY(untreatedMeanScore, yMin, yMax);
  const trueY1Px = scaleY(untreatedMeanScore + trueEffect, yMin, yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        cross-section at year {periodIdx + 1}: score vs. grant status
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label="Score" />
      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} />
      <text x={PAD.left + 0.28 * PW} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">No grant</text>
      <text x={PAD.left + 0.72 * PW} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">Received grant</text>

      {untreatedObs.map((o, i) => (
        <circle key={i} cx={xPos(0, i, untreatedObs.length)} cy={scaleY(o.score, yMin, yMax)}
          r={3} fill="#94a3b8" opacity={0.6} />
      ))}
      {treatedObs.map((o, i) => (
        <circle key={i} cx={xPos(1, i, treatedObs.length)} cy={scaleY(o.score, yMin, yMax)}
          r={3} fill="#1e293b" opacity={0.6} />
      ))}

      <line x1={x0Px} x2={x1Px} y1={y0Px} y2={y1Px} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3" />
      <line x1={x0Px} x2={x1Px} y1={trueY0Px} y2={trueY1Px} stroke="#10b981" strokeWidth={2} />

      <g transform={`translate(${PAD.left + 4}, ${H - 8})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4,2" />
        <text x={17} y={3} fontSize={9} fill="#475569">Naive OLS ({fmt(naiveBeta, 1)} pts)</text>
      </g>
      <g transform={`translate(${PAD.left + 170}, ${H - 8})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#10b981" strokeWidth={2} />
        <text x={17} y={3} fontSize={9} fill="#475569">True grant effect ({fmt(trueEffect, 0)} pts)</text>
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  Step 2 chart — Focal line chart (Bella vs Corner)                  */
/* ================================================================== */

function FocalLineChart({ restaurants, mode }) {
  const focalRests = restaurants.filter((r) => r.isFocal);
  const isRaw = mode === "raw";
  const yMin = isRaw ? 30 : -18;
  const yMax = isRaw ? 105 : 22;
  const yTicks = isRaw ? [40, 55, 70, 85, 100] : [-15, -5, 5, 15];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        {isRaw ? "raw inspection scores — focal restaurants" : "demeaned scores (within transformation)"}
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label={isRaw ? "Score" : "Demeaned"} />
      <XAxisYears nPeriods={T_PERIODS} />

      {!isRaw && (
        <line x1={PAD.left} x2={W - PAD.right} y1={scaleY(0, yMin, yMax)} y2={scaleY(0, yMin, yMax)}
          stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4,2" />
      )}

      {focalRests.map((r) => {
        const vals = isRaw ? r.scores : r.demeanedScores;
        const pts = vals.map((v, i) => [scaleX(i, T_PERIODS), scaleY(v, yMin, yMax)]);
        const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
        return (
          <g key={r.id}>
            <path d={d} fill="none" stroke={r.color} strokeWidth={2} />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3.5} fill={r.color} />
            ))}
            {isRaw && r.grantByPeriod.map((g, i) =>
              g === 1 && (r.grantByPeriod[i - 1] === 0 || i === 0) ? (
                <text key={i} x={scaleX(i, T_PERIODS)} y={scaleY(vals[i], yMin, yMax) - 8}
                  textAnchor="middle" fontSize={8} fill={r.color}>grant</text>
              ) : null
            )}
          </g>
        );
      })}

      {focalRests.map((r, ri) => (
        <g key={r.id} transform={`translate(${PAD.left + ri * 148}, ${H - 8})`}>
          <rect width={10} height={3} y={-1.5} fill={r.color} rx={1} />
          <text x={13} y={3} fontSize={9} fill="#475569">{r.name}</text>
        </g>
      ))}
    </svg>
  );
}

/* ================================================================== */
/*  Step 2 chart — Spaghetti plot: all 50 trajectories (raw/demeaned) */
/* ================================================================== */

function SpaghettiPlot({ restaurants, mode }) {
  const isRaw = mode === "raw";
  const yMin = isRaw ? 30 : -22;
  const yMax = isRaw ? 105 : 22;
  const yTicks = isRaw ? [40, 55, 70, 85, 100] : [-15, -5, 5, 15];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        {isRaw ? "all 50 restaurants — raw trajectories" : "all 50 restaurants — after demeaning"}
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label={isRaw ? "Score" : "Demeaned"} />
      <XAxisYears nPeriods={T_PERIODS} />

      {!isRaw && (
        <line x1={PAD.left} x2={W - PAD.right} y1={scaleY(0, yMin, yMax)} y2={scaleY(0, yMin, yMax)}
          stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4,2" />
      )}

      {/* Background restaurants — thin, faded */}
      {restaurants.filter((r) => !r.isFocal).map((r) => {
        const vals = isRaw ? r.scores : r.demeanedScores;
        const d = vals.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i, T_PERIODS)},${scaleY(v, yMin, yMax)}`).join(" ");
        return <path key={r.id} d={d} fill="none" stroke="#94a3b8" strokeWidth={0.8} opacity={0.18} />;
      })}

      {/* Focal restaurants — thick, fully visible */}
      {restaurants.filter((r) => r.isFocal).map((r) => {
        const vals = isRaw ? r.scores : r.demeanedScores;
        const pts = vals.map((v, i) => [scaleX(i, T_PERIODS), scaleY(v, yMin, yMax)]);
        const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
        return (
          <g key={r.id}>
            <path d={d} fill="none" stroke={r.color} strokeWidth={2} />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={2.5} fill={r.color} />
            ))}
          </g>
        );
      })}

      {/* Legend */}
      {restaurants.filter((r) => r.isFocal).map((r, ri) => (
        <g key={r.id} transform={`translate(${PAD.left + ri * 130}, ${H - 8})`}>
          <rect width={10} height={3} y={-1.5} fill={r.color} rx={1} />
          <text x={13} y={3} fontSize={9} fill="#475569">{r.name}</text>
        </g>
      ))}
      <g transform={`translate(${PAD.left + 270}, ${H - 8})`}>
        <line x1={0} x2={10} y1={0} y2={0} stroke="#94a3b8" strokeWidth={0.8} opacity={0.4} />
        <text x={13} y={3} fontSize={9} fill="#94a3b8">48 other restaurants</text>
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  Step 3 chart — Demeaned score vs demeaned grant (entity FE)        */
/* ================================================================== */

function WithinScatterChart({ obs, feSlope }) {
  const demeaned = useMemo(() => {
    const unitSums = {}, unitGrantSums = {}, unitCounts = {};
    for (const o of obs) {
      unitSums[o.restaurantId] = (unitSums[o.restaurantId] || 0) + o.score;
      unitGrantSums[o.restaurantId] = (unitGrantSums[o.restaurantId] || 0) + o.grant;
      unitCounts[o.restaurantId] = (unitCounts[o.restaurantId] || 0) + 1;
    }
    for (const id in unitSums) {
      unitSums[id] /= unitCounts[id];
      unitGrantSums[id] /= unitCounts[id];
    }
    return obs.map((o) => ({
      dY: o.score - unitSums[o.restaurantId],
      dD: o.grant - unitGrantSums[o.restaurantId],
      isFocal: o.isFocal,
    }));
  }, [obs]);

  const yMin = -25, yMax = 25;
  const xMin = -0.7, xMax = 0.7;
  const yTicks = [-20, -10, 0, 10, 20];

  function px(dD) {
    return PAD.left + ((dD - xMin) / (xMax - xMin)) * PW;
  }
  function py(dY) {
    return scaleY(dY, yMin, yMax);
  }

  const lineX0 = xMin, lineX1 = xMax;
  const lineY0 = feSlope * lineX0, lineY1 = feSlope * lineX1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        demeaned score vs. demeaned grant — within estimator
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label="Score − mean" />

      <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} />
      {[-0.5, 0, 0.5].map((v) => (
        <g key={v}>
          <text x={px(v)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#64748b">{v.toFixed(1)}</text>
          <line x1={px(v)} x2={px(v)} y1={PAD.top} y2={H - PAD.bottom} stroke="#f1f5f9" strokeWidth={0.5} />
        </g>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={py(0)} y2={py(0)} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4,2" />
      <line x1={px(0)} x2={px(0)} y1={PAD.top} y2={H - PAD.bottom} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4,2" />

      {demeaned.map((d, i) => (
        <circle key={i} cx={px(d.dD)} cy={py(d.dY)} r={d.isFocal ? 4 : 2.5}
          fill={d.isFocal ? "#f59e0b" : "#1e293b"} opacity={d.isFocal ? 0.9 : 0.35} />
      ))}

      <line x1={px(lineX0)} x2={px(lineX1)} y1={py(lineY0)} y2={py(lineY1)}
        stroke="#10b981" strokeWidth={2} />

      <g transform={`translate(${PAD.left + 4}, ${H - 6})`}>
        <circle cx={5} cy={0} r={3} fill="#f59e0b" opacity={0.9} />
        <text x={12} y={3} fontSize={9} fill="#475569">Bella / Corner</text>
      </g>
      <g transform={`translate(${PAD.left + 110}, ${H - 6})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#10b981" strokeWidth={2} />
        <text x={17} y={3} fontSize={9} fill="#475569">FE slope = {fmt(feSlope, 2)}</text>
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  Step 4 chart — Year-by-year average scores with time trend         */
/* ================================================================== */

function TimeTrendChart({ obs, timeTrend }) {
  const yearMeans = useMemo(() => {
    return YEARS.map((_, t) => {
      const periodObs = obs.filter((o) => o.period === t);
      return periodObs.reduce((s, o) => s + o.score, 0) / periodObs.length;
    });
  }, [obs]);

  const yMin = 40, yMax = 110;
  const yTicks = [50, 60, 70, 80, 90, 100];

  const trendBase = yearMeans[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        year-by-year average inspection score (N=50 restaurants)
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label="Avg score" />
      <XAxisYears nPeriods={T_PERIODS} />

      <line
        x1={scaleX(0, T_PERIODS)} x2={scaleX(T_PERIODS - 1, T_PERIODS)}
        y1={scaleY(trendBase, yMin, yMax)} y2={scaleY(trendBase + (T_PERIODS - 1) * timeTrend, yMin, yMax)}
        stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6,3"
      />

      <path
        d={yearMeans.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i, T_PERIODS)},${scaleY(v, yMin, yMax)}`).join(" ")}
        fill="none" stroke="#1e293b" strokeWidth={2}
      />
      {yearMeans.map((v, i) => (
        <circle key={i} cx={scaleX(i, T_PERIODS)} cy={scaleY(v, yMin, yMax)} r={3.5} fill="#1e293b" />
      ))}

      <g transform={`translate(${PAD.left + 4}, ${H - 8})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#1e293b" strokeWidth={2} />
        <text x={17} y={3} fontSize={9} fill="#475569">Observed avg score</text>
      </g>
      <g transform={`translate(${PAD.left + 165}, ${H - 8})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2" />
        <text x={17} y={3} fontSize={9} fill="#475569">Time trend (+{timeTrend} pts/yr)</text>
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  Step 5 chart — Time-varying confounder "what if" for Bella Cucina */
/* ================================================================== */

const RENOVATION_EFFECT = 8;

function ConfounderWhatIfChart({ bellaScores }) {
  const yMin = 55, yMax = 100;
  const yTicks = [60, 70, 80, 90];

  // Hypothetical: Bella also gets an 8-pt renovation at Yr 3 (period index 2)
  const hypoScores = bellaScores.map((s, t) => t >= 2 ? s + RENOVATION_EFFECT : s);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={10} textAnchor="middle" fontSize={10} fill="#94a3b8">
        Bella Cucina: grant only vs. grant + renovation
      </text>
      <YAxis ticks={yTicks} yMin={yMin} yMax={yMax} label="Score" />
      <XAxisYears nPeriods={T_PERIODS} />

      {/* Shaded region between the two lines from Year 3 onward */}
      {(() => {
        const pts = [];
        for (let t = 2; t < T_PERIODS; t++) {
          pts.push([scaleX(t, T_PERIODS), scaleY(hypoScores[t], yMin, yMax)]);
        }
        for (let t = T_PERIODS - 1; t >= 2; t--) {
          pts.push([scaleX(t, T_PERIODS), scaleY(bellaScores[t], yMin, yMax)]);
        }
        const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + " Z";
        return <path d={d} fill="#f59e0b" opacity={0.12} />;
      })()}

      {/* Actual trajectory (grant only) */}
      <path
        d={bellaScores.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i, T_PERIODS)},${scaleY(v, yMin, yMax)}`).join(" ")}
        fill="none" stroke="#1e293b" strokeWidth={2}
      />
      {bellaScores.map((v, i) => (
        <circle key={i} cx={scaleX(i, T_PERIODS)} cy={scaleY(v, yMin, yMax)} r={3} fill="#1e293b" />
      ))}

      {/* Hypothetical trajectory (grant + renovation) */}
      <path
        d={hypoScores.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i, T_PERIODS)},${scaleY(v, yMin, yMax)}`).join(" ")}
        fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6,3"
      />
      {hypoScores.map((v, i) => (
        <circle key={i} cx={scaleX(i, T_PERIODS)} cy={scaleY(v, yMin, yMax)} r={3}
          fill="#f59e0b" opacity={i >= 2 ? 0.9 : 0.4} />
      ))}

      {/* Annotation: bracket showing the 8-pt renovation gap */}
      {(() => {
        const t = 4; // Year 5
        const xPx = scaleX(t, T_PERIODS) + 14;
        const yActual = scaleY(bellaScores[t], yMin, yMax);
        const yHypo = scaleY(hypoScores[t], yMin, yMax);
        return (
          <g>
            <line x1={xPx} x2={xPx} y1={yActual} y2={yHypo} stroke="#f59e0b" strokeWidth={1} />
            <line x1={xPx - 3} x2={xPx + 3} y1={yActual} y2={yActual} stroke="#f59e0b" strokeWidth={1} />
            <line x1={xPx - 3} x2={xPx + 3} y1={yHypo} y2={yHypo} stroke="#f59e0b" strokeWidth={1} />
            <text x={xPx + 6} y={(yActual + yHypo) / 2 + 3} fontSize={8} fill="#d97706">
              +{RENOVATION_EFFECT} pts
            </text>
          </g>
        );
      })()}

      {/* "grant starts" annotation */}
      <line
        x1={scaleX(2, T_PERIODS)} x2={scaleX(2, T_PERIODS)}
        y1={PAD.top} y2={H - PAD.bottom}
        stroke="#cbd5e1" strokeWidth={0.5} strokeDasharray="3,2"
      />
      <text x={scaleX(2, T_PERIODS) + 3} y={PAD.top + 8} fontSize={7} fill="#94a3b8">grant starts</text>

      <g transform={`translate(${PAD.left + 4}, ${H - 8})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#1e293b" strokeWidth={2} />
        <text x={17} y={3} fontSize={9} fill="#475569">Grant only (reality)</text>
      </g>
      <g transform={`translate(${PAD.left + 160}, ${H - 8})`}>
        <line x1={0} x2={14} y1={0} y2={0} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4,2" />
        <text x={17} y={3} fontSize={9} fill="#475569">Grant + renovation (what-if)</text>
      </g>
    </svg>
  );
}

/* ================================================================== */
/*  LESSONS                                                            */
/* ================================================================== */

const LESSONS = [
  "Why Track Units Over Time?",
  "The Confounding Problem",
  "The Within Transformation",
  "Fixed Effects in Action",
  "Adding Time Effects",
  "When Fixed Effects Fail",
  "Quiz",
];

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function PanelDataTutorial() {
  const [confoundingStrength, setConfoundingStrength] = useState(2.0);
  const [showDemeaned, setShowDemeaned] = useState(false);
  const [timeTrend, setTimeTrend] = useState(2);
  const [showTWFE, setShowTWFE] = useState(false);

  /* ------------------------------------------------------------------ */
  /*  Stable data from BASE_PANEL — used by steps 0, 2, 3, 5           */
  /* ------------------------------------------------------------------ */

  const { restaurants, obs } = BASE_PANEL;
  const bellaData = restaurants[0];
  const cornerData = restaurants[1];

  /* ------------------------------------------------------------------ */
  /*  Step 1 — own reactive panel driven by confounding slider          */
  /* ------------------------------------------------------------------ */

  const step1Panel = useMemo(
    () => generatePanel({ confoundingStrength, timeTrend: 0, seed: 42 }),
    [confoundingStrength]
  );

  const step1CrossSection = useMemo(
    () => step1Panel.obs.filter((o) => o.period === 3),
    [step1Panel]
  );

  const naiveCSOLS = useMemo(() => {
    const pairs = step1CrossSection;
    const n = pairs.length;
    if (n === 0) return { beta: 0, alpha: 0 };
    const mD = pairs.reduce((s, o) => s + o.grant, 0) / n;
    const mY = pairs.reduce((s, o) => s + o.score, 0) / n;
    const num = pairs.reduce((s, o) => s + (o.grant - mD) * (o.score - mY), 0);
    const den = pairs.reduce((s, o) => s + (o.grant - mD) ** 2, 0);
    const beta = den > 1e-10 ? num / den : 0;
    const alpha = mY - beta * mD;
    return { beta, alpha };
  }, [step1CrossSection]);

  const csBias = naiveCSOLS.beta - TRUE_EFFECT;

  /* ------------------------------------------------------------------ */
  /*  Steps 2–3 — derived from stable BASE_PANEL                       */
  /* ------------------------------------------------------------------ */

  const pooledBeta = useMemo(
    () => olsSlope(obs.map((o) => ({ grant: o.grant, score: o.score }))),
    [obs]
  );
  const entityFEBeta = useMemo(() => feEstimator(obs), [obs]);

  /* ------------------------------------------------------------------ */
  /*  Step 4 — own reactive panel driven by time trend slider           */
  /* ------------------------------------------------------------------ */

  const step4Panel = useMemo(
    () => generatePanel({ confoundingStrength: 2.0, timeTrend, seed: 42 }),
    [timeTrend]
  );

  const step4EntityFE = useMemo(() => feEstimator(step4Panel.obs), [step4Panel]);
  const step4TWFE = useMemo(() => twfeEstimator(step4Panel.obs), [step4Panel]);

  return (
    <TutorialShell
      title="Panel Data & Fixed Effects"
      description="Use the within-unit transformation to eliminate unmeasured time-invariant confounders and recover unbiased causal estimates."
      intro={
        <>
          <p>
            Cross-sectional studies compare different units at a single point in time. But when
            some units are <em>inherently</em> different — in ways we cannot measure — those
            comparisons are confounded from the start. <strong>Panel data</strong> follows the
            same units across multiple time periods, so each unit acts as its own control.
          </p>
          <p>
            The <strong>fixed effects estimator</strong> exploits this structure by stripping out
            everything constant within a unit over time. What remains is pure within-unit
            variation — and that is where the causal signal lives.
          </p>
        </>
      }
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ============================================================ */}
          {/* Step 0 — Why Track Units Over Time?                          */}
          {/* ============================================================ */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TableProperties className="h-4 w-4 text-slate-500" />
                    From Cross-Section to Panel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    A <strong>cross-sectional dataset</strong> captures one snapshot per unit.
                    A <strong>panel dataset</strong> captures multiple observations per unit
                    across time, indexed by both a unit identifier <Tex math="i" /> and a time
                    period <Tex math="t" />. The city health department in our example tracks
                    N=50 restaurants across T=6 annual inspection visits.
                  </p>
                  <p>
                    Some restaurants receive a city hygiene grant intended to raise their scores.
                    A naive cross-section would show that grant recipients score higher — but
                    that likely reflects a pre-existing <strong>cleanliness culture</strong>{" "}
                    <Tex math="u_i" />, not the grant. Look at the histogram on the right: culture
                    varies widely across our 50 restaurants, and this variation is entirely
                    unobserved by the econometrician.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <InfoBox title="Panel notation" variant="formula">
                        We index outcomes as <Tex math="Y_{it}" /> — the inspection score of
                        restaurant <Tex math="i" /> in year <Tex math="t" />. Treatment{" "}
                        <Tex math="D_{it} = 1" /> if the restaurant held a grant that year.
                        The true data-generating process is:
                        <div className="mt-2">
                          <Tex
                            math="Y_{it} = \beta D_{it} + \gamma\, u_i + \varepsilon_{it}"
                            display
                          />
                        </div>
                        where <Tex math="u_i" /> is unobserved cleanliness culture — constant
                        over time for each restaurant, but correlated with grant uptake. Fixed
                        effects will eliminate <Tex math="u_i" /> by comparing each restaurant
                        to itself.
                      </InfoBox>
                      <div className="grid gap-3 grid-cols-3">
                        <StatCard label="Restaurants (i)" value="50 units" formula={"i = 1, \\ldots, 50"} />
                        <StatCard label="Annual visits (t)" value="6 periods" formula={"t = 1, \\ldots, 6"} />
                        <StatCard label="Total observations" value="300 rows" formula={"50 \\times 6"} />
                      </div>

                      <div className="rounded-lg border bg-white p-3 text-sm">
                        <p className="text-[10px] text-slate-400 mb-2 text-center">
                          Two focal restaurants (years 1–3 shown)
                        </p>
                        <table className="w-full text-xs text-slate-700 border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 pr-2 font-medium text-slate-500">Restaurant</th>
                              <th className="text-center py-1 px-1 font-medium text-slate-500">Yr 1</th>
                              <th className="text-center py-1 px-1 font-medium text-slate-500">Yr 2</th>
                              <th className="text-center py-1 px-1 font-medium text-slate-500">Yr 3</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            <tr>
                              <td className="py-1.5 pr-2 font-medium">Bella Cucina</td>
                              <td className="text-center py-1.5 px-1">{fmt(bellaData.scores[0], 0)} (no)</td>
                              <td className="text-center py-1.5 px-1">{fmt(bellaData.scores[1], 0)} (no)</td>
                              <td className="text-center py-1.5 px-1">{fmt(bellaData.scores[2], 0)} ✓</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-2 font-medium">Corner Diner</td>
                              <td className="text-center py-1.5 px-1">{fmt(cornerData.scores[0], 0)} (no)</td>
                              <td className="text-center py-1.5 px-1">{fmt(cornerData.scores[1], 0)} (no)</td>
                              <td className="text-center py-1.5 px-1">{fmt(cornerData.scores[2], 0)} (no)</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-[10px] text-slate-400 mt-2">
                          ✓ = grant received. Each row is one restaurant-year.
                        </p>
                      </div>
                    </div>

                    <CultureHistogram restaurants={BASE_PANEL.restaurants} />
                  </div>

                  <InfoBox variant="dark">
                    The histogram reveals a crucial fact: culture scores span roughly 40 to 90 points
                    across our 50 restaurants. This unobserved heterogeneity dwarfs the true grant
                    effect of {TRUE_EFFECT} points. Any cross-sectional comparison that ignores
                    culture will be swamped by this variation. Panel data lets each restaurant
                    serve as its own control, bypassing the problem entirely.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 1 — The Confounding Problem                             */}
          {/* ============================================================ */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    The Confounding Problem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Restaurant <Tex math="i" /> has an unobserved <strong>cleanliness
                    culture</strong> <Tex math="u_i" /> that is both a cause of its inspection
                    score and a driver of grant uptake. The data-generating process is:
                  </p>
                  <Tex
                    math="Y_{it} = \beta D_{it} + \gamma u_i + \varepsilon_{it}, \quad u_i \perp\!\!\!\not\perp D_{it}"
                    display
                  />
                  <p>
                    Because <Tex math="u_i" /> is unobserved and correlated with{" "}
                    <Tex math="D_{it}" />, pooled OLS conflates the grant effect with the
                    culture advantage. Below, all 50 restaurants are plotted in a single
                    cross-section. Drag the <em>confounding strength</em> slider to see
                    how sorting by culture inflates the naive estimate.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <LabeledSlider
                        label="Confounding strength"
                        value={[confoundingStrength]}
                        displayValue={confoundingStrength === 0 ? "None" : confoundingStrength <= 1 ? "Weak" : confoundingStrength <= 2.5 ? "Moderate" : "Strong"}
                        onValueChange={([v]) => setConfoundingStrength(v)}
                        min={0}
                        max={4}
                        step={0.5}
                      />
                      <div className="grid gap-3 grid-cols-2">
                        <StatCard
                          label="Naive OLS estimate"
                          value={`+${fmt(naiveCSOLS.beta, 1)} pts`}
                          formula={"\\hat{\\beta}_{\\text{OLS}}"}
                        />
                        <StatCard
                          label="True grant effect"
                          value={`+${TRUE_EFFECT} pts`}
                          formula={"\\beta = 5"}
                        />
                      </div>
                      <StatCard
                        label="Upward bias"
                        value={`+${fmt(Math.max(0, csBias), 1)} pts`}
                        formula={"\\hat{\\beta}_{\\text{OLS}} - \\beta"}
                      />
                      <InfoBox variant="warning" title="Culture inflates the estimate">
                        With moderate confounding the naive estimate reaches{" "}
                        {fmt(naiveCSOLS.beta, 1)} pts — well above the true {TRUE_EFFECT} pts.
                        High-culture restaurants cluster in the top-right (high score, got grant),
                        low-culture in the bottom-left. OLS mistakes culture for the grant.
                      </InfoBox>
                    </div>

                    <CrossSectionScatter
                      obs={step1Panel.obs}
                      periodIdx={3}
                      naiveBeta={naiveCSOLS.beta}
                      naiveAlpha={naiveCSOLS.alpha}
                      trueEffect={TRUE_EFFECT}
                    />
                  </div>

                  <InfoBox variant="formula" title="Omitted variable bias — the algebra">
                    <p className="mt-1">
                      The true model is <Tex math="Y_{it} = \beta D_{it} + \gamma u_i + \varepsilon_{it}" />.
                      Running OLS without <Tex math="u_i" /> yields:
                    </p>
                    <div className="mt-2">
                      <Tex
                        math="\hat\beta_{\text{OLS}} \;\xrightarrow{p}\; \beta \;+\; \gamma\,\frac{\text{Cov}(D_{it},\, u_i)}{\text{Var}(D_{it})}"
                        display
                      />
                    </div>
                    <p className="mt-1">
                      The second term is the bias. Because high-culture restaurants are more likely
                      to hold grants, <Tex math="\text{Cov}(D, u) > 0" />, so the bias is positive.
                    </p>
                    <p className="mt-1">
                      In our data: <Tex math={`\\hat\\beta_{\\text{OLS}} = ${fmt(naiveCSOLS.beta, 1)}`} />,{" "}
                      true <Tex math="\beta = 5.0" />, so bias{" "}
                      <Tex math={`= ${fmt(naiveCSOLS.beta, 1)} - 5.0 = {+}${fmt(csBias, 1)}`} /> pts.
                      The fix: compare each restaurant to <em>itself</em> over time. That is fixed effects.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 2 — The Within Transformation                           */}
          {/* ============================================================ */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                    Demeaning Removes Unit-Level Confounders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The elegance of panel data is algebraic. Write the model for observation{" "}
                    <Tex math="(i, t)" /> and then for its time-average:
                  </p>
                  <Tex
                    math="Y_{it} = \beta\, D_{it} + \gamma\, u_i + \varepsilon_{it}"
                    display
                  />
                  <Tex
                    math="\bar{Y}_{i} = \beta\, \bar{D}_{i} + \gamma\, u_i + \bar{\varepsilon}_{i}"
                    display
                  />
                  <p>
                    Subtract the second from the first. Because <Tex math="u_i" /> is constant
                    across time, <Tex math="\gamma u_i - \gamma u_i = 0" />:
                  </p>
                  <Tex
                    math="\underbrace{Y_{it} - \bar{Y}_i}_{\ddot{Y}_{it}} = \beta\underbrace{(D_{it} - \bar{D}_i)}_{\ddot{D}_{it}} + \underbrace{(\varepsilon_{it} - \bar{\varepsilon}_i)}_{\ddot{\varepsilon}_{it}}"
                    display
                  />
                  <p>
                    The confounder is gone. Regressing <Tex math="\ddot{Y}_{it}" /> on{" "}
                    <Tex math="\ddot{D}_{it}" /> recovers an unbiased <Tex math="\hat\beta" />,
                    provided no <em>time-varying</em> confounders remain.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowDemeaned(false)}
                          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                            !showDemeaned
                              ? "bg-slate-800 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Raw scores
                        </button>
                        <button
                          onClick={() => setShowDemeaned(true)}
                          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                            showDemeaned
                              ? "bg-slate-800 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          After demeaning
                        </button>
                      </div>

                      <div className="grid gap-3 grid-cols-2">
                        <StatCard
                          label="Bella Cucina mean"
                          value={`${fmt(bellaData.scoreMean, 1)} pts`}
                          formula={"\\bar{Y}_{\\text{Bella}}"}
                        />
                        <StatCard
                          label="Corner Diner mean"
                          value={`${fmt(cornerData.scoreMean, 1)} pts`}
                          formula={"\\bar{Y}_{\\text{Corner}}"}
                        />
                      </div>

                      {!showDemeaned && (
                        <InfoBox variant="muted">
                          The raw chart shows a large level gap between Bella Cucina and Corner
                          Diner — that is culture, not the grant. Toggle to "After demeaning"
                          to watch the {fmt(bellaData.scoreMean - cornerData.scoreMean, 0)}-point
                          gap disappear.
                        </InfoBox>
                      )}
                      {showDemeaned && (
                        <InfoBox variant="success" title="Confounder eliminated">
                          After demeaning, both series sit near zero. The{" "}
                          {fmt(bellaData.scoreMean - cornerData.scoreMean, 0)}-point culture gap
                          vanishes entirely. The only remaining signal is the grant's effect
                          on Bella Cucina starting at Year 3.
                        </InfoBox>
                      )}

                      <InfoBox variant="formula" title="Hand calculation — Bella Cucina">
                        <p className="mt-1">
                          Raw scores (<Tex math="Y_{it}" />):{" "}
                          <Tex math={`(${bellaData.scores.map(s => fmt(s, 1)).join(',\\; ')})`} />.
                        </p>
                        <p className="mt-1">
                          Step 1 — mean: <Tex math={`\\bar{Y}_i = \\tfrac{1}{6}(${bellaData.scores.map(s => fmt(s, 1)).join(' + ')}) = ${fmt(bellaData.scoreMean, 1)}`} />.
                        </p>
                        <p className="mt-1">
                          Step 2 — subtract: <Tex math={`\\ddot{Y}_{it} = Y_{it} - ${fmt(bellaData.scoreMean, 1)}`} />{" "}
                          → <Tex math={`(${bellaData.demeanedScores.map(s => fmt(s, 1)).join(',\\; ')})`} />.
                        </p>
                        <p className="mt-1">
                          The culture component (<Tex math={`\\gamma u_i = ${fmt(bellaData.culture, 0)}`} />) is gone.
                          The jump at Yr 3 ({fmt(bellaData.demeanedScores[2] - bellaData.demeanedScores[1], 1)} pts)
                          isolates the grant effect.
                        </p>
                      </InfoBox>
                    </div>

                    <FocalLineChart restaurants={restaurants} mode={showDemeaned ? "demeaned" : "raw"} />
                  </div>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        The spaghetti plot on the right shows all 50 restaurants at once. In raw
                        mode, trajectories fan out across a 60-point range — each restaurant lives
                        at its own level, set by culture. After demeaning, every trajectory collapses
                        toward zero. The spread shrinks from 60+ points to roughly ±15.
                      </p>
                      <InfoBox variant="formula" title="Full-panel demeaning by hand">
                        <p className="mt-1">
                          Take any restaurant <Tex math="i" /> with scores <Tex math="(Y_{i1}, \ldots, Y_{i6})" />.
                        </p>
                        <p className="mt-1">
                          1. Compute <Tex math={`\\bar{Y}_i = \\frac{1}{6}\\sum_{t=1}^{6} Y_{it}`} />.
                        </p>
                        <p className="mt-1">
                          2. Subtract: <Tex math={`\\ddot{Y}_{it} = Y_{it} - \\bar{Y}_i`} /> for each year.
                        </p>
                        <p className="mt-1">
                          Each restaurant's line shifts to centre at zero, removing{" "}
                          <Tex math="\alpha_i" /> (culture). The only remaining vertical movement
                          is the grant effect and noise.
                        </p>
                      </InfoBox>
                    </div>
                    <SpaghettiPlot restaurants={restaurants} mode={showDemeaned ? "demeaned" : "raw"} />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 3 — Fixed Effects in Action                             */}
          {/* ============================================================ */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    Fixed Effects in Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The <strong>within estimator</strong> demeans every variable by its unit mean
                    and runs OLS on the transformed data. This is numerically equivalent to
                    including one dummy variable per restaurant (<strong>LSDV</strong>). Both
                    recover the same <Tex math="\hat\beta" />.
                  </p>

                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoBox variant="outline" title="Within estimator">
                      <Tex math="\ddot{Y}_{it} = \beta\,\ddot{D}_{it} + \ddot{\varepsilon}_{it}" display />
                      Demean, then OLS. Efficient for large <Tex math="N" />.
                    </InfoBox>
                    <InfoBox variant="outline" title="LSDV (dummy variables)">
                      <Tex math="Y_{it} = \alpha_i + \beta\,D_{it} + \varepsilon_{it}" display />
                      Each <Tex math="\hat\alpha_i" /> absorbs unit intercept.
                    </InfoBox>
                    <InfoBox variant="outline" title="First differences">
                      <Tex math="\Delta Y_{it} = \beta\,\Delta D_{it} + \Delta\varepsilon_{it}" display />
                      Subtract period <Tex math="t{-}1" /> from <Tex math="t" />.
                    </InfoBox>
                  </div>
                  <p className="text-sm text-slate-600">
                    All three are consistent estimators of <Tex math="\beta" /> under strict
                    exogeneity. Within and LSDV are numerically identical. First differences
                    uses consecutive changes instead of deviations from the mean — it also
                    kills <Tex math="\alpha_i" /> because{" "}
                    <Tex math="\alpha_i - \alpha_i = 0" />.
                  </p>

                  <InfoBox variant="formula" title="Within estimator by hand — Bella Cucina">
                    <p className="mt-1">
                      Grant status across 6 years: <Tex math="D_i = (0,0,1,1,1,1)" />.
                      Grant mean: <Tex math={`\\bar{D}_i = \\tfrac{4}{6} = ${fmt(4/6, 3)}`} />.
                    </p>
                    <p className="mt-1">
                      Demeaned grant: <Tex math={`\\ddot{D}_{it} = D_{it} - ${fmt(4/6, 3)}`} />{" "}
                      → <Tex math={`(${fmt(-4/6, 3)},\\, ${fmt(-4/6, 3)},\\, ${fmt(1-4/6, 3)},\\, ${fmt(1-4/6, 3)},\\, ${fmt(1-4/6, 3)},\\, ${fmt(1-4/6, 3)})`} />.
                    </p>
                    <p className="mt-1">
                      Score mean: <Tex math={`\\bar{Y}_i = ${fmt(bellaData.scoreMean, 1)}`} />.
                      Demeaned scores: <Tex math={`(${bellaData.demeanedScores.map(s => fmt(s, 1)).join(',\\, ')})`} />.
                    </p>
                    <p className="mt-1">
                      The within estimator regresses demeaned scores on demeaned grants across{" "}
                      <em>all</em> 50 restaurants. The emerald line in the chart is the
                      slope: <Tex math={`\\hat\\beta_{\\text{FE}} = ${fmt(entityFEBeta, 2)}`} />.
                    </p>
                  </InfoBox>

                  <InfoBox variant="formula" title="First differences by hand — Bella Cucina">
                    <p className="mt-1">
                      Year-to-year score changes (<Tex math="\Delta Y_{it} = Y_{it} - Y_{i,t-1}" />):
                    </p>
                    <p className="mt-1">
                      <Tex math={`(${bellaData.scores.slice(1).map((s, i) => fmt(s - bellaData.scores[i], 1)).join(',\\; ')})`} />
                    </p>
                    <p className="mt-1">
                      Grant changes (<Tex math="\Delta D_{it}" />): <Tex math="(0,\, 1,\, 0,\, 0,\, 0)" />.
                      Only one transition — Bella Cucina adopts the grant at Year 3.
                    </p>
                    <p className="mt-1">
                      The Yr 2→3 score jump is{" "}
                      <Tex math={`\\Delta Y = ${fmt(bellaData.scores[2], 1)} - ${fmt(bellaData.scores[1], 1)} = ${fmt(bellaData.scores[2] - bellaData.scores[1], 1)}`} /> pts.
                      This single-restaurant difference captures the grant effect plus noise.
                      FD pools these transitions across all switchers in the panel.
                    </p>
                  </InfoBox>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-white p-4 text-sm">
                        <p className="text-[10px] text-slate-400 mb-3 text-center">
                          Regression output (50 restaurants × 6 years = 300 obs)
                        </p>
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-1 pr-3 font-medium text-slate-500"></th>
                              <th className="text-right py-1 px-2 font-medium text-slate-500">Pooled OLS</th>
                              <th className="text-right py-1 pl-2 font-medium text-slate-500">Entity FE</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            <tr>
                              <td className="py-1.5 pr-3">Grant received</td>
                              <td className="text-right py-1.5 px-2 font-mono text-amber-700">
                                {fmt(pooledBeta, 2)}
                              </td>
                              <td className="text-right py-1.5 pl-2 font-mono text-emerald-700">
                                {fmt(entityFEBeta, 2)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-3">True effect</td>
                              <td className="text-right py-1.5 px-2 font-mono text-slate-400">{TRUE_EFFECT}.00</td>
                              <td className="text-right py-1.5 pl-2 font-mono text-slate-400">{TRUE_EFFECT}.00</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-3">Unit FE</td>
                              <td className="text-right py-1.5 px-2 font-mono text-slate-400">No</td>
                              <td className="text-right py-1.5 pl-2 font-mono">Yes</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-3">Time FE</td>
                              <td className="text-right py-1.5 px-2 font-mono text-slate-400">No</td>
                              <td className="text-right py-1.5 pl-2 font-mono text-slate-400">No</td>
                            </tr>
                            <tr>
                              <td className="py-1.5 pr-3 text-slate-500">Bias</td>
                              <td className="text-right py-1.5 px-2 font-mono text-amber-600">
                                +{fmt(pooledBeta - TRUE_EFFECT, 2)}
                              </td>
                              <td className="text-right py-1.5 pl-2 font-mono text-emerald-600">
                                {fmt(entityFEBeta - TRUE_EFFECT, 2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-[10px] text-slate-400 mt-3">
                          Pooled OLS bias is structural — driven by culture confounding.
                          Entity FE eliminates the time-invariant culture confounder. The
                          remaining deviation from 5.00 is sampling noise.
                        </p>
                      </div>

                      <div className="grid gap-3 grid-cols-3">
                        <StatCard
                          label="True effect"
                          value={`+${TRUE_EFFECT}.0`}
                          formula={"\\beta = 5"}
                        />
                        <StatCard
                          label="Entity FE"
                          value={`+${fmt(entityFEBeta, 2)}`}
                          formula={"\\hat{\\beta}_{\\text{FE}}"}
                        />
                        <StatCard
                          label="Pooled OLS"
                          value={`+${fmt(pooledBeta, 2)}`}
                          formula={"\\hat{\\beta}_{\\text{OLS}}"}
                        />
                      </div>
                    </div>

                    <WithinScatterChart obs={obs} feSlope={entityFEBeta} />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 4 — Adding Time Effects                                 */}
          {/* ============================================================ */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4 text-slate-500" />
                    Two-Way Fixed Effects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Entity fixed effects <Tex math="\alpha_i" /> control for time-invariant
                    differences across restaurants. But what about shocks that affect{" "}
                    <em>all</em> restaurants in a given year — like a new national hygiene
                    regulation raising everyone's scores? These period-specific shocks are
                    absorbed by <strong>time fixed effects</strong> <Tex math="\delta_t" />.
                  </p>
                  <Tex
                    math="Y_{it} = \alpha_i + \delta_t + \beta D_{it} + \varepsilon_{it}"
                    display
                  />

                  <p>
                    Two-way demeaning extends the subtraction. For each observation, subtract the
                    unit mean, the period mean, and add back the grand mean:
                  </p>
                  <Tex
                    math="\ddot{Y}_{it}^{\text{TW}} = Y_{it} - \bar{Y}_{i\cdot} - \bar{Y}_{\cdot t} + \bar{Y}_{\cdot\cdot}"
                    display
                  />
                  <p>
                    This eliminates both <Tex math="\alpha_i" /> (unit culture) and{" "}
                    <Tex math="\delta_t" /> (period shocks). In the simulation below, the time
                    trend adds <em>{timeTrend} pts per year</em> to every restaurant. Because
                    grant adoption is staggered across time, entity-only FE conflates the
                    upward trend with the grant effect.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <LabeledSlider
                        label="Time trend magnitude"
                        value={[timeTrend]}
                        displayValue={`+${timeTrend} pts/yr`}
                        onValueChange={([v]) => setTimeTrend(v)}
                        min={0}
                        max={8}
                        step={1}
                      />

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowTWFE(false)}
                          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                            !showTWFE
                              ? "bg-slate-800 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Entity FE only
                        </button>
                        <button
                          onClick={() => setShowTWFE(true)}
                          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                            showTWFE
                              ? "bg-slate-800 text-white"
                              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Two-way FE
                        </button>
                      </div>

                      <div className="grid gap-3 grid-cols-1">
                        <StatCard
                          label="True grant effect"
                          value={`+${TRUE_EFFECT}.0 pts`}
                          formula={"\\beta = 5"}
                        />
                        <StatCard
                          label={showTWFE ? "TWFE estimate" : "Entity FE estimate"}
                          value={`+${fmt(showTWFE ? step4TWFE : step4EntityFE, 2)} pts`}
                          formula={showTWFE ? "\\hat{\\beta}_{\\text{TWFE}}" : "\\hat{\\beta}_{\\text{FE}}"}
                        />
                        <StatCard
                          label="Bias"
                          value={`${fmt((showTWFE ? step4TWFE : step4EntityFE) - TRUE_EFFECT, 2)} pts`}
                          formula={"\\hat{\\beta} - \\beta"}
                        />
                      </div>

                      {!showTWFE ? (
                        <InfoBox variant="warning" title="Time trend contaminates entity FE">
                          With a {timeTrend} pt/yr trend and staggered adoption, entity-only FE
                          gives {fmt(step4EntityFE, 2)} pts — {step4EntityFE > TRUE_EFFECT + 0.5 ? "above" : "near"} the
                          true {TRUE_EFFECT} pts. Later-treated restaurants look like they improved
                          partly because of the trend, not the grant. TWFE would absorb this with{" "}
                          <Tex math="\hat\delta_t" />.
                        </InfoBox>
                      ) : (
                        <InfoBox variant="success" title="Time effects absorbed">
                          TWFE gives {fmt(step4TWFE, 2)} pts — very close to the true {TRUE_EFFECT} pts.
                          The year-by-year dummies <Tex math="\hat\delta_t" /> soak up the{" "}
                          {timeTrend} pt/yr trend. What remains is the grant's
                          within-restaurant, within-year causal signal.
                        </InfoBox>
                      )}
                    </div>

                    <TimeTrendChart obs={step4Panel.obs} timeTrend={timeTrend} />
                  </div>

                  <InfoBox variant="formula" title="Comparing entity FE and TWFE — live numbers">
                    <p className="mt-1">
                      Entity FE: <Tex math={`\\hat\\beta_{\\text{FE}} = ${fmt(step4EntityFE, 2)}`} />.
                      This picks up <Tex math={`\\beta + \\text{trend bias} = 5.0 + ${fmt(step4EntityFE - TRUE_EFFECT, 2)} = ${fmt(step4EntityFE, 2)}`} />.
                    </p>
                    <p className="mt-1">
                      TWFE: <Tex math={`\\hat\\beta_{\\text{TWFE}} = ${fmt(step4TWFE, 2)}`} />.
                      The time dummies absorb <Tex math={`\\hat\\delta_t`} />, removing the{" "}
                      {timeTrend} pt/yr trend.
                      Remaining deviation: <Tex math={`${fmt(step4TWFE, 2)} - 5.0 = ${fmt(step4TWFE - TRUE_EFFECT, 2)}`} /> pts (sampling noise only).
                    </p>
                  </InfoBox>

                  <InfoBox variant="dark" title="TWFE and Difference-in-Differences">
                    With exactly two periods and a binary treatment, TWFE is numerically
                    identical to the Difference-in-Differences estimator. TWFE is DiD
                    generalised to any number of units and periods. The coefficient{" "}
                    <Tex math="\hat\beta" /> captures the average within-unit change
                    attributable to the grant, net of any period trend.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 5 — When Fixed Effects Fail                             */}
          {/* ============================================================ */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Limitations and Failure Modes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Fixed effects rest on <strong>strict exogeneity</strong>: the error{" "}
                    <Tex math="\varepsilon_{it}" /> must be uncorrelated with all past, present,
                    and future treatment values within a unit. Several real-world patterns break
                    this assumption.
                  </p>

                  <InfoBox variant="dark" title="Strict exogeneity — the core requirement">
                    <Tex
                      math="\mathbb{E}[\varepsilon_{it} \mid D_{i1}, \ldots, D_{iT}, \alpha_i] = 0 \quad \forall\, t"
                      display
                    />
                    This says the error in <em>any</em> period must be uncorrelated with
                    treatment in <em>every</em> period for that unit. It is much stronger
                    than the contemporaneous exogeneity required for pooled OLS.
                  </InfoBox>

                  {/* --- Failure mode 1: time-varying confounders (with chart) --- */}
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 space-y-3">
                    <p className="font-medium text-slate-800">1. Time-varying confounders</p>
                    <p className="text-sm text-slate-700">
                      FE removes only <em>time-invariant</em> unobservables. Suppose Bella
                      Cucina starts a kitchen renovation at Year 3 — the same year it receives
                      the grant. The renovation independently adds {RENOVATION_EFFECT} pts to
                      scores. The within transformation cannot tell the two apart.
                    </p>
                    <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                      <div className="space-y-3">
                        <div className="bg-white rounded p-2 text-xs font-mono text-slate-600">
                          Yr 2→3 score change with renovation:
                          <br />
                          grant ({TRUE_EFFECT} pts) + renovation ({RENOVATION_EFFECT} pts) + noise
                          <br />
                          FE attributes all {TRUE_EFFECT + RENOVATION_EFFECT} pts to the grant
                          <br />
                          → <Tex math={`\\hat\\beta = ${TRUE_EFFECT + RENOVATION_EFFECT}`} /> instead of{" "}
                          <Tex math={`\\beta = ${TRUE_EFFECT}`} />
                        </div>
                        <p className="text-sm text-slate-700">
                          The amber shaded region in the chart shows the {RENOVATION_EFFECT}-pt gap
                          that FE wrongly attributes to the grant. This is the Achilles' heel
                          of fixed effects — any time-varying change coinciding with treatment
                          contaminates the estimate.
                        </p>
                      </div>
                      <ConfounderWhatIfChart bellaScores={bellaData.scores} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                      <p className="font-medium text-slate-800">2. Reverse causality and anticipation</p>
                      <p className="text-sm mt-1 text-slate-700">
                        The city might award grants to restaurants with <em>already improving</em>{" "}
                        scores — making high scores a cause of treatment. Alternatively,
                        restaurants expecting a grant might pre-emptively clean up. Both violate
                        strict exogeneity: future treatment correlates with current errors.
                      </p>
                      <div className="mt-2 bg-white rounded p-2 text-xs font-mono text-slate-600">
                        If Corner Diner cleans up in Yr 4 anticipating a Yr 5 grant:
                        <br />
                        <Tex math="\varepsilon_{i4}" /> ↑ while <Tex math="D_{i5} = 1" /> → <Tex math="\text{Corr}(\varepsilon_{i4}, D_{i5}) > 0" /> → violation
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                      <p className="font-medium text-slate-800">3. Staggered adoption and TWFE bias</p>
                      <p className="text-sm mt-1 text-slate-700">
                        In our 50-restaurant panel, restaurants adopt the grant at different
                        years. Simple TWFE implicitly uses <em>already-treated</em> restaurants as
                        controls for <em>later-treated</em> ones. If the grant effect grows over
                        time (e.g., 3 pts in year 1, 7 pts by year 3), this comparison is
                        contaminated.
                      </p>
                      <div className="mt-2 bg-white rounded p-2 text-xs font-mono text-slate-600">
                        Restaurant A treated Yr 2, Restaurant B treated Yr 5.
                        <br />
                        At Yr 5, TWFE compares B's change to A's — but A's "control" score
                        <br />
                        already contains 3 years of treatment effect → negative weighting
                      </div>
                      <p className="text-sm mt-2 text-slate-700">
                        Modern DiD methods (Callaway &amp; Sant'Anna, Sun &amp; Abraham,
                        Borusyak et al.) address this by constructing cleaner comparison groups
                        that never use already-treated units as controls.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-medium text-slate-800">4. Loss of time-invariant regressors</p>
                      <p className="text-sm mt-1 text-slate-700">
                        FE absorbs <em>all</em> unit-level variation, so you cannot estimate
                        a coefficient on any variable that never changes — for example, each
                        restaurant's neighbourhood or founding year. In our data, culture{" "}
                        <Tex math="u_i" /> is absorbed into <Tex math="\hat\alpha_i" />:
                        Bella Cucina's estimated intercept is{" "}
                        <Tex math={`\\hat\\alpha_{\\text{Bella}} \\approx ${fmt(bellaData.scoreMean, 1)}`} />{" "}
                        and Corner Diner's is{" "}
                        <Tex math={`\\hat\\alpha_{\\text{Corner}} \\approx ${fmt(cornerData.scoreMean, 1)}`} />.
                        The gap reflects culture, but we cannot decompose it further.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-medium text-slate-800">5. Incidental parameters in non-linear models</p>
                      <p className="text-sm mt-1 text-slate-700">
                        In logit or probit models, estimating a separate intercept per unit
                        causes inconsistency when <Tex math="T" /> is small, even as{" "}
                        <Tex math="N \to \infty" />. Our panel has <Tex math="T = 6" />,
                        which is typical — this "incidental parameters problem" is another
                        reason to prefer linear specifications when the outcome permits it.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 6 — Quiz                                                */}
          {/* ============================================================ */}
          {step === 6 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question="Our panel has 50 restaurants each observed for 6 years. How many rows are in the balanced dataset?"
                options={["50", "6", "300", "Depends on how many received the grant"]}
                correctIndex={2}
                explanation="A balanced panel has N × T = 50 × 6 = 300 observations. Every restaurant-year combination appears exactly once."
              />
              <QuizCard
                question="The within transformation subtracts each restaurant's time-mean. What does this eliminate?"
                options={[
                  "Time-varying confounders such as a mid-panel renovation",
                  "Time-invariant unit-level confounders such as cleanliness culture",
                  "Period-level shocks common to all restaurants",
                  "All sources of omitted variable bias",
                ]}
                correctIndex={1}
                explanation="Demeaning by unit mean removes any characteristic that is constant over time for that unit — including cleanliness culture. Time-varying confounders like a renovation survive the transformation."
              />
              <QuizCard
                question="Entity FE works well in Step 3 (no time trend). What goes wrong when a common time trend exists?"
                options={[
                  "Entity FE cannot handle more than 2 periods",
                  "The trend confounds the grant timing — later adopters look like they improved due to the trend",
                  "Entity FE removes the trend automatically",
                  "The bias disappears if you cluster standard errors",
                ]}
                correctIndex={1}
                explanation="With staggered adoption, later-treated restaurants are treated in years when the common trend has already raised scores. Entity FE cannot distinguish the grant from this time trend. Adding time fixed effects (TWFE) solves the problem."
              />
              <QuizCard
                question="When is simple TWFE known to produce biased or sign-reversed estimates?"
                options={[
                  "When the panel is balanced (equal T for all units)",
                  "When units adopt treatment at different points in time with heterogeneous effects",
                  "When T is greater than N",
                  "When using the within estimator instead of LSDV",
                ]}
                correctIndex={1}
                explanation="With staggered adoption and treatment effect heterogeneity, TWFE implicitly uses already-treated units as controls, potentially assigning negative weights. Modern DiD methods (Callaway & Sant'Anna, Sun & Abraham) fix this by restricting comparisons to clean control groups."
              />
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
