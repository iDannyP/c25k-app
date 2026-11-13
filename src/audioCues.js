// What gets spoken for each interval type, plus the one workout-level
// event (completion) that isn't an interval at all. Keeping "complete"
// in this same object means there's exactly one place that owns cue text.

export const CUE_TEXT = {
  warmup: "Warm up. Walk to get started.",
  run: "Run now.",
  walk: "Walk now.",
  cooldown: "Cool down. Nice work, almost done.",
  complete: "Workout complete. Nice work.",
};

export function speakCue(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // don't let cues queue up and stack if one is still talking
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  window.speechSynthesis.speak(utterance);
}

// ---- Shared AudioContext ----
//
// Browsers require a real user gesture (the Start button click) before an
// AudioContext will produce sound, so this is created lazily on first use
// rather than at page load, and resumed each time in case the browser
// suspended it (e.g. after the tab was backgrounded).
let audioCtx = null;

function getAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playOneBeep(ctx, startTime) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880; // high enough to cut through outdoor noise
  // Fast fade in/out avoids a click at the start/end of the tone. Peak
  // raised from the original 0.3 after real-world testing found the beep
  // got lost under music/video playing at the same time — this is about
  // as loud as a clean sine tone can go before cheap phone speakers start
  // to distort it. It still won't duck the other audio (see the note on
  // scheduleCountdownBeeps below) — just compete with it better.
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.2);
  return osc;
}

// Schedules the final-3-seconds countdown beeps for the CURRENT interval,
// all at once, using the AudioContext's own clock rather than repeatedly
// checking "should I beep now?" from a polling loop.
//
// Why this matters: the original version polled every 200ms and fired a
// beep the instant it noticed "3, 2, or 1 seconds left." That's fine while
// the tab is in the foreground, but real-world testing found that when
// the screen is off or the app is backgrounded, phones throttle that
// polling — sometimes to once every several seconds — so by the time a
// check finally ran, it could be well past the 3-second mark, or even
// past 3, 2, AND 1 at once, producing late, bunched-up, overlapping beeps
// instead of three clean ones a second apart.
//
// Scheduling with the audio clock sidesteps that: we tell the
// AudioContext up front exactly when (in its own time) each beep should
// play, and the audio hardware — not our JS polling loop — is what
// actually fires them at the right moment. That's far more resistant to
// the main thread being throttled, though it still depends on the
// AudioContext itself staying alive, which is what startKeepAliveAudio
// below is for. (It doesn't help the beep compete with other audio
// already playing on the phone — that's a separate, not-really-fixable
// limitation: see the gain comment on playOneBeep.)
//
// remainingInInterval: seconds left in the interval RIGHT NOW, from the
// accurate wall-clock state — not however many times this function has
// been called. Returns a cancel() function; call it if the interval
// changes early (skipped, reset) so a stale beep doesn't fire late for a
// day that's no longer running.
export function scheduleCountdownBeeps(remainingInInterval) {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const pending = [];
  [3, 2, 1].forEach((secondsBeforeEnd) => {
    const offset = remainingInInterval - secondsBeforeEnd;
    // Only schedule marks that haven't already passed, and skip the whole
    // countdown for intervals too short to fit it (e.g. a 2-second custom
    // interval has no real "3 seconds left" moment).
    if (offset < 0) return;
    try {
      pending.push(playOneBeep(ctx, ctx.currentTime + offset));
    } catch (e) {
      // Scheduling failed (unsupported/blocked) — skip silently, same as
      // the old single-beep version did.
    }
  });

  return function cancel() {
    pending.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Already finished playing — nothing to cancel.
      }
    });
  };
}

// ---- Keep-alive: a continuous, essentially inaudible tone played only
// while a workout is actively running. ----
//
// The point isn't to be heard. Mobile browsers throttle background tabs
// hardest when they're judged to be doing nothing worth prioritizing — but
// a tab that's audibly producing sound is generally treated more like
// active media than like an idle background tab (the same reason a music
// app's timers don't get starved just because you locked your screen).
// Giving the page a quiet but genuine audio signal the whole time a
// workout is active is a real-world-tested attempt at keeping the
// countdown-beep scheduling — and the main render loop — running more
// reliably in the background. It's not a guarantee: OS-level battery
// saving can still override it, and browsers may tighten this heuristic
// over time. Treat it as a mitigation, not a fix.
let keepAliveNode = null;

export function startKeepAliveAudio() {
  const ctx = getAudioContext();
  if (!ctx || keepAliveNode) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 40; // low enough that phone speakers barely reproduce it at all
    gain.gain.value = 0.004; // quiet well past the point of being heard, not past the point of being real audio
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    keepAliveNode = osc;
  } catch (e) {
    keepAliveNode = null;
  }
}

export function stopKeepAliveAudio() {
  if (!keepAliveNode) return;
  try {
    keepAliveNode.stop();
  } catch (e) {
    // Already stopped — nothing to do.
  }
  keepAliveNode = null;
}

// ---- Media Session: tells the OS what's "playing" right now, so a
// locked phone shows the current interval the same way it'd show a song
// title — and, as a side effect, treats this page more like active media
// than like an idle background tab. ----
export function setMediaSessionInfo(title, subtitle) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: subtitle,
      album: "Couch to 5k",
    });
  } catch (e) {
    // Unsupported construction — lock-screen info just won't show.
    // Nothing else depends on this succeeding.
  }
}

export function setMediaSessionPlaybackState(state) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.playbackState = state; // "playing" | "paused" | "none"
}
