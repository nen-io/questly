import type { PlayerReward, PlayerTask, PointAttributeAmount } from '@/types/app'

import { formatPointValue } from './format-point-value'

export type DashboardCelebrationKind = 'quest_completed' | 'reward_purchased' | 'reward_redeemed'

export interface DashboardCelebrationStat {
  id: string
  label: string
  value: string
}

export interface DashboardCelebrationHighlight {
  id: string
  label: string
  value: string
  color: string
  icon: string | null
  tone: 'positive' | 'negative' | 'neutral'
}

export interface DashboardCelebrationDefinition {
  kind: DashboardCelebrationKind
  eyebrow: string
  title: string
  description: string
  icon: string
  accentColor: string
  paletteColors: string[]
  footnote: string
  stats: DashboardCelebrationStat[]
  highlights: DashboardCelebrationHighlight[]
}

export interface DashboardCelebrationScene extends DashboardCelebrationDefinition {
  id: number
}

const defaultAccentByKind: Record<DashboardCelebrationKind, string> = {
  quest_completed: '#d65c65',
  reward_purchased: '#f2b880',
  reward_redeemed: '#4cb6c6',
}

const defaultIconByKind: Record<DashboardCelebrationKind, string> = {
  quest_completed: '🏆',
  reward_purchased: '🎁',
  reward_redeemed: '✨',
}

function createPointHighlights(
  entries: PointAttributeAmount[],
  tone: DashboardCelebrationHighlight['tone'],
) {
  return entries.slice(0, 5).map((entry) => ({
    id: `${entry.categoryId}-${tone}`,
    label: entry.name,
    value: formatPointValue(entry.amount, tone === 'positive' ? 'positive' : tone === 'negative' ? 'negative' : 'plain'),
    color: entry.color,
    icon: entry.icon,
    tone,
  }))
}

function createFallbackHighlight(
  label: string,
  value: string,
  color: string,
): DashboardCelebrationHighlight[] {
  return [{
    id: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    value,
    color,
    icon: null,
    tone: 'neutral',
  }]
}

function buildPointPalette(entries: PointAttributeAmount[], fallbackColor: string) {
  const palette = entries
    .map((entry) => entry.color)
    .filter((color, index, values) => Boolean(color) && values.indexOf(color) === index)
    .slice(0, 4)

  return palette.length > 0 ? palette : [fallbackColor]
}

export function buildQuestCompletedCelebration(task: PlayerTask): DashboardCelebrationDefinition {
  const fallbackColor = task.color || defaultAccentByKind.quest_completed
  const highlights = task.rewardRules.length > 0
    ? createPointHighlights(task.rewardRules, 'positive')
    : createFallbackHighlight('Win recorded', 'Saved', fallbackColor)
  const paletteColors = buildPointPalette(task.rewardRules, fallbackColor)
  const highlightColor = paletteColors[0] || fallbackColor

  // Completion is the one success state that always means progress was banked.
  // The overlay leans into that payoff by focusing on the quest title and the
  // point rewards that were just applied to the player.
  return {
    kind: 'quest_completed',
    eyebrow: 'Quest Complete',
    title: task.title,
    description: 'Victory locked in. Your rewards were applied and the run has been added to the wins feed.',
    icon: task.icon || defaultIconByKind.quest_completed,
    accentColor: highlightColor,
    paletteColors,
    footnote: task.penaltyRules.length > 0
      ? 'That run is now safe from expiry penalties.'
      : 'That run is now safely banked for the leaderboard.',
    stats: [
      {
        id: 'win-status',
        label: 'Win status',
        value: 'Recorded',
      },
      {
        id: 'leaderboard',
        label: 'Leaderboard',
        value: 'Banked',
      },
    ],
    highlights,
  }
}

export function buildRewardPurchasedCelebration(reward: PlayerReward): DashboardCelebrationDefinition {
  const fallbackColor = reward.color || defaultAccentByKind.reward_purchased
  const highlights = reward.costs.length > 0
    ? createPointHighlights(reward.costs, 'negative')
    : createFallbackHighlight('Reward unlocked', 'Ready', fallbackColor)
  const paletteColors = buildPointPalette(reward.costs, fallbackColor)
  const highlightColor = paletteColors[0] || fallbackColor

  // Reward purchases should feel like opening a loot box rather than just
  // confirming a transaction. The copy makes it clear the cost was paid and
  // the reward is now sitting in the player's locker.
  return {
    kind: 'reward_purchased',
    eyebrow: 'Reward Purchased',
    title: reward.title,
    description: reward.isRedeemable
      ? 'Unlocked and waiting in your rewards locker. The cost was taken immediately.'
      : 'Purchased successfully. The cost was taken immediately and the unlock is now recorded.',
    icon: reward.icon || defaultIconByKind.reward_purchased,
    accentColor: highlightColor,
    paletteColors,
    footnote: reward.isRedeemable
      ? 'Redeem it whenever you are ready to cash it in.'
      : 'Cooldown tracking has already started for this reward.',
    stats: [
      {
        id: 'purchase-status',
        label: 'Purchase status',
        value: 'Paid',
      },
      {
        id: 'reward-status',
        label: 'Reward status',
        value: reward.isRedeemable ? 'Unlocked' : 'Applied',
      },
    ],
    highlights,
  }
}

export function buildRewardRedeemedCelebration(reward: PlayerReward): DashboardCelebrationDefinition {
  const fallbackColor = reward.color || defaultAccentByKind.reward_redeemed
  const paletteColors = buildPointPalette(reward.latestPurchase?.pointSnapshot ?? [], fallbackColor)
  const highlightColor = paletteColors[0] || fallbackColor

  // Redemption is a claim state, not another spend event, so the supporting
  // chips switch from balance deltas to status-oriented callouts.
  return {
    kind: 'reward_redeemed',
    eyebrow: 'Reward Redeemed',
    title: reward.title,
    description: 'Claimed and marked as redeemed. Your history is updated and this reward is no longer waiting in your locker.',
    icon: reward.icon || defaultIconByKind.reward_redeemed,
    accentColor: highlightColor,
    paletteColors,
    footnote: 'This is the collection moment. No extra points move here because the cost was already paid at purchase time.',
    stats: [
      {
        id: 'redeem-status',
        label: 'Redeem status',
        value: 'Redeemed',
      },
      {
        id: 'locker-status',
        label: 'Locker status',
        value: 'Cleared',
      },
    ],
    highlights: [
      {
        id: 'claimed',
        label: 'Claim',
        value: 'Complete',
        color: highlightColor,
        icon: reward.icon,
        tone: 'neutral',
      },
      {
        id: 'locker',
        label: 'Locker',
        value: 'Cleared',
        color: highlightColor,
        icon: null,
        tone: 'neutral',
      },
    ],
  }
}

interface CelebrationRewardSearch {
  availableRewards: PlayerReward[]
  ownedRewards: PlayerReward[]
  selectedReward: PlayerReward | null
}

function dedupeRewards(search: CelebrationRewardSearch) {
  const rewardMap = new Map<number, PlayerReward>()

  if (search.selectedReward) {
    rewardMap.set(search.selectedReward.id, search.selectedReward)
  }

  for (const reward of [...search.ownedRewards, ...search.availableRewards]) {
    if (!rewardMap.has(reward.id)) {
      rewardMap.set(reward.id, reward)
    }
  }

  return Array.from(rewardMap.values())
}

export function findCelebrationRewardById(
  search: CelebrationRewardSearch,
  rewardId: number,
) {
  return dedupeRewards(search).find((reward) => reward.id === rewardId) || null
}

export function findCelebrationRewardByPurchaseId(
  search: CelebrationRewardSearch,
  purchaseId: number,
) {
  return dedupeRewards(search).find((reward) => reward.latestPurchase?.id === purchaseId) || null
}
