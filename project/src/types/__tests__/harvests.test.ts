import { describe, it, expect } from 'vitest'
import {
  getHarvestStatusLabel,
  getDeliveryStatusLabel,
  getQualityGradeLabel,
  calculateHarvestRevenue,
  calculateDeliveryBalance,
  isDeliveryFullyPaid,
  HARVEST_STATUS_LABELS,
  DELIVERY_STATUS_LABELS,
  QUALITY_GRADE_LABELS,
  HARVEST_STATUS_COLORS,
  DELIVERY_STATUS_COLORS,
  type HarvestRecord,
  type Delivery,
} from '../harvests'

describe('harvests helpers', () => {
  describe('getHarvestStatusLabel', () => {
    it('returns English label for stored status', () => {
      expect(getHarvestStatusLabel('stored', 'en')).toBe('Stored')
    })

    it('returns French label for stored status', () => {
      expect(getHarvestStatusLabel('stored', 'fr')).toBe('Stockée')
    })

    it('returns English label for in_delivery status', () => {
      expect(getHarvestStatusLabel('in_delivery', 'en')).toBe('In Delivery')
    })

    it('returns French label for in_delivery status', () => {
      expect(getHarvestStatusLabel('in_delivery', 'fr')).toBe('En livraison')
    })

    it('returns English label for delivered status', () => {
      expect(getHarvestStatusLabel('delivered', 'en')).toBe('Delivered')
    })

    it('returns French label for delivered status', () => {
      expect(getHarvestStatusLabel('delivered', 'fr')).toBe('Livrée')
    })

    it('returns English label for sold status', () => {
      expect(getHarvestStatusLabel('sold', 'en')).toBe('Sold')
    })

    it('returns French label for sold status', () => {
      expect(getHarvestStatusLabel('sold', 'fr')).toBe('Vendue')
    })

    it('returns English label for spoiled status', () => {
      expect(getHarvestStatusLabel('spoiled', 'en')).toBe('Spoiled')
    })

    it('returns French label for spoiled status', () => {
      expect(getHarvestStatusLabel('spoiled', 'fr')).toBe('Avariée')
    })

    it('defaults to French when language not specified', () => {
      expect(getHarvestStatusLabel('stored')).toBe('Stockée')
    })
  })

  describe('getDeliveryStatusLabel', () => {
    it('returns English label for pending status', () => {
      expect(getDeliveryStatusLabel('pending', 'en')).toBe('Pending')
    })

    it('returns French label for pending status', () => {
      expect(getDeliveryStatusLabel('pending', 'fr')).toBe('En attente')
    })

    it('returns English label for prepared status', () => {
      expect(getDeliveryStatusLabel('prepared', 'en')).toBe('Prepared')
    })

    it('returns French label for prepared status', () => {
      expect(getDeliveryStatusLabel('prepared', 'fr')).toBe('Préparée')
    })

    it('returns English label for in_transit status', () => {
      expect(getDeliveryStatusLabel('in_transit', 'en')).toBe('In Transit')
    })

    it('returns French label for in_transit status', () => {
      expect(getDeliveryStatusLabel('in_transit', 'fr')).toBe('En transit')
    })

    it('returns English label for delivered status', () => {
      expect(getDeliveryStatusLabel('delivered', 'en')).toBe('Delivered')
    })

    it('returns French label for delivered status', () => {
      expect(getDeliveryStatusLabel('delivered', 'fr')).toBe('Livrée')
    })

    it('returns English label for cancelled status', () => {
      expect(getDeliveryStatusLabel('cancelled', 'en')).toBe('Cancelled')
    })

    it('returns French label for cancelled status', () => {
      expect(getDeliveryStatusLabel('cancelled', 'fr')).toBe('Annulée')
    })

    it('returns English label for returned status', () => {
      expect(getDeliveryStatusLabel('returned', 'en')).toBe('Returned')
    })

    it('returns French label for returned status', () => {
      expect(getDeliveryStatusLabel('returned', 'fr')).toBe('Retournée')
    })

    it('defaults to French when language not specified', () => {
      expect(getDeliveryStatusLabel('pending')).toBe('En attente')
    })
  })

  describe('getQualityGradeLabel', () => {
    it('returns English label for Extra grade', () => {
      expect(getQualityGradeLabel('Extra', 'en')).toBe('Extra')
    })

    it('returns French label for Extra grade', () => {
      expect(getQualityGradeLabel('Extra', 'fr')).toBe('Extra')
    })

    it('returns English label for A grade', () => {
      expect(getQualityGradeLabel('A', 'en')).toBe('A')
    })

    it('returns French label for A grade', () => {
      expect(getQualityGradeLabel('A', 'fr')).toBe('A')
    })

    it('returns English label for First grade', () => {
      expect(getQualityGradeLabel('First', 'en')).toBe('First')
    })

    it('returns French label for First grade', () => {
      expect(getQualityGradeLabel('First', 'fr')).toBe('Premier choix')
    })

    it('returns English label for B grade', () => {
      expect(getQualityGradeLabel('B', 'en')).toBe('B')
    })

    it('returns French label for B grade', () => {
      expect(getQualityGradeLabel('B', 'fr')).toBe('B')
    })

    it('returns English label for Second grade', () => {
      expect(getQualityGradeLabel('Second', 'en')).toBe('Second')
    })

    it('returns French label for Second grade', () => {
      expect(getQualityGradeLabel('Second', 'fr')).toBe('Deuxième choix')
    })

    it('returns English label for C grade', () => {
      expect(getQualityGradeLabel('C', 'en')).toBe('C')
    })

    it('returns French label for C grade', () => {
      expect(getQualityGradeLabel('C', 'fr')).toBe('C')
    })

    it('returns English label for Third grade', () => {
      expect(getQualityGradeLabel('Third', 'en')).toBe('Third')
    })

    it('returns French label for Third grade', () => {
      expect(getQualityGradeLabel('Third', 'fr')).toBe('Troisième choix')
    })

    it('defaults to French when language not specified', () => {
      expect(getQualityGradeLabel('A')).toBe('A')
    })
  })

  describe('calculateHarvestRevenue', () => {
    it('calculates revenue with price and quantity', () => {
      const harvest: HarvestRecord = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        parcel_id: 'parcel1',
        harvest_date: '2024-01-01',
        quantity: 100,
        unit: 'kg',
        status: 'stored',
        expected_price_per_unit: 5.5,
        workers: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateHarvestRevenue(harvest)).toBe(550)
    })

    it('returns 0 when price is not set', () => {
      const harvest: HarvestRecord = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        parcel_id: 'parcel1',
        harvest_date: '2024-01-01',
        quantity: 100,
        unit: 'kg',
        status: 'stored',
        workers: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateHarvestRevenue(harvest)).toBe(0)
    })

    it('returns 0 when price is undefined', () => {
      const harvest: HarvestRecord = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        parcel_id: 'parcel1',
        harvest_date: '2024-01-01',
        quantity: 100,
        unit: 'kg',
        status: 'stored',
        expected_price_per_unit: undefined,
        workers: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateHarvestRevenue(harvest)).toBe(0)
    })

    it('handles zero quantity', () => {
      const harvest: HarvestRecord = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        parcel_id: 'parcel1',
        harvest_date: '2024-01-01',
        quantity: 0,
        unit: 'kg',
        status: 'stored',
        expected_price_per_unit: 5.5,
        workers: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateHarvestRevenue(harvest)).toBe(0)
    })

    it('handles decimal quantities and prices', () => {
      const harvest: HarvestRecord = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        parcel_id: 'parcel1',
        harvest_date: '2024-01-01',
        quantity: 25.5,
        unit: 'kg',
        status: 'stored',
        expected_price_per_unit: 3.25,
        workers: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateHarvestRevenue(harvest)).toBeCloseTo(82.875, 2)
    })

    it('handles large quantities', () => {
      const harvest: HarvestRecord = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        parcel_id: 'parcel1',
        harvest_date: '2024-01-01',
        quantity: 10000,
        unit: 'kg',
        status: 'stored',
        expected_price_per_unit: 2.5,
        workers: [],
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateHarvestRevenue(harvest)).toBe(25000)
    })
  })

  describe('calculateDeliveryBalance', () => {
    it('calculates positive balance when amount exceeds payment', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'partial',
        payment_received: 600,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateDeliveryBalance(delivery)).toBe(400)
    })

    it('calculates zero balance when fully paid', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'paid',
        payment_received: 1000,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateDeliveryBalance(delivery)).toBe(0)
    })

    it('calculates negative balance when overpaid', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'paid',
        payment_received: 1200,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateDeliveryBalance(delivery)).toBe(-200)
    })

    it('handles zero payment', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'pending',
        payment_received: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateDeliveryBalance(delivery)).toBe(1000)
    })

    it('handles decimal amounts', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1500.75,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'partial',
        payment_received: 750.50,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(calculateDeliveryBalance(delivery)).toBeCloseTo(750.25, 2)
    })
  })

  describe('isDeliveryFullyPaid', () => {
    it('returns true when payment equals total amount', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'paid',
        payment_received: 1000,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(isDeliveryFullyPaid(delivery)).toBe(true)
    })

    it('returns true when payment exceeds total amount', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'paid',
        payment_received: 1200,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(isDeliveryFullyPaid(delivery)).toBe(true)
    })

    it('returns false when payment is less than total amount', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'partial',
        payment_received: 600,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(isDeliveryFullyPaid(delivery)).toBe(false)
    })

    it('returns false when no payment received', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'pending',
        payment_received: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(isDeliveryFullyPaid(delivery)).toBe(false)
    })

    it('handles decimal amounts correctly', () => {
      const delivery: Delivery = {
        id: '1',
        organization_id: 'org1',
        farm_id: 'farm1',
        delivery_date: '2024-01-01',
        delivery_type: 'market_sale',
        customer_name: 'Customer A',
        total_quantity: 100,
        total_amount: 1000.50,
        currency: 'USD',
        status: 'delivered',
        payment_status: 'paid',
        payment_received: 1000.50,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }
      expect(isDeliveryFullyPaid(delivery)).toBe(true)
    })
  })

  describe('HARVEST_STATUS_LABELS constant', () => {
    it('contains all harvest statuses', () => {
      expect(HARVEST_STATUS_LABELS).toHaveProperty('stored')
      expect(HARVEST_STATUS_LABELS).toHaveProperty('in_delivery')
      expect(HARVEST_STATUS_LABELS).toHaveProperty('delivered')
      expect(HARVEST_STATUS_LABELS).toHaveProperty('sold')
      expect(HARVEST_STATUS_LABELS).toHaveProperty('spoiled')
    })

    it('has English and French labels for each status', () => {
      Object.values(HARVEST_STATUS_LABELS).forEach((labels) => {
        expect(labels).toHaveProperty('en')
        expect(labels).toHaveProperty('fr')
        expect(typeof labels.en).toBe('string')
        expect(typeof labels.fr).toBe('string')
      })
    })
  })

  describe('DELIVERY_STATUS_LABELS constant', () => {
    it('contains all delivery statuses', () => {
      expect(DELIVERY_STATUS_LABELS).toHaveProperty('pending')
      expect(DELIVERY_STATUS_LABELS).toHaveProperty('prepared')
      expect(DELIVERY_STATUS_LABELS).toHaveProperty('in_transit')
      expect(DELIVERY_STATUS_LABELS).toHaveProperty('delivered')
      expect(DELIVERY_STATUS_LABELS).toHaveProperty('cancelled')
      expect(DELIVERY_STATUS_LABELS).toHaveProperty('returned')
    })

    it('has English and French labels for each status', () => {
      Object.values(DELIVERY_STATUS_LABELS).forEach((labels) => {
        expect(labels).toHaveProperty('en')
        expect(labels).toHaveProperty('fr')
        expect(typeof labels.en).toBe('string')
        expect(typeof labels.fr).toBe('string')
      })
    })
  })

  describe('QUALITY_GRADE_LABELS constant', () => {
    it('contains all quality grades', () => {
      expect(QUALITY_GRADE_LABELS).toHaveProperty('Extra')
      expect(QUALITY_GRADE_LABELS).toHaveProperty('A')
      expect(QUALITY_GRADE_LABELS).toHaveProperty('First')
      expect(QUALITY_GRADE_LABELS).toHaveProperty('B')
      expect(QUALITY_GRADE_LABELS).toHaveProperty('Second')
      expect(QUALITY_GRADE_LABELS).toHaveProperty('C')
      expect(QUALITY_GRADE_LABELS).toHaveProperty('Third')
    })

    it('has English and French labels for each grade', () => {
      Object.values(QUALITY_GRADE_LABELS).forEach((labels) => {
        expect(labels).toHaveProperty('en')
        expect(labels).toHaveProperty('fr')
        expect(typeof labels.en).toBe('string')
        expect(typeof labels.fr).toBe('string')
      })
    })
  })

  describe('HARVEST_STATUS_COLORS constant', () => {
    it('contains color classes for all harvest statuses', () => {
      expect(HARVEST_STATUS_COLORS).toHaveProperty('stored')
      expect(HARVEST_STATUS_COLORS).toHaveProperty('in_delivery')
      expect(HARVEST_STATUS_COLORS).toHaveProperty('delivered')
      expect(HARVEST_STATUS_COLORS).toHaveProperty('sold')
      expect(HARVEST_STATUS_COLORS).toHaveProperty('spoiled')
    })

    it('has valid Tailwind color classes', () => {
      Object.values(HARVEST_STATUS_COLORS).forEach((colorClass) => {
        expect(typeof colorClass).toBe('string')
        expect(colorClass).toMatch(/bg-\w+-\d+\s+text-\w+-\d+/)
      })
    })
  })

  describe('DELIVERY_STATUS_COLORS constant', () => {
    it('contains color classes for all delivery statuses', () => {
      expect(DELIVERY_STATUS_COLORS).toHaveProperty('pending')
      expect(DELIVERY_STATUS_COLORS).toHaveProperty('prepared')
      expect(DELIVERY_STATUS_COLORS).toHaveProperty('in_transit')
      expect(DELIVERY_STATUS_COLORS).toHaveProperty('delivered')
      expect(DELIVERY_STATUS_COLORS).toHaveProperty('cancelled')
      expect(DELIVERY_STATUS_COLORS).toHaveProperty('returned')
    })

    it('has valid Tailwind color classes', () => {
      Object.values(DELIVERY_STATUS_COLORS).forEach((colorClass) => {
        expect(typeof colorClass).toBe('string')
        expect(colorClass).toMatch(/bg-\w+-\d+\s+text-\w+-\d+/)
      })
    })
  })
})
