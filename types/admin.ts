export interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

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
  user?: {
    name: string
    email: string
  }
}

export interface UploadHistory {
  id: string
  fileId: string
  userId: string
  size: string
  status: string
  createdAt: string
  user?: {
    name: string
    email: string
  }
  file?: {
    name: string
    size: string
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

