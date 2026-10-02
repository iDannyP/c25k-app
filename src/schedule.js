// The standard NHS Couch to 5k schedule: 9 weeks, 3 runs per week.
// Every day is bookended by a 5-minute warm up walk and 5-minute cool down
// walk. Nothing here knows about UI, timers, or audio — it's just data.

const SECONDS = { s: (n) => n, m: (n) => n * 60 };

function buildDay(...intervals) {
  return [
    { type: "warmup", duration: SECONDS.m(5) },
    ...intervals,
    { type: "cooldown", duration: SECONDS.m(5) },
  ];
}

function repeat(pattern, times) {
  return Array.from({ length: times }).flatMap(() => pattern);
}

export const SCHEDULE = [
  {
    week: 1,
    days: [
      buildDay(...repeat([{ type: "run", duration: SECONDS.s(60) }, { type: "walk", duration: SECONDS.s(90) }], 8)),
      buildDay(...repeat([{ type: "run", duration: SECONDS.s(60) }, { type: "walk", duration: SECONDS.s(90) }], 8)),
      buildDay(...repeat([{ type: "run", duration: SECONDS.s(60) }, { type: "walk", duration: SECONDS.s(90) }], 8)),
    ],
  },
  {
    week: 2,
    days: [
      buildDay(...repeat([{ type: "run", duration: SECONDS.s(90) }, { type: "walk", duration: SECONDS.m(2) }], 6)),
      buildDay(...repeat([{ type: "run", duration: SECONDS.s(90) }, { type: "walk", duration: SECONDS.m(2) }], 6)),
      buildDay(...repeat([{ type: "run", duration: SECONDS.s(90) }, { type: "walk", duration: SECONDS.m(2) }], 6)),
    ],
  },
  {
    week: 3,
    days: [
      buildDay(...repeat([
        { type: "run", duration: SECONDS.s(90) }, { type: "walk", duration: SECONDS.s(90) },
        { type: "run", duration: SECONDS.m(3) }, { type: "walk", duration: SECONDS.m(3) },
      ], 2)),
      buildDay(...repeat([
        { type: "run", duration: SECONDS.s(90) }, { type: "walk", duration: SECONDS.s(90) },
        { type: "run", duration: SECONDS.m(3) }, { type: "walk", duration: SECONDS.m(3) },
      ], 2)),
      buildDay(...repeat([
        { type: "run", duration: SECONDS.s(90) }, { type: "walk", duration: SECONDS.s(90) },
        { type: "run", duration: SECONDS.m(3) }, { type: "walk", duration: SECONDS.m(3) },
      ], 2)),
    ],
  },
  {
    week: 4,
    days: Array(3).fill(null).map(() => buildDay(
      { type: "run", duration: SECONDS.m(3) }, { type: "walk", duration: SECONDS.s(90) },
      { type: "run", duration: SECONDS.m(5) }, { type: "walk", duration: SECONDS.m(2.5) },
      { type: "run", duration: SECONDS.m(3) }, { type: "walk", duration: SECONDS.s(90) },
      { type: "run", duration: SECONDS.m(5) }
    )),
  },
  {
    week: 5,
    days: [
      buildDay({ type: "run", duration: SECONDS.m(5) }, { type: "walk", duration: SECONDS.m(3) }, { type: "run", duration: SECONDS.m(5) }, { type: "walk", duration: SECONDS.m(3) }, { type: "run", duration: SECONDS.m(5) }),
      buildDay({ type: "run", duration: SECONDS.m(8) }, { type: "walk", duration: SECONDS.m(5) }, { type: "run", duration: SECONDS.m(8) }),
      buildDay({ type: "run", duration: SECONDS.m(20) }),
    ],
  },
  {
    week: 6,
    days: [
      buildDay({ type: "run", duration: SECONDS.m(5) }, { type: "walk", duration: SECONDS.m(3) }, { type: "run", duration: SECONDS.m(8) }, { type: "walk", duration: SECONDS.m(3) }, { type: "run", duration: SECONDS.m(5) }),
      buildDay({ type: "run", duration: SECONDS.m(10) }, { type: "walk", duration: SECONDS.m(3) }, { type: "run", duration: SECONDS.m(10) }),
      buildDay({ type: "run", duration: SECONDS.m(25) }),
    ],
  },
  { week: 7, days: Array(3).fill(null).map(() => buildDay({ type: "run", duration: SECONDS.m(25) })) },
  { week: 8, days: Array(3).fill(null).map(() => buildDay({ type: "run", duration: SECONDS.m(28) })) },
  { week: 9, days: Array(3).fill(null).map(() => buildDay({ type: "run", duration: SECONDS.m(30) })) },
];

export function totalDuration(day) {
  return day.reduce((sum, iv) => sum + iv.duration, 0);
}
