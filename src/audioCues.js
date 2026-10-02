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

// A short tone, not spoken words, for the final-3-seconds countdown. The
// point is to be audible and identifiable outdoors over wind/traffic noise
// without having to parse speech — a sharp beep carries better than a
// synthesized voice does. Built with Web Audio instead of an audio file so
// there's nothing to load or ship.
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

export function playCountdownBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880; // high enough to cut through outdoor noise
    // Fast fade in/out avoids a click at the start/end of the tone.
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {
    // Web Audio unsupported or blocked — skip the beep silently. The
    // spoken transition cue still fires regardless.
  }
}
