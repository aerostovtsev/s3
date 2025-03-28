export interface File {
  id: string
  name: string
  size: string
  type: string
  path: string
  userId: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export type ViewType = "grid" | "list"

export type SortOption = "name" | "size" | "type" | "updatedAt"

