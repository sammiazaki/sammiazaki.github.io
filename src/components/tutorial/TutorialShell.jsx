import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

export default function TutorialShell({
  title,
  description,
  intro,
  lessons,
  children,
}) {
  const [step, setStep] = useState(0);
  const pillsRef = useRef(null);
  const headerRef = useRef(null);
  const progress = ((step + 1) / lessons.length) * 100;
  const isFirst = step === 0;
  const isLast = step === lessons.length - 1;

  /* Measure the blog nav height once so sticky offset is exact */
  const [navH, setNavH] = useState(0);
  useEffect(() => {
    const nav = document.querySelector("header.sticky");
    if (nav) setNavH(nav.offsetHeight);
  }, []);

  /* Scroll active pill into view */
  useEffect(() => {
    const container = pillsRef.current;
    if (!container) return;
    const active = container.querySelector("[data-active]");
    if (active) {
      const left =
        active.offsetLeft -
        container.offsetWidth / 2 +
        active.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [step]);

  /* Scroll page to top on step change */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (e.key === "ArrowRight" && !isLast) setStep((s) => s + 1);
      if (e.key === "ArrowLeft" && !isFirst) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFirst, isLast]);

  const goNext = () => setStep((s) => Math.min(s + 1, lessons.length - 1));
  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Sticky header ─────────────────────────────────── */}
      <div
        ref={headerRef}
        className="sticky z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/60"
        style={{ top: navH || 57 }}
      >
        {/* Progress line */}
        <div className="h-[2px] bg-slate-100">
          <div
            className="h-full bg-slate-800 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Title row */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/noodlelab"
              className="flex-none text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Back to Noodlelab"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {title}
            </h1>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {step + 1} / {lessons.length}
          </span>
        </div>

        {/* Pill strip */}
        <div
          ref={pillsRef}
          className="mx-auto max-w-5xl px-4 sm:px-6 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide"
        >
          {lessons.map((lesson, i) => {
            const isActive = i === step;
            const isCompleted = i < step;
            return (
              <button
                key={i}
                data-active={isActive ? "" : undefined}
                onClick={() => setStep(i)}
                className={`
                  flex-none rounded-full px-3 py-1 text-xs font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : isCompleted
                        ? "bg-slate-200/80 text-slate-600 hover:bg-slate-300/80"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-200/80 hover:text-slate-600"
                  }
                `}
              >
                <span className="mr-1.5 opacity-60">{i + 1}</span>
                <span className="hidden sm:inline">{lesson}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ──────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 pb-28">
        {/* Intro card — only on step 0 */}
        {step === 0 && (description || intro) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-slate-200/60 bg-white p-5 sm:p-6 shadow-sm"
          >
            {description && (
              <p className="text-sm text-slate-500 leading-relaxed">
                {description}
              </p>
            )}
            {intro && (
              <div className="mt-3 text-sm text-slate-700 space-y-2 leading-relaxed">
                {intro}
              </div>
            )}
          </motion.div>
        )}

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {children(step)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Floating bottom nav ───────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/60 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={isFirst}
            onClick={goPrev}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <span className="text-xs text-slate-400">
            {lessons[step]}
          </span>

          {!isLast ? (
            <Button size="sm" onClick={goNext} className="gap-1">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>
    </div>
  );
}
