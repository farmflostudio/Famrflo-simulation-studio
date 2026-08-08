import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK, SEQUENTIAL_BLUE } from "../lib/chartTheme";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500">{formatDate(label)}</p>
      <p className="font-semibold text-slate-900">{payload[0].value.toFixed(1)} mm irrigation</p>
    </div>
  );
}

export default function IrrigationChart({ plan }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={plan} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_INK.gridline} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: CHART_INK.muted, fontSize: 12 }}
          axisLine={{ stroke: CHART_INK.baseline }}
          tickLine={false}
        />
        <YAxis
          unit="mm"
          tick={{ fill: CHART_INK.muted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11,11,11,0.03)" }} />
        <Bar dataKey="recommendedMm" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
