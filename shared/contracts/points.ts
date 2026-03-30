export interface PointBalance {
  categoryId: number
  slug: string
  name: string
  color: string
  icon: string | null
  balance: number
}

export interface PointAttributeDisplay {
  categoryId: number
  slug: string
  name: string
  color: string
  icon: string | null
}

export interface PointAttributeAmount extends PointAttributeDisplay {
  amount: number
}

export interface PointRulePayload {
  categoryId: number
  amount: number
}

export interface TaskRule extends PointRulePayload {
  kind?: 'reward' | 'penalty'
}

export interface PlayerBalanceUpdate {
  categoryId: number
  balance: number
}
