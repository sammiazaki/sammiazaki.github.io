import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

export default function QuizCard({ question, options, correctIndex, explanation }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((opt, i) => {
          const active = selected === i;
          const correct = revealed && i === correctIndex;
          const wrong = revealed && active && i !== correctIndex;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                correct
                  ? "border-emerald-500 bg-emerald-50"
                  : wrong
                    ? "border-rose-500 bg-rose-50"
                    : active
                      ? "border-slate-700 bg-slate-50"
                      : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {correct ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : wrong ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border" />
                  )}
                </div>
                <div>{opt}</div>
              </div>
            </button>
          );
        })}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => setRevealed(true)} disabled={selected === null}>
            Check
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelected(null);
              setRevealed(false);
            }}
          >
            Reset
          </Button>
        </div>

        {revealed && (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            {explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
