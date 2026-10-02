// Per-day overrides layered on top of the stock SCHEDULE, never mutating
// it. "Defaults to the standard schedule" is simply: no override exists
// for that day, so getEffectiveDay falls back to the stock array. Nothing
// downstream (timer engine, cue controller, progress/history) needs to
// know the difference — they already just consume whatever array
// currentDay() hands them.
//
// Scope boundary: only interval DURATIONS can be customized, never the
// number or order of intervals. An override is always built from the
// stock day's type sequence, so it's guaranteed shape-compatible with the
// engine — no empty days, no orphaned walk with no run before it.

const STORAGE_KEY = "c25k:overrides:v1";

function dayKey(weekIndex, dayIndex) {
  return weekIndex + "-" + dayIndex;
}

export function loadOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    return {};
  }
}

export function saveOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch (e) {
    return false;
  }
}

export function getEffectiveDay(schedule, weekIndex, dayIndex, overrides) {
  const override = overrides[dayKey(weekIndex, dayIndex)];
  return override || schedule[weekIndex].days[dayIndex];
}

export function hasOverride(weekIndex, dayIndex, overrides) {
  return Boolean(overrides[dayKey(weekIndex, dayIndex)]);
}

// Pure: returns a NEW overrides object with this day replaced.
// newDurations must line up 1:1 with the stock day's intervals — types
// and order always come from the stock schedule, never from a previous
// override, so edits never compound into something the engine can't read.
export function setOverrideDay(schedule, weekIndex, dayIndex, newDurations, overrides) {
  const stockDay = schedule[weekIndex].days[dayIndex];
  const newDay = stockDay.map((iv, i) => ({ type: iv.type, duration: newDurations[i] }));
  return { ...overrides, [dayKey(weekIndex, dayIndex)]: newDay };
}

export function clearOverrideDay(weekIndex, dayIndex, overrides) {
  const key = dayKey(weekIndex, dayIndex);
  const { [key]: _removed, ...rest } = overrides;
  return rest;
}
