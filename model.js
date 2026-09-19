const DAY = 86400000;
export function day(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid date “${value}”. Use YYYY-MM-DD.`);
  const result = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(result) || new Date(result).toISOString().slice(0, 10) !== value) throw new Error(`Invalid calendar date “${value}”.`);
  return result / DAY;
}
export function validateConfig(config) {
  if (!config || typeof config.schoolName !== 'string' || !config.schoolName.trim()) throw new Error('config.json needs a schoolName.');
  if (!Number.isFinite(config.goalHours) || config.goalHours <= 0) throw new Error('goalHours must be a positive number.');
  if (day(config.endDate) <= day(config.startDate)) throw new Error('endDate must be after startDate.');
  return config;
}
// The deliberately small CSV contract has two unquoted scalar columns.
export function parseCSV(text, config) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((text, i) => ({text: text.trim(), line: i + 1})).filter(row => row.text);
  if (!lines.length || lines[0].text.split(',').map(s => s.trim()).join(',') !== 'date,cumulative_hours') throw new Error('CSV header must be date,cumulative_hours.');
  if (lines.length === 1) throw new Error('No data rows found. Keep the zero-hour baseline and add weekly reports.');
  const start = day(config.startDate), end = day(config.endDate);
  const seen = new Set();
  const rows = lines.slice(1).map(({text, line}) => {
    const fields = text.split(',').map(s => s.trim());
    if (fields.length !== 2) throw new Error(`Line ${line}: expected a date and a cumulative total.`);
    const [date, raw] = fields, dateDay = day(date);
    if (dateDay < start || dateDay > end) throw new Error(`Line ${line}: date is outside the campaign.`);
    if (seen.has(date)) throw new Error(`Line ${line}: duplicate date ${date}. Edit the existing row instead.`);
    seen.add(date);
    if (!/^\d+(\.\d+)?$/.test(raw) || !Number.isFinite(Number(raw))) throw new Error(`Line ${line}: hours must be a nonnegative number, such as 12.5.`);
    return {date, hours: Number(raw), day: dateDay};
  }).sort((a,b) => a.day - b.day);
  if (rows[0].date !== config.startDate || rows[0].hours !== 0) throw new Error(`Keep the baseline row ${config.startDate},0. Report later totals on their report dates.`);
  rows.forEach((row,i) => { if (i && row.hours < rows[i-1].hours) throw new Error(`Total on ${row.date} is lower than the previous total. Correct the affected historical rows so cumulative totals never decrease.`); });
  return rows;
}
export function calculate(config, rows, today = new Date().toLocaleDateString('en-CA', {timeZone:'America/Chicago'})) {
  const start = day(config.startDate), end = day(config.endDate), latest = rows.at(-1);
  const duration = end - start, elapsed = latest.day - start, remainingDays = end - latest.day;
  const goal = config.goalHours, ev = latest.hours, pv = goal * elapsed / duration;
  const variance = ev - pv, remaining = Math.max(goal - ev, 0);
  const roundedVariance = Math.round((variance + Number.EPSILON) * 100) / 100;
  const achieved = ev >= goal;
  const status = achieved ? 'Goal achieved!' : rows.length === 1 ? 'Awaiting first report' : remainingDays === 0 ? 'Goal not yet reached' : roundedVariance < 0 ? 'Behind target' : roundedVariance > 0 ? 'Ahead of target' : 'On track';
  return {start,end,duration,elapsed,remainingDays,goal,ev,pv,variance,remaining,latest,status,achieved,
    baseline:goal * 7 / duration, spi:pv === 0 ? null : ev / pv, completion:ev / goal * 100,
    required:remaining === 0 ? 0 : remainingDays === 0 ? null : remaining * 7 / remainingDays,
    behind:roundedVariance < 0, awaiting:rows.length === 1,
    stale:day(today) >= start && day(today) <= end && day(today) - latest.day > 7,
    targetPoints:[...Array.from({length:Math.ceil(duration / 7)},(_,i) => start + i*7),end].map(d => ({day:d,hours:goal*(d-start)/duration}))};
}
