/** checkInLabels.ts: how check-in options are named on screen. */
import type { BodyArea, CheckIn, Side } from '../engine/types'

export const AREA_LABELS: Record<BodyArea, string> = {
  knee: 'Knee',
  shin: 'Shin',
  calf: 'Calf',
  achilles: 'Achilles',
  foot: 'Foot',
  ankle: 'Ankle',
  hip: 'Hip',
  hamstring: 'Hamstring',
  quad: 'Quad',
  back: 'Back',
  other: 'Other',
}

export const SIDE_LABELS: Record<Side, string> = {
  left: 'Left',
  right: 'Right',
  na: 'n/a',
}

export const KIND_LABELS: Record<CheckIn['kind'], string> = {
  afterRun: 'After a run',
  nextMorning: 'Next morning',
}

export const FEEL_LABELS: Record<CheckIn['feel'], string> = {
  good: 'Good',
  okay: 'Okay',
  rough: 'Rough',
}
