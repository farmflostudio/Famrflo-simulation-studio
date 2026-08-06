import { MODEL_COLORS, MODEL_LABELS } from "../lib/chartTheme";

export default function ModelMetricsTable({ models, defaultModel }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4 font-medium">Model</th>
            <th className="py-2 pr-4 font-medium">RMSE</th>
            <th className="py-2 pr-4 font-medium">MAE</th>
            <th className="py-2 font-medium">R²</th>
          </tr>
        </thead>
        <tbody>
          {models.map((entry) => (
            <tr key={entry.model} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-4">
                <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: MODEL_COLORS[entry.model] }}
                  />
                  {MODEL_LABELS[entry.model] || entry.model}
                  {entry.model === defaultModel && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      default
                    </span>
                  )}
                </span>
              </td>
              <td className="py-2.5 pr-4 tabular-nums text-slate-600">{entry.rmse.toFixed(2)}</td>
              <td className="py-2.5 pr-4 tabular-nums text-slate-600">{entry.mae.toFixed(2)}</td>
              <td className="py-2.5 tabular-nums text-slate-600">{entry.r2.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
