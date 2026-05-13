import type { ScoringConfig } from '@worldcup26/types'

export function generateRulesMarkdown(leagueName: string, config: ScoringConfig): string {
  const { groupStage, knockoutStage, bonuses } = config

  const bonusLines: string[] = []
  if (bonuses.tournamentWinner.enabled) {
    bonusLines.push(`- **Tournament Winner** — predict the overall winner before the tournament starts: **${bonuses.tournamentWinner.points} pts**`)
  }
  if (bonuses.topScorer.enabled) {
    bonusLines.push(`- **Top Scorer** — predict the player with the most goals: **${bonuses.topScorer.points} pts**`)
  }
  if (bonuses.topAssist.enabled) {
    bonusLines.push(`- **Top Assist** — predict the player with the most assists: **${bonuses.topAssist.points} pts**`)
  }
  for (const custom of bonuses.custom) {
    bonusLines.push(`- **${custom.label}** — ${custom.description}: **${custom.points} pts**`)
  }

  return `# ${leagueName} — Rules

## How Scoring Works

### Group Stage

| Prediction | Points |
|---|---|
| Exact score (e.g. 2–1 correct) | **${groupStage.exactScore} pts** |
| Correct result (win/draw/loss) | **${groupStage.correctResult} pt** |

### Knockout Stage (Round of 16, QF, SF, Final)

| Prediction | Points |
|---|---|
| Exact score (after 90 min) | **${knockoutStage.exactScore} pts** |
| Correct result | **${knockoutStage.correctResult} pts** |
| Correct team advancing (regardless of score) | **${knockoutStage.correctTeamAdvancing} pt** |

> Penalty shootout: picking the correct team to advance counts for "correct team advancing" even if you didn't predict a draw.

## Prediction Deadline

Predictions **lock 15 minutes before kickoff**. You can update your prediction any time before the deadline.

## Bonus Predictions

All bonus predictions lock when the tournament starts.

${bonusLines.length > 0 ? bonusLines.join('\n') : '_No bonus predictions configured for this league._'}

## Cup Competition

Every league runs a parallel cup competition alongside the league table. Cup rounds map to World Cup knockout stages — your points from league matches in that stage also count for the cup.

Tiebreaker sequence (if points are level):
1. Total goals predicted across the round
2. Head-to-head result from a previous cup round
3. Random draw (seeded — reproducible)
`
}
