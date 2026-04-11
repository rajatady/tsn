import { _dt_now, _dt_add_days, _dt_year, _dt_month, _dt_day, _dt_format } from "tsn-datetime"

function main(): void {
  const now = _dt_now();
  const year = _dt_year(now);
  const month = _dt_month(now);
  const day = _dt_day(now);

  console.log("=== TSN Native FFI Test ===");
  console.log("Current timestamp: " + String(now));
  console.log("Year: " + String(year));
  console.log("Month: " + String(month));
  console.log("Day: " + String(day));

  const formatted = _dt_format(now);
  console.log("Formatted: " + formatted);

  const nextWeek = _dt_add_days(now, 7);
  const nextWeekFormatted = _dt_format(nextWeek);
  console.log("Next week: " + nextWeekFormatted);

  console.log("=== FFI Test Complete ===");
}
