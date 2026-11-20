/** decisionLabels.ts: what the gate decided, in words that follow "then". */
import type { Decision } from '../engine/types'

export const AFTER: Record<Decision, string> = {
  advance: 'moved up',
  repeat: 'repeated the target',
  stepBack: 'stepped back',
  recovery: 'took a recovery week',
  taper: 'started the taper',
  race: 'went to race week',
}
