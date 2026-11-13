// Decides whether a workout-state snapshot should trigger a spoken cue or
// a countdown beep. Split out on purpose, after a real bug: a single
// tick() that both rendered the screen AND decided whether to speak meant
// that any display-only refresh (page load, a reset button) looked
// identical to a real transition, and fired a cue it shouldn't have.
//
// The rule going forward: computing/rendering a WorkoutState is always
// safe and side-effect-free. Only feeding that state into notify() can
// make sound — and only the actual running loop should call notify().
// A reset calls this controller's own reset(), never notify().

import { CUE_TEXT, speakCue, scheduleCountdownBeeps } from "./audioCues.js";

export function createCueController({ speak = speakCue, scheduleBeeps = scheduleCountdownBeeps } = {}) {
  let lastSpokenIndex = null;
  let lastSpokenComplete = false;
  // Cancels whichever interval's countdown beeps are currently scheduled
  // but haven't played yet. Needed so an interval that ends early
  // (skipped, reset) doesn't leave a stray beep to fire late for a day
  // that's no longer running.
  let cancelPendingBeeps = () => {};

  function reset() {
    lastSpokenIndex = null;
    lastSpokenComplete = false;
    cancelPendingBeeps();
    cancelPendingBeeps = () => {};
  }

  function notify(state) {
    if (state.isComplete) {
      if (!lastSpokenComplete) {
        lastSpokenComplete = true;
        cancelPendingBeeps();
        speak(CUE_TEXT.complete);
      }
      return;
    }

    if (state.intervalIndex !== lastSpokenIndex) {
      // Just transitioned into a new interval: speak its cue, and
      // schedule this interval's ENTIRE countdown right now, up front,
      // rather than polling for "are we close yet?" on every later tick.
      // See scheduleCountdownBeeps' own comment for why that's the more
      // reliable approach once the tab is backgrounded.
      lastSpokenIndex = state.intervalIndex;
      cancelPendingBeeps();
      cancelPendingBeeps = scheduleBeeps(state.remainingInInterval);
      speak(CUE_TEXT[state.interval.type]);
    }
    // Later ticks of the same interval have nothing new to do — that
    // interval's beeps are already scheduled and will fire on their own.
  }

  return { notify, reset };
}
