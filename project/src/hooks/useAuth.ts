import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  // Debug logging
  if (context.currentOrganization && typeof context.currentOrganization.id !== 'string') {
    console.error('[useAuth] ERROR: currentOrganization.id is not a string!', {
      currentOrganization: context.currentOrganization,
      id: context.currentOrganization.id,
      idType: typeof context.currentOrganization.id
    });
  }
  return context
}