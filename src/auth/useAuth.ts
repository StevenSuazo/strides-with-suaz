/** useAuth.ts: read the auth object and current state inside AuthProvider. */
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside an AuthProvider')
  return value
}
