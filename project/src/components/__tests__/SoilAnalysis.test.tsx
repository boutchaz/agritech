import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SoilAnalysis from '../SoilAnalysis'

describe('SoilAnalysis', () => {
  it('submits updated form values via onSave', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onCancel = vi.fn()

    render(<SoilAnalysis onSave={onSave} onCancel={onCancel} />)

    const texture = screen.getByLabelText(/Texture du Sol/i) as HTMLSelectElement
    await user.selectOptions(texture, 'Limoneuse')

    // Target pH input by its unique ID to avoid matching "Phosphore (P)"
    const ph = document.getElementById('physical.ph') as HTMLInputElement
    await user.clear(ph)
    await user.type(ph, '6')

    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const payload = onSave.mock.calls[0][0]
    expect(payload).toMatchObject({
      physical: {
        texture: 'Limoneuse',
        ph: 6,
      },
    })
  })
})

