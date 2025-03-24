export interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

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
  user?: {
    name: string
    email: string
  }
}

export interface UploadHistory {
  id: string
  fileId: string
  userId: string
  size: number
  status: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
  file?: {
    name: string
    size: number
  }
}

export interface DownloadHistory {
  id: string
  fileId: string
  userId: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
  file?: {
    name: string
  }
}

