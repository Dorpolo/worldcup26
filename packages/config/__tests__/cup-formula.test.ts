import { describe, it, expect } from 'vitest'
import { getCupConfig, buildCupMatchups } from '../src/cup-formula'

// ── getCupConfig ───────────────────────────────────────────────────────────────

describe('getCupConfig — error cases', () => {
  it('throws when memberCount is 0', () => {
    expect(() => getCupConfig(0)).toThrow('A cup requires at least 2 members')
  })

  it('throws when memberCount is 1', () => {
    expect(() => getCupConfig(1)).toThrow('A cup requires at least 2 members')
  })
})

describe('getCupConfig — bracket sizes', () => {
  it('2 members → final, bracketSize=2, byeCount=0', () => {
    const cfg = getCupConfig(2)
    expect(cfg.startRound).toBe('final')
    expect(cfg.bracketSize).toBe(2)
    expect(cfg.byeCount).toBe(0)
  })

  it('3 members → final, bracketSize=2, byeCount=1', () => {
    // floor(log2(3)) = 1 → 2^1 = 2
    const cfg = getCupConfig(3)
    expect(cfg.startRound).toBe('final')
    expect(cfg.bracketSize).toBe(2)
    expect(cfg.byeCount).toBe(1)
  })

  it('4 members → semi_final, bracketSize=4, byeCount=0', () => {
    const cfg = getCupConfig(4)
    expect(cfg.startRound).toBe('semi_final')
    expect(cfg.bracketSize).toBe(4)
    expect(cfg.byeCount).toBe(0)
  })

  it('5 members → semi_final, bracketSize=4, byeCount=1', () => {
    // floor(log2(5)) = 2 → 2^2 = 4
    const cfg = getCupConfig(5)
    expect(cfg.startRound).toBe('semi_final')
    expect(cfg.bracketSize).toBe(4)
    expect(cfg.byeCount).toBe(1)
  })

  it('8 members → quarter_final, bracketSize=8, byeCount=0', () => {
    const cfg = getCupConfig(8)
    expect(cfg.startRound).toBe('quarter_final')
    expect(cfg.bracketSize).toBe(8)
    expect(cfg.byeCount).toBe(0)
  })

  it('13 members → quarter_final, bracketSize=8, byeCount=5', () => {
    // floor(log2(13)) = 3 → 2^3 = 8
    const cfg = getCupConfig(13)
    expect(cfg.startRound).toBe('quarter_final')
    expect(cfg.bracketSize).toBe(8)
    expect(cfg.byeCount).toBe(5)
  })

  it('16 members → round_of_16, bracketSize=16, byeCount=0', () => {
    const cfg = getCupConfig(16)
    expect(cfg.startRound).toBe('round_of_16')
    expect(cfg.bracketSize).toBe(16)
    expect(cfg.byeCount).toBe(0)
  })

  it('32 members → round_of_32, bracketSize=32, byeCount=0', () => {
    const cfg = getCupConfig(32)
    expect(cfg.startRound).toBe('round_of_32')
    expect(cfg.bracketSize).toBe(32)
    expect(cfg.byeCount).toBe(0)
  })

  it('50 members → round_of_32 (capped at 32), bracketSize=32, byeCount=18', () => {
    // Without cap: floor(log2(50)) = 5 → 2^5 = 32 (already 32, cap doesn't change result here)
    // but the formula caps at 32 — with 50: 2^5=32, cap=32, byeCount=50-32=18
    const cfg = getCupConfig(50)
    expect(cfg.startRound).toBe('round_of_32')
    expect(cfg.bracketSize).toBe(32)
    expect(cfg.byeCount).toBe(18)
  })

  it('64 members → round_of_32 (capped at 32), bracketSize=32, byeCount=32', () => {
    // floor(log2(64))=6 → 2^6=64, but capped at 32 → byeCount=64-32=32
    const cfg = getCupConfig(64)
    expect(cfg.bracketSize).toBe(32)
    expect(cfg.byeCount).toBe(32)
  })
})

// ── buildCupMatchups ───────────────────────────────────────────────────────────

describe('buildCupMatchups', () => {
  it('4 members → 2 active matchups, 0 byes', () => {
    const members = ['a', 'b', 'c', 'd']
    const matchups = buildCupMatchups(members)
    expect(matchups).toHaveLength(2)
    // All matchups are active (no null awayUserId)
    expect(matchups.every(m => m.awayUserId !== null)).toBe(true)
  })

  it('5 members → 1 bye matchup + 2 active matchups = 3 total', () => {
    const members = ['a', 'b', 'c', 'd', 'e']
    const matchups = buildCupMatchups(members)
    // byeCount=1: first member gets a bye, remaining 4 → 2 matchups
    expect(matchups).toHaveLength(3)
    const byes = matchups.filter(m => m.awayUserId === null)
    const active = matchups.filter(m => m.awayUserId !== null)
    expect(byes).toHaveLength(1)
    expect(active).toHaveLength(2)
  })

  it('first bye matchup has homeUserId set to the bye member', () => {
    const members = ['player1', 'player2', 'player3']
    const matchups = buildCupMatchups(members)
    // byeCount=1 for 3 members: first gets bye
    const byeMatchup = matchups.find(m => m.awayUserId === null)
    expect(byeMatchup).toBeDefined()
    expect(byeMatchup!.homeUserId).toBe('player1')
  })

  it('2 members → 1 matchup, no byes', () => {
    const members = ['x', 'y']
    const matchups = buildCupMatchups(members)
    expect(matchups).toHaveLength(1)
    expect(matchups[0].homeUserId).toBe('x')
    expect(matchups[0].awayUserId).toBe('y')
  })

  it('8 members → 4 active matchups, 0 byes', () => {
    const members = Array.from({ length: 8 }, (_, i) => `user${i}`)
    const matchups = buildCupMatchups(members)
    expect(matchups).toHaveLength(4)
    expect(matchups.every(m => m.awayUserId !== null)).toBe(true)
  })

  it('throws for 0 members (via getCupConfig)', () => {
    expect(() => buildCupMatchups([])).toThrow()
  })

  it('throws for 1 member (via getCupConfig)', () => {
    expect(() => buildCupMatchups(['solo'])).toThrow()
  })
})
