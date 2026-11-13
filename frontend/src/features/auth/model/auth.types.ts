export interface User {
  email: string
  id: number
}

export interface Credentials {
  email: string
  password: string
}

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'guest'; user: null }
  | { status: 'authenticated'; user: User }
  | { status: 'error'; user: null }
