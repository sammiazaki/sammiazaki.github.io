import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, TrendingUp, AlertTriangle, BarChart3, Sigma } from "lucide-react";
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
/*  Helpers                                                            */
/* ================================================================== */

function fmt(x, d = 2) {
  return Number(x).toFixed(d);
}

/* ================================================================== */
/*  Simulation helpers                                                  */
/* ================================================================== */

/**
 * A seeded pseudo-random number generator (mulberry32).
 */
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

const TRUE_ATE = 3.2; // $3.2K boost
const N = 500;

/**
 * Generate a job-training dataset.
 * experience ~ N(0,1); prior_sales ~ N(0,1)
 * P(train | X) = logistic(1.2*experience + 0.8*prior_sales)
 * sales = TRUE_ATE*train + 4*experience + 3*prior_sales + noise
 */
function generateData(seed = 42) {
  const rng = mulberry32(seed);
  const data = [];
  for (let i = 0; i < N; i++) {
    const exp_ = boxMuller(rng);
    const prior = boxMuller(rng);
    const ps_true = logistic(1.2 * exp_ + 0.8 * prior);
    const trained = rng() < ps_true ? 1 : 0;
    const noise = boxMuller(rng) * 2.5;
    const sales = TRUE_ATE * trained + 4 * exp_ + 3 * prior + noise;
    data.push({ exp_, prior, ps_true, trained, sales });
  }
  return data;
}

const DATA = generateData(42);

/**
 * Fit a simple linear outcome model using OLS on the full covariate set.
 * Returns coefficients [intercept, trained, exp_, prior] for the pooled model.
 * We then use mu1 = predict(trained=1) and mu0 = predict(trained=0).
 *
 * For a degraded model we deliberately use only a subset of covariates.
 */
function fitOutcomeModel(data, quality) {
  // quality 0..1: fraction of confounder signal to include.
  // quality=1 -> full model (both exp_ and prior); quality=0 -> intercept only
  const n = data.length;

  // Build design matrix: [1, trained, quality*exp_, quality*prior]
  // Closed-form OLS: beta = (X'X)^{-1} X'y  (4 x 4 system)
  // We solve it numerically with a simple gradient-descent or direct formula.
  // For simplicity: use sample means by treatment cell + covariate adjustment.

  // Simpler: regress Y on [1, T, q*exp_, q*prior] via closed-form 4-param OLS.
  const q = quality;
  const X = data.map((d) => [1, d.trained, q * d.exp_, q * d.prior]);
  const Y = data.map((d) => d.sales);

  // 4x4 OLS via normal equations (manual)
  const p = 4;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const XtY = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      XtY[j] += X[i][j] * Y[i];
      for (let k = 0; k < p; k++) {
        XtX[j][k] += X[i][j] * X[i][k];
      }
    }
  }
  const beta = solveLinear4(XtX, XtY);

  // mu1(x) and mu0(x)
  return {
    mu1: (d) => beta[0] + beta[1] * 1 + beta[2] * q * d.exp_ + beta[3] * q * d.prior,
    mu0: (d) => beta[0] + beta[1] * 0 + beta[2] * q * d.exp_ + beta[3] * q * d.prior,
  };
}

/**
 * Fit a propensity score model (logistic) with covariate quality control.
 * Returns ps(x) for each observation.
 */
function fitPropensityModel(data, quality) {
  // quality=1 -> use true PS; quality=0 -> assign 0.5 to everyone
  return data.map((d) => {
    const true_ps = d.ps_true;
    const flat_ps = 0.5;
    return quality * true_ps + (1 - quality) * flat_ps;
  });
}

/**
 * Compute the doubly robust ATE estimate.
 */
function computeDR(data, mu1, mu0, ps_hat) {
  const n = data.length;
  let sumY1 = 0;
  let sumY0 = 0;
  for (let i = 0; i < n; i++) {
    const d = data[i];
    const p = Math.max(0.01, Math.min(0.99, ps_hat[i]));
    sumY1 += (d.trained * (d.sales - mu1(d))) / p + mu1(d);
    sumY0 += ((1 - d.trained) * (d.sales - mu0(d))) / (1 - p) + mu0(d);
  }
  return sumY1 / n - sumY0 / n;
}

/**
 * Naive ATE (simple difference in means).
 */
function computeNaive(data) {
  const trained = data.filter((d) => d.trained === 1);
  const untrained = data.filter((d) => d.trained === 0);
  const meanT = trained.reduce((s, d) => s + d.sales, 0) / trained.length;
  const meanU = untrained.reduce((s, d) => s + d.sales, 0) / untrained.length;
  return meanT - meanU;
}

/**
 * Gaussian elimination for a 4x4 system Ax = b.
 * Returns the solution vector x.
 */
function solveLinear4(A, b) {
  const n = 4;
  // Augmented matrix
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / (M[col][col] || 1e-12);
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k];
      }
    }
  }
  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= M[i][j] * x[j];
    }
    x[i] /= M[i][i] || 1e-12;
  }
  return x;
}

/**
 * Bootstrap confidence interval for DR estimate.
 * Returns { mean, lower, upper, se, samples }.
 */
function bootstrapDR(data, omQuality, psQuality, B) {
  const rng = mulberry32(999);
  const estimates = [];
  for (let b = 0; b < B; b++) {
    // Resample with replacement
    const sample = Array.from({ length: data.length }, () =>
      data[Math.floor(rng() * data.length)]
    );
    const { mu1, mu0 } = fitOutcomeModel(sample, omQuality);
    const ps_hat = fitPropensityModel(sample, psQuality);
    estimates.push(computeDR(sample, mu1, mu0, ps_hat));
  }
  estimates.sort((a, b) => a - b);
  const lo = estimates[Math.floor(0.025 * B)];
  const hi = estimates[Math.floor(0.975 * B)];
  const mean = estimates.reduce((s, x) => s + x, 0) / B;
  const variance = estimates.reduce((s, x) => s + (x - mean) ** 2, 0) / (B - 1);
  return { mean, lower: lo, upper: hi, se: Math.sqrt(variance), samples: estimates };
}

/* ================================================================== */
/*  Visualization helpers                                              */
/* ================================================================== */

/**
 * Pre-compute DR and IPW-only estimates across a grid of quality values (0..1)
 * so that StabilityChart can draw a full line without re-running simulation on
 * every render.  Results are memoised by the caller.
 */
function buildStabilityGrid(mode /* "ps" | "om" */, steps = 21) {
  const qualities = Array.from({ length: steps }, (_, i) => i / (steps - 1));
  return qualities.map((q) => {
    let dr, comparison;
    if (mode === "ps") {
      // outcome model held correct; degrade PS
      const { mu1, mu0 } = fitOutcomeModel(DATA, 1.0);
      const ps_hat = fitPropensityModel(DATA, q);
      dr = computeDR(DATA, mu1, mu0, ps_hat);
      // comparison: IPW-only (just the propensity-score term, no OM correction)
      // Approximate as DR with a flat outcome model (quality=0)
      const { mu1: mu1f, mu0: mu0f } = fitOutcomeModel(DATA, 0.0);
      comparison = computeDR(DATA, mu1f, mu0f, ps_hat);
    } else {
      // PS held correct; degrade outcome model
      const { mu1, mu0 } = fitOutcomeModel(DATA, q);
      const ps_hat = fitPropensityModel(DATA, 1.0);
      dr = computeDR(DATA, mu1, mu0, ps_hat);
      // comparison: outcome-model-only (no PS correction)
      // Approximate by using flat PS (quality=0)
      const ps_flat = fitPropensityModel(DATA, 0.0);
      comparison = computeDR(DATA, mu1, mu0, ps_flat);
    }
    return { q, dr, comparison };
  });
}

/* Pre-compute grids once at module load (static DATA, no slider dependency) */
const STABILITY_GRID_PS = buildStabilityGrid("ps");
const STABILITY_GRID_OM = buildStabilityGrid("om");

/**
 * Pre-compute the 16×16 bias heatmap at module load so BiasGauge never
 * re-runs OLS on each render.
 */
const HM_STEPS_CONST = 16;
const BIAS_HEATMAP = (() => {
  const cells = [];
  for (let pi = 0; pi < HM_STEPS_CONST; pi++) {
    for (let oi = 0; oi < HM_STEPS_CONST; oi++) {
      const psQ = pi / (HM_STEPS_CONST - 1);
      const omQ = oi / (HM_STEPS_CONST - 1);
      const { mu1, mu0 } = fitOutcomeModel(DATA, omQ);
      const ps_hat = fitPropensityModel(DATA, psQ);
      const dr = computeDR(DATA, mu1, mu0, ps_hat);
      cells.push({ pi, oi, ab: Math.abs(dr - TRUE_ATE) });
    }
  }
  return cells;
})();

/* ---- SVG constants shared by charts ---- */
const W = 460;
const H = 200;
const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

/**
 * StabilityChart
 * Line chart showing how DR estimate (and a comparison estimator) move
 * as model quality varies from 0 to 1.
 *
 * Props:
 *   grid         — array of { q, dr, comparison } from buildStabilityGrid
 *   currentQ     — slider value (0–1) to highlight as a dot on the DR line
 *   currentDR    — current DR estimate (from parent's useMemo)
 *   xLabel       — label for x-axis
 *   compLabel    — legend label for the comparison series
 *   title        — optional chart title
 */
function StabilityChart({ grid, currentQ, currentDR, xLabel, compLabel, title }) {
  const yValues = [...grid.map((p) => p.dr), ...grid.map((p) => p.comparison), TRUE_ATE];
  const yMin = Math.min(...yValues) - 0.3;
  const yMax = Math.max(...yValues) + 0.3;
  const yRange = yMax - yMin;

  const sx = (q) => PAD.left + q * PW;
  const sy = (v) => PAD.top + PH * (1 - (v - yMin) / yRange);

  /* Build SVG path strings */
  const drPath =
    "M" + grid.map((p) => `${sx(p.q).toFixed(1)},${sy(p.dr).toFixed(1)}`).join("L");
  const compPath =
    "M" + grid.map((p) => `${sx(p.q).toFixed(1)},${sy(p.comparison).toFixed(1)}`).join("L");

  /* Axis ticks */
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const v = yMin + (i / (yTickCount - 1)) * yRange;
    return Math.round(v * 10) / 10;
  });

  const trueY = sy(TRUE_ATE);
  const dotX = sx(currentQ);
  const dotY = sy(currentDR);

  return (
    <div>
      {title && <div className="text-xs font-medium text-slate-500 mb-1">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* y-axis */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
        {/* x-axis */}
        <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} stroke="#cbd5e1" />

        {/* y-axis ticks and grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left - 4} y1={sy(v)}
              x2={PAD.left + PW} y2={sy(v)}
              stroke="#f1f5f9" strokeWidth={0.5}
            />
            <line x1={PAD.left - 4} y1={sy(v)} x2={PAD.left} y2={sy(v)} stroke="#cbd5e1" />
            <text
              x={PAD.left - 7}
              y={sy(v) + 4}
              textAnchor="end"
              className="text-[10px] fill-slate-500"
            >
              ${v.toFixed(1)}K
            </text>
          </g>
        ))}

        {/* x-axis ticks */}
        {xTicks.map((v) => (
          <g key={v}>
            <line x1={sx(v)} y1={PAD.top + PH} x2={sx(v)} y2={PAD.top + PH + 4} stroke="#cbd5e1" />
            <text x={sx(v)} y={H - 6} textAnchor="middle" className="text-[10px] fill-slate-500">
              {v === 0 ? "0" : v === 1 ? "1" : v.toString()}
            </text>
          </g>
        ))}

        {/* x-axis label */}
        <text x={PAD.left + PW / 2} y={H - 0} textAnchor="middle" className="text-[10px] fill-slate-400">
          {xLabel}
        </text>

        {/* True ATE reference line */}
        <line
          x1={PAD.left} y1={trueY}
          x2={PAD.left + PW} y2={trueY}
          stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3"
        />
        <text x={PAD.left + PW - 2} y={trueY - 4} textAnchor="end" className="text-[9px] fill-emerald-600">
          True ATE $3.2K
        </text>

        {/* Comparison series (IPW-only or OM-only) */}
        <path d={compPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" />

        {/* DR series */}
        <path d={drPath} fill="none" stroke="#1e293b" strokeWidth={2} />

        {/* Current value dot on DR line */}
        <circle cx={dotX} cy={dotY} r={5} fill="#1e293b" />
        <circle cx={dotX} cy={dotY} r={3} fill="white" />

        {/* Vertical marker for current slider position */}
        <line
          x1={dotX} y1={PAD.top}
          x2={dotX} y2={PAD.top + PH}
          stroke="#1e293b" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4}
        />

        {/* Legend */}
        <line x1={PAD.left + 2} y1={PAD.top + 8} x2={PAD.left + 18} y2={PAD.top + 8} stroke="#1e293b" strokeWidth={2} />
        <text x={PAD.left + 22} y={PAD.top + 12} className="text-[9px] fill-slate-700">DR estimate</text>
        <line x1={PAD.left + 80} y1={PAD.top + 8} x2={PAD.left + 96} y2={PAD.top + 8} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 2" />
        <text x={PAD.left + 100} y={PAD.top + 12} className="text-[9px] fill-slate-500">{compLabel}</text>
      </svg>
    </div>
  );
}

/* ---- Bootstrap histogram helpers ---- */
function makeBins(values, nBins, range) {
  const [lo, hi] = range;
  const step = (hi - lo) / nBins;
  const counts = new Array(nBins).fill(0);
  for (const v of values) {
    const i = Math.max(0, Math.min(nBins - 1, Math.floor((v - lo) / step)));
    counts[i]++;
  }
  return counts.map((c, i) => ({ x0: lo + i * step, x1: lo + (i + 1) * step, count: c }));
}

/**
 * BootstrapHistogramPanel
 * Three stacked mini-histograms (one per scenario) sharing the same x-axis.
 *
 * Props:
 *   both    — { samples, lower, upper, mean } from bootstrapDR
 *   wrongPS — same shape
 *   wrongOM — same shape
 */
function BootstrapHistogramPanel({ both, wrongPS, wrongOM }) {
  const allSamples = [...both.samples, ...wrongPS.samples, ...wrongOM.samples];
  const globalMin = Math.min(...allSamples) - 0.1;
  const globalMax = Math.max(...allSamples) + 0.1;

  const NBIN = 30;
  const PANEL_H = 80;
  const PANEL_GAP = 18;
  const TOTAL_H = 3 * PANEL_H + 2 * PANEL_GAP + PAD.top + PAD.bottom + 12;
  const xRange = globalMax - globalMin;

  const sx = (v) => PAD.left + ((v - globalMin) / xRange) * PW;

  const scenarios = [
    { label: "Both correct", color: "#10b981", data: both },
    { label: "Wrong PS, correct OM", color: "#f59e0b", data: wrongPS },
    { label: "Correct PS, wrong OM", color: "#94a3b8", data: wrongOM },
  ];

  const xTicks = [
    globalMin,
    globalMin + xRange * 0.25,
    globalMin + xRange * 0.5,
    globalMin + xRange * 0.75,
    globalMax,
  ];

  return (
    <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full">
      {/* x-axis label at bottom */}
      <text
        x={PAD.left + PW / 2}
        y={TOTAL_H - 2}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        Bootstrap ATE estimate ($K sales boost)
      </text>

      {/* True ATE vertical reference across all panels */}
      {scenarios.map((s, panelIdx) => {
        const panelTop = PAD.top + panelIdx * (PANEL_H + PANEL_GAP);
        const bins = makeBins(s.data.samples, NBIN, [globalMin, globalMax]);
        const maxCount = Math.max(...bins.map((b) => b.count), 1);
        const barW = PW / NBIN;
        const sy = (c) => panelTop + PANEL_H * (1 - c / maxCount);
        const axisY = panelTop + PANEL_H;

        return (
          <g key={s.label}>
            {/* Panel x-axis */}
            <line x1={PAD.left} y1={axisY} x2={PAD.left + PW} y2={axisY} stroke="#cbd5e1" />

            {/* Bars */}
            {bins.map((b, i) => (
              <rect
                key={i}
                x={sx(b.x0)}
                y={sy(b.count)}
                width={Math.max(barW - 1, 1)}
                height={Math.max(axisY - sy(b.count), 0)}
                fill={s.color}
                opacity={0.55}
              />
            ))}

            {/* True ATE line */}
            <line
              x1={sx(TRUE_ATE)} y1={panelTop}
              x2={sx(TRUE_ATE)} y2={axisY}
              stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 2"
            />

            {/* CI lower bound */}
            <line
              x1={sx(s.data.lower)} y1={panelTop + 4}
              x2={sx(s.data.lower)} y2={axisY}
              stroke={s.color} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.85}
            />

            {/* CI upper bound */}
            <line
              x1={sx(s.data.upper)} y1={panelTop + 4}
              x2={sx(s.data.upper)} y2={axisY}
              stroke={s.color} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.85}
            />

            {/* Mean line */}
            <line
              x1={sx(s.data.mean)} y1={panelTop}
              x2={sx(s.data.mean)} y2={axisY}
              stroke={s.color} strokeWidth={2} opacity={0.9}
            />

            {/* Panel label */}
            <text x={PAD.left + 4} y={panelTop + 13} className="text-[9px] fill-slate-600" fontWeight="600">
              {s.label}
            </text>

            {/* CI annotation */}
            <text
              x={PAD.left + PW - 2}
              y={panelTop + 13}
              textAnchor="end"
              className="text-[9px] fill-slate-500"
            >
              95% CI: [{s.data.lower.toFixed(2)}, {s.data.upper.toFixed(2)}]K
            </text>
          </g>
        );
      })}

      {/* Shared x-axis ticks at bottom panel */}
      {xTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={sx(v)}
            y1={PAD.top + 2 * (PANEL_H + PANEL_GAP) + PANEL_H}
            x2={sx(v)}
            y2={PAD.top + 2 * (PANEL_H + PANEL_GAP) + PANEL_H + 5}
            stroke="#cbd5e1"
          />
          <text
            x={sx(v)}
            y={PAD.top + 2 * (PANEL_H + PANEL_GAP) + PANEL_H + 16}
            textAnchor="middle"
            className="text-[10px] fill-slate-500"
          >
            {v.toFixed(1)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * BiasGauge
 * Horizontal gauge bar showing where the current DR estimate sits
 * relative to the true ATE of 3.2K, with colour coding.
 * Below it, a 2D heatmap of absolute bias across the PS×OM quality grid.
 *
 * Props:
 *   currentDR  — scalar DR estimate from step5
 *   psQuality  — current PS quality slider value (0–1) for the heatmap crosshair
 *   omQuality  — current OM quality slider value (0–1)
 */
function BiasGauge({ currentDR, psQuality, omQuality, heatmapCells }) {
  const bias = currentDR - TRUE_ATE;
  const absBias = Math.abs(bias);

  /* Gauge */
  const GAUGE_W = W;
  const GAUGE_H = 60;
  const GAUGE_PAD = { left: PAD.left, right: PAD.right, top: 16, bottom: 8 };
  const GAUGE_PW = GAUGE_W - GAUGE_PAD.left - GAUGE_PAD.right;

  /* Range: ±3K around true ATE */
  const gaugeMin = TRUE_ATE - 3;
  const gaugeMax = TRUE_ATE + 3;
  const gaugeRange = gaugeMax - gaugeMin;
  const gx = (v) => GAUGE_PAD.left + ((v - gaugeMin) / gaugeRange) * GAUGE_PW;

  const gaugeY = GAUGE_PAD.top + 16;
  const gaugeBarH = 12;

  /* Colour segments for the bar */
  const segments = [
    { from: gaugeMin, to: TRUE_ATE - 1.5, color: "#fee2e2" },
    { from: TRUE_ATE - 1.5, to: TRUE_ATE - 0.5, color: "#fef3c7" },
    { from: TRUE_ATE - 0.5, to: TRUE_ATE + 0.5, color: "#d1fae5" },
    { from: TRUE_ATE + 0.5, to: TRUE_ATE + 1.5, color: "#fef3c7" },
    { from: TRUE_ATE + 1.5, to: gaugeMax, color: "#fee2e2" },
  ];

  /* Needle colour */
  const needleColor =
    absBias < 0.5 ? "#10b981" : absBias < 1.5 ? "#f59e0b" : "#ef4444";

  /* Heatmap layout constants */
  const HM_STEPS = HM_STEPS_CONST;
  const HM_W = W;
  const HM_H = 130;
  const HM_PAD = { left: PAD.left + 10, right: PAD.right + 10, top: 16, bottom: 28 };
  const HM_PW = HM_W - HM_PAD.left - HM_PAD.right;
  const HM_PH = HM_H - HM_PAD.top - HM_PAD.bottom;
  const cellW = HM_PW / HM_STEPS;
  const cellH = HM_PH / HM_STEPS;

  /* Interpolate colour: green (low bias) → red (high bias) */
  function biasColor(ab) {
    const t = Math.min(ab / 2.5, 1); // saturate at 2.5K bias
    // green #10b981 → amber #f59e0b → red #ef4444
    if (t < 0.5) {
      const u = t * 2;
      const r = Math.round(16 + (245 - 16) * u);
      const g = Math.round(185 + (158 - 185) * u);
      const b = Math.round(129 + (11 - 129) * u);
      return `rgb(${r},${g},${b})`;
    } else {
      const u = (t - 0.5) * 2;
      const r = Math.round(245 + (239 - 245) * u);
      const g = Math.round(158 + (68 - 158) * u);
      const b = Math.round(11 + (68 - 11) * u);
      return `rgb(${r},${g},${b})`;
    }
  }

  /* Crosshair position on heatmap */
  const crossX = HM_PAD.left + psQuality * HM_PW;
  const crossY = HM_PAD.top + (1 - omQuality) * HM_PH; // OM on y-axis, flipped

  const TOTAL_SVG_H = GAUGE_H + HM_H + 8;

  const heatmapAxisTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${TOTAL_SVG_H}`} className="w-full">
      {/* ---- Gauge ---- */}
      {/* Background segments */}
      {segments.map((s, i) => (
        <rect
          key={i}
          x={gx(s.from)}
          y={gaugeY}
          width={Math.max(gx(s.to) - gx(s.from), 0)}
          height={gaugeBarH}
          fill={s.color}
        />
      ))}
      {/* Gauge border */}
      <rect
        x={gx(gaugeMin)} y={gaugeY}
        width={GAUGE_PW} height={gaugeBarH}
        fill="none" stroke="#cbd5e1" strokeWidth={1} rx={2}
      />
      {/* True ATE tick */}
      <line x1={gx(TRUE_ATE)} y1={gaugeY - 4} x2={gx(TRUE_ATE)} y2={gaugeY + gaugeBarH + 4} stroke="#10b981" strokeWidth={2} />
      <text x={gx(TRUE_ATE)} y={gaugeY - 7} textAnchor="middle" className="text-[9px] fill-emerald-600">True $3.2K</text>

      {/* Current estimate needle */}
      <line
        x1={gx(currentDR)} y1={gaugeY - 2}
        x2={gx(currentDR)} y2={gaugeY + gaugeBarH + 2}
        stroke={needleColor} strokeWidth={2.5}
      />
      <polygon
        points={`${gx(currentDR)},${gaugeY + gaugeBarH + 8} ${gx(currentDR) - 5},${gaugeY + gaugeBarH + 2} ${gx(currentDR) + 5},${gaugeY + gaugeBarH + 2}`}
        fill={needleColor}
      />
      <text
        x={Math.max(GAUGE_PAD.left + 20, Math.min(gx(currentDR), GAUGE_PAD.left + GAUGE_PW - 20))}
        y={GAUGE_H - 2}
        textAnchor="middle"
        className="text-[9px]"
        fill={needleColor}
        fontWeight="600"
      >
        DR = ${currentDR.toFixed(2)}K (bias {bias >= 0 ? "+" : ""}{bias.toFixed(2)}K)
      </text>

      {/* Gauge title */}
      <text x={GAUGE_PAD.left} y={GAUGE_PAD.top - 2} className="text-[9px] fill-slate-500" fontWeight="600">
        Training sales boost estimate vs. true $3.2K
      </text>

      {/* ---- Heatmap ---- */}
      {/* Title */}
      <text
        x={HM_PAD.left + HM_PW / 2}
        y={GAUGE_H + 12}
        textAnchor="middle"
        className="text-[9px] fill-slate-500"
        fontWeight="600"
      >
        Absolute bias heatmap — green = low bias, red = high
      </text>

      {/* Cells */}
      {heatmapCells.map(({ pi, oi, ab }) => (
        <rect
          key={`${pi}-${oi}`}
          x={HM_PAD.left + pi * cellW}
          y={GAUGE_H + HM_PAD.top + (HM_STEPS - 1 - oi) * cellH}
          width={cellW}
          height={cellH}
          fill={biasColor(ab)}
          opacity={0.85}
        />
      ))}

      {/* Heatmap border */}
      <rect
        x={HM_PAD.left} y={GAUGE_H + HM_PAD.top}
        width={HM_PW} height={HM_PH}
        fill="none" stroke="#cbd5e1" strokeWidth={1}
      />

      {/* Crosshair */}
      <line
        x1={crossX} y1={GAUGE_H + HM_PAD.top}
        x2={crossX} y2={GAUGE_H + HM_PAD.top + HM_PH}
        stroke="#1e293b" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7}
      />
      <line
        x1={HM_PAD.left} y1={crossY + GAUGE_H}
        x2={HM_PAD.left + HM_PW} y2={crossY + GAUGE_H}
        stroke="#1e293b" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.7}
      />
      <circle cx={crossX} cy={crossY + GAUGE_H} r={5} fill="white" stroke="#1e293b" strokeWidth={2} />

      {/* x-axis ticks (PS quality) */}
      {heatmapAxisTicks.map((v) => {
        const tx = HM_PAD.left + v * HM_PW;
        return (
          <g key={v}>
            <line x1={tx} y1={GAUGE_H + HM_PAD.top + HM_PH} x2={tx} y2={GAUGE_H + HM_PAD.top + HM_PH + 4} stroke="#cbd5e1" />
            <text x={tx} y={GAUGE_H + HM_PAD.top + HM_PH + 14} textAnchor="middle" className="text-[10px] fill-slate-500">
              {v === 0 ? "0" : v === 1 ? "1" : v}
            </text>
          </g>
        );
      })}
      <text
        x={HM_PAD.left + HM_PW / 2}
        y={GAUGE_H + HM_PAD.top + HM_PH + 26}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        PS model quality →
      </text>

      {/* y-axis ticks (OM quality) */}
      {heatmapAxisTicks.map((v) => {
        const ty = GAUGE_H + HM_PAD.top + (1 - v) * HM_PH;
        return (
          <g key={v}>
            <line x1={HM_PAD.left - 4} y1={ty} x2={HM_PAD.left} y2={ty} stroke="#cbd5e1" />
            <text x={HM_PAD.left - 6} y={ty + 4} textAnchor="end" className="text-[10px] fill-slate-500">
              {v === 0 ? "0" : v === 1 ? "1" : v}
            </text>
          </g>
        );
      })}
      {/* OM quality axis label — rotated */}
      <text
        transform={`rotate(-90, ${HM_PAD.left - 22}, ${GAUGE_H + HM_PAD.top + HM_PH / 2})`}
        x={HM_PAD.left - 22}
        y={GAUGE_H + HM_PAD.top + HM_PH / 2}
        textAnchor="middle"
        className="text-[10px] fill-slate-400"
      >
        OM quality →
      </text>
    </svg>
  );
}

/* ================================================================== */
/*  Lessons                                                            */
/* ================================================================== */

const LESSONS = [
  "The Problem: Which Model Do You Trust?",
  "The Doubly Robust Formula",
  "When the Outcome Model Saves You",
  "When the Propensity Score Saves You",
  "Bootstrap & Confidence Intervals",
  "The Catch: When Both Models Fail",
  "Quiz",
];

/* ================================================================== */
/*  Tutorial                                                           */
/* ================================================================== */

export default function DoublyRobustTutorial() {
  // Step 2 state: PS quality slider (outcome model is held correct at quality=1)
  const [psQuality2, setPsQuality2] = useState([0.5]);

  // Step 3 state: outcome model quality slider (PS is held correct at quality=1)
  const [omQuality3, setOmQuality3] = useState([0.5]);

  // Step 4 state: bootstrap samples slider
  const [bootstrapB, setBootstrapB] = useState([200]);

  // Step 5 state: both model quality sliders
  const [psQuality5, setPsQuality5] = useState([0.5]);
  const [omQuality5, setOmQuality5] = useState([0.5]);

  /* ---- Step 2 derived values ---- */
  const step2 = useMemo(() => {
    const { mu1, mu0 } = fitOutcomeModel(DATA, 1.0); // outcome model correct
    const ps_correct = fitPropensityModel(DATA, 1.0);
    const ps_degraded = fitPropensityModel(DATA, psQuality2[0]);
    const dr_correct = computeDR(DATA, mu1, mu0, ps_correct);
    const dr_degraded = computeDR(DATA, mu1, mu0, ps_degraded);
    const naive = computeNaive(DATA);
    return { dr_correct, dr_degraded, naive };
  }, [psQuality2]);

  /* ---- Step 3 derived values ---- */
  const step3 = useMemo(() => {
    const { mu1: mu1c, mu0: mu0c } = fitOutcomeModel(DATA, 1.0);
    const { mu1: mu1d, mu0: mu0d } = fitOutcomeModel(DATA, omQuality3[0]);
    const ps_hat = fitPropensityModel(DATA, 1.0); // PS correct
    const dr_correct = computeDR(DATA, mu1c, mu0c, ps_hat);
    const dr_degraded = computeDR(DATA, mu1d, mu0d, ps_hat);
    const naive = computeNaive(DATA);
    return { dr_correct, dr_degraded, naive };
  }, [omQuality3]);

  /* ---- Step 4 derived values ---- */
  const step4 = useMemo(() => {
    const B = bootstrapB[0];
    const both = bootstrapDR(DATA, 1.0, 1.0, B);
    const wrongPS = bootstrapDR(DATA, 1.0, 0.2, B);
    const wrongOM = bootstrapDR(DATA, 0.2, 1.0, B);
    return { both, wrongPS, wrongOM };
  }, [bootstrapB]);

  /* ---- Step 5 derived values ---- */
  const step5 = useMemo(() => {
    const { mu1, mu0 } = fitOutcomeModel(DATA, omQuality5[0]);
    const ps_hat = fitPropensityModel(DATA, psQuality5[0]);
    return computeDR(DATA, mu1, mu0, ps_hat);
  }, [psQuality5, omQuality5]);

  const intro = (
    <>
      <p>
        Causal inference from observational data forces you to model something —
        either <span className="font-semibold">how treatment was assigned</span>{" "}
        (the propensity score) or{" "}
        <span className="font-semibold">how outcomes are generated</span> (the
        outcome regression). The doubly robust estimator combines both so that{" "}
        <span className="font-semibold">only one needs to be correctly specified</span>{" "}
        for the estimate to be consistent.
      </p>
      <p>
        This tutorial follows Chapter 12 of{" "}
        <em>Causal Inference for the Brave and True</em> by Matheus Facure.
      </p>
    </>
  );

  return (
    <TutorialShell
      title="Doubly Robust Estimation"
      description="Learn how combining propensity scores and outcome regression creates an estimator that only needs one model to be correct."
      intro={intro}
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ── Step 0: The Problem ─────────────────────────────────── */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TrendingUp className="h-6 w-6" /> The Problem: Which Model Do You Trust?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Acme Corp offers a voluntary sales training program. After the
                    quarter ends, the HR team wants to know: does attending training
                    actually boost <span className="font-semibold">quarterly sales performance</span>?
                  </p>
                  <p>
                    There is an immediate problem. The employees who sign up for training
                    are not a random sample — they tend to be the more experienced,
                    higher-performing reps who were already on track for a good quarter.
                    This is <span className="font-semibold">self-selection bias</span>, and
                    it means a simple comparison of sales between attendees and
                    non-attendees will overstate the program's effect.
                  </p>

                  <InfoBox title="Naive estimate is biased" variant="warning">
                    Employees who attended training earned{" "}
                    <span className="font-semibold">
                      ${fmt(computeNaive(DATA))}K more
                    </span>{" "}
                    per quarter than those who did not — but high-performers
                    self-selected into training. The true causal effect is only{" "}
                    $3.20K.
                  </InfoBox>

                  <p>
                    To recover the true effect we need to adjust for confounders:
                    years of experience and prior-quarter sales. Two standard approaches exist, and each requires you to commit
                    to a model.
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBox title="Approach 1 — Outcome regression" variant="outline">
                      Fit a model <Tex>{String.raw`\hat{\mu}(X, T)`}</Tex> that
                      predicts sales from covariates and training status. Predict each
                      employee's sales under both scenarios and average the difference.
                      <br /><br />
                      <span className="font-semibold">Risk:</span> if the regression
                      model is misspecified — wrong functional form, omitted covariates —
                      the estimate is biased.
                    </InfoBox>
                    <InfoBox title="Approach 2 — Propensity score weighting" variant="outline">
                      Fit a model <Tex>{String.raw`\hat{P}(X)`}</Tex> for the
                      probability of attending training given covariates, then
                      reweight observations to create a pseudo-experiment (IPW).
                      <br /><br />
                      <span className="font-semibold">Risk:</span> if the propensity
                      model is wrong, the weights are distorted and the estimate drifts.
                    </InfoBox>
                  </div>

                  <InfoBox variant="dark">
                    What if you could combine both approaches so that a mistake in
                    either model on its own cannot ruin the estimate? That is exactly
                    what the <span className="font-semibold">doubly robust estimator</span> achieves.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 1: The Doubly Robust Formula ──────────────────── */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sigma className="h-6 w-6" /> The Doubly Robust Formula
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The doubly robust (DR) estimator stitches together the outcome
                    regression and the propensity score into a single expression.
                    Here is the full formula for the average treatment effect:
                  </p>

                  <InfoBox variant="formula">
                    <Tex display>{String.raw`\widehat{\text{ATE}} = \frac{1}{N}\sum_{i=1}^{N} \left( \frac{T_i\bigl(Y_i - \hat{\mu}_1(X_i)\bigr)}{\hat{P}(X_i)} + \hat{\mu}_1(X_i) \right) - \frac{1}{N}\sum_{i=1}^{N} \left( \frac{(1-T_i)\bigl(Y_i - \hat{\mu}_0(X_i)\bigr)}{1 - \hat{P}(X_i)} + \hat{\mu}_0(X_i) \right)`}</Tex>
                  </InfoBox>

                  <p>
                    The formula estimates <Tex>{String.raw`\mathbb{E}[Y_1]`}</Tex> (average
                    sales if everyone had attended training) and subtracts{" "}
                    <Tex>{String.raw`\mathbb{E}[Y_0]`}</Tex> (average sales if no one had).
                    Each half has the same shape:
                  </p>

                  <div className="grid gap-3 md:grid-cols-3">
                    <InfoBox title="Outcome model (trained)" variant="outline">
                      <Tex>{String.raw`\hat{\mu}_1(X_i)`}</Tex> — the regression model's
                      prediction of quarterly sales for employee <Tex>i</Tex> if they{" "}
                      <em>did</em> attend training, given their experience, prior sales,
                      and other covariates. This is our baseline prediction.
                    </InfoBox>
                    <InfoBox title="Outcome model (untrained)" variant="outline">
                      <Tex>{String.raw`\hat{\mu}_0(X_i)`}</Tex> — the same model's
                      prediction of sales for employee <Tex>i</Tex> if they <em>did not</em>{" "}
                      attend training. Subtracting this from the trained prediction gives the
                      individual-level predicted treatment effect.
                    </InfoBox>
                    <InfoBox title="Propensity score" variant="outline">
                      <Tex>{String.raw`\hat{P}(X_i)`}</Tex> — the estimated probability
                      that employee <Tex>i</Tex> attends training, given their covariates.
                      It appears in the denominator, giving higher weight to observations
                      where training assignment was unexpected.
                    </InfoBox>
                  </div>

                  <InfoBox title="Intuition" variant="muted">
                    Think of it as: <em>start with your best regression prediction,
                    then correct it using propensity-weighted residuals.</em> The
                    residual term <Tex>{String.raw`T_i(Y_i - \hat{\mu}_1(X_i))`}</Tex>{" "}
                    is non-zero only for trained employees, and it measures how far
                    the outcome model's prediction was from their actual sales. If
                    the outcome model is perfect the residuals are zero and the
                    propensity score never comes into play.
                  </InfoBox>

                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard
                      label="True ATE (training effect)"
                      value="$3.20K"
                      formula={"\\mathbb{E}[Y_1 - Y_0]"}
                    />
                    <StatCard
                      label="DR estimate (both models correct)"
                      value={`$${fmt((() => {
                        const { mu1, mu0 } = fitOutcomeModel(DATA, 1.0);
                        const ps = fitPropensityModel(DATA, 1.0);
                        return computeDR(DATA, mu1, mu0, ps);
                      })())}K`}
                      formula={"\\widehat{\\text{ATE}}_{\\text{DR}}"}
                    />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 2: When the Outcome Model Saves You ───────────── */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ShieldCheck className="h-6 w-6" /> When the Outcome Model Saves You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Suppose your regression model for sales is well-specified — it
                    correctly captures how experience and prior performance predict
                    sales under each training scenario. What happens then, even if
                    your propensity score model is completely wrong?
                  </p>
                  <p>
                    The algebraic argument is clean. When <Tex>{String.raw`\hat{\mu}_1`}</Tex>{" "}
                    is the true conditional expectation, the residuals{" "}
                    <Tex>{String.raw`Y_i - \hat{\mu}_1(X_i)`}</Tex> average to zero
                    among trained employees. That means the entire propensity-score
                    correction term gets multiplied by something that averages to zero
                    — so it does not matter what value <Tex>{String.raw`\hat{P}(X_i)`}</Tex>{" "}
                    takes. The formula collapses to the pure regression estimator.
                  </p>

                  <InfoBox variant="formula">
                    <Tex display>{String.raw`\text{If } \hat{\mu}_1 \text{ correct:}\quad \mathbb{E}\!\left[\frac{T_i(Y_i - \hat{\mu}_1(X_i))}{\hat{P}(X_i)}\right] = 0`}</Tex>
                  </InfoBox>

                  <p>
                    Use the slider below to degrade the propensity score model — watch
                    what happens to the DR estimate when the outcome model is held correct.
                  </p>

                  <div className="rounded-xl border p-4 bg-slate-50">
                    <LabeledSlider
                      label="Propensity score model quality"
                      value={psQuality2}
                      displayValue={psQuality2[0] < 0.15 ? "Random (flat 0.5)" : psQuality2[0] > 0.85 ? "Correctly specified" : `${Math.round(psQuality2[0] * 100)}% of true signal`}
                      onValueChange={setPsQuality2}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      At 0, everyone is assigned PS = 0.5 (completely ignoring
                      covariates). At 1, the true propensity score is used.
                    </p>
                  </div>

                  <StabilityChart
                    grid={STABILITY_GRID_PS}
                    currentQ={psQuality2[0]}
                    currentDR={step2.dr_degraded}
                    xLabel="Propensity score model quality (0 = flat 0.5, 1 = true PS)"
                    compLabel="IPW-only estimate"
                    title="Training sales boost ($K) as PS model degrades — outcome model held correct"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="Naive difference in means"
                      value={`$${fmt(step2.naive)}K`}
                      formula={"\\bar{Y}_{\\text{trained}} - \\bar{Y}_{\\text{untrained}}"}
                    />
                    <StatCard
                      label="DR estimate — correct PS"
                      value={`$${fmt(step2.dr_correct)}K`}
                      formula={"\\widehat{\\text{ATE}}_{\\text{DR}},\\; \\hat{P}=P^*"}
                    />
                    <StatCard
                      label="DR estimate — degraded PS"
                      value={`$${fmt(step2.dr_degraded)}K`}
                      formula={"\\widehat{\\text{ATE}}_{\\text{DR}},\\; \\hat{P}\\text{ wrong}"}
                    />
                  </div>

                  <InfoBox variant="dark">
                    With the outcome model correctly specified, the DR estimate stays
                    near $3.20K regardless of how badly you mangle the propensity
                    score model. The outcome model acts as a safety net.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 3: When the Propensity Score Saves You ────────── */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <ShieldCheck className="h-6 w-6" /> When the Propensity Score Saves You
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Now flip the scenario. Your regression model for sales is wrong —
                    maybe it uses a linear form when the true relationship is nonlinear,
                    or it omits an important interaction. But your propensity score model
                    correctly captures who self-selects into training.
                  </p>
                  <p>
                    The algebraic argument mirrors Step 2. The DR formula can be
                    rearranged to reveal that, when <Tex>{String.raw`\hat{P}(X_i)`}</Tex>{" "}
                    is the true propensity score, the expected value of{" "}
                    <Tex>{String.raw`T_i - \hat{P}(X_i)`}</Tex> conditional on <Tex>X</Tex> is
                    exactly zero. That zeros out the term that multiplies the outcome model's
                    prediction error — leaving a pure IPW estimator.
                  </p>

                  <InfoBox variant="formula">
                    <Tex display>{String.raw`\text{If } \hat{P} \text{ correct:}\quad \mathbb{E}\!\left[\frac{T_i - \hat{P}(X_i)}{\hat{P}(X_i)}\,\hat{\mu}_1(X_i)\;\Big|\;X_i\right] = 0`}</Tex>
                  </InfoBox>

                  <p>
                    Use the slider to degrade the outcome model — watch the DR estimate
                    hold steady while the outcome-model-only estimate drifts.
                  </p>

                  <div className="rounded-xl border p-4 bg-slate-50">
                    <LabeledSlider
                      label="Outcome model quality"
                      value={omQuality3}
                      displayValue={omQuality3[0] < 0.15 ? "Intercept only (no covariates)" : omQuality3[0] > 0.85 ? "Correctly specified" : `${Math.round(omQuality3[0] * 100)}% of true signal`}
                      onValueChange={setOmQuality3}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      At 0, the outcome model uses no covariates (intercept only). At 1,
                      it uses the full correct specification.
                    </p>
                  </div>

                  <StabilityChart
                    grid={STABILITY_GRID_OM}
                    currentQ={omQuality3[0]}
                    currentDR={step3.dr_degraded}
                    xLabel="Outcome model quality (0 = intercept only, 1 = full specification)"
                    compLabel="OM-only estimate"
                    title="Training sales boost ($K) as outcome model degrades — PS held correct"
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="Naive difference in means"
                      value={`$${fmt(step3.naive)}K`}
                      formula={"\\bar{Y}_{\\text{trained}} - \\bar{Y}_{\\text{untrained}}"}
                    />
                    <StatCard
                      label="DR estimate — correct outcome model"
                      value={`$${fmt(step3.dr_correct)}K`}
                      formula={"\\widehat{\\text{ATE}}_{\\text{DR}},\\; \\hat{\\mu}=\\mu^*"}
                    />
                    <StatCard
                      label="DR estimate — degraded outcome model"
                      value={`$${fmt(step3.dr_degraded)}K`}
                      formula={"\\widehat{\\text{ATE}}_{\\text{DR}},\\; \\hat{\\mu}\\text{ wrong}"}
                    />
                  </div>

                  <InfoBox variant="dark">
                    With the propensity score correctly specified, the DR estimate stays
                    near $3.20K even when the outcome model is completely misspecified.
                    The propensity score acts as a safety net.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 4: Bootstrap & Confidence Intervals ───────────── */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BarChart3 className="h-6 w-6" /> Bootstrap & Confidence Intervals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Knowing the DR point estimate is close to the truth is only half
                    the story. How certain are we? The DR estimator does not have a
                    simple closed-form standard error — it inherits randomness from
                    two estimated models, not one. The standard workaround is the
                    <span className="font-semibold"> nonparametric bootstrap</span>.
                  </p>
                  <p>
                    The procedure is straightforward: draw <Tex>B</Tex> resamples
                    (with replacement) from the 500 employees, re-estimate both models
                    and the DR ATE on each resample, and collect the distribution of
                    bootstrap estimates. The 2.5th and 97.5th percentiles of that
                    distribution form the 95% confidence interval.
                  </p>

                  <div className="rounded-xl border p-4 bg-slate-50">
                    <LabeledSlider
                      label="Bootstrap resamples (B)"
                      value={bootstrapB}
                      displayValue={`${bootstrapB[0]} resamples`}
                      onValueChange={setBootstrapB}
                      min={50}
                      max={1000}
                      step={50}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      More resamples give a smoother distribution and more stable CI bounds,
                      but take longer to compute. 200–500 is usually sufficient.
                    </p>
                  </div>

                  <BootstrapHistogramPanel
                    both={step4.both}
                    wrongPS={step4.wrongPS}
                    wrongOM={step4.wrongOM}
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Both models correct</p>
                      <StatCard
                        label="Point estimate"
                        value={`$${fmt(step4.both.mean)}K`}
                        formula={"\\widehat{\\text{ATE}}_{\\text{DR}}"}
                      />
                      <StatCard
                        label="95% CI"
                        value={`[$${fmt(step4.both.lower)}K, $${fmt(step4.both.upper)}K]`}
                        formula={"[q_{0.025},\\; q_{0.975}]"}
                      />
                      <StatCard
                        label="CI width"
                        value={`$${fmt(step4.both.upper - step4.both.lower)}K`}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Wrong PS, correct outcome model</p>
                      <StatCard
                        label="Point estimate"
                        value={`$${fmt(step4.wrongPS.mean)}K`}
                        formula={"\\widehat{\\text{ATE}}_{\\text{DR}}"}
                      />
                      <StatCard
                        label="95% CI"
                        value={`[$${fmt(step4.wrongPS.lower)}K, $${fmt(step4.wrongPS.upper)}K]`}
                        formula={"[q_{0.025},\\; q_{0.975}]"}
                      />
                      <StatCard
                        label="CI width"
                        value={`$${fmt(step4.wrongPS.upper - step4.wrongPS.lower)}K`}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Correct PS, wrong outcome model</p>
                      <StatCard
                        label="Point estimate"
                        value={`$${fmt(step4.wrongOM.mean)}K`}
                        formula={"\\widehat{\\text{ATE}}_{\\text{DR}}"}
                      />
                      <StatCard
                        label="95% CI"
                        value={`[$${fmt(step4.wrongOM.lower)}K, $${fmt(step4.wrongOM.upper)}K]`}
                        formula={"[q_{0.025},\\; q_{0.975}]"}
                      />
                      <StatCard
                        label="CI width"
                        value={`$${fmt(step4.wrongOM.upper - step4.wrongOM.lower)}K`}
                      />
                    </div>
                  </div>

                  <InfoBox title="What misspecification does to uncertainty" variant="muted">
                    Notice that when one model is wrong, the point estimate stays
                    approximately correct — but the CI gets wider. The noisy, wrong
                    model injects extra variance into the residual correction term.
                    Misspecification is not free: you pay for it in precision even
                    when the protection against bias holds.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 5: The Catch: When Both Models Fail ───────────── */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <AlertTriangle className="h-6 w-6" /> The Catch: When Both Models Fail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Doubly robust estimation gives you <em>two chances</em> to get it
                    right — but it is not magic. If both your outcome model and your
                    propensity score model are wrong at the same time, neither safety
                    net is in place and the guarantee of consistency disappears.
                  </p>
                  <p>
                    Degrade both models simultaneously below and watch the DR estimate
                    drift away from the true $3.20K effect. The bias can become
                    substantial when both models are far from the truth.
                  </p>

                  <div className="rounded-xl border p-4 bg-slate-50 space-y-4">
                    <LabeledSlider
                      label="Propensity score model quality"
                      value={psQuality5}
                      displayValue={psQuality5[0] < 0.15 ? "Random (flat 0.5)" : psQuality5[0] > 0.85 ? "Correctly specified" : `${Math.round(psQuality5[0] * 100)}% of true signal`}
                      onValueChange={setPsQuality5}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                    <LabeledSlider
                      label="Outcome model quality"
                      value={omQuality5}
                      displayValue={omQuality5[0] < 0.15 ? "Intercept only (no covariates)" : omQuality5[0] > 0.85 ? "Correctly specified" : `${Math.round(omQuality5[0] * 100)}% of true signal`}
                      onValueChange={setOmQuality5}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>

                  <BiasGauge
                    currentDR={step5}
                    psQuality={psQuality5[0]}
                    omQuality={omQuality5[0]}
                    heatmapCells={BIAS_HEATMAP}
                  />

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="True training effect"
                      value="$3.20K"
                      formula={"\\text{ATE}^*"}
                    />
                    <StatCard
                      label="DR estimate (current settings)"
                      value={`$${fmt(step5)}K`}
                      formula={"\\widehat{\\text{ATE}}_{\\text{DR}}"}
                    />
                    <StatCard
                      label="Bias"
                      value={`$${fmt(Math.abs(step5 - 3.2))}K`}
                      formula={"\\left|\\widehat{\\text{ATE}}_{\\text{DR}} - \\text{ATE}^*\\right|"}
                    />
                  </div>

                  <InfoBox title="Doubly robust is not doubly magic" variant="warning">
                    When both models are wrong, the estimate can drift substantially.
                    The protection is a guarantee about which bias term is zeroed out —
                    not a guarantee against all forms of model error simultaneously.
                  </InfoBox>

                  <p className="font-semibold">Practical safeguards:</p>
                  <InfoBox variant="outline">
                    <ul className="space-y-2 list-disc pl-5">
                      <li>
                        <span className="font-semibold">Use flexible learners.</span>{" "}
                        Random forests or gradient boosting for both models reduce the
                        chance that either is badly misspecified.
                      </li>
                      <li>
                        <span className="font-semibold">Cross-fitting (AIPW).</span>{" "}
                        Fit each model on a held-out fold and predict on the remaining
                        fold, preventing overfitting from inflating the correction term.
                      </li>
                      <li>
                        <span className="font-semibold">Sensitivity analysis.</span>{" "}
                        Deliberately degrade each model and check how much the estimate
                        moves — exactly as you have been doing in this tutorial.
                      </li>
                      <li>
                        <span className="font-semibold">Domain knowledge.</span>{" "}
                        For the training program, subject-matter expertise about what
                        drives self-selection is more valuable than any algorithmic fix.
                      </li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 6: Quiz ────────────────────────────────────────── */}
          {step === 6 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
                <QuizCard
                  question="What does 'doubly robust' mean for the DR estimator?"
                  options={[
                    "Both the outcome model and the propensity score model must be correctly specified for the estimate to be consistent.",
                    "Only one of the two models — the outcome model or the propensity score model — needs to be correctly specified for consistency.",
                    "The estimator is robust to any form of model misspecification, no matter how severe.",
                    "The estimator uses two outcome models and averages their predictions.",
                  ]}
                  correctIndex={1}
                  explanation="'Doubly robust' means you get two chances: if either the outcome model or the propensity score model is correctly specified, the DR estimator is consistent for the true ATE. Both being wrong simultaneously removes the guarantee."
                />

                <QuizCard
                  question="In the training program example, if the outcome model for sales is perfectly specified, what happens to the propensity score correction term?"
                  options={[
                    "It doubles in magnitude because the outcome model absorbs all the variance.",
                    "It averages to zero, because the residuals Y\u1D62 \u2212 \u03BC\u0302\u2081(X\u1D62) are zero in expectation for trained employees — so the propensity score value no longer matters.",
                    "It remains the same; the two components of the formula are always independent.",
                    "It inflates the standard error, making the confidence interval wider.",
                  ]}
                  correctIndex={1}
                  explanation="When the outcome model is correct, E[T(Y \u2212 \u03BC\u0302\u2081(X))] = 0 for trained employees. The residuals average to zero, so the IPW correction term vanishes regardless of what the propensity score model predicts. The DR formula collapses to the pure regression estimator."
                />

                <QuizCard
                  question="What happens when BOTH the propensity score model and the outcome model are misspecified?"
                  options={[
                    "The DR estimate is still consistent because the two errors cancel each other out.",
                    "The estimate has lower variance than when only one model is wrong.",
                    "There is no longer any guarantee of unbiased or consistent estimation — the estimate can drift arbitrarily far from the true ATE.",
                    "The bootstrap confidence interval automatically widens to contain the truth.",
                  ]}
                  correctIndex={2}
                  explanation="Double robustness is a one-of-two guarantee, not an all-or-nothing guarantee. Both safety nets rely on one model being correct to zero out the other model's error. When both are wrong, neither term is zeroed out and the estimate can be substantially biased."
                />

                <QuizCard
                  question="In the bootstrap results from Step 4, why does misspecifying one model widen the confidence interval even though the point estimate remains approximately correct?"
                  options={[
                    "Because bootstrap resampling is inherently less precise when models are nonlinear.",
                    "Because the wrong model injects extra variance into the residual correction term — the protection against bias holds, but the noisy correction adds sampling variability that inflates the standard error.",
                    "Because a misspecified model uses fewer parameters, reducing the degrees of freedom for estimation.",
                    "The confidence interval does not widen; only the point estimate shifts when one model is wrong.",
                  ]}
                  correctIndex={1}
                  explanation="The doubly robust guarantee is about bias: a correct model zeroes out the correction term on average. But 'on average' still allows individual-resample variation. A misspecified model produces noisy, high-variance residuals or weights, which inflates the variance of the DR estimate across bootstrap resamples — producing a wider confidence interval even when the center stays near the true ATE."
                />
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
