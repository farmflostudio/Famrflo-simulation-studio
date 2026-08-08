function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SchedulePlanTable({ plan }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Day by day irrigation plan and predicted soil moisture</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th scope="col" className="py-2 pr-4 font-medium">
              Date
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              Irrigation
            </th>
            <th scope="col" className="py-2 font-medium">
              Predicted soil moisture
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.map((entry) => (
            <tr key={entry.date} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-4 text-slate-600">{formatDate(entry.date)}</td>
              <td className="py-2 pr-4 tabular-nums text-slate-800">{entry.recommendedMm.toFixed(1)} mm</td>
              <td className="py-2 tabular-nums text-slate-600">{entry.predictedVwc.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
