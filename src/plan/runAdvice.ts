/**
 * runAdvice.ts: short, general tips for today's workout.
 *
 * adviceFor(kind): { summary, tips } for an easy run, a long run, a rest day
 * or an extra run. Written by hand and deliberately generic: no paces (those
 * come from the plan engine, not from here) and no medical advice.
 */
export type AdviceKind = 'easy' | 'long' | 'rest' | 'extra'

export type Advice = { summary: string; tips: string[] }

const ADVICE: Record<AdviceKind, Advice> = {
  easy: {
    summary: 'A relaxed run that builds your base without wearing you down.',
    tips: [
      'Keep it conversational: you should be able to talk in full sentences.',
      'Slower than you think is right. Easy days are what make the harder days work.',
      'Stop early if something hurts, and note it in a check-in.',
    ],
  },
  long: {
    summary:
      'The longest run of your week, built up a little at a time to prepare you for race day.',
    tips: [
      'Start slower than feels necessary. The first mile should feel almost too easy.',
      'Bring water, and some fuel if you will be out for more than an hour.',
      'Walk breaks are fine. Time on your feet matters more than speed.',
      'Finish feeling like you could have gone a little further.',
    ],
  },
  rest: {
    summary: 'No run planned today. Rest is when your body gets stronger.',
    tips: [
      'A light walk or some stretching is fine if you feel like moving.',
      'Eat and drink well, and get a good night of sleep.',
    ],
  },
  extra: {
    summary: 'You ran today without a run planned, which is a bonus.',
    tips: [
      'Keep it easy, and let your next planned run be just as relaxed.',
      'If your legs feel heavy tomorrow, take the extra rest.',
    ],
  },
}

export const adviceFor = (kind: AdviceKind): Advice => ADVICE[kind]
