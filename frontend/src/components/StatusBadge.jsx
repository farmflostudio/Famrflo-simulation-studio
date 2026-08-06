import { STATUS } from "../lib/chartTheme";

const LEVELS = {
  good: { color: STATUS.good, label: "Well watered" },
  warning: { color: STATUS.warning, label: "Getting dry" },
  serious: { color: STATUS.serious, label: "Needs irrigation soon" },
  critical: { color: STATUS.critical, label: "Critically dry" },
};

export function moistureStatus(vwc, fieldCapacity, wiltingPoint) {
  const span = fieldCapacity - wiltingPoint;
  const ratio = span > 0 ? (vwc - wiltingPoint) / span : 1;

  if (ratio >= 0.5) return "good";
  if (ratio >= 0.3) return "warning";
  if (ratio >= 0.15) return "serious";
  return "critical";
}

export default function StatusBadge({ level }) {
  const { color, label } = LEVELS[level] || LEVELS.good;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
