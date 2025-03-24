export interface File {
  id: string
  name: string
  size: number
  type: string
  path: string
  userId: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export type ViewType = "grid" | "list"

export type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "size-asc" | "size-desc"

