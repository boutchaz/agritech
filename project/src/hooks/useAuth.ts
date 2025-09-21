import { useContext } from 'react'
import { AuthContext } from '../components/MultiTenantAuthProvider'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within a MultiTenantAuthProvider')
  }
  return context
}