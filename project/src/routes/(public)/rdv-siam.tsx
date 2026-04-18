import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/(public)/rdv-siam')({
  component: RdvSiamPage,
})

function RdvSiamPage() {
  useEffect(() => {
    // Keep legacy SIAM links working (QR codes, flyers) by redirecting to the evergreen page.
    window.location.replace('/rdv?source=siam-2026')
  }, [])

  return null
}
