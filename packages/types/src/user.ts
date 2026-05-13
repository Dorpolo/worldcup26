export interface User {
  _id: string
  email: string
  name: string
  avatar: string
  timezone: string
  authProvider: 'email' | 'google'
  googleId?: string
  apiKey: string
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  _id: string
  name: string
  avatar: string
  timezone: string
}
