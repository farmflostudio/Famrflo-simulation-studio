export default function ExplanationCard({ explanation, source, guardrailPassed }) {
  const isGemini = source === "gemini" && guardrailPassed;

  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">{explanation}</p>
      <div className="mt-4">
        {isGemini ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            AI generated, checked against the real plan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
            Standard summary (AI explanation unavailable)
          </span>
        )}
      </div>
    </div>
  );
}
