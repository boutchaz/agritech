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

    // Select texture
    const texture = screen.getByLabelText('Texture du Sol') as HTMLSelectElement
    await user.selectOptions(texture, 'Limoneuse')

    // Update pH
    const ph = screen.getByLabelText('pH') as HTMLInputElement
    await user.clear(ph)
    await user.type(ph, '6.5')

    // Save
    await user.click(screen.getByRole('button', { name: /enregistrer/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const payload = onSave.mock.calls[0][0]
    expect(payload).toMatchObject({
      physical: {
        texture: 'Limoneuse',
        ph: 6.5,
      },
    })
  })
})

