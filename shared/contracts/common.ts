export interface ThemeConfig {
  id: number
  key: string
  name: string
  audience: string
  description: string
  tokens: Record<string, string>
}

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}
