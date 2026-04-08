import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calculator,
  Grid3X3,
  Target,
  TrendingUp,
  Sigma,
  Eye,
  BarChart3,
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
/*  Running example — Bean & Brew Coffee Shop                          */
/*                                                                     */
/*  The owner tracks 6 days of data:                                   */
/*    x1 = Temperature (°F)                                            */
/*    x2 = Ad spend ($)                                                */
/*    y  = Daily cups sold                                             */
/*                                                                     */
/*  We'll derive OLS from scratch using this concrete dataset.         */
/* ================================================================== */

function fmt(x, d = 2) {
  return Number(x).toFixed(d);
}

/* ------------------------------------------------------------------ */
/*  Fixed 6-observation dataset for hand calculations                  */
/* ------------------------------------------------------------------ */

const DATA = [
  { day: "Mon", temp: 60, ad: 10, cups: 120 },
  { day: "Tue", temp: 65, ad: 20, cups: 150 },
  { day: "Wed", temp: 70, ad: 15, cups: 160 },
  { day: "Thu", temp: 75, ad: 25, cups: 200 },
  { day: "Fri", temp: 80, ad: 30, cups: 210 },
  { day: "Sat", temp: 85, ad: 35, cups: 250 },
];

const N = DATA.length;

/* ------------------------------------------------------------------ */
/*  OLS computation helpers                                            */
/* ------------------------------------------------------------------ */

function computeOLS(data) {
  const n = data.length;

  // Build X matrix (n x 3): [1, temp, ad]
  const X = data.map((d) => [1, d.temp, d.ad]);
  const y = data.map((d) => d.cups);

  // X'X (3x3)
  const k = 3;
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++)
      for (let r = 0; r < n; r++) XtX[i][j] += X[r][i] * X[r][j];

  // X'y (3x1)
  const Xty = Array(k).fill(0);
  for (let i = 0; i < k; i++)
    for (let r = 0; r < n; r++) Xty[i] += X[r][i] * y[r];

  // Invert X'X via Gauss-Jordan
  const inv = invertMatrix3(XtX);

  // beta = (X'X)^{-1} X'y
  const beta = Array(k).fill(0);
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++) beta[i] += inv[i][j] * Xty[j];

  // Fitted values & residuals
  const yhat = X.map((row) =>
    row.reduce((s, x, j) => s + x * beta[j], 0)
  );
  const resid = y.map((yi, i) => yi - yhat[i]);

  // SSR, SST, R^2
  const ybar = y.reduce((s, v) => s + v, 0) / n;
  const SSR = resid.reduce((s, e) => s + e * e, 0);
  const SST = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
  const R2 = 1 - SSR / SST;

  // Standard errors
  const sigma2 = SSR / (n - k);
  const se = beta.map((_, i) => Math.sqrt(sigma2 * inv[i][i]));

  return { X, y, XtX, Xty, inv, beta, yhat, resid, ybar, SSR, SST, R2, sigma2, se, n, k };
}

function invertMatrix3(M) {
  // 3x3 inversion via cofactors
  const [[a, b, c], [d, e, f], [g, h, i]] = M;
  const det =
    a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const invDet = 1 / det;
  return [
    [
      (e * i - f * h) * invDet,
      (c * h - b * i) * invDet,
      (b * f - c * e) * invDet,
    ],
    [
      (f * g - d * i) * invDet,
      (a * i - c * g) * invDet,
      (c * d - a * f) * invDet,
    ],
    [
      (d * h - e * g) * invDet,
      (b * g - a * h) * invDet,
      (a * e - b * d) * invDet,
    ],
  ];
}

/* ------------------------------------------------------------------ */
/*  Seeded RNG for interactive simulation                              */
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
/*  Interactive simulation: larger dataset for exploring               */
/* ------------------------------------------------------------------ */

function generateSimData(n, b0, b1, noiseSD, seed = 42) {
  const rng = mulberry32(seed);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const x = 50 + rng() * 50; // temperature 50-100
    const eps = boxMuller(rng) * noiseSD;
    const y = b0 + b1 * x + eps;
    rows.push({ x, y });
  }
  return rows;
}

function simpleOLS(rows) {
  const n = rows.length;
  const xbar = rows.reduce((s, r) => s + r.x, 0) / n;
  const ybar = rows.reduce((s, r) => s + r.y, 0) / n;
  let sxx = 0,
    sxy = 0;
  for (const r of rows) {
    sxx += (r.x - xbar) ** 2;
    sxy += (r.x - xbar) * (r.y - ybar);
  }
  const b1 = sxy / sxx;
  const b0 = ybar - b1 * xbar;
  const resid = rows.map((r) => r.y - (b0 + b1 * r.x));
  const ssr = resid.reduce((s, e) => s + e * e, 0);
  const sst = rows.reduce((s, r) => s + (r.y - ybar) ** 2, 0);
  return { b0, b1, xbar, ybar, sxx, sxy, ssr, sst, R2: 1 - ssr / sst, resid };
}

/* ------------------------------------------------------------------ */
/*  Pre-compute the hand-calculation OLS                               */
/* ------------------------------------------------------------------ */

const OLS = computeOLS(DATA);

/* ------------------------------------------------------------------ */
/*  SVG chart constants                                                */
/* ------------------------------------------------------------------ */

const W = 460;
const H = 200;
const PAD = { top: 16, right: 18, bottom: 32, left: 48 };

/* ------------------------------------------------------------------ */
/*  Chart: Scatter + fitted line (simple regression)                   */
/* ------------------------------------------------------------------ */

function ScatterChart({ rows, ols, showResiduals }) {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  const xMin = 45, xMax = 105;
  const yAll = rows.map((r) => r.y);
  const yMin = Math.min(...yAll) - 10;
  const yMax = Math.max(...yAll) + 10;

  const sx = (v) => PAD.left + ((v - xMin) / (xMax - xMin)) * pw;
  const sy = (v) => PAD.top + ph - ((v - yMin) / (yMax - yMin)) * ph;

  const lineY0 = ols.b0 + ols.b1 * xMin;
  const lineY1 = ols.b0 + ols.b1 * xMax;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + f * ph}
          y2={PAD.top + f * ph}
          stroke="#f1f5f9"
          strokeWidth={0.5}
        />
      ))}
      {/* Axes */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={PAD.top + ph}
        y2={PAD.top + ph}
        stroke="#cbd5e1"
      />
      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={PAD.top + ph}
        stroke="#cbd5e1"
      />
      {/* X ticks */}
      {[50, 60, 70, 80, 90, 100].map((v) => (
        <text
          key={v}
          x={sx(v)}
          y={PAD.top + ph + 14}
          textAnchor="middle"
          className="text-[10px] fill-slate-500"
        >
          {v}°F
        </text>
      ))}
      {/* Y ticks */}
      {[yMin, yMin + (yMax - yMin) / 3, yMin + (2 * (yMax - yMin)) / 3, yMax].map(
        (v) => (
          <text
            key={v}
            x={PAD.left - 6}
            y={sy(v) + 3}
            textAnchor="end"
            className="text-[10px] fill-slate-500"
          >
            {Math.round(v)}
          </text>
        )
      )}
      {/* Residual lines */}
      {showResiduals &&
        rows.map((r, i) => {
          const yHat = ols.b0 + ols.b1 * r.x;
          return (
            <line
              key={`res-${i}`}
              x1={sx(r.x)}
              x2={sx(r.x)}
              y1={sy(r.y)}
              y2={sy(yHat)}
              stroke="#f59e0b"
              strokeWidth={1}
              opacity={0.7}
            />
          );
        })}
      {/* Fitted line */}
      <line
        x1={sx(xMin)}
        y1={sy(lineY0)}
        x2={sx(xMax)}
        y2={sy(lineY1)}
        stroke="#10b981"
        strokeWidth={2}
        strokeDasharray="6,3"
      />
      {/* Data points */}
      {rows.map((r, i) => (
        <circle
          key={i}
          cx={sx(r.x)}
          cy={sy(r.y)}
          r={3}
          fill="#1e293b"
          opacity={0.6}
        />
      ))}
      {/* Labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" className="text-[10px] fill-slate-400">
        Temperature (°F)
      </text>
      <text
        x={10}
        y={PAD.top + ph / 2}
        textAnchor="middle"
        transform={`rotate(-90, 10, ${PAD.top + ph / 2})`}
        className="text-[10px] fill-slate-400"
      >
        Cups sold
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart: Residual plot                                               */
/* ------------------------------------------------------------------ */

function ResidualChart({ rows, ols }) {
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  const yHats = rows.map((r) => ols.b0 + ols.b1 * r.x);
  const resids = rows.map((r, i) => r.y - yHats[i]);
  const xMin = Math.min(...yHats) - 5;
  const xMax = Math.max(...yHats) + 5;
  const rMax = Math.max(...resids.map(Math.abs)) * 1.3;

  const sx = (v) => PAD.left + ((v - xMin) / (xMax - xMin)) * pw;
  const sy = (v) => PAD.top + ph / 2 - (v / rMax) * (ph / 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Zero line */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={sy(0)}
        y2={sy(0)}
        stroke="#cbd5e1"
        strokeDasharray="4,2"
      />
      {/* Axes */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={PAD.top + ph}
        y2={PAD.top + ph}
        stroke="#cbd5e1"
      />
      <line
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={PAD.top + ph}
        stroke="#cbd5e1"
      />
      {/* Points */}
      {yHats.map((yh, i) => (
        <circle
          key={i}
          cx={sx(yh)}
          cy={sy(resids[i])}
          r={3.5}
          fill={resids[i] >= 0 ? "#10b981" : "#f59e0b"}
          opacity={0.7}
        />
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" className="text-[10px] fill-slate-400">
        Fitted value (cups)
      </text>
      <text
        x={10}
        y={PAD.top + ph / 2}
        textAnchor="middle"
        transform={`rotate(-90, 10, ${PAD.top + ph / 2})`}
        className="text-[10px] fill-slate-400"
      >
        Residual
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Interactive matrix display                              */
/* ------------------------------------------------------------------ */

function MatrixDisplay({ label, rows, highlight }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <div className="inline-flex items-center gap-1">
        <span className="text-xl text-slate-300 font-light">[</span>
        <table className="border-collapse">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((val, j) => (
                  <td
                    key={j}
                    className={`px-2 py-0.5 text-right font-mono text-xs ${
                      highlight?.[i]?.[j]
                        ? "bg-emerald-50 text-emerald-700 font-semibold"
                        : "text-slate-700"
                    }`}
                  >
                    {typeof val === "number" ? fmt(val, val % 1 === 0 ? 0 : 2) : val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <span className="text-xl text-slate-300 font-light">]</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component: Projection visualization (geometric intuition)          */
/* ------------------------------------------------------------------ */

function ProjectionChart() {
  const W2 = 300, H2 = 260;
  // Simplified 2D projection diagram
  const cx = 150, cy = 200;
  // Column space plane (drawn as a tilted parallelogram)
  const planePoints = "50,220 250,220 280,100 80,100";
  // y vector
  const yEnd = { x: 200, y: 50 };
  // y-hat (projection onto plane)
  const yhatEnd = { x: 200, y: 160 };
  // residual = y - yhat
  return (
    <svg viewBox={`0 0 ${W2} ${H2}`} className="w-full max-w-[280px]">
      {/* Column space plane */}
      <polygon
        points={planePoints}
        fill="#f0fdf4"
        stroke="#86efac"
        strokeWidth={1}
        opacity={0.6}
      />
      <text x={165} y={215} className="text-[10px] fill-emerald-600 font-medium">
        Col(X)
      </text>
      {/* y vector */}
      <line x1={cx} y1={cy} x2={yEnd.x} y2={yEnd.y} stroke="#1e293b" strokeWidth={2} />
      <polygon
        points={`${yEnd.x},${yEnd.y} ${yEnd.x - 5},${yEnd.y + 8} ${yEnd.x + 5},${yEnd.y + 8}`}
        fill="#1e293b"
      />
      <text x={yEnd.x + 8} y={yEnd.y + 4} className="text-[11px] fill-slate-800 font-semibold">
        y
      </text>
      {/* y-hat vector */}
      <line x1={cx} y1={cy} x2={yhatEnd.x} y2={yhatEnd.y} stroke="#10b981" strokeWidth={2} />
      <polygon
        points={`${yhatEnd.x},${yhatEnd.y} ${yhatEnd.x - 5},${yhatEnd.y + 8} ${yhatEnd.x + 5},${yhatEnd.y + 8}`}
        fill="#10b981"
      />
      <text
        x={yhatEnd.x + 8}
        y={yhatEnd.y + 4}
        className="text-[11px] fill-emerald-600 font-semibold"
      >
        y&#770;
      </text>
      {/* Residual vector (dashed) */}
      <line
        x1={yhatEnd.x}
        y1={yhatEnd.y}
        x2={yEnd.x}
        y2={yEnd.y}
        stroke="#f59e0b"
        strokeWidth={1.5}
        strokeDasharray="4,3"
      />
      <text
        x={yEnd.x + 8}
        y={(yEnd.y + yhatEnd.y) / 2 + 4}
        className="text-[10px] fill-amber-600 font-medium"
      >
        e
      </text>
      {/* Right angle marker */}
      <polyline
        points={`${yhatEnd.x - 8},${yhatEnd.y} ${yhatEnd.x - 8},${yhatEnd.y - 8} ${yhatEnd.x},${yhatEnd.y - 8}`}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1}
      />
      {/* Origin dot */}
      <circle cx={cx} cy={cy} r={3} fill="#1e293b" />
      <text x={cx - 14} y={cy + 4} className="text-[10px] fill-slate-500">
        0
      </text>
    </svg>
  );
}

/* ================================================================== */
/*  MAIN TUTORIAL COMPONENT                                            */
/* ================================================================== */

export default function OLSByHandTutorial() {
  /* ----- interactive state ----- */
  const [matrixStep, setMatrixStep] = useState(0); // 0..4
  const [simN, setSimN] = useState([40]);
  const [simNoise, setSimNoise] = useState([15]);
  const [showResid, setShowResid] = useState(false);

  /* ----- derived: interactive sim ----- */
  const sim = useMemo(() => {
    const rows = generateSimData(simN[0], -20, 3, simNoise[0]);
    const ols = simpleOLS(rows);
    return { rows, ols };
  }, [simN, simNoise]);

  /* ----- hand-calc intermediate values ----- */
  const xbar_temp = DATA.reduce((s, d) => s + d.temp, 0) / N;
  const xbar_ad = DATA.reduce((s, d) => s + d.ad, 0) / N;
  const ybar = DATA.reduce((s, d) => s + d.cups, 0) / N;

  const intro = (
    <>
      <p>
        OLS (Ordinary Least Squares) is the workhorse of regression analysis.
        Most people use a library call, but understanding the algebra behind it
        reveals <em>why</em> it works and <em>when</em> it fails.
      </p>
      <p>
        We will derive every formula by hand, compute each matrix step by step,
        and build the geometric intuition for why OLS is a projection.
      </p>
    </>
  );

  return (
    <TutorialShell
      title="OLS by Hand"
      description="Full derivation, matrix algebra, and geometric intuition for Ordinary Least Squares"
      intro={intro}
      lessons={[
        "The Problem",
        "Calculus Derivation",
        "Normal Equations by Hand",
        "Matrix Form",
        "Interactive Matrix Calculator",
        "Geometric Intuition",
        "Properties of OLS",
        "Residuals & R\u00B2",
        "Interactive Playground",
        "Quiz",
      ]}
    >
      {(step) => (
        <>
          {/* ======================================================= */}
          {/*  STEP 0: The Problem                                     */}
          {/* ======================================================= */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4" /> Bean & Brew Coffee Shop
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The owner of <strong>Bean & Brew</strong> recorded 6 days of
                    data: the <strong>temperature</strong> outside (°F), how much
                    she spent on <strong>ads</strong> ($), and how many{" "}
                    <strong>cups</strong> she sold.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-1 px-3 text-left text-slate-500 font-medium">Day</th>
                          <th className="py-1 px-3 text-right text-slate-500 font-medium">Temp (°F)</th>
                          <th className="py-1 px-3 text-right text-slate-500 font-medium">Ad ($)</th>
                          <th className="py-1 px-3 text-right text-slate-500 font-medium">Cups sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DATA.map((d) => (
                          <tr key={d.day} className="border-b border-slate-100">
                            <td className="py-1 px-3 font-medium">{d.day}</td>
                            <td className="py-1 px-3 text-right font-mono">{d.temp}</td>
                            <td className="py-1 px-3 text-right font-mono">{d.ad}</td>
                            <td className="py-1 px-3 text-right font-mono">{d.cups}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p>
                    She wants a model that predicts cups sold from temperature
                    and ad spend:
                  </p>
                  <Tex
                    math={`\\text{Cups}_i = \\beta_0 + \\beta_1 \\cdot \\text{Temp}_i + \\beta_2 \\cdot \\text{Ad}_i + \\varepsilon_i`}
                    display
                  />
                  <p>
                    The goal: find <Tex math="\beta_0, \beta_1, \beta_2" /> that
                    make the <strong>best</strong> predictions. But what does
                    &ldquo;best&rdquo; mean?
                  </p>

                  <InfoBox variant="formula" title="The OLS criterion">
                    <p>
                      Minimize the <strong>sum of squared residuals</strong>:
                    </p>
                    <Tex
                      math={`\\text{SSR} = \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2 = \\sum_{i=1}^{n} (y_i - \\beta_0 - \\beta_1 x_{1i} - \\beta_2 x_{2i})^2`}
                      display
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Why squared? Squaring penalizes big misses more than small
                      ones, and it&rsquo;s differentiable everywhere &mdash;
                      which lets us use calculus to find the minimum.
                    </p>
                  </InfoBox>

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard label="Observations" value={`n = ${N}`} />
                    <StatCard
                      label="Mean temp"
                      value={`${fmt(xbar_temp, 1)} °F`}
                      formula="\\bar{x}_1 = \\frac{1}{n}\\sum x_{1i}"
                    />
                    <StatCard
                      label="Mean cups"
                      value={fmt(ybar, 1)}
                      formula="\\bar{y} = \\frac{1}{n}\\sum y_i"
                    />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 1: Calculus Derivation                              */}
          {/* ======================================================= */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" /> Deriving OLS with Calculus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Start with the simple case: one predictor. Bean & Brew wants
                    to predict cups from temperature alone:
                  </p>
                  <Tex
                    math={`\\text{Cups}_i = \\beta_0 + \\beta_1 \\cdot \\text{Temp}_i + \\varepsilon_i`}
                    display
                  />

                  <InfoBox variant="formula" title="Step 1: Write the objective">
                    <Tex
                      math={`S(\\beta_0, \\beta_1) = \\sum_{i=1}^{6} (y_i - \\beta_0 - \\beta_1 x_i)^2`}
                      display
                    />
                  </InfoBox>

                  <InfoBox variant="formula" title="Step 2: Take partial derivatives and set to zero">
                    <p className="mb-2">
                      <strong>With respect to <Tex math="\beta_0" />:</strong>
                    </p>
                    <Tex
                      math={`\\frac{\\partial S}{\\partial \\beta_0} = -2\\sum_{i=1}^{n}(y_i - \\beta_0 - \\beta_1 x_i) = 0`}
                      display
                    />
                    <p className="mt-3 mb-2">
                      Divide by <Tex math="-2" /> and rearrange:
                    </p>
                    <Tex
                      math={`\\sum y_i = n\\beta_0 + \\beta_1 \\sum x_i \\quad \\Rightarrow \\quad \\bar{y} = \\beta_0 + \\beta_1 \\bar{x}`}
                      display
                    />
                    <p className="mt-3 mb-2">
                      <strong>With respect to <Tex math="\beta_1" />:</strong>
                    </p>
                    <Tex
                      math={`\\frac{\\partial S}{\\partial \\beta_1} = -2\\sum_{i=1}^{n} x_i(y_i - \\beta_0 - \\beta_1 x_i) = 0`}
                      display
                    />
                    <p className="mt-3">
                      Divide by <Tex math="-2" />:
                    </p>
                    <Tex
                      math={`\\sum x_i y_i = \\beta_0 \\sum x_i + \\beta_1 \\sum x_i^2`}
                      display
                    />
                  </InfoBox>

                  <InfoBox variant="formula" title="Step 3: Solve for the slope">
                    <p>
                      Substitute{" "}
                      <Tex math="\beta_0 = \bar{y} - \beta_1 \bar{x}" /> into
                      the second equation:
                    </p>
                    <Tex
                      math={`\\hat{\\beta}_1 = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2} = \\frac{S_{xy}}{S_{xx}}`}
                      display
                    />
                    <p className="mt-2">
                      And the intercept follows:
                    </p>
                    <Tex
                      math={`\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1 \\bar{x}`}
                      display
                    />
                  </InfoBox>

                  <InfoBox variant="dark" title="Intuition">
                    <p>
                      <Tex math="\hat{\beta}_1" /> is the ratio of{" "}
                      <em>how much x and y move together</em> (covariance) to{" "}
                      <em>how much x moves on its own</em> (variance). If
                      temperature and cups always rise together, the numerator is
                      large. If temperature barely varies, the denominator is
                      small and we get a steep slope.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 2: Normal Equations by Hand                        */}
          {/* ======================================================= */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" /> Computing the Slope by Hand
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Let&rsquo;s compute <Tex math="\hat{\beta}_1" /> for
                    predicting cups from temperature using our 6 days.
                    First, we need the means:
                  </p>

                  <Tex
                    math={`\\bar{x} = \\frac{60 + 65 + 70 + 75 + 80 + 85}{6} = \\frac{435}{6} = ${fmt(xbar_temp, 1)}`}
                    display
                  />
                  <Tex
                    math={`\\bar{y} = \\frac{120 + 150 + 160 + 200 + 210 + 250}{6} = \\frac{1090}{6} = ${fmt(ybar, 2)}`}
                    display
                  />

                  <InfoBox variant="formula" title="Deviations from the mean">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse font-mono">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-1 px-2 text-left text-slate-500 font-medium text-xs">Day</th>
                            <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                              <Tex math="x_i - \bar{x}" />
                            </th>
                            <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                              <Tex math="y_i - \bar{y}" />
                            </th>
                            <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                              <Tex math="(x_i-\bar{x})(y_i-\bar{y})" />
                            </th>
                            <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                              <Tex math="(x_i-\bar{x})^2" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {DATA.map((d) => {
                            const dx = d.temp - xbar_temp;
                            const dy = d.cups - ybar;
                            return (
                              <tr key={d.day} className="border-b border-slate-100">
                                <td className="py-1 px-2">{d.day}</td>
                                <td className="py-1 px-2 text-right">{fmt(dx, 1)}</td>
                                <td className="py-1 px-2 text-right">{fmt(dy, 2)}</td>
                                <td className="py-1 px-2 text-right">{fmt(dx * dy, 2)}</td>
                                <td className="py-1 px-2 text-right">{fmt(dx * dx, 2)}</td>
                              </tr>
                            );
                          })}
                          <tr className="border-t-2 border-slate-300 font-semibold">
                            <td className="py-1 px-2">Sum</td>
                            <td className="py-1 px-2 text-right">0</td>
                            <td className="py-1 px-2 text-right">0</td>
                            <td className="py-1 px-2 text-right text-emerald-700">
                              {fmt(
                                DATA.reduce(
                                  (s, d) =>
                                    s + (d.temp - xbar_temp) * (d.cups - ybar),
                                  0
                                ),
                                2
                              )}
                            </td>
                            <td className="py-1 px-2 text-right text-emerald-700">
                              {fmt(
                                DATA.reduce(
                                  (s, d) => s + (d.temp - xbar_temp) ** 2,
                                  0
                                ),
                                2
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </InfoBox>

                  {(() => {
                    const Sxy = DATA.reduce(
                      (s, d) => s + (d.temp - xbar_temp) * (d.cups - ybar),
                      0
                    );
                    const Sxx = DATA.reduce(
                      (s, d) => s + (d.temp - xbar_temp) ** 2,
                      0
                    );
                    const b1 = Sxy / Sxx;
                    const b0 = ybar - b1 * xbar_temp;
                    return (
                      <>
                        <Tex
                          math={`\\hat{\\beta}_1 = \\frac{S_{xy}}{S_{xx}} = \\frac{${fmt(Sxy, 2)}}{${fmt(Sxx, 2)}} = ${fmt(b1, 4)}`}
                          display
                        />
                        <Tex
                          math={`\\hat{\\beta}_0 = \\bar{y} - \\hat{\\beta}_1 \\bar{x} = ${fmt(ybar, 2)} - ${fmt(b1, 4)} \\times ${fmt(xbar_temp, 1)} = ${fmt(b0, 2)}`}
                          display
                        />

                        <InfoBox variant="success" title="Simple regression result">
                          <Tex
                            math={`\\widehat{\\text{Cups}} = ${fmt(b0, 2)} + ${fmt(b1, 2)} \\times \\text{Temp}`}
                            display
                          />
                          <p className="mt-2 text-sm">
                            Each additional degree Fahrenheit is associated with
                            about <strong>{fmt(b1, 1)} more cups</strong> sold.
                          </p>
                        </InfoBox>

                        <div className="grid gap-3 md:grid-cols-3">
                          <StatCard
                            label="Sxy"
                            value={fmt(Sxy, 1)}
                            formula="\\sum(x_i-\\bar{x})(y_i-\\bar{y})"
                          />
                          <StatCard
                            label="Sxx"
                            value={fmt(Sxx, 1)}
                            formula="\\sum(x_i-\\bar{x})^2"
                          />
                          <StatCard
                            label="Slope"
                            value={fmt(b1, 4)}
                            formula="\\hat{\\beta}_1 = S_{xy}/S_{xx}"
                          />
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 3: Matrix Form                                     */}
          {/* ======================================================= */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Grid3X3 className="h-4 w-4" /> Matrix Form of OLS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    With multiple predictors, individual sums get unwieldy.
                    Matrix notation keeps things compact. For our coffee shop
                    with temperature <em>and</em> ad spend:
                  </p>

                  <Tex
                    math={`\\mathbf{y} = \\mathbf{X}\\boldsymbol{\\beta} + \\boldsymbol{\\varepsilon}`}
                    display
                  />

                  <InfoBox variant="formula" title="Defining the matrices">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          <Tex math="\mathbf{y}" /> (6 &times; 1)
                        </p>
                        <Tex
                          math={`\\begin{bmatrix} 120 \\\\ 150 \\\\ 160 \\\\ 200 \\\\ 210 \\\\ 250 \\end{bmatrix}`}
                          display
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          <Tex math="\mathbf{X}" /> (6 &times; 3)
                        </p>
                        <Tex
                          math={`\\begin{bmatrix} 1 & 60 & 10 \\\\ 1 & 65 & 20 \\\\ 1 & 70 & 15 \\\\ 1 & 75 & 25 \\\\ 1 & 80 & 30 \\\\ 1 & 85 & 35 \\end{bmatrix}`}
                          display
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">
                          <Tex math="\boldsymbol{\beta}" /> (3 &times; 1)
                        </p>
                        <Tex
                          math={`\\begin{bmatrix} \\beta_0 \\\\ \\beta_1 \\\\ \\beta_2 \\end{bmatrix}`}
                          display
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      The first column of <strong>X</strong> is all 1&rsquo;s
                      &mdash; it captures the intercept.
                    </p>
                  </InfoBox>

                  <InfoBox variant="formula" title="Deriving the OLS estimator">
                    <p className="mb-2">
                      Write the sum of squared residuals in matrix form:
                    </p>
                    <Tex
                      math={`S(\\boldsymbol{\\beta}) = (\\mathbf{y} - \\mathbf{X}\\boldsymbol{\\beta})^\\top(\\mathbf{y} - \\mathbf{X}\\boldsymbol{\\beta})`}
                      display
                    />
                    <p className="mt-3 mb-2">Expand:</p>
                    <Tex
                      math={`S = \\mathbf{y}^\\top\\mathbf{y} - 2\\boldsymbol{\\beta}^\\top\\mathbf{X}^\\top\\mathbf{y} + \\boldsymbol{\\beta}^\\top\\mathbf{X}^\\top\\mathbf{X}\\boldsymbol{\\beta}`}
                      display
                    />
                    <p className="mt-3 mb-2">
                      Take the gradient and set to zero:
                    </p>
                    <Tex
                      math={`\\frac{\\partial S}{\\partial \\boldsymbol{\\beta}} = -2\\mathbf{X}^\\top\\mathbf{y} + 2\\mathbf{X}^\\top\\mathbf{X}\\boldsymbol{\\beta} = \\mathbf{0}`}
                      display
                    />
                    <p className="mt-3 mb-2">
                      Solve for <Tex math="\boldsymbol{\beta}" />:
                    </p>
                    <Tex
                      math={`\\mathbf{X}^\\top\\mathbf{X}\\hat{\\boldsymbol{\\beta}} = \\mathbf{X}^\\top\\mathbf{y} \\quad \\Rightarrow \\quad \\boxed{\\hat{\\boldsymbol{\\beta}} = (\\mathbf{X}^\\top\\mathbf{X})^{-1}\\mathbf{X}^\\top\\mathbf{y}}`}
                      display
                    />
                  </InfoBox>

                  <InfoBox variant="dark" title="Why this formula works">
                    <p>
                      <Tex math="\mathbf{X}^\top\mathbf{X}" /> is a{" "}
                      <em>k &times; k</em> matrix of cross-products &mdash; it
                      summarizes how the predictors relate to each other.{" "}
                      <Tex math="\mathbf{X}^\top\mathbf{y}" /> summarizes how
                      each predictor relates to the outcome. Inverting{" "}
                      <Tex math="\mathbf{X}^\top\mathbf{X}" /> &ldquo;undo&rdquo;s
                      the collinearity among predictors, isolating each one&rsquo;s
                      contribution.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 4: Interactive Matrix Calculator                    */}
          {/* ======================================================= */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Grid3X3 className="h-4 w-4" /> Step-by-Step Matrix Computation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Walk through each matrix multiplication using Bean &
                    Brew&rsquo;s data. Use the buttons to advance.
                  </p>

                  <div className="flex gap-2 flex-wrap">
                    {[
                      "X and y",
                      "X\u1d40X",
                      "X\u1d40y",
                      "(X\u1d40X)\u207b\u00b9",
                      "\u03b2\u0302 = (X\u1d40X)\u207b\u00b9 X\u1d40y",
                    ].map((label, i) => (
                      <button
                        key={i}
                        onClick={() => setMatrixStep(i)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                          matrixStep === i
                            ? "bg-slate-800 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {matrixStep === 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <MatrixDisplay
                        label="X (6 × 3) — design matrix"
                        rows={OLS.X}
                      />
                      <MatrixDisplay
                        label="y (6 × 1) — cups sold"
                        rows={OLS.y.map((v) => [v])}
                      />
                    </div>
                  )}

                  {matrixStep === 1 && (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Multiply <Tex math="\mathbf{X}^\top" /> (3&times;6) by{" "}
                        <Tex math="\mathbf{X}" /> (6&times;3) to get a 3&times;3
                        matrix:
                      </p>
                      <Tex
                        math={`(\\mathbf{X}^\\top\\mathbf{X})_{jk} = \\sum_{i=1}^{6} X_{ij} \\cdot X_{ik}`}
                        display
                      />
                      <p className="text-sm">
                        For example, the (1,1) entry:{" "}
                        <Tex
                          math={`\\sum 1 \\cdot 1 = ${OLS.XtX[0][0]}`}
                        />
                        . The (2,2) entry:{" "}
                        <Tex
                          math={`\\sum x_{1i}^2 = 60^2 + 65^2 + \\cdots + 85^2 = ${OLS.XtX[1][1]}`}
                        />
                        .
                      </p>
                      <MatrixDisplay
                        label="X\u1d40X (3 × 3)"
                        rows={OLS.XtX}
                      />
                    </div>
                  )}

                  {matrixStep === 2 && (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Multiply <Tex math="\mathbf{X}^\top" /> (3&times;6) by{" "}
                        <Tex math="\mathbf{y}" /> (6&times;1):
                      </p>
                      <Tex
                        math={`(\\mathbf{X}^\\top\\mathbf{y})_j = \\sum_{i=1}^{6} X_{ij} \\cdot y_i`}
                        display
                      />
                      <p className="text-sm">
                        First entry: <Tex math={`\\sum y_i = ${OLS.Xty[0]}`} />.
                        Second: <Tex math={`\\sum x_{1i} y_i = 60 \\times 120 + 65 \\times 150 + \\cdots = ${OLS.Xty[1]}`} />.
                      </p>
                      <MatrixDisplay
                        label="X\u1d40y (3 × 1)"
                        rows={OLS.Xty.map((v) => [v])}
                      />
                    </div>
                  )}

                  {matrixStep === 3 && (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Invert the 3&times;3 matrix{" "}
                        <Tex math="\mathbf{X}^\top\mathbf{X}" /> using cofactors
                        (or Gauss-Jordan elimination). Each entry:
                      </p>
                      <MatrixDisplay
                        label="(X\u1d40X)\u207b\u00b9 (3 × 3)"
                        rows={OLS.inv}
                      />
                      <p className="text-xs text-slate-500">
                        Verify:{" "}
                        <Tex math="(\mathbf{X}^\top\mathbf{X})^{-1}(\mathbf{X}^\top\mathbf{X}) = \mathbf{I}" />
                        . The diagonal of this inverse will later give us
                        standard errors.
                      </p>
                    </div>
                  )}

                  {matrixStep === 4 && (
                    <div className="space-y-3">
                      <p className="text-sm">
                        Finally, multiply{" "}
                        <Tex math="(\mathbf{X}^\top\mathbf{X})^{-1}" /> by{" "}
                        <Tex math="\mathbf{X}^\top\mathbf{y}" />:
                      </p>
                      <Tex
                        math={`\\hat{\\boldsymbol{\\beta}} = \\begin{bmatrix} ${fmt(OLS.beta[0], 4)} \\\\ ${fmt(OLS.beta[1], 4)} \\\\ ${fmt(OLS.beta[2], 4)} \\end{bmatrix}`}
                        display
                      />

                      <InfoBox variant="success" title="Multiple regression result">
                        <Tex
                          math={`\\widehat{\\text{Cups}} = ${fmt(OLS.beta[0], 2)} + ${fmt(OLS.beta[1], 2)} \\times \\text{Temp} + ${fmt(OLS.beta[2], 2)} \\times \\text{Ad}`}
                          display
                        />
                        <p className="mt-2 text-sm">
                          Holding ad spend constant, each extra degree sells{" "}
                          <strong>{fmt(OLS.beta[1], 2)} more cups</strong>.
                          Holding temperature constant, each extra dollar of ads
                          sells <strong>{fmt(OLS.beta[2], 2)} more cups</strong>.
                        </p>
                      </InfoBox>

                      <div className="grid gap-3 md:grid-cols-3">
                        <StatCard
                          label="Intercept"
                          value={fmt(OLS.beta[0], 2)}
                          formula="\hat{\beta}_0"
                        />
                        <StatCard
                          label="Temp coeff"
                          value={fmt(OLS.beta[1], 4)}
                          formula="\hat{\beta}_1"
                        />
                        <StatCard
                          label="Ad coeff"
                          value={fmt(OLS.beta[2], 4)}
                          formula="\hat{\beta}_2"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-3 text-slate-700 pt-6">
                  <p className="text-sm font-medium text-slate-500">Fitted values & residuals</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-1 px-2 text-left text-slate-500 font-medium text-xs">Day</th>
                          <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                            <Tex math="y_i" />
                          </th>
                          <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                            <Tex math="\hat{y}_i" />
                          </th>
                          <th className="py-1 px-2 text-right text-slate-500 font-medium text-xs">
                            <Tex math="e_i = y_i - \hat{y}_i" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {DATA.map((d, i) => (
                          <tr key={d.day} className="border-b border-slate-100">
                            <td className="py-1 px-2">{d.day}</td>
                            <td className="py-1 px-2 text-right">{d.cups}</td>
                            <td className="py-1 px-2 text-right text-emerald-700">
                              {fmt(OLS.yhat[i], 2)}
                            </td>
                            <td className="py-1 px-2 text-right text-amber-600">
                              {fmt(OLS.resid[i], 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500">
                    Check: <Tex math={`\\sum e_i = ${fmt(OLS.resid.reduce((s, e) => s + e, 0), 6)}`} />{" "}
                    &asymp; 0. OLS residuals always sum to zero when there is an intercept.
                  </p>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 5: Geometric Intuition                             */}
          {/* ======================================================= */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Eye className="h-4 w-4" /> OLS as Projection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-4">
                      <p>
                        Think of <Tex math="\mathbf{y}" /> as a vector in{" "}
                        <Tex math="\mathbb{R}^n" /> (n = 6 dimensional space).
                        The columns of <Tex math="\mathbf{X}" /> span a{" "}
                        <strong>subspace</strong> (a flat plane through the
                        origin). Every linear combination{" "}
                        <Tex math="\mathbf{X}\boldsymbol{\beta}" /> lies on this
                        plane.
                      </p>
                      <p>
                        OLS finds the point on the plane{" "}
                        <strong>closest to y</strong>. That&rsquo;s{" "}
                        <Tex math="\hat{\mathbf{y}} = \mathbf{X}\hat{\boldsymbol{\beta}}" />
                        &mdash; the <em>orthogonal projection</em> of{" "}
                        <Tex math="\mathbf{y}" /> onto the column space of{" "}
                        <Tex math="\mathbf{X}" />.
                      </p>

                      <InfoBox variant="formula" title="The orthogonality condition">
                        <p>
                          The residual vector{" "}
                          <Tex math="\mathbf{e} = \mathbf{y} - \hat{\mathbf{y}}" />{" "}
                          is perpendicular to every column of{" "}
                          <Tex math="\mathbf{X}" />:
                        </p>
                        <Tex
                          math={`\\mathbf{X}^\\top \\mathbf{e} = \\mathbf{X}^\\top(\\mathbf{y} - \\mathbf{X}\\hat{\\boldsymbol{\\beta}}) = \\mathbf{0}`}
                          display
                        />
                        <p className="mt-2 text-sm text-slate-500">
                          This is the same normal equation we derived from calculus!
                          The algebra and the geometry give the same answer.
                        </p>
                      </InfoBox>
                    </div>
                    <div className="flex items-center justify-center">
                      <ProjectionChart />
                    </div>
                  </div>

                  <InfoBox variant="formula" title="The hat matrix">
                    <p>
                      The <strong>hat matrix</strong>{" "}
                      <Tex math="\mathbf{H} = \mathbf{X}(\mathbf{X}^\top\mathbf{X})^{-1}\mathbf{X}^\top" />{" "}
                      is the projection matrix. It &ldquo;puts the hat on
                      y&rdquo;:
                    </p>
                    <Tex
                      math={`\\hat{\\mathbf{y}} = \\mathbf{H}\\mathbf{y}`}
                      display
                    />
                    <p className="mt-2">Key properties:</p>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                      <li>
                        <Tex math="\mathbf{H}" /> is symmetric:{" "}
                        <Tex math="\mathbf{H}^\top = \mathbf{H}" />
                      </li>
                      <li>
                        <Tex math="\mathbf{H}" /> is idempotent:{" "}
                        <Tex math="\mathbf{H}^2 = \mathbf{H}" /> (projecting twice
                        = projecting once)
                      </li>
                      <li>
                        Residual maker:{" "}
                        <Tex math="\mathbf{M} = \mathbf{I} - \mathbf{H}" />,
                        so <Tex math="\mathbf{e} = \mathbf{M}\mathbf{y}" />
                      </li>
                    </ul>
                  </InfoBox>

                  <InfoBox variant="dark" title="Verify orthogonality with our data">
                    <p>
                      <Tex math="\mathbf{X}^\top\mathbf{e}" /> should equal zero.
                      Let&rsquo;s check the first entry:{" "}
                      <Tex
                        math={`\\sum_{i=1}^{6} 1 \\cdot e_i = ${fmt(
                          OLS.resid.reduce((s, e) => s + e, 0),
                          6
                        )} \\approx 0`}
                      />
                      . The residuals are orthogonal to the intercept column (their
                      sum is zero). The same holds for the temperature and ad
                      columns:{" "}
                      <Tex
                        math={`\\sum x_{1i} e_i = ${fmt(
                          DATA.reduce(
                            (s, d, i) => s + d.temp * OLS.resid[i],
                            0
                          ),
                          6
                        )}`}
                      />
                      .
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 6: Properties of OLS                               */}
          {/* ======================================================= */}
          {step === 6 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sigma className="h-4 w-4" /> Properties of the OLS Estimator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="formula" title="1. Unbiasedness">
                    <p>
                      If the true model is{" "}
                      <Tex math="\mathbf{y} = \mathbf{X}\boldsymbol{\beta} + \boldsymbol{\varepsilon}" />{" "}
                      with <Tex math="E[\boldsymbol{\varepsilon} | \mathbf{X}] = \mathbf{0}" />,
                      then:
                    </p>
                    <Tex
                      math={`E[\\hat{\\boldsymbol{\\beta}}] = E[(\\mathbf{X}^\\top\\mathbf{X})^{-1}\\mathbf{X}^\\top\\mathbf{y}]`}
                      display
                    />
                    <Tex
                      math={`= (\\mathbf{X}^\\top\\mathbf{X})^{-1}\\mathbf{X}^\\top E[\\mathbf{X}\\boldsymbol{\\beta} + \\boldsymbol{\\varepsilon}]`}
                      display
                    />
                    <Tex
                      math={`= (\\mathbf{X}^\\top\\mathbf{X})^{-1}\\mathbf{X}^\\top\\mathbf{X}\\boldsymbol{\\beta} = \\boldsymbol{\\beta}`}
                      display
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      On average, OLS hits the true parameter. No systematic
                      over- or under-estimation.
                    </p>
                  </InfoBox>

                  <InfoBox variant="formula" title="2. Variance of the estimator">
                    <p>
                      If errors are homoskedastic with variance{" "}
                      <Tex math="\sigma^2" />:
                    </p>
                    <Tex
                      math={`\\text{Var}(\\hat{\\boldsymbol{\\beta}} | \\mathbf{X}) = \\sigma^2 (\\mathbf{X}^\\top\\mathbf{X})^{-1}`}
                      display
                    />
                    <p className="mt-2">
                      We estimate <Tex math="\sigma^2" /> with:
                    </p>
                    <Tex
                      math={`\\hat{\\sigma}^2 = \\frac{\\text{SSR}}{n - k} = \\frac{${fmt(OLS.SSR, 2)}}{${OLS.n} - ${OLS.k}} = ${fmt(OLS.sigma2, 2)}`}
                      display
                    />
                    <p className="mt-2">Standard errors for Bean & Brew:</p>
                    <div className="grid gap-3 md:grid-cols-3 mt-2">
                      <StatCard
                        label="SE(intercept)"
                        value={fmt(OLS.se[0], 2)}
                        formula={`\\sqrt{\\hat{\\sigma}^2 \\cdot [(\\mathbf{X}^\\top\\mathbf{X})^{-1}]_{00}}`}
                      />
                      <StatCard
                        label="SE(temp)"
                        value={fmt(OLS.se[1], 4)}
                        formula={`\\sqrt{\\hat{\\sigma}^2 \\cdot [(\\mathbf{X}^\\top\\mathbf{X})^{-1}]_{11}}`}
                      />
                      <StatCard
                        label="SE(ad)"
                        value={fmt(OLS.se[2], 4)}
                        formula={`\\sqrt{\\hat{\\sigma}^2 \\cdot [(\\mathbf{X}^\\top\\mathbf{X})^{-1}]_{22}}`}
                      />
                    </div>
                  </InfoBox>

                  <InfoBox variant="dark" title="3. Gauss-Markov Theorem">
                    <p>
                      Under the classical assumptions (linear model, strict
                      exogeneity, homoskedasticity, no perfect collinearity), OLS
                      is the{" "}
                      <strong>
                        Best Linear Unbiased Estimator (BLUE)
                      </strong>
                      .
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      <li>
                        <strong>Best</strong>: lowest variance among all linear
                        unbiased estimators
                      </li>
                      <li>
                        <strong>Linear</strong>: <Tex math="\hat{\boldsymbol{\beta}}" /> is a
                        linear function of <Tex math="\mathbf{y}" />
                      </li>
                      <li>
                        <strong>Unbiased</strong>:{" "}
                        <Tex math="E[\hat{\boldsymbol{\beta}}] = \boldsymbol{\beta}" />
                      </li>
                    </ul>
                    <p className="mt-2 text-sm">
                      If any assumption fails (e.g., heteroskedasticity), OLS is
                      still unbiased but no longer &ldquo;best&rdquo; &mdash;
                      other estimators (GLS, WLS) can have lower variance.
                    </p>
                  </InfoBox>

                  <InfoBox variant="warning" title="Classical assumptions checklist">
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      <li>Linearity: <Tex math="\mathbf{y} = \mathbf{X}\boldsymbol{\beta} + \boldsymbol{\varepsilon}" /></li>
                      <li>Strict exogeneity: <Tex math="E[\boldsymbol{\varepsilon} | \mathbf{X}] = \mathbf{0}" /></li>
                      <li>No perfect collinearity: <Tex math="\text{rank}(\mathbf{X}) = k" /></li>
                      <li>Homoskedasticity: <Tex math="\text{Var}(\varepsilon_i | \mathbf{X}) = \sigma^2" /> for all i</li>
                      <li>No autocorrelation: <Tex math="\text{Cov}(\varepsilon_i, \varepsilon_j | \mathbf{X}) = 0" /> for i &ne; j</li>
                    </ol>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 7: Residuals & R²                                  */}
          {/* ======================================================= */}
          {step === 7 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" /> Residuals & Goodness of Fit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="formula" title="Decomposing total variation">
                    <Tex
                      math={`\\underbrace{\\sum(y_i - \\bar{y})^2}_{\\text{SST}} = \\underbrace{\\sum(\\hat{y}_i - \\bar{y})^2}_{\\text{SSE (explained)}} + \\underbrace{\\sum(y_i - \\hat{y}_i)^2}_{\\text{SSR (residual)}}`}
                      display
                    />
                    <p className="mt-2">Plugging in Bean & Brew&rsquo;s numbers:</p>
                    <Tex
                      math={`${fmt(OLS.SST, 2)} = ${fmt(OLS.SST - OLS.SSR, 2)} + ${fmt(OLS.SSR, 2)}`}
                      display
                    />
                  </InfoBox>

                  <InfoBox variant="formula" title="R\u00B2 — coefficient of determination">
                    <Tex
                      math={`R^2 = 1 - \\frac{\\text{SSR}}{\\text{SST}} = 1 - \\frac{${fmt(OLS.SSR, 2)}}{${fmt(OLS.SST, 2)}} = ${fmt(OLS.R2, 4)}`}
                      display
                    />
                    <p className="mt-2 text-sm text-slate-500">
                      Temperature and ad spend explain{" "}
                      <strong>{fmt(OLS.R2 * 100, 1)}%</strong> of the variation
                      in cups sold.
                    </p>
                  </InfoBox>

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="SST"
                      value={fmt(OLS.SST, 2)}
                      formula="\\sum(y_i - \\bar{y})^2"
                    />
                    <StatCard
                      label="SSR"
                      value={fmt(OLS.SSR, 2)}
                      formula="\\sum e_i^2"
                    />
                    <StatCard
                      label="R\u00B2"
                      value={fmt(OLS.R2, 4)}
                      formula="1 - \\text{SSR}/\\text{SST}"
                    />
                  </div>

                  <InfoBox variant="dark" title="What residuals tell you">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>
                        <strong>Pattern against fitted values</strong>: if
                        residuals fan out, suspect heteroskedasticity
                      </li>
                      <li>
                        <strong>Non-random pattern</strong>: may indicate a
                        missing non-linear term
                      </li>
                      <li>
                        <strong>Large outlier</strong>: high leverage point may be
                        pulling the fit
                      </li>
                    </ul>
                  </InfoBox>

                  <InfoBox variant="warning" title="R\u00B2 caveats">
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>R&sup2; always increases when you add a predictor, even a useless one</li>
                      <li>
                        Use <strong>adjusted R&sup2;</strong>:{" "}
                        <Tex math={`\\bar{R}^2 = 1 - \\frac{\\text{SSR}/(n-k)}{\\text{SST}/(n-1)} = ${fmt(1 - (OLS.SSR / (OLS.n - OLS.k)) / (OLS.SST / (OLS.n - 1)), 4)}`} />
                      </li>
                      <li>A high R&sup2; does not imply causation</li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 8: Interactive Playground                           */}
          {/* ======================================================= */}
          {step === 8 && (
            <StepContent className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" /> Interactive Playground
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Explore how sample size and noise affect the OLS fit.
                    The true model is{" "}
                    <Tex math="\text{Cups} = -20 + 3 \times \text{Temp} + \varepsilon" />.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <LabeledSlider
                        label="Sample size"
                        value={simN}
                        onValueChange={setSimN}
                        min={10}
                        max={200}
                        step={5}
                        displayValue={`n = ${simN[0]}`}
                      />
                      <LabeledSlider
                        label="Noise (SD)"
                        value={simNoise}
                        onValueChange={setSimNoise}
                        min={5}
                        max={60}
                        step={1}
                        displayValue={`\u03C3 = ${simNoise[0]}`}
                      />

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showResid}
                          onChange={(e) => setShowResid(e.target.checked)}
                          className="rounded"
                        />
                        Show residuals
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="True slope"
                          value="3.00"
                          formula="\beta_1 = 3"
                        />
                        <StatCard
                          label="Estimated slope"
                          value={fmt(sim.ols.b1, 2)}
                          formula="\hat{\beta}_1"
                        />
                        <StatCard
                          label="True intercept"
                          value="-20.00"
                          formula="\beta_0 = -20"
                        />
                        <StatCard
                          label="Estimated intercept"
                          value={fmt(sim.ols.b0, 2)}
                          formula="\hat{\beta}_0"
                        />
                      </div>
                      <StatCard
                        label="R\u00B2"
                        value={fmt(sim.ols.R2, 4)}
                        formula="1 - \\text{SSR}/\\text{SST}"
                      />

                      <InfoBox variant="muted">
                        <p className="text-sm">
                          <strong>Try this:</strong> Set noise low (5) and watch
                          the estimates nail the true values. Crank noise to 60
                          and watch them wobble. Then increase n &mdash; more data
                          stabilizes the estimate even under heavy noise.
                        </p>
                      </InfoBox>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400">
                        Cups sold vs. Temperature
                      </p>
                      <ScatterChart
                        rows={sim.rows}
                        ols={sim.ols}
                        showResiduals={showResid}
                      />
                      <p className="text-[10px] text-slate-400">
                        Residuals vs. Fitted values
                      </p>
                      <ResidualChart rows={sim.rows} ols={sim.ols} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ======================================================= */}
          {/*  STEP 9: Quiz                                            */}
          {/* ======================================================= */}
          {step === 9 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question="What does the OLS estimator minimize?"
                options={[
                  "Sum of absolute residuals",
                  "Sum of squared residuals",
                  "Maximum residual",
                  "Sum of residuals",
                ]}
                correctIndex={1}
                explanation="OLS minimizes the sum of squared residuals (SSR). Minimizing absolute residuals gives median regression (LAD), and the sum of raw residuals is always zero with an intercept."
              />
              <QuizCard
                question="Why does X\u1d40e = 0 hold?"
                options={[
                  "It's a coincidence of this dataset",
                  "It's the first-order condition (normal equation)",
                  "Only when errors are normally distributed",
                  "Only in simple regression",
                ]}
                correctIndex={1}
                explanation="X\u1d40e = 0 is exactly the normal equation: the residuals are orthogonal to every column of X. This follows from the first-order condition of the minimization and holds for any OLS regression with an intercept."
              />
              <QuizCard
                question="What does the Gauss-Markov theorem guarantee about OLS?"
                options={[
                  "OLS is always consistent",
                  "OLS is the best among ALL estimators",
                  "OLS has the lowest variance among linear unbiased estimators",
                  "OLS residuals are normally distributed",
                ]}
                correctIndex={2}
                explanation="Gauss-Markov says OLS is BLUE: the Best (lowest variance) Linear Unbiased Estimator. It does NOT say OLS is best among all possible estimators — biased estimators like ridge regression can have lower MSE."
              />
              <QuizCard
                question="If you add a completely random predictor to a regression, what happens to R\u00B2?"
                options={[
                  "It decreases",
                  "It stays exactly the same",
                  "It increases (or stays the same)",
                  "It could go either way",
                ]}
                correctIndex={2}
                explanation="R\u00B2 can never decrease when you add a predictor — even a random one. That's why we use adjusted R\u00B2, which penalizes extra predictors that don't improve the fit enough."
              />
              <QuizCard
                question="In the geometric view, what is \u0177 (y-hat)?"
                options={[
                  "The residual vector",
                  "The projection of y onto the column space of X",
                  "The unit vector in the direction of y",
                  "A point perpendicular to X",
                ]}
                correctIndex={1}
                explanation="\u0177 = Hy is the orthogonal projection of y onto Col(X). The residual e = y - \u0177 is the component of y that can't be explained by any linear combination of the columns of X."
              />
              <QuizCard
                question="Why do we divide SSR by (n - k) instead of n when estimating \u03C3\u00B2?"
                options={[
                  "To make the formula simpler",
                  "Because we lose k degrees of freedom estimating \u03B2",
                  "It doesn't matter for large n",
                  "Because the residuals have mean zero",
                ]}
                correctIndex={1}
                explanation="Estimating k parameters in \u03B2 uses up k degrees of freedom. Dividing by (n - k) corrects for this, making \u03C3\u0302\u00B2 an unbiased estimator of \u03C3\u00B2. Dividing by n would systematically underestimate the true variance."
              />
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
