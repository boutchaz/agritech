import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  // Note: createContext with a default value means context is never undefined.
  // The default context has loading=true and null user, which is the correct
  // unauthenticated state. No need to throw here.
  return context
}
