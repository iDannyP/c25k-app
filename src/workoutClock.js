// Owns "how much time has elapsed," independent of any UI. This is where
// segmentStartMs and elapsedAtPause live — pulling them out of the UI
// wiring into their own factory function means they can't get confused
// with display state, and this file can be unit tested with a fake clock.
//
// The core idea: elapsed time is never accumulated tick by tick (that
// drifts, since setInterval fires at "~200ms," not exactly 200ms).
// Instead it's always recomputed from wall-clock math: seconds banked
// from previous play segments, plus real time since the current segment
// began.

export function createWorkoutClock({ now = () => Date.now() } = {}) {
  let running = false;
  let elapsedAtPause = 0;    // seconds banked from previous run segments
  let segmentStartMs = null; // now() when the current run segment began
  let speedMultiplier = 1;   // 1 in the real app; test harnesses may raise this

  function getElapsedSeconds() {
    if (!running || segmentStartMs === null) return elapsedAtPause;
    const realSecondsSincePlay = (now() - segmentStartMs) / 1000;
    return elapsedAtPause + realSecondsSincePlay * speedMultiplier;
  }

  function start() {
    if (running) return;
    running = true;
    segmentStartMs = now();
  }

  function pause() {
    if (!running) return;
    elapsedAtPause = getElapsedSeconds();
    running = false;
    segmentStartMs = null;
  }

  function reset() {
    running = false;
    elapsedAtPause = 0;
    segmentStartMs = null;
  }

  function setSpeedMultiplier(mult) {
    // Re-anchor so changing speed mid-run doesn't jump the clock.
    elapsedAtPause = getElapsedSeconds();
    segmentStartMs = running ? now() : null;
    speedMultiplier = mult;
  }

  return {
    start,
    pause,
    reset,
    setSpeedMultiplier,
    getElapsedSeconds,
    isRunning: () => running,
  };
}
