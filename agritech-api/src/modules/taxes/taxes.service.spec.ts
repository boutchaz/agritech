import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('TaxesService', () => {
  let service: TaxesService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_TAX_RATES = [0, 5, 10, 14, 15, 19, 20, 21, 25, 30];

  const VALID_TAX_TYPES = ['sales', 'purchase', 'both'] as const;

  const INVALID_TAX_RATES = [-1, -0.1, 100.1, 1000, Infinity, NaN];

  const ORGANIZATION_ID = TEST_IDS.organization;
  const USER_ID = TEST_IDS.user;
  const TAX_ID = 'test-tax-001';

  const mockTax = {
    id: TAX_ID,
    organization_id: ORGANIZATION_ID,
    name: 'VAT Standard Rate',
    rate: 20,
    tax_type: 'both',
    is_active: true,
    description: 'Standard VAT rate for goods and services',
    created_by: USER_ID,
    updated_by: USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<TaxesService>(TaxesService);
  });

  const mockFrom = (queryBuilder: MockQueryBuilder) => {
    (mockClient.from as jest.Mock).mockReturnValue(queryBuilder);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - TAX RATES
  // ============================================================

  describe('Tax Rates (Parameterized)', () => {
    it.each(VALID_TAX_RATES)('should accept valid tax rate: %s%', async (rate) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        organization_id: ORGANIZATION_ID,
        name: `Tax ${rate}%`,
        rate,
        tax_type: 'sales',
        is_active: true,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        tax_name: `Tax ${rate}%`,
        tax_rate: rate,
        tax_type: 'sales' as const,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.rate).toBe(rate);
    });

    it.each(VALID_TAX_TYPES)(
      'should accept valid tax type: %s',
      async (taxType) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          organization_id: ORGANIZATION_ID,
          name: 'Test Tax',
          rate: 20,
          tax_type: taxType,
          is_active: true,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Test Tax',
          tax_rate: 20,
          tax_type: taxType,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.tax_type).toBe(taxType);
      }
    );

    it.each(VALID_TAX_TYPES)(
      'should filter taxes by type: %s',
      async (taxType) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.or.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([mockTax]));
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID, {
          tax_type: taxType,
        });

        expect(queryBuilder.or).toHaveBeenCalledWith(
          expect.stringContaining(`tax_type.eq.${taxType}`)
        );
        expect(result).toBeDefined();
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('create', () => {
      it.each([null, undefined, ''])(
        'should reject invalid tax_name: %s',
        async (name) => {
          const queryBuilder = createMockQueryBuilder();
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            tax_name: name as any,
            tax_rate: 20,
            tax_type: 'sales' as const,
            created_by: USER_ID,
          };

          await expect(service.create(dto)).rejects.toThrow();
        }
      );

      it.each(INVALID_TAX_RATES)(
        'should reject invalid tax_rate: %s',
        async (rate) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid tax rate' })
          );
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            tax_name: 'Invalid Tax',
            tax_rate: rate,
            tax_type: 'sales' as const,
            created_by: USER_ID,
          };

          await expect(service.create(dto)).rejects.toThrow();
        }
      );

      it('should reject invalid tax_type', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Invalid tax type' })
        );
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Invalid Type Tax',
          tax_rate: 20,
          tax_type: 'invalid_type' as any,
          created_by: USER_ID,
        };

        await expect(service.create(dto)).rejects.toThrow();
      });

      it('should accept zero tax rate', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          organization_id: ORGANIZATION_ID,
          name: 'Zero Rate Tax',
          rate: 0,
          tax_type: 'sales',
          is_active: true,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Zero Rate Tax',
          tax_rate: 0,
          tax_type: 'sales' as const,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.rate).toBe(0);
      });

      it('should create active tax by default when is_active not provided', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          name: 'Default Active Tax',
          rate: 20,
          is_active: true,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Default Active Tax',
          tax_rate: 20,
          tax_type: 'sales' as const,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.is_active).toBe(true);
      });
    });

    describe('update', () => {
      it('should reject update of non-existent tax', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockFrom(queryBuilder);

        await expect(
          service.update('non-existent', ORGANIZATION_ID, USER_ID, {
            tax_name: 'Updated',
          })
        ).rejects.toThrow(BadRequestException);
      });

      it.each(INVALID_TAX_RATES)(
        'should reject update with invalid tax_rate: %s',
        async (rate) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid tax rate' })
          );
          mockFrom(queryBuilder);

          await expect(
            service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
              tax_rate: rate,
            })
          ).rejects.toThrow();
        }
      );
    });

    describe('delete', () => {
      it('should reject deletion of tax used in invoices', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockResolvedValue(
          mockQueryResult([{ id: 'invoice-item-id' }]) // Has invoice items
        );
        mockFrom(queryBuilder);

        await expect(service.delete(TAX_ID, ORGANIZATION_ID)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.delete(TAX_ID, ORGANIZATION_ID)).rejects.toThrow(
          'Cannot delete tax used in invoices'
        );
      });

      it('should reject deletion of non-existent tax', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockResolvedValue(mockQueryResult([])); // No invoice items
        queryBuilder.eq.mockReturnValue(queryBuilder);
        (mockClient.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'invoice_items') {
            const qb = createMockQueryBuilder();
            qb.eq.mockReturnValue(qb);
            qb.limit.mockReturnValue(qb);
            qb.limit.mockResolvedValue(mockQueryResult([]));
            return qb;
          }
          return queryBuilder;
        });

        // The delete will fail on the actual delete operation
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );

        await expect(service.delete('non-existent', ORGANIZATION_ID)).rejects.toThrow(
          BadRequestException
        );
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Tax Type Filtering', () => {
    it('should return sales taxes when filtering by sales type', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(
        mockQueryResult([{ ...mockTax, tax_type: 'sales' }])
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(ORGANIZATION_ID, { tax_type: 'sales' });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        'tax_type.eq.sales,tax_type.eq.both'
      );
      expect(result).toBeDefined();
    });

    it('should return purchase taxes when filtering by purchase type', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(
        mockQueryResult([{ ...mockTax, tax_type: 'purchase' }])
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.findAll(ORGANIZATION_ID, { tax_type: 'purchase' });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        'tax_type.eq.purchase,tax_type.eq.both'
      );
      expect(result).toBeDefined();
    });

    it('should return both type taxes for any filter', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(
        mockQueryResult([{ ...mockTax, tax_type: 'both' }])
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { tax_type: 'sales' });

      expect(queryBuilder.or).toHaveBeenCalledWith(
        expect.stringContaining('tax_type.eq.both')
      );
    });

    it('should not apply type filter when not specified', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockTax]));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID);

      expect(queryBuilder.or).not.toHaveBeenCalled();
    });
  });

  describe('Behavior - Active/Inactive Status', () => {
    it('should filter taxes by active status', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockTax]));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { is_active: true });

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should create inactive tax when specified', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        name: 'Inactive Tax',
        rate: 20,
        is_active: false,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        organization_id: ORGANIZATION_ID,
        tax_name: 'Inactive Tax',
        tax_rate: 20,
        tax_type: 'sales' as const,
        is_active: false,
        created_by: USER_ID,
      };

      const result = await service.create(dto);

      expect(result.is_active).toBe(false);
    });

    it('should allow deactivating a tax', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        is_active: false,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        is_active: false,
      });

      expect(result.is_active).toBe(false);
    });

    it('should allow reactivating a tax', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        is_active: true,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        is_active: true,
      });

      expect(result.is_active).toBe(true);
    });
  });

  describe('Behavior - Search and Filtering', () => {
    it('should search taxes by name (case-insensitive)', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockTax]));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, { search: 'vat' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%vat%');
    });

    it('should combine multiple filters', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.or.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockTax]));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID, {
        tax_type: 'sales',
        is_active: true,
        search: 'VAT',
      });

      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(queryBuilder.or).toHaveBeenCalled();
      expect(queryBuilder.ilike).toHaveBeenCalled();
    });

    it('should return all taxes ordered by name', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult([mockTax]));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.findAll(ORGANIZATION_ID);

      expect(queryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });

  describe('Behavior - Field Updates', () => {
    it('should update tax name', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        name: 'Updated Tax Name',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        tax_name: 'Updated Tax Name',
      });

      expect(result.name).toBe('Updated Tax Name');
    });

    it('should update tax rate', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        rate: 25,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        tax_rate: 25,
      });

      expect(result.rate).toBe(25);
    });

    it('should update tax type', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        tax_type: 'purchase',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        tax_type: 'purchase',
      });

      expect(result.tax_type).toBe('purchase');
    });

    it('should update tax description', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        description: 'Updated description',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });

    it('should update multiple fields at once', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        name: 'Updated Name',
        rate: 21,
        tax_type: 'both',
        is_active: false,
        description: 'Comprehensive update',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        tax_name: 'Updated Name',
        tax_rate: 21,
        tax_type: 'both',
        is_active: false,
        description: 'Comprehensive update',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.rate).toBe(21);
      expect(result.tax_type).toBe('both');
      expect(result.is_active).toBe(false);
      expect(result.description).toBe('Comprehensive update');
    });

    it('should set updated_by on update', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockTax,
        updated_by: USER_ID,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
        tax_name: 'Updated',
      });

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_by: USER_ID,
        })
      );
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Tax Rate Edge Cases', () => {
      it('should handle very small tax rates', async () => {
        const smallRates = [0.01, 0.1, 0.5, 1];

        for (const rate of smallRates) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${rate}`,
            name: `Small Rate Tax ${rate}%`,
            rate,
          }));
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            tax_name: `Small Rate Tax ${rate}%`,
            tax_rate: rate,
            tax_type: 'sales' as const,
            created_by: USER_ID,
          };

          const result = await service.create(dto);

          expect(result.rate).toBe(rate);
        }
      });

      it('should handle high tax rates', async () => {
        const highRates = [25, 30, 35, 40];

        for (const rate of highRates) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${rate}`,
            name: `High Rate Tax ${rate}%`,
            rate,
          }));
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            tax_name: `High Rate Tax ${rate}%`,
            tax_rate: rate,
            tax_type: 'sales' as const,
            created_by: USER_ID,
          };

          const result = await service.create(dto);

          expect(result.rate).toBe(rate);
        }
      });

      it('should handle decimal tax rates', async () => {
        const decimalRates = [5.5, 7.5, 10.5, 19.6, 20.5];

        for (const rate of decimalRates) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${rate}`,
            name: `Decimal Rate Tax ${rate}%`,
            rate,
          }));
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            tax_name: `Decimal Rate Tax ${rate}%`,
            tax_rate: rate,
            tax_type: 'sales' as const,
            created_by: USER_ID,
          };

          const result = await service.create(dto);

          expect(result.rate).toBe(rate);
        }
      });
    });

    describe('Special Characters in Names', () => {
      it('should handle tax names with special characters', async () => {
        const specialNames = [
          'TVA 20%',
          'VAT (Standard)',
          'IVA - Tipo General',
          'MwSt. 19%',
          'DPH 21%',
        ];

        for (const name of specialNames) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${name}`,
            name,
            rate: 20,
          }));
          mockFrom(queryBuilder);

          const dto = {
            organization_id: ORGANIZATION_ID,
            tax_name: name,
            tax_rate: 20,
            tax_type: 'sales' as const,
            created_by: USER_ID,
          };

          const result = await service.create(dto);

          expect(result.name).toBe(name);
        }
      });
    });

    describe('Description Edge Cases', () => {
      it('should handle very long descriptions', async () => {
        const longDescription = 'A'.repeat(1000);

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          name: 'Tax with Long Description',
          rate: 20,
          description: longDescription,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Tax with Long Description',
          tax_rate: 20,
          tax_type: 'sales' as const,
          description: longDescription,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.description).toBe(longDescription);
      });

      it('should handle null description', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          name: 'Tax without Description',
          rate: 20,
          description: null,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Tax without Description',
          tax_rate: 20,
          tax_type: 'sales' as const,
          description: null,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.description).toBeNull();
      });
    });

    describe('Database Error Scenarios', () => {
      it('should handle database connection errors', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockRejectedValue(new Error('Connection lost'));
        mockFrom(queryBuilder);

        await expect(service.findAll(ORGANIZATION_ID)).rejects.toThrow(BadRequestException);
      });

      it('should handle constraint violations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, {
            message: 'Unique constraint violation',
            code: '23505',
          })
        );
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'Duplicate Tax',
          tax_rate: 20,
          tax_type: 'sales' as const,
          created_by: USER_ID,
        };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });
    });

    describe('Organization Isolation', () => {
      it('should not return taxes from other organizations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([])); // No taxes for other org
        mockFrom(queryBuilder);

        const result = await service.findAll('other-org-id');

        expect(result).toEqual([]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', 'other-org-id');
      });

      it('should prevent accessing tax from different organization', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // Not found
        mockFrom(queryBuilder);

        await expect(service.findOne(TAX_ID, 'different-org-id')).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    describe('findAll', () => {
      it('should return all taxes for organization', async () => {
        const mockTaxes = [
          mockTax,
          { ...mockTax, id: '2', name: 'VAT Reduced', rate: 10 },
          { ...mockTax, id: '3', name: 'VAT Zero', rate: 0 },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(mockTaxes));
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toHaveLength(3);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should return empty array when no taxes exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toEqual([]);
      });
    });

    describe('findOne', () => {
      it('should return tax by ID', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(mockTax));
        mockFrom(queryBuilder);

        const result = await service.findOne(TAX_ID, ORGANIZATION_ID);

        expect(result).toEqual(mockTax);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', TAX_ID);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should throw NotFoundException when tax not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // Not found
        mockFrom(queryBuilder);

        await expect(service.findOne('non-existent', ORGANIZATION_ID)).rejects.toThrow(
          NotFoundException
        );
        await expect(service.findOne('non-existent', ORGANIZATION_ID)).rejects.toThrow(
          'Tax not found'
        );
      });
    });

    describe('create', () => {
      it('should create tax with all fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          organization_id: ORGANIZATION_ID,
          name: 'VAT Standard',
          rate: 20,
          tax_type: 'both',
          is_active: true,
          description: 'Standard VAT rate',
          created_by: USER_ID,
          updated_by: USER_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: 'VAT Standard',
          tax_rate: 20,
          tax_type: 'both' as const,
          is_active: true,
          description: 'Standard VAT rate',
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.name).toBe('VAT Standard');
        expect(result.rate).toBe(20);
        expect(result.tax_type).toBe('both');
        expect(result.description).toBe('Standard VAT rate');
      });
    });

    describe('update', () => {
      it('should update only provided fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          ...mockTax,
          name: 'Updated Name',
          // Other fields remain unchanged
        }));
        mockFrom(queryBuilder);

        const result = await service.update(TAX_ID, ORGANIZATION_ID, USER_ID, {
          tax_name: 'Updated Name',
        });

        expect(result.name).toBe('Updated Name');
        expect(result.rate).toBe(mockTax.rate); // Unchanged
        expect(result.tax_type).toBe(mockTax.tax_type); // Unchanged
      });
    });

    describe('delete', () => {
      it('should delete unused tax', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockReturnValue(queryBuilder);
        queryBuilder.limit.mockResolvedValue(mockQueryResult([])); // No invoice items
        (mockClient.from as jest.Mock).mockImplementation((table: string) => {
          if (table === 'invoice_items') {
            const qb = createMockQueryBuilder();
            qb.eq.mockReturnValue(qb);
            qb.limit.mockReturnValue(qb);
            qb.limit.mockResolvedValue(mockQueryResult([]));
            return qb;
          }
          return queryBuilder;
        });

        // Delete succeeds
        queryBuilder.eq.mockReturnValue(queryBuilder);
        mockFrom(queryBuilder);

        const result = await service.delete(TAX_ID, ORGANIZATION_ID);

        expect(result).toEqual({ message: 'Tax deleted successfully' });
        expect(queryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // AGRICULTURAL CONTEXT TESTS
  // ============================================================

  describe('Agricultural Context', () => {
    it('should support agricultural VAT exemptions', async () => {
      const agriculturalExemptions = [
        { name: 'Exempt - Basic Food', rate: 0, description: 'Basic agricultural products exemption' },
        { name: 'Reduced - Seeds', rate: 5, description: 'Reduced rate for seeds and fertilizers' },
        { name: 'Reduced - Agricultural Equipment', rate: 10, description: 'Reduced rate for farming equipment' },
      ];

      for (const tax of agriculturalExemptions) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${tax.name}`,
          organization_id: ORGANIZATION_ID,
          name: tax.name,
          rate: tax.rate,
          description: tax.description,
          tax_type: 'both',
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: tax.name,
          tax_rate: tax.rate,
          tax_type: 'both' as const,
          description: tax.description,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.name).toContain(tax.name.split(' - ')[1] || tax.name);
        expect(result.rate).toBe(tax.rate);
      }
    });

    it('should support country-specific agricultural taxes', async () => {
      const countrySpecificTaxes = [
        { country: 'MA', name: 'TVA 20%', rate: 20 },
        { country: 'FR', name: 'TVA 20%', rate: 20 },
        { country: 'TN', name: 'TVA 19%', rate: 19 },
        { country: 'DE', name: 'MwSt 19%', rate: 19 },
        { country: 'US', name: 'Sales Tax', rate: 8.5 },
      ];

      for (const tax of countrySpecificTaxes) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${tax.country}`,
          name: tax.name,
          rate: tax.rate,
          description: `Standard tax rate for ${tax.country}`,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: tax.name,
          tax_rate: tax.rate,
          tax_type: 'both' as const,
          description: `Standard tax rate for ${tax.country}`,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.name).toBe(tax.name);
        expect(result.rate).toBe(tax.rate);
      }
    });

    it('should support agricultural input taxes vs output taxes', async () => {
      // Input taxes (purchases): seeds, fertilizers, equipment
      const inputTax = {
        name: 'Input VAT - Agricultural Supplies',
        rate: 10,
        tax_type: 'purchase' as const,
        description: 'Reduced rate for agricultural inputs',
      };

      // Output taxes (sales): crops, livestock products
      const outputTax = {
        name: 'Output VAT - Agricultural Products',
        rate: 0,
        tax_type: 'sales' as const,
        description: 'Exempt rate for primary agricultural products',
      };

      for (const tax of [inputTax, outputTax]) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${tax.name}`,
          name: tax.name,
          rate: tax.rate,
          tax_type: tax.tax_type,
          description: tax.description,
        }));
        mockFrom(queryBuilder);

        const dto = {
          organization_id: ORGANIZATION_ID,
          tax_name: tax.name,
          tax_rate: tax.rate,
          tax_type: tax.tax_type,
          description: tax.description,
          created_by: USER_ID,
        };

        const result = await service.create(dto);

        expect(result.tax_type).toBe(tax.tax_type);
      }
    });
  });
});
