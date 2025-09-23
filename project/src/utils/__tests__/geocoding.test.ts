import { describe, it, expect } from 'vitest'
import {
  searchResultToCoordinates,
  isLocationInMorocco,
  type SearchResult,
} from '../geocoding'

describe('geocoding utils', () => {
  it('parses SearchResult to [lon, lat]', () => {
    const sample: SearchResult = {
      place_id: '1',
      display_name: 'Casablanca, Morocco',
      lat: '33.5731',
      lon: '-7.5898',
      type: 'city',
      importance: 0.8,
    }
    const coords = searchResultToCoordinates(sample)
    expect(coords).toEqual([-7.5898, 33.5731])
  })

  it('detects Morocco bounding box', () => {
    // Casablanca
    expect(isLocationInMorocco(33.5731, -7.5898)).toBe(true)
    // Paris
    expect(isLocationInMorocco(48.8566, 2.3522)).toBe(false)
  })
})

