import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Sigma,
  GraduationCap,
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
/*  Running example — Scholarship threshold & GPA                     */
/*                                                                     */
/*  N=200 students. Running variable R = entrance exam score (0–100). */
/*  Threshold c = 50. Students with R >= 50 receive a scholarship.    */
/*  Outcome Y = end-of-year GPA (0–4).                                */
/*  True LATE at threshold = 0.4 GPA points.                          */
/*                                                                     */
/*  Fuzzy RDD: graduation (sheepskin) effect.                         */
/*  Running variable = credits accumulated. Threshold = 120 credits.  */
/*  Treatment = diploma receipt. Outcome = earnings (log).            */
/*                                                                     */
/*  Focal student examples for hand calculations:                     */
/*    Alex — score 48 (just below), no scholarship                    */
/*    Jamie — score 52 (just above), scholarship                      */
/* ================================================================== */

function fmt(x, d = 2) {
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
/*  Sharp RDD simulation — scholarship example                        */
/* ------------------------------------------------------------------ */

const THRESHOLD = 50;
const TRUE_LATE = 0.4;
const N_STUDENTS = 200;

/**
 * Generate the sharp RDD scholarship dataset.
 *
 * Each student i has:
 *   score_i ~ N(50, 15) clipped to [0, 100] — entrance exam score
 *   scholarship_i = 1{score_i >= THRESHOLD}  (sharp assignment)
 *   ability_i ~ N(0, 1)  — unobserved but continuous at threshold
 *   gpa_i = 1.8 + 0.012*score_i + TRUE_LATE*scholarship_i + 0.3*ability_i + noise
 *
 * Returns array of student objects.
 */
function generateSharpRDD({ bandwidth = 30, seed = 42 } = {}) {
  const rng = mulberry32(seed);
  const students = [];

  for (let i = 0; i < N_STUDENTS; i++) {
    const score = Math.max(0, Math.min(100, 50 + boxMuller(rng) * 15));
    const scholarship = score >= THRESHOLD ? 1 : 0;
    const ability = boxMuller(rng);
    const noise = boxMuller(rng) * 0.25;
    const gpa = 1.8 + 0.012 * score + TRUE_LATE * scholarship + 0.3 * ability + noise;

    students.push({
      id: i,
      score,
      scholarship,
      ability,
      gpa: Math.max(0, Math.min(4, gpa)),
      r: score - THRESHOLD, // centered running variable
      isFocal: i === 0 || i === 1,
    });
  }

  // Override focal students for pedagogical clarity
  students[0] = { ...students[0], score: 48, r: -2, scholarship: 0, gpa: 2.35, isFocal: true, name: "Alex" };
  students[1] = { ...students[1], score: 52, r: 2, scholarship: 1, gpa: 2.82, isFocal: true, name: "Jamie" };

  return students.filter((s) => Math.abs(s.score - THRESHOLD) <= bandwidth);
}

/**
 * OLS on centered running variable with treatment dummy and interaction.
 *
 * Model: y = b0 + b1*r + b2*D + b3*(D*r) + eps
 *
 * Returns { b0, b1, b2, b3 } where b2 = LATE estimate at threshold.
 */
function fitSharpRDD(students) {
  const n = students.length;
  if (n < 4) return { b0: 0, b1: 0, b2: 0, b3: 0 };

  // Build design matrix columns: [1, r, D, D*r]
  const X = students.map((s) => [1, s.r, s.scholarship, s.scholarship * s.r]);
  const y = students.map((s) => s.gpa);

  // Normal equations via simple 4x4 system
  const XtX = Array.from({ length: 4 }, () => new Array(4).fill(0));
  const Xty = new Array(4).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 4; j++) {
      Xty[j] += X[i][j] * y[i];
      for (let k = 0; k < 4; k++) {
        XtX[j][k] += X[i][j] * X[i][k];
      }
    }
  }

  // Gauss-Jordan inversion of 4x4 matrix
  const inv = invertMatrix4(XtX);
  if (!inv) return { b0: 0, b1: 0, b2: 0, b3: 0 };

  const coefs = new Array(4).fill(0);
  for (let j = 0; j < 4; j++) {
    for (let k = 0; k < 4; k++) {
      coefs[j] += inv[j][k] * Xty[k];
    }
  }

  return { b0: coefs[0], b1: coefs[1], b2: coefs[2], b3: coefs[3] };
}

function invertMatrix4(M) {
  const aug = M.map((row, i) => {
    const iden = new Array(4).fill(0);
    iden[i] = 1;
    return [...row, ...iden];
  });

  for (let col = 0; col < 4; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < 4; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) return null;
    for (let j = 0; j < 8; j++) aug[col][j] /= pivot;
    for (let row = 0; row < 4; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 8; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return aug.map((row) => row.slice(4));
}

/**
 * Kernel-weighted RDD estimate using triangular kernel.
 * K(u) = max(0, 1 - |u|/h)  where u = r/h, h = bandwidth
 */
function fitKernelRDD(students, h) {
  const inBW = students.filter((s) => Math.abs(s.r) <= h);
  if (inBW.length < 4) return null;

  const weighted = inBW.map((s) => ({
    ...s,
    w: Math.max(0, 1 - Math.abs(s.r) / h),
  }));

  // Weighted OLS: minimize sum w_i * (y_i - b0 - b1*r - b2*D - b3*D*r)^2
  const n = weighted.length;
  const X = weighted.map((s) => [1, s.r, s.scholarship, s.scholarship * s.r]);
  const y = weighted.map((s) => s.gpa);
  const w = weighted.map((s) => s.w);

  const XtWX = Array.from({ length: 4 }, () => new Array(4).fill(0));
  const XtWy = new Array(4).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 4; j++) {
      XtWy[j] += X[i][j] * y[i] * w[i];
      for (let k = 0; k < 4; k++) {
        XtWX[j][k] += X[i][j] * X[i][k] * w[i];
      }
    }
  }

  const inv = invertMatrix4(XtWX);
  if (!inv) return null;

  const coefs = new Array(4).fill(0);
  for (let j = 0; j < 4; j++) {
    for (let k = 0; k < 4; k++) {
      coefs[j] += inv[j][k] * XtWy[k];
    }
  }

  return { b2: coefs[2], n: n };
}

/* ------------------------------------------------------------------ */
/*  Fuzzy RDD simulation — sheepskin / graduation effect              */
/* ------------------------------------------------------------------ */

const CREDIT_THRESHOLD = 120;
const N_GRADS = 250;
const TRUE_SHEEPSKIN = 0.06; // log-earnings effect of diploma (near zero)

/**
 * Generate the fuzzy RDD graduation dataset.
 *
 * Running variable: credits accumulated at survey date (centered at 120).
 * Treatment: diploma_i = 1 if officially graduated.
 * Just passing the 120-credit threshold raises P(diploma) from ~0.4 to ~0.8
 * (fuzzy: some drop out above, some find alternative routes below).
 */
function generateFuzzyRDD({ seed = 99 } = {}) {
  const rng = mulberry32(seed);
  const students = [];

  for (let i = 0; i < N_GRADS; i++) {
    const credits = Math.max(80, Math.min(160, 120 + boxMuller(rng) * 18));
    const r = credits - CREDIT_THRESHOLD;
    const above = r >= 0 ? 1 : 0;

    // Fuzzy: P(diploma | above) = 0.80, P(diploma | below) = 0.40
    const pDiploma = above ? 0.80 : 0.40;
    const diploma = rng() < pDiploma ? 1 : 0;

    const ability = boxMuller(rng);
    const noise = boxMuller(rng) * 0.3;
    // Log earnings: baseline + small effect of diploma + ability + smooth r-effect
    const logEarnings = 10.2 + TRUE_SHEEPSKIN * diploma + 0.004 * r + 0.25 * ability + noise;

    students.push({ id: i, credits, r, above, diploma, ability, logEarnings });
  }

  return students;
}

/* ------------------------------------------------------------------ */
/*  McCrary density helper                                             */
/* ------------------------------------------------------------------ */

/**
 * Bin the running variable into a histogram for the McCrary test.
 * Returns { bins, leftMean, rightMean } for visualization.
 */
function mccraryBins(students, nBins = 20) {
  const scores = students.map((s) => s.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const step = (hi - lo) / nBins;

  const bins = [];
  for (let i = 0; i < nBins; i++) {
    const x0 = lo + i * step;
    const x1 = x0 + step;
    const mid = (x0 + x1) / 2;
    const count = scores.filter((s) => s >= x0 && s < x1).length;
    bins.push({ x0, x1, mid, count });
  }

  const leftBins = bins.filter((b) => b.mid < THRESHOLD);
  const rightBins = bins.filter((b) => b.mid >= THRESHOLD);
  const leftMean = leftBins.reduce((s, b) => s + b.count, 0) / leftBins.length;
  const rightMean = rightBins.reduce((s, b) => s + b.count, 0) / rightBins.length;

  return { bins, leftMean, rightMean };
}

/* ------------------------------------------------------------------ */
/*  Pre-computed base datasets                                         */
/* ------------------------------------------------------------------ */

const BASE_STUDENTS = generateSharpRDD({ bandwidth: 50, seed: 42 });
const BASE_FUZZY = generateFuzzyRDD({ seed: 99 });

/* ================================================================== */
/*  SVG chart constants                                                */
/* ================================================================== */

const W = 460;
const H = 195;
const PAD = { top: 18, right: 20, bottom: 34, left: 52 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function scaleX(val, lo, hi) {
  return PAD.left + ((val - lo) / (hi - lo)) * PW;
}

function scaleY(val, lo, hi) {
  return PAD.top + PH - ((val - lo) / (hi - lo)) * PH;
}

/* ================================================================== */
/*  Step 1 chart — Raw scatter: score vs GPA with threshold line      */
/* ================================================================== */

function ScatterRDDChart({ students, coefs, showFit }) {
  const xMin = 0, xMax = 100;
  const yMin = 1.0, yMax = 4.0;

  const txLine = scaleX(THRESHOLD, xMin, xMax);

  // Fitted lines for below/above (if coefs available)
  const fitBelow = [];
  const fitAbove = [];
  if (showFit && coefs) {
    for (let r = -THRESHOLD; r <= 0; r += 0.5) {
      const s = r + THRESHOLD;
      if (s < xMin || s > xMax) continue;
      const y = coefs.b0 + coefs.b1 * r;
      fitBelow.push([scaleX(s, xMin, xMax), scaleY(y, yMin, yMax)]);
    }
    for (let r = 0; r <= xMax - THRESHOLD; r += 0.5) {
      const s = r + THRESHOLD;
      if (s < xMin || s > xMax) continue;
      const y = coefs.b0 + coefs.b1 * r + coefs.b2 + coefs.b3 * r;
      fitAbove.push([scaleX(s, xMin, xMax), scaleY(y, yMin, yMax)]);
    }
  }

  const yTicks = [1.5, 2.0, 2.5, 3.0, 3.5];
  const xTicks = [10, 20, 30, 40, 50, 60, 70, 80, 90];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={11} textAnchor="middle" fontSize={10} fill="#94a3b8">
        entrance exam score vs. end-of-year GPA (N={students.length})
      </text>

      {/* Grid lines */}
      {yTicks.map((v) => (
        <line
          key={v}
          x1={PAD.left} x2={W - PAD.right}
          y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)}
          stroke="#f1f5f9" strokeWidth={0.5}
        />
      ))}

      {/* Threshold vertical line */}
      <line
        x1={txLine} y1={PAD.top}
        x2={txLine} y2={PAD.top + PH}
        stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2"
      />
      <text x={txLine + 3} y={PAD.top + 10} fontSize={9} fill="#f59e0b">
        c = 50
      </text>

      {/* Scatter dots */}
      {students.map((s) => (
        <circle
          key={s.id}
          cx={scaleX(s.score, xMin, xMax)}
          cy={scaleY(s.gpa, yMin, yMax)}
          r={s.isFocal ? 4 : 2}
          fill={s.scholarship ? "#1e293b" : "#94a3b8"}
          opacity={s.isFocal ? 1 : 0.45}
        />
      ))}

      {/* Fitted lines */}
      {showFit && fitBelow.length > 1 && (
        <path
          d={fitBelow.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ")}
          fill="none" stroke="#94a3b8" strokeWidth={2}
        />
      )}
      {showFit && fitAbove.length > 1 && (
        <path
          d={fitAbove.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ")}
          fill="none" stroke="#1e293b" strokeWidth={2}
        />
      )}

      {/* Focal student labels */}
      {students.filter((s) => s.isFocal).map((s) => (
        <text
          key={s.id}
          x={scaleX(s.score, xMin, xMax) + 5}
          y={scaleY(s.gpa, yMin, yMax) - 5}
          fontSize={9}
          fill={s.scholarship ? "#1e293b" : "#94a3b8"}
        >
          {s.name}
        </text>
      ))}

      {/* Y-axis */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left - 3} x2={PAD.left} y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)} stroke="#cbd5e1" />
          <text x={PAD.left - 5} y={scaleY(v, yMin, yMax) + 3} textAnchor="end" fontSize={9} fill="#64748b">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <text
        x={12} y={PAD.top + PH / 2}
        textAnchor="middle" fontSize={9} fill="#94a3b8"
        transform={`rotate(-90, 12, ${PAD.top + PH / 2})`}
      >
        GPA
      </text>

      {/* X-axis */}
      <line x1={PAD.left} y1={PAD.top + PH} x2={W - PAD.right} y2={PAD.top + PH} stroke="#cbd5e1" />
      {xTicks.map((v) => (
        <g key={v}>
          <line x1={scaleX(v, xMin, xMax)} y1={PAD.top + PH} x2={scaleX(v, xMin, xMax)} y2={PAD.top + PH + 3} stroke="#cbd5e1" />
          <text x={scaleX(v, xMin, xMax)} y={H - 18} textAnchor="middle" fontSize={9} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <text x={PAD.left + PW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
        Entrance exam score
      </text>

      {/* Legend */}
      <circle cx={W - PAD.right - 120} cy={PAD.top + 8} r={3} fill="#1e293b" />
      <text x={W - PAD.right - 114} y={PAD.top + 11} fontSize={9} fill="#475569">Scholarship</text>
      <circle cx={W - PAD.right - 42} cy={PAD.top + 8} r={3} fill="#94a3b8" />
      <text x={W - PAD.right - 36} y={PAD.top + 11} fontSize={9} fill="#475569">No schol.</text>
    </svg>
  );
}

/* ================================================================== */
/*  Step 3 chart — Bandwidth effect on estimate                       */
/* ================================================================== */

function BandwidthEstimateChart({ allStudents }) {
  const bandwidths = [5, 8, 12, 16, 20, 25, 30, 40, 50];
  const estimates = useMemo(() => {
    return bandwidths.map((h) => {
      const result = fitKernelRDD(allStudents, h);
      return result ? result.b2 : null;
    });
  }, [allStudents]);

  const validPairs = bandwidths
    .map((h, i) => ({ h, est: estimates[i] }))
    .filter((p) => p.est !== null);

  const xMin = 0, xMax = 55;
  const yMin = 0.0, yMax = 0.8;
  const yTicks = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

  const trueY = scaleY(TRUE_LATE, yMin, yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={11} textAnchor="middle" fontSize={10} fill="#94a3b8">
        kernel-weighted RDD estimate vs. bandwidth h
      </text>

      {/* Grid */}
      {yTicks.map((v) => (
        <line
          key={v}
          x1={PAD.left} x2={W - PAD.right}
          y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)}
          stroke="#f1f5f9" strokeWidth={0.5}
        />
      ))}

      {/* True LATE reference */}
      <line
        x1={PAD.left} y1={trueY}
        x2={W - PAD.right} y2={trueY}
        stroke="#10b981" strokeWidth={1.5} strokeDasharray="6,3"
      />
      <text x={W - PAD.right - 2} y={trueY - 4} textAnchor="end" fontSize={9} fill="#10b981">
        True LATE = {TRUE_LATE}
      </text>

      {/* Estimate path */}
      <path
        d={validPairs.map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.h, xMin, xMax)},${scaleY(p.est, yMin, yMax)}`).join(" ")}
        fill="none" stroke="#1e293b" strokeWidth={2}
      />
      {validPairs.map((p) => (
        <circle
          key={p.h}
          cx={scaleX(p.h, xMin, xMax)}
          cy={scaleY(p.est, yMin, yMax)}
          r={3} fill="#1e293b"
        />
      ))}

      {/* Y-axis */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left - 3} x2={PAD.left} y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)} stroke="#cbd5e1" />
          <text x={PAD.left - 5} y={scaleY(v, yMin, yMax) + 3} textAnchor="end" fontSize={9} fill="#64748b">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <text
        x={12} y={PAD.top + PH / 2}
        textAnchor="middle" fontSize={9} fill="#94a3b8"
        transform={`rotate(-90, 12, ${PAD.top + PH / 2})`}
      >
        LATE est.
      </text>

      {/* X-axis */}
      <line x1={PAD.left} y1={PAD.top + PH} x2={W - PAD.right} y2={PAD.top + PH} stroke="#cbd5e1" />
      {[10, 20, 30, 40, 50].map((v) => (
        <g key={v}>
          <line x1={scaleX(v, xMin, xMax)} y1={PAD.top + PH} x2={scaleX(v, xMin, xMax)} y2={PAD.top + PH + 3} stroke="#cbd5e1" />
          <text x={scaleX(v, xMin, xMax)} y={H - 18} textAnchor="middle" fontSize={9} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <text x={PAD.left + PW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
        Bandwidth h (exam score points)
      </text>
    </svg>
  );
}

/* ================================================================== */
/*  Step 4 chart — McCrary density test                               */
/* ================================================================== */

function McCraryDensityChart({ students, manipulated }) {
  // For "manipulated" mode, we'll show a scenario with bunching just below threshold
  const displayStudents = useMemo(() => {
    if (!manipulated) return students;
    // Simulate manipulation: shift some students from just below to just above
    const rng = mulberry32(777);
    return students.map((s) => {
      if (s.score >= 45 && s.score < 50 && rng() < 0.5) {
        return { ...s, score: 50 + rng() * 3 };
      }
      return s;
    });
  }, [students, manipulated]);

  const { bins, leftMean, rightMean } = useMemo(
    () => mccraryBins(displayStudents, 20),
    [displayStudents]
  );

  const maxCount = Math.max(...bins.map((b) => b.count));
  const xMin = 0, xMax = 100;
  const yMin = 0, yMax = maxCount + 2;

  const txLine = scaleX(THRESHOLD, xMin, xMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={11} textAnchor="middle" fontSize={10} fill="#94a3b8">
        {manipulated ? "manipulated design — bunching just above threshold" : "clean design — smooth density at threshold"}
      </text>

      {/* Bars */}
      {bins.map((b, i) => {
        const x = scaleX(b.x0, xMin, xMax);
        const w = scaleX(b.x1, xMin, xMax) - x - 1;
        const barH = ((b.count - yMin) / (yMax - yMin)) * PH;
        const isAbove = b.mid >= THRESHOLD;
        return (
          <rect
            key={i}
            x={x}
            y={PAD.top + PH - barH}
            width={Math.max(1, w)}
            height={barH}
            fill={isAbove ? "#1e293b" : "#94a3b8"}
            opacity={0.55}
          />
        );
      })}

      {/* Threshold line */}
      <line
        x1={txLine} y1={PAD.top}
        x2={txLine} y2={PAD.top + PH}
        stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2"
      />

      {/* Y-axis */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
      {[0, 5, 10, 15, 20].filter((v) => v <= yMax).map((v) => (
        <g key={v}>
          <line x1={PAD.left - 3} x2={PAD.left} y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)} stroke="#cbd5e1" />
          <text x={PAD.left - 5} y={scaleY(v, yMin, yMax) + 3} textAnchor="end" fontSize={9} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <text
        x={12} y={PAD.top + PH / 2}
        textAnchor="middle" fontSize={9} fill="#94a3b8"
        transform={`rotate(-90, 12, ${PAD.top + PH / 2})`}
      >
        Count
      </text>

      {/* X-axis */}
      <line x1={PAD.left} y1={PAD.top + PH} x2={W - PAD.right} y2={PAD.top + PH} stroke="#cbd5e1" />
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
        <g key={v}>
          <line x1={scaleX(v, xMin, xMax)} y1={PAD.top + PH} x2={scaleX(v, xMin, xMax)} y2={PAD.top + PH + 3} stroke="#cbd5e1" />
          <text x={scaleX(v, xMin, xMax)} y={H - 18} textAnchor="middle" fontSize={9} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <text x={PAD.left + PW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
        Entrance exam score
      </text>
    </svg>
  );
}

/* ================================================================== */
/*  Step 5 chart — Fuzzy RDD scatter: credits vs. diploma rate        */
/* ================================================================== */

function FuzzyScatterChart({ fuzzyData }) {
  // Bin credits and compute average diploma rate per bin
  const bins = useMemo(() => {
    const lo = 80, hi = 160, nBins = 16;
    const step = (hi - lo) / nBins;
    const result = [];
    for (let i = 0; i < nBins; i++) {
      const x0 = lo + i * step;
      const x1 = x0 + step;
      const mid = (x0 + x1) / 2;
      const inBin = fuzzyData.filter((s) => s.credits >= x0 && s.credits < x1);
      if (inBin.length === 0) continue;
      const diplomaRate = inBin.reduce((s, d) => s + d.diploma, 0) / inBin.length;
      result.push({ mid, diplomaRate, n: inBin.length });
    }
    return result;
  }, [fuzzyData]);

  const xMin = 80, xMax = 160;
  const yMin = 0, yMax = 1.0;
  const txLine = scaleX(CREDIT_THRESHOLD, xMin, xMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text x={W / 2} y={11} textAnchor="middle" fontSize={10} fill="#94a3b8">
        diploma receipt rate by credits accumulated
      </text>

      {/* Threshold line */}
      <line
        x1={txLine} y1={PAD.top}
        x2={txLine} y2={PAD.top + PH}
        stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,2"
      />
      <text x={txLine + 3} y={PAD.top + 10} fontSize={9} fill="#f59e0b">
        120 credits
      </text>

      {/* Dots sized by n */}
      {bins.map((b, i) => (
        <circle
          key={i}
          cx={scaleX(b.mid, xMin, xMax)}
          cy={scaleY(b.diplomaRate, yMin, yMax)}
          r={Math.max(2, Math.sqrt(b.n) * 0.8)}
          fill={b.mid >= CREDIT_THRESHOLD ? "#1e293b" : "#94a3b8"}
          opacity={0.7}
        />
      ))}

      {/* Jump annotation */}
      <text x={txLine - 4} y={scaleY(0.4, yMin, yMax)} textAnchor="end" fontSize={9} fill="#1e293b">
        ~40%
      </text>
      <text x={txLine + 4} y={scaleY(0.8, yMin, yMax)} textAnchor="start" fontSize={9} fill="#1e293b">
        ~80%
      </text>

      {/* Y-axis */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
      {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
        <g key={v}>
          <line x1={PAD.left - 3} x2={PAD.left} y1={scaleY(v, yMin, yMax)} y2={scaleY(v, yMin, yMax)} stroke="#cbd5e1" />
          <text x={PAD.left - 5} y={scaleY(v, yMin, yMax) + 3} textAnchor="end" fontSize={9} fill="#64748b">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <text
        x={12} y={PAD.top + PH / 2}
        textAnchor="middle" fontSize={9} fill="#94a3b8"
        transform={`rotate(-90, 12, ${PAD.top + PH / 2})`}
      >
        P(diploma)
      </text>

      {/* X-axis */}
      <line x1={PAD.left} y1={PAD.top + PH} x2={W - PAD.right} y2={PAD.top + PH} stroke="#cbd5e1" />
      {[90, 100, 110, 120, 130, 140, 150].map((v) => (
        <g key={v}>
          <line x1={scaleX(v, xMin, xMax)} y1={PAD.top + PH} x2={scaleX(v, xMin, xMax)} y2={PAD.top + PH + 3} stroke="#cbd5e1" />
          <text x={scaleX(v, xMin, xMax)} y={H - 18} textAnchor="middle" fontSize={9} fill="#64748b">
            {v}
          </text>
        </g>
      ))}
      <text x={PAD.left + PW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="#94a3b8">
        Credits accumulated
      </text>
    </svg>
  );
}

/* ================================================================== */
/*  LESSONS array                                                      */
/* ================================================================== */

const LESSONS = [
  "The Idea: Artificial Jumps",
  "Sharp RDD Estimation",
  "Kernel Weighting & Bandwidth",
  "The McCrary Test",
  "Fuzzy RDD & the Sheepskin Effect",
  "Estimating the Fuzzy RDD",
  "Quiz",
];

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function RegressionDiscontinuityTutorial() {
  const [showFit, setShowFit] = useState(false);
  const [bandwidth, setBandwidth] = useState(20);
  const [manipulated, setManipulated] = useState(false);

  /* ---- Step 2: sharp RDD fit on bandwidth-restricted data ---- */
  const sharpStudents = useMemo(
    () => generateSharpRDD({ bandwidth, seed: 42 }),
    [bandwidth]
  );

  const sharpCoefs = useMemo(() => fitSharpRDD(sharpStudents), [sharpStudents]);
  const kernelEst = useMemo(
    () => fitKernelRDD(sharpStudents, bandwidth),
    [sharpStudents, bandwidth]
  );

  /* ---- Step 6: fuzzy RDD Wald estimator ---- */
  const waldEst = useMemo(() => {
    const fuzzy = BASE_FUZZY;

    // Fit 4-term RDD model: y = b0 + b1*r + b2*Z + b3*(Z*r)
    // Returns b2 (the intercept jump at threshold)
    function fitRDDCoef(data, getY) {
      const n = data.length;
      const X = data.map((d) => [1, d.r, d.above, d.above * d.r]);
      const y = data.map(getY);

      const XtX = Array.from({ length: 4 }, () => new Array(4).fill(0));
      const Xty = new Array(4).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < 4; j++) {
          Xty[j] += X[i][j] * y[i];
          for (let k = 0; k < 4; k++) {
            XtX[j][k] += X[i][j] * X[i][k];
          }
        }
      }
      const inv = invertMatrix4(XtX);
      if (!inv) return 0;
      const coefs = new Array(4).fill(0);
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++)
          coefs[j] += inv[j][k] * Xty[k];
      return coefs[2]; // b2 = jump at threshold
    }

    const reducedForm = fitRDDCoef(fuzzy, (d) => d.logEarnings);
    const firstStage = fitRDDCoef(fuzzy, (d) => d.diploma);

    return {
      reducedForm,
      firstStage,
      wald: Math.abs(firstStage) > 1e-4 ? reducedForm / firstStage : 0,
    };
  }, []);

  return (
    <TutorialShell
      title="Regression Discontinuity Design"
      description="Use artificial thresholds and jumps in running variables to estimate causal effects — from sharp RDD to fuzzy designs and the sheepskin effect."
      intro={
        <>
          <p>
            Randomized experiments are the gold standard, but they are often impossible to run.
            Regression Discontinuity Design (RDD) exploits a different source of as-good-as-random
            variation: an <strong>arbitrary threshold</strong> in a continuous running variable that
            determines treatment assignment. Units just above and just below the cutoff are nearly
            identical — yet one group gets treated and the other does not.
          </p>
          <p>
            This tutorial covers sharp RDD (treatment is a deterministic function of the threshold),
            the smoothness assumption, kernel weighting, the McCrary manipulation test, fuzzy RDD
            (the threshold causes a jump in treatment <em>probability</em>), and the classic
            sheepskin effect. Reference:{" "}
            <a
              href="https://matheusfacure.github.io/python-causality-handbook/16-Regression-Discontinuity-Design.html"
              className="underline text-slate-600 hover:text-slate-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facure, M. (2022). Causal Inference for the Brave and True, Ch. 16
            </a>
            .
          </p>
        </>
      }
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ============================================================ */}
          {/* Step 0 — The Idea: Artificial Jumps                          */}
          {/* ============================================================ */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    Nature Is Smooth — Jumps Are Man-Made
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Most things in nature vary <em>smoothly</em>. A student who scores 49 on an
                    entrance exam is nearly indistinguishable from one who scores 51 — same
                    preparation, same ability, same background. Yet a university that awards
                    scholarships to everyone scoring 50 or above creates an{" "}
                    <strong>abrupt jump</strong> in treatment. Nature did not produce that jump;
                    the policy did.
                  </p>
                  <p>
                    Regression Discontinuity Design (RDD) exploits exactly this logic. The{" "}
                    <strong>identifying assumption</strong> is that potential outcomes vary
                    continuously with the running variable at the cutoff. Any discontinuity in the
                    observed outcome must therefore be caused by the treatment — nothing else jumps
                    there.
                  </p>
                  <InfoBox variant="muted" title="Intuition: a local coin flip">
                    Think of two students whose scores land within a whisker of 50 — say 49.8
                    and 50.2. Whether they end up just above or just below is essentially random:
                    a lucky guess, a moment of focus, the order of questions. For these students,
                    treatment assignment is <em>as good as random</em>, just like a coin flip.
                    That is why RDD can estimate a causal effect without a randomised experiment.
                  </InfoBox>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBox title="Running variable R">
                      <Tex math="R_i \in \mathbb{R}" /> — a continuous pre-treatment score that
                      determines assignment. Also called the <em>forcing variable</em>. Here,{" "}
                      <Tex math="R_i" /> = entrance exam score (0–100) and the threshold is{" "}
                      <Tex math="c = 50" />.
                    </InfoBox>
                    <InfoBox title="Sharp assignment rule">
                      <Tex math="D_i = \mathbf{1}\{R_i \geq c\}" display /> Treatment is a
                      deterministic step function of <Tex math="R_i" />: students scoring 50+ receive
                      the scholarship; those below 50 do not. No exceptions.
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Potential Outcomes at the Threshold</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Because we can never observe the same student both receiving and not receiving
                    the scholarship, we estimate the causal effect by comparing the{" "}
                    <strong>limit from the right</strong> (just-treated units) with the{" "}
                    <strong>limit from the left</strong> (just-untreated units) at the cutoff:
                  </p>
                  <Tex
                    math="\tau_{RDD} = \lim_{r \downarrow c} \mathbb{E}[Y_i \mid R_i = r] - \lim_{r \uparrow c} \mathbb{E}[Y_i \mid R_i = r]"
                    display
                  />
                  <p>
                    This is a <strong>Local Average Treatment Effect (LATE)</strong> — it is valid
                    only for students near the threshold of score 50. A student who scores 10 or 90
                    may respond to the scholarship very differently. RDD gives you a precise local
                    answer, not a global one.
                  </p>
                  <InfoBox variant="muted" title="Local, not global">
                    The ATE averages over everyone. The RDD LATE is the causal effect specifically
                    for students at the margin — those who are borderline. This is often exactly the
                    policy-relevant question: does the scholarship help the students it is designed to
                    reach?
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 1 — Sharp RDD Estimation                                */}
          {/* ============================================================ */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sigma className="h-4 w-4 text-slate-500" />
                    The Regression Specification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    We want to estimate the gap in the outcome at the cutoff. The trick is to{" "}
                    <strong>center the running variable</strong>: define{" "}
                    <Tex math="\tilde{r}_i = R_i - c" /> so the threshold sits at{" "}
                    <Tex math="\tilde{r} = 0" />. Then fit separate linear trends on each side:
                  </p>
                  <Tex
                    math="Y_i = \beta_0 + \beta_1 \tilde{r}_i + \beta_2 D_i + \beta_3 (D_i \cdot \tilde{r}_i) + \varepsilon_i"
                    display
                  />
                  <p className="text-sm text-slate-600">
                    Read each term carefully. Below the cutoff (<Tex math="D_i = 0" />), the
                    model reduces to <Tex math="\beta_0 + \beta_1 \tilde{r}_i" /> — a line with
                    intercept <Tex math="\beta_0" /> at <Tex math="\tilde{r} = 0" />. Above the
                    cutoff (<Tex math="D_i = 1" />), it becomes{" "}
                    <Tex math="(\beta_0 + \beta_2) + (\beta_1 + \beta_3)\tilde{r}_i" /> — a
                    different intercept and a different slope. The gap between the two intercepts at{" "}
                    <Tex math="\tilde{r} = 0" /> is exactly <Tex math="\beta_2" />.
                  </p>
                  <InfoBox variant="muted" title="Geometric intuition">
                    Picture two straight lines — one for non-scholarship students, one for
                    scholarship students. Each line has its own slope and intercept. Where the
                    two lines meet the vertical line at score = 50, there is a{" "}
                    <strong>gap</strong>. That gap is the treatment effect. Toggle "Show fitted
                    lines" below to see this in the chart.
                  </InfoBox>
                  <InfoBox variant="formula">
                    <strong>Why centering matters:</strong> Without centering, <Tex math="\beta_2" />{" "}
                    would be the vertical gap at <Tex math="R = 0" /> (a score of zero), which is
                    far from the threshold and extrapolates wildly. After centering,{" "}
                    <Tex math="\beta_2" /> is evaluated at <Tex math="\tilde{r} = 0" />, i.e.,
                    exactly at score = 50 — the only point we care about.
                  </InfoBox>
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard
                      label="Estimated LATE"
                      value={fmt(sharpCoefs.b2, 2)}
                      unit="GPA pts"
                      formula="\hat{\beta}_2"
                    />
                    <StatCard
                      label="True LATE"
                      value={fmt(TRUE_LATE, 2)}
                      unit="GPA pts"
                      formula="\tau_{RDD}"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3 text-slate-700">
                      <p className="text-sm font-medium text-slate-600">Worked example — Alex vs. Jamie</p>
                      <p className="text-sm text-slate-600">
                        Alex scored 48 (<Tex math="\tilde{r} = -2" />, no scholarship) and Jamie
                        scored 52 (<Tex math="\tilde{r} = +2" />, scholarship). The fitted model
                        predicts each student's GPA. The difference at the threshold isolates the
                        scholarship's effect.
                      </p>
                      <div className="space-y-1 text-sm">
                        <div>Alex: score = 48, <Tex math="\tilde{r} = -2" />, <Tex math="D = 0" /></div>
                        <div>
                          <Tex math="\hat{Y}_{\text{Alex}} = " />{" "}
                          <Tex math={`${fmt(sharpCoefs.b0)} + ${fmt(sharpCoefs.b1)} \\times (-2) = ${fmt(sharpCoefs.b0 + sharpCoefs.b1 * (-2))}`} />
                        </div>
                        <div className="mt-2">Jamie: score = 52, <Tex math="\tilde{r} = 2" />, <Tex math="D = 1" /></div>
                        <div>
                          <Tex math="\hat{Y}_{\text{Jamie}} = " />{" "}
                          <Tex math={`${fmt(sharpCoefs.b0)} + ${fmt(sharpCoefs.b1)} \\times 2 + ${fmt(sharpCoefs.b2)} = ${fmt(sharpCoefs.b0 + sharpCoefs.b1 * 2 + sharpCoefs.b2)}`} />
                        </div>
                      </div>
                      <button
                        onClick={() => setShowFit((v) => !v)}
                        className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
                      >
                        {showFit ? "Hide" : "Show"} fitted lines
                      </button>
                      <InfoBox variant="dark">
                        The fitted lines make the discontinuity visible: the right-hand line picks
                        up where the left-hand line would continue, and the vertical gap between
                        them at score = 50 is the estimated LATE of{" "}
                        <strong>{fmt(sharpCoefs.b2, 2)} GPA points</strong> — close to the true
                        effect of 0.40.
                      </InfoBox>
                    </div>
                    <div className="self-center">
                      <ScatterRDDChart
                        students={sharpStudents}
                        coefs={sharpCoefs}
                        showFit={showFit}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 2 — Kernel Weighting & Bandwidth                        */}
          {/* ============================================================ */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-slate-500" />
                    Why Extrapolation Is Dangerous
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Plain OLS fits the regression using every observation in the dataset. But
                    students with scores near 0 or near 100 are far from the threshold — their GPA
                    trend may not describe what happens near score 50 at all. If the true
                    relationship bends or curves far from the cutoff, we are extrapolating a
                    misspecified line all the way to the point we care about.
                  </p>
                  <InfoBox variant="muted" title="Intuition: zoom in on the cutoff">
                    Imagine you are measuring the height of a cliff. You would not estimate it by
                    fitting a line through the entire mountainside — you would walk right up to the
                    edge and look down. The kernel does the same thing: it "zooms in" on the
                    neighbourhood of the cutoff and ignores the rest of the landscape.
                  </InfoBox>
                  <p>
                    The <strong>triangular kernel</strong> gives each observation a weight
                    proportional to its proximity to the threshold: full weight at the cutoff,
                    falling linearly to zero at distance <Tex math="h" />. Only students within{" "}
                    <Tex math="h" /> exam points of score 50 contribute to the estimate:
                  </p>
                  <Tex
                    math="K(u) = \max\!\left(0,\; 1 - \frac{|u|}{h}\right), \qquad u = \frac{\tilde{r}_i}{h}"
                    display
                  />
                  <p className="text-sm text-slate-600">
                    A student with <Tex math="\tilde{r}_i = 0" /> (score exactly 50) gets weight
                    1. A student with <Tex math="\tilde{r}_i = h/2" /> gets weight 0.5. A student
                    further than <Tex math="h" /> away gets weight 0 and is excluded entirely. The
                    weighted estimator solves the same OLS problem but minimises{" "}
                    <Tex math="\sum_i K_i\,(Y_i - \hat{Y}_i)^2" />.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <LabeledSlider
                        label="Bandwidth h"
                        value={[bandwidth]}
                        displayValue={`${bandwidth} pts`}
                        onValueChange={([v]) => setBandwidth(v)}
                        min={5}
                        max={50}
                        step={1}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="Kernel LATE"
                          value={kernelEst ? fmt(kernelEst.b2, 2) : "—"}
                          unit="GPA pts"
                          formula="\hat{\tau}_{h}"
                        />
                        <StatCard
                          label="Obs in window"
                          value={kernelEst ? kernelEst.n : "—"}
                          unit="students"
                        />
                      </div>
                      <InfoBox variant="muted">
                        <strong>Bias-variance tradeoff.</strong> A narrow window (small{" "}
                        <Tex math="h" />) keeps only the students closest to the cutoff — low
                        bias but very few observations, so the estimate is noisy. A wide window
                        uses more students — lower variance — but risks fitting trends that do not
                        hold near score 50. Watch the chart on the right: the estimate stabilises
                        around the true LATE (green line) for moderate bandwidths, then drifts as{" "}
                        <Tex math="h" /> grows large.
                      </InfoBox>
                    </div>
                    <div className="self-center">
                      <BandwidthEstimateChart allStudents={BASE_STUDENTS} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 3 — The McCrary Test                                    */}
          {/* ============================================================ */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-slate-500" />
                    Checking for Manipulation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The smoothness assumption only holds if students cannot manipulate their
                    position relative to the threshold. Imagine the university gives students their
                    score before finalising it, letting them retake one section if they scored just
                    below 50. Students who would have landed at 48 or 49 might push themselves just
                    above the cutoff — but students who scored 52 would not bother. The result is
                    a <strong>bunching</strong> of students just above 50 and a suspicious gap just
                    below.
                  </p>
                  <p>
                    McCrary (2008) formalises this: fit a local polynomial to the density of{" "}
                    <Tex math="R" /> on each side of the cutoff separately, then test whether the
                    two densities match at <Tex math="c" />. A <strong>smooth, continuous
                    density</strong> is evidence against manipulation. A visible spike or drop at
                    the threshold is a warning sign.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3 text-slate-700">
                      <p className="text-sm">
                        Toggle between a <strong>clean design</strong> (density smooth at
                        threshold) and a <strong>manipulated design</strong> (bunching just
                        above the cutoff).
                      </p>
                      <button
                        onClick={() => setManipulated((v) => !v)}
                        className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600"
                      >
                        {manipulated ? "Show clean design" : "Show manipulation"}
                      </button>
                      <p className="text-xs text-slate-600">
                        In the <strong>clean design</strong>, the bars flow smoothly through the
                        threshold — no bump, no gap. Counts on both sides are comparable, so the
                        left and right intercepts of the density are equal at the cutoff. Toggle
                        to the manipulated design to see half the students who scored 45–49 pushed
                        just above 50 — the density spikes on the right, hollows on the left.
                      </p>
                      <InfoBox variant="warning">
                        If you see bunching, the RDD estimate is suspect. Students just above the
                        cutoff are no longer similar to those just below — the treated group now
                        contains a mix of borderline students <em>and</em> strategic ones who
                        selected in. Comparability breaks down.
                      </InfoBox>
                    </div>
                    <div className="self-center">
                      <McCraryDensityChart
                        students={BASE_STUDENTS}
                        manipulated={manipulated}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <InfoBox title="Other validity checks" variant="outline">
                <ul className="space-y-2 text-sm list-disc list-inside">
                  <li>
                    <strong>Covariate smoothness.</strong> Pre-determined variables (prior GPA,
                    gender, family income) should not jump at the threshold. Run the same RDD
                    regression with each baseline covariate as the outcome. A significant{" "}
                    <Tex math="\hat{\beta}_2" /> on a covariate is evidence of selection.
                  </li>
                  <li>
                    <strong>Placebo cutoffs.</strong> Move the threshold to an arbitrary value
                    (say, score = 40 or score = 60) and re-run the regression. If you find large
                    effects there too, the discontinuity at 50 is probably not causal.
                  </li>
                  <li>
                    <strong>Donut-hole test.</strong> Drop observations very close to the
                    threshold (e.g., scores 49–51) and check that the estimate is stable. If the
                    result flips, those marginal observations were driving everything — a sign of
                    fragility.
                  </li>
                  <li>
                    <strong>Functional form sensitivity.</strong> Try quadratic and cubic trends
                    in <Tex math="\tilde{r}" />. If the estimate changes dramatically with the
                    polynomial order, the linear approximation may be misleading.
                  </li>
                </ul>
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 4 — Fuzzy RDD & the Sheepskin Effect                    */}
          {/* ============================================================ */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GraduationCap className="h-4 w-4 text-slate-500" />
                    Fuzzy RDD: A Jump in Probability, Not Certainty
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    In the sharp design, the threshold <em>completely</em> determines treatment:{" "}
                    score ≥ 50 means scholarship, full stop. In practice, thresholds often create
                    a <strong>jump in the probability</strong> of treatment rather than a
                    deterministic switch. Some students above the cutoff may decline the
                    scholarship; some below may qualify through an appeals process. This is a{" "}
                    <strong>fuzzy RDD</strong>.
                  </p>
                  <p>
                    The threshold indicator <Tex math="Z_i = \mathbf{1}\{R_i \geq c\}" /> now
                    acts as an <strong>instrumental variable</strong> for treatment{" "}
                    <Tex math="D_i" />. It is correlated with receiving treatment (relevance) and
                    its only channel to the outcome is through that treatment (exclusion). The
                    Wald estimator scales the reduced-form jump by the first-stage jump:
                  </p>
                  <Tex
                    math="\tau_{Fuzzy} = \frac{\lim_{r \downarrow c} \mathbb{E}[Y_i \mid R_i = r] - \lim_{r \uparrow c} \mathbb{E}[Y_i \mid R_i = r]}{\lim_{r \downarrow c} \mathbb{E}[D_i \mid R_i = r] - \lim_{r \uparrow c} \mathbb{E}[D_i \mid R_i = r]}"
                    display
                  />
                  <p className="text-sm text-slate-600">
                    This estimates the LATE for <strong>compliers</strong> at the threshold —
                    students who take up the scholarship because they crossed the cutoff and would
                    not have otherwise. Always-takers (who would get it regardless) and
                    never-takers (who would refuse regardless) are not identified by this design.
                  </p>
                  <InfoBox variant="muted" title="Intuition: why divide by the first stage?">
                    Imagine the outcome jumps by 2 points at the cutoff, but only 40% of students
                    actually change treatment status at the threshold. If we naively report the
                    2-point jump as the treatment effect, we under-count — the 2 points were
                    produced by only 40% of the sample switching. The true per-person effect for
                    those who switched must be{" "}
                    <Tex math="2 / 0.4 = 5" /> points. The denominator corrects for "dilution"
                    caused by non-compliance.
                  </InfoBox>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">The Sheepskin Effect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Why do college graduates earn so much more than non-graduates? Two competing
                    theories give very different answers. <strong>Human capital theory</strong>{" "}
                    says education makes you genuinely more productive — you learned skills that
                    employers value. <strong>Signalling theory</strong> says the diploma itself is
                    the prize: it certifies completion to employers who cannot directly observe
                    ability, even if the last few credits taught you nothing new.
                  </p>
                  <p>
                    Clark &amp; Martorell (2014) used a clever fuzzy RDD to disentangle these
                    explanations. In Texas, students who accumulated 120 credits were eligible to
                    receive a diploma — but not all of them did (some dropped out; some found
                    alternative routes). Students just above and just below the 120-credit
                    threshold have <em>identical human capital</em> (smooth accumulation of
                    skills), but their probability of holding a diploma jumps discontinuously.
                    If signalling drives the earnings premium, we should see an earnings jump at
                    the 120-credit threshold that mirrors the diploma-receipt jump. If human
                    capital drives it, earnings should be smooth because skills are smooth.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3 text-slate-700 text-sm">
                      <p className="text-sm text-slate-600">
                        Each dot shows the diploma receipt rate for a group of students with
                        similar credit counts. Below 120 credits, about{" "}
                        <strong>40%</strong> hold a diploma; above 120, about{" "}
                        <strong>80%</strong> do. The threshold does not flip treatment from 0 to
                        1 — it shifts the probability by roughly 40 percentage points. This jump
                        is the <strong>first stage</strong> of the IV.
                      </p>
                      <p className="text-sm text-slate-600">
                        Notice how credits and diploma receipt do not line up perfectly: some
                        high-credit students still lack a diploma (they left before completing
                        requirements), while some low-credit students have one (transferred credits,
                        prior learning awards). This imperfect compliance is what makes the design
                        fuzzy.
                      </p>
                      <div className="grid gap-3 grid-cols-2">
                        <StatCard
                          label="P(diploma | below)"
                          value="~40%"
                        />
                        <StatCard
                          label="P(diploma | above)"
                          value="~80%"
                        />
                      </div>
                    </div>
                    <div className="self-center">
                      <FuzzyScatterChart fuzzyData={BASE_FUZZY} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/* Step 5 — Estimating the Fuzzy RDD                            */}
          {/* ============================================================ */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sigma className="h-4 w-4 text-slate-500" />
                    Two-Stage Estimation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    We run two regressions — both use the threshold indicator{" "}
                    <Tex math="Z_i = \mathbf{1}\{\text{credits} \geq 120\}" /> and allow
                    different slopes on each side. The <strong>first stage</strong> regresses
                    diploma receipt on the threshold:
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">First stage</p>
                    <Tex
                      math="D_i = \alpha_0 + \alpha_1 \tilde{r}_i + \alpha_2 Z_i + \alpha_3 (Z_i \cdot \tilde{r}_i) + u_i"
                      display
                    />
                    <p className="text-sm text-slate-600">
                      Here <Tex math="\hat{\alpha}_2" /> captures how much the probability of
                      diploma receipt jumps at 120 credits. In our data this is roughly{" "}
                      <strong>+0.40</strong> (the ~40 percentage point jump we saw in the chart).
                    </p>
                    <p className="text-sm font-medium text-slate-600">Reduced form</p>
                    <Tex
                      math="Y_i = \gamma_0 + \gamma_1 \tilde{r}_i + \gamma_2 Z_i + \gamma_3 (Z_i \cdot \tilde{r}_i) + v_i"
                      display
                    />
                    <p className="text-sm text-slate-600">
                      The <strong>reduced form</strong> asks: does crossing the 120-credit line
                      change log-earnings directly? <Tex math="\hat{\gamma}_2" /> is that raw jump
                      — the intention-to-treat effect of being above the threshold.
                    </p>
                    <p className="text-sm font-medium text-slate-600">Wald estimator</p>
                    <Tex
                      math="\hat{\tau}_{Fuzzy} = \frac{\hat{\gamma}_2}{\hat{\alpha}_2}"
                      display
                    />
                    <p className="text-sm text-slate-600">
                      Dividing by the first stage scales up the reduced-form jump to account for
                      the fact that crossing the threshold does not guarantee a diploma. If only
                      40% of students comply, but earnings jumped by <Tex math="\hat{\gamma}_2" />,
                      the effect on those who actually got the diploma must be{" "}
                      <Tex math="\hat{\gamma}_2 / 0.40" />.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="Reduced form"
                      value={fmt(waldEst.reducedForm, 3)}
                      unit="log-earnings / threshold"
                      formula="\hat{\gamma}_2"
                    />
                    <StatCard
                      label="First stage"
                      value={fmt(waldEst.firstStage, 3)}
                      unit="P(diploma) / threshold"
                      formula="\hat{\alpha}_2"
                    />
                    <StatCard
                      label="Wald (LATE)"
                      value={fmt(waldEst.wald, 3)}
                      unit="log-earnings per diploma"
                      formula="\hat{\tau}_{Fuzzy}"
                    />
                  </div>
                  <p className="text-sm text-slate-600">
                    The Wald estimate above is the LATE for compliers at the 120-credit threshold.
                    To obtain standard errors, use a <strong>bootstrap</strong>: (1) resample the
                    250 students with replacement; (2) re-run the first-stage and reduced-form
                    regressions on the resample; (3) recompute{" "}
                    <Tex math="\hat{\tau}_{Fuzzy} = \hat{\gamma}_2 / \hat{\alpha}_2" />; (4)
                    repeat B = 1,000 times. The standard deviation of the B estimates is the
                    bootstrap standard error. The true sheepskin effect in our simulation is{" "}
                    <strong>{TRUE_SHEEPSKIN} log-points</strong>. With only 250 observations,
                    the Wald estimate is noisy — but importantly, a confidence interval would
                    comfortably span zero, consistent with no sheepskin effect.
                  </p>
                  <InfoBox variant="muted" title="Intuition: why is the estimate noisy?">
                    The Wald estimator divides two noisy numbers — a small reduced-form jump by a
                    moderate first-stage jump. When the numerator is close to zero (as it is when
                    the true effect is tiny), even small sampling noise produces big swings in the
                    ratio. This is a known weakness of IV-style estimators with small effects.
                  </InfoBox>
                  <InfoBox variant="dark" title="The sheepskin result">
                    After accounting for selection into graduation, the diploma credential itself
                    adds very little to earnings — our Wald estimate of{" "}
                    <strong>{fmt(waldEst.wald, 3)} log-points</strong> is small and
                    statistically indistinguishable from zero (true effect: {TRUE_SHEEPSKIN}).
                    The raw earnings gap between graduates and non-graduates is large, but that
                    gap is explained by <em>skills accumulated en route to the degree</em>, not
                    by the credential. Human capital, not signalling, is the dominant mechanism.
                  </InfoBox>
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
                question="What is the key identifying assumption in RDD?"
                options={[
                  "Potential outcomes are independent of the running variable.",
                  "Potential outcomes are smooth (continuous) in the running variable at the cutoff.",
                  "The running variable is randomly assigned.",
                  "Treatment effects are constant across all values of the running variable.",
                ]}
                answer={1}
                explanation="The smoothness (continuity) assumption says that all factors other than treatment vary continuously at the cutoff. A discontinuity in the outcome can therefore only be caused by the treatment — not by some other variable that jumps at the same threshold."
              />
              <QuizCard
                question="In the sharp RDD regression y = β₀ + β₁·r̃ + β₂·D + β₃·(D·r̃), why does centering the running variable (r̃ = R − c) matter?"
                options={[
                  "It reduces heteroscedasticity in the error term.",
                  "It ensures β₂ equals the estimated ATE over the full sample.",
                  "It ensures β₂ equals the estimated LATE at the threshold (where r̃ = 0).",
                  "It removes the need for the slope interaction term β₃.",
                ]}
                answer={2}
                explanation="When r̃ = R − c, the intercept shift β₂ is evaluated at r̃ = 0, i.e., exactly at the threshold. Without centering, β₂ would be the shift at R = 0, which is typically far from the cutoff and meaningless."
              />
              <QuizCard
                question="What does the McCrary density test check?"
                options={[
                  "Whether the treatment effect varies with the running variable.",
                  "Whether the running variable's density is discontinuous at the threshold.",
                  "Whether the outcome is normally distributed above the threshold.",
                  "Whether unobserved confounders are correlated with the running variable.",
                ]}
                answer={1}
                explanation="A manipulation test checks if units can sort themselves just above (or below) the cutoff. If they can, the density of the running variable will show a jump at the threshold. A smooth, continuous density is consistent with no manipulation."
              />
              <QuizCard
                question="How does fuzzy RDD connect to instrumental variables?"
                options={[
                  "The outcome is used as an instrument for treatment.",
                  "The threshold indicator Z = 1{R ≥ c} is used as an instrument for treatment D.",
                  "The running variable R is used as an instrument for the outcome.",
                  "The treatment is used as an instrument for the running variable.",
                ]}
                answer={1}
                explanation="In fuzzy RDD, the threshold indicator Z = 1{R ≥ c} causes a jump in the probability of treatment but does not fully determine it. This makes Z a valid instrument: it is correlated with treatment (relevance) and only affects outcomes through treatment (exclusion restriction holds locally at the threshold)."
              />
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
