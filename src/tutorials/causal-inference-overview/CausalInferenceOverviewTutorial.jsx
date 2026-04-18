import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TutorialShell,
  StepContent,
  QuizCard,
  StatCard,
  InfoBox,
  Tex,
  CodeBlock,
} from "@/components/tutorial";

/* PythonCode — thin alias for CodeBlock with language="python" */
function PythonCode({ code }) {
  return <CodeBlock code={code} language="python" />;
}

/* ================================================================== */
/*  Causal Inference: A Map of the Territory                           */
/*                                                                     */
/*  Running example (Steps 1–3): 4-school tablet intervention.        */
/*    y0 = [500, 600, 800, 700], y1 = [450, 600, 600, 750]            */
/*    t  = [0,   0,   1,   1]                                          */
/*    observed y = [500, 600, 600, 750]                                */
/*    ATE = −50, ATT = −75, naive = +125, bias = +200                 */
/*                                                                     */
/*  Source: Facure, "Causal Inference for the Brave and True" Ch 1–10 */
/*  + Cunningham, "Causal Inference: The Mixtape"                      */
/* ================================================================== */

/* ================================================================== */
/*  Seeded RNG (mulberry32 + Box-Muller)                               */
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

/* ================================================================== */
/*  SVG Chart Components                                               */
/* ================================================================== */

/* ---- BalancePlot (Step 3) ---------------------------------------- */
/*  Left panel: self-selected — tablet schools cluster higher on Y₀.  */
/*  Right panel: RCT — both groups overlap.                            */

function BalancePlot() {
  const W = 460, H = 180;
  const PAD = { top: 20, right: 12, bottom: 36, left: 14 };
  const PW = (W - PAD.left - PAD.right) / 2 - 10; // half-width minus gap
  const PH = H - PAD.top - PAD.bottom;

  // Panel origins
  const ox0 = PAD.left;         // left panel x origin
  const ox1 = PAD.left + PW + 20; // right panel x origin
  const oy  = PAD.top;

  // y scale: Y₀ baseline scores 450–850
  const yMin = 400, yMax = 900;
  const sy = (v) => oy + PH * (1 - (v - yMin) / (yMax - yMin));

  // x scale within a panel: jitter along x (treat vs control side)
  // Self-selected: control x ~ 0.25, treated x ~ 0.75 within [0,1]
  // Points are deterministic sequences for reproducibility
  const rng = mulberry32(42);

  // Observational panel: T=0 low scores, T=1 high scores
  const obsT0 = Array.from({ length: 18 }, () => ({
    x: 0.1 + rng() * 0.35,
    y: 480 + rng() * 120,
  }));
  const obsT1 = Array.from({ length: 18 }, () => ({
    x: 0.55 + rng() * 0.35,
    y: 660 + rng() * 130,
  }));

  // RCT panel: both groups centred at same range
  const rng2 = mulberry32(99);
  const rctT0 = Array.from({ length: 18 }, () => ({
    x: 0.1 + rng2() * 0.35,
    y: 550 + rng2() * 140,
  }));
  const rctT1 = Array.from({ length: 18 }, () => ({
    x: 0.55 + rng2() * 0.35,
    y: 545 + rng2() * 140,
  }));

  const dot = (pts, ox, fill, opacity = 0.7) =>
    pts.map((p, i) => (
      <circle
        key={i}
        cx={ox + p.x * PW}
        cy={sy(p.y)}
        r={3.5}
        fill={fill}
        opacity={opacity}
      />
    ));

  const yTicks = [500, 600, 700, 800];

  const Panel = ({ ox, points0, points1, label }) => (
    <g>
      {/* axes */}
      <line x1={ox} y1={oy} x2={ox} y2={oy + PH} stroke="#cbd5e1" />
      <line x1={ox} y1={oy + PH} x2={ox + PW} y2={oy + PH} stroke="#cbd5e1" />
      {/* y ticks */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={ox - 3} y1={sy(v)} x2={ox} y2={sy(v)} stroke="#cbd5e1" />
          <text x={ox - 5} y={sy(v) + 3} textAnchor="end" className="text-[9px] fill-slate-400" style={{ fontSize: 8 }}>{v}</text>
        </g>
      ))}
      {/* grid */}
      {yTicks.map((v) => (
        <line key={v} x1={ox} y1={sy(v)} x2={ox + PW} y2={sy(v)} stroke="#f1f5f9" strokeWidth={0.5} />
      ))}
      {/* dots */}
      {dot(points0, ox, "#94a3b8")}
      {dot(points1, ox, "#1e293b")}
      {/* x group labels */}
      <text x={ox + PW * 0.275} y={oy + PH + 14} textAnchor="middle" className="text-[9px] fill-slate-500" style={{ fontSize: 9 }}>control</text>
      <text x={ox + PW * 0.725} y={oy + PH + 14} textAnchor="middle" className="text-[9px] fill-slate-500" style={{ fontSize: 9 }}>tablet</text>
      {/* panel label */}
      <text x={ox + PW / 2} y={oy - 6} textAnchor="middle" className="text-[9px] fill-slate-400" style={{ fontSize: 9 }}>{label}</text>
    </g>
  );

  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-1">Baseline scores (Y₀) by treatment group</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <title>Balance plot: self-selected vs RCT assignment</title>
        {/* y-axis label */}
        <text
          x={8}
          y={oy + PH / 2}
          textAnchor="middle"
          transform={`rotate(-90, 8, ${oy + PH / 2})`}
          className="text-[9px] fill-slate-400"
          style={{ fontSize: 8 }}
        >
          Y₀ score
        </text>
        <Panel ox={ox0} points0={obsT0} points1={obsT1} label="Observational (selection)" />
        <Panel ox={ox1} points0={rctT0} points1={rctT1} label="RCT (balanced)" />
        {/* legend */}
        <circle cx={W - 110} cy={H - 8} r={4} fill="#94a3b8" opacity={0.7} />
        <text x={W - 103} y={H - 5} className="text-[9px] fill-slate-500" style={{ fontSize: 9 }}>No tablet</text>
        <circle cx={W - 48} cy={H - 8} r={4} fill="#1e293b" opacity={0.7} />
        <text x={W - 41} y={H - 5} className="text-[9px] fill-slate-500" style={{ fontSize: 9 }}>Tablet</text>
      </svg>
    </div>
  );
}

/* ---- ChainDAG (Step 4) ------------------------------------------- */

function ChainDAG() {
  const W = 320, H = 80;
  const nodes = [
    { id: "study", label: "Study hours", cx: 54, cy: 40 },
    { id: "skills", label: "Skills gained", cx: 160, cy: 40 },
    { id: "wage", label: "Wage", cx: 265, cy: 40 },
  ];
  const r = 36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <title>Chain DAG: Study hours → Skills gained → Wage</title>
      <defs>
        <marker id="arr-chain" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#1e293b" />
        </marker>
      </defs>
      {/* arrows */}
      <line x1={nodes[0].cx + r} y1={40} x2={nodes[1].cx - r - 4} y2={40}
        stroke="#1e293b" strokeWidth={1.5} markerEnd="url(#arr-chain)" />
      <line x1={nodes[1].cx + r} y1={40} x2={nodes[2].cx - r - 4} y2={40}
        stroke="#1e293b" strokeWidth={1.5} markerEnd="url(#arr-chain)" />
      {/* nodes */}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.cx} cy={n.cy} r={r} fill="#1e293b" />
          <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill="white" style={{ fontSize: 9, fontWeight: 500 }}>
            {n.label.includes(" ") ? (
              <>
                <tspan x={n.cx} dy="-5">{n.label.split(" ")[0]}</tspan>
                <tspan x={n.cx} dy="11">{n.label.split(" ").slice(1).join(" ")}</tspan>
              </>
            ) : n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---- ForkDAG (Step 4) -------------------------------------------- */

function ForkDAG() {
  const W = 280, H = 100;
  // top node "Hot weather", two children
  const top  = { cx: 140, cy: 22 };
  const left = { cx: 48,  cy: 76 };
  const right= { cx: 232, cy: 76 };
  const r = 30;

  // arrow endpoint helpers
  const towardAngle = (from, to, rFrom, rTo) => {
    const dx = to.cx - from.cx, dy = to.cy - from.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return {
      x1: from.cx + (dx / dist) * rFrom,
      y1: from.cy + (dy / dist) * rFrom,
      x2: to.cx   - (dx / dist) * (rTo + 4),
      y2: to.cy   - (dy / dist) * (rTo + 4),
    };
  };

  const aLeft  = towardAngle(top, left,  r, r);
  const aRight = towardAngle(top, right, r, r);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <title>Fork DAG: Hot weather causes both Ice-cream sales and Drownings</title>
      <defs>
        <marker id="arr-fork" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#1e293b" />
        </marker>
      </defs>
      <line {...aLeft}  stroke="#1e293b" strokeWidth={1.5} markerEnd="url(#arr-fork)" />
      <line {...aRight} stroke="#1e293b" strokeWidth={1.5} markerEnd="url(#arr-fork)" />
      {/* nodes */}
      {[
        { ...top,   label: ["Hot", "weather"] },
        { ...left,  label: ["Ice-cream", "sales"] },
        { ...right, label: ["Drownings", ""] },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r={r} fill="#1e293b" />
          <text textAnchor="middle" fill="white">
            <tspan x={n.cx} y={n.cy + (n.label[1] ? -3 : 4)} style={{ fontSize: 8.5, fontWeight: 500 }}>{n.label[0]}</tspan>
            {n.label[1] && <tspan x={n.cx} dy="11" style={{ fontSize: 8.5 }}>{n.label[1]}</tspan>}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---- ColliderDAG (Step 4) ---------------------------------------- */

function ColliderDAG() {
  const W = 280, H = 110;
  const left   = { cx: 48,  cy: 30 };
  const right  = { cx: 232, cy: 30 };
  const bottom = { cx: 140, cy: 82 };
  const r = 30;

  const towardAngle = (from, to, rFrom, rTo) => {
    const dx = to.cx - from.cx, dy = to.cy - from.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return {
      x1: from.cx + (dx / dist) * rFrom,
      y1: from.cy + (dy / dist) * rFrom,
      x2: to.cx   - (dx / dist) * (rTo + 4),
      y2: to.cy   - (dy / dist) * (rTo + 4),
    };
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <title>Collider DAG: Talent and Beauty both cause Fame</title>
      <defs>
        <marker id="arr-coll" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#1e293b" />
        </marker>
      </defs>
      {/* arrows from Talent and Beauty into Fame */}
      {[left, right].map((src, i) => {
        const a = towardAngle(src, bottom, r, r);
        return <line key={i} {...a} stroke="#1e293b" strokeWidth={1.5} markerEnd="url(#arr-coll)" />;
      })}
      {/* collider highlight oval */}
      <ellipse cx={bottom.cx} cy={bottom.cy} rx={48} ry={20} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5,3" opacity={0.9} />
      <text x={bottom.cx + 52} y={bottom.cy + 4} style={{ fontSize: 8 }} fill="#f59e0b">conditioning</text>
      <text x={bottom.cx + 52} y={bottom.cy + 14} style={{ fontSize: 8 }} fill="#f59e0b">opens path</text>
      {/* nodes */}
      {[
        { ...left,   label: ["Talent",  ""] },
        { ...right,  label: ["Beauty",  ""] },
        { ...bottom, label: ["Fame",    ""] },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r={r} fill="#1e293b" />
          <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill="white" style={{ fontSize: 9, fontWeight: 500 }}>
            {n.label[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ---- ColliderScatter (Step 5) ------------------------------------ */
/*  Left: full population — talent ⊥ beauty.                         */
/*  Right: conditioned on fame (talent+beauty > 1.2) — neg slope.    */

function ColliderScatter() {
  const W = 460, H = 200;
  const PAD = { top: 24, right: 12, bottom: 36, left: 14 };
  const PW = (W - PAD.left - PAD.right) / 2 - 8;
  const PH = H - PAD.top - PAD.bottom;
  const ox0 = PAD.left;
  const ox1 = PAD.left + PW + 16;
  const oy  = PAD.top;

  const THRESHOLD = 1.2;
  const N = 220;

  // Generate data with seed=7
  const rng = mulberry32(7);
  const pts = Array.from({ length: N }, () => {
    const talent = boxMuller(rng);
    const beauty = boxMuller(rng);
    const famous = talent + beauty > THRESHOLD;
    return { talent, beauty, famous };
  });

  // scale: data range [-2.5, 2.5]
  const dMin = -2.5, dMax = 2.5, dRange = dMax - dMin;
  const sx = (v, ox) => ox + ((v - dMin) / dRange) * PW;
  const sy = (v) => oy + PH * (1 - (v - dMin) / dRange);

  // OLS line through famous subset
  const famous = pts.filter((p) => p.famous);
  const n = famous.length;
  const mx = famous.reduce((s, p) => s + p.talent, 0) / n;
  const my = famous.reduce((s, p) => s + p.beauty, 0) / n;
  const slope = famous.reduce((s, p) => s + (p.talent - mx) * (p.beauty - my), 0) /
                famous.reduce((s, p) => s + (p.talent - mx) ** 2, 0);
  const intercept = my - slope * mx;

  // line endpoints
  const xL = dMin, xR = dMax;
  const yL = intercept + slope * xL;
  const yR = intercept + slope * xR;

  const ticks = [-2, -1, 0, 1, 2];

  const AxisLine = ({ ox }) => (
    <>
      <line x1={ox} y1={oy} x2={ox} y2={oy + PH} stroke="#cbd5e1" />
      <line x1={ox} y1={oy + PH} x2={ox + PW} y2={oy + PH} stroke="#cbd5e1" />
      {ticks.map((v) => (
        <g key={v}>
          <line x1={sx(v, ox)} y1={oy + PH} x2={sx(v, ox)} y2={oy + PH + 3} stroke="#cbd5e1" />
          <text x={sx(v, ox)} y={oy + PH + 12} textAnchor="middle" style={{ fontSize: 8 }} className="fill-slate-400">{v}</text>
          <line x1={sx(v, ox)} y1={oy} x2={sx(v, ox)} y2={oy + PH} stroke="#f1f5f9" strokeWidth={0.5} />
          <line x1={ox} y1={sy(v)} x2={ox + PW} y2={sy(v)} stroke="#f1f5f9" strokeWidth={0.5} />
        </g>
      ))}
    </>
  );

  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-1">Talent vs beauty — collider bias when conditioning on fame</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <title>Collider bias scatter: population vs conditioned on fame</title>
        {/* left panel: full population */}
        <AxisLine ox={ox0} />
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.talent, ox0)} cy={sy(p.beauty)} r={2.5} fill="#94a3b8" opacity={0.45} />
        ))}
        <text x={ox0 + PW / 2} y={oy - 8} textAnchor="middle" style={{ fontSize: 9 }} className="fill-slate-400">Population (no correlation)</text>
        <text x={ox0 + PW / 2} y={oy + PH + 24} textAnchor="middle" style={{ fontSize: 8.5 }} className="fill-slate-400">Talent</text>
        <text x={ox0 - 6} y={oy + PH / 2} textAnchor="middle"
          transform={`rotate(-90, ${ox0 - 6}, ${oy + PH / 2})`}
          style={{ fontSize: 8.5 }} className="fill-slate-400">Beauty</text>

        {/* right panel: famous subset */}
        <AxisLine ox={ox1} />
        {/* faint background — all points */}
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.talent, ox1)} cy={sy(p.beauty)} r={2.5}
            fill={p.famous ? "#1e293b" : "#e2e8f0"} opacity={p.famous ? 0.7 : 0.3} />
        ))}
        {/* OLS line through famous */}
        <line
          x1={sx(xL, ox1)} y1={sy(yL)}
          x2={sx(xR, ox1)} y2={sy(yR)}
          stroke="#10b981" strokeWidth={1.8} strokeDasharray="5,3"
        />
        <text x={ox1 + PW / 2} y={oy - 8} textAnchor="middle" style={{ fontSize: 9 }} className="fill-slate-400">Among famous (negative slope)</text>
        <text x={ox1 + PW / 2} y={oy + PH + 24} textAnchor="middle" style={{ fontSize: 8.5 }} className="fill-slate-400">Talent</text>
      </svg>
    </div>
  );
}

/* ---- FWLPlot (Step 6) -------------------------------------------- */
/*  Left: raw educ (x) vs lhwage (y), slope ≈ 0.054.                  */
/*  Right: residualized, slope ≈ 0.041.                               */

function FWLPlot() {
  const W = 460, H = 180;
  const PAD = { top: 22, right: 12, bottom: 36, left: 14 };
  const PW = (W - PAD.left - PAD.right) / 2 - 8;
  const PH = H - PAD.top - PAD.bottom;
  const ox0 = PAD.left;
  const ox1 = PAD.left + PW + 16;
  const oy  = PAD.top;

  const N = 200;
  const rng = mulberry32(21);

  // Synthetic data matching the Facure Ch5 wage-education setup
  // educ ~ N(13.5, 2), iq ~ N(100, 15), lhwage = 0.0411*educ + 0.004*iq + noise
  // short slope ≈ 0.054 (iq correlated with educ)
  const raw = Array.from({ length: N }, () => {
    const iq   = 100 + boxMuller(rng) * 15;
    const educ = Math.max(8, Math.min(20, 13.5 + boxMuller(rng) * 2 + 0.04 * (iq - 100)));
    const noise = boxMuller(rng) * 0.25;
    const lhwage = 0.0411 * educ + 0.004 * iq - 0.4 + noise;
    return { educ, iq, lhwage };
  });

  // Residualize educ and lhwage on iq (simple linear projection)
  const n = raw.length;
  const mIq   = raw.reduce((s, d) => s + d.iq, 0) / n;
  const mEduc = raw.reduce((s, d) => s + d.educ, 0) / n;
  const mWage = raw.reduce((s, d) => s + d.lhwage, 0) / n;
  const cov_iq_educ = raw.reduce((s, d) => s + (d.iq - mIq) * (d.educ - mEduc), 0) / n;
  const cov_iq_wage = raw.reduce((s, d) => s + (d.iq - mIq) * (d.lhwage - mWage), 0) / n;
  const var_iq      = raw.reduce((s, d) => s + (d.iq - mIq) ** 2, 0) / n;
  const bEduc = cov_iq_educ / var_iq;
  const bWage = cov_iq_wage / var_iq;

  const pts = raw.map((d) => ({
    educ: d.educ,
    lhwage: d.lhwage,
    rEduc:  d.educ   - (mEduc + bEduc * (d.iq - mIq)),
    rWage:  d.lhwage - (mWage + bWage * (d.iq - mIq)),
  }));

  // --- raw panel scales ---
  const xRawMin = 8, xRawMax = 20;
  const yRawMin = 1.0, yRawMax = 3.2;
  const sxRaw = (v, ox) => ox + ((v - xRawMin) / (xRawMax - xRawMin)) * PW;
  const syRaw = (v) => oy + PH * (1 - (v - yRawMin) / (yRawMax - yRawMin));

  // OLS line for raw
  const mxR = raw.reduce((s, d) => s + d.educ, 0) / n;
  const myR = raw.reduce((s, d) => s + d.lhwage, 0) / n;
  const slopeR = raw.reduce((s, d) => s + (d.educ - mxR) * (d.lhwage - myR), 0) /
                 raw.reduce((s, d) => s + (d.educ - mxR) ** 2, 0);
  const intR = myR - slopeR * mxR;

  // --- residual panel scales ---
  const xResMin = -3, xResMax = 3;
  const yResMin = -0.7, yResMax = 0.7;
  const sxRes = (v, ox) => ox + ((v - xResMin) / (xResMax - xResMin)) * PW;
  const syRes = (v) => oy + PH * (1 - (v - yResMin) / (yResMax - yResMin));

  // OLS line for residuals (slope ≈ 0.041)
  const mxRes = pts.reduce((s, d) => s + d.rEduc, 0) / n;
  const myRes = pts.reduce((s, d) => s + d.rWage, 0) / n;
  const slopeRes = pts.reduce((s, d) => s + (d.rEduc - mxRes) * (d.rWage - myRes), 0) /
                   pts.reduce((s, d) => s + (d.rEduc - mxRes) ** 2, 0);
  const intRes = myRes - slopeRes * mxRes;

  const rawTicks  = [10, 12, 14, 16, 18, 20];
  const resTicks  = [-2, -1, 0, 1, 2];
  const yRawTicks = [1.5, 2.0, 2.5, 3.0];
  const yResTicks = [-0.5, 0, 0.5];

  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-1">FWL: raw vs residualized education–wage scatter</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <title>FWL partial regression: raw education-wage scatter vs residualized</title>

        {/* LEFT: raw panel */}
        <line x1={ox0} y1={oy} x2={ox0} y2={oy + PH} stroke="#cbd5e1" />
        <line x1={ox0} y1={oy + PH} x2={ox0 + PW} y2={oy + PH} stroke="#cbd5e1" />
        {rawTicks.map((v) => (
          <g key={v}>
            <line x1={sxRaw(v, ox0)} y1={oy + PH} x2={sxRaw(v, ox0)} y2={oy + PH + 3} stroke="#cbd5e1" />
            <text x={sxRaw(v, ox0)} y={oy + PH + 12} textAnchor="middle" style={{ fontSize: 8 }} className="fill-slate-400">{v}</text>
            <line x1={sxRaw(v, ox0)} y1={oy} x2={sxRaw(v, ox0)} y2={oy + PH} stroke="#f1f5f9" strokeWidth={0.5} />
          </g>
        ))}
        {yRawTicks.map((v) => (
          <g key={v}>
            <line x1={ox0 - 3} y1={syRaw(v)} x2={ox0} y2={syRaw(v)} stroke="#cbd5e1" />
            <text x={ox0 - 5} y={syRaw(v) + 3} textAnchor="end" style={{ fontSize: 8 }} className="fill-slate-400">{v.toFixed(1)}</text>
            <line x1={ox0} y1={syRaw(v)} x2={ox0 + PW} y2={syRaw(v)} stroke="#f1f5f9" strokeWidth={0.5} />
          </g>
        ))}
        {pts.map((p, i) => (
          <circle key={i} cx={sxRaw(p.educ, ox0)} cy={syRaw(p.lhwage)} r={2} fill="#1e293b" opacity={0.35} />
        ))}
        <line
          x1={sxRaw(xRawMin, ox0)} y1={syRaw(intR + slopeR * xRawMin)}
          x2={sxRaw(xRawMax, ox0)} y2={syRaw(intR + slopeR * xRawMax)}
          stroke="#10b981" strokeWidth={2} />
        <text x={ox0 + PW / 2} y={oy - 6} textAnchor="middle" style={{ fontSize: 9 }} className="fill-slate-400">Raw: slope ≈ 0.054</text>
        <text x={ox0 + PW / 2} y={oy + PH + 24} textAnchor="middle" style={{ fontSize: 8.5 }} className="fill-slate-400">Education (yrs)</text>
        <text x={ox0 - 8} y={oy + PH / 2} textAnchor="middle"
          transform={`rotate(-90, ${ox0 - 8}, ${oy + PH / 2})`}
          style={{ fontSize: 8 }} className="fill-slate-400">log(wage/hr)</text>

        {/* RIGHT: residualized panel */}
        <line x1={ox1} y1={oy} x2={ox1} y2={oy + PH} stroke="#cbd5e1" />
        <line x1={ox1} y1={oy + PH} x2={ox1 + PW} y2={oy + PH} stroke="#cbd5e1" />
        {resTicks.map((v) => (
          <g key={v}>
            <line x1={sxRes(v, ox1)} y1={oy + PH} x2={sxRes(v, ox1)} y2={oy + PH + 3} stroke="#cbd5e1" />
            <text x={sxRes(v, ox1)} y={oy + PH + 12} textAnchor="middle" style={{ fontSize: 8 }} className="fill-slate-400">{v}</text>
            <line x1={sxRes(v, ox1)} y1={oy} x2={sxRes(v, ox1)} y2={oy + PH} stroke="#f1f5f9" strokeWidth={0.5} />
          </g>
        ))}
        {yResTicks.map((v) => (
          <g key={v}>
            <line x1={ox1 - 3} y1={syRes(v)} x2={ox1} y2={syRes(v)} stroke="#cbd5e1" />
            <text x={ox1 - 5} y={syRes(v) + 3} textAnchor="end" style={{ fontSize: 8 }} className="fill-slate-400">{v.toFixed(1)}</text>
            <line x1={ox1} y1={syRes(v)} x2={ox1 + PW} y2={syRes(v)} stroke="#f1f5f9" strokeWidth={0.5} />
          </g>
        ))}
        {pts.map((p, i) => (
          <circle key={i} cx={sxRes(p.rEduc, ox1)} cy={syRes(p.rWage)} r={2} fill="#1e293b" opacity={0.35} />
        ))}
        <line
          x1={sxRes(xResMin, ox1)} y1={syRes(intRes + slopeRes * xResMin)}
          x2={sxRes(xResMax, ox1)} y2={syRes(intRes + slopeRes * xResMax)}
          stroke="#10b981" strokeWidth={2} />
        <text x={ox1 + PW / 2} y={oy - 6} textAnchor="middle" style={{ fontSize: 9 }} className="fill-slate-400">Residualized: slope ≈ 0.041</text>
        <text x={ox1 + PW / 2} y={oy + PH + 24} textAnchor="middle" style={{ fontSize: 8.5 }} className="fill-slate-400">Educ. residual</text>
        <text x={ox1 - 8} y={oy + PH / 2} textAnchor="middle"
          transform={`rotate(-90, ${ox1 - 8}, ${oy + PH / 2})`}
          style={{ fontSize: 8 }} className="fill-slate-400">wage residual</text>
      </svg>
    </div>
  );
}

/* ---- IVDiagram (Step 8) ------------------------------------------ */

function IVDiagram() {
  const W = 460, H = 180;

  // Node positions
  const Z = { cx: 80,  cy: 60,  label: ["push", "assigned"],  id: "Z" };
  const T = { cx: 230, cy: 60,  label: ["push", "received"],  id: "T" };
  const Y = { cx: 380, cy: 60,  label: ["purchases"],         id: "Y" };
  const U = { cx: 230, cy: 138, label: ["income /", "phone age"], id: "U", latent: true };
  const r = 36;

  const towardAngle = (from, to, rFrom, rTo) => {
    const dx = to.cx - from.cx, dy = to.cy - from.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return {
      x1: from.cx + (dx / dist) * rFrom,
      y1: from.cy + (dy / dist) * rFrom,
      x2: to.cx   - (dx / dist) * (rTo + 4),
      y2: to.cy   - (dy / dist) * (rTo + 4),
    };
  };

  const ZT = towardAngle(Z, T, r, r);
  const TY = towardAngle(T, Y, r, r);
  const UT = towardAngle(U, T, r, r);
  const UY = towardAngle(U, Y, r, r);

  // "as-if-random" badge position
  const badgeX = Z.cx, badgeY = Z.cy - r - 8;

  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-1">IV causal graph — push-notification experiment</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <title>IV DAG: push assigned → push received → purchases, with latent income confounder</title>
        <defs>
          <marker id="arr-iv" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#1e293b" />
          </marker>
          <marker id="arr-iv-dash" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Solid arrows: Z→T, T→Y */}
        <line {...ZT} stroke="#1e293b" strokeWidth={2} markerEnd="url(#arr-iv)" />
        <line {...TY} stroke="#1e293b" strokeWidth={2} markerEnd="url(#arr-iv)" />

        {/* Dashed arrows: U→T, U→Y */}
        <line {...UT} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-iv-dash)" />
        <line {...UY} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" markerEnd="url(#arr-iv-dash)" />

        {/* Exclusion restriction label — no Z→Y arrow */}
        <text x={(Z.cx + Y.cx) / 2} y={28} textAnchor="middle" style={{ fontSize: 8 }} fill="#10b981">
          no direct Z → Y (exclusion restriction)
        </text>
        <line x1={Z.cx + r} y1={30} x2={Y.cx - r} y2={30} stroke="#10b981" strokeWidth={1} strokeDasharray="3,4" opacity={0.6} />

        {/* Nodes */}
        {[Z, T, Y].map((n) => (
          <g key={n.id}>
            <circle cx={n.cx} cy={n.cy} r={r} fill="#1e293b" />
            <text textAnchor="middle" fill="white">
              <tspan x={n.cx} y={n.cy + (n.label.length > 1 ? -3 : 4)} style={{ fontSize: 9, fontWeight: 600 }}>{n.id}</tspan>
              <tspan x={n.cx} dy="10" style={{ fontSize: 8 }}>{n.label[0]}</tspan>
              {n.label[1] && <tspan x={n.cx} dy="9" style={{ fontSize: 8 }}>{n.label[1]}</tspan>}
            </text>
          </g>
        ))}

        {/* Latent node U — dashed circle */}
        <circle cx={U.cx} cy={U.cy} r={r} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5,3" />
        <text textAnchor="middle" fill="#94a3b8">
          <tspan x={U.cx} y={U.cy - 3} style={{ fontSize: 9, fontWeight: 600 }}>U</tspan>
          <tspan x={U.cx} dy="10" style={{ fontSize: 8 }}>{U.label[0]}</tspan>
          <tspan x={U.cx} dy="9" style={{ fontSize: 8 }}>{U.label[1]}</tspan>
        </text>

        {/* "as-if-random" badge */}
        <rect x={badgeX - 28} y={badgeY - 10} width={56} height={13} rx={3}
          fill="#10b981" opacity={0.15} />
        <text x={badgeX} y={badgeY} textAnchor="middle" style={{ fontSize: 8 }} fill="#10b981">
          as-if-random
        </text>
      </svg>
    </div>
  );
}

/* ---- PSOverlap (Step 9) ------------------------------------------ */
/*  Two smooth Gaussian density curves for medicated vs not-medicated.  */
/*  Shaded overlap region. Annotation "common support".                 */

function PSOverlap() {
  const W = 460, H = 180;
  const PAD = { top: 20, right: 20, bottom: 42, left: 14 };
  const PW = W - PAD.left - PAD.right;
  const PH = H - PAD.top - PAD.bottom;
  const ox = PAD.left, oy = PAD.top;

  // propensity score axis [0, 1]
  const sx = (v) => ox + v * PW;
  const sy = (v) => oy + PH * (1 - v); // v is normalised density 0–1

  // Gaussian PDF helper
  const gauss = (x, mu, sigma) =>
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));

  // Control (not medicated): centred ~0.3, sigma=0.12
  // Treated (medicated): centred ~0.7, sigma=0.12
  const muCtrl = 0.28, sigCtrl = 0.11;
  const muTreat= 0.72, sigTreat= 0.11;

  const nPts = 120;
  const xs = Array.from({ length: nPts + 1 }, (_, i) => i / nPts);

  const dCtrl  = xs.map((x) => gauss(x, muCtrl, sigCtrl));
  const dTreat = xs.map((x) => gauss(x, muTreat, sigTreat));
  const dMax   = Math.max(...dCtrl, ...dTreat);

  // Normalise so peak = 1
  const normCtrl  = dCtrl.map((v) => v / dMax);
  const normTreat = dTreat.map((v) => v / dMax);

  // Build SVG path strings
  const pathPts = (ys) =>
    xs.map((x, i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(" ");

  const ctrlPath  = pathPts(normCtrl)  + ` L${sx(1)},${sy(0)} L${sx(0)},${sy(0)} Z`;
  const treatPath = pathPts(normTreat) + ` L${sx(1)},${sy(0)} L${sx(0)},${sy(0)} Z`;

  // Overlap region: fill with emerald where both densities positive
  // Approximate overlap: between ~0.42 and ~0.58
  const oL = 0.40, oR = 0.60;
  const oXs = xs.filter((x) => x >= oL && x <= oR);
  const overlapTop = oXs.map((x) => {
    const dc = gauss(x, muCtrl, sigCtrl) / dMax;
    const dt = gauss(x, muTreat, sigTreat) / dMax;
    return { x, y: Math.min(dc, dt) };
  });
  const overlapPath = overlapTop.length > 1
    ? overlapTop.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")
      + ` L${sx(oR)},${sy(0)} L${sx(oL)},${sy(0)} Z`
    : "";

  const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

  // Common support annotation leader line
  const midX = sx(0.50);
  const midY = sy(0.18);

  return (
    <div>
      <div className="text-[10px] text-slate-400 mb-1">Propensity score overlap — medicated vs not medicated</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <title>Propensity score overlap: control density (low PS) and treated density (high PS) with common support region</title>

        {/* Grid */}
        {xTicks.map((v) => (
          <line key={v} x1={sx(v)} y1={oy} x2={sx(v)} y2={oy + PH} stroke="#f1f5f9" strokeWidth={0.5} />
        ))}
        <line y1={oy + PH / 2} x1={ox} y2={oy + PH / 2} x2={ox + PW} stroke="#f1f5f9" strokeWidth={0.5} />

        {/* Filled density curves */}
        <path d={ctrlPath}  fill="#94a3b8" opacity={0.35} />
        <path d={treatPath} fill="#1e293b" opacity={0.25} />

        {/* Overlap shading */}
        {overlapPath && <path d={overlapPath} fill="#10b981" opacity={0.35} />}

        {/* Curve outlines */}
        <path d={pathPts(normCtrl)}  fill="none" stroke="#94a3b8" strokeWidth={2} />
        <path d={pathPts(normTreat)} fill="none" stroke="#1e293b" strokeWidth={2} />

        {/* Axes */}
        <line x1={ox} y1={oy + PH} x2={ox + PW} y2={oy + PH} stroke="#cbd5e1" />
        <line x1={ox} y1={oy} x2={ox} y2={oy + PH} stroke="#cbd5e1" />

        {/* X ticks */}
        {xTicks.map((v) => (
          <g key={v}>
            <line x1={sx(v)} y1={oy + PH} x2={sx(v)} y2={oy + PH + 3} stroke="#cbd5e1" />
            <text x={sx(v)} y={oy + PH + 13} textAnchor="middle" style={{ fontSize: 8.5 }} className="fill-slate-400">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* X-axis label */}
        <text x={ox + PW / 2} y={H - 4} textAnchor="middle" style={{ fontSize: 9 }} className="fill-slate-500">
          p̂(X) = P(T=1 | X)
        </text>

        {/* Common support annotation */}
        <line x1={midX} y1={midY + 2} x2={sx(0.50)} y2={oy + PH - 6}
          stroke="#10b981" strokeWidth={1} strokeDasharray="3,3" />
        <rect x={midX - 36} y={midY - 12} width={72} height={14} rx={3}
          fill="#10b981" opacity={0.15} />
        <text x={midX} y={midY - 2} textAnchor="middle" style={{ fontSize: 8.5 }} fill="#10b981">
          common support
        </text>

        {/* Legend */}
        <rect x={ox + 4} y={H - 18} width={10} height={8} rx={1} fill="#94a3b8" opacity={0.55} />
        <text x={ox + 18} y={H - 11} style={{ fontSize: 9 }} className="fill-slate-500">Not medicated</text>
        <rect x={ox + 102} y={H - 18} width={10} height={8} rx={1} fill="#1e293b" opacity={0.45} />
        <text x={ox + 116} y={H - 11} style={{ fontSize: 9 }} className="fill-slate-500">Medicated</text>
        <rect x={ox + 184} y={H - 18} width={10} height={8} rx={1} fill="#10b981" opacity={0.45} />
        <text x={ox + 198} y={H - 11} style={{ fontSize: 9 }} fill="#10b981">Overlap region</text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lesson list                                                        */
/* ------------------------------------------------------------------ */

const LESSONS = [
  "The fundamental problem",
  "Bias decomposition",
  "Randomization kills bias",
  "DAGs I — chains, forks, colliders",
  "DAGs II — backdoor criterion & collider bias",
  "Regression as adjustment (FWL)",
  "Good controls vs bad controls",
  "Instrumental variables & LATE",
  "Matching & propensity scores",
  "Python library tour + quiz",
];

/* ------------------------------------------------------------------ */
/*  Step 1 — The fundamental problem                                   */
/* ------------------------------------------------------------------ */

function Step1() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The Fundamental Problem of Causal Inference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Suppose a school district gives tablets to some schools and wants to know
            whether the tablets caused test scores to rise. The straightforward instinct
            is to compare tablet schools to non-tablet schools — but this comparison
            is contaminated by <strong>selection</strong>: wealthier schools may have
            adopted tablets <em>and</em> had higher scores to begin with. We can
            never observe the same school both with and without tablets at the same
            time.
          </p>
          <p>
            This is the <strong>fundamental problem of causal inference</strong>. For every
            unit <Tex math="i" />, we observe at most one of two{" "}
            <strong>potential outcomes</strong>: <Tex math="Y_{0i}" /> (the score if
            untreated) and <Tex math="Y_{1i}" /> (the score if treated). The{" "}
            <strong>switching equation</strong> links both to the single observed outcome:
          </p>
          <Tex
            math="Y_i = T_i \cdot Y_{1i} + (1 - T_i) \cdot Y_{0i}"
            display
          />
          <p>
            The individual treatment effect <Tex math="\tau_i = Y_{1i} - Y_{0i}" />{" "}
            requires both potential outcomes simultaneously — which is impossible. So we
            target <em>averages</em> across units instead:
          </p>
          <Tex math="\text{ATE} = E[Y_1 - Y_0]" display />
          <Tex math="\text{ATT} = E[Y_1 - Y_0 \mid T = 1]" display />
          <p>
            ATE averages the treatment effect over the full population. ATT averages
            only over the units that actually received treatment — often the more
            policy-relevant quantity when treatment is self-selected.
          </p>
        </CardContent>
      </Card>

      {/* 4-school table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4-school tablet intervention (Facure Ch 1)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Four schools. Schools 3 and 4 received tablets (<Tex math="T=1" />);
            schools 1 and 2 did not. Grey cells are the counterfactual potential
            outcomes we can never observe.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-slate-500">School</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">
                    <Tex math="Y_0" /> (no tablet)
                  </th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">
                    <Tex math="Y_1" /> (tablet)
                  </th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">
                    <Tex math="T" />
                  </th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Observed <Tex math="Y" /></th>
                  <th className="pb-2 font-medium text-slate-500">
                    <Tex math="\tau_i = Y_1 - Y_0" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Schools 1 & 2: untreated. Y1 is counterfactual (grey). */}
                <tr>
                  <td className="py-1.5 pr-4 font-medium">1</td>
                  <td className="py-1.5 pr-4">500</td>
                  <td className="py-1.5 pr-4 text-slate-300">450</td>
                  <td className="py-1.5 pr-4">0</td>
                  <td className="py-1.5 pr-4">500</td>
                  <td className="py-1.5 text-slate-300">−50</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-medium">2</td>
                  <td className="py-1.5 pr-4">600</td>
                  <td className="py-1.5 pr-4 text-slate-300">600</td>
                  <td className="py-1.5 pr-4">0</td>
                  <td className="py-1.5 pr-4">600</td>
                  <td className="py-1.5 text-slate-300">0</td>
                </tr>
                {/* Schools 3 & 4: treated. Y0 is counterfactual (grey). */}
                <tr>
                  <td className="py-1.5 pr-4 font-medium">3</td>
                  <td className="py-1.5 pr-4 text-slate-300">800</td>
                  <td className="py-1.5 pr-4">600</td>
                  <td className="py-1.5 pr-4">1</td>
                  <td className="py-1.5 pr-4">600</td>
                  <td className="py-1.5 text-slate-300">−200</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-medium">4</td>
                  <td className="py-1.5 pr-4 text-slate-300">700</td>
                  <td className="py-1.5 pr-4">750</td>
                  <td className="py-1.5 pr-4">1</td>
                  <td className="py-1.5 pr-4">750</td>
                  <td className="py-1.5 text-slate-300">+50</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400">
            Grey cells are counterfactuals — we can never see both columns for the same school.
          </p>

          <p>
            With all potential outcomes visible (a luxury we only have in this toy
            example), the three key estimands compute as follows:
          </p>
          <p>
            <strong>ATE</strong> — average over all four schools:{" "}
            <Tex math="\tfrac{(-50) + 0 + (-200) + 50}{4} = -50" />
          </p>
          <p>
            <strong>ATT</strong> — average over treated schools (3 and 4) only:{" "}
            <Tex math="\tfrac{(-200) + 50}{2} = -75" />
          </p>
          <p>
            <strong>Naive estimate</strong> — observed mean of treated minus observed
            mean of untreated:{" "}
            <Tex math="\tfrac{600 + 750}{2} - \tfrac{500 + 600}{2} = 675 - 550 = +125" />
          </p>
        </CardContent>
      </Card>

      <InfoBox variant="dark">
        All three numbers cannot simultaneously be right. The naive estimate is{" "}
        <strong>+125</strong> (tablets appear to help), yet the true ATT is{" "}
        <strong>−75</strong> (they actually hurt treated schools) and the true ATE
        is <strong>−50</strong>. The discrepancy — +200 points — is pure selection
        bias. Step 2 shows exactly where it comes from and how to decompose it.
      </InfoBox>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2 — Bias decomposition                                        */
/* ------------------------------------------------------------------ */

function Step2() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bias Decomposition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            The naive estimator is the raw difference in observed means between
            treated and untreated units. We can decompose it algebraically to
            expose exactly where the bias lives. Start with what we observe:
          </p>
          <Tex
            math="E[Y \mid T = 1] - E[Y \mid T = 0]"
            display
          />
          <p>
            Apply the switching equation (<Tex math="Y = T \cdot Y_1 + (1-T) \cdot Y_0" />)
            to replace observed outcomes with potential outcomes:
          </p>
          <Tex
            math="= E[Y_1 \mid T = 1] - E[Y_0 \mid T = 0]"
            display
          />
          <p>
            Add and subtract <Tex math="E[Y_0 \mid T = 1]" /> — the expected
            untreated outcome for treated units, which is unobservable but
            algebraically valid:
          </p>
          <Tex
            math="= E[Y_1 \mid T = 1] - E[Y_0 \mid T = 1] \;+\; E[Y_0 \mid T = 1] - E[Y_0 \mid T = 0]"
            display
          />
          <p>
            The first pair is the ATT. The second pair is the difference in
            untreated potential outcomes between treated and untreated groups —
            pure selection bias:
          </p>
          <Tex
            math="\underbrace{E[Y_1 - Y_0 \mid T = 1]}_{\text{ATT}} + \underbrace{E[Y_0 \mid T = 1] - E[Y_0 \mid T = 0]}_{\text{selection bias}}"
            display
          />
          <p>
            Selection bias measures how the <em>untreated</em> baseline differs
            between groups — it is fundamentally unobservable because we never
            see <Tex math="Y_0" /> for treated units. It is zero only when
            treatment is independent of potential outcomes.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Plug in the tablet-school numbers</p>
          <p>
            From step 1: ATT = −75, naive = +125. Therefore bias = +125 − (−75) = +200.
            Verify directly:
          </p>
          <p>
            <Tex math="E[Y_0 \mid T=1]" /> for treated schools 3 and 4 (their
            untreated potential outcomes, grey cells):{" "}
            <Tex math="\tfrac{800 + 700}{2} = 750" />
          </p>
          <p>
            <Tex math="E[Y_0 \mid T=0]" /> for untreated schools 1 and 2
            (observed):{" "}
            <Tex math="\tfrac{500 + 600}{2} = 550" />
          </p>
          <p>
            Bias = <Tex math="750 - 550 = +200" />
          </p>
          <p>The identity holds exactly:</p>
          <Tex math="+125 = -75 + 200" display />
          <p className="text-slate-500 text-xs">
            Rich schools (high <Tex math="Y_0" />) self-selected into the tablet
            program — making it look like tablets help when they do not.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-1">
            <StatCard
              label="ATT"
              value="−75 pts"
              formula={"E[Y_1 - Y_0 \\mid T = 1]"}
            />
            <StatCard
              label="Selection bias"
              value="+200 pts"
              formula={"E[Y_0 \\mid T=1] - E[Y_0 \\mid T=0]"}
            />
            <StatCard
              label="Naive estimate"
              value="+125 pts"
              formula={"E[Y \\mid T=1] - E[Y \\mid T=0]"}
            />
          </div>
        </div>
      </div>

      <InfoBox title="What makes bias zero?" variant="dark">
        Bias equals <Tex math="E[Y_0 \mid T=1] - E[Y_0 \mid T=0]" /> — the gap
        between treated and untreated units in their <em>untreated</em> potential
        outcomes. This collapses to zero under one of two conditions: (a) treated
        and untreated units happen to have identical baselines — unrealistic in
        observational data — or (b) treatment assignment is{" "}
        <strong>statistically independent of potential outcomes</strong>, which is
        exactly what randomization delivers. Step 3 shows why.
      </InfoBox>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3 — Randomization kills bias                                  */
/* ------------------------------------------------------------------ */

function Step3() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Randomization Kills Bias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            When treatment is assigned by a coin flip, it is statistically
            independent of everything about the unit — including their potential
            outcomes. This is the independence assumption:
          </p>
          <Tex math="(Y_0,\, Y_1) \perp T" display />
          <p>
            Independence immediately implies{" "}
            <Tex math="E[Y_0 \mid T=0] = E[Y_0 \mid T=1]" />, so the selection
            bias term from step 2 is exactly zero. The naive estimator becomes
            causal:
          </p>
          <Tex
            math="E[Y \mid T=1] - E[Y \mid T=0] = \underbrace{E[Y_1-Y_0 \mid T=1]}_{\text{ATT}} + \underbrace{0}_{\text{bias}} = \text{ATE}"
            display
          />
          <p>
            Under independence, ATT = ATE as well, since the treated group is a
            random sample of the population.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Online classroom RCT (Facure Ch 2–3)</p>
          <p>
            323 students were randomly assigned to either face-to-face instruction
            (<Tex math="n_{f2f} = 120" />) or an online format (<Tex math="n_{\text{online}} = 94" />,
            blended students excluded). Because assignment was random, the raw
            difference in means is a valid causal estimate of the ATE.
          </p>
          <p>
            The standard error of the difference uses the two-sample formula:
          </p>
          <Tex
            math="SE = \sqrt{\frac{s_1^2}{n_1} + \frac{s_0^2}{n_0}}"
            display
          />
          <p>
            Plugging in sample standard deviations and group sizes gives{" "}
            <Tex math="SE \approx 1.77" /> (two-sample). The OLS version, which
            pools residual variance, gives <Tex math="SE = 1.68" />, a slightly
            tighter bound.
          </p>

          <InfoBox title="SUTVA + consistency (Mixtape)" variant="muted">
            Randomization alone is not enough — two further assumptions must hold.{" "}
            <strong>SUTVA</strong> has two parts: (1) <em>no interference</em> —
            my outcome does not depend on your treatment assignment (violated
            in vaccine studies via herd immunity); (2) <em>no hidden treatment
            versions</em> — there is only one version of "online class" (violated
            if students receive different recording qualities).{" "}
            <strong>Consistency</strong> says the observed outcome equals the
            potential outcome for the treatment actually received:{" "}
            <Tex math="Y_i = Y_i(T_i)" />.
          </InfoBox>

          <InfoBox title="Fisher's sharp null — a different paradigm" variant="muted">
            The t-test is Neyman's framework: test whether the average effect is
            zero, assuming asymptotic normality. Fisher proposed testing{" "}
            <Tex math="H_0: \tau_i = 0 \text{ for all } i" /> — the sharp null.
            Under it, the observed data table is fixed and we permute treatment
            labels to build an exact null distribution. No distributional
            assumptions are needed; the p-value is exact by construction.
          </InfoBox>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-1">
            <StatCard
              label="Mean — face-to-face"
              value="78.55"
              formula={"\\bar{Y}_{T=0}"}
            />
            <StatCard
              label="Mean — online"
              value="73.64"
              formula={"\\bar{Y}_{T=1}"}
            />
            <StatCard
              label="ATE (causal under RCT)"
              value="−4.9122"
              formula={"\\hat{\\tau}_{\\text{ATE}} = \\bar{Y}_1 - \\bar{Y}_0"}
            />
            <StatCard
              label="SE (OLS)"
              value="1.6796"
              formula={"\\hat{\\sigma}_{\\bar{Y}_1 - \\bar{Y}_0}"}
            />
            <StatCard
              label="95% CI"
              value="[−8.22, −1.60]"
              formula={"\\hat{\\tau} \\pm t_{0.975} \\cdot SE"}
            />
            <StatCard
              label="p-value (OLS)"
              value="0.0038"
              formula={"2\\Phi(z)"}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Balance: do the groups look similar?</p>
          <p>
            In the observational tablet study, treated schools (dots, dark) sit
            visibly higher on baseline scores than untreated schools (dots, slate) —
            a clear sign of positive selection. After randomization the two clouds
            overlap completely: neither group is systematically richer or abler.
          </p>
          <p className="text-xs text-slate-500">
            Each dot represents one school's untreated potential outcome Y₀. In
            the observational panel Y₀ is unobserved for treated units — shown
            here only to illustrate what selection looks like.
          </p>
        </div>
        <BalancePlot />
      </div>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4 — DAGs I: chain, fork, collider                            */
/* ------------------------------------------------------------------ */

function Step4() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DAGs I — Chains, Forks &amp; Colliders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            A <strong>Directed Acyclic Graph (DAG)</strong> encodes the causal
            assumptions of the analyst — not statistics computed from data. Each
            arrow <Tex math="A \to B" /> asserts "A is a direct cause of B (given
            everything else in the graph)." Three fundamental structures
            — called <em>atoms</em> — determine whether conditioning on a node opens
            or closes an association path.
          </p>
        </CardContent>
      </Card>

      {/* Three atoms */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Chain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chain (mediation)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <ChainDAG />
            <p>
              <strong>Story:</strong> study hours build skills, and skills raise
              wages. Study affects wages <em>only through</em> skills.
            </p>
            <p>
              <strong>Default:</strong> the path carries an association — study
              and wage are correlated.
            </p>
            <p>
              <strong>Conditioning on Skills</strong> blocks the path. Among
              workers with the same skill level, study hours no longer predict
              wages. Never condition on a mediator when estimating the total
              effect of study on wage.
            </p>
          </CardContent>
        </Card>

        {/* Fork */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fork (common cause)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <ForkDAG />
            <p>
              <strong>Story:</strong> hot weather drives both ice-cream sales
              and swimming (drownings). The two are correlated but neither causes
              the other.
            </p>
            <p>
              <strong>Default:</strong> the path carries a spurious association
              between ice-cream and drownings.
            </p>
            <p>
              <strong>Conditioning on Weather</strong> blocks the fork. Within
              a given temperature, ice-cream sales and drownings are independent.
              This is why we <em>include</em> confounders in regression.
            </p>
          </CardContent>
        </Card>

        {/* Collider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Collider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600">
            <ColliderDAG />
            <p>
              <strong>Story:</strong> fame requires talent or beauty (or both).
              In the general population, talent and beauty are independent.
            </p>
            <p>
              <strong>Default:</strong> the path is <em>blocked</em> — no
              association between talent and beauty in the population.
            </p>
            <p>
              <strong>Conditioning on Fame</strong> opens a spurious negative
              correlation — a less talented star must compensate with beauty,
              and vice versa. This is Berkson's paradox.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">d-separation summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Structure</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Path blocked by default?</th>
                  <th className="pb-2 font-medium text-slate-500">What conditioning on the middle node does</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 pr-4 font-medium">Chain <Tex math="A \to B \to C" /></td>
                  <td className="py-1.5 pr-4 text-rose-500 font-semibold">No — path is open</td>
                  <td className="py-1.5">Blocks it (closes the path)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-medium">Fork <Tex math="A \leftarrow B \to C" /></td>
                  <td className="py-1.5 pr-4 text-rose-500 font-semibold">No — path is open</td>
                  <td className="py-1.5">Blocks it (closes the path)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-medium">Collider <Tex math="A \to B \leftarrow C" /></td>
                  <td className="py-1.5 pr-4 text-emerald-600 font-semibold">Yes — path is blocked</td>
                  <td className="py-1.5">Opens it (creates spurious association)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            A set Z <strong>d-separates</strong> two nodes if every path between
            them is blocked by Z. D-separation implies conditional independence in
            faithful distributions.
          </p>
        </CardContent>
      </Card>

      <InfoBox title="Why DAGs matter for regression" variant="dark">
        You cannot determine from data alone whether a third variable is a
        confounder (fork), a mediator (chain), or a collider. You need a causal
        model — a DAG. Including or excluding a variable incorrectly can introduce
        bias that is statistically invisible. Steps 5 and 7 make this concrete.
      </InfoBox>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 5 — DAGs II: backdoor criterion & collider bias               */
/* ------------------------------------------------------------------ */

function Step5() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DAGs II — Backdoor Criterion &amp; Collider Bias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            The <strong>backdoor criterion</strong> is a graph-based sufficient
            condition for identifying a causal effect from observational data.
            A set of variables <Tex math="Z" /> satisfies the backdoor criterion
            relative to <Tex math="(T \to Y)" /> if:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-700">
            <li>
              <Tex math="Z" /> blocks every <em>backdoor path</em> — every path
              from <Tex math="T" /> to <Tex math="Y" /> that has an arrow
              pointing <em>into</em> <Tex math="T" />.
            </li>
            <li>
              <Tex math="Z" /> contains no descendants of <Tex math="T" />.
            </li>
          </ol>
          <p>When the criterion holds, the adjustment formula identifies the causal effect:</p>
          <Tex
            math="E[Y \mid \text{do}(T=t)] = \sum_z E[Y \mid T=t,\, Z=z]\, P(Z=z)"
            display
          />
          <p>
            This is exactly what OLS "controls for Z" computes — a weighted
            average of the within-strata <Tex math="T" />-<Tex math="Y" />{" "}
            relationship, weighted by the marginal distribution of <Tex math="Z" />.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">The movie-star collider paradox</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-700">
              <p>
                Assume talent and beauty are drawn independently in the population.
                Fame is determined by a threshold on their sum:{" "}
                <Tex math="\text{fame}_i = \mathbf{1}\{\text{talent}_i + \text{beauty}_i + \varepsilon_i > c\}" />.
                In the full population, <Tex math="\text{talent} \perp \text{beauty}" />.
              </p>
              <p>
                Now restrict to famous people. A six-person toy example
                (grey rows are unobserved — not famous):
              </p>
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-1 pr-3 font-medium text-slate-500">Person</th>
                    <th className="pb-1 pr-3 font-medium text-slate-500">Talent</th>
                    <th className="pb-1 pr-3 font-medium text-slate-500">Beauty</th>
                    <th className="pb-1 font-medium text-slate-500">Famous?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["A", "High", "High", "Yes"],
                    ["B", "High", "Low", "Yes"],
                    ["C", "Low", "High", "Yes"],
                    ["D", "Low", "Low", "No"],
                    ["E", "High", "Low", "No"],
                    ["F", "Low", "High", "No"],
                  ].map(([p, t, b, f]) => (
                    <tr key={p} className={f === "No" ? "text-slate-300" : ""}>
                      <td className="py-1 pr-3">{p}</td>
                      <td className="py-1 pr-3">{t}</td>
                      <td className="py-1 pr-3">{b}</td>
                      <td className="py-1">{f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Among the famous (A, B, C): B is highly talented but plain;
                C is beautiful but not talented. Conditioning on fame induces
                a negative association between talent and beauty that does not
                exist in the full population.
              </p>
            </CardContent>
          </Card>

          <InfoBox title="The golden rule of controls" variant="warning">
            <strong>Include</strong> confounders (common causes of <Tex math="T" />{" "}
            and <Tex math="Y" />). <strong>Never include</strong> mediators
            (variables on the causal path <Tex math="T \to M \to Y" />) or
            colliders (common effects of <Tex math="T" /> and <Tex math="Y" />,
            or their descendants). Including a mediator blocks the effect you
            want to measure. Including a collider opens a spurious path. Step 7
            gives concrete regression examples of each mistake.
          </InfoBox>
        </div>

        <div className="space-y-3">
          <ColliderScatter />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Simpson's paradox via occupation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-700">
              <p>
                Gender affects both occupation choice and wages; occupation also
                affects wages. Occupation is a <em>mediator</em> (Gender →
                Occupation → Wage). Conditioning on it blocks part of the gender
                wage effect.
              </p>
              <div className="grid gap-2 grid-cols-2">
                <div>
                  <p className="font-medium text-slate-500 mb-1">Aggregate</p>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-1 pr-2 font-medium text-slate-500 text-left">Gender</th>
                        <th className="pb-1 font-medium text-slate-500 text-left">Mean wage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="py-1 pr-2">Men</td><td className="py-1">$70k</td></tr>
                      <tr><td className="py-1 pr-2">Women</td><td className="py-1">$56k</td></tr>
                    </tbody>
                  </table>
                  <p className="text-slate-400 mt-1">Raw gap: −$14k</p>
                </div>
                <div>
                  <p className="font-medium text-slate-500 mb-1">Within high-pay job</p>
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-1 pr-2 font-medium text-slate-500 text-left">Gender</th>
                        <th className="pb-1 font-medium text-slate-500 text-left">Mean wage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="py-1 pr-2">Men</td><td className="py-1">$90k</td></tr>
                      <tr><td className="py-1 pr-2">Women</td><td className="py-1">$88k</td></tr>
                    </tbody>
                  </table>
                  <p className="text-slate-400 mt-1">Conditional gap: −$2k</p>
                </div>
              </div>
              <p>
                Controlling for occupation explains away most of the gap — but
                this is not removing confounding; it is blocking the causal path
                through occupational sorting. Whether to control depends on the
                causal question, not the statistics alone.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 6 — Regression as adjustment (FWL)                           */
/* ------------------------------------------------------------------ */

function Step6() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regression as Adjustment — the Frisch–Waugh–Lovell Theorem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            OLS with the right covariates implements the backdoor adjustment when
            relationships are approximately linear. The{" "}
            <strong>Frisch–Waugh–Lovell (FWL) theorem</strong> reveals exactly
            what happens when you "control for <Tex math="X" />."
          </p>
          <p>
            Consider the model{" "}
            <Tex math="Y_i = \alpha + \kappa T_i + \boldsymbol{\gamma}^\top X_i + \varepsilon_i" />.
            FWL says the OLS coefficient on <Tex math="T" /> equals:
          </p>
          <Tex
            math="\hat{\kappa} = \frac{\operatorname{Cov}(\tilde{Y},\, \tilde{T})}{\operatorname{Var}(\tilde{T})}"
            display
          />
          <p>
            where <Tex math="\tilde{T}" /> is the residual from regressing{" "}
            <Tex math="T" /> on <Tex math="X" />, and <Tex math="\tilde{Y}" /> is
            the residual from regressing <Tex math="Y" /> on <Tex math="X" />.
            Equivalently, <Tex math="\hat{\kappa}" /> is the bivariate OLS slope
            in a regression of <Tex math="\tilde{Y}" /> on <Tex math="\tilde{T}" />.
          </p>
          <p>
            Intuition: "controlling for <Tex math="X" />" means comparing units
            with the same value of <Tex math="X" />. OLS achieves this by
            purging the linear projection of <Tex math="X" /> from both{" "}
            <Tex math="T" /> and <Tex math="Y" />, then running a bivariate
            regression on the residuals — a matching machine in linear covariate
            space.
          </p>

          <p className="font-medium text-slate-800 pt-1">Omitted variable bias (OVB)</p>
          <p>
            If the true model includes an omitted variable <Tex math="W" />, the
            short regression picks up a spurious term:
          </p>
          <Tex
            math="\hat{\beta}_{\text{short}} = \hat{\beta}_{\text{long}} + \underbrace{\hat{\gamma}_W}_{\text{W's effect on Y}} \cdot \underbrace{\hat{\delta}}_{\text{regression of W on T}}"
            display
          />
          <p>
            The bias <Tex math="\hat{\gamma}_W \cdot \hat{\delta}" /> is zero only
            when <Tex math="W" /> is uncorrelated with <Tex math="T" />{" "}
            (<Tex math="\hat{\delta} = 0" />) or does not affect <Tex math="Y" />{" "}
            (<Tex math="\hat{\gamma}_W = 0" />). Otherwise the short regression is
            biased.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Wage–education hand calculation (Facure Ch 5, n = 663)</p>
          <p>
            Short regression: <Tex math="\log(\text{wage/hours}) \sim \text{educ}" />.
            Long regression adds IQ, experience, tenure, age, marital status, race,
            region, urban indicator, siblings, birth order, mother's education, and
            father's education (12 controls total).
          </p>
          <p>
            The short estimate says each extra year of education is associated with
            5.36% higher hourly wages. Once we hold constant IQ, experience, and
            family background, the estimate falls to 4.11%. The OVB of 1.25 pp
            reflects variables that cause both more education and higher wages —
            primarily ability and socioeconomic background.
          </p>
          <p>
            FWL verification: regressing the education residuals (after projecting
            out all 12 controls) on the log-wage residuals (same projection) gives
            exactly 4.11% — confirming the theorem holds numerically.
          </p>

          <div className="grid gap-3 grid-cols-3">
            <StatCard
              label="Short coef."
              value="0.0536"
              formula={"\\hat{\\beta}_{\\text{short}}"}
            />
            <StatCard
              label="Long coef."
              value="0.0411"
              formula={"\\hat{\\beta}_{\\text{long}}"}
            />
            <StatCard
              label="OVB"
              value="0.0125"
              formula={"\\hat{\\beta}_{\\text{short}} - \\hat{\\beta}_{\\text{long}}"}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-4 font-medium text-slate-500">Model</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">Coef. on educ.</th>
                  <th className="pb-2 pr-4 font-medium text-slate-500">SE</th>
                  <th className="pb-2 font-medium text-slate-500">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 pr-4 font-medium">Short (no controls)</td>
                  <td className="py-1.5 pr-4 font-mono">0.0536</td>
                  <td className="py-1.5 pr-4 font-mono">0.0075</td>
                  <td className="py-1.5 text-slate-600">+5.36% per year</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-medium">Long (+ 12 controls)</td>
                  <td className="py-1.5 pr-4 font-mono">0.0411</td>
                  <td className="py-1.5 pr-4 font-mono">0.0101</td>
                  <td className="py-1.5 text-slate-600">+4.11% per year</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400">
            Controls: IQ, experience, tenure, age, married, black, south, urban,
            siblings, birth order, mother's educ., father's educ. Source: Facure
            Ch 5, n = 663 after dropna().
          </p>

          <FWLPlot />

          <InfoBox title="FWL in one sentence" variant="muted">
            Controlling for a covariate means asking what the relationship between{" "}
            <Tex math="T" /> and <Tex math="Y" /> would be if everyone had the
            same value of that covariate — OLS implements this by comparing units
            with equal residuals after projecting out the covariate.
          </InfoBox>
        </div>
      </div>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 7 — Good controls vs bad controls                             */
/* ------------------------------------------------------------------ */

function Step7() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Good Controls vs Bad Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Randomization handles confounders for <Tex math="T" />, but it says
            nothing about which other variables to include in a regression.
            Including the wrong variable can introduce bias that randomization
            would have prevented. The decision must be guided by a DAG, not by
            statistical significance.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-3 font-medium text-slate-500">Variable type</th>
                  <th className="pb-2 pr-3 font-medium text-slate-500">DAG role</th>
                  <th className="pb-2 pr-3 font-medium text-slate-500">Include?</th>
                  <th className="pb-2 font-medium text-slate-500">Consequence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ["Confounder", "T ← C → Y", "Yes", "Removes selection bias — essential in observational data"],
                  ["Outcome predictor", "Y ← P, P ⊥ T", "Yes", "Reduces residual variance, tightens SE at no bias cost"],
                  ["Treatment predictor", "T ← P, P ⊥ Y | T", "No", "Inflates SE; absorbs no confounding — pure noise penalty"],
                  ["Mediator", "T → M → Y", "No", "Blocks the causal channel you want to estimate"],
                  ["Collider", "T → K ← Y (or descendant)", "No", "Opens a spurious non-causal association"],
                ].map(([type, dag, inc, cons]) => (
                  <tr key={type}>
                    <td className="py-1.5 pr-3 font-medium">{type}</td>
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-slate-500">{dag}</td>
                    <td className={`py-1.5 pr-3 font-semibold ${inc === "Yes" ? "text-emerald-600" : "text-rose-500"}`}>
                      {inc}
                    </td>
                    <td className="py-1.5 text-slate-600">{cons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Collections email experiment (Facure Ch 7)</p>
          <p>
            A bank randomly sends email reminders to customers with overdue
            accounts. The outcome is dollars recovered. Email assignment is
            random, so there is no confounding — yet the naive regression cannot
            detect the effect.
          </p>
          <p>
            Adding credit limit and risk score as controls — neither of which
            confounds (email was random) — cuts the SE from 2.94 to 2.13. These
            variables predict payments strongly but are uncorrelated with email
            assignment. They are <em>outcome predictors only</em>, providing a
            pure precision gain without touching the point estimate's causal
            validity.
          </p>
          <p>
            The sign flip from −0.62 to +4.43 is a consequence of the large
            standard error in the naive specification: −0.62 is noise around zero.
            The controlled estimate of +4.43 is a genuine detection of the effect.
          </p>
        </div>

        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-3 font-medium text-slate-500">Specification</th>
                  <th className="pb-2 pr-3 font-medium text-slate-500">Coef. on email</th>
                  <th className="pb-2 pr-3 font-medium text-slate-500">SE</th>
                  <th className="pb-2 font-medium text-slate-500">p-value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 pr-3 font-medium">
                    <Tex math="\text{payments} \sim \text{email}" />
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-rose-500">−0.6203</td>
                  <td className="py-1.5 pr-3 font-mono">2.9415</td>
                  <td className="py-1.5 font-semibold text-rose-500">0.83</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3 font-medium">
                    <Tex math="+ \text{credit\_limit} + \text{risk\_score}" />
                  </td>
                  <td className="py-1.5 pr-3 font-mono text-emerald-600">+4.4304</td>
                  <td className="py-1.5 pr-3 font-mono">2.1299</td>
                  <td className="py-1.5 font-semibold text-emerald-600">0.038</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400">
            SE reduction: 2.94 → 2.13 (27.6% gain in precision). Point estimate
            is causal in both rows because email was randomized. Only the SE
            changes.
          </p>

          <InfoBox title="The hospital-as-bad-control trap" variant="warning">
            <p className="text-xs text-slate-700">
              Consider:{" "}
              <span className="font-mono text-[10px]">
                Severity → Hospital → Care quality → Outcome
              </span>. Once you control for severity, controlling for which hospital
              a patient attended is a <em>treatment-predictor-only</em> variable —
              it is caused by severity but does not independently cause recovery
              after adjusting for severity and care quality. Including it inflates
              the SE on the treatment effect without providing any bias correction.
              If hospital is also a collider between an unmeasured factor and
              severity, adding it opens a spurious path.
            </p>
          </InfoBox>
        </div>
      </div>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 8 — Instrumental variables & LATE                             */
/* ------------------------------------------------------------------ */

function Step8() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrumental Variables &amp; LATE</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            What do you do when unobserved confounders remain — when the backdoor
            criterion cannot be satisfied with available data? If you can find an
            exogenous <strong>instrument</strong> <Tex math="Z" /> that shoves
            units into treatment without directly affecting the outcome, you can
            still identify a causal effect.
          </p>
          <p>
            With a binary instrument, the <strong>Wald estimator</strong> divides
            the reduced-form effect of <Tex math="Z" /> on <Tex math="Y" /> by the
            first-stage effect of <Tex math="Z" /> on <Tex math="T" />:
          </p>
          <Tex
            math="\hat{\kappa}_{\text{IV}} = \frac{E[Y \mid Z=1] - E[Y \mid Z=0]}{E[T \mid Z=1] - E[T \mid Z=0]} = \frac{\text{Reduced form (ITT)}}{\text{First stage}}"
            display
          />
          <p>
            This equals the causal effect for the subpopulation of{" "}
            <strong>compliers</strong> — units whose treatment status is changed by
            the instrument. This estimand is called the{" "}
            <strong>Local Average Treatment Effect (LATE)</strong>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Five IV assumptions (Mixtape-style)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="pb-2 pr-3 font-medium text-slate-500">#</th>
                  <th className="pb-2 pr-3 font-medium text-slate-500">Assumption</th>
                  <th className="pb-2 pr-3 font-medium text-slate-500">Formal statement</th>
                  <th className="pb-2 font-medium text-slate-500">Classic violation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 pr-3">1</td>
                  <td className="py-1.5 pr-3 font-medium">Relevance</td>
                  <td className="py-1.5 pr-3"><Tex math="\operatorname{Cov}(Z, T) \neq 0" /></td>
                  <td className="py-1.5">Weak first stage (F &lt; 10 rule of thumb)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">2</td>
                  <td className="py-1.5 pr-3 font-medium">Independence</td>
                  <td className="py-1.5 pr-3"><Tex math="Z \perp (Y_0, Y_1)" /></td>
                  <td className="py-1.5">Instrument correlated with unmeasured confounders</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">3</td>
                  <td className="py-1.5 pr-3 font-medium">Exclusion</td>
                  <td className="py-1.5 pr-3"><Tex math="Z \to Y \text{ only through } T" /></td>
                  <td className="py-1.5">Direct path <Tex math="Z \to Y" /> exists</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">4</td>
                  <td className="py-1.5 pr-3 font-medium">Monotonicity</td>
                  <td className="py-1.5 pr-3"><Tex math="T_i(1) \geq T_i(0) \text{ for all } i" /></td>
                  <td className="py-1.5">Defiers exist (some units do the opposite)</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">5</td>
                  <td className="py-1.5 pr-3 font-medium">SUTVA</td>
                  <td className="py-1.5 pr-3">No interference; consistency</td>
                  <td className="py-1.5">Network spillovers from treatment</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Push-notification IV (Facure Ch 9)</p>
          <p>
            A retailer randomly assigns push notifications (<Tex math="Z" />) to
            app users. Not everyone receives them — older phones silently drop
            notifications, and older phones correlate with lower income, which
            correlates with fewer purchases. So actual receipt (<Tex math="T" />)
            is confounded with income.
          </p>
          <p>
            <em>Assignment</em> <Tex math="Z" /> is random (the instrument);
            receipt <Tex math="T" /> is not. The Wald estimate:
          </p>
          <Tex
            math="\frac{2.3636}{0.7176} = 3.2938"
            display
          />
          <p>
            Simple OLS (<Tex math="Y \sim T" />) gives +13.93 — severely upward
            biased because users who receive pushes (newer phones) are wealthier
            and buy more regardless of the push. 2SLS strips out the income
            confounding by using only the exogenous variation from <Tex math="Z" />.
          </p>

          <InfoBox title="Why LATE, not ATE?" variant="muted">
            IV identifies the effect only for <em>compliers</em> — users whose
            receipt status flips from 0 to 1 with assignment. Never-takers
            (phones that always drop pushes) contribute zero first-stage variation,
            so we learn nothing about their treatment effect. Generalizing LATE to
            the full population requires additional untestable assumptions about
            effect heterogeneity.
          </InfoBox>
          <p className="text-xs text-slate-500">
            Canonical examples: Angrist &amp; Krueger (1991) — quarter of birth
            as instrument for years of schooling (compulsory schooling laws);
            Angrist (1990) — Vietnam draft lottery as instrument for military
            service.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 grid-cols-2">
            <StatCard
              label="Simple OLS — Y ~ T"
              value="+13.93"
              formula={"\\hat{\\beta}_{\\text{OLS}}"}
            />
            <StatCard
              label="ITT / Reduced form — Y ~ Z"
              value="+2.3636"
              formula={"E[Y \\mid Z=1] - E[Y \\mid Z=0]"}
            />
            <StatCard
              label="First stage — T ~ Z"
              value="0.7176"
              formula={"E[T \\mid Z=1] - E[T \\mid Z=0]"}
            />
            <StatCard
              label="LATE (2SLS)"
              value="+3.2938"
              formula={"\\hat{\\kappa}_{\\text{IV}} = \\frac{\\text{ITT}}{\\text{First stage}}"}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            SE on LATE = 0.7165. OLS is roughly 4× larger than 2SLS (13.93 / 3.29
            ≈ 4.23) — the gap is entirely attributable to income confounding
            through phone age.
          </p>

          <IVDiagram />
        </div>
      </div>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 9 — Matching & propensity scores                              */
/* ------------------------------------------------------------------ */

function Step9() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matching &amp; Propensity Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <p>
            Matching is "regression without the functional form." Instead of
            extrapolating a linear fit across covariate values, we find treated and
            control units that are similar in <Tex math="X" /> and compare their
            outcomes directly. Formally, matching relies on the{" "}
            <strong>Conditional Independence Assumption (CIA)</strong>:
          </p>
          <Tex
            math="(Y_0, Y_1) \perp T \mid X"
            display
          />
          <p>
            Given <Tex math="X" />, treatment is as good as random — all
            confounding is captured by observed covariates. We also need{" "}
            <strong>common support</strong>:{" "}
            <Tex math="0 < P(T=1 \mid X) < 1" /> for all <Tex math="X" />.
            Without it, some treated units have no comparable controls, and the
            ATE is not identified in that region.
          </p>

          <p className="font-medium text-slate-800">Propensity-score theorem (Rosenbaum &amp; Rubin, 1983)</p>
          <p>
            Controlling for the full covariate vector <Tex math="X" /> can be
            infeasible in high dimensions. The key insight: a single scalar — the{" "}
            <strong>propensity score</strong>{" "}
            <Tex math="p(X) = P(T=1 \mid X)" /> — suffices:
          </p>
          <Tex
            math="(Y_0, Y_1) \perp T \mid p(X)"
            display
          />
          <p>
            If CIA holds given <Tex math="X" />, it also holds given{" "}
            <Tex math="p(X)" />. Matching on one number replaces matching on the
            entire covariate vector — a dramatic dimensionality reduction.
          </p>

          <p className="font-medium text-slate-800">Abadie–Imbens bias-corrected matching estimator</p>
          <p>
            Simple nearest-neighbour matching leaves residual bias when matched
            pairs are not exact. Abadie &amp; Imbens (2011) correct for this by
            adjusting each pair's outcome difference by the predicted outcome gap
            at the matched unit's covariates:
          </p>
          <Tex
            math="\widehat{\text{ATE}} = \frac{1}{N} \sum_i (2T_i - 1) \Big[ (Y_i - Y_{j(i)}) - \big(\hat{\mu}_{1-T_i}(X_i) - \hat{\mu}_{1-T_i}(X_{j(i)})\big) \Big]"
            display
          />
          <p>
            where <Tex math="j(i)" /> is the nearest neighbour and{" "}
            <Tex math="\hat{\mu}_d(\cdot)" /> is a regression estimate of the
            conditional mean under treatment <Tex math="d" />. The correction
            shrinks toward zero as matches become exact.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-medium text-slate-800">Medicine recovery example (Facure Ch 10)</p>
          <p>
            Doctors prescribe medication primarily to sicker patients — a classic
            case of treatment by indication. Naive comparison says the drug{" "}
            <em>adds</em> 16.9 days to recovery. The true effect is a reduction
            in recovery time.
          </p>
          <p>
            Matching on standardized severity, age, and sex with{" "}
            <Tex math="k=1" /> nearest-neighbour (two-sided) corrects most of the
            confounding. Applying the Abadie–Imbens bias correction recovers a
            substantially larger negative effect.
          </p>

          <div className="grid gap-3 grid-cols-1">
            <StatCard
              label="Naive difference in means"
              value="+16.8958 days"
              formula={"\\bar{Y}_{T=1} - \\bar{Y}_{T=0}"}
            />
            <StatCard
              label="NN matching (k=1, raw)"
              value="−0.9954 days"
              formula={"\\widehat{\\text{ATE}}_{\\text{match}}"}
            />
            <StatCard
              label="Bias-corrected matching"
              value="−7.3627 days"
              formula={"\\widehat{\\text{ATE}}_{\\text{BC}}"}
            />
          </div>

          <p className="text-xs text-slate-500">
            Facure's book reports −7.7; the small gap (−7.36 vs −7.7) is due to
            tie-breaking in NN matching across implementations. Both are
            substantially negative, confirming the drug shortens recovery time.
          </p>

          <InfoBox variant="muted">
            Severity confounds so strongly that even raw matching (−1.0) barely
            moves the naive estimate (+16.9). The Abadie–Imbens correction does
            the heavy lifting — it removes residual covariate imbalance within
            matched pairs.
          </InfoBox>

          <p className="text-sm">
            For a deeper treatment with interactive overlap plots and IPW weighting,
            see the{" "}
            <Link
              to="/chalkboard/propensity-score"
              className="text-slate-800 underline underline-offset-2 hover:text-slate-600"
            >
              Propensity Score tutorial
            </Link>{" "}
            in this series.
          </p>
        </div>

        <div className="space-y-3">
          <PSOverlap />

          <InfoBox title="CIA + common support" variant="formula">
            <p className="text-sm text-slate-700">
              <strong>CIA:</strong>{" "}
              <Tex math="(Y_0, Y_1) \perp T \mid X" /> — all confounders are
              observed. Untestable from data alone; requires domain knowledge and
              DAG reasoning.
            </p>
            <p className="text-sm text-slate-700 mt-2">
              <strong>Common support:</strong>{" "}
              <Tex math="0 < p(X) < 1" /> for all <Tex math="X" /> in the
              population. If <Tex math="p(X) \approx 1" /> for some treated
              units, no comparable controls exist — matching extrapolates rather
              than compares.
            </p>
          </InfoBox>
        </div>
      </div>
    </StepContent>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 10 — Python library tour + quiz                               */
/* ------------------------------------------------------------------ */

const LIBRARIES = [
  {
    name: "statsmodels",
    focus: "OLS / GLM regression adjustment",
    install: "pip install statsmodels",
    snippet: `import statsmodels.formula.api as smf

m = smf.ols("y ~ t + x1 + x2", data=df).fit()
print(m.summary().tables[1])  # coef, SE, t, p, CI

# Robust standard errors (HC3)
m_hc = smf.ols("y ~ t + x1 + x2", data=df
    ).fit(cov_type="HC3")`,
    when: "Regression adjustment; OLS/logit with robust and clustered SEs.",
  },
  {
    name: "linearmodels",
    focus: "2SLS / IV, panel fixed effects",
    install: "pip install linearmodels",
    snippet: `from linearmodels.iv import IV2SLS

iv = IV2SLS.from_formula(
    "y ~ 1 + [t ~ z]", data=df
).fit()
print(iv.params["t"], iv.std_errors["t"])

# First stage F-stat (weak-instrument test)
print(iv.first_stage.diagnostics)`,
    when: "First-class 2SLS and LIML; EntityEffects for panel FE.",
  },
  {
    name: "DoWhy",
    focus: "4-step causal API — model, identify, estimate, refute",
    install: "pip install dowhy",
    snippet: `from dowhy import CausalModel

cm = CausalModel(
    data=df, treatment="t", outcome="y", graph=dag
)
est = cm.identify_effect()
ate = cm.estimate_effect(
    est, method_name="backdoor.linear_regression"
)
cm.refute_estimate(
    est, ate, method_name="random_common_cause"
)`,
    when: "Graph-first API with built-in refutation tests for sensitivity analysis.",
  },
  {
    name: "EconML",
    focus: "Heterogeneous effects — Double ML, causal forests",
    install: "pip install econml",
    snippet: `from econml.dml import LinearDML

dml = LinearDML().fit(
    Y=df["y"], T=df["t"],
    X=df[["x1", "x2"]], W=df[["w1"]]
)
# Individual-level CATE estimates
cate = dml.effect(X_new)
lb, ub = dml.effect_interval(X_new)`,
    when: "DML, DRIV, causal forests; point and interval CATE estimates.",
  },
  {
    name: "CausalML",
    focus: "Uplift modelling for marketing and HTE",
    install: "pip install causalml",
    snippet: `from causalml.inference.meta import BaseTRegressor
import lightgbm as lgb

t_learner = BaseTRegressor(
    learner=lgb.LGBMRegressor()
)
t_learner.fit(X, treatment, y)
# Per-unit individual treatment effect
uplift = t_learner.predict(X_new)`,
    when: "Meta-learners (S/T/X/R), uplift trees, AUUC for campaign targeting.",
  },
  {
    name: "CausalPy",
    focus: "Bayesian quasi-experiments — DiD, RDD, ITS",
    install: "pip install causalpy",
    snippet: `import causalpy as cp

did = cp.skl_experiments.DifferenceInDifferences(
    df,
    formula="y ~ 1 + t + post + t:post",
    time_variable_name="post",
    treated=df["t"]
)
did.summary()  # posterior credible intervals`,
    when: "PyMC-backed; posterior credible intervals for quasi-experimental designs.",
  },
];

function LibraryGrid() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {LIBRARIES.map((lib) => (
        <Card key={lib.name} className="text-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono">{lib.name}</CardTitle>
            <p className="text-xs text-slate-500">{lib.focus}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <PythonCode code={lib.snippet} />
            <p className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">When to reach for it:</span>{" "}
              {lib.when}
            </p>
            <p className="text-[10px] font-mono text-slate-400">{lib.install}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Step10() {
  return (
    <StepContent className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Python Library Tour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            Every method covered in steps 1–9 has a mature Python implementation.
            The six packages below form the practical toolkit for applied causal
            inference — from simple OLS adjustment all the way to Bayesian
            quasi-experiments. Choose based on your identification strategy and
            whether you need heterogeneous treatment effects.
          </p>
        </CardContent>
      </Card>

      <LibraryGrid />

      {/* Cross-link section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Deep-dive tutorials in this series</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
            {[
              ["propensity-score", "Propensity Score & IPW", "CIA, overlap, IPW weighting, balance diagnostics"],
              ["doubly-robust", "Doubly Robust Estimation", "AIPW — two chances to be right"],
              ["difference-in-differences", "Difference-in-Differences", "Parallel trends, event studies, staggered adoption"],
              ["panel-data", "Panel Data & Fixed Effects", "Entity FE, TWFE, within-unit variation"],
              ["regression-discontinuity", "Regression Discontinuity", "Sharp RDD, bandwidth selection, McCrary test"],
            ].map(([slug, label, desc]) => (
              <div key={slug} className="rounded-lg border border-slate-100 p-3 space-y-1">
                <Link
                  to={`/chalkboard/${slug}`}
                  className="text-slate-800 font-medium underline underline-offset-2 hover:text-slate-600 text-sm"
                >
                  {label}
                </Link>
                <p className="text-[10px] text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiz */}
      <h3 className="text-base font-semibold text-slate-800 pt-2">Quick check</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <QuizCard
          question="You observe E[Y|T=1] − E[Y|T=0] = +125 and know the ATT = −75. What does that tell you about selection bias?"
          options={[
            "Bias = −200. Treated units had lower untreated potential outcomes than controls.",
            "Bias = +200. Treated units had higher untreated potential outcomes — positive selection into treatment.",
            "Bias = +50. The ATE and ATT differ because of a heterogeneous treatment effect.",
            "There is no selection bias — the naive and ATT differ only because of sampling error.",
          ]}
          correctIndex={1}
          explanation="From the decomposition: naive = ATT + bias, so bias = +125 − (−75) = +200. Tablet schools would have scored E[Y₀|T=1] = 750 even without tablets, while non-tablet schools scored only E[Y₀|T=0] = 550. The +200-point gap is positive selection — richer schools both adopted tablets and had higher baseline achievement."
        />
        <QuizCard
          question="A medical-trial analyst controls for 'was the subject later hospitalized' — a variable measured after treatment assignment. Why is this a bad control?"
          options={[
            "Hospitalization is an instrument, so it should go in the first stage, not the outcome model.",
            "Post-treatment variables are either mediators or colliders; conditioning on them can block the causal path or open a spurious association.",
            "It reduces the sample size because hospitalized patients drop out of follow-up.",
            "It is fine to include — any variable that predicts the outcome should be included for precision.",
          ]}
          correctIndex={1}
          explanation="Hospitalization is measured after treatment, making it a post-treatment variable. If treatment affects hospitalization (T → H → Y), conditioning blocks part of the treatment effect. If an unmeasured severity variable causes both (T → H ← severity → Y), conditioning opens a spurious path. Either way, the treatment coefficient is biased — post-treatment variables are never safe controls."
        />
        <QuizCard
          question="In the push-notification example, OLS gives +13.93 and 2SLS gives +3.29. Which is closer to the true LATE and why?"
          options={[
            "OLS — it uses all available data, so it has a smaller standard error and is more precise.",
            "2SLS — it strips out the income confounding that biases OLS upward, identifying the effect for compliers only.",
            "Neither — only the ITT (intent-to-treat) estimate of +2.36 is valid in this design.",
            "OLS — 2SLS is valid only when the instrument is very strong (first-stage F > 100).",
          ]}
          correctIndex={1}
          explanation="OLS is biased upward because users who receive push notifications (newer phones) are wealthier and buy more regardless of the notification. The instrument — random assignment Z — is independent of income, so 2SLS isolates the effect of actual notification receipt on purchases for compliers: 2SLS = ITT / first-stage = 2.3636 / 0.7176 = 3.29."
        />
        <QuizCard
          question="Propensity-score matching requires common support. What goes wrong if p̂(X) ≈ 1 for a subset of treated units?"
          options={[
            "The propensity score model overfits; use a smaller regularization penalty to fix it.",
            "No control units have comparable covariates — those treated units cannot be matched and the ATE is not identified in that region.",
            "Matching is unaffected because it uses covariate distance, not propensity score values.",
            "Nothing goes wrong — matching is robust to extreme propensity scores by construction.",
          ]}
          correctIndex={1}
          explanation="When p̂(X) ≈ 1 for a treated unit, virtually every similar unit gets treated — meaning no untreated comparators exist at those covariate values. The ATE is not identified there: in IPW the control-side weight 1/(1 − p̂) → ∞ (extreme variance); in matching the nearest neighbour is covariate-distant (extrapolation, not observation). Both are symptoms of the same positivity violation. The ATE can only be identified over the region of common support."
        />
      </div>
    </StepContent>
  );
}

/* ================================================================== */
/*  Root component                                                      */
/* ================================================================== */

export default function CausalInferenceOverviewTutorial() {
  const steps = [
    <Step1 />,
    <Step2 />,
    <Step3 />,
    <Step4 />,
    <Step5 />,
    <Step6 />,
    <Step7 />,
    <Step8 />,
    <Step9 />,
    <Step10 />,
  ];

  return (
    <TutorialShell
      title="Causal Inference: A Map of the Territory"
      description="An overview of core causal inference ideas — potential outcomes, randomization, DAGs, regression adjustment, IV, and matching — synthesized from Facure's Python Causality Handbook (Ch 1–10) and Cunningham's Mixtape. Ends with a tour of the Python causal-inference library ecosystem."
      lessons={LESSONS}
    >
      {(step) => steps[step]}
    </TutorialShell>
  );
}
