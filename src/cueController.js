// Decides whether a workout-state snapshot should trigger a spoken cue.
// This is split out on purpose, after a real bug: a single tick() that both
// rendered the screen AND decided whether to speak meant that any
// display-only refresh (page load, a reset button) looked identical to a
// real transition, and fired a cue it shouldn't have.
//
// The rule going forward: computing/rendering a WorkoutState is always
// safe and side-effect-free. Only feeding that state into notify() can
// make sound — and only the actual running loop should call notify().
// A reset calls this controller's own reset(), never notify().

import { CUE_TEXT, speakCue, playCountdownBeep } from "./audioCues.js";

export function createCueController({ speak = speakCue, beep = playCountdownBeep } = {}) {
  let lastSpokenIndex = null;
  let lastSpokenComplete = false;
  // Which "seconds remaining" values we've already beeped for in the
  // CURRENT interval. Cleared every time a new interval starts, so the
  // countdown can fire again for the next one.
  let beepedSecondsThisInterval = new Set();

  function reset() {
    lastSpokenIndex = null;
    lastSpokenComplete = false;
    beepedSecondsThisInterval.clear();
  }

  function notify(state) {
    if (state.isComplete) {
      if (!lastSpokenComplete) {
        lastSpokenComplete = true;
        speak(CUE_TEXT.complete);
      }
      return;
    }

    if (state.intervalIndex !== lastSpokenIndex) {
      // Just transitioned into a new interval: speak its cue and reset the
      // countdown window. Nothing to beep on this same tick — remaining
      // time is the interval's full duration.
      lastSpokenIndex = state.intervalIndex;
      beepedSecondsThisInterval.clear();
      speak(CUE_TEXT[state.interval.type]);
      return;
    }

    // Countdown beep: fires once each for 3, 2, and 1 seconds remaining,
    // independent of the spoken cue. Math.ceil treats "2.6 seconds left"
    // as "3" — the same rounding a visible countdown would use — so each
    // value is hit exactly once as remaining time crosses it.
    const secondsLeft = Math.ceil(state.remainingInInterval);
    if (secondsLeft >= 1 && secondsLeft <= 3 && !beepedSecondsThisInterval.has(secondsLeft)) {
      beepedSecondsThisInterval.add(secondsLeft);
      beep();
    }
  }

  return { notify, reset };
}
