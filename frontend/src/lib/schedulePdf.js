import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const BRAND_GREEN = [5, 150, 105]; // emerald-600, matches the app's accent colour
const INK = [30, 41, 59]; // slate-800
const MUTED = [100, 116, 139]; // slate-500

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function strategyLabel(strategy) {
  return {
    optimised: "Recommended (optimised)",
    fixedInterval: "Fixed interval (baseline)",
    thresholdBased: "Threshold based (baseline)",
    linearProgramme: "Linear programme (baseline)",
  }[strategy] || strategy;
}

export function downloadSchedulePdf({ farm, schedule }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_GREEN);
  doc.text("FarmFlo Simulation Studio", margin, y);

  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text("Irrigation schedule report", margin, (y += 20));

  doc.setDrawColor(...BRAND_GREEN);
  doc.setLineWidth(1.2);
  doc.line(margin, (y += 10), pageWidth - margin, y);

  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(farm.name, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const generatedOn = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated ${generatedOn}`, pageWidth - margin, y, { align: "right" });

  y += 22;
  const details = [
    ["Location", farm.location?.label || `${farm.location?.latitude}, ${farm.location?.longitude}`],
    ["Soil type", schedule.soilType || "—"],
    ["Land cover", schedule.landCover || "—"],
    ["Reference monitoring site", schedule.referenceSite || "—"],
    ["Planning horizon", `${schedule.horizonDays} days`],
    ["Field capacity", `${schedule.fieldCapacity?.toFixed(1)}%`],
    ["Wilting point", `${schedule.wiltingPoint?.toFixed(1)}%`],
  ];
  if (farm.areaHectares) {
    details.push(["Farm area", `${farm.areaHectares} hectares`]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, textColor: INK, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 160, textColor: MUTED } },
    body: details,
  });
  y = doc.lastAutoTable.finalY + 18;

  if (schedule.irrigationApplicable === false) {
    doc.setFillColor(254, 249, 195); // amber-100
    doc.roundedRect(margin, y, pageWidth - margin * 2, 46, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text("Not typically irrigated", margin + 10, y + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(schedule.policyNote || "", pageWidth - margin * 2 - 20);
    doc.text(noteLines, margin + 10, y + 32);
    y += 46 + 20;
  } else {
    const rec = schedule.recommended;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Summary", margin, y);
    y += 14;

    const stats = [
      ["Total water recommended", `${rec.totalWaterMm.toFixed(1)} mm`],
      ["Irrigation days", `${rec.irrigationDays} of ${schedule.horizonDays}`],
      ["Minimum predicted soil moisture", `${rec.minVwc.toFixed(1)}%`],
      ["Days below wilting point", `${rec.daysBelowWiltingPoint}`],
    ];
    if (rec.totalWaterLitres != null) {
      stats.splice(1, 0, ["Total water recommended (volume)", `${Math.round(rec.totalWaterLitres).toLocaleString("en-GB")} litres`]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "grid",
      headStyles: { fillColor: BRAND_GREEN },
      styles: { fontSize: 9, cellPadding: 5 },
      body: stats,
    });
    y = doc.lastAutoTable.finalY + 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Day by day plan", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: BRAND_GREEN },
      styles: { fontSize: 9, cellPadding: 5 },
      head: [["Date", "Irrigation (mm)", "Soil moisture before", "Soil moisture after"]],
      body: rec.plan.map((entry) => [
        formatDate(entry.date),
        entry.recommendedMm.toFixed(1),
        `${entry.vwcBeforeIrrigation.toFixed(1)}%`,
        `${entry.predictedVwc.toFixed(1)}%`,
      ]),
    });
    y = doc.lastAutoTable.finalY + 20;
  }

  if (y > doc.internal.pageSize.getHeight() - 160) {
    doc.addPage();
    y = 48;
  }

  if (schedule.explanation) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("What this means for you", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const explanationLines = doc.splitTextToSize(schedule.explanation, pageWidth - margin * 2);
    doc.text(explanationLines, margin, y);
    y += explanationLines.length * 13 + 20;
  }

  if (y > doc.internal.pageSize.getHeight() - 140) {
    doc.addPage();
    y = 48;
  }

  const strategies = [
    ["optimised", schedule.recommended],
    ["fixedInterval", schedule.baselines?.fixedInterval],
    ["thresholdBased", schedule.baselines?.thresholdBased],
    ["linearProgramme", schedule.baselines?.linearProgramme],
  ].filter(([, result]) => result);

  if (strategies.length > 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Recommended vs baseline strategies", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      headStyles: { fillColor: BRAND_GREEN },
      styles: { fontSize: 9, cellPadding: 5 },
      head: [["Strategy", "Total water (mm)", "Irrigation days", "Min soil moisture"]],
      body: strategies.map(([key, result]) => [
        strategyLabel(key),
        result.totalWaterMm.toFixed(1),
        String(result.irrigationDays),
        `${result.minVwc.toFixed(1)}%`,
      ]),
    });
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Generated by FarmFlo Simulation Studio. A decision-support estimate, not a substitute for on-farm judgement.",
      margin,
      doc.internal.pageSize.getHeight() - 24
    );
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 24, {
      align: "right",
    });
  }

  const safeFarmName = farm.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`irrigation-schedule-${safeFarmName}-${dateStamp}.pdf`);
}
