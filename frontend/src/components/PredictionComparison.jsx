import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK, MODEL_COLORS, MODEL_LABELS } from "../lib/chartTheme";

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-slate-900">{point.label}</p>
      <p className="text-slate-500">{point.value.toFixed(1)}% predicted soil moisture</p>
    </div>
  );
}

export default function PredictionComparison({ predictions, defaultModel }) {
  const data = Object.entries(predictions).map(([model, value]) => ({
    model,
    label: MODEL_LABELS[model] || model,
    value,
    isDefault: model === defaultModel,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
          <XAxis type="number" unit="%" tick={{ fill: CHART_INK.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: CHART_INK.secondary, fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11,11,11,0.03)" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((entry) => (
              <Cell key={entry.model} fill={MODEL_COLORS[entry.model]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
        {data.map((entry) => (
          <span key={entry.model} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MODEL_COLORS[entry.model] }} />
            {entry.label}
            {entry.isDefault && <span className="font-medium text-slate-700">(default)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
