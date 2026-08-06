import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART_INK, SEQUENTIAL_BLUE } from "../lib/chartTheme";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="text-slate-500">{formatDate(label)}</p>
      <p className="font-semibold text-slate-900">{payload[0].value.toFixed(1)}% soil moisture</p>
    </div>
  );
}

export default function MoistureChart({ series }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={CHART_INK.gridline} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: CHART_INK.muted, fontSize: 12 }}
          axisLine={{ stroke: CHART_INK.baseline }}
          tickLine={false}
        />
        <YAxis
          unit="%"
          tick={{ fill: CHART_INK.muted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="vwc"
          stroke={SEQUENTIAL_BLUE}
          strokeWidth={2}
          fill={SEQUENTIAL_BLUE}
          fillOpacity={0.1}
          dot={false}
          activeDot={{ r: 4, fill: SEQUENTIAL_BLUE, stroke: "#fff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
