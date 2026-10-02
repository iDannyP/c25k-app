// Pure function: given a day's list of intervals and a number of elapsed
// seconds, return exactly where the workout stands. No clock, no state,
// no side effects — everything that touches a real clock or speaks a cue
// calls this function rather than owning this logic itself.

import { totalDuration } from "./schedule.js";

export function getWorkoutState(day, elapsedSeconds) {
  let cursor = 0;
  for (let i = 0; i < day.length; i++) {
    const iv = day[i];
    if (elapsedSeconds < cursor + iv.duration) {
      return {
        intervalIndex: i,
        interval: iv,
        elapsedInInterval: elapsedSeconds - cursor,
        remainingInInterval: cursor + iv.duration - elapsedSeconds,
        totalElapsed: elapsedSeconds,
        totalRemaining: totalDuration(day) - elapsedSeconds,
        isComplete: false,
      };
    }
    cursor += iv.duration;
  }
  const last = day[day.length - 1];
  return {
    intervalIndex: day.length - 1,
    interval: last,
    elapsedInInterval: last.duration,
    remainingInInterval: 0,
    totalElapsed: totalDuration(day),
    totalRemaining: 0,
    isComplete: true,
  };
}

// Groups each run interval (plus whatever walk immediately follows it)
// into one "set" — the macro-unit someone doing interval training actually
// thinks in ("I'm on my 4th set of 8"), as opposed to the raw interval
// list, which also counts warmup/cooldown and treats run/walk as separate
// entries. Counting run intervals works uniformly across every week: a
// continuous-run day (no walks at all) just comes out as 1 set.
//
// setNumber is 0 during warmup (no set reached yet) and equal to
// totalSets during cooldown (all sets already finished).
export function getSetInfo(day, intervalIndex) {
  const totalSets = day.filter((iv) => iv.type === "run").length;
  let setsSeenSoFar = 0;
  for (let i = 0; i <= intervalIndex && i < day.length; i++) {
    if (day[i].type === "run") setsSeenSoFar++;
  }
  return { setNumber: Math.min(setsSeenSoFar, totalSets), totalSets };
}
