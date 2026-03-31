const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface SiamRdvPayload {
  nom: string
  entreprise?: string
  tel: string
  email?: string
  surface?: string
  region?: string
  culture?: string[]
  culture_autre?: string
  creneau: string
  source?: string
}

export async function submitSiamRdv(payload: SiamRdvPayload): Promise<void> {
  const response = await fetch(`${API_URL}/api/v1/public/rdv/siam`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    const message = error?.message || 'Failed to submit rendez-vous request'
    throw new Error(message)
  }
}
