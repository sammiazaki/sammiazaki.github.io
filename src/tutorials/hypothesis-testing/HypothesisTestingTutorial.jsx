import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FlaskConical,
  BarChart3,
  GitCompare,
  Layers,
  Grid3X3,
  Activity,
  AlertTriangle,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  TutorialShell,
  StepContent,
  QuizCard,
  StatCard,
  InfoBox,
  LabeledSlider,
  CodeBlock,
  Tex,
} from "@/components/tutorial";

/* ================================================================== */
/*  Running example — Sunrise Roasters                                 */
/*                                                                     */
/*  A specialty coffee roaster tracking bean quality across origins,    */
/*  roast profiles, and customer preferences. This theme naturally     */
/*  spans every statistical test family.                                */
/* ================================================================== */

function fmt(x, d = 2) {
  return Number(x).toFixed(d);
}

/* ------------------------------------------------------------------ */
/*  Statistical utility functions                                      */
/* ------------------------------------------------------------------ */

function normalPDF(x) {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);
}

function normalCDF(x) {
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * ax);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * y);
}

function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variance(arr, ddof = 1) {
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - ddof);
}

function std(arr, ddof = 1) {
  return Math.sqrt(variance(arr, ddof));
}

/* ------------------------------------------------------------------ */
/*  Seeded PRNG                                                        */
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

/* ------------------------------------------------------------------ */
/*  Fixed datasets for hand calculations                               */
/* ------------------------------------------------------------------ */

// Step 2: One-sample — roast temperatures (target 200°C)
const ROAST_TEMPS = [198.2, 201.5, 199.8, 202.1, 197.3, 200.9, 203.2, 198.0];
const TEMP_TARGET = 200;

// Step 3: Two-sample independent — Ethiopian vs Colombian taste scores
const ETHIOPIAN = [84, 82, 86, 81, 85, 83, 87, 80, 84, 88];
const COLOMBIAN = [79, 81, 77, 80, 78, 82, 76, 80, 79, 78];

// Step 4: Paired — same 8 batches, light vs dark roast
const LIGHT_SCORES = [78, 82, 75, 80, 77, 83, 79, 76];
const DARK_SCORES = [81, 85, 77, 84, 80, 85, 82, 79];
const BATCH_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const PAIRED_DIFFS = DARK_SCORES.map((d, i) => d - LIGHT_SCORES[i]);

// Step 5: K-sample — 4 origins
const ORIGINS = {
  Ethiopian: [84, 82, 86, 81, 85, 83],
  Colombian: [79, 81, 77, 80, 78, 82],
  Brazilian: [76, 78, 74, 77, 75, 80],
  Kenyan: [85, 87, 83, 86, 84, 88],
};

// Step 6: Categorical — roast level × repurchase
const CONTINGENCY = {
  light: { buyAgain: 45, wontBuy: 15 },
  dark: { buyAgain: 30, wontBuy: 30 },
};

// Step 8: Correlation — roast temp vs taste (inverted U)
const CORR_TEMP = [190, 195, 198, 200, 202, 205, 208, 210, 215, 220];
const CORR_TASTE = [72, 75, 79, 82, 84, 85, 83, 80, 76, 70];

/* ------------------------------------------------------------------ */
/*  Pre-computed statistics                                            */
/* ------------------------------------------------------------------ */

// One-sample
const TEMP_MEAN = mean(ROAST_TEMPS);
const TEMP_STD = std(ROAST_TEMPS);
const TEMP_N = ROAST_TEMPS.length;
const TEMP_T = (TEMP_MEAN - TEMP_TARGET) / (TEMP_STD / Math.sqrt(TEMP_N));
const TEMP_ABOVE = ROAST_TEMPS.filter((t) => t > TEMP_TARGET).length;

// Two-sample
const ETH_MEAN = mean(ETHIOPIAN);
const ETH_STD = std(ETHIOPIAN);
const COL_MEAN = mean(COLOMBIAN);
const COL_STD = std(COLOMBIAN);
const WELCH_SE = Math.sqrt(
  ETH_STD ** 2 / ETHIOPIAN.length + COL_STD ** 2 / COLOMBIAN.length
);
const WELCH_T = (ETH_MEAN - COL_MEAN) / WELCH_SE;

// Paired
const DIFF_MEAN = mean(PAIRED_DIFFS);
const DIFF_STD = std(PAIRED_DIFFS);
const PAIRED_T = DIFF_MEAN / (DIFF_STD / Math.sqrt(PAIRED_DIFFS.length));

// K-sample ANOVA
const ALL_SCORES = Object.values(ORIGINS).flat();
const GRAND_MEAN = mean(ALL_SCORES);
const ORIGIN_NAMES = Object.keys(ORIGINS);
const GROUP_MEANS = ORIGIN_NAMES.map((k) => mean(ORIGINS[k]));
const GROUP_N = 6;
const K_GROUPS = 4;
const N_TOTAL = K_GROUPS * GROUP_N;
const SSB = GROUP_MEANS.reduce(
  (s, m) => s + GROUP_N * (m - GRAND_MEAN) ** 2,
  0
);
const SSW = ORIGIN_NAMES.reduce(
  (s, k) =>
    s + ORIGINS[k].reduce((ss, v) => ss + (v - mean(ORIGINS[k])) ** 2, 0),
  0
);
const DF_BETWEEN = K_GROUPS - 1;
const DF_WITHIN = N_TOTAL - K_GROUPS;
const MSB = SSB / DF_BETWEEN;
const MSW = SSW / DF_WITHIN;
const F_STAT = MSB / MSW;

// Contingency table
const CT = CONTINGENCY;
const CT_TOTAL = CT.light.buyAgain + CT.light.wontBuy + CT.dark.buyAgain + CT.dark.wontBuy;
const CT_ROW_LIGHT = CT.light.buyAgain + CT.light.wontBuy;
const CT_ROW_DARK = CT.dark.buyAgain + CT.dark.wontBuy;
const CT_COL_BUY = CT.light.buyAgain + CT.dark.buyAgain;
const CT_COL_WONT = CT.light.wontBuy + CT.dark.wontBuy;
const E_LB = (CT_ROW_LIGHT * CT_COL_BUY) / CT_TOTAL;
const E_LW = (CT_ROW_LIGHT * CT_COL_WONT) / CT_TOTAL;
const E_DB = (CT_ROW_DARK * CT_COL_BUY) / CT_TOTAL;
const E_DW = (CT_ROW_DARK * CT_COL_WONT) / CT_TOTAL;
const CHI2 =
  (CT.light.buyAgain - E_LB) ** 2 / E_LB +
  (CT.light.wontBuy - E_LW) ** 2 / E_LW +
  (CT.dark.buyAgain - E_DB) ** 2 / E_DB +
  (CT.dark.wontBuy - E_DW) ** 2 / E_DW;

// Correlation
const CORR_TEMP_MEAN = mean(CORR_TEMP);
const CORR_TASTE_MEAN = mean(CORR_TASTE);
const SXY = CORR_TEMP.reduce(
  (s, x, i) => s + (x - CORR_TEMP_MEAN) * (CORR_TASTE[i] - CORR_TASTE_MEAN),
  0
);
const SXX = CORR_TEMP.reduce(
  (s, x) => s + (x - CORR_TEMP_MEAN) ** 2,
  0
);
const SYY = CORR_TASTE.reduce(
  (s, y) => s + (y - CORR_TASTE_MEAN) ** 2,
  0
);
const PEARSON_R = SXY / Math.sqrt(SXX * SYY);

/* PythonCode — thin alias for CodeBlock with language="python" */
function PythonCode({ code }) {
  return <CodeBlock code={code} language="python" />;
}

/* ------------------------------------------------------------------ */
/*  SVG chart constants                                                */
/* ------------------------------------------------------------------ */

const W = 460;
const H = 200;
const PAD = { top: 16, right: 18, bottom: 32, left: 48 };

/* ------------------------------------------------------------------ */
/*  Lessons array                                                      */
/* ------------------------------------------------------------------ */

const lessons = [
  "Why So Many Tests?",
  "Anatomy of a Test",
  "One-Sample Tests",
  "Two-Sample Independent Tests",
  "Paired Tests",
  "K-Sample Tests",
  "Categorical Data Tests",
  "Goodness-of-Fit Tests",
  "Correlation Tests",
  "Multiple Testing",
  "Power & Sample Size",
  "Quiz",
];

/* ================================================================== */
/*  SVG Chart Components                                               */
/* ================================================================== */

/* ---- Normal curve with rejection region (Step 1) ---- */
function NullDistChart({ alpha, zObs = 1.96 }) {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const xMin = -3.5,
    xMax = 3.5;
  const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;
  const sy = (y) => PAD.top + ph - (y / 0.42) * ph;

  const zAlpha = (() => {
    // Newton's method on normalCDF for two-tailed
    let z = 1.96;
    for (let iter = 0; iter < 20; iter++) {
      const p = 2 * (1 - normalCDF(z));
      const dp = -2 * normalPDF(z);
      z = z - (p - alpha) / dp;
    }
    return z;
  })();

  const nPts = 200;
  const curvePts = [];
  for (let i = 0; i <= nPts; i++) {
    const x = xMin + (i / nPts) * (xMax - xMin);
    curvePts.push({ x, y: normalPDF(x) });
  }

  const curvePath = curvePts
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`)
    .join(" ");

  // Rejection region paths (two-tailed)
  const leftReject = curvePts
    .filter((p) => p.x <= -zAlpha)
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`)
    .join(" ");
  const rightReject = curvePts
    .filter((p) => p.x >= zAlpha)
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`)
    .join(" ");

  const leftFill = leftReject
    ? `${leftReject} L${sx(-zAlpha)},${sy(0)} L${sx(-3.5)},${sy(0)} Z`
    : "";
  const rightFill = rightReject
    ? `${rightReject} L${sx(3.5)},${sy(0)} L${sx(zAlpha)},${sy(0)} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Null distribution (standard normal)
      </text>
      {/* x-axis */}
      <line
        x1={PAD.left}
        y1={sy(0)}
        x2={W - PAD.right}
        y2={sy(0)}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      {[-3, -2, -1, 0, 1, 2, 3].map((tick) => (
        <g key={tick}>
          <line
            x1={sx(tick)}
            y1={sy(0)}
            x2={sx(tick)}
            y2={sy(0) + 4}
            stroke="#cbd5e1"
          />
          <text
            x={sx(tick)}
            y={sy(0) + 14}
            textAnchor="middle"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {/* Rejection region shading */}
      {leftFill && <path d={leftFill} fill="#f87171" opacity={0.35} />}
      {rightFill && <path d={rightFill} fill="#f87171" opacity={0.35} />}
      {/* Curve */}
      <path d={curvePath} fill="none" stroke="#1e293b" strokeWidth={2} />
      {/* Critical value lines */}
      <line
        x1={sx(-zAlpha)}
        y1={PAD.top}
        x2={sx(-zAlpha)}
        y2={sy(0)}
        stroke="#f87171"
        strokeWidth={1}
        strokeDasharray="4,2"
      />
      <line
        x1={sx(zAlpha)}
        y1={PAD.top}
        x2={sx(zAlpha)}
        y2={sy(0)}
        stroke="#f87171"
        strokeWidth={1}
        strokeDasharray="4,2"
      />
      {/* Observed statistic */}
      <line
        x1={sx(zObs)}
        y1={PAD.top}
        x2={sx(zObs)}
        y2={sy(0)}
        stroke="#10b981"
        strokeWidth={2}
      />
      <text
        x={sx(zObs)}
        y={PAD.top - 2}
        textAnchor="middle"
        className="text-[9px] fill-emerald-600 font-medium"
      >
        z = {fmt(zObs, 2)}
      </text>
      {/* Labels */}
      <text
        x={sx(-zAlpha) - 8}
        y={sy(0) + 26}
        textAnchor="middle"
        className="text-[9px] fill-red-500"
      >
        −{fmt(zAlpha, 2)}
      </text>
      <text
        x={sx(zAlpha) + 8}
        y={sy(0) + 26}
        textAnchor="middle"
        className="text-[9px] fill-red-500"
      >
        +{fmt(zAlpha, 2)}
      </text>
    </svg>
  );
}

/* ---- Dot plot for one-sample (Step 2) ---- */
function TempDotPlot() {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const xMin = 196,
    xMax = 204;
  const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;
  const cy = PAD.top + ph / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H - 20}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Roast temperatures (°C) — 8 batches
      </text>
      {/* x-axis */}
      <line
        x1={PAD.left}
        y1={cy + 30}
        x2={W - PAD.right}
        y2={cy + 30}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      {[196, 197, 198, 199, 200, 201, 202, 203, 204].map((tick) => (
        <g key={tick}>
          <line
            x1={sx(tick)}
            y1={cy + 30}
            x2={sx(tick)}
            y2={cy + 34}
            stroke="#cbd5e1"
          />
          <text
            x={sx(tick)}
            y={cy + 45}
            textAnchor="middle"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {/* Target line */}
      <line
        x1={sx(TEMP_TARGET)}
        y1={PAD.top + 10}
        x2={sx(TEMP_TARGET)}
        y2={cy + 30}
        stroke="#f59e0b"
        strokeWidth={1.5}
        strokeDasharray="6,3"
      />
      <text
        x={sx(TEMP_TARGET) + 4}
        y={PAD.top + 20}
        className="text-[9px] fill-amber-600"
      >
        Target: 200°C
      </text>
      {/* Data points */}
      {ROAST_TEMPS.map((t, i) => (
        <circle
          key={i}
          cx={sx(t)}
          cy={cy}
          r={5}
          fill="#1e293b"
          opacity={0.7}
        />
      ))}
      {/* Mean marker */}
      <polygon
        points={`${sx(TEMP_MEAN)},${cy - 16} ${sx(TEMP_MEAN) - 6},${cy - 26} ${sx(TEMP_MEAN) + 6},${cy - 26}`}
        fill="#10b981"
      />
      <text
        x={sx(TEMP_MEAN)}
        y={cy - 30}
        textAnchor="middle"
        className="text-[9px] fill-emerald-600 font-medium"
      >
        x̄ = {fmt(TEMP_MEAN, 1)}
      </text>
    </svg>
  );
}

/* ---- Strip plot for two groups (Step 3) ---- */
function TwoGroupStripPlot() {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const xMin = 74,
    xMax = 90;
  const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;

  const groups = [
    { name: "Colombian", data: COLOMBIAN, y: PAD.top + ph * 0.65, color: "#94a3b8", mean: COL_MEAN },
    { name: "Ethiopian", data: ETHIOPIAN, y: PAD.top + ph * 0.3, color: "#1e293b", mean: ETH_MEAN },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Blind taste scores by origin
      </text>
      {/* x-axis */}
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      {[74, 76, 78, 80, 82, 84, 86, 88, 90].map((tick) => (
        <g key={tick}>
          <line
            x1={sx(tick)}
            y1={H - PAD.bottom}
            x2={sx(tick)}
            y2={H - PAD.bottom + 4}
            stroke="#cbd5e1"
          />
          <text
            x={sx(tick)}
            y={H - PAD.bottom + 15}
            textAnchor="middle"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {groups.map((g) => (
        <g key={g.name}>
          <text
            x={PAD.left - 6}
            y={g.y + 4}
            textAnchor="end"
            className="text-[10px] fill-slate-600"
          >
            {g.name}
          </text>
          {g.data.map((v, i) => (
            <circle
              key={i}
              cx={sx(v)}
              cy={g.y}
              r={4}
              fill={g.color}
              opacity={0.65}
            />
          ))}
          {/* Mean diamond */}
          <polygon
            points={`${sx(g.mean)},${g.y - 8} ${sx(g.mean) - 5},${g.y} ${sx(g.mean)},${g.y + 8} ${sx(g.mean) + 5},${g.y}`}
            fill={g.color}
            stroke="white"
            strokeWidth={1}
          />
        </g>
      ))}
    </svg>
  );
}

/* ---- Permutation histogram (Step 3) ---- */
function PermutationChart({ nPerms }) {
  const permDiffs = useMemo(() => {
    const combined = [...ETHIOPIAN, ...COLOMBIAN];
    const n1 = ETHIOPIAN.length;
    const rng = mulberry32(123);
    const diffs = [];
    for (let p = 0; p < nPerms; p++) {
      // Fisher-Yates shuffle
      const shuffled = [...combined];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const m1 = mean(shuffled.slice(0, n1));
      const m2 = mean(shuffled.slice(n1));
      diffs.push(m1 - m2);
    }
    return diffs;
  }, [nPerms]);

  const obsDiff = ETH_MEAN - COL_MEAN;
  const pValue = permDiffs.filter((d) => Math.abs(d) >= Math.abs(obsDiff)).length / nPerms;

  // Build histogram
  const binMin = -8,
    binMax = 8,
    nBins = 32;
  const binW = (binMax - binMin) / nBins;
  const bins = Array(nBins).fill(0);
  for (const d of permDiffs) {
    const idx = Math.floor((d - binMin) / binW);
    if (idx >= 0 && idx < nBins) bins[idx]++;
  }
  const maxBin = Math.max(...bins);

  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const sx = (x) => PAD.left + ((x - binMin) / (binMax - binMin)) * pw;
  const sy = (y) => PAD.top + ph - (y / maxBin) * ph;
  const barW = pw / nBins;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <text
          x={W / 2}
          y={10}
          textAnchor="middle"
          className="text-[10px] fill-slate-400"
        >
          Permutation null distribution ({nPerms} shuffles)
        </text>
        {/* x-axis */}
        <line
          x1={PAD.left}
          y1={sy(0)}
          x2={W - PAD.right}
          y2={sy(0)}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {[-6, -4, -2, 0, 2, 4, 6].map((tick) => (
          <g key={tick}>
            <line
              x1={sx(tick)}
              y1={sy(0)}
              x2={sx(tick)}
              y2={sy(0) + 4}
              stroke="#cbd5e1"
            />
            <text
              x={sx(tick)}
              y={sy(0) + 14}
              textAnchor="middle"
              className="text-[10px] fill-slate-500"
            >
              {tick}
            </text>
          </g>
        ))}
        {/* Bars */}
        {bins.map((count, i) => {
          const bx = binMin + i * binW;
          const isExtreme = Math.abs(bx + binW / 2) >= Math.abs(obsDiff);
          return (
            <rect
              key={i}
              x={sx(bx)}
              y={sy(count)}
              width={barW - 1}
              height={sy(0) - sy(count)}
              fill={isExtreme ? "#f87171" : "#94a3b8"}
              opacity={0.55}
            />
          );
        })}
        {/* Observed difference line */}
        <line
          x1={sx(obsDiff)}
          y1={PAD.top}
          x2={sx(obsDiff)}
          y2={sy(0)}
          stroke="#10b981"
          strokeWidth={2}
        />
        <text
          x={sx(obsDiff) + 4}
          y={PAD.top + 14}
          className="text-[9px] fill-emerald-600 font-medium"
        >
          Observed: +{fmt(obsDiff, 1)}
        </text>
      </svg>
      <p className="text-xs text-slate-500 mt-1 text-center">
        p-value ≈ {fmt(pValue, 4)} — proportion of shuffles with |diff| ≥{" "}
        {fmt(obsDiff, 1)} (shaded red)
      </p>
    </div>
  );
}

/* ---- Paired line plot (Step 4) ---- */
function PairedLinePlot() {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const xSpacing = pw / (BATCH_NAMES.length + 1);
  const yMin = 73,
    yMax = 87;
  const sy = (y) => PAD.top + ph - ((y - yMin) / (yMax - yMin)) * ph;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Same batch: light vs dark roast scores
      </text>
      {/* y-axis ticks */}
      {[74, 76, 78, 80, 82, 84, 86].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left - 4}
            y1={sy(tick)}
            x2={PAD.left}
            y2={sy(tick)}
            stroke="#cbd5e1"
          />
          <line
            x1={PAD.left}
            y1={sy(tick)}
            x2={W - PAD.right}
            y2={sy(tick)}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
          <text
            x={PAD.left - 8}
            y={sy(tick) + 3}
            textAnchor="end"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {/* Batch lines */}
      {BATCH_NAMES.map((name, i) => {
        const cx = PAD.left + (i + 1) * xSpacing;
        const diff = DARK_SCORES[i] - LIGHT_SCORES[i];
        return (
          <g key={name}>
            <line
              x1={cx}
              y1={sy(LIGHT_SCORES[i])}
              x2={cx}
              y2={sy(DARK_SCORES[i])}
              stroke={diff > 0 ? "#10b981" : "#f87171"}
              strokeWidth={2}
              opacity={0.7}
            />
            <circle cx={cx} cy={sy(LIGHT_SCORES[i])} r={4} fill="#94a3b8" />
            <circle cx={cx} cy={sy(DARK_SCORES[i])} r={4} fill="#1e293b" />
            <text
              x={cx}
              y={H - 8}
              textAnchor="middle"
              className="text-[10px] fill-slate-500"
            >
              {name}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <circle cx={W - 100} cy={PAD.top + 8} r={4} fill="#1e293b" />
      <text
        x={W - 92}
        y={PAD.top + 12}
        className="text-[9px] fill-slate-600"
      >
        Dark roast
      </text>
      <circle cx={W - 100} cy={PAD.top + 22} r={4} fill="#94a3b8" />
      <text
        x={W - 92}
        y={PAD.top + 26}
        className="text-[9px] fill-slate-600"
      >
        Light roast
      </text>
    </svg>
  );
}

/* ---- K-sample dot plot (Step 5) ---- */
function KSampleDotPlot() {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const xMin = 72,
    xMax = 90;
  const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;
  const colors = ["#1e293b", "#94a3b8", "#f59e0b", "#10b981"];
  const yPositions = ORIGIN_NAMES.map(
    (_, i) => PAD.top + 10 + (i / (K_GROUPS - 1)) * (ph - 20)
  );

  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Taste scores by origin (n=6 each)
      </text>
      {/* x-axis */}
      <line
        x1={PAD.left}
        y1={H - PAD.bottom + 10}
        x2={W - PAD.right}
        y2={H - PAD.bottom + 10}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      {[72, 74, 76, 78, 80, 82, 84, 86, 88, 90].map((tick) => (
        <g key={tick}>
          <line
            x1={sx(tick)}
            y1={H - PAD.bottom + 10}
            x2={sx(tick)}
            y2={H - PAD.bottom + 14}
            stroke="#cbd5e1"
          />
          <text
            x={sx(tick)}
            y={H - PAD.bottom + 24}
            textAnchor="middle"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {ORIGIN_NAMES.map((name, gi) => (
        <g key={name}>
          <text
            x={PAD.left - 6}
            y={yPositions[gi] + 4}
            textAnchor="end"
            className="text-[10px] fill-slate-600"
          >
            {name}
          </text>
          {ORIGINS[name].map((v, i) => (
            <circle
              key={i}
              cx={sx(v)}
              cy={yPositions[gi]}
              r={4}
              fill={colors[gi]}
              opacity={0.65}
            />
          ))}
          {/* Mean line */}
          <line
            x1={sx(GROUP_MEANS[gi]) - 8}
            y1={yPositions[gi]}
            x2={sx(GROUP_MEANS[gi]) + 8}
            y2={yPositions[gi]}
            stroke={colors[gi]}
            strokeWidth={2.5}
          />
        </g>
      ))}
      {/* Grand mean */}
      <line
        x1={sx(GRAND_MEAN)}
        y1={PAD.top}
        x2={sx(GRAND_MEAN)}
        y2={H - PAD.bottom + 10}
        stroke="#f87171"
        strokeWidth={1}
        strokeDasharray="4,2"
      />
      <text
        x={sx(GRAND_MEAN) + 3}
        y={PAD.top + 4}
        className="text-[9px] fill-red-500"
      >
        Grand mean: {fmt(GRAND_MEAN, 1)}
      </text>
    </svg>
  );
}

/* ---- Contingency bar chart (Step 6) ---- */
function ContingencyChart() {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const barGroupW = pw / 3;
  const barW = barGroupW * 0.35;
  const yMax = 50;
  const sy = (y) => PAD.top + ph - (y / yMax) * ph;

  const groups = [
    {
      label: "Light roast",
      bars: [
        { label: "Buy again", val: CT.light.buyAgain, color: "#10b981" },
        { label: "Won't buy", val: CT.light.wontBuy, color: "#f87171" },
      ],
    },
    {
      label: "Dark roast",
      bars: [
        { label: "Buy again", val: CT.dark.buyAgain, color: "#10b981" },
        { label: "Won't buy", val: CT.dark.wontBuy, color: "#f87171" },
      ],
    },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Customer repurchase by roast level
      </text>
      {/* y-axis */}
      {[0, 10, 20, 30, 40, 50].map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            y1={sy(tick)}
            x2={W - PAD.right}
            y2={sy(tick)}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
          <text
            x={PAD.left - 6}
            y={sy(tick) + 3}
            textAnchor="end"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {/* Bars */}
      {groups.map((g, gi) => {
        const groupX = PAD.left + (gi + 0.5) * barGroupW + barGroupW * 0.2;
        return (
          <g key={g.label}>
            {g.bars.map((b, bi) => (
              <g key={b.label}>
                <rect
                  x={groupX + bi * (barW + 4)}
                  y={sy(b.val)}
                  width={barW}
                  height={sy(0) - sy(b.val)}
                  fill={b.color}
                  opacity={0.55}
                  rx={2}
                />
                <text
                  x={groupX + bi * (barW + 4) + barW / 2}
                  y={sy(b.val) - 4}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-600"
                >
                  {b.val}
                </text>
              </g>
            ))}
            <text
              x={groupX + barW}
              y={sy(0) + 14}
              textAnchor="middle"
              className="text-[10px] fill-slate-600"
            >
              {g.label}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={W - 100} y={PAD.top} width={10} height={10} fill="#10b981" opacity={0.55} rx={1} />
      <text x={W - 86} y={PAD.top + 9} className="text-[9px] fill-slate-600">Buy again</text>
      <rect x={W - 100} y={PAD.top + 14} width={10} height={10} fill="#f87171" opacity={0.55} rx={1} />
      <text x={W - 86} y={PAD.top + 23} className="text-[9px] fill-slate-600">Won&apos;t buy</text>
    </svg>
  );
}

/* ---- QQ Plot (Step 7) ---- */
function QQPlot({ data }) {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const m = mean(data);
  const s = std(data);

  // Theoretical quantiles (inverse normal via approximation)
  function invNorm(p) {
    // Rational approximation (Beasley-Springer-Moro)
    const a = [
      -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
    ];
    const b = [
      -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1,
    ];
    const c = [
      -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
    ];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
      3.754408661907416e0,
    ];
    const pLow = 0.02425,
      pHigh = 1 - pLow;
    let q;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    } else if (p <= pHigh) {
      q = p - 0.5;
      const r = q * q;
      return (
        ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
      );
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return (
        -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      );
    }
  }

  const theoretical = sorted.map((_, i) => {
    const p = (i + 0.5) / n;
    return m + s * invNorm(p);
  });

  const allVals = [...sorted, ...theoretical];
  const vMin = Math.min(...allVals) - 1;
  const vMax = Math.max(...allVals) + 1;
  const sx = (x) => PAD.left + ((x - vMin) / (vMax - vMin)) * pw;
  const sy = (y) => PAD.top + ph - ((y - vMin) / (vMax - vMin)) * ph;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        QQ plot — sample vs theoretical normal
      </text>
      {/* 45° reference line */}
      <line
        x1={sx(vMin)}
        y1={sy(vMin)}
        x2={sx(vMax)}
        y2={sy(vMax)}
        stroke="#cbd5e1"
        strokeWidth={1}
        strokeDasharray="6,3"
      />
      {/* Points */}
      {sorted.map((v, i) => (
        <circle
          key={i}
          cx={sx(theoretical[i])}
          cy={sy(v)}
          r={4}
          fill="#1e293b"
          opacity={0.7}
        />
      ))}
      {/* Axis labels */}
      <text
        x={W / 2}
        y={H - 4}
        textAnchor="middle"
        className="text-[10px] fill-slate-500"
      >
        Theoretical quantiles
      </text>
      <text
        x={12}
        y={H / 2}
        textAnchor="middle"
        className="text-[10px] fill-slate-500"
        transform={`rotate(-90, 12, ${H / 2})`}
      >
        Sample quantiles
      </text>
    </svg>
  );
}

/* ---- Scatter plot for correlation (Step 8) ---- */
function CorrScatterPlot() {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const xMin = 188,
    xMax = 222,
    yMin = 68,
    yMax = 88;
  const sx = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * pw;
  const sy = (y) => PAD.top + ph - ((y - yMin) / (yMax - yMin)) * ph;

  // Linear fit line
  const b1 = SXY / SXX;
  const b0 = CORR_TASTE_MEAN - b1 * CORR_TEMP_MEAN;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <text
        x={W / 2}
        y={10}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Roast temperature vs taste score
      </text>
      {/* Grid */}
      {[190, 200, 210, 220].map((tick) => (
        <g key={`x${tick}`}>
          <line
            x1={sx(tick)}
            y1={PAD.top}
            x2={sx(tick)}
            y2={H - PAD.bottom}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
          <text
            x={sx(tick)}
            y={H - PAD.bottom + 14}
            textAnchor="middle"
            className="text-[10px] fill-slate-500"
          >
            {tick}°C
          </text>
        </g>
      ))}
      {[70, 75, 80, 85].map((tick) => (
        <g key={`y${tick}`}>
          <line
            x1={PAD.left}
            y1={sy(tick)}
            x2={W - PAD.right}
            y2={sy(tick)}
            stroke="#f1f5f9"
            strokeWidth={0.5}
          />
          <text
            x={PAD.left - 6}
            y={sy(tick) + 3}
            textAnchor="end"
            className="text-[10px] fill-slate-500"
          >
            {tick}
          </text>
        </g>
      ))}
      {/* Axes */}
      <line
        x1={PAD.left}
        y1={H - PAD.bottom}
        x2={W - PAD.right}
        y2={H - PAD.bottom}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <line
        x1={PAD.left}
        y1={PAD.top}
        x2={PAD.left}
        y2={H - PAD.bottom}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      {/* Linear fit line */}
      <line
        x1={sx(xMin)}
        y1={sy(b0 + b1 * xMin)}
        x2={sx(xMax)}
        y2={sy(b0 + b1 * xMax)}
        stroke="#f87171"
        strokeWidth={1.5}
        strokeDasharray="6,3"
        opacity={0.6}
      />
      {/* Data points */}
      {CORR_TEMP.map((t, i) => (
        <circle
          key={i}
          cx={sx(t)}
          cy={sy(CORR_TASTE[i])}
          r={5}
          fill="#1e293b"
          opacity={0.7}
        />
      ))}
      {/* Curve fit (visual) */}
      {(() => {
        const pts = [];
        for (let x = 188; x <= 222; x += 0.5) {
          const y = -0.045 * (x - 205) ** 2 + 85.5;
          pts.push({ x, y });
        }
        const path = pts
          .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`)
          .join(" ");
        return (
          <path
            d={path}
            fill="none"
            stroke="#10b981"
            strokeWidth={1.5}
            opacity={0.6}
          />
        );
      })()}
      <text
        x={W - PAD.right - 2}
        y={PAD.top + 14}
        textAnchor="end"
        className="text-[9px] fill-red-500"
      >
        Linear: r = {fmt(PEARSON_R, 3)}
      </text>
      <text
        x={W - PAD.right - 2}
        y={PAD.top + 26}
        textAnchor="end"
        className="text-[9px] fill-emerald-600"
      >
        True relationship (curved)
      </text>
    </svg>
  );
}

/* ---- Multiple testing: sorted p-values (Step 9) ---- */
function MultiplePValuesChart({ nTests, propNull }) {
  const pvals = useMemo(() => {
    const rng = mulberry32(77);
    const nNull = Math.round(nTests * propNull);
    const ps = [];
    for (let i = 0; i < nTests; i++) {
      if (i < nNull) {
        // True null: p ~ Uniform(0,1)
        ps.push({ p: rng(), trueNull: true });
      } else {
        // True alternative: p ~ Beta(0.3, 1) ≈ small p-values
        ps.push({ p: Math.pow(rng(), 1 / 0.3), trueNull: false });
      }
    }
    // Sort by p-value
    ps.sort((a, b) => a.p - b.p);
    return ps;
  }, [nTests, propNull]);

  const alpha = 0.05;
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const sx = (i) => PAD.left + (i / (nTests - 1 || 1)) * pw;
  const sy = (p) => PAD.top + ph - (Math.min(p, 1) / 1) * ph;

  // BH rejections
  let bhReject = 0;
  for (let i = 0; i < pvals.length; i++) {
    if (pvals[i].p <= ((i + 1) / nTests) * alpha) bhReject = i + 1;
  }
  const bonfReject = pvals.filter((p) => p.p <= alpha / nTests).length;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <text
          x={W / 2}
          y={10}
          textAnchor="middle"
          className="text-[10px] fill-slate-400"
        >
          Sorted p-values with correction thresholds
        </text>
        {/* Axes */}
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={H - PAD.bottom}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {/* Raw α line */}
        <line
          x1={PAD.left}
          y1={sy(alpha)}
          x2={W - PAD.right}
          y2={sy(alpha)}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4,2"
        />
        <text
          x={W - PAD.right + 2}
          y={sy(alpha) + 3}
          className="text-[9px] fill-slate-400"
        >
          α
        </text>
        {/* Bonferroni line */}
        <line
          x1={PAD.left}
          y1={sy(alpha / nTests)}
          x2={W - PAD.right}
          y2={sy(alpha / nTests)}
          stroke="#f59e0b"
          strokeWidth={1}
          strokeDasharray="4,2"
        />
        <text
          x={W - PAD.right + 2}
          y={sy(alpha / nTests) + 3}
          className="text-[9px] fill-amber-600"
        >
          Bonf.
        </text>
        {/* BH diagonal */}
        <line
          x1={sx(0)}
          y1={sy((1 / nTests) * alpha)}
          x2={sx(nTests - 1)}
          y2={sy(alpha)}
          stroke="#10b981"
          strokeWidth={1.5}
        />
        <text
          x={sx(nTests - 1) + 2}
          y={sy(alpha) - 6}
          className="text-[9px] fill-emerald-600"
        >
          BH
        </text>
        {/* Points */}
        {pvals.map((pv, i) => (
          <circle
            key={i}
            cx={sx(i)}
            cy={sy(pv.p)}
            r={3.5}
            fill={pv.trueNull ? "#94a3b8" : "#1e293b"}
            stroke={i < bhReject ? "#10b981" : "none"}
            strokeWidth={1.5}
            opacity={0.7}
          />
        ))}
      </svg>
      <div className="flex gap-4 justify-center text-xs text-slate-500 mt-1">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-slate-800 mr-1" />
          True signal
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1" />
          True null
        </span>
        <span>BH rejects: {bhReject}</span>
        <span>Bonf. rejects: {bonfReject}</span>
      </div>
    </div>
  );
}

/* ---- Power curve (Step 10) ---- */
function PowerCurveChart({ effectSize, alpha, currentN }) {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;
  const nMax = 100;
  const sx = (n) => PAD.left + ((n - 5) / (nMax - 5)) * pw;
  const sy = (p) => PAD.top + ph - p * ph;

  const zAlpha = (() => {
    let z = 1.96;
    for (let iter = 0; iter < 20; iter++) {
      const p = 2 * (1 - normalCDF(z));
      const dp = -2 * normalPDF(z);
      z = z - (p - alpha) / dp;
    }
    return z;
  })();

  const powerAt = (n) => {
    const ncp = effectSize * Math.sqrt(n / 2);
    return 1 - normalCDF(zAlpha - ncp);
  };

  const curvePts = [];
  for (let n = 5; n <= nMax; n++) {
    curvePts.push({ n, power: powerAt(n) });
  }

  const currentPower = powerAt(currentN);

  // Find n for 80% power
  let n80 = 5;
  for (let n = 5; n <= 500; n++) {
    if (powerAt(n) >= 0.8) {
      n80 = n;
      break;
    }
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <text
          x={W / 2}
          y={10}
          textAnchor="middle"
          className="text-[10px] fill-slate-400"
        >
          Power curve (two-sample test, d = {fmt(effectSize, 2)}, α ={" "}
          {fmt(alpha, 2)})
        </text>
        {/* Grid */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={sy(tick)}
              x2={W - PAD.right}
              y2={sy(tick)}
              stroke={tick === 0.8 ? "#f59e0b" : "#f1f5f9"}
              strokeWidth={tick === 0.8 ? 1 : 0.5}
              strokeDasharray={tick === 0.8 ? "6,3" : "none"}
            />
            <text
              x={PAD.left - 6}
              y={sy(tick) + 3}
              textAnchor="end"
              className="text-[10px] fill-slate-500"
            >
              {fmt(tick, 1)}
            </text>
          </g>
        ))}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={sx(tick)}
              y1={PAD.top}
              x2={sx(tick)}
              y2={H - PAD.bottom}
              stroke="#f1f5f9"
              strokeWidth={0.5}
            />
            <text
              x={sx(tick)}
              y={H - PAD.bottom + 14}
              textAnchor="middle"
              className="text-[10px] fill-slate-500"
            >
              {tick}
            </text>
          </g>
        ))}
        {/* Axes */}
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={H - PAD.bottom}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        {/* Power curve */}
        <path
          d={curvePts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${sx(p.n)},${sy(p.power)}`
            )
            .join(" ")}
          fill="none"
          stroke="#1e293b"
          strokeWidth={2}
        />
        {/* Current n point */}
        <circle
          cx={sx(currentN)}
          cy={sy(currentPower)}
          r={6}
          fill="#10b981"
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={sx(currentN) + 10}
          y={sy(currentPower) - 4}
          className="text-[9px] fill-emerald-600 font-medium"
        >
          n={currentN}, power={fmt(currentPower, 2)}
        </text>
        {/* 80% power reference */}
        <text
          x={W - PAD.right - 2}
          y={sy(0.8) - 4}
          textAnchor="end"
          className="text-[9px] fill-amber-600"
        >
          80% power target
        </text>
        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 2}
          textAnchor="middle"
          className="text-[10px] fill-slate-500"
        >
          Sample size per group (n)
        </text>
      </svg>
      <p className="text-xs text-slate-500 mt-1 text-center">
        Need n ≥ {n80} per group for 80% power with d = {fmt(effectSize, 2)}
      </p>
    </div>
  );
}

/* ================================================================== */
/*  Main Tutorial Component                                            */
/* ================================================================== */

export default function HypothesisTestingTutorial() {
  /* -- Interactive state -- */
  const [alpha, setAlpha] = useState(0.05);
  const [nPerms, setNPerms] = useState(1000);
  const [nTests, setNTests] = useState(20);
  const [propNull, setPropNull] = useState(0.8);
  const [effectSize, setEffectSize] = useState(0.8);
  const [powerAlpha, setPowerAlpha] = useState(0.05);
  const [powerN, setPowerN] = useState(20);
  const [showNonNormal, setShowNonNormal] = useState(false);

  /* -- Non-normal data for QQ toggle -- */
  const nonNormalData = useMemo(() => {
    const rng = mulberry32(99);
    return Array.from({ length: 10 }, () => {
      const u = rng();
      return 70 + Math.pow(u, 0.3) * 25;
    });
  }, []);

  const qqData = showNonNormal ? nonNormalData : ETHIOPIAN;

  return (
    <TutorialShell
      title="Statistical Hypothesis Testing"
      description="A comprehensive guide to every major test family — from t-tests to ANOVA, chi-square to permutation tests — with hand calculations, Python code, and interactive visualizations."
      intro={
        <>
          <p>
            We follow <strong>Sunrise Roasters</strong>, a specialty coffee company whose
            data naturally spans every test family: continuous taste scores, paired roast
            comparisons, categorical repurchase data, and multi-origin quality benchmarks.
          </p>
          <p>
            For each test you&apos;ll see the mathematical formulation, a step-by-step hand
            calculation with concrete numbers, the Python <code>scipy.stats</code> one-liner,
            and an interactive chart.
          </p>
        </>
      }
      lessons={lessons}
    >
      {(step) => (
        <>
          {/* ============================================================ */}
          {/*  STEP 0 — Why So Many Tests?                                 */}
          {/* ============================================================ */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <p>
                There are dozens of statistical tests, and it can feel overwhelming.
                But every test answers the same core question:{" "}
                <strong>&ldquo;Could this pattern have arisen by chance alone?&rdquo;</strong>{" "}
                The reason we need different tests is that data comes in different shapes.
                Four axes determine which test fits your situation:
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="w-4 h-4" /> The Four Axes of Test Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-sm text-slate-800 mb-1">
                        1. Data Type
                      </p>
                      <p className="text-sm">
                        <strong>Continuous</strong> (taste score: 82.5) vs{" "}
                        <strong>Categorical</strong> (roast level: light/dark) vs{" "}
                        <strong>Ordinal</strong> (rating: 1–5 stars)
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-sm text-slate-800 mb-1">
                        2. Number of Groups
                      </p>
                      <p className="text-sm">
                        <strong>One-sample</strong> (&ldquo;Is our roast temp hitting 200°C?&rdquo;) vs{" "}
                        <strong>Two-sample</strong> (&ldquo;Ethiopian vs Colombian?&rdquo;) vs{" "}
                        <strong>K-sample</strong> (&ldquo;4 origins at once?&rdquo;)
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-sm text-slate-800 mb-1">
                        3. Pairing
                      </p>
                      <p className="text-sm">
                        <strong>Independent</strong> (different batches per origin) vs{" "}
                        <strong>Paired</strong> (same batch roasted light AND dark)
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="font-semibold text-sm text-slate-800 mb-1">
                        4. Assumptions
                      </p>
                      <p className="text-sm">
                        <strong>Parametric</strong> (assumes normal distribution → t-test, ANOVA) vs{" "}
                        <strong>Nonparametric</strong> (distribution-free → Mann-Whitney, Kruskal-Wallis)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Grid3X3 className="w-4 h-4" /> Test Family Map
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left p-2 text-slate-600">Scenario</th>
                          <th className="text-left p-2 text-slate-600">Parametric</th>
                          <th className="text-left p-2 text-slate-600">Nonparametric</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        <tr className="border-b border-slate-100">
                          <td className="p-2 font-medium">One sample vs value</td>
                          <td className="p-2">One-sample t-test</td>
                          <td className="p-2">Wilcoxon signed-rank, Sign test</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 font-medium">Two independent groups</td>
                          <td className="p-2">Welch&apos;s t-test</td>
                          <td className="p-2">Mann-Whitney U, Permutation test</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 font-medium">Two paired groups</td>
                          <td className="p-2">Paired t-test</td>
                          <td className="p-2">Wilcoxon signed-rank, Sign test</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 font-medium">K independent groups</td>
                          <td className="p-2">One-way ANOVA</td>
                          <td className="p-2">Kruskal-Wallis</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 font-medium">Categorical association</td>
                          <td className="p-2">Chi-square test</td>
                          <td className="p-2">Fisher&apos;s exact, McNemar&apos;s</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2 font-medium">Distribution shape</td>
                          <td className="p-2">Shapiro-Wilk</td>
                          <td className="p-2">KS test, Chi-square GOF</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Association strength</td>
                          <td className="p-2">Pearson r</td>
                          <td className="p-2">Spearman ρ, Kendall τ</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <InfoBox>
                Throughout this tutorial we follow <strong>Sunrise Roasters</strong> — a
                specialty coffee company. Their data naturally covers every test family:
                continuous taste scores, paired roast comparisons, categorical
                repurchase data, and multi-origin quality benchmarks.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 1 — Anatomy of a Test                                  */}
          {/* ============================================================ */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <p>
                Before diving into specific tests, let&apos;s understand the machinery they all share.
                Every hypothesis test follows the same five-step recipe.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4" /> The Five Ingredients
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="space-y-3">
                    <p>
                      <strong>1. Null hypothesis (H₀):</strong> The &ldquo;nothing interesting&rdquo;
                      claim. Example: &ldquo;Sunrise Roasters&apos; mean roast temp equals 200°C.&rdquo;
                    </p>
                    <Tex math="H_0: \mu = 200" display />
                    <p>
                      <strong>2. Alternative hypothesis (H₁):</strong> What we suspect is true.
                    </p>
                    <Tex math="H_1: \mu \neq 200" display />
                    <p>
                      <strong>3. Test statistic:</strong> A single number that measures how far
                      the data deviates from H₀. For a mean:
                    </p>
                    <Tex
                      math="t = \frac{\bar{x} - \mu_0}{s / \sqrt{n}}"
                      display
                    />
                    <p>
                      <strong>4. Null distribution:</strong> The probability distribution of the
                      test statistic <em>if H₀ were true</em>. Under the null, t follows a
                      t-distribution (or approximately standard normal for large n).
                    </p>
                    <p>
                      <strong>5. p-value:</strong> The probability of observing a test statistic
                      as extreme as (or more extreme than) what we got, assuming H₀ is true.
                    </p>
                    <Tex
                      math="p\text{-value} = P(|T| \geq |t_{\text{obs}}| \mid H_0)"
                      display
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4" /> Decision Rule & Error Types
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    We reject H₀ when <Tex math="p < \alpha" />, where{" "}
                    <Tex math="\alpha" /> is the significance level — the false positive rate
                    we&apos;re willing to tolerate.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard
                      label="Type I Error (False Positive)"
                      value="Reject H₀ when it's true"
                      formula="\alpha = P(\text{reject } H_0 \mid H_0 \text{ true})"
                    />
                    <StatCard
                      label="Type II Error (False Negative)"
                      value="Fail to reject H₀ when it's false"
                      formula="\beta = P(\text{fail to reject } H_0 \mid H_1 \text{ true})"
                    />
                  </div>
                  <p>
                    <strong>Power</strong> = <Tex math="1 - \beta" /> = probability of correctly
                    detecting a real effect. We want high power (typically ≥ 0.80).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4" /> Interactive: The Rejection Region
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <p className="text-sm">
                        The red shaded area is the <strong>rejection region</strong> — values of z
                        so extreme that we reject H₀. The green line is an observed z = 1.96.
                      </p>
                      <LabeledSlider
                        label="Significance level (α)"
                        min={0.01}
                        max={0.2}
                        step={0.01}
                        value={[alpha]}
                        onValueChange={([v]) => setAlpha(v)}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard label="α" value={fmt(alpha, 2)} />
                        <StatCard
                          label="Critical z"
                          value={`± ${fmt(
                            (() => {
                              let z = 1.96;
                              for (let i = 0; i < 20; i++) {
                                const p = 2 * (1 - normalCDF(z));
                                const dp = -2 * normalPDF(z);
                                z = z - (p - alpha) / dp;
                              }
                              return z;
                            })(),
                            3
                          )}`}
                        />
                      </div>
                      <p className="text-sm">
                        As <Tex math="\alpha" /> increases, the rejection region grows — we
                        become more willing to reject H₀, but also more likely to make a
                        false positive error.
                      </p>
                    </div>
                    <NullDistChart alpha={alpha} zObs={1.96} />
                  </div>
                </CardContent>
              </Card>

              <InfoBox variant="warning">
                <strong>Common misconception:</strong> A p-value of 0.03 does <em>not</em> mean
                &ldquo;there&apos;s a 3% chance H₀ is true.&rdquo; It means: &ldquo;If H₀ were true,
                there&apos;s a 3% chance of seeing data this extreme.&rdquo; The p-value is about
                the data, not the hypothesis.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 2 — One-Sample Tests                                   */}
          {/* ============================================================ */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Sunrise Roasters targets 200°C for their medium roast.
                A quality inspector measures 8 batches. Do the temperatures hit the target?
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4" /> The Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <p className="text-sm">
                        Eight batch temperatures (°C):
                      </p>
                      <div className="bg-slate-50 rounded-lg p-3 font-mono text-sm">
                        {ROAST_TEMPS.join(", ")}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="Sample mean (x̄)"
                          value={fmt(TEMP_MEAN, 2) + "°C"}
                          formula="\bar{x} = \frac{1}{n}\sum x_i"
                        />
                        <StatCard
                          label="Sample SD (s)"
                          value={fmt(TEMP_STD, 2) + "°C"}
                          formula="s = \sqrt{\frac{\sum(x_i - \bar{x})^2}{n-1}}"
                        />
                      </div>
                    </div>
                    <TempDotPlot />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> One-Sample t-Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>H₀:</strong> <Tex math="\mu = 200" />
                    {" "}(roast temp is on target) &nbsp;
                    <strong>H₁:</strong> <Tex math="\mu \neq 200" />
                  </p>
                  <p>The test statistic:</p>
                  <Tex
                    math="t = \frac{\bar{x} - \mu_0}{s / \sqrt{n}}"
                    display
                  />
                  <p><strong>Hand calculation:</strong></p>
                  <Tex
                    math={`t = \\frac{${fmt(TEMP_MEAN, 2)} - 200}{${fmt(TEMP_STD, 2)} / \\sqrt{8}} = \\frac{${fmt(TEMP_MEAN - 200, 3)}}{${fmt(TEMP_STD / Math.sqrt(8), 3)}} = ${fmt(TEMP_T, 3)}`}
                    display
                  />
                  <p className="text-sm">
                    With df = n − 1 = 7, this t-value corresponds to a large p-value.
                    The roast temperature is consistent with the 200°C target —
                    we <strong>fail to reject H₀</strong>.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import ttest_1samp

temps = [198.2, 201.5, 199.8, 202.1, 197.3, 200.9, 203.2, 198.0]
t_stat, p_value = ttest_1samp(temps, 200)
print(f"t = {t_stat:.3f}, p = {p_value:.4f}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompare className="w-4 h-4" /> Nonparametric Alternatives
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>Sign test:</strong> Simply count how many measurements are above
                    vs below the target. Out of 8 batches, {TEMP_ABOVE} are above 200°C and{" "}
                    {8 - TEMP_ABOVE} are below. Under H₀, each has 50% probability of
                    being above.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import binomtest

above = sum(1 for t in temps if t > 200)  # ${TEMP_ABOVE} above
result = binomtest(above, n=8, p=0.5, alternative='two-sided')
print(f"p = {result.pvalue:.4f}")`}
                  />
                  <p>
                    <strong>Wilcoxon signed-rank test:</strong> Uses ranks of |xᵢ − 200|
                    rather than raw values. More powerful than the sign test when
                    differences are symmetric, but doesn&apos;t require normality.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import wilcoxon
import numpy as np

stat, p_value = wilcoxon(np.array(temps) - 200)
print(f"W = {stat:.1f}, p = {p_value:.4f}")`}
                  />
                </CardContent>
              </Card>

              <InfoBox>
                <strong>When to use which?</strong> Use the t-test when data is roughly normal
                (check with a QQ plot — we&apos;ll cover this in the goodness-of-fit step).
                Use Wilcoxon signed-rank when you&apos;re unsure about normality — it uses ranks
                instead of raw values. The sign test is the simplest but least powerful.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 3 — Two-Sample Independent Tests                       */}
          {/* ============================================================ */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Are Ethiopian beans scoring higher than Colombian
                beans in blind tastings? Sunrise Roasters collected 10 ratings per origin.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4" /> The Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                        <p><strong>Ethiopian (n=10):</strong> {ETHIOPIAN.join(", ")}</p>
                        <p><strong>Colombian (n=10):</strong> {COLOMBIAN.join(", ")}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="Ethiopian mean"
                          value={fmt(ETH_MEAN, 1)}
                          formula={`\\bar{x}_E = ${fmt(ETH_MEAN, 1)}`}
                        />
                        <StatCard
                          label="Colombian mean"
                          value={fmt(COL_MEAN, 1)}
                          formula={`\\bar{x}_C = ${fmt(COL_MEAN, 1)}`}
                        />
                        <StatCard
                          label="Ethiopian SD"
                          value={fmt(ETH_STD, 2)}
                        />
                        <StatCard
                          label="Colombian SD"
                          value={fmt(COL_STD, 2)}
                        />
                      </div>
                    </div>
                    <TwoGroupStripPlot />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> Welch&apos;s t-Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>H₀:</strong> <Tex math="\mu_E = \mu_C" /> &nbsp;
                    <strong>H₁:</strong> <Tex math="\mu_E \neq \mu_C" />
                  </p>
                  <p>Welch&apos;s t-test doesn&apos;t assume equal variances:</p>
                  <Tex
                    math="t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\frac{s_1^2}{n_1} + \frac{s_2^2}{n_2}}}"
                    display
                  />
                  <p><strong>Hand calculation:</strong></p>
                  <Tex
                    math={`\\text{SE} = \\sqrt{\\frac{${fmt(ETH_STD, 2)}^2}{10} + \\frac{${fmt(COL_STD, 2)}^2}{10}} = \\sqrt{${fmt(ETH_STD ** 2 / 10, 3)} + ${fmt(COL_STD ** 2 / 10, 3)}} = ${fmt(WELCH_SE, 3)}`}
                    display
                  />
                  <Tex
                    math={`t = \\frac{${fmt(ETH_MEAN, 1)} - ${fmt(COL_MEAN, 1)}}{${fmt(WELCH_SE, 3)}} = \\frac{${fmt(ETH_MEAN - COL_MEAN, 1)}}{${fmt(WELCH_SE, 3)}} = ${fmt(WELCH_T, 3)}`}
                    display
                  />
                  <p className="text-sm">
                    With this large t-value, the p-value will be very small — strong evidence
                    that Ethiopian beans score higher than Colombian in blind tastings.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import ttest_ind

ethiopian = [84, 82, 86, 81, 85, 83, 87, 80, 84, 88]
colombian = [79, 81, 77, 80, 78, 82, 76, 80, 79, 78]

t_stat, p_value = ttest_ind(ethiopian, colombian, equal_var=False)
print(f"t = {t_stat:.3f}, p = {p_value:.6f}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompare className="w-4 h-4" /> Mann-Whitney U Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The nonparametric alternative. Instead of comparing means, it tests whether
                    one group&apos;s values tend to be larger. It works by ranking all 20 scores
                    together and comparing the sum of ranks between groups.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import mannwhitneyu

stat, p_value = mannwhitneyu(ethiopian, colombian, alternative='two-sided')
print(f"U = {stat:.1f}, p = {p_value:.6f}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" /> Permutation Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <p className="text-sm">
                        The most intuitive approach: if origin doesn&apos;t matter, randomly
                        shuffling the &ldquo;Ethiopian&rdquo; and &ldquo;Colombian&rdquo; labels should produce
                        similar group differences. We shuffle {nPerms} times and check how
                        often the permuted difference is as extreme as the observed one.
                      </p>
                      <LabeledSlider
                        label="Number of permutations"
                        min={100}
                        max={5000}
                        step={100}
                        value={[nPerms]}
                        onValueChange={([v]) => setNPerms(v)}
                      />
                      <PythonCode
                        code={`from scipy.stats import permutation_test

def stat_fn(x, y, axis):
    return x.mean(axis=axis) - y.mean(axis=axis)

result = permutation_test(
    (ethiopian, colombian),
    stat_fn, n_resamples=9999
)
print(f"p = {result.pvalue:.4f}")`}
                      />
                    </div>
                    <PermutationChart nPerms={nPerms} />
                  </div>
                </CardContent>
              </Card>

              <InfoBox>
                All three tests agree: Ethiopian beans score significantly higher.
                The <strong>permutation test</strong> makes no distributional assumptions at all —
                it builds the null distribution directly from the data by shuffling labels.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 4 — Paired Tests                                       */}
          {/* ============================================================ */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Same 8 coffee batches are each split and roasted
                two ways — light and dark. Which roast profile scores better?
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4" /> The Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="p-1.5 text-left text-slate-600">Batch</th>
                              {BATCH_NAMES.map((b) => (
                                <th key={b} className="p-1.5 text-center text-slate-600">
                                  {b}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="p-1.5 font-medium">Light</td>
                              {LIGHT_SCORES.map((s, i) => (
                                <td key={i} className="p-1.5 text-center text-slate-500">
                                  {s}
                                </td>
                              ))}
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="p-1.5 font-medium">Dark</td>
                              {DARK_SCORES.map((s, i) => (
                                <td key={i} className="p-1.5 text-center">{s}</td>
                              ))}
                            </tr>
                            <tr>
                              <td className="p-1.5 font-medium text-emerald-700">Diff (D−L)</td>
                              {PAIRED_DIFFS.map((d, i) => (
                                <td
                                  key={i}
                                  className="p-1.5 text-center font-medium text-emerald-700"
                                >
                                  +{d}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="Mean difference (d̄)"
                          value={`+${fmt(DIFF_MEAN, 3)}`}
                        />
                        <StatCard
                          label="SD of differences"
                          value={fmt(DIFF_STD, 3)}
                        />
                      </div>
                    </div>
                    <PairedLinePlot />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> Paired t-Test
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The key insight: a paired t-test is just a one-sample t-test on the
                    <strong> differences</strong>. We test whether the mean difference is zero.
                  </p>
                  <p>
                    <strong>H₀:</strong> <Tex math="\mu_d = 0" /> &nbsp;
                    <strong>H₁:</strong> <Tex math="\mu_d \neq 0" />
                  </p>
                  <Tex
                    math="t = \frac{\bar{d}}{s_d / \sqrt{n}}"
                    display
                  />
                  <p><strong>Hand calculation:</strong></p>
                  <p className="text-sm">
                    Differences: {PAIRED_DIFFS.join(", ")}. Mean:{" "}
                    <Tex math={`\\bar{d} = \\frac{${PAIRED_DIFFS.join(" + ")}}{8} = ${fmt(DIFF_MEAN, 3)}`} />
                  </p>
                  <Tex
                    math={`t = \\frac{${fmt(DIFF_MEAN, 3)}}{${fmt(DIFF_STD, 3)} / \\sqrt{8}} = \\frac{${fmt(DIFF_MEAN, 3)}}{${fmt(DIFF_STD / Math.sqrt(8), 4)}} = ${fmt(PAIRED_T, 3)}`}
                    display
                  />
                  <p className="text-sm">
                    With df = 7 and t = {fmt(PAIRED_T, 2)}, the p-value is very small.
                    Dark roast scores significantly higher than light roast on the same batches.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import ttest_rel

light = [78, 82, 75, 80, 77, 83, 79, 76]
dark  = [81, 85, 77, 84, 80, 85, 82, 79]

t_stat, p_value = ttest_rel(dark, light)
print(f"t = {t_stat:.3f}, p = {p_value:.4f}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompare className="w-4 h-4" /> Nonparametric Alternatives
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p><strong>Wilcoxon signed-rank test:</strong></p>
                  <PythonCode
                    code={`from scipy.stats import wilcoxon

stat, p_value = wilcoxon(dark, light)
print(f"W = {stat:.1f}, p = {p_value:.4f}")`}
                  />
                  <p>
                    <strong>Sign test:</strong> All 8 differences are positive. Under H₀,
                    each difference has a 50% chance of being positive. Getting 8/8 positive:
                  </p>
                  <Tex
                    math={`P(X = 8 \\mid p = 0.5) = \\binom{8}{8} (0.5)^8 = \\frac{1}{256} = 0.0039`}
                    display
                  />
                  <PythonCode
                    code={`from scipy.stats import binomtest

result = binomtest(8, 8, 0.5, alternative='two-sided')
print(f"p = {result.pvalue:.4f}")  # 0.0078 (two-sided)`}
                  />
                </CardContent>
              </Card>

              <InfoBox>
                <strong>Why pairing matters:</strong> An independent t-test on these same 20
                numbers would have to contend with batch-to-batch variation in bean quality.
                The paired test removes that noise by looking only at within-batch differences,
                making it much more powerful.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 5 — K-Sample Tests                                     */}
          {/* ============================================================ */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Sunrise Roasters sources from 4 origins — Ethiopian,
                Colombian, Brazilian, and Kenyan. Are there any taste score differences among
                them? (6 batches per origin)
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4" /> The Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      {ORIGIN_NAMES.map((name) => (
                        <div key={name} className="bg-slate-50 rounded-lg p-2 text-sm">
                          <strong>{name}:</strong> {ORIGINS[name].join(", ")}{" "}
                          <span className="text-slate-500">(x̄ = {fmt(mean(ORIGINS[name]), 1)})</span>
                        </div>
                      ))}
                      <StatCard
                        label="Grand mean"
                        value={fmt(GRAND_MEAN, 2)}
                        formula={`\\bar{x}_{\\cdot\\cdot} = ${fmt(GRAND_MEAN, 2)}`}
                      />
                    </div>
                    <KSampleDotPlot />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> One-Way ANOVA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>H₀:</strong>{" "}
                    <Tex math="\mu_E = \mu_C = \mu_B = \mu_K" /> &nbsp;
                    <strong>H₁:</strong> At least one mean differs
                  </p>
                  <p>
                    ANOVA partitions total variation into <strong>between-group</strong> (SSB)
                    and <strong>within-group</strong> (SSW) components:
                  </p>
                  <Tex
                    math="F = \frac{\text{MSB}}{\text{MSW}} = \frac{\text{SSB} / (k-1)}{\text{SSW} / (N-k)}"
                    display
                  />
                  <p><strong>Hand calculation:</strong></p>
                  <Tex
                    math={`\\text{SSB} = \\sum_{j=1}^{k} n_j (\\bar{x}_j - \\bar{x}_{\\cdot\\cdot})^2`}
                    display
                  />
                  <p className="text-sm">
                    SSB = 6 × [(
                    {GROUP_MEANS.map(
                      (m, i) =>
                        `${fmt(m, 1)} − ${fmt(GRAND_MEAN, 2)})² ${i < 3 ? "+ (" : ""}`
                    ).join("")}
                    ] = {fmt(SSB, 2)}
                  </p>
                  <p className="text-sm">
                    SSW = sum of squared deviations within each group = {fmt(SSW, 2)}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="p-2 text-left text-slate-600">Source</th>
                          <th className="p-2 text-right text-slate-600">SS</th>
                          <th className="p-2 text-right text-slate-600">df</th>
                          <th className="p-2 text-right text-slate-600">MS</th>
                          <th className="p-2 text-right text-slate-600">F</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="p-2">Between</td>
                          <td className="p-2 text-right">{fmt(SSB, 2)}</td>
                          <td className="p-2 text-right">{DF_BETWEEN}</td>
                          <td className="p-2 text-right">{fmt(MSB, 2)}</td>
                          <td className="p-2 text-right font-semibold">{fmt(F_STAT, 2)}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2">Within</td>
                          <td className="p-2 text-right">{fmt(SSW, 2)}</td>
                          <td className="p-2 text-right">{DF_WITHIN}</td>
                          <td className="p-2 text-right">{fmt(MSW, 2)}</td>
                          <td className="p-2 text-right">—</td>
                        </tr>
                        <tr>
                          <td className="p-2">Total</td>
                          <td className="p-2 text-right">{fmt(SSB + SSW, 2)}</td>
                          <td className="p-2 text-right">{N_TOTAL - 1}</td>
                          <td className="p-2 text-right">—</td>
                          <td className="p-2 text-right">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm">
                    With F = {fmt(F_STAT, 2)} on ({DF_BETWEEN}, {DF_WITHIN}) degrees of freedom,
                    the p-value is extremely small. At least one origin differs significantly.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import f_oneway

eth = [84, 82, 86, 81, 85, 83]
col = [79, 81, 77, 80, 78, 82]
bra = [76, 78, 74, 77, 75, 80]
ken = [85, 87, 83, 86, 84, 88]

F_stat, p_value = f_oneway(eth, col, bra, ken)
print(f"F = {F_stat:.2f}, p = {p_value:.8f}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompare className="w-4 h-4" /> Kruskal-Wallis & Post-Hoc
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>Kruskal-Wallis</strong> is the nonparametric ANOVA — it compares
                    rank sums instead of means:
                  </p>
                  <PythonCode
                    code={`from scipy.stats import kruskal

H_stat, p_value = kruskal(eth, col, bra, ken)
print(f"H = {H_stat:.2f}, p = {p_value:.6f}")`}
                  />
                  <p>
                    <strong>Post-hoc Tukey HSD:</strong> ANOVA tells us <em>something</em> differs,
                    but not <em>which pairs</em>. Tukey&apos;s test compares all pairs with
                    multiplicity correction:
                  </p>
                  <PythonCode
                    code={`from scipy.stats import tukey_hsd

result = tukey_hsd(eth, col, bra, ken)
# Compare each pair:
for i, name_i in enumerate(['Eth', 'Col', 'Bra', 'Ken']):
    for j, name_j in enumerate(['Eth', 'Col', 'Bra', 'Ken']):
        if i < j:
            ci = result.confidence_interval(0.95)
            print(f"{name_i} vs {name_j}: p = {result.pvalue[i][j]:.4f}")`}
                  />
                </CardContent>
              </Card>

              <InfoBox variant="warning">
                <strong>Never skip the omnibus test.</strong> Don&apos;t jump straight to pairwise
                comparisons. Run ANOVA (or Kruskal-Wallis) first. Only if the omnibus test
                rejects H₀ should you proceed to post-hoc tests — this controls the overall
                Type I error rate.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 6 — Categorical Data Tests                             */}
          {/* ============================================================ */}
          {step === 6 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Is roast level (light vs dark) associated with
                customer repurchase? Sunrise Roasters surveyed 120 customers.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Grid3X3 className="w-4 h-4" /> Contingency Table
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="p-2 text-left text-slate-600"></th>
                              <th className="p-2 text-center text-slate-600">Buy Again</th>
                              <th className="p-2 text-center text-slate-600">Won&apos;t Buy</th>
                              <th className="p-2 text-center text-slate-600">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="p-2 font-medium">Light roast</td>
                              <td className="p-2 text-center">{CT.light.buyAgain}</td>
                              <td className="p-2 text-center">{CT.light.wontBuy}</td>
                              <td className="p-2 text-center font-medium">{CT_ROW_LIGHT}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="p-2 font-medium">Dark roast</td>
                              <td className="p-2 text-center">{CT.dark.buyAgain}</td>
                              <td className="p-2 text-center">{CT.dark.wontBuy}</td>
                              <td className="p-2 text-center font-medium">{CT_ROW_DARK}</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium">Total</td>
                              <td className="p-2 text-center font-medium">{CT_COL_BUY}</td>
                              <td className="p-2 text-center font-medium">{CT_COL_WONT}</td>
                              <td className="p-2 text-center font-bold">{CT_TOTAL}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm">
                        75% of light-roast customers buy again vs 50% of dark-roast.
                        Is this difference real or just chance?
                      </p>
                    </div>
                    <ContingencyChart />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> Chi-Square Test of Independence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>H₀:</strong> Roast level and repurchase are independent.{" "}
                    <strong>H₁:</strong> They are associated.
                  </p>
                  <p><strong>Step 1 — Expected counts</strong> under independence:</p>
                  <Tex
                    math="E_{ij} = \frac{\text{Row total}_i \times \text{Col total}_j}{\text{Grand total}}"
                    display
                  />
                  <p className="text-sm"><strong>Hand calculation:</strong></p>
                  <Tex
                    math={`E_{\\text{light,buy}} = \\frac{${CT_ROW_LIGHT} \\times ${CT_COL_BUY}}{${CT_TOTAL}} = ${fmt(E_LB, 1)}, \\quad E_{\\text{light,won't}} = \\frac{${CT_ROW_LIGHT} \\times ${CT_COL_WONT}}{${CT_TOTAL}} = ${fmt(E_LW, 1)}`}
                    display
                  />
                  <Tex
                    math={`E_{\\text{dark,buy}} = ${fmt(E_DB, 1)}, \\quad E_{\\text{dark,won't}} = ${fmt(E_DW, 1)}`}
                    display
                  />
                  <p><strong>Step 2 — Chi-square statistic:</strong></p>
                  <Tex
                    math="\chi^2 = \sum \frac{(O_{ij} - E_{ij})^2}{E_{ij}}"
                    display
                  />
                  <Tex
                    math={`\\chi^2 = \\frac{(45 - ${fmt(E_LB, 1)})^2}{${fmt(E_LB, 1)}} + \\frac{(15 - ${fmt(E_LW, 1)})^2}{${fmt(E_LW, 1)}} + \\frac{(30 - ${fmt(E_DB, 1)})^2}{${fmt(E_DB, 1)}} + \\frac{(30 - ${fmt(E_DW, 1)})^2}{${fmt(E_DW, 1)}}`}
                    display
                  />
                  <Tex
                    math={`\\chi^2 = ${fmt((CT.light.buyAgain - E_LB) ** 2 / E_LB, 3)} + ${fmt((CT.light.wontBuy - E_LW) ** 2 / E_LW, 3)} + ${fmt((CT.dark.buyAgain - E_DB) ** 2 / E_DB, 3)} + ${fmt((CT.dark.wontBuy - E_DW) ** 2 / E_DW, 3)} = ${fmt(CHI2, 3)}`}
                    display
                  />
                  <p className="text-sm">
                    With df = (2−1)(2−1) = 1, <Tex math={`\\chi^2 = ${fmt(CHI2, 2)}`} /> gives
                    a p-value well below 0.05. Light roast customers are significantly more
                    likely to repurchase.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import chi2_contingency

table = [[45, 15], [30, 30]]
chi2, p, dof, expected = chi2_contingency(table)
print(f"χ² = {chi2:.3f}, p = {p:.4f}, dof = {dof}")
print(f"Expected counts:\\n{expected}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompare className="w-4 h-4" /> Fisher&apos;s Exact & McNemar&apos;s
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>Fisher&apos;s exact test:</strong> When expected counts are small (&lt; 5),
                    the chi-square approximation breaks down. Fisher&apos;s test calculates exact
                    probabilities using the hypergeometric distribution.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import fisher_exact

odds_ratio, p_value = fisher_exact([[45, 15], [30, 30]])
print(f"Odds ratio = {odds_ratio:.2f}, p = {p_value:.4f}")`}
                  />
                  <p>
                    <strong>McNemar&apos;s test:</strong> For <em>paired</em> categorical data. Example:
                    the same 60 customers are asked before and after trying a new blend.
                  </p>
                  <PythonCode
                    code={`from statsmodels.stats.contingency_tables import mcnemar

# Before/After paired table:
#              After: Buy  After: Won't
# Before: Buy    40          5
# Before: Won't   8          7
result = mcnemar([[40, 5], [8, 7]], exact=True)
print(f"p = {result.pvalue:.4f}")`}
                  />
                </CardContent>
              </Card>

              <InfoBox>
                <strong>Rule of thumb:</strong> Use chi-square when all expected counts are ≥ 5.
                If any expected count is below 5, switch to Fisher&apos;s exact test. Use
                McNemar&apos;s when the data is paired (same subjects measured twice).
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 7 — Goodness-of-Fit Tests                              */}
          {/* ============================================================ */}
          {step === 7 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Are Sunrise Roasters&apos; taste scores normally
                distributed? This matters — parametric tests assume normality. If the data
                isn&apos;t normal, we should use nonparametric alternatives.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4" /> QQ Plot: The Visual Check
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <p className="text-sm">
                        A QQ (quantile-quantile) plot compares your sample quantiles against
                        theoretical normal quantiles. If the data is normal, points hug the
                        diagonal line.
                      </p>
                      <p className="text-sm">
                        <strong>Data:</strong> Ethiopian scores — {(showNonNormal ? nonNormalData.map((v) => fmt(v, 1)) : ETHIOPIAN).join(", ")}
                      </p>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showNonNormal}
                          onChange={(e) => setShowNonNormal(e.target.checked)}
                          className="rounded"
                        />
                        Show skewed data instead
                      </label>
                      <p className="text-sm text-slate-500">
                        {showNonNormal
                          ? "The skewed data curves away from the diagonal — a sign of non-normality."
                          : "Points follow the line closely — consistent with normality."}
                      </p>
                    </div>
                    <QQPlot data={qqData} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> Formal Normality Tests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>Shapiro-Wilk test</strong> — the gold standard for normality testing.
                    H₀: the data is normally distributed.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import shapiro

scores = [84, 82, 86, 81, 85, 83, 87, 80, 84, 88]
stat, p_value = shapiro(scores)
print(f"W = {stat:.4f}, p = {p_value:.4f}")
# Large p → no evidence against normality`}
                  />
                  <p>
                    <strong>Kolmogorov-Smirnov test</strong> — measures the maximum distance
                    between the empirical CDF and the theoretical CDF:
                  </p>
                  <Tex
                    math="D = \sup_x |F_n(x) - F(x)|"
                    display
                  />
                  <PythonCode
                    code={`from scipy.stats import kstest
import numpy as np

scores = np.array([84, 82, 86, 81, 85, 83, 87, 80, 84, 88])
stat, p_value = kstest(scores, 'norm',
                       args=(scores.mean(), scores.std()))
print(f"D = {stat:.4f}, p = {p_value:.4f}")`}
                  />
                  <p>
                    <strong>Chi-square goodness-of-fit</strong> — bins the data and compares
                    observed vs expected counts per bin:
                  </p>
                  <PythonCode
                    code={`from scipy.stats import chisquare
import numpy as np

# Bin the data and compare to expected normal counts
observed, bin_edges = np.histogram(scores, bins=5)
# Compute expected counts from normal CDF...
# (more practical for larger samples)`}
                  />
                </CardContent>
              </Card>

              <InfoBox variant="warning">
                <strong>Caution:</strong> With small samples (n &lt; 30), normality tests have
                low power — they often fail to reject H₀ even when data isn&apos;t normal.
                With very large samples (n &gt; 5000), they reject H₀ for trivial departures
                from normality. The QQ plot is often more informative than the p-value.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 8 — Correlation Tests                                  */}
          {/* ============================================================ */}
          {step === 8 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Does roast temperature predict taste score?
                Sunrise Roasters roasted 10 batches at varying temperatures.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4" /> The Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                        <p><strong>Temp (°C):</strong> {CORR_TEMP.join(", ")}</p>
                        <p><strong>Taste:</strong> {CORR_TASTE.join(", ")}</p>
                      </div>
                      <p className="text-sm">
                        Notice the <strong>inverted-U</strong> pattern — taste peaks around 205°C
                        and drops at both extremes. This is a trap for linear correlation!
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="Pearson r"
                          value={fmt(PEARSON_R, 4)}
                          formula={`r = ${fmt(PEARSON_R, 4)}`}
                        />
                        <StatCard
                          label="Interpretation"
                          value="Near zero!"
                        />
                      </div>
                    </div>
                    <CorrScatterPlot />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="w-4 h-4" /> Pearson Correlation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <Tex
                    math="r = \frac{\sum (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2 \cdot \sum (y_i - \bar{y})^2}}"
                    display
                  />
                  <p><strong>Hand calculation:</strong></p>
                  <p className="text-sm">
                    <Tex math={`\\bar{x} = ${fmt(CORR_TEMP_MEAN, 1)}`} />,{" "}
                    <Tex math={`\\bar{y} = ${fmt(CORR_TASTE_MEAN, 1)}`} />
                  </p>
                  <Tex
                    math={`S_{xy} = \\sum(x_i - \\bar{x})(y_i - \\bar{y}) = ${fmt(SXY, 2)}`}
                    display
                  />
                  <Tex
                    math={`S_{xx} = ${fmt(SXX, 2)}, \\quad S_{yy} = ${fmt(SYY, 2)}`}
                    display
                  />
                  <Tex
                    math={`r = \\frac{${fmt(SXY, 2)}}{\\sqrt{${fmt(SXX, 2)} \\times ${fmt(SYY, 2)}}} = ${fmt(PEARSON_R, 4)}`}
                    display
                  />
                  <p className="text-sm">
                    To test if r is significantly different from zero:
                  </p>
                  <Tex
                    math={`t = \\frac{r\\sqrt{n-2}}{\\sqrt{1-r^2}} = \\frac{${fmt(PEARSON_R, 4)} \\times \\sqrt{8}}{\\sqrt{1 - ${fmt(PEARSON_R ** 2, 4)}}} = ${fmt((PEARSON_R * Math.sqrt(8)) / Math.sqrt(1 - PEARSON_R ** 2), 3)}`}
                    display
                  />
                  <PythonCode
                    code={`from scipy.stats import pearsonr

temp  = [190, 195, 198, 200, 202, 205, 208, 210, 215, 220]
taste = [72,  75,  79,  82,  84,  85,  83,  80,  76,  70]

r, p_value = pearsonr(temp, taste)
print(f"r = {r:.4f}, p = {p_value:.4f}")`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompare className="w-4 h-4" /> Spearman & Kendall
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    <strong>Spearman&apos;s ρ</strong> — Pearson correlation on the <em>ranks</em>.
                    Detects monotonic relationships (consistently increasing or decreasing),
                    not just linear ones.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import spearmanr

rho, p_value = spearmanr(temp, taste)
print(f"ρ = {rho:.4f}, p = {p_value:.4f}")`}
                  />
                  <p>
                    <strong>Kendall&apos;s τ</strong> — counts concordant vs discordant pairs.
                    More robust than Spearman for small samples.
                  </p>
                  <PythonCode
                    code={`from scipy.stats import kendalltau

tau, p_value = kendalltau(temp, taste)
print(f"τ = {tau:.4f}, p = {p_value:.4f}")`}
                  />
                </CardContent>
              </Card>

              <InfoBox variant="warning">
                <strong>The lesson:</strong> Pearson r ≈ {fmt(PEARSON_R, 2)} despite a clear
                curved pattern! Pearson measures only <em>linear</em> association. Spearman
                and Kendall can detect monotonic relationships, but even they miss the
                inverted-U here. <strong>Always plot your data</strong> — no single number
                captures the full picture.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 9 — Multiple Testing                                   */}
          {/* ============================================================ */}
          {step === 9 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> Sunrise Roasters tests {nTests} flavor attributes
                (acidity, body, sweetness, aroma, ...) to see which differ between Ethiopian
                and Colombian beans. Most attributes are truly the same.
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-4 h-4" /> The Problem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    If you run {nTests} independent tests at α = 0.05, the probability of
                    at least one false positive is:
                  </p>
                  <Tex
                    math={`P(\\text{≥1 false positive}) = 1 - (1 - \\alpha)^m = 1 - 0.95^{${nTests}} = ${fmt(1 - Math.pow(0.95, nTests), 3)}`}
                    display
                  />
                  <p className="text-sm">
                    With {nTests} tests, there&apos;s a {fmt((1 - Math.pow(0.95, nTests)) * 100, 1)}%
                    chance of at least one false discovery — even if nothing is truly different!
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Zap className="w-4 h-4" /> Correction Methods
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <LabeledSlider
                        label="Number of tests (m)"
                        min={5}
                        max={50}
                        step={1}
                        value={[nTests]}
                        onValueChange={([v]) => setNTests(v)}
                      />
                      <LabeledSlider
                        label="Proportion of true nulls"
                        min={0.5}
                        max={1.0}
                        step={0.05}
                        value={[propNull]}
                        onValueChange={([v]) => setPropNull(v)}
                      />
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>1. Bonferroni:</strong> Use <Tex math={`\\alpha_{\\text{adj}} = \\alpha / m = 0.05 / ${nTests} = ${fmt(0.05 / nTests, 4)}`} />.
                          Very conservative — controls FWER (family-wise error rate).
                        </p>
                        <p>
                          <strong>2. Holm-Bonferroni:</strong> Step-down procedure. Sort p-values,
                          compare p₍ᵢ₎ to α/(m−i+1). Less conservative than Bonferroni.
                        </p>
                        <p>
                          <strong>3. Benjamini-Hochberg (BH):</strong> Controls FDR (false discovery rate).
                          Sort p-values and compare p₍ᵢ₎ to (i/m)×α. The green diagonal line
                          in the chart shows this threshold.
                        </p>
                      </div>
                    </div>
                    <MultiplePValuesChart nTests={nTests} propNull={propNull} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 text-slate-700 pt-6">
                  <PythonCode
                    code={`from statsmodels.stats.multitest import multipletests
import numpy as np

# Suppose we have p-values from 20 tests
p_values = np.array([0.001, 0.008, 0.015, 0.022, 0.039,
                      0.06, 0.12, 0.15, 0.23, 0.31,
                      0.42, 0.48, 0.55, 0.61, 0.72,
                      0.78, 0.83, 0.88, 0.93, 0.97])

# Bonferroni
reject_bonf, pvals_bonf, _, _ = multipletests(p_values, method='bonferroni')
print(f"Bonferroni rejects: {sum(reject_bonf)}")

# Holm
reject_holm, pvals_holm, _, _ = multipletests(p_values, method='holm')
print(f"Holm rejects: {sum(reject_holm)}")

# Benjamini-Hochberg (FDR)
reject_bh, pvals_bh, _, _ = multipletests(p_values, method='fdr_bh')
print(f"BH rejects: {sum(reject_bh)}")`}
                  />
                </CardContent>
              </Card>

              <InfoBox>
                <strong>FWER vs FDR:</strong> Bonferroni/Holm control the probability of
                <em> any</em> false positive (FWER). BH controls the <em>proportion</em> of
                false positives among rejections (FDR). BH is less conservative and preferred
                in exploratory analysis where some false leads are acceptable.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 10 — Power & Sample Size                               */}
          {/* ============================================================ */}
          {step === 10 && (
            <StepContent className="space-y-4">
              <p>
                <strong>Scenario:</strong> How many batches should Sunrise Roasters test to
                reliably detect a taste difference between two origins?
              </p>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4" /> Effect Size: Cohen&apos;s d
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Before computing power, we need to quantify the effect we want to detect.
                    Cohen&apos;s d standardizes the difference in means:
                  </p>
                  <Tex
                    math="d = \frac{\mu_1 - \mu_2}{\sigma}"
                    display
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard label="Small effect" value="d = 0.2" />
                    <StatCard label="Medium effect" value="d = 0.5" />
                    <StatCard label="Large effect" value="d = 0.8" />
                  </div>
                  <p className="text-sm">
                    For our Ethiopian vs Colombian example: d ={" "}
                    <Tex
                      math={`\\frac{${fmt(ETH_MEAN, 1)} - ${fmt(COL_MEAN, 1)}}{${fmt(Math.sqrt((ETH_STD ** 2 + COL_STD ** 2) / 2), 2)}} = ${fmt((ETH_MEAN - COL_MEAN) / Math.sqrt((ETH_STD ** 2 + COL_STD ** 2) / 2), 2)}`}
                    />
                    {" "}— a very large effect.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" /> Interactive Power Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <p className="text-sm">
                        Power = probability of detecting a real effect. The approximation
                        for a two-sample z-test:
                      </p>
                      <Tex
                        math="\text{Power} \approx \Phi\!\left(d\sqrt{\frac{n}{2}} - z_{\alpha/2}\right)"
                        display
                      />
                      <LabeledSlider
                        label="Effect size (d)"
                        min={0.2}
                        max={1.5}
                        step={0.05}
                        value={[effectSize]}
                        onValueChange={([v]) => setEffectSize(v)}
                      />
                      <LabeledSlider
                        label="Significance level (α)"
                        min={0.01}
                        max={0.10}
                        step={0.01}
                        value={[powerAlpha]}
                        onValueChange={([v]) => setPowerAlpha(v)}
                      />
                      <LabeledSlider
                        label="Sample size per group (n)"
                        min={5}
                        max={100}
                        step={1}
                        value={[powerN]}
                        onValueChange={([v]) => setPowerN(v)}
                      />
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="Current power"
                          value={fmt(
                            (() => {
                              let z = 1.96;
                              for (let i = 0; i < 20; i++) {
                                const p = 2 * (1 - normalCDF(z));
                                const dp = -2 * normalPDF(z);
                                z = z - (p - powerAlpha) / dp;
                              }
                              return 1 - normalCDF(z - effectSize * Math.sqrt(powerN / 2));
                            })(),
                            3
                          )}
                        />
                        <StatCard
                          label="n for 80% power"
                          value={(() => {
                            let z = 1.96;
                            for (let i = 0; i < 20; i++) {
                              const p = 2 * (1 - normalCDF(z));
                              const dp = -2 * normalPDF(z);
                              z = z - (p - powerAlpha) / dp;
                            }
                            for (let n = 5; n <= 500; n++) {
                              if (1 - normalCDF(z - effectSize * Math.sqrt(n / 2)) >= 0.8)
                                return `${n} per group`;
                            }
                            return ">500";
                          })()}
                        />
                      </div>
                    </div>
                    <PowerCurveChart
                      effectSize={effectSize}
                      alpha={powerAlpha}
                      currentN={powerN}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-4 text-slate-700 pt-6">
                  <PythonCode
                    code={`from statsmodels.stats.power import TTestIndPower

analysis = TTestIndPower()

# Find required n for 80% power
n = analysis.solve_power(
    effect_size=0.8,
    alpha=0.05,
    power=0.8,
    alternative='two-sided'
)
print(f"Need n = {n:.0f} per group")

# Or compute power for given n
power = analysis.power(
    effect_size=0.8,
    nobs1=20,
    alpha=0.05,
    alternative='two-sided'
)
print(f"Power with n=20: {power:.3f}")`}
                  />
                </CardContent>
              </Card>

              <InfoBox>
                <strong>Plan your sample size before collecting data.</strong> A study with
                too few observations wastes resources by being unlikely to detect real effects.
                The conventional target is 80% power — meaning a 4-in-5 chance of finding a
                real effect if one exists.
              </InfoBox>
            </StepContent>
          )}

          {/* ============================================================ */}
          {/*  STEP 11 — Quiz                                              */}
          {/* ============================================================ */}
          {step === 11 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question="A coffee shop measures the same 12 customers' satisfaction before and after a renovation. Which test?"
                options={[
                  "Independent t-test",
                  "Paired t-test",
                  "One-way ANOVA",
                  "Chi-square test",
                ]}
                correctIndex={1}
                explanation="Same customers measured twice = paired data. The paired t-test uses within-subject differences, removing individual-level noise."
              />
              <QuizCard
                question="You have 5 taste ratings per bean origin and the data is heavily skewed. Which test compares 4 origins?"
                options={[
                  "One-way ANOVA",
                  "Welch's t-test",
                  "Kruskal-Wallis",
                  "Fisher's exact test",
                ]}
                correctIndex={2}
                explanation="Kruskal-Wallis is the nonparametric alternative to one-way ANOVA. With small, skewed samples, the normality assumption for ANOVA is questionable."
              />
              <QuizCard
                question="A chi-square test on a 2×2 table gives p = 0.03, but one expected count is 3.2. What's the concern?"
                options={[
                  "The p-value is too small",
                  "Expected count < 5 makes chi-square unreliable",
                  "2×2 tables can't use chi-square",
                  "The sample size is too large",
                ]}
                correctIndex={1}
                explanation="Chi-square relies on a large-sample approximation that breaks down when expected counts are below 5. Use Fisher's exact test instead."
              />
              <QuizCard
                question="You test 100 hypotheses at α = 0.05 and find 8 with p < 0.05. If all nulls are true, about how many are false positives?"
                options={["0", "3", "5", "8"]}
                correctIndex={2}
                explanation="If all 100 nulls are true, we expect 5% × 100 = 5 false positives by chance. Getting 8 suggests some may be real, but we can't be sure without multiple testing correction."
              />
              <QuizCard
                question="Pearson r = 0.02 between roast temperature and taste. Can you conclude there's no relationship?"
                options={[
                  "Yes — r ≈ 0 means no relationship",
                  "No — the relationship could be nonlinear",
                  "Yes — but only if p > 0.05",
                  "No — because the sample is too small",
                ]}
                correctIndex={1}
                explanation="Pearson measures only linear association. A perfect inverted-U relationship (like our coffee example) can produce r ≈ 0. Always plot your data!"
              />
              <QuizCard
                question="A researcher increases sample size from 20 to 80 per group. What happens to power?"
                options={[
                  "Power decreases",
                  "Power stays the same",
                  "Power increases substantially",
                  "Power increases only if α also changes",
                ]}
                correctIndex={2}
                explanation="Power increases with sample size (all else equal). Quadrupling n from 20 to 80 roughly doubles the test statistic, dramatically increasing the chance of detecting a real effect."
              />
              <QuizCard
                question='What does a p-value of 0.03 mean?'
                options={[
                  "3% chance that H₀ is true",
                  "3% chance of seeing this result if H₀ is true",
                  "97% chance the effect is real",
                  "The effect size is 0.03",
                ]}
                correctIndex={1}
                explanation="The p-value is P(data this extreme | H₀ true). It is NOT the probability that H₀ is true — that's a common and dangerous misinterpretation."
              />
              <QuizCard
                question="You run a t-test (p = 0.07) and a Mann-Whitney test (p = 0.04) on the same data. Which do you report?"
                options={[
                  "The t-test (more powerful)",
                  "The Mann-Whitney (smaller p)",
                  "Whichever you planned before seeing the data",
                  "Both, and take the average p-value",
                ]}
                correctIndex={2}
                explanation="Choosing the test after seeing results is a form of p-hacking. Pre-register your analysis plan. If you planned the t-test, report the t-test — even if the other test gives a smaller p-value."
              />
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
