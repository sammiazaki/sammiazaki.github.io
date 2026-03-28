import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sigma, BarChart3 } from "lucide-react";
import {
  TutorialShell,
  StepContent,
  QuizCard,
  StatCard,
  InfoBox,
  LabeledSlider,
} from "@/components/tutorial";

function fmt(x, digits = 3) {
  return Number(x).toFixed(digits);
}

function zForConfidence(confidencePct) {
  const table = [
    [80, 1.282],
    [83.4, 1.385],
    [90, 1.645],
    [95, 1.96],
    [99, 2.576],
  ];
  let closest = table[0][1];
  let minDiff = Infinity;
  for (const [c, z] of table) {
    const d = Math.abs(c - confidencePct);
    if (d < minDiff) {
      minDiff = d;
      closest = z;
    }
  }
  return closest;
}

function interval(mean, se, z) {
  return { low: mean - z * se, high: mean + z * se };
}

function LinePlot({ mean1, se1, mean2, se2, confidence }) {
  const z = zForConfidence(confidence);
  const ci1 = interval(mean1, se1, z);
  const ci2 = interval(mean2, se2, z);
  const diff = mean1 - mean2;
  const seDiff = Math.sqrt(se1 ** 2 + se2 ** 2);
  const diffCI = interval(diff, seDiff, 1.96);
  const overlap = !(ci1.high < ci2.low || ci2.high < ci1.low);
  const significant = !(diffCI.low <= 0 && diffCI.high >= 0);

  const minX = Math.min(ci1.low, ci2.low, diffCI.low + mean2) - 0.05;
  const maxX = Math.max(ci1.high, ci2.high, diffCI.high + mean2) + 0.05;
  const range = maxX - minX;
  const x = (v) => ((v - minX) / range) * 100;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-4 bg-white">
        <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
          <span>Group-level confidence intervals ({confidence}%)</span>
          <span>Correct test uses 95% CI of the difference</span>
        </div>

        <div className="space-y-6">
          {[
            { label: "Group A", ci: ci1, mean: mean1 },
            { label: "Group B", ci: ci2, mean: mean2 },
          ].map((item) => (
            <div key={item.label} className="relative h-12">
              <div className="absolute left-0 top-0 text-sm font-medium text-slate-700">
                {item.label}
              </div>
              <div className="absolute left-20 right-2 top-5 h-px bg-slate-200" />
              <div
                className="absolute top-4 h-2 rounded-full bg-slate-800"
                style={{
                  left: `calc(${x(item.ci.low)}% + 5rem)`,
                  width: `${x(item.ci.high) - x(item.ci.low)}%`,
                }}
              />
              <div
                className="absolute top-2 h-6 w-1 rounded bg-slate-500"
                style={{ left: `calc(${x(item.mean)}% + 5rem)` }}
              />
            </div>
          ))}

          <div className="relative h-16 rounded-xl bg-slate-50 p-3">
            <div className="text-sm font-medium text-slate-700">Difference: A − B</div>
            <div className="absolute left-3 right-3 top-9 h-px bg-slate-200" />
            <div className="absolute left-1/2 top-5 h-8 w-px bg-slate-300" />
            <div
              className="absolute top-8 h-2 rounded-full bg-slate-900"
              style={{
                left: `${((diffCI.low + 0.3) / 0.6) * 100}%`,
                width: `${((diffCI.high - diffCI.low) / 0.6) * 100}%`,
              }}
            />
            <div
              className="absolute top-6 h-6 w-1 rounded bg-slate-600"
              style={{ left: `${((diff + 0.3) / 0.6) * 100}%` }}
            />
            <div className="absolute left-[calc(50%-0.25rem)] top-1 text-xs text-slate-500">
              0
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoBox title="Naive visual rule" variant="outline">
          <div className="text-lg font-semibold mt-1">
            {overlap ? "Intervals overlap" : "Intervals do not overlap"}
          </div>
          Using overlap of separate intervals as a significance test is unreliable.
        </InfoBox>
        <InfoBox title="Correct inference" variant="outline">
          <div className="text-lg font-semibold mt-1">
            {significant ? "Difference is significant" : "Difference is not significant"}
          </div>
          Based on whether the 95% CI for A − B contains 0.
        </InfoBox>
      </div>

      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <StatCard label="A interval" value={`[${fmt(ci1.low)}, ${fmt(ci1.high)}]`} />
        <StatCard label="B interval" value={`[${fmt(ci2.low)}, ${fmt(ci2.high)}]`} />
        <StatCard label="95% CI for A − B" value={`[${fmt(diffCI.low)}, ${fmt(diffCI.high)}]`} />
      </div>
    </div>
  );
}

const LESSONS = [
  "The common mistake",
  "What should be tested",
  "Play with overlap",
  "Why 83.4% appears",
  "Quick checks",
];

export default function CIOverlapTutorial() {
  const [mean1, setMean1] = useState([0.56]);
  const [mean2, setMean2] = useState([0.44]);
  const [se1, setSe1] = useState([0.0351]);
  const [se2, setSe2] = useState([0.0351]);
  const [confidence, setConfidence] = useState([95]);

  const z = zForConfidence(confidence[0]);
  const ci1 = interval(mean1[0], se1[0], z);
  const ci2 = interval(mean2[0], se2[0], z);
  const diff = mean1[0] - mean2[0];
  const seDiff = Math.sqrt(se1[0] ** 2 + se2[0] ** 2);
  const diffCI = interval(diff, seDiff, 1.96);
  const significant = !(diffCI.low <= 0 && diffCI.high >= 0);
  const equalSEThreshold = 1.96 * Math.sqrt(2);

  function resetDefaults() {
    setMean1([0.56]);
    setMean2([0.44]);
    setSe1([0.0351]);
    setSe2([0.0351]);
    setConfidence([95]);
  }

  const intro = (
    <>
      <p>
        The core claim is simple:{" "}
        <span className="font-semibold">
          overlap between two separate confidence intervals is not the right test
        </span>{" "}
        for whether two estimates differ.
      </p>
      <p>
        The correct object is the{" "}
        <span className="font-semibold">confidence interval for the difference</span>,
        not the two intervals viewed separately. The blog also notes a useful visual
        shortcut: when standard errors are similar, non-overlap of roughly{" "}
        <span className="font-semibold">83.4%</span> intervals aligns with a 5%
        two-sided test.
      </p>
    </>
  );

  return (
    <TutorialShell
      title="Overlapping confidence intervals"
      description={"An interactive tutorial based on Vasco Yasenov\u2019s post, \u201cOverlapping Confidence Intervals and Statistical (In)Significance.\u201d"}
      intro={intro}
      lessons={LESSONS}
    >
      {(step) => (
        <>
          {step === 0 && (
            <StepContent>
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <BarChart3 className="h-6 w-6" /> The common mistake
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 text-slate-700">
                    <p>
                      People often compare two means by looking at whether their 95%
                      confidence intervals overlap.
                    </p>
                    <InfoBox title="Naive rule" variant="muted">
                      "If the 95% intervals overlap, the difference is not significant."
                    </InfoBox>
                    <InfoBox title="Problem" variant="dark">
                      Those intervals describe uncertainty around each estimate
                      separately, not around the difference between them.
                    </InfoBox>
                  </div>
                  <InfoBox title="Blog example" variant="outline" className="bg-white">
                    <ul className="space-y-2 list-disc pl-5">
                      <li>Estimate A = 0.56</li>
                      <li>Estimate B = 0.44</li>
                      <li>SE(A) = SE(B) = 0.0351</li>
                      <li>95% intervals overlap</li>
                      <li>
                        But the 95% CI for A − B is [0.02, 0.22], so the difference is
                        significant
                      </li>
                    </ul>
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {step === 1 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">What should be tested</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="formula">H₀: Y₁ = Y₂</InfoBox>
                  <InfoBox title="Incorrect focus" variant="outline">
                    <div className="font-mono">Ŷ₁ ± 1.96·SE₁ and Ŷ₂ ± 1.96·SE₂</div>
                  </InfoBox>
                  <InfoBox title="Correct focus" variant="outline">
                    <div className="font-mono">(Ŷ₁−Ŷ₂) ± 1.96·√(SE₁² + SE₂²)</div>
                  </InfoBox>
                  <p>
                    A two-sided 5% test rejects the null when the confidence interval
                    for the difference excludes 0.
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Current calculations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <StatCard
                    label="Difference"
                    value={fmt(diff)}
                    className="bg-slate-50 border-0"
                  />
                  <StatCard
                    label="SE of difference"
                    value={fmt(seDiff, 4)}
                    className="bg-slate-50 border-0"
                  />
                  <StatCard
                    label="95% CI for difference"
                    value={`[${fmt(diffCI.low)}, ${fmt(diffCI.high)}]`}
                    className="bg-slate-50 border-0"
                  />
                  <div
                    className={`rounded-2xl p-4 ${significant ? "bg-emerald-50" : "bg-amber-50"}`}
                  >
                    <div className="font-semibold">Decision</div>
                    <div className="mt-1">
                      {significant ? "Reject H₀" : "Do not reject H₀"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {step === 2 && (
            <StepContent className="space-y-4">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Play with overlap</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-5">
                    <LabeledSlider
                      label="Mean A"
                      value={mean1}
                      displayValue={fmt(mean1[0], 3)}
                      onValueChange={setMean1}
                      min={0.2}
                      max={0.8}
                      step={0.005}
                    />
                    <LabeledSlider
                      label="Mean B"
                      value={mean2}
                      displayValue={fmt(mean2[0], 3)}
                      onValueChange={setMean2}
                      min={0.2}
                      max={0.8}
                      step={0.005}
                    />
                    <LabeledSlider
                      label="SE A"
                      value={se1}
                      displayValue={fmt(se1[0], 4)}
                      onValueChange={setSe1}
                      min={0.01}
                      max={0.08}
                      step={0.001}
                    />
                    <LabeledSlider
                      label="SE B"
                      value={se2}
                      displayValue={fmt(se2[0], 4)}
                      onValueChange={setSe2}
                      min={0.01}
                      max={0.08}
                      step={0.001}
                    />
                    <LabeledSlider
                      label="Displayed CI level"
                      value={confidence}
                      displayValue={`${confidence[0]}%`}
                      onValueChange={setConfidence}
                      min={80}
                      max={99}
                      step={0.1}
                    />
                    <Button variant="outline" onClick={resetDefaults}>
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset example
                    </Button>
                  </div>

                  <LinePlot
                    mean1={mean1[0]}
                    se1={se1[0]}
                    mean2={mean2[0]}
                    se2={se2[0]}
                    confidence={confidence[0]}
                  />
                </CardContent>
              </Card>
            </StepContent>
          )}

          {step === 3 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sigma className="h-6 w-6" /> Why 83.4% appears
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <p>
                    When both groups have about the same standard error, significance at
                    the 5% level requires:
                  </p>
                  <InfoBox variant="formula">
                    |X̄₁ − X̄₂| &gt; 1.96·√2·SE ≈ {fmt(equalSEThreshold, 3)}·SE
                  </InfoBox>
                  <p>
                    For two displayed intervals to just stop overlapping, each half-width
                    must be half that required separation.
                  </p>
                  <InfoBox variant="formula">
                    z·SE = (1.96·√2·SE)/2 = 1.385·SE
                  </InfoBox>
                  <p>
                    A z-score of about 1.385 corresponds to an 83.4% two-sided interval.
                  </p>
                  <InfoBox variant="dark">
                    Heuristic: with roughly equal SEs, non-overlap of 83.4% intervals is
                    a decent visual proxy for p &lt; 0.05.
                  </InfoBox>
                </CardContent>
              </Card>

              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Interpretation guardrail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox title="Useful when" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>Two estimates are independent</li>
                      <li>Standard errors are similar</li>
                      <li>You need a quick visual approximation</li>
                    </ul>
                  </InfoBox>
                  <InfoBox title="Not enough when" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>SEs differ materially</li>
                      <li>The estimates are correlated</li>
                      <li>You need the actual inferential result</li>
                    </ul>
                  </InfoBox>
                  <InfoBox variant="warning">
                    Final rule: use the CI of the difference for the real decision. Treat
                    83.4% as a visual shortcut, not a replacement.
                  </InfoBox>
                </CardContent>
              </Card>
            </StepContent>
          )}

          {step === 4 && (
            <StepContent className="grid gap-4 md:grid-cols-2">
              <QuizCard
                question="Two 95% confidence intervals overlap slightly. What follows?"
                options={[
                  "The difference is definitely not significant.",
                  "Nothing definitive yet; you need the confidence interval for the difference.",
                  "The p-value must be above 0.10.",
                  "The estimates are equal.",
                ]}
                correctIndex={1}
                explanation="Overlap of separate intervals does not answer the hypothesis test. The right question is whether the confidence interval for the difference includes 0."
              />
              <QuizCard
                question="Why is the naive overlap rule conservative at 95%?"
                options={[
                  "Because it implicitly uses a wider uncertainty band than the correct CI for the difference.",
                  "Because 95% intervals are too narrow.",
                  "Because confidence intervals cannot be compared visually at all.",
                  "Because standard errors cancel out.",
                ]}
                correctIndex={0}
                explanation="The naive rule effectively compares intervals using SE₁ + SE₂ instead of √(SE₁² + SE₂²), which is larger."
              />
              <QuizCard
                question="When does the 83.4% visual shortcut work best?"
                options={[
                  "When one standard error is much larger than the other.",
                  "When the sample means are identical.",
                  "When the two standard errors are roughly equal.",
                  "Always, regardless of setup.",
                ]}
                correctIndex={2}
                explanation="The 83.4% result comes from the equal-SE case. It is an approximation, not a general theorem for all designs."
              />
              <Card className="rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Takeaway</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-slate-700">
                  <InfoBox variant="dark">
                    <div className="text-base">
                      Do not ask whether two 95% intervals overlap.
                      <br />
                      Ask whether the 95% interval for their difference contains 0.
                    </div>
                  </InfoBox>
                  <InfoBox title="Practical memory aid" variant="outline">
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>95% CI overlap can still coexist with significance.</li>
                      <li>83.4% non-overlap is only a rough visual proxy.</li>
                      <li>The inferential object is the difference.</li>
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
