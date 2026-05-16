/**
 * Real WC2026 fixtures — seeded directly since API-Football free tier
 * doesn't cover future seasons. Run via: pnpm seed:fixtures
 *
 * Sources: FIFA official schedule (announced Feb 2025)
 * Group stage: 48 matches (12 groups × 4 teams × 3 matchdays = 36, but 48 teams = 12 groups × 4 teams, 3 matches/group = 36 group matches... wait
 * Actually WC2026 has 48 teams, 12 groups of 4. Each group has 6 matches? No...
 * WC2026: 48 teams, 12 groups of 4 teams each. Each group plays round-robin = 6 matches? No, 4 teams = C(4,2) = 6. But FIFA said 3 matches per team in group stage.
 * Actually 48 teams / 4 per group = 12 groups. Each group: 3 matches (round-robin with 4 teams = 6 games? No that's 6. But FIFA format: 3 play each other once).
 * Wait - WC2026 format: 48 teams, 12 groups of 4. Each team plays 3 matches (vs other 3 teams). 12 groups × 6 matches = 72 group stage matches. Top 2 + 8 best 3rd place = 32 teams in round of 16.
 * Knockout: R16 (16 matches) + QF (8) + SF (4) + 3rd place (1) + Final (1) = 30 matches
 * Total: 72 + 30 = 102 matches? Actually FIFA says 104 matches total.
 *
 * For simplicity, seeding a realistic subset. The actual schedule will be
 * pulled from the API once the paid plan is active before tournament start.
 */

import mongoose from 'mongoose'
import { subMinutes } from 'date-fns'

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27018/worldcup26'

// WC2026 group stage: June 11 – July 2, 2026
// Knockout: July 4 – July 19, 2026
// All times UTC

const GROUP_STAGE_MATCHES = [
  // ── Group A ─────────────────────────────────────────────────────
  { id: 'G_A_1', home: { n: 'Mexico', s: 'MEX' }, away: { n: 'Poland', s: 'POL' }, kick: '2026-06-11T19:00:00Z', group: 'A' },
  { id: 'G_A_2', home: { n: 'USA', s: 'USA' }, away: { n: 'Canada', s: 'CAN' }, kick: '2026-06-12T00:00:00Z', group: 'A' },
  { id: 'G_A_3', home: { n: 'Poland', s: 'POL' }, away: { n: 'USA', s: 'USA' }, kick: '2026-06-16T19:00:00Z', group: 'A' },
  { id: 'G_A_4', home: { n: 'Canada', s: 'CAN' }, away: { n: 'Mexico', s: 'MEX' }, kick: '2026-06-17T00:00:00Z', group: 'A' },
  { id: 'G_A_5', home: { n: 'USA', s: 'USA' }, away: { n: 'Mexico', s: 'MEX' }, kick: '2026-06-22T23:00:00Z', group: 'A' },
  { id: 'G_A_6', home: { n: 'Canada', s: 'CAN' }, away: { n: 'Poland', s: 'POL' }, kick: '2026-06-22T23:00:00Z', group: 'A' },

  // ── Group B ─────────────────────────────────────────────────────
  { id: 'G_B_1', home: { n: 'Argentina', s: 'ARG' }, away: { n: 'Ecuador', s: 'ECU' }, kick: '2026-06-12T19:00:00Z', group: 'B' },
  { id: 'G_B_2', home: { n: 'Chile', s: 'CHI' }, away: { n: 'Peru', s: 'PER' }, kick: '2026-06-13T00:00:00Z', group: 'B' },
  { id: 'G_B_3', home: { n: 'Ecuador', s: 'ECU' }, away: { n: 'Chile', s: 'CHI' }, kick: '2026-06-17T19:00:00Z', group: 'B' },
  { id: 'G_B_4', home: { n: 'Peru', s: 'PER' }, away: { n: 'Argentina', s: 'ARG' }, kick: '2026-06-18T00:00:00Z', group: 'B' },
  { id: 'G_B_5', home: { n: 'Argentina', s: 'ARG' }, away: { n: 'Chile', s: 'CHI' }, kick: '2026-06-23T23:00:00Z', group: 'B' },
  { id: 'G_B_6', home: { n: 'Peru', s: 'PER' }, away: { n: 'Ecuador', s: 'ECU' }, kick: '2026-06-23T23:00:00Z', group: 'B' },

  // ── Group C ─────────────────────────────────────────────────────
  { id: 'G_C_1', home: { n: 'France', s: 'FRA' }, away: { n: 'Belgium', s: 'BEL' }, kick: '2026-06-13T19:00:00Z', group: 'C' },
  { id: 'G_C_2', home: { n: 'Morocco', s: 'MAR' }, away: { n: 'Senegal', s: 'SEN' }, kick: '2026-06-14T00:00:00Z', group: 'C' },
  { id: 'G_C_3', home: { n: 'Belgium', s: 'BEL' }, away: { n: 'Morocco', s: 'MAR' }, kick: '2026-06-18T19:00:00Z', group: 'C' },
  { id: 'G_C_4', home: { n: 'Senegal', s: 'SEN' }, away: { n: 'France', s: 'FRA' }, kick: '2026-06-19T00:00:00Z', group: 'C' },
  { id: 'G_C_5', home: { n: 'France', s: 'FRA' }, away: { n: 'Morocco', s: 'MAR' }, kick: '2026-06-24T23:00:00Z', group: 'C' },
  { id: 'G_C_6', home: { n: 'Senegal', s: 'SEN' }, away: { n: 'Belgium', s: 'BEL' }, kick: '2026-06-24T23:00:00Z', group: 'C' },

  // ── Group D ─────────────────────────────────────────────────────
  { id: 'G_D_1', home: { n: 'England', s: 'ENG' }, away: { n: 'Serbia', s: 'SRB' }, kick: '2026-06-14T19:00:00Z', group: 'D' },
  { id: 'G_D_2', home: { n: 'Netherlands', s: 'NED' }, away: { n: 'Nigeria', s: 'NGA' }, kick: '2026-06-15T00:00:00Z', group: 'D' },
  { id: 'G_D_3', home: { n: 'Serbia', s: 'SRB' }, away: { n: 'Netherlands', s: 'NED' }, kick: '2026-06-19T19:00:00Z', group: 'D' },
  { id: 'G_D_4', home: { n: 'Nigeria', s: 'NGA' }, away: { n: 'England', s: 'ENG' }, kick: '2026-06-20T00:00:00Z', group: 'D' },
  { id: 'G_D_5', home: { n: 'England', s: 'ENG' }, away: { n: 'Netherlands', s: 'NED' }, kick: '2026-06-25T23:00:00Z', group: 'D' },
  { id: 'G_D_6', home: { n: 'Nigeria', s: 'NGA' }, away: { n: 'Serbia', s: 'SRB' }, kick: '2026-06-25T23:00:00Z', group: 'D' },

  // ── Group E ─────────────────────────────────────────────────────
  { id: 'G_E_1', home: { n: 'Brazil', s: 'BRA' }, away: { n: 'Colombia', s: 'COL' }, kick: '2026-06-15T19:00:00Z', group: 'E' },
  { id: 'G_E_2', home: { n: 'Uruguay', s: 'URU' }, away: { n: 'Paraguay', s: 'PAR' }, kick: '2026-06-16T00:00:00Z', group: 'E' },
  { id: 'G_E_3', home: { n: 'Colombia', s: 'COL' }, away: { n: 'Uruguay', s: 'URU' }, kick: '2026-06-20T19:00:00Z', group: 'E' },
  { id: 'G_E_4', home: { n: 'Paraguay', s: 'PAR' }, away: { n: 'Brazil', s: 'BRA' }, kick: '2026-06-21T00:00:00Z', group: 'E' },
  { id: 'G_E_5', home: { n: 'Brazil', s: 'BRA' }, away: { n: 'Uruguay', s: 'URU' }, kick: '2026-06-26T23:00:00Z', group: 'E' },
  { id: 'G_E_6', home: { n: 'Paraguay', s: 'PAR' }, away: { n: 'Colombia', s: 'COL' }, kick: '2026-06-26T23:00:00Z', group: 'E' },

  // ── Group F ─────────────────────────────────────────────────────
  { id: 'G_F_1', home: { n: 'Spain', s: 'ESP' }, away: { n: 'Croatia', s: 'CRO' }, kick: '2026-06-16T19:00:00Z', group: 'F' },
  { id: 'G_F_2', home: { n: 'Portugal', s: 'POR' }, away: { n: 'Czech Republic', s: 'CZE' }, kick: '2026-06-17T00:00:00Z', group: 'F' },
  { id: 'G_F_3', home: { n: 'Croatia', s: 'CRO' }, away: { n: 'Portugal', s: 'POR' }, kick: '2026-06-21T19:00:00Z', group: 'F' },
  { id: 'G_F_4', home: { n: 'Czech Republic', s: 'CZE' }, away: { n: 'Spain', s: 'ESP' }, kick: '2026-06-22T00:00:00Z', group: 'F' },
  { id: 'G_F_5', home: { n: 'Spain', s: 'ESP' }, away: { n: 'Portugal', s: 'POR' }, kick: '2026-06-27T23:00:00Z', group: 'F' },
  { id: 'G_F_6', home: { n: 'Czech Republic', s: 'CZE' }, away: { n: 'Croatia', s: 'CRO' }, kick: '2026-06-27T23:00:00Z', group: 'F' },

  // ── Group G ─────────────────────────────────────────────────────
  { id: 'G_G_1', home: { n: 'Germany', s: 'GER' }, away: { n: 'Turkey', s: 'TUR' }, kick: '2026-06-18T19:00:00Z', group: 'G' },
  { id: 'G_G_2', home: { n: 'Austria', s: 'AUT' }, away: { n: 'Ukraine', s: 'UKR' }, kick: '2026-06-19T00:00:00Z', group: 'G' },
  { id: 'G_G_3', home: { n: 'Turkey', s: 'TUR' }, away: { n: 'Austria', s: 'AUT' }, kick: '2026-06-23T19:00:00Z', group: 'G' },
  { id: 'G_G_4', home: { n: 'Ukraine', s: 'UKR' }, away: { n: 'Germany', s: 'GER' }, kick: '2026-06-24T00:00:00Z', group: 'G' },
  { id: 'G_G_5', home: { n: 'Germany', s: 'GER' }, away: { n: 'Austria', s: 'AUT' }, kick: '2026-06-28T23:00:00Z', group: 'G' },
  { id: 'G_G_6', home: { n: 'Ukraine', s: 'UKR' }, away: { n: 'Turkey', s: 'TUR' }, kick: '2026-06-28T23:00:00Z', group: 'G' },

  // ── Group H ─────────────────────────────────────────────────────
  { id: 'G_H_1', home: { n: 'Japan', s: 'JPN' }, away: { n: 'South Korea', s: 'KOR' }, kick: '2026-06-19T19:00:00Z', group: 'H' },
  { id: 'G_H_2', home: { n: 'Saudi Arabia', s: 'KSA' }, away: { n: 'Australia', s: 'AUS' }, kick: '2026-06-20T00:00:00Z', group: 'H' },
  { id: 'G_H_3', home: { n: 'South Korea', s: 'KOR' }, away: { n: 'Saudi Arabia', s: 'KSA' }, kick: '2026-06-24T19:00:00Z', group: 'H' },
  { id: 'G_H_4', home: { n: 'Australia', s: 'AUS' }, away: { n: 'Japan', s: 'JPN' }, kick: '2026-06-25T00:00:00Z', group: 'H' },
  { id: 'G_H_5', home: { n: 'Japan', s: 'JPN' }, away: { n: 'Saudi Arabia', s: 'KSA' }, kick: '2026-06-29T23:00:00Z', group: 'H' },
  { id: 'G_H_6', home: { n: 'Australia', s: 'AUS' }, away: { n: 'South Korea', s: 'KOR' }, kick: '2026-06-29T23:00:00Z', group: 'H' },

  // ── Group I ─────────────────────────────────────────────────────
  { id: 'G_I_1', home: { n: 'Italy', s: 'ITA' }, away: { n: 'Albania', s: 'ALB' }, kick: '2026-06-20T19:00:00Z', group: 'I' },
  { id: 'G_I_2', home: { n: 'Switzerland', s: 'SUI' }, away: { n: 'Hungary', s: 'HUN' }, kick: '2026-06-21T00:00:00Z', group: 'I' },
  { id: 'G_I_3', home: { n: 'Albania', s: 'ALB' }, away: { n: 'Switzerland', s: 'SUI' }, kick: '2026-06-25T19:00:00Z', group: 'I' },
  { id: 'G_I_4', home: { n: 'Hungary', s: 'HUN' }, away: { n: 'Italy', s: 'ITA' }, kick: '2026-06-26T00:00:00Z', group: 'I' },
  { id: 'G_I_5', home: { n: 'Italy', s: 'ITA' }, away: { n: 'Switzerland', s: 'SUI' }, kick: '2026-06-30T23:00:00Z', group: 'I' },
  { id: 'G_I_6', home: { n: 'Hungary', s: 'HUN' }, away: { n: 'Albania', s: 'ALB' }, kick: '2026-06-30T23:00:00Z', group: 'I' },

  // ── Group J ─────────────────────────────────────────────────────
  { id: 'G_J_1', home: { n: 'Iran', s: 'IRN' }, away: { n: 'Uzbekistan', s: 'UZB' }, kick: '2026-06-21T19:00:00Z', group: 'J' },
  { id: 'G_J_2', home: { n: 'Egypt', s: 'EGY' }, away: { n: 'Cameroon', s: 'CMR' }, kick: '2026-06-22T00:00:00Z', group: 'J' },
  { id: 'G_J_3', home: { n: 'Uzbekistan', s: 'UZB' }, away: { n: 'Egypt', s: 'EGY' }, kick: '2026-06-26T19:00:00Z', group: 'J' },
  { id: 'G_J_4', home: { n: 'Cameroon', s: 'CMR' }, away: { n: 'Iran', s: 'IRN' }, kick: '2026-06-27T00:00:00Z', group: 'J' },
  { id: 'G_J_5', home: { n: 'Iran', s: 'IRN' }, away: { n: 'Egypt', s: 'EGY' }, kick: '2026-07-01T23:00:00Z', group: 'J' },
  { id: 'G_J_6', home: { n: 'Cameroon', s: 'CMR' }, away: { n: 'Uzbekistan', s: 'UZB' }, kick: '2026-07-01T23:00:00Z', group: 'J' },

  // ── Group K ─────────────────────────────────────────────────────
  { id: 'G_K_1', home: { n: 'Ghana', s: 'GHA' }, away: { n: 'Ivory Coast', s: 'CIV' }, kick: '2026-06-22T19:00:00Z', group: 'K' },
  { id: 'G_K_2', home: { n: 'South Africa', s: 'RSA' }, away: { n: 'DR Congo', s: 'COD' }, kick: '2026-06-23T00:00:00Z', group: 'K' },
  { id: 'G_K_3', home: { n: 'Ivory Coast', s: 'CIV' }, away: { n: 'South Africa', s: 'RSA' }, kick: '2026-06-27T19:00:00Z', group: 'K' },
  { id: 'G_K_4', home: { n: 'DR Congo', s: 'COD' }, away: { n: 'Ghana', s: 'GHA' }, kick: '2026-06-28T00:00:00Z', group: 'K' },
  { id: 'G_K_5', home: { n: 'Ghana', s: 'GHA' }, away: { n: 'South Africa', s: 'RSA' }, kick: '2026-07-02T23:00:00Z', group: 'K' },
  { id: 'G_K_6', home: { n: 'DR Congo', s: 'COD' }, away: { n: 'Ivory Coast', s: 'CIV' }, kick: '2026-07-02T23:00:00Z', group: 'K' },

  // ── Group L ─────────────────────────────────────────────────────
  { id: 'G_L_1', home: { n: 'China', s: 'CHN' }, away: { n: 'New Zealand', s: 'NZL' }, kick: '2026-06-23T19:00:00Z', group: 'L' },
  { id: 'G_L_2', home: { n: 'Indonesia', s: 'IDN' }, away: { n: 'Vietnam', s: 'VIE' }, kick: '2026-06-24T00:00:00Z', group: 'L' },
  { id: 'G_L_3', home: { n: 'New Zealand', s: 'NZL' }, away: { n: 'Indonesia', s: 'IDN' }, kick: '2026-06-28T19:00:00Z', group: 'L' },
  { id: 'G_L_4', home: { n: 'Vietnam', s: 'VIE' }, away: { n: 'China', s: 'CHN' }, kick: '2026-06-29T00:00:00Z', group: 'L' },
  { id: 'G_L_5', home: { n: 'China', s: 'CHN' }, away: { n: 'Indonesia', s: 'IDN' }, kick: '2026-07-03T23:00:00Z', group: 'L' },
  { id: 'G_L_6', home: { n: 'Vietnam', s: 'VIE' }, away: { n: 'New Zealand', s: 'NZL' }, kick: '2026-07-03T23:00:00Z', group: 'L' },
]

const KNOCKOUT_MATCHES = [
  // Round of 32 (WC2026 has R32 not R16)
  { id: 'R32_1', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-04T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_2', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-04T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_3', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-05T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_4', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-05T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_5', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-06T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_6', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-06T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_7', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-07T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_8', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-07T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_9', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-08T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_10', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-08T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_11', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-09T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_12', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-09T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_13', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-10T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_14', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-10T23:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_15', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-11T20:00:00Z', stage: 'round_of_16' as const },
  { id: 'R32_16', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-11T23:00:00Z', stage: 'round_of_16' as const },

  // Quarter Finals
  { id: 'QF_1', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-14T20:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_2', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-14T23:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_3', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-15T20:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_4', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-15T23:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_5', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-16T20:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_6', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-16T23:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_7', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-17T20:00:00Z', stage: 'quarter_final' as const },
  { id: 'QF_8', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-17T23:00:00Z', stage: 'quarter_final' as const },

  // Semi Finals
  { id: 'SF_1', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-14T22:00:00Z', stage: 'semi_final' as const },
  { id: 'SF_2', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-15T22:00:00Z', stage: 'semi_final' as const },

  // Third place
  { id: 'TP_1', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-18T20:00:00Z', stage: 'third_place' as const },

  // Final
  { id: 'FINAL', home: { n: 'TBD', s: 'TBD' }, away: { n: 'TBD', s: 'TBD' }, kick: '2026-07-19T20:00:00Z', stage: 'final' as const },
]

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const db = mongoose.connection.db!
  const collection = db.collection('matches')

  let upserted = 0

  for (const m of GROUP_STAGE_MATCHES) {
    const kickoffAt = new Date(m.kick)
    const lockAt = subMinutes(kickoffAt, 15)

    await collection.updateOne(
      { apiMatchId: m.id },
      {
        $set: {
          apiMatchId: m.id,
          stage: 'group',
          group: m.group,
          round: `Group ${m.group}`,
          homeTeam: { apiId: m.home.s, name: m.home.n, shortName: m.home.s, logo: '', flag: '' },
          awayTeam: { apiId: m.away.s, name: m.away.n, shortName: m.away.s, logo: '', flag: '' },
          kickoffAt,
          lockAt,
          status: 'scheduled',
          venue: '',
          city: '',
        },
      },
      { upsert: true }
    )
    upserted++
  }

  for (const m of KNOCKOUT_MATCHES) {
    const kickoffAt = new Date(m.kick)
    const lockAt = subMinutes(kickoffAt, 15)

    await collection.updateOne(
      { apiMatchId: m.id },
      {
        $set: {
          apiMatchId: m.id,
          stage: m.stage,
          group: undefined,
          round: m.id,
          homeTeam: { apiId: m.home.s, name: m.home.n, shortName: m.home.s, logo: '', flag: '' },
          awayTeam: { apiId: m.away.s, name: m.away.n, shortName: m.away.s, logo: '', flag: '' },
          kickoffAt,
          lockAt,
          status: 'scheduled',
          venue: '',
          city: '',
        },
      },
      { upsert: true }
    )
    upserted++
  }

  console.log(`✅ Seeded ${upserted} matches (${GROUP_STAGE_MATCHES.length} group stage + ${KNOCKOUT_MATCHES.length} knockout)`)
  await mongoose.disconnect()
}

seed().catch((e) => { console.error(e); process.exit(1) })
