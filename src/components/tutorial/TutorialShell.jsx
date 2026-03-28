import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

export default function TutorialShell({ title, description, intro, lessons, children }) {
  const [step, setStep] = useState(0);
  const progress = ((step + 1) / lessons.length) * 100;
  const isFirst = step === 0;
  const isLast = step === lessons.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]"
        >
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-3xl">{title}</CardTitle>
              {description && <CardDescription className="text-base">{description}</CardDescription>}
            </CardHeader>
            {intro && (
              <CardContent className="space-y-4 text-slate-700">{intro}</CardContent>
            )}
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={progress} />
              <div className="text-sm text-slate-600">
                Step {step + 1} of {lessons.length}
              </div>
              <div className="space-y-2">
                {lessons.map((lesson, i) => (
                  <button
                    key={lesson}
                    onClick={() => setStep(i)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                      i === step
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {i + 1}. {lesson}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {children(step)}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            disabled={isFirst}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          {!isLast && (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
