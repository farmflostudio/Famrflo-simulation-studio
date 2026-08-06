export function recentRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));

  const format = (date) => date.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end) };
}
