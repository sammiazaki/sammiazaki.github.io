import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// `lane` values: 0=top-near, 1=top-far, 2=bottom-near, 3=bottom-far
// Lanes alternate to keep labels from colliding in dense clusters.
const MILESTONES = [
  { year: 1900, label: "Hilbert's 23 problems", lane: 0, desc: "Hilbert names the great open questions of mathematics. The Entscheidungsproblem hides among them." },
  { year: 1928, label: "Entscheidungsproblem", lane: 2, desc: "Hilbert formalizes: is there a mechanical procedure that decides every logical statement?" },
  { year: 1936, label: "Turing machine", lane: 1, desc: "Turing & Church independently say no — and Turing gives us the first formal model of computation." },
  { year: 1947, label: "Simplex method", lane: 3, desc: "Dantzig invents Simplex: fast in practice, exponential in worst case. The first 'efficient' algorithm worth analyzing." },
  { year: 1956, label: "Gödel's lost letter", lane: 0, desc: "Gödel writes von Neumann describing — fifteen years early — what we now call P vs NP." },
  { year: 1965, label: "Complexity theory born", lane: 2, desc: "Hartmanis & Stearns prove the time hierarchy theorem; Edmonds defines polynomial = tractable." },
  { year: 1971, label: "Cook–Levin (SAT)", lane: 1, highlight: true, desc: "Cook proves SAT is at least as hard as every problem in NP. The single most important reduction in CS." },
  { year: 1972, label: "Karp's 21 problems", lane: 3, highlight: true, desc: "Karp shows 21 famous combinatorial problems are all NP-complete. The field explodes." },
  { year: 1975, label: "Relativization barrier", lane: 0, desc: "Baker–Gill–Solovay: oracle-relative results go both ways. Most diagonalization-style proofs cannot resolve P vs NP." },
  { year: 1979, label: "Garey & Johnson", lane: 2, desc: "The textbook that turned NP-completeness into a working tool every CS researcher uses." },
  { year: 1992, label: "PCP theorem", lane: 1, desc: "Every NP proof can be checked by reading 3 random bits. Foundation of hardness-of-approximation." },
  { year: 1997, label: "Natural proofs barrier", lane: 3, desc: "Razborov & Rudich: most circuit lower-bound techniques can't separate P from NP without breaking cryptography." },
  { year: 2002, label: "PRIMES ∈ P", lane: 0, highlight: true, desc: "Agrawal, Kayal & Saxena give a clean polynomial-time primality test. A rare clean post-1980 result." },
  { year: 2008, label: "Algebrization", lane: 2, desc: "Aaronson & Wigderson: an even broader class of techniques is provably insufficient to resolve P vs NP." },
  { year: 2010, label: "Deolalikar's attempt", lane: 1, desc: "A claimed P ≠ NP proof that captivated the blogosphere for a week before consensus emerged that it had unfixable gaps." },
  { year: 2019, label: "Quantum supremacy", lane: 3, desc: "Google claims a quantum computer outperformed classical ones. The BQP era goes practical." },
  { year: 2026, label: "P vs NP, still open", lane: 0, desc: "Seventy years after Gödel's letter. The Clay $1M prize remains unclaimed." },
];

// Lane geometry: y-offsets relative to the central line.
const LANE = {
  0: { stem: -38, year: -50, label: -64 },   // top-near
  1: { stem: -78, year: -90, label: -104 },  // top-far
  2: { stem: 38, year: 56, label: 70 },      // bottom-near
  3: { stem: 78, year: 96, label: 110 },     // bottom-far
};

const W = 1180;
const H = 460;
const MARGIN_X = 60;
const LINE_Y = H / 2;
const YEAR_MIN = 1895;
const YEAR_MAX = 2030;
const LINE_DURATION = 1.4;
const DOT_STAGGER = 0.1;

function xForYear(year) {
  return MARGIN_X + ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * (W - 2 * MARGIN_X);
}

const DECADE_TICKS = [1900, 1920, 1940, 1960, 1980, 2000, 2020];

export default function ComplexityTimeline() {
  const [replayKey, setReplayKey] = useState(0);
  const [hovered, setHovered] = useState(null);

  const totalDuration = useMemo(
    () => LINE_DURATION + MILESTONES.length * DOT_STAGGER + 0.4,
    []
  );

  // Static vertical list — used on mobile (always visible) and desktop (collapsible).
  const milestoneList = (
    <ol className="space-y-2 pl-2">
      {MILESTONES.map((m, i) => (
        <li
          key={i}
          className="flex gap-3 border-l-2 pl-3 py-1"
          style={{
            borderColor: m.highlight ? "#10b981" : "#e2e8f0",
          }}
        >
          <span className="font-mono text-slate-500 shrink-0 w-12 text-sm">
            {m.year}
          </span>
          <div className="text-sm">
            <span className="font-medium text-slate-800">{m.label}</span>
            {m.highlight && (
              <span className="ml-2 text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded align-middle">
                Landmark
              </span>
            )}
            <span className="text-slate-600"> — {m.desc}</span>
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="space-y-4">
      {/* Animated SVG — hidden below lg because labels become unreadable */}
      <div className="hidden lg:block rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
            From the Entscheidungsproblem to today
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReplayKey((k) => k + 1);
              setHovered(null);
            }}
            className="gap-1.5 text-xs h-7"
          >
            <RotateCcw className="w-3 h-3" />
            Replay
          </Button>
        </div>

        <svg
          key={replayKey}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Animated timeline of complexity theory milestones from 1900 to 2026"
        >
          {/* Main horizontal line */}
          <motion.line
            x1={MARGIN_X}
            y1={LINE_Y}
            x2={W - MARGIN_X}
            y2={LINE_Y}
            stroke="#1e293b"
            strokeWidth={1.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: LINE_DURATION, ease: "easeInOut" }}
          />

          {/* Decade ticks */}
          {DECADE_TICKS.map((year) => {
            const cx = xForYear(year);
            return (
              <motion.g
                key={year}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: LINE_DURATION * 0.3 }}
              >
                <line
                  x1={cx}
                  y1={LINE_Y - 4}
                  x2={cx}
                  y2={LINE_Y + 4}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                <text
                  x={cx}
                  y={LINE_Y + 18}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400"
                >
                  {year}
                </text>
              </motion.g>
            );
          })}

          {/* Milestones */}
          {MILESTONES.map((m, i) => {
            const cx = xForYear(m.year);
            const lane = LANE[m.lane];
            const stemEnd = LINE_Y + lane.stem;
            const yearY = LINE_Y + lane.year;
            const labelY = LINE_Y + lane.label;
            const delay = LINE_DURATION + i * DOT_STAGGER;
            const isHovered = hovered === i;
            const isHighlight = m.highlight;
            const dotR = isHighlight ? 5.5 : 4;
            const dotFill = isHighlight ? "#10b981" : "#1e293b";

            return (
              <motion.g
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Stem */}
                <line
                  x1={cx}
                  y1={LINE_Y}
                  x2={cx}
                  y2={stemEnd}
                  stroke={isHovered ? "#1e293b" : "#94a3b8"}
                  strokeWidth={isHovered ? 1 : 0.6}
                  strokeDasharray="2,2"
                />

                {/* Dot with spring entrance + pulse for highlights */}
                <motion.circle
                  cx={cx}
                  cy={LINE_Y}
                  r={dotR}
                  fill={dotFill}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay,
                    type: "spring",
                    stiffness: 320,
                    damping: 16,
                  }}
                />
                {isHighlight && (
                  <motion.circle
                    cx={cx}
                    cy={LINE_Y}
                    r={dotR}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                    transition={{
                      delay: delay + 0.2,
                      duration: 1.4,
                      repeat: Infinity,
                      repeatDelay: 1.6,
                      ease: "easeOut",
                    }}
                  />
                )}

                {/* Hover halo */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={LINE_Y}
                    r={dotR + 5}
                    fill="none"
                    stroke={isHighlight ? "#10b981" : "#1e293b"}
                    strokeWidth={1}
                    opacity={0.4}
                  />
                )}

                {/* Year label (above stem) */}
                <text
                  x={cx}
                  y={yearY}
                  textAnchor="middle"
                  className={`text-[10px] font-semibold ${
                    isHovered ? "fill-slate-900" : "fill-slate-700"
                  }`}
                >
                  {m.year}
                </text>

                {/* Event label */}
                <text
                  x={cx}
                  y={labelY}
                  textAnchor="middle"
                  className={`text-[9px] ${
                    isHovered ? "fill-slate-900" : "fill-slate-500"
                  }`}
                >
                  {m.label}
                </text>
              </motion.g>
            );
          })}
        </svg>

        {/* Hover detail panel — fixed height to prevent layout shift */}
        <div className="mt-3 min-h-[64px] rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors">
          {hovered !== null ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {MILESTONES[hovered].year}
                </span>
                <span className="text-sm font-medium text-slate-700">
                  {MILESTONES[hovered].label}
                </span>
                {MILESTONES[hovered].highlight && (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Landmark
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                {MILESTONES[hovered].desc}
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              Hover any milestone to read more. Replay restarts the animation
              ({totalDuration.toFixed(1)}s).
            </div>
          )}
        </div>
      </div>

      {/* Mobile/tablet: always-visible list */}
      <div className="lg:hidden rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium mb-3">
          Complexity theory milestones, 1900–2026
        </div>
        {milestoneList}
      </div>

      {/* Desktop: collapsible list, doubles as a quick reference */}
      <details className="hidden lg:block text-sm">
        <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
          See all milestones as a list
        </summary>
        <ol className="mt-3 space-y-2 pl-2">
          {MILESTONES.map((m, i) => (
            <li
              key={i}
              className="flex gap-3 border-l-2 border-slate-200 pl-3 py-1"
              style={{
                borderColor: m.highlight ? "#10b981" : undefined,
              }}
            >
              <span className="font-mono text-slate-500 shrink-0 w-12">
                {m.year}
              </span>
              <div>
                <span className="font-medium text-slate-800">{m.label}</span>
                <span className="text-slate-600"> — {m.desc}</span>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
