// Two positions persist across sessions, not one — this distinction only
// became obvious after testing exposed the bug it fixes:
//
//   currentWeekIndex/currentDayIndex   "official" furthest progress.
//     Only moves when you COMPLETE the day it's already pointing at.
//     A redo of an old day never regresses or skips this.
//
//   lastViewedWeekIndex/lastViewedDayIndex   whatever day is on screen.
//     Written the instant the week/day selector changes, whether or not
//     you ever finish that day. This is what a reload restores — so
//     picking a different week to look at (or start) and refreshing
//     mid-run brings you back to THAT day, not back to official progress.
//
// Also persisted: a log of every completed workout.
//
// Deliberately NOT persisted: progress through the current workout itself.
// Reloading mid-run still restarts that day from the beginning — it just
// restarts the *correct* day. Resuming mid-interval is a different, much
// riskier feature (what if the app was closed for three days?) and isn't
// part of this step.

import { SCHEDULE } from "./schedule.js";

const STORAGE_KEY = "c25k:progress:v1";

function defaultProgress() {
  return {
    currentWeekIndex: 0,
    currentDayIndex: 0,
    lastViewedWeekIndex: 0,
    lastViewedDayIndex: 0,
    history: [],
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    const looksValid =
      parsed &&
      typeof parsed.currentWeekIndex === "number" &&
      typeof parsed.currentDayIndex === "number" &&
      Array.isArray(parsed.history);
    if (!looksValid) return defaultProgress();

    // Migrate progress saved before lastViewed existed: fall back to
    // whatever "current" already held, rather than losing that data.
    if (typeof parsed.lastViewedWeekIndex !== "number") parsed.lastViewedWeekIndex = parsed.currentWeekIndex;
    if (typeof parsed.lastViewedDayIndex !== "number") parsed.lastViewedDayIndex = parsed.currentDayIndex;
    return parsed;
  } catch (e) {
    // Private browsing, storage disabled, corrupted JSON — any of these
    // just means "start fresh," not "crash the app."
    return defaultProgress();
  }
}

// Pure: mark a day as the one currently being viewed/run. Called on every
// selector change, independent of whether that day ever gets completed.
export function setActiveDay(progress, weekIndex, dayIndex) {
  return { ...progress, lastViewedWeekIndex: weekIndex, lastViewedDayIndex: dayIndex };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (e) {
    return false;
  }
}

function nextPosition(weekIndex, dayIndex) {
  const daysThisWeek = SCHEDULE[weekIndex].days.length;
  if (dayIndex + 1 < daysThisWeek) return { weekIndex, dayIndex: dayIndex + 1 };
  if (weekIndex + 1 < SCHEDULE.length) return { weekIndex: weekIndex + 1, dayIndex: 0 };
  return { weekIndex, dayIndex }; // already on the final day of the program — stay put
}

// Pure: given the existing progress and which day just finished, return
// the next progress object. Does not touch storage — the caller decides
// when (and whether) to persist it.
export function recordCompletion(progress, weekIndex, dayIndex, completedAt = new Date().toISOString()) {
  const history = [...progress.history, { weekIndex, dayIndex, completedAt }];

  const isCurrentDay =
    weekIndex === progress.currentWeekIndex && dayIndex === progress.currentDayIndex;

  if (!isCurrentDay) {
    // Redoing an earlier day, or somehow running ahead of your saved spot:
    // log it, but don't move official progress. lastViewed already points
    // here (the selector wrote it before this workout started), so leave
    // it alone too — completing an old day doesn't imply you want to be
    // dropped back on it every time you reload.
    return { ...progress, history };
  }

  const next = nextPosition(weekIndex, dayIndex);
  return {
    ...progress,
    currentWeekIndex: next.weekIndex,
    currentDayIndex: next.dayIndex,
    lastViewedWeekIndex: next.weekIndex,
    lastViewedDayIndex: next.dayIndex,
    history,
  };
}

// Pure: an explicit, deliberate move of official progress BACKWARD to the
// start of a given week. This is different from browsing to an old day
// with the selector (which never touches currentWeekIndex/currentDayIndex)
// — this is the one action that's allowed to regress official progress on
// purpose, because the person asked for it directly rather than just
// looking at something.
export function restartAtWeek(progress, weekIndex) {
  return {
    ...progress,
    currentWeekIndex: weekIndex,
    currentDayIndex: 0,
    lastViewedWeekIndex: weekIndex,
    lastViewedDayIndex: 0,
  };
}

export function isFinalDay(weekIndex, dayIndex) {
  const lastWeek = SCHEDULE.length - 1;
  const lastDay = SCHEDULE[lastWeek].days.length - 1;
  return weekIndex === lastWeek && dayIndex === lastDay;
}
