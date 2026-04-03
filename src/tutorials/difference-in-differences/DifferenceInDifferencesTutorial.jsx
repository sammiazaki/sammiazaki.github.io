import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, GitBranch, TableProperties, FunctionSquare, AlertTriangle } from "lucide-react";
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
/*  Data — Billboard Deposits Example                                  */
/* ================================================================== */

/**
 * Fixed dataset inspired by the reference.
 * A bank places billboards in Porto Alegre (treated city).
 * Florianópolis is the control city (no billboards).
 *
 * Deposits are in thousands of R$ (Brazilian reais).
 */
const CITIES = {
  treated: "Porto Alegre",
  control: "Florianópolis",
};

// Baseline (pre-campaign) deposits
const BASE_TREATED = 52.5; // Porto Alegre, before
const BASE_CONTROL = 43.2; // Florianópolis, before

// Post-campaign deposits — control group drifts up by 3.8 due to macro trend
const CONTROL_TREND = 3.8;
const TRUE_ATT = 7.6; // the true billboard effect we want to recover

// Post values
const POST_CONTROL = BASE_CONTROL + CONTROL_TREND; // 47.0
const POST_TREATED = BASE_TREATED + CONTROL_TREND + TRUE_ATT; // 63.9

function fmt(x, d = 1) {
  return Number(x).toFixed(d);
}

/* ================================================================== */
/*  Chart helpers                                                       */
/* ================================================================== */

const W = 460;
const H = 200;
const PAD = { top: 18, right: 20, bottom: 36, left: 52 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

/**
 * Parallel-trends line chart.
 * Plots pre/post deposit values for treated and control cities.
 * Optionally renders the counterfactual dashed line for treated.
 *
 * Props:
 *   showCounterfactual — bool
 *   showEffect         — bool (bracket + label for DiD gap)
 *   preLabel / postLabel — axis labels
 *   yMin / yMax        — override y-axis range
 */
function TrendsChart({
  showCounterfactual = false,
  showEffect = false,
  showNaiveBefore = false,
  showNaiveCross = false,
  yMin: yMinProp,
  yMax: yMaxProp,
  title,
}) {
  const points = [
    { city: "treated", period: 0, val: BASE_TREATED },
    { city: "treated", period: 1, val: POST_TREATED },
    { city: "control", period: 0, val: BASE_CONTROL },
    { city: "control", period: 1, val: POST_CONTROL },
    { city: "counterfactual", period: 1, val: BASE_TREATED + CONTROL_TREND },
  ];

  const allVals = points.map((p) => p.val);
  const yMin = yMinProp ?? Math.min(...allVals) - 4;
  const yMax = yMaxProp ?? Math.max(...allVals) + 4;
  const yRange = yMax - yMin;

  const sx = (period) => PAD.left + period * PW;
  const sy = (v) => PAD.top + PH * (1 - (v - yMin) / yRange);

  const pt = (city, period) => points.find((p) => p.city === city && p.period === period);

  // Coordinates
  const tPre = { x: sx(0), y: sy(BASE_TREATED) };
  const tPost = { x: sx(1), y: sy(POST_TREATED) };
  const cPre = { x: sx(0), y: sy(BASE_CONTROL) };
  const cPost = { x: sx(1), y: sy(POST_CONTROL) };
  const cfPost = { x: sx(1), y: sy(BASE_TREATED + CONTROL_TREND) };

  // Naive before-after: only Porto Alegre, pre vs post
  const naiveBeforeY = sy(POST_TREATED) - 0; // top of bracket at post
  const naiveBeforeBaseline = sy(BASE_TREATED); // bottom bracket

  // Naive cross-section: compare treated vs control post
  const naiveCrossGapTop = sy(POST_TREATED);
  const naiveCrossGapBot = sy(POST_CONTROL);

  // True DiD effect: between post treated and counterfactual
  const didGapTop = sy(POST_TREATED);
  const didGapBot = sy(BASE_TREATED + CONTROL_TREND);

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + (i / 4) * yRange;
    return Math.round(v * 10) / 10;
  });

  return (
    <div>
      {title && <div className="text-[10px] text-slate-400 mb-1">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} stroke="#cbd5e1" />

        {/* Y-axis ticks + grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left - 4} y1={sy(v)}
              x2={PAD.left + PW} y2={sy(v)}
              stroke="#f1f5f9" strokeWidth={0.5}
            />
            <line x1={PAD.left - 4} y1={sy(v)} x2={PAD.left} y2={sy(v)} stroke="#cbd5e1" />
            <text x={PAD.left - 7} y={sy(v) + 4} textAnchor="end" className="text-[10px] fill-slate-500">
              {v.toFixed(0)}k
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        <text x={sx(0)} y={H - 6} textAnchor="middle" className="text-[10px] fill-slate-500">Before</text>
        <text x={sx(1)} y={H - 6} textAnchor="middle" className="text-[10px] fill-slate-500">After</text>

        {/* Vertical divider — "campaign starts" */}
        <line
          x1={PAD.left + PW / 2} y1={PAD.top}
          x2={PAD.left + PW / 2} y2={PAD.top + PH}
          stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 3"
        />

        {/* Control line */}
        <line
          x1={cPre.x} y1={cPre.y}
          x2={cPost.x} y2={cPost.y}
          stroke="#94a3b8" strokeWidth={2}
        />
        <circle cx={cPre.x} cy={cPre.y} r={4} fill="#94a3b8" />
        <circle cx={cPost.x} cy={cPost.y} r={4} fill="#94a3b8" />
        <text x={cPre.x - 6} y={cPre.y - 6} textAnchor="end" className="text-[9px] fill-slate-500">
          {CITIES.control}
        </text>

        {/* Treated line */}
        <line
          x1={tPre.x} y1={tPre.y}
          x2={tPost.x} y2={tPost.y}
          stroke="#1e293b" strokeWidth={2.5}
        />
        <circle cx={tPre.x} cy={tPre.y} r={4} fill="#1e293b" />
        <circle cx={tPost.x} cy={tPost.y} r={4} fill="#1e293b" />
        <text x={tPre.x - 6} y={tPre.y - 6} textAnchor="end" className="text-[9px] fill-slate-700" fontWeight="600">
          {CITIES.treated}
        </text>

        {/* Counterfactual dashed */}
        {showCounterfactual && (
          <>
            <line
              x1={tPre.x} y1={tPre.y}
              x2={cfPost.x} y2={cfPost.y}
              stroke="#1e293b" strokeWidth={1.5} strokeDasharray="6 3"
            />
            <circle cx={cfPost.x} cy={cfPost.y} r={4} fill="white" stroke="#1e293b" strokeWidth={1.5} />
            <text x={cfPost.x + 6} y={cfPost.y + 4} className="text-[9px] fill-slate-400">
              counterfactual
            </text>
          </>
        )}

        {/* Naive before-after bracket */}
        {showNaiveBefore && (
          <>
            <line
              x1={tPost.x + 14} y1={naiveBeforeY}
              x2={tPost.x + 14} y2={naiveBeforeBaseline}
              stroke="#f59e0b" strokeWidth={1.5}
            />
            <line x1={tPost.x + 10} y1={naiveBeforeY} x2={tPost.x + 18} y2={naiveBeforeY} stroke="#f59e0b" strokeWidth={1.5} />
            <line x1={tPost.x + 10} y1={naiveBeforeBaseline} x2={tPost.x + 18} y2={naiveBeforeBaseline} stroke="#f59e0b" strokeWidth={1.5} />
            <text x={tPost.x + 22} y={(naiveBeforeY + naiveBeforeBaseline) / 2 + 4} className="text-[9px] fill-amber-600">
              +{fmt(POST_TREATED - BASE_TREATED)}k
            </text>
          </>
        )}

        {/* Naive cross-section bracket */}
        {showNaiveCross && (
          <>
            <line
              x1={tPost.x + 14} y1={naiveCrossGapTop}
              x2={tPost.x + 14} y2={naiveCrossGapBot}
              stroke="#f59e0b" strokeWidth={1.5}
            />
            <line x1={tPost.x + 10} y1={naiveCrossGapTop} x2={tPost.x + 18} y2={naiveCrossGapTop} stroke="#f59e0b" strokeWidth={1.5} />
            <line x1={tPost.x + 10} y1={naiveCrossGapBot} x2={tPost.x + 18} y2={naiveCrossGapBot} stroke="#f59e0b" strokeWidth={1.5} />
            <text x={tPost.x + 22} y={(naiveCrossGapTop + naiveCrossGapBot) / 2 + 4} className="text-[9px] fill-amber-600">
              +{fmt(POST_TREATED - POST_CONTROL)}k
            </text>
          </>
        )}

        {/* DiD effect bracket */}
        {showEffect && (
          <>
            <line
              x1={tPost.x + 14} y1={didGapTop}
              x2={tPost.x + 14} y2={didGapBot}
              stroke="#10b981" strokeWidth={1.5}
            />
            <line x1={tPost.x + 10} y1={didGapTop} x2={tPost.x + 18} y2={didGapTop} stroke="#10b981" strokeWidth={1.5} />
            <line x1={tPost.x + 10} y1={didGapBot} x2={tPost.x + 18} y2={didGapBot} stroke="#10b981" strokeWidth={1.5} />
            <text x={tPost.x + 22} y={(didGapTop + didGapBot) / 2 + 4} className="text-[9px] fill-emerald-600" fontWeight="600">
              DiD={fmt(TRUE_ATT)}k
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Parallel-trends violation chart.
 * Shows multiple pre-periods where the trends diverge before treatment,
 * making the parallel trends assumption visually implausible.
 *
 * Props:
 *   divergeFactor — 0 (parallel) to 1 (strongly diverging pre-trends)
 */
function ParallelTrendsChart({ divergeFactor = 0 }) {
  // Three pre-periods (-2, -1, 0=baseline) + 1 post period
  const periods = [-2, -1, 0, 1];
  const trendDiff = divergeFactor * 4; // extra per-period drift for treated

  // Control: flat pre-trend, then +CONTROL_TREND in post
  const controlVals = {
    [-2]: BASE_CONTROL - CONTROL_TREND,
    [-1]: BASE_CONTROL - CONTROL_TREND / 2,
    [0]: BASE_CONTROL,
    [1]: POST_CONTROL,
  };

  // Treated: if diverge=0 then parallel to control before, else drifts extra
  const treatedVals = {
    [-2]: BASE_TREATED - CONTROL_TREND - trendDiff * 2,
    [-1]: BASE_TREATED - CONTROL_TREND / 2 - trendDiff,
    [0]: BASE_TREATED,
    [1]: POST_TREATED,
  };

  const allVals = [...Object.values(controlVals), ...Object.values(treatedVals)];
  const yMin = Math.min(...allVals) - 3;
  const yMax = Math.max(...allVals) + 3;
  const yRange = yMax - yMin;

  const xDomain = [-2, 1];
  const sx = (p) => PAD.left + ((p - xDomain[0]) / (xDomain[1] - xDomain[0])) * PW;
  const sy = (v) => PAD.top + PH * (1 - (v - yMin) / yRange);

  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const v = yMin + (i / 4) * yRange;
    return Math.round(v * 10) / 10;
  });

  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-1">
        Pre-period trend check ({divergeFactor === 0 ? "parallel — assumption plausible" : "diverging — assumption suspect"})
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#cbd5e1" />
        <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} stroke="#cbd5e1" />

        {/* Y ticks + grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left - 4} y1={sy(v)}
              x2={PAD.left + PW} y2={sy(v)}
              stroke="#f1f5f9" strokeWidth={0.5}
            />
            <line x1={PAD.left - 4} y1={sy(v)} x2={PAD.left} y2={sy(v)} stroke="#cbd5e1" />
            <text x={PAD.left - 7} y={sy(v) + 4} textAnchor="end" className="text-[10px] fill-slate-500">
              {v.toFixed(0)}k
            </text>
          </g>
        ))}

        {/* X ticks */}
        {periods.map((p) => (
          <g key={p}>
            <line x1={sx(p)} y1={PAD.top + PH} x2={sx(p)} y2={PAD.top + PH + 4} stroke="#cbd5e1" />
            <text x={sx(p)} y={H - 6} textAnchor="middle" className="text-[10px] fill-slate-500">
              {p === 1 ? "Post" : `t=${p}`}
            </text>
          </g>
        ))}

        {/* Campaign start vertical */}
        <line
          x1={sx(0.5)} y1={PAD.top}
          x2={sx(0.5)} y2={PAD.top + PH}
          stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 3"
        />
        <text x={sx(0.5)} y={PAD.top - 4} textAnchor="middle" className="text-[9px] fill-slate-400">
          campaign →
        </text>

        {/* Control line */}
        <polyline
          points={periods.map((p) => `${sx(p)},${sy(controlVals[p])}`).join(" ")}
          fill="none" stroke="#94a3b8" strokeWidth={2}
        />
        {periods.map((p) => (
          <circle key={p} cx={sx(p)} cy={sy(controlVals[p])} r={3.5} fill="#94a3b8" />
        ))}
        <text x={sx(-2) - 6} y={sy(controlVals[-2]) + 4} textAnchor="end" className="text-[9px] fill-slate-500">
          {CITIES.control}
        </text>

        {/* Treated line */}
        <polyline
          points={periods.map((p) => `${sx(p)},${sy(treatedVals[p])}`).join(" ")}
          fill="none" stroke="#1e293b" strokeWidth={2.5}
        />
        {periods.map((p) => (
          <circle key={p} cx={sx(p)} cy={sy(treatedVals[p])} r={3.5} fill="#1e293b" />
        ))}
        <text x={sx(-2) - 6} y={sy(treatedVals[-2]) - 6} textAnchor="end" className="text-[9px] fill-slate-700" fontWeight="600">
          {CITIES.treated}
        </text>

        {/* Divergence annotation */}
        {divergeFactor > 0.3 && (
          <text
            x={sx(-1.5)} y={sy((treatedVals[-1] + controlVals[-1]) / 2)}
            textAnchor="middle" className="text-[9px] fill-red-400"
          >
            pre-trend gap!
          </text>
        )}
      </svg>
    </div>
  );
}

/**
 * Interactive 2×2 DiD table showing the four cell values and the two differences.
 */
function DidTable({ treatEffect, controlTrend }) {
  const preTreated = BASE_TREATED;
  const postTreated = BASE_TREATED + controlTrend + treatEffect;
  const preControl = BASE_CONTROL;
  const postControl = BASE_CONTROL + controlTrend;

  const diffTreated = postTreated - preTreated;
  const diffControl = postControl - preControl;
  const did = diffTreated - diffControl;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600"></th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">Before</th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">After</th>
            <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">After − Before</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-700">{CITIES.treated} (treated)</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-slate-600">{fmt(preTreated)}k</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-slate-600">{fmt(postTreated)}k</td>
            <td className="border border-slate-200 px-3 py-2 text-center font-medium text-amber-700">+{fmt(diffTreated)}k</td>
          </tr>
          <tr>
            <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-500">{CITIES.control} (control)</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-slate-500">{fmt(preControl)}k</td>
            <td className="border border-slate-200 px-3 py-2 text-center text-slate-500">{fmt(postControl)}k</td>
            <td className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-500">+{fmt(diffControl)}k</td>
          </tr>
          <tr className="bg-emerald-50">
            <td className="border border-slate-200 px-3 py-2 font-semibold text-emerald-800" colSpan={3}>
              DiD = (After−Before)<sub>treated</sub> − (After−Before)<sub>control</sub>
            </td>
            <td className="border border-slate-200 px-3 py-2 text-center font-bold text-emerald-700 text-base">
              {fmt(did)}k
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  Lessons                                                            */
/* ================================================================== */

const LESSONS = [
  "Billboard Mystery",
  "Two Naïve Estimators",
  "The DiD Idea",
  "DiD by Hand",
  "DiD as Regression",
  "Parallel Trends",
  "Quiz",
];

/* ================================================================== */
/*  Tutorial                                                           */
/* ================================================================== */

export default function DifferenceInDifferencesTutorial() {
  // Step 3 (DiD by Hand) — interactive table sliders
  const [treatEffect4, setTreatEffect4] = useState([7.6]);
  const [controlTrend4, setControlTrend4] = useState([3.8]);

  // Step 5 (Parallel Trends) — toggle
  const [diverging, setDiverging] = useState(false);

  const intro = (
    <>
      <p>
        A bank runs a billboard campaign in one city and wants to know whether it
        actually increased deposits — but it can only observe the city where
        billboards appeared.{" "}
        <span className="font-semibold">Difference-in-Differences</span> solves
        this by using a <em>control city</em> that received no treatment to build
        the counterfactual trend.
      </p>
      <p>
        This tutorial follows Chapter 13 of{" "}
        <em>Causal Inference for the Brave and True</em> by Matheus Facure.
      </p>
    </>
  );

  return (
    <TutorialShell
      title="Difference-in-Differences"
      description="Learn Difference-in-Differences (DiD), a method that uses control-group trends to build counterfactuals — from the intuition behind parallel trends to the regression implementation."
      intro={intro}
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {/* ── Step 0: Billboard Mystery ───────────────────────────── */}
          {step === 0 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TrendingUp className="h-6 w-6" /> Billboard Mystery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    A retail bank wants to measure the impact of a billboard
                    advertising campaign on bank deposits. In July, they roll out
                    large billboards across{" "}
                    <span className="font-semibold">Porto Alegre</span>. The city
                    of <span className="font-semibold">Florianópolis</span>{" "}
                    receives no billboards and serves as a natural comparison.
                  </p>
                  <p>
                    Deposits (in R$ thousands) are measured once before and once
                    after the campaign. The bank observes:
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <StatCard
                      label="Porto Alegre — Before"
                      value={`R$ ${fmt(BASE_TREATED)}k`}
                      description="Treated city, pre-campaign"
                    />
                    <StatCard
                      label="Porto Alegre — After"
                      value={`R$ ${fmt(POST_TREATED)}k`}
                      description="Treated city, post-campaign"
                    />
                    <StatCard
                      label="Florianópolis — Before"
                      value={`R$ ${fmt(BASE_CONTROL)}k`}
                      description="Control city, pre-campaign"
                    />
                    <StatCard
                      label="Florianópolis — After"
                      value={`R$ ${fmt(POST_CONTROL)}k`}
                      description="Control city, post-campaign"
                    />
                  </div>
                  <InfoBox title="The core question" variant="dark">
                    <p>
                      Deposits in Porto Alegre rose by R$ {fmt(POST_TREATED - BASE_TREATED)}k. But some
                      of that increase would have happened anyway — the economy was
                      growing nationally. How much of the rise was actually caused
                      by the billboards?
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 1: Two Naïve Estimators ────────────────────────── */}
          {step === 1 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <AlertTriangle className="h-6 w-6" /> Two Naïve Estimators
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Before reaching for DiD, it is instructive to see why two
                    simpler estimators both give wrong answers.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <InfoBox title="Estimator 1 — Before vs. After (Porto Alegre only)" variant="warning">
                        <p>
                          Compare deposits in Porto Alegre before and after the
                          campaign.
                        </p>
                        <Tex
                          block
                          math="\hat\tau_{\text{BA}} = Y_{\text{POA,After}} - Y_{\text{POA,Before}} = 63.9 - 52.5 = +11.4k"
                        />
                        <p className="mt-1 text-slate-600">
                          This is <span className="font-semibold">upward-biased</span> — it
                          conflates the billboard effect with the national economic
                          trend that would have lifted deposits anyway.
                        </p>
                      </InfoBox>

                      <InfoBox title="Estimator 2 — Cross-section (Post only)" variant="warning">
                        <p>
                          Compare Porto Alegre to Florianópolis in the post period
                          only.
                        </p>
                        <Tex
                          block
                          math="\hat\tau_{\text{CS}} = Y_{\text{POA,After}} - Y_{\text{FLN,After}} = 63.9 - 47.0 = +16.9k"
                        />
                        <p className="mt-1 text-slate-600">
                          This is <span className="font-semibold">also biased</span> — Porto
                          Alegre already had higher deposits before the campaign,
                          so the post-period gap picks up pre-existing differences.
                        </p>
                      </InfoBox>

                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="True billboard effect"
                          value={`+${fmt(TRUE_ATT)}k`}
                          description="What we are trying to recover"
                        />
                        <StatCard
                          label="Before-after bias"
                          value={`+${fmt(POST_TREATED - BASE_TREATED - TRUE_ATT)}k`}
                          description="Mistakenly attributed to billboards"
                        />
                      </div>
                    </div>

                    <TrendsChart
                      showNaiveBefore
                      showNaiveCross
                      title="Deposit trends — naïve estimates highlighted"
                    />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 2: The DiD Idea ─────────────────────────────────── */}
          {step === 2 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <GitBranch className="h-6 w-6" /> The DiD Idea
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    DiD surgically combines the two naïve approaches to cancel
                    out both biases.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <InfoBox title="The counterfactual" variant="outline">
                        <p>
                          We never observe what Porto Alegre deposits would have
                          been <em>without</em> billboards. But if both cities
                          would have followed the <strong>same trend</strong>{" "}
                          absent treatment, we can use Florianópolis's trend as a
                          stand-in.
                        </p>
                        <Tex
                          block
                          math="Y^{(0)}_{\text{POA,After}} \approx Y_{\text{POA,Before}} + (Y_{\text{FLN,After}} - Y_{\text{FLN,Before}})"
                        />
                      </InfoBox>

                      <InfoBox title="Parallel trends assumption" variant="dark">
                        <p>
                          In the absence of treatment, the treated and control
                          groups would have experienced the <em>same time trend</em>:
                        </p>
                        <Tex
                          block
                          math="\mathbb{E}[Y^{(0)}_{t=1} - Y^{(0)}_{t=0} \mid D=1] = \mathbb{E}[Y^{(0)}_{t=1} - Y^{(0)}_{t=0} \mid D=0]"
                        />
                        <p className="mt-1 text-slate-500 text-[13px]">
                          This is an <em>untestable</em> assumption about a
                          counterfactual — but it can be made plausible with
                          pre-treatment data.
                        </p>
                      </InfoBox>

                      <InfoBox title="Plugging in the numbers" variant="formula">
                        <p className="mb-2 text-[13px]">
                          Porto Alegre's change minus Florianópolis's change:
                        </p>
                        <Tex
                          block
                          math={`\\hat\\tau_{\\text{DiD}} = (\\underbrace{${fmt(POST_TREATED)}}_{\\text{POA after}} - \\underbrace{${fmt(BASE_TREATED)}}_{\\text{POA before}}) - (\\underbrace{${fmt(POST_CONTROL)}}_{\\text{FLN after}} - \\underbrace{${fmt(BASE_CONTROL)}}_{\\text{FLN before}}) = ${fmt(POST_TREATED - BASE_TREATED)}\\! -\\! ${fmt(POST_CONTROL - BASE_CONTROL)} = ${fmt(TRUE_ATT)}\\text{k}`}
                        />
                        <p className="mt-2 text-[13px] text-slate-500">
                          The R$ {fmt(POST_TREATED - BASE_TREATED)}k total rise in Porto Alegre included
                          R$ {fmt(CONTROL_TREND)}k of background growth (visible in Florianópolis).
                          Subtracting that leaves R$ {fmt(TRUE_ATT)}k — the billboard effect.
                        </p>
                      </InfoBox>
                    </div>

                    <TrendsChart
                      showCounterfactual={true}
                      showEffect={true}
                      title="Counterfactual trend + DiD estimate"
                    />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 3: DiD by Hand ──────────────────────────────────── */}
          {step === 3 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <TableProperties className="h-6 w-6" /> DiD by Hand
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The DiD estimator is easiest to see as a{" "}
                    <span className="font-semibold">2×2 table</span>: rows are
                    groups (treated / control), columns are time (before / after).
                    The estimator is the difference-of-differences of the four
                    cells.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <LabeledSlider
                        label="True billboard effect (k R$)"
                        value={treatEffect4}
                        onValueChange={setTreatEffect4}
                        min={0}
                        max={20}
                        step={0.1}
                        valueDisplay={`+${fmt(treatEffect4[0])}k`}
                      />
                      <LabeledSlider
                        label="Background economic trend (k R$)"
                        value={controlTrend4}
                        onValueChange={setControlTrend4}
                        min={0}
                        max={10}
                        step={0.1}
                        valueDisplay={`+${fmt(controlTrend4[0])}k`}
                      />
                      <InfoBox variant="muted">
                        <p>
                          No matter how large the background trend is, DiD
                          subtracts it out. The DiD cell always recovers the true
                          billboard effect.
                        </p>
                      </InfoBox>
                    </div>

                    <div className="space-y-4">
                      <DidTable treatEffect={treatEffect4[0]} controlTrend={controlTrend4[0]} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <StatCard
                          label="DiD estimate"
                          value={`+${fmt(treatEffect4[0])}k`}
                          description="Always equals the true effect"
                        />
                        <StatCard
                          label="Background trend"
                          value={`+${fmt(controlTrend4[0])}k`}
                          description="Subtracted out by control group"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 4: DiD as Regression ────────────────────────────── */}
          {step === 4 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FunctionSquare className="h-6 w-6" /> DiD as Regression
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    Instead of computing the 2×2 table by hand, we can encode DiD
                    as a single OLS regression. Each customer observation gets two
                    dummy variables — <Tex math="\text{POA}_i" /> (1 if Porto Alegre)
                    and <Tex math="\text{Post}_t" /> (1 if post-campaign) — plus their
                    interaction:
                  </p>

                  <Tex
                    block
                    math="\text{Deposits}_{it} = \alpha + \beta\;\text{POA}_i + \gamma\;\text{Post}_t + \delta\;(\text{POA}_i \times \text{Post}_t) + \varepsilon_{it}"
                  />

                  <p>
                    Each coefficient maps to one piece of the billboard story:
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600">Coefficient</th>
                          <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600">Meaning</th>
                          <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-200 px-3 py-2"><Tex math="\alpha" /></td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-600">Florianópolis deposits, pre-campaign</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{fmt(BASE_CONTROL)}k</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 px-3 py-2"><Tex math="\beta" /></td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-600">How much higher Porto Alegre already was</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">+{fmt(BASE_TREATED - BASE_CONTROL)}k</td>
                        </tr>
                        <tr>
                          <td className="border border-slate-200 px-3 py-2"><Tex math="\gamma" /></td>
                          <td className="border border-slate-200 px-3 py-2 text-slate-600">Economy-wide growth (seen in Florianópolis)</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">+{fmt(CONTROL_TREND)}k</td>
                        </tr>
                        <tr className="bg-emerald-50">
                          <td className="border border-slate-200 px-3 py-2 font-semibold"><Tex math="\delta" /></td>
                          <td className="border border-slate-200 px-3 py-2 font-semibold text-emerald-800">Billboard effect (the DiD estimate)</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-bold text-emerald-700">+{fmt(TRUE_ATT)}k</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <InfoBox title="Verify: what does the model predict for Porto Alegre, post-campaign?" variant="muted">
                    <Tex
                      block
                      math={`\\alpha + \\beta + \\gamma + \\delta = ${fmt(BASE_CONTROL)} + ${fmt(BASE_TREATED - BASE_CONTROL)} + ${fmt(CONTROL_TREND)} + ${fmt(TRUE_ATT)} = ${fmt(POST_TREATED)}\\text{k}`}
                    />
                    <p className="text-slate-500 text-[13px] mt-1">
                      Exactly the observed post-campaign deposits. The regression
                      decomposes the total into baseline, city gap, trend, and
                      billboard effect — and <Tex math="\delta" /> is the DiD estimate.
                    </p>
                  </InfoBox>

                  <InfoBox title="What a real regression output looks like" variant="outline">
                    <p className="mb-2 text-[13px]">
                      Running <code className="text-xs bg-slate-100 px-1 rounded">deposits ~ poa * jul</code> on
                      the Facure billboard dataset gives:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse font-mono">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border border-slate-200 px-2 py-1 text-left">Term</th>
                            <th className="border border-slate-200 px-2 py-1 text-right">Coef</th>
                            <th className="border border-slate-200 px-2 py-1 text-right">Std Err</th>
                            <th className="border border-slate-200 px-2 py-1 text-right">p</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-slate-200 px-2 py-1">Intercept</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">171.64</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">2.363</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">0.000</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-200 px-2 py-1">poa</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">−125.63</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">4.484</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">0.000</td>
                          </tr>
                          <tr>
                            <td className="border border-slate-200 px-2 py-1">jul</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">34.52</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">3.036</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">0.000</td>
                          </tr>
                          <tr className="bg-emerald-50">
                            <td className="border border-slate-200 px-2 py-1 font-semibold">poa:jul</td>
                            <td className="border border-slate-200 px-2 py-1 text-right font-semibold">6.52</td>
                            <td className="border border-slate-200 px-2 py-1 text-right">5.729</td>
                            <td className="border border-slate-200 px-2 py-1 text-right text-amber-600 font-semibold">0.255</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[13px] text-slate-500">
                      The DiD coefficient <Tex math="\hat\delta = 6.52" /> matches the manual calculation —
                      but the p-value is 0.255. The billboard campaign did not produce a
                      statistically significant increase in deposits. This is a realistic
                      outcome: even with a plausible design, the effect may be too small
                      relative to the noise.
                    </p>
                  </InfoBox>

                  <InfoBox title="Why use regression?" variant="muted">
                    <ul className="space-y-1 text-[13px]">
                      <li>You get <strong>standard errors</strong> and p-values for free — the 2×2 table alone can't tell you if the effect is significant.</li>
                      <li>You can add covariates <Tex math="X_{it}" /> for conditional parallel trends.</li>
                      <li>It generalises to unit and time <strong>fixed effects</strong> (Two-Way FE) for multiple periods and groups.</li>
                    </ul>
                  </InfoBox>

                  <InfoBox title="Watch out: aggregated data" variant="warning">
                    <p>
                      If you only have group-level averages (e.g. one mean per city per
                      period), you can still compute the DiD point estimate — but you{" "}
                      <strong>cannot construct confidence intervals</strong>. Aggregation
                      squashes the within-group variance that standard errors need.
                      Always work with individual-level data when possible.
                    </p>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 5: Parallel Trends ──────────────────────────────── */}
          {step === 5 && (
            <StepContent className="space-y-4">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BarChart3 className="h-6 w-6" /> Parallel Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    The parallel trends assumption is the load-bearing pillar of
                    DiD. It cannot be proven — only made more or less credible
                    using pre-treatment data.
                  </p>

                  <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <span
                          role="switch"
                          aria-checked={diverging}
                          onClick={() => setDiverging((d) => !d)}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            diverging ? "bg-red-400" : "bg-emerald-400"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              diverging ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </span>
                        <span className={`text-sm font-medium ${diverging ? "text-red-700" : "text-emerald-700"}`}>
                          {diverging ? "Diverging pre-trends — assumption violated" : "Parallel pre-trends — assumption plausible"}
                        </span>
                      </label>

                      <InfoBox title="How to check" variant="outline">
                        <ul className="space-y-1 text-[13px]">
                          <li>Plot trends in <em>multiple pre-periods</em> for both groups.</li>
                          <li>If they move in parallel before treatment, the assumption is plausible.</li>
                          <li>A "placebo test": run DiD on a pre-treatment period — the estimate should be near zero.</li>
                        </ul>
                      </InfoBox>

                      <InfoBox title="When it fails" variant="warning">
                        <p>
                          If treated cities were already growing faster
                          (e.g., Porto Alegre was booming before billboards
                          appeared), DiD will overstate the causal effect.
                          Possible remedies:
                        </p>
                        <ul className="space-y-1 text-[13px] mt-1">
                          <li>Synthetic control methods</li>
                          <li>Matching on pre-trends</li>
                          <li>Conditional parallel trends with covariates</li>
                        </ul>
                      </InfoBox>
                    </div>

                    <ParallelTrendsChart divergeFactor={diverging ? 0.8 : 0} />
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {/* ── Step 6: Quiz ─────────────────────────────────────────── */}
          {step === 6 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question="What does the DiD estimator subtract out that a simple before-after comparison misses?"
                options={[
                  "Individual-level noise",
                  "The common time trend shared by both groups",
                  "Pre-existing selection into treatment",
                  "The placebo effect",
                ]}
                correctIndex={1}
                explanation="DiD subtracts the control group's change over time (the common trend) from the treated group's change, leaving only the treatment effect."
              />
              <QuizCard
                question="In the regression formulation, which coefficient captures the DiD estimate?"
                options={[
                  "The intercept α",
                  "The Treated indicator β",
                  "The Post indicator γ",
                  "The interaction term δ (Treated × Post)",
                ]}
                correctIndex={3}
                explanation="The interaction term Treated × Post equals 1 only for the treated group in the post period — exactly the cell where treatment occurs. Its coefficient δ is the DiD estimate."
              />
              <QuizCard
                question="What is the parallel trends assumption?"
                options={[
                  "Both groups must have identical outcomes before treatment",
                  "The treatment must be randomly assigned",
                  "Absent treatment, both groups would have experienced the same time trend",
                  "The control group must be larger than the treated group",
                ]}
                correctIndex={2}
                explanation="Parallel trends says the counterfactual trajectory of the treated group (had it not been treated) would have been the same as the control group's observed trajectory."
              />
              <QuizCard
                question="What is a practical way to check the plausibility of the parallel trends assumption?"
                options={[
                  "Run a t-test on post-period outcomes",
                  "Plot trends in multiple pre-treatment periods and look for divergence",
                  "Increase the sample size",
                  "Add more control variables to the post-period regression",
                ]}
                correctIndex={1}
                explanation="Multiple pre-period plots (a 'pre-trends plot') allow researchers to visually verify that treated and control groups moved in parallel before treatment. A placebo DiD on pre-periods should yield near-zero estimates."
              />
            </StepContent>
          )}
        </>
      )}
    </TutorialShell>
  );
}
