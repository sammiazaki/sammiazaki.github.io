import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  BarChart3,
  TrendingUp,
  Layers,
  Shuffle,
  Target,
  Sigma,
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

/* ------------------------------------------------------------------ */
/*  Math helpers                                                       */
/* ------------------------------------------------------------------ */

function fmt(x, d = 3) {
  return Number(x).toFixed(d);
}

function gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function binomCoeff(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

function normalPDF(x, mu, sigma) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function binomialPMF(k, n, p) {
  return binomCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function poissonPMF(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function uniformPDF(x, a, b) {
  return x >= a && x <= b ? 1 / (b - a) : 0;
}

function exponentialPDF(x, lambda) {
  return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
}

function betaPDF(x, alpha, beta) {
  if (x <= 0 || x >= 1) return 0;
  const B = (gamma(alpha) * gamma(beta)) / gamma(alpha + beta);
  return (Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1)) / B;
}

/* ------------------------------------------------------------------ */
/*  SVG Chart components                                               */
/* ------------------------------------------------------------------ */

const W = 480;
const H = 200;
const PAD = { top: 10, right: 20, bottom: 30, left: 45 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function ContinuousChart({ xs, ys, color = "#1e293b", label, yMax: yMaxProp }) {
  const yMax = yMaxProp ?? Math.max(...ys, 0.01) * 1.15;
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const xRange = xMax - xMin || 1;

  const toX = (v) => PAD.left + ((v - xMin) / xRange) * PW;
  const toY = (v) => PAD.top + PH - (v / yMax) * PH;

  const pathD = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${toX(x).toFixed(2)},${toY(ys[i]).toFixed(2)}`)
    .join(" ");

  const areaD =
    pathD +
    ` L${toX(xMax).toFixed(2)},${toY(0).toFixed(2)} L${toX(xMin).toFixed(2)},${toY(0).toFixed(2)} Z`;

  const nXTicks = 6;
  const nYTicks = 4;
  const xTicks = Array.from({ length: nXTicks }, (_, i) => xMin + (i / (nXTicks - 1)) * xRange);
  const yTicks = Array.from({ length: nYTicks }, (_, i) => (i / (nYTicks - 1)) * yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} x2={PAD.left + PW} y1={toY(t)} y2={toY(t)} stroke="#e2e8f0" strokeWidth={0.5} />
      ))}
      <path d={areaD} fill={color} opacity={0.08} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      <line x1={PAD.left} x2={PAD.left + PW} y1={PAD.top + PH} y2={PAD.top + PH} stroke="#94a3b8" strokeWidth={1} />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PH} stroke="#94a3b8" strokeWidth={1} />
      {xTicks.map((t, i) => (
        <text key={i} x={toX(t)} y={PAD.top + PH + 16} textAnchor="middle" fill="#64748b" fontSize={10}>
          {Math.abs(t) < 1000 ? fmt(t, t % 1 === 0 ? 0 : 1) : t.toExponential(0)}
        </text>
      ))}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 6} y={toY(t) + 3} textAnchor="end" fill="#64748b" fontSize={10}>
          {fmt(t, 2)}
        </text>
      ))}
      {label && (
        <text x={PAD.left + 6} y={PAD.top + 14} fill={color} fontSize={11} fontWeight={600}>
          {label}
        </text>
      )}
    </svg>
  );
}

function DiscreteChart({ ks, ps, color = "#1e293b", label, yMax: yMaxProp }) {
  const yMax = yMaxProp ?? Math.max(...ps, 0.01) * 1.15;
  const kMin = ks[0];
  const kMax = ks[ks.length - 1];
  const kRange = kMax - kMin || 1;
  const barW = Math.min(PW / ks.length - 2, 18);

  const toX = (k) => PAD.left + ((k - kMin) / kRange) * PW;
  const toY = (v) => PAD.top + PH - (v / yMax) * PH;

  const step = ks.length > 20 ? Math.ceil(ks.length / 10) : 1;
  const nYTicks = 4;
  const yTicks = Array.from({ length: nYTicks }, (_, i) => (i / (nYTicks - 1)) * yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} x2={PAD.left + PW} y1={toY(t)} y2={toY(t)} stroke="#e2e8f0" strokeWidth={0.5} />
      ))}
      {ks.map((k, i) => (
        <rect key={k} x={toX(k) - barW / 2} y={toY(ps[i])} width={barW} height={toY(0) - toY(ps[i])} fill={color} opacity={0.75} rx={2} />
      ))}
      <line x1={PAD.left} x2={PAD.left + PW} y1={PAD.top + PH} y2={PAD.top + PH} stroke="#94a3b8" strokeWidth={1} />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PH} stroke="#94a3b8" strokeWidth={1} />
      {ks.map(
        (k, i) =>
          i % step === 0 && (
            <text key={k} x={toX(k)} y={PAD.top + PH + 16} textAnchor="middle" fill="#64748b" fontSize={10}>
              {k}
            </text>
          ),
      )}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 6} y={toY(t) + 3} textAnchor="end" fill="#64748b" fontSize={10}>
          {fmt(t, 2)}
        </text>
      ))}
      {label && (
        <text x={PAD.left + 6} y={PAD.top + 14} fill={color} fontSize={11} fontWeight={600}>
          {label}
        </text>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  CLT Simulation                                                     */
/* ------------------------------------------------------------------ */

function useCLTSamples(sourceType, n, nSamples) {
  return useMemo(() => {
    function drawOne() {
      switch (sourceType) {
        case "uniform":
          return Math.random();
        case "exponential":
          return -Math.log(1 - Math.random());
        case "bimodal":
          return Math.random() < 0.5
            ? 0.3 + 0.08 * (Math.random() + Math.random() + Math.random() - 1.5)
            : 0.7 + 0.08 * (Math.random() + Math.random() + Math.random() - 1.5);
        default:
          return Math.random();
      }
    }
    const means = [];
    for (let s = 0; s < nSamples; s++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += drawOne();
      means.push(sum / n);
    }
    return means;
  }, [sourceType, n, nSamples]);
}

function HistogramChart({ data, bins = 30, color = "#1e293b", label }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const binWidth = range / bins;
  const counts = new Array(bins).fill(0);
  for (const v of data) {
    const i = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[i]++;
  }
  const maxCount = Math.max(...counts);
  const yMax = maxCount * 1.15;
  const barW = PW / bins;

  const nYTicks = 4;
  const yTicks = Array.from({ length: nYTicks }, (_, i) => Math.round((i / (nYTicks - 1)) * maxCount));
  const nXTicks = 6;
  const xTicks = Array.from({ length: nXTicks }, (_, i) => min + (i / (nXTicks - 1)) * range);

  const toX = (v) => PAD.left + ((v - min) / range) * PW;
  const toY = (v) => PAD.top + PH - (v / yMax) * PH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {yTicks.map((t, i) => (
        <line key={i} x1={PAD.left} x2={PAD.left + PW} y1={toY(t)} y2={toY(t)} stroke="#e2e8f0" strokeWidth={0.5} />
      ))}
      {counts.map((c, i) => (
        <rect key={i} x={PAD.left + i * barW + 0.5} y={toY(c)} width={barW - 1} height={toY(0) - toY(c)} fill={color} opacity={0.65} />
      ))}
      <line x1={PAD.left} x2={PAD.left + PW} y1={PAD.top + PH} y2={PAD.top + PH} stroke="#94a3b8" strokeWidth={1} />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PH} stroke="#94a3b8" strokeWidth={1} />
      {xTicks.map((t, i) => (
        <text key={i} x={toX(t)} y={PAD.top + PH + 16} textAnchor="middle" fill="#64748b" fontSize={10}>
          {fmt(t, 2)}
        </text>
      ))}
      {yTicks.map((t, i) => (
        <text key={i} x={PAD.left - 6} y={toY(t) + 3} textAnchor="end" fill="#64748b" fontSize={10}>
          {t}
        </text>
      ))}
      {label && (
        <text x={PAD.left + 6} y={PAD.top + 14} fill={color} fontSize={11} fontWeight={600}>
          {label}
        </text>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Tutorial                                                           */
/* ------------------------------------------------------------------ */

const LESSONS = [
  "What is a distribution?",
  "Discrete distributions",
  "Continuous distributions",
  "Explore: shape playground",
  "The Central Limit Theorem",
  "The Beta distribution",
  "Quick checks",
];

export default function DistributionsTutorial() {
  // Discrete controls
  const [binN, setBinN] = useState([10]);
  const [binP, setBinP] = useState([0.5]);
  const [poisLam, setPoisLam] = useState([4]);

  // Normal controls
  const [normMu, setNormMu] = useState([0]);
  const [normSig, setNormSig] = useState([1]);

  // Exponential controls
  const [expLam, setExpLam] = useState([1]);

  // Uniform controls
  const [uniA, setUniA] = useState([0]);
  const [uniB, setUniB] = useState([5]);

  // Shape playground
  const [shapeDist, setShapeDist] = useState("normal");
  const [shapeP1, setShapeP1] = useState([0]);
  const [shapeP2, setShapeP2] = useState([1]);

  // CLT controls
  const [cltSource, setCltSource] = useState("uniform");
  const [cltN, setCltN] = useState([2]);
  const [cltSeed, setCltSeed] = useState(0);

  // Beta controls
  const [betaA, setBetaA] = useState([2]);
  const [betaB, setBetaB] = useState([5]);

  /* ---------- derived: read scalar values once ---------- */

  const nBin = binN[0];
  const pBin = binP[0];
  const lamPois = poisLam[0];
  const mu = normMu[0];
  const sig = normSig[0];
  const lamExp = expLam[0];
  const aUni = uniA[0];
  const bUni = uniB[0];
  const p1 = shapeP1[0];
  const p2 = shapeP2[0];
  const nClt = cltN[0];
  const aB = betaA[0];
  const bB = betaB[0];

  // Binomial
  const binKs = useMemo(() => Array.from({ length: nBin + 1 }, (_, i) => i), [nBin]);
  const binPs = useMemo(() => binKs.map((k) => binomialPMF(k, nBin, pBin)), [binKs, nBin, pBin]);

  // Poisson
  const poisKs = useMemo(() => {
    const top = Math.max(Math.ceil(lamPois + 4 * Math.sqrt(lamPois)), 10);
    return Array.from({ length: top + 1 }, (_, i) => i);
  }, [lamPois]);
  const poisPs = useMemo(() => poisKs.map((k) => poissonPMF(k, lamPois)), [poisKs, lamPois]);

  // Normal
  const normXs = useMemo(() => {
    const lo = mu - 4 * sig;
    const hi = mu + 4 * sig;
    return Array.from({ length: 200 }, (_, i) => lo + (i / 199) * (hi - lo));
  }, [mu, sig]);
  const normYs = useMemo(() => normXs.map((x) => normalPDF(x, mu, sig)), [normXs, mu, sig]);

  // Exponential
  const expXs = useMemo(() => {
    const hi = Math.max(5 / lamExp, 3);
    return Array.from({ length: 200 }, (_, i) => (i / 199) * hi);
  }, [lamExp]);
  const expYs = useMemo(() => expXs.map((x) => exponentialPDF(x, lamExp)), [expXs, lamExp]);

  // Uniform
  const uniXs = useMemo(() => {
    const lo = aUni - 1;
    const hi = bUni + 1;
    return Array.from({ length: 200 }, (_, i) => lo + (i / 199) * (hi - lo));
  }, [aUni, bUni]);
  const uniYs = useMemo(() => uniXs.map((x) => uniformPDF(x, aUni, bUni)), [uniXs, aUni, bUni]);

  // Shape playground
  const shapeData = useMemo(() => {
    switch (shapeDist) {
      case "normal": {
        const s = Math.max(p2, 0.1);
        const lo = p1 - 4 * s;
        const hi = p1 + 4 * s;
        const xs = Array.from({ length: 200 }, (_, i) => lo + (i / 199) * (hi - lo));
        return { xs, ys: xs.map((x) => normalPDF(x, p1, s)), type: "continuous" };
      }
      case "exponential": {
        const lam = Math.max(p1, 0.1);
        const hi = Math.max(8 / lam, 4);
        const xs = Array.from({ length: 200 }, (_, i) => (i / 199) * hi);
        return { xs, ys: xs.map((x) => exponentialPDF(x, lam)), type: "continuous" };
      }
      case "binomial": {
        const n = Math.round(Math.max(p1, 1));
        const p = Math.min(Math.max(p2, 0.01), 0.99);
        const ks = Array.from({ length: n + 1 }, (_, i) => i);
        return { ks, ps: ks.map((k) => binomialPMF(k, n, p)), type: "discrete" };
      }
      case "poisson": {
        const lam = Math.max(p1, 0.1);
        const top = Math.max(Math.ceil(lam + 4 * Math.sqrt(lam)), 10);
        const ks = Array.from({ length: top + 1 }, (_, i) => i);
        return { ks, ps: ks.map((k) => poissonPMF(k, lam)), type: "discrete" };
      }
      default:
        return { xs: [], ys: [], type: "continuous" };
    }
  }, [shapeDist, p1, p2]);

  // CLT
  const cltSamples = useCLTSamples(cltSource, nClt, 2000);
  void cltSeed; // trigger re-render on resample

  // Beta
  const betaXs = useMemo(() => Array.from({ length: 200 }, (_, i) => 0.005 + (i / 199) * 0.99), []);
  const betaYs = useMemo(() => betaXs.map((x) => betaPDF(x, aB, bB)), [betaXs, aB, bB]);
  const betaMean = aB / (aB + bB);
  const betaVar = (aB * bB) / ((aB + bB) ** 2 * (aB + bB + 1));

  // Shape playground param config
  const shapeParams = {
    normal: [
      { label: "Mean (\u03BC)", min: -5, max: 5, step: 0.1 },
      { label: "Std dev (\u03C3)", min: 0.2, max: 5, step: 0.1 },
    ],
    exponential: [{ label: "Rate (\u03BB)", min: 0.1, max: 5, step: 0.1 }],
    binomial: [
      { label: "Trials (n)", min: 1, max: 40, step: 1 },
      { label: "Probability (p)", min: 0.01, max: 0.99, step: 0.01 },
    ],
    poisson: [{ label: "Rate (\u03BB)", min: 0.5, max: 20, step: 0.5 }],
  };

  const shapeDefaults = {
    normal: [[0], [1]],
    exponential: [[1], [1]],
    binomial: [[20], [0.5]],
    poisson: [[4], [1]],
  };

  const intro = (
    <>
      <p>
        Probability distributions are the{" "}
        <span className="font-semibold">backbone of statistics</span>. Every time you
        calculate a mean, run a hypothesis test, or build a model, you are implicitly
        relying on distributions.
      </p>
      <p>
        This tutorial gives you an interactive, ground-up understanding of the most
        important distributions in statistics: what they look like, when to use each one,
        how their parameters shape them, and why the Central Limit Theorem ties them all
        together.
      </p>
    </>
  );

  return (
    <TutorialShell
      title="Probability distributions"
      description="A comprehensive interactive guide to discrete and continuous distributions, their parameters, shapes, and the Central Limit Theorem."
      intro={intro}
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ========== Step 0: What is a distribution? ========== */}
          {step === 0 && (
            <StepContent>
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BarChart3 className="h-6 w-6" /> What is a distribution?
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 text-slate-700">
                    <p>
                      A <span className="font-semibold">probability distribution</span>{" "}
                      describes all possible values a random variable can take and how
                      likely each value is.
                    </p>
                    <InfoBox title="Intuition" variant="muted">
                      Think of rolling a die. There are 6 outcomes, each equally likely at{" "}
                      <Tex>{"1/6"}</Tex>. That's a distribution &mdash; a complete
                      description of "what can happen and how often."
                    </InfoBox>
                    <InfoBox title="Two flavors" variant="outline">
                      <ul className="mt-1 list-disc pl-5 space-y-2">
                        <li>
                          <span className="font-semibold">Discrete:</span> countable
                          outcomes (coin flips, counts). Described by a{" "}
                          <em>probability mass function</em> (PMF):
                          <div className="mt-1">
                            <Tex display>{"P(X = x) \\geq 0, \\quad \\sum_x P(X=x) = 1"}</Tex>
                          </div>
                        </li>
                        <li>
                          <span className="font-semibold">Continuous:</span> any value in a
                          range (heights, temperatures). Described by a{" "}
                          <em>probability density function</em> (PDF):
                          <div className="mt-1">
                            <Tex display>{"f(x) \\geq 0, \\quad \\int_{-\\infty}^{\\infty} f(x)\\,dx = 1"}</Tex>
                          </div>
                        </li>
                      </ul>
                    </InfoBox>
                  </div>
                  <div className="space-y-4">
                    <InfoBox title="Key properties" variant="outline">
                      <ul className="mt-1 list-disc pl-5 space-y-2">
                        <li>
                          <span className="font-semibold">Mean</span>{" "}
                          <Tex>{"\\mu = E[X]"}</Tex> &mdash; the balance point.
                        </li>
                        <li>
                          <span className="font-semibold">Variance</span>{" "}
                          <Tex>{"\\sigma^2 = E[(X - \\mu)^2]"}</Tex> &mdash; spread around
                          the mean.
                        </li>
                        <li>
                          <span className="font-semibold">Skewness</span>{" "}
                          <Tex>{"\\gamma_1 = E\\!\\left[\\left(\\frac{X-\\mu}{\\sigma}\\right)^{\\!3}\\right]"}</Tex>{" "}
                          &mdash; asymmetry.
                        </li>
                        <li>
                          <span className="font-semibold">Support</span> &mdash; the set of
                          values with non-zero probability.
                        </li>
                      </ul>
                    </InfoBox>
                    <InfoBox title="Why this matters" variant="dark">
                      Choosing the right distribution for your data determines whether your
                      model's assumptions hold. Wrong distribution &rarr; wrong inferences.
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ========== Step 1: Discrete distributions ========== */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Layers className="h-6 w-6" /> Discrete distributions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Binomial */}
                  <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Binomial distribution</h3>
                      <p className="text-slate-700 text-sm">
                        Models the number of successes in <Tex>{"n"}</Tex> independent
                        trials, each with success probability <Tex>{"p"}</Tex>.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"P(X = k) = \\binom{n}{k}\\, p^k \\,(1-p)^{n-k}, \\quad k = 0, 1, \\ldots, n"}
                        </Tex>
                      </InfoBox>
                      <LabeledSlider label="Trials (n)" value={binN} displayValue={nBin} onValueChange={setBinN} min={1} max={30} step={1} />
                      <LabeledSlider label="Probability (p)" value={binP} displayValue={fmt(pBin, 2)} onValueChange={setBinP} min={0.01} max={0.99} step={0.01} />
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Mean" value={<Tex>{`\\mu = np = ${fmt(nBin * pBin, 2)}`}</Tex>} />
                        <StatCard label="Variance" value={<Tex>{`\\sigma^2 = np(1-p) = ${fmt(nBin * pBin * (1 - pBin), 2)}`}</Tex>} />
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <DiscreteChart ks={binKs} ps={binPs} label="Binomial PMF" color="#1e293b" />
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* Poisson */}
                  <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Poisson distribution</h3>
                      <p className="text-slate-700 text-sm">
                        Models the number of events in a fixed interval when events occur at
                        a constant average rate <Tex>{"\\lambda"}</Tex>.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"P(X = k) = \\frac{\\lambda^k\\, e^{-\\lambda}}{k!}, \\quad k = 0, 1, 2, \\ldots"}
                        </Tex>
                      </InfoBox>
                      <LabeledSlider label={<>Rate (<Tex>{`\\lambda`}</Tex>)</>} value={poisLam} displayValue={fmt(lamPois, 1)} onValueChange={setPoisLam} min={0.5} max={20} step={0.5} />
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Mean" value={<Tex>{`\\mu = \\lambda = ${fmt(lamPois, 1)}`}</Tex>} />
                        <StatCard label="Variance" value={<Tex>{`\\sigma^2 = \\lambda = ${fmt(lamPois, 1)}`}</Tex>} />
                      </div>
                      <InfoBox variant="muted">
                        For Poisson, <Tex>{"\\text{mean} = \\text{variance} = \\lambda"}</Tex>.
                        This is a key diagnostic for identifying Poisson data.
                      </InfoBox>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <DiscreteChart ks={poisKs} ps={poisPs} label="Poisson PMF" color="#2563eb" />
                    </div>
                  </div>

                  <InfoBox title="When to use which?" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      <li>
                        <span className="font-semibold">Binomial:</span> fixed number of
                        trials, each pass/fail. (e.g., 20 patients, how many recover?)
                      </li>
                      <li>
                        <span className="font-semibold">Poisson:</span> counting events in a
                        window with no fixed cap. (e.g., emails per hour, accidents per year)
                      </li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ========== Step 2: Continuous distributions ========== */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TrendingUp className="h-6 w-6" /> Continuous distributions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Normal */}
                  <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Normal (Gaussian)</h3>
                      <p className="text-slate-700 text-sm">
                        The iconic bell curve. Symmetric, defined entirely by mean{" "}
                        <Tex>{"\\mu"}</Tex> and standard deviation <Tex>{"\\sigma"}</Tex>.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}\\, \\exp\\!\\left(-\\frac{(x - \\mu)^2}{2\\sigma^2}\\right)"}
                        </Tex>
                      </InfoBox>
                      <LabeledSlider
                        label={<>Mean (<Tex>{"\\mu"}</Tex>)</>}
                        value={normMu}
                        displayValue={fmt(mu, 1)}
                        onValueChange={setNormMu}
                        min={-5}
                        max={5}
                        step={0.1}
                      />
                      <LabeledSlider
                        label={<>Std dev (<Tex>{"\\sigma"}</Tex>)</>}
                        value={normSig}
                        displayValue={fmt(sig, 1)}
                        onValueChange={setNormSig}
                        min={0.2}
                        max={4}
                        step={0.1}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Mean" value={<Tex>{`\\mu = ${fmt(mu, 1)}`}</Tex>} />
                        <StatCard label="Variance" value={<Tex>{`\\sigma^2 = ${fmt(sig * sig, 2)}`}</Tex>} />
                      </div>
                      <InfoBox variant="muted">
                        <Tex>{"68\\%"}</Tex> of values fall within{" "}
                        <Tex>{"\\pm 1\\sigma"}</Tex>, <Tex>{"95\\%"}</Tex> within{" "}
                        <Tex>{"\\pm 2\\sigma"}</Tex>, <Tex>{"99.7\\%"}</Tex> within{" "}
                        <Tex>{"\\pm 3\\sigma"}</Tex>.
                      </InfoBox>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <ContinuousChart xs={normXs} ys={normYs} label="Normal PDF" />
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* Exponential */}
                  <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Exponential</h3>
                      <p className="text-slate-700 text-sm">
                        Models time between events in a Poisson process. Always right-skewed,
                        starting from 0.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"f(x) = \\lambda\\, e^{-\\lambda x}, \\quad x \\geq 0"}
                        </Tex>
                      </InfoBox>
                      <LabeledSlider
                        label={<>Rate (<Tex>{"\\lambda"}</Tex>)</>}
                        value={expLam}
                        displayValue={fmt(lamExp, 1)}
                        onValueChange={setExpLam}
                        min={0.2}
                        max={5}
                        step={0.1}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Mean" value={<Tex>{`\\mu = 1/\\lambda = ${fmt(1 / lamExp, 2)}`}</Tex>} />
                        <StatCard label="Variance" value={<Tex>{`\\sigma^2 = 1/\\lambda^2 = ${fmt(1 / lamExp ** 2, 2)}`}</Tex>} />
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <ContinuousChart xs={expXs} ys={expYs} label="Exponential PDF" color="#dc2626" />
                    </div>
                  </div>

                  <hr className="border-slate-200" />

                  {/* Uniform */}
                  <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Uniform</h3>
                      <p className="text-slate-700 text-sm">
                        Every value between <Tex>{"a"}</Tex> and <Tex>{"b"}</Tex> is equally
                        likely. The simplest continuous distribution.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"f(x) = \\frac{1}{b - a}, \\quad a \\leq x \\leq b"}
                        </Tex>
                      </InfoBox>
                      <LabeledSlider label="Lower bound (a)" value={uniA} displayValue={fmt(aUni, 1)} onValueChange={setUniA} min={-5} max={4} step={0.5} />
                      <LabeledSlider label="Upper bound (b)" value={uniB} displayValue={fmt(bUni, 1)} onValueChange={setUniB} min={aUni + 0.5} max={10} step={0.5} />
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Mean" value={<Tex>{`\\mu = \\frac{a+b}{2} = ${fmt((aUni + bUni) / 2, 2)}`}</Tex>} />
                        <StatCard label="Variance" value={<Tex>{`\\sigma^2 = \\frac{(b-a)^2}{12} = ${fmt((bUni - aUni) ** 2 / 12, 2)}`}</Tex>} />
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <ContinuousChart xs={uniXs} ys={uniYs} label="Uniform PDF" color="#16a34a" />
                    </div>
                  </div>

                  <InfoBox title="Connection" variant="dark">
                    Exponential and Poisson are paired: if events arrive as a Poisson process
                    with rate <Tex>{"\\lambda"}</Tex>, the time between events follows an{" "}
                    <Tex>{"\\text{Exp}(\\lambda)"}</Tex> distribution.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ========== Step 3: Shape playground ========== */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Shuffle className="h-6 w-6" /> Shape playground
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Distribution</label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {["normal", "exponential", "binomial", "poisson"].map((d) => (
                          <Button
                            key={d}
                            variant={shapeDist === d ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setShapeDist(d);
                              setShapeP1(shapeDefaults[d][0]);
                              setShapeP2(shapeDefaults[d][1]);
                            }}
                            className="capitalize"
                          >
                            {d}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {shapeParams[shapeDist].map((param, i) => {
                      const val = i === 0 ? shapeP1 : shapeP2;
                      const setter = i === 0 ? setShapeP1 : setShapeP2;
                      return (
                        <LabeledSlider
                          key={`${shapeDist}-${i}`}
                          label={param.label}
                          value={val}
                          displayValue={fmt(val[0], param.step < 1 ? 2 : 0)}
                          onValueChange={setter}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                        />
                      );
                    })}

                    <InfoBox variant="muted">
                      {shapeDist === "normal" && (
                        <>
                          Increasing <Tex>{"\\sigma"}</Tex> flattens the curve. Moving{" "}
                          <Tex>{"\\mu"}</Tex> shifts it without changing shape. About{" "}
                          <Tex>{"68\\%"}</Tex> of values fall within{" "}
                          <Tex>{"\\pm 1\\sigma"}</Tex>.
                        </>
                      )}
                      {shapeDist === "exponential" && (
                        <>
                          Higher <Tex>{"\\lambda"}</Tex> concentrates mass near zero. The
                          mean equals <Tex>{"1/\\lambda"}</Tex>. The exponential is
                          "memoryless": <Tex>{"P(X > s+t \\mid X > s) = P(X > t)"}</Tex>.
                        </>
                      )}
                      {shapeDist === "binomial" && (
                        <>
                          When <Tex>{"p = 0.5"}</Tex> the distribution is symmetric. As{" "}
                          <Tex>{"n"}</Tex> grows the shape approaches a Normal (a preview of
                          the CLT). Extreme <Tex>{"p"}</Tex> values produce strong skew.
                        </>
                      )}
                      {shapeDist === "poisson" && (
                        <>
                          Small <Tex>{"\\lambda"}</Tex> produces strong right skew. As{" "}
                          <Tex>{"\\lambda"}</Tex> grows the distribution becomes symmetric and
                          bell-shaped. Poisson is the limit of Binomial for large{" "}
                          <Tex>{"n"}</Tex>, small <Tex>{"p"}</Tex>.
                        </>
                      )}
                    </InfoBox>
                  </div>

                  <div className="rounded-lg border p-3 bg-white">
                    {shapeData.type === "continuous" ? (
                      <ContinuousChart
                        xs={shapeData.xs}
                        ys={shapeData.ys}
                        label={`${shapeDist.charAt(0).toUpperCase() + shapeDist.slice(1)} PDF`}
                      />
                    ) : (
                      <DiscreteChart
                        ks={shapeData.ks}
                        ps={shapeData.ps}
                        label={`${shapeDist.charAt(0).toUpperCase() + shapeDist.slice(1)} PMF`}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <InfoBox title="Experiment ideas" variant="outline">
                <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                  <li>
                    Set Binomial <Tex>{"n=30,\\, p=0.5"}</Tex> and see how it approximates
                    a Normal
                  </li>
                  <li>
                    Compare Poisson <Tex>{"\\lambda=1"}</Tex> (skewed) vs{" "}
                    <Tex>{"\\lambda=15"}</Tex> (nearly symmetric)
                  </li>
                  <li>
                    Watch how Normal <Tex>{"\\sigma"}</Tex> controls the peak height vs.
                    spread
                  </li>
                  <li>
                    Set Exponential <Tex>{"\\lambda=0.2"}</Tex> for a long-tailed wait-time
                    distribution
                  </li>
                </ul>
              </InfoBox>
            </StepContent>
          )}

          {/* ========== Step 4: Central Limit Theorem ========== */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Target className="h-6 w-6" /> The Central Limit Theorem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4 text-slate-700">
                      <InfoBox title="The theorem" variant="dark">
                        The mean of a large enough sample from <em>any</em> distribution
                        with finite variance is approximately normally distributed,
                        regardless of the original distribution's shape.
                      </InfoBox>
                      <p>
                        This is why the Normal distribution appears everywhere in statistics.
                        Even if your raw data is skewed or discrete, sample means converge to
                        a bell curve.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"\\bar{X}_n \\xrightarrow{d} \\mathcal{N}\\!\\left(\\mu,\\; \\frac{\\sigma^2}{n}\\right) \\quad \\text{as } n \\to \\infty"}
                        </Tex>
                      </InfoBox>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700">
                          Source distribution
                        </label>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[
                            ["uniform", "Uniform"],
                            ["exponential", "Exponential"],
                            ["bimodal", "Bimodal"],
                          ].map(([val, lbl]) => (
                            <Button
                              key={val}
                              variant={cltSource === val ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCltSource(val)}
                            >
                              {lbl}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <LabeledSlider
                        label={<>Sample size (<Tex>{"n"}</Tex>)</>}
                        value={cltN}
                        displayValue={nClt}
                        onValueChange={setCltN}
                        min={1}
                        max={50}
                        step={1}
                      />
                      <Button variant="outline" size="sm" onClick={() => setCltSeed((s) => s + 1)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Resample
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3 bg-white">
                    <HistogramChart
                      key={`${cltSource}-${nClt}-${cltSeed}`}
                      data={cltSamples}
                      bins={35}
                      label={`Distribution of sample means (n=${nClt}, 2000 samples)`}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <StatCard
                      label="Mean of means"
                      value={fmt(cltSamples.reduce((a, b) => a + b, 0) / cltSamples.length, 4)}
                    />
                    <StatCard
                      label="SD of means"
                      value={fmt(
                        Math.sqrt(
                          cltSamples.reduce(
                            (s, x) =>
                              s + (x - cltSamples.reduce((a, b) => a + b, 0) / cltSamples.length) ** 2,
                            0,
                          ) / cltSamples.length,
                        ),
                        4,
                      )}
                    />
                    <StatCard label="Sample size" value={<Tex>{`n = ${nClt}`}</Tex>} />
                  </div>

                  <InfoBox title="What to observe" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      <li>
                        At <Tex>{"n=1"}</Tex>, the histogram mirrors the source distribution
                      </li>
                      <li>
                        At <Tex>{"n=5"}</Tex>, the shape already starts looking bell-shaped
                      </li>
                      <li>
                        At <Tex>{"n \\geq 30"}</Tex>, the distribution of means is
                        unmistakably Normal
                      </li>
                      <li>
                        The spread shrinks as <Tex>{"n"}</Tex> grows:{" "}
                        <Tex>{"\\text{SD} \\propto 1/\\sqrt{n}"}</Tex>
                      </li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ========== Step 5: Beta distribution ========== */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sigma className="h-6 w-6" /> The Beta distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-4">
                      <p className="text-slate-700 text-sm">
                        The Beta distribution lives on <Tex>{"[0, 1]"}</Tex> and is the
                        go-to model for proportions, probabilities, and rates. It is also the
                        conjugate prior for the Binomial in Bayesian statistics.
                      </p>
                      <InfoBox variant="formula">
                        <Tex display>
                          {"f(x;\\,\\alpha,\\beta) = \\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\,\\beta)}, \\quad 0 < x < 1"}
                        </Tex>
                      </InfoBox>
                      <LabeledSlider
                        label={<>Alpha (<Tex>{"\\alpha"}</Tex>)</>}
                        value={betaA}
                        displayValue={fmt(aB, 1)}
                        onValueChange={setBetaA}
                        min={0.2}
                        max={20}
                        step={0.1}
                      />
                      <LabeledSlider
                        label={<>Beta (<Tex>{"\\beta"}</Tex>)</>}
                        value={betaB}
                        displayValue={fmt(bB, 1)}
                        onValueChange={setBetaB}
                        min={0.2}
                        max={20}
                        step={0.1}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard
                          label="Mean"
                          value={
                            <Tex>{`\\mu = \\frac{\\alpha}{\\alpha+\\beta} = ${fmt(betaMean, 3)}`}</Tex>
                          }
                        />
                        <StatCard
                          label="Variance"
                          value={<Tex>{`\\sigma^2 = ${fmt(betaVar, 4)}`}</Tex>}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border p-3 bg-white">
                      <ContinuousChart xs={betaXs} ys={betaYs} label="Beta PDF" color="#7c3aed" />
                    </div>
                  </div>

                  <InfoBox title="Special shapes" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      <li>
                        <Tex>{"\\alpha=1,\\;\\beta=1"}</Tex>: Uniform &mdash; no prior
                        information
                      </li>
                      <li>
                        <Tex>{"\\alpha=\\beta"}</Tex>: symmetric around{" "}
                        <Tex>{"0.5"}</Tex>; higher values = more concentrated
                      </li>
                      <li>
                        <Tex>{"\\alpha > \\beta"}</Tex>: skewed right (mode{" "}
                        <Tex>{"> 0.5"}</Tex>)
                      </li>
                      <li>
                        <Tex>{"\\alpha < 1,\\;\\beta < 1"}</Tex>: U-shaped, mass at both
                        extremes
                      </li>
                    </ul>
                  </InfoBox>

                  <InfoBox title="Bayesian connection" variant="dark">
                    If you observe <Tex>{"k"}</Tex> successes in <Tex>{"n"}</Tex> trials and
                    start with a <Tex>{"\\text{Beta}(\\alpha,\\,\\beta)"}</Tex> prior, your
                    posterior is:
                    <div className="mt-2">
                      <Tex display>
                        {"\\text{Beta}(\\alpha + k,\\;\\beta + n - k)"}
                      </Tex>
                    </div>
                  </InfoBox>

                  <InfoBox title="Try it" variant="muted">
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
                      <li>
                        Start with <Tex>{"\\alpha=1,\\,\\beta=1"}</Tex> (uniform prior), then
                        imagine 8 heads in 10 flips: set <Tex>{"\\alpha=9,\\,\\beta=3"}</Tex>
                      </li>
                      <li>
                        Set <Tex>{"\\alpha=0.5,\\,\\beta=0.5"}</Tex> for the Jeffreys prior
                        (U-shape)
                      </li>
                      <li>
                        Set <Tex>{"\\alpha=100,\\,\\beta=100"}</Tex> for a very concentrated
                        belief at <Tex>{"0.5"}</Tex>
                      </li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ========== Step 6: Quiz ========== */}
          {step === 6 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question={
                  <>
                    A fair coin is flipped 20 times. Which distribution models the number
                    of heads?
                  </>
                }
                options={[
                  "Normal(10, 5)",
                  "Poisson(10)",
                  "Binomial(20, 0.5)",
                  "Exponential(0.5)",
                ]}
                correctIndex={2}
                explanation={
                  <>
                    Fixed number of independent trials (<Tex>{"n=20"}</Tex>) with constant
                    probability (<Tex>{"p=0.5"}</Tex>) &mdash; that's exactly the Binomial
                    setup.
                  </>
                }
              />
              <QuizCard
                question={
                  <>
                    A call center gets an average of 3 calls per minute. Which distribution
                    models the count per minute?
                  </>
                }
                options={["Binomial(3, 0.5)", "Uniform(0, 6)", "Poisson(3)", "Normal(3, 1)"]}
                correctIndex={2}
                explanation={
                  <>
                    Counting events in a fixed interval at constant average rate &mdash;
                    classic Poisson with <Tex>{"\\lambda = 3"}</Tex>.
                  </>
                }
              />
              <QuizCard
                question="What does the Central Limit Theorem guarantee?"
                options={[
                  "All data is normally distributed.",
                  "Sample means approach a Normal distribution as sample size grows.",
                  "The variance of a sample is always finite.",
                  "Larger samples always have smaller bias.",
                ]}
                correctIndex={1}
                explanation={
                  <>
                    The CLT says the distribution of <Tex>{"\\bar{X}_n"}</Tex> converges to
                    Normal, not that the underlying data is Normal.
                  </>
                }
              />
              <QuizCard
                question="Which distribution is the conjugate prior for the Binomial likelihood?"
                options={["Normal", "Gamma", "Beta", "Poisson"]}
                correctIndex={2}
                explanation={
                  <>
                    A <Tex>{"\\text{Beta}(\\alpha,\\beta)"}</Tex> prior combined with
                    Binomial data yields a{" "}
                    <Tex>{"\\text{Beta}(\\alpha+k,\\,\\beta+n-k)"}</Tex> posterior.
                  </>
                }
              />
              <QuizCard
                question="The Exponential distribution is memoryless. What does this mean?"
                options={[
                  "It always has mean zero.",
                  "Past waiting time does not affect the probability of future events.",
                  "It cannot model real-world data.",
                  "Its variance is always 1.",
                ]}
                correctIndex={1}
                explanation={
                  <>
                    Memorylessness: <Tex>{"P(X > s+t \\mid X > s) = P(X > t)"}</Tex>. How
                    long you've waited doesn't change the remaining wait distribution.
                  </>
                }
              />
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="dark">
                    <div className="text-base space-y-1">
                      <div>
                        <span className="font-semibold">Binomial</span>{" "}
                        <Tex>{"\\text{Bin}(n,p)"}</Tex> &mdash; successes in{" "}
                        <Tex>{"n"}</Tex> trials
                      </div>
                      <div>
                        <span className="font-semibold">Poisson</span>{" "}
                        <Tex>{"\\text{Pois}(\\lambda)"}</Tex> &mdash; events at a rate
                      </div>
                      <div>
                        <span className="font-semibold">Normal</span>{" "}
                        <Tex>{"\\mathcal{N}(\\mu, \\sigma^2)"}</Tex> &mdash; the CLT's
                        destination
                      </div>
                      <div>
                        <span className="font-semibold">Exponential</span>{" "}
                        <Tex>{"\\text{Exp}(\\lambda)"}</Tex> &mdash; time between events
                      </div>
                      <div>
                        <span className="font-semibold">Uniform</span>{" "}
                        <Tex>{"U(a,b)"}</Tex> &mdash; all values equally likely
                      </div>
                      <div>
                        <span className="font-semibold">Beta</span>{" "}
                        <Tex>{"\\text{Beta}(\\alpha,\\beta)"}</Tex> &mdash; distribution
                        over probabilities
                      </div>
                    </div>
                  </InfoBox>
                  <InfoBox title="What's next?" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>Explore how these distributions connect to hypothesis tests</li>
                      <li>
                        Study the Gamma and Chi-squared as extensions
                      </li>
                      <li>Practice choosing the right distribution for real datasets</li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
