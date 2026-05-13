import type { MatchStage } from '@worldcup26/types'

export const MATCH_STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Group Stage',
  round_of_16: 'Round of 16',
  quarter_final: 'Quarter Final',
  semi_final: 'Semi Final',
  third_place: 'Third Place Play-off',
  final: 'Final',
}

export const KNOCKOUT_STAGES: MatchStage[] = [
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]

export function isKnockoutStage(stage: MatchStage): boolean {
  return KNOCKOUT_STAGES.includes(stage)
}

// Order matters — used for cup round mapping
export const STAGE_ORDER: MatchStage[] = [
  'group',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]
