import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Scale,
  BarChart3,
  AlertTriangle,
  Shuffle,
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

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

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

function fmt(x, d = 3) {
  return Number(x).toFixed(d);
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

/* ================================================================== */
/*  Data simulation                                                    */
/* ================================================================== */

const TRUE_ATE = 0.4;
const OUTCOME_EFFECT = 0.5;
const NOISE_SD = 0.5;
const N = 600;

function generateData(confounding, seed = 42) {
  const rng = mulberry32(seed);
  const data = [];
  for (let i = 0; i < N; i++) {
    const x = boxMuller(rng);
    const ps = logistic(confounding * x);
    const t = rng() < ps ? 1 : 0;
    const y = TRUE_ATE * t + OUTCOME_EFFECT * x + boxMuller(rng) * NOISE_SD;
    data.push({ x, ps, t, y });
  }
  return data;
}

function computeEstimates(data, maxW = Infinity) {
  const treated = data.filter((d) => d.t === 1);
  const untreated = data.filter((d) => d.t === 0);

  const naiveATE =
    treated.reduce((s, d) => s + d.y, 0) / (treated.length || 1) -
    untreated.reduce((s, d) => s + d.y, 0) / (untreated.length || 1);

  const iptwATE =
    data.reduce((s, d) => {
      const raw = (d.t - d.ps) / (d.ps * (1 - d.ps));
      const w = maxW === Infinity ? raw : Math.sign(raw) * Math.min(Math.abs(raw), maxW);
      return s + w * d.y;
    }, 0) / data.length;

  const weights = data.map((d) => (d.t === 1 ? 1 / d.ps : 1 / (1 - d.ps)));
  const maxObsWeight = Math.max(...weights);

  return { naiveATE, iptwATE, treated, untreated, maxObsWeight };
}

/* ================================================================== */
/*  Histogram helpers                                                  */
/* ================================================================== */

function makeBins(values, nBins, range) {
  const [lo, hi] = range;
  const step = (hi - lo) / nBins;
  const counts = Array(nBins).fill(0);
  for (const v of values) {
    const i = clamp(Math.floor((v - lo) / step), 0, nBins - 1);
    counts[i]++;
  }
  return counts.map((c, i) => ({
    x0: lo + i * step,
    x1: lo + (i + 1) * step,
    count: c,
  }));
}

function makeWeightedBins(values, weights, nBins, range) {
  const [lo, hi] = range;
  const step = (hi - lo) / nBins;
  const counts = Array(nBins).fill(0);
  for (let j = 0; j < values.length; j++) {
    const i = clamp(Math.floor((values[j] - lo) / step), 0, nBins - 1);
    counts[i] += weights[j];
  }
  return counts.map((c, i) => ({
    x0: lo + i * step,
    x1: lo + (i + 1) * step,
    count: c,
  }));
}

function normalizeBins(bins) {
  const total = bins.reduce((s, b) => s + b.count, 0) || 1;
  return bins.map((b) => ({ ...b, count: b.count / total }));
}

/* ================================================================== */
/*  SVG chart                                                          */
/* ================================================================== */

const W = 460;
const H = 180;
const PAD = { top: 14, right: 15, bottom: 28, left: 15 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

function DualHistogram({
  binsA,
  binsB,
  labelA = "Seminar",
  labelB = "No seminar",
  colorA = "#1e293b",
  colorB = "#94a3b8",
  ticks,
  title,
}) {
  const maxCount = Math.max(...binsA.map((b) => b.count), ...binsB.map((b) => b.count), 0.001);
  const xMin = binsA[0].x0;
  const xMax = binsA[binsA.length - 1].x1;
  const xRange = xMax - xMin;
  const nBins = binsA.length;
  const barW = PW / nBins;

  const sx = (v) => PAD.left + ((v - xMin) / xRange) * PW;
  const sy = (c) => PAD.top + PH * (1 - c / maxCount);

  const displayTicks = ticks ?? [xMin, (xMin + xMax) / 2, xMax];
  const tickDigits = xRange <= 2 ? 2 : 1;

  return (
    <div>
      {title && <div className="text-sm font-medium text-slate-600 mb-1">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <line
          x1={PAD.left}
          y1={PAD.top + PH}
          x2={PAD.left + PW}
          y2={PAD.top + PH}
          stroke="#cbd5e1"
        />
        {displayTicks.map((v) => (
          <text key={v} x={sx(v)} y={H - 6} textAnchor="middle" className="text-[10px] fill-slate-500">
            {fmt(v, tickDigits)}
          </text>
        ))}

        {/* untreated first (background) */}
        {binsB.map((b, i) => (
          <rect
            key={`b${i}`}
            x={sx(b.x0)}
            y={sy(b.count)}
            width={Math.max(barW - 1, 1)}
            height={Math.max(PAD.top + PH - sy(b.count), 0)}
            fill={colorB}
            opacity={0.55}
          />
        ))}
        {binsA.map((b, i) => (
          <rect
            key={`a${i}`}
            x={sx(b.x0)}
            y={sy(b.count)}
            width={Math.max(barW - 1, 1)}
            height={Math.max(PAD.top + PH - sy(b.count), 0)}
            fill={colorA}
            opacity={0.55}
          />
        ))}

        {/* legend */}
        <rect x={W - 150} y={PAD.top - 2} width={8} height={8} fill={colorA} opacity={0.7} />
        <text x={W - 138} y={PAD.top + 6} className="text-[9px] fill-slate-600">{labelA}</text>
        <rect x={W - 80} y={PAD.top - 2} width={8} height={8} fill={colorB} opacity={0.7} />
        <text x={W - 68} y={PAD.top + 6} className="text-[9px] fill-slate-600">{labelB}</text>
      </svg>
    </div>
  );
}

/* ================================================================== */
/*  Tutorial                                                           */
/* ================================================================== */

const LESSONS = [
  "Selection bias",
  "The propensity score",
  "Inverse probability weighting",
  "Covariate balance",
  "What can go wrong",
  "Quick checks",
];

export default function PropensityScoreTutorial() {
  const [confounding, setConfounding] = useState([1.0]);
  const [clipWeight, setClipWeight] = useState([50]);

  const data = useMemo(() => generateData(confounding[0]), [confounding[0]]);

  const stats = useMemo(() => computeEstimates(data), [data]);

  const clippedStats = useMemo(
    () => computeEstimates(data, clipWeight[0] >= 50 ? Infinity : clipWeight[0]),
    [data, clipWeight[0]],
  );

  const bins = useMemo(() => {
    const { treated, untreated } = stats;
    const psBinsT = makeBins(treated.map((d) => d.ps), 20, [0, 1]);
    const psBinsU = makeBins(untreated.map((d) => d.ps), 20, [0, 1]);

    const xBinsT = makeBins(treated.map((d) => d.x), 20, [-3.5, 3.5]);
    const xBinsU = makeBins(untreated.map((d) => d.x), 20, [-3.5, 3.5]);

    const nxBinsT = normalizeBins(xBinsT);
    const nxBinsU = normalizeBins(xBinsU);

    const wxBinsT = normalizeBins(
      makeWeightedBins(treated.map((d) => d.x), treated.map((d) => 1 / d.ps), 20, [-3.5, 3.5]),
    );
    const wxBinsU = normalizeBins(
      makeWeightedBins(
        untreated.map((d) => d.x),
        untreated.map((d) => 1 / (1 - d.ps)),
        20,
        [-3.5, 3.5],
      ),
    );

    return { psBinsT, psBinsU, xBinsT, xBinsU, nxBinsT, nxBinsU, wxBinsT, wxBinsU };
  }, [stats]);

  const bias = stats.naiveATE - TRUE_ATE;

  const intro = (
    <>
      <p>
        A school offers an optional growth-mindset seminar. Students who participate tend to
        score higher on later assessments. But is the seminar actually effective, or do{" "}
        <span className="font-semibold">motivated students self-select into it</span>?
      </p>
      <p>
        The <span className="font-semibold">propensity score</span> — the probability of
        receiving treatment given observed covariates — lets us untangle selection from
        causation, turning observational data into something closer to a randomized experiment.
      </p>
    </>
  );

  const confoundingSlider = (
    <LabeledSlider
      label="Confounding strength"
      value={confounding}
      displayValue={fmt(confounding[0], 1)}
      onValueChange={setConfounding}
      min={0}
      max={3}
      step={0.1}
    />
  );

  const xTicks = [-3, -1.5, 0, 1.5, 3];
  const psTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <TutorialShell
      title="Propensity Score"
      description="An interactive tutorial on using propensity scores to estimate causal effects from observational data, based on Chapter 11 of Causal Inference for the Brave and True."
      intro={intro}
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ─── Step 0: Selection bias ─────────────────────────── */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Shuffle className="h-6 w-6" /> Selection bias
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4 text-slate-700">
                    <p>
                      In an ideal experiment, students would be randomly assigned to
                      the seminar. In reality, they <em>self-select</em> — motivated
                      students with higher prior GPAs are more likely to sign up.
                    </p>
                    <p>
                      Since prior GPA also predicts the assessment score, a simple
                      comparison of seminar vs. non-seminar students conflates the
                      seminar's real effect with the pre-existing academic advantage.
                    </p>
                    {confoundingSlider}
                    <InfoBox variant="muted">
                      At 0, seminar enrollment is random — no confounding. As you
                      increase it, high-GPA students become much more likely to
                      enroll, and the naive estimate drifts away from the truth.
                    </InfoBox>
                  </div>
                  <div className="space-y-3">
                    <DualHistogram
                      binsA={bins.xBinsT}
                      binsB={bins.xBinsU}
                      ticks={xTicks}
                      title="Prior GPA by group"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard label="Naive ATE" value={fmt(stats.naiveATE)} formula="E[Y|T{=}1] - E[Y|T{=}0]" />
                      <StatCard label="True ATE" value={fmt(TRUE_ATE)} formula="E[Y_1 - Y_0]" />
                      <StatCard
                        label="Bias"
                        value={fmt(bias)}
                        formula={"\\hat{\\tau}_{\\text{naive}} - \\tau"}
                        className={Math.abs(bias) > 0.05 ? "bg-amber-50" : "bg-emerald-50"}
                      />
                    </div>
                    <InfoBox variant="dark">
                      The naive comparison says the seminar is worth{" "}
                      <strong>{fmt(stats.naiveATE)}</strong> standard deviations, but the
                      true causal effect is only <strong>{fmt(TRUE_ATE)}</strong>. The rest
                      is selection bias.
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─── Step 1: The propensity score ──────────────────── */}
          {step === 1 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sigma className="h-6 w-6" /> The propensity score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="formula">
                    <Tex display>{"e(x) = P(T = 1 \\mid X = x)"}</Tex>
                  </InfoBox>
                  <p>
                    The propensity score is the probability that a student joins
                    the seminar, given their prior GPA. The crucial insight:
                  </p>
                  <InfoBox variant="dark">
                    Take two students with the same propensity score — one enrolled
                    in the seminar, one didn't. The only reason one enrolled is{" "}
                    <strong>chance</strong>. Conditioning on the propensity score makes
                    observational data look as good as randomized.
                  </InfoBox>
                  <p>
                    This is the <strong>balancing property</strong>:
                  </p>
                  <InfoBox variant="formula">
                    <Tex display>{"(Y_1, Y_0) \\perp\\!\\!\\!\\perp T \\mid e(X)"}</Tex>
                  </InfoBox>
                  <p>
                    Potential outcomes are independent of treatment, conditional on
                    the propensity score. You don't need to control for every
                    confounder separately — this single number is sufficient.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Why it works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The balancing property follows directly from the definition of{" "}
                    <Tex>{"e(x)"}</Tex>. We show that{" "}
                    <Tex>{"T \\perp\\!\\!\\!\\perp X \\mid e(X)"}</Tex> by proving
                    both sides of a conditional expectation are equal:
                  </p>
                  <InfoBox variant="formula" title="Left-hand side">
                    <Tex display>
                      {"E[T \\mid e(x),\\, X] = E[T \\mid X] = e(x)"}
                    </Tex>
                    <div className="mt-1 text-xs text-slate-500">
                      Since e(x) is a function of X, conditioning on both is the same
                      as conditioning on X alone.
                    </div>
                  </InfoBox>
                  <InfoBox variant="formula" title="Right-hand side (iterated expectations)">
                    <Tex display>
                      {"E[T \\mid e(x)] = E\\big[\\,E[T \\mid e(x),X]\\;\\big|\\;e(x)\\,\\big] = E[\\,e(x) \\mid e(x)\\,] = e(x)"}
                    </Tex>
                  </InfoBox>
                  <p>
                    Both sides equal <Tex>{"e(x)"}</Tex>. Treatment assignment is
                    independent of covariates given the propensity score.{" "}
                    <strong>QED.</strong>
                  </p>
                  <InfoBox variant="muted">
                    In practice, we estimate e(x) via logistic regression or machine
                    learning. The quality of this estimate matters — but not in the
                    way you might expect. More on that in step 5.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─── Step 2: IPTW ──────────────────────────────────── */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Scale className="h-6 w-6" /> Inverse probability weighting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Instead of comparing seminar and non-seminar students directly,
                    we <strong>reweight</strong> each student to construct a
                    pseudo-population where enrollment is independent of prior GPA.
                  </p>
                  <InfoBox variant="formula" title="IPTW estimator">
                    <Tex display>
                      {"\\widehat{ATE} = \\frac{1}{N}\\sum_{i=1}^{N} Y_i \\cdot \\frac{T_i - e(X_i)}{e(X_i)\\,(1 - e(X_i))}"}
                    </Tex>
                  </InfoBox>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBox variant="outline" title="Enrolled (T = 1): weight 1 / e(x)">
                      A student who joined the seminar despite a <em>low</em> predicted
                      probability gets high weight — they look like the non-enrollees
                      but happened to sign up. Especially informative.
                    </InfoBox>
                    <InfoBox variant="outline" title="Not enrolled (T = 0): weight 1 / (1 - e(x))">
                      A student who skipped the seminar despite a <em>high</em> predicted
                      probability also gets high weight — they resemble enrollees but
                      didn't join. Equally informative.
                    </InfoBox>
                  </div>
                  <InfoBox variant="muted">
                    Reweighting creates two pseudo-populations of size N: one where
                    "everyone is treated" and one where "no one is." The difference
                    between their average outcomes estimates the ATE.
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Interactive estimation</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-5">
                    {confoundingSlider}
                    <InfoBox variant="muted">
                      Increase confounding and watch the naive estimate drift while
                      IPTW stays close to the truth.
                    </InfoBox>
                    <div className="grid grid-cols-3 gap-2">
                      <StatCard
                        label="Naive ATE"
                        value={fmt(stats.naiveATE)}
                        formula="E[Y|T{=}1] - E[Y|T{=}0]"
                        className="bg-amber-50"
                      />
                      <StatCard
                        label="IPTW ATE"
                        value={fmt(stats.iptwATE)}
                        formula={"\\frac{1}{N}\\sum_i \\frac{(T_i - e(X_i))\\, Y_i}{e(X_i)(1 - e(X_i))}"}
                        className="bg-emerald-50"
                      />
                      <StatCard label="True ATE" value={fmt(TRUE_ATE)} formula="E[Y_1 - Y_0]" className="bg-slate-50" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label="Naive bias" value={fmt(stats.naiveATE - TRUE_ATE)} formula={"\\hat{\\tau}_{\\text{naive}} - \\tau"} />
                      <StatCard label="IPTW bias" value={fmt(stats.iptwATE - TRUE_ATE)} formula={"\\hat{\\tau}_{\\text{IPTW}} - \\tau"} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <DualHistogram
                      binsA={bins.psBinsT}
                      binsB={bins.psBinsU}
                      ticks={psTicks}
                      title="P(joining seminar | GPA)"
                    />
                    <InfoBox variant={stats.maxObsWeight > 20 ? "warning" : "muted"}>
                      Max weight: {fmt(stats.maxObsWeight, 1)}.
                      {stats.maxObsWeight > 20
                        ? " Extreme weights — estimates may be unstable."
                        : " Weights look reasonable."}
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─── Step 3: Covariate balance ─────────────────────── */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BarChart3 className="h-6 w-6" /> Covariate balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The real test of propensity score methods: after weighting,
                    covariate distributions should look <strong>similar</strong>{" "}
                    across treatment groups. This is the balancing property in action.
                  </p>
                  {confoundingSlider}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Before weighting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DualHistogram
                      binsA={bins.nxBinsT}
                      binsB={bins.nxBinsU}
                      ticks={xTicks}
                      title="Prior GPA by group (raw)"
                    />
                    <InfoBox variant="warning" className="mt-3">
                      Seminar students have systematically higher prior GPAs.
                      The groups are not directly comparable.
                    </InfoBox>
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">After IPTW weighting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DualHistogram
                      binsA={bins.wxBinsT}
                      binsB={bins.wxBinsU}
                      ticks={xTicks}
                      title="Prior GPA by group (IPTW weighted)"
                    />
                    <InfoBox variant="success" className="mt-3">
                      After weighting, the GPA distributions align — as if
                      seminar enrollment had been randomized.
                    </InfoBox>
                  </CardContent>
                </Card>
              </div>

              <InfoBox variant="dark">
                <div className="text-base">
                  Try increasing confounding to 2 or higher. Even with strong selection,
                  the weighted distributions still converge — though at the cost of
                  relying on a few heavily-weighted observations.
                </div>
              </InfoBox>
            </StepContent>
          )}

          {/* ─── Step 4: What can go wrong ─────────────────────── */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <AlertTriangle className="h-6 w-6" /> What can go wrong
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 text-slate-700">
                    <InfoBox variant="dark" title="Positivity violations">
                      IPTW divides by <Tex>{"e(x)"}</Tex> and{" "}
                      <Tex>{"1{-}e(x)"}</Tex>. When propensity scores cluster near 0
                      or 1, weights explode. This signals GPA ranges where virtually
                      all students either join or skip the seminar — the method
                      extrapolates rather than adjusts.
                    </InfoBox>
                    <InfoBox variant="outline" title="Rule of thumb">
                      Individual weights above 20 are a red flag. This happens when
                      non-enrollees have propensity above 0.95, or enrollees
                      below 0.05.
                    </InfoBox>
                    <InfoBox variant="outline" title="Prediction is not balancing">
                      A highly accurate propensity score model is not necessarily
                      better. Variables that strongly predict treatment but don't affect
                      the outcome push scores toward 0 and 1, inflating variance
                      without reducing bias. The model only needs to include
                      confounders.
                    </InfoBox>
                  </div>
                  <div className="space-y-4">
                    {confoundingSlider}
                    <DualHistogram
                      binsA={bins.psBinsT}
                      binsB={bins.psBinsU}
                      ticks={psTicks}
                      title="P(joining seminar | GPA) overlap"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard
                        label="Max weight"
                        value={fmt(stats.maxObsWeight, 1)}
                        formula={"\\max_i\\; \\tfrac{T_i}{e(X_i)} + \\tfrac{1-T_i}{1-e(X_i)}"}
                        className={stats.maxObsWeight > 20 ? "bg-rose-50" : "bg-emerald-50"}
                      />
                      <StatCard label="IPTW ATE" value={fmt(stats.iptwATE)} formula={"\\frac{1}{N}\\sum_i \\frac{(T_i - e(X_i))\\, Y_i}{e(X_i)(1 - e(X_i))}"} />
                    </div>
                    <LabeledSlider
                      label="Clip weights at"
                      value={clipWeight}
                      displayValue={clipWeight[0] >= 50 ? "No clip" : fmt(clipWeight[0], 0)}
                      onValueChange={setClipWeight}
                      min={2}
                      max={50}
                      step={1}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <StatCard label="Clipped IPTW" value={fmt(clippedStats.iptwATE)} formula={"\\hat{\\tau}_{\\text{IPTW}},\\; |w_i| \\le c"} />
                      <StatCard label="Clipping bias" value={fmt(clippedStats.iptwATE - TRUE_ATE)} formula={"\\hat{\\tau}_{\\text{clipped}} - \\tau"} />
                    </div>
                    <InfoBox variant="muted">
                      Clipping caps extreme weights, reducing variance but introducing
                      bias. Set confounding to 2.5+, then try clipping to see the
                      tradeoff.
                    </InfoBox>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ─── Step 5: Quick checks ──────────────────────────── */}
          {step === 5 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question="What does the propensity score measure?"
                options={[
                  "The probability of a positive outcome given treatment.",
                  "The probability of receiving treatment given covariates.",
                  "The average treatment effect for an individual.",
                  "The correlation between treatment and outcome.",
                ]}
                correctIndex={1}
                explanation="The propensity score e(x) = P(T=1|X) is the conditional probability of receiving treatment given observed covariates. It concerns treatment assignment, not outcomes."
              />
              <QuizCard
                question="Propensity scores for treated and untreated don't overlap. What does this mean?"
                options={[
                  "The treatment effect is zero.",
                  "IPTW will still produce unbiased estimates.",
                  "The positivity assumption is violated — causal inference requires extrapolation and may be unreliable.",
                  "You need a more complex model to estimate propensity scores.",
                ]}
                correctIndex={2}
                explanation="Without overlap, some treated units have no comparable untreated counterparts. Estimating effects requires extrapolation beyond the support of the data, making conclusions unreliable."
              />
              <QuizCard
                question="Why can a very accurate propensity score model make IPTW worse?"
                options={[
                  "Accurate models overfit to the outcome.",
                  "Including strong predictors of treatment that don't affect the outcome pushes scores to extremes, inflating variance without reducing bias.",
                  "The balancing property only holds for inaccurate models.",
                  "Logistic regression is the only valid estimation method.",
                ]}
                correctIndex={1}
                explanation="Variables that predict treatment but not the outcome push propensity scores toward 0 and 1, creating extreme weights. The propensity score only needs confounders — variables affecting both treatment and outcome."
              />
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Key takeaways</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="dark">
                    <div className="text-base space-y-2">
                      <div>
                        The propensity score compresses all confounders into a single
                        number — a balancing score.
                      </div>
                      <div>
                        IPTW reweights observations to create a pseudo-randomized
                        comparison, recovering the average treatment effect.
                      </div>
                      <div>
                        Good overlap between treatment groups is essential — without it,
                        no method can credibly estimate causal effects.
                      </div>
                    </div>
                  </InfoBox>
                  <InfoBox title="Beyond IPTW" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>
                        <strong>Matching:</strong> pair treated and untreated with
                        similar propensity scores
                      </li>
                      <li>
                        <strong>Stratification:</strong> divide into propensity-score
                        quantiles, estimate within each
                      </li>
                      <li>
                        <strong>Regression adjustment:</strong> include e(x) as a
                        covariate in the outcome model
                      </li>
                      <li>
                        <strong>Doubly robust:</strong> combine weighting with outcome
                        modeling for extra protection against misspecification
                      </li>
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
