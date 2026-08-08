import { STATUS } from "../lib/chartTheme";

const ROWS = [
  { key: "recommended", label: "Recommended (optimised)" },
  { key: "fixedInterval", label: "Fixed interval" },
  { key: "thresholdBased", label: "Threshold based" },
  { key: "linearProgramme", label: "Linear programme" },
];

export default function BaselineComparisonTable({ recommended, baselines }) {
  const dataByKey = {
    recommended,
    fixedInterval: baselines.fixedInterval,
    thresholdBased: baselines.thresholdBased,
    linearProgramme: baselines.linearProgramme,
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th scope="col" className="py-2 pr-4 font-medium">
              Strategy
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Total water
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Irrigation days
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Min soil moisture
            </th>
            <th scope="col" className="py-2 font-medium">
              Stress risk
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => {
            const entry = dataByKey[key];
            if (!entry) return null;
            const atRisk = entry.daysBelowWiltingPoint > 0;

            return (
              <tr key={key} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 pr-4">
                  <span className="font-medium text-slate-800">{label}</span>
                  {key === "recommended" && (
                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      recommended
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4 tabular-nums text-slate-600">{entry.totalWaterMm.toFixed(1)} mm</td>
                <td className="py-2.5 pr-4 tabular-nums text-slate-600">{entry.irrigationDays}</td>
                <td className="py-2.5 pr-4 tabular-nums text-slate-600">{entry.minVwc.toFixed(1)}%</td>
                <td className="py-2.5">
                  {atRisk ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS.critical }}
                        aria-hidden="true"
                      />
                      {entry.daysBelowWiltingPoint} day{entry.daysBelowWiltingPoint === 1 ? "" : "s"} below wilting point
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS.good }}
                        aria-hidden="true"
                      />
                      No stress risk
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
