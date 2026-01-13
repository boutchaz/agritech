import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { FiscalYearsService } from './fiscal-years.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('FiscalYearsService', () => {
  let service: FiscalYearsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_FISCAL_YEAR_NAMES = [
    { name: 'FY 2024', start: '2024-01-01', end: '2024-12-31' },
    { name: 'FY 2023-2024', start: '2023-04-01', end: '2024-03-31' },
    { name: '2024 Fiscal Year', start: '2024-01-01', end: '2024-12-31' },
    { name: 'Exercise 2024', start: '2024-01-01', end: '2024-12-31' },
  ];

  const INVALID_FISCAL_YEAR_NAMES = ['', '   ', 'A'.repeat(200), '123!@#'];

  const ORGANIZATION_ID = TEST_IDS.organization;
  const USER_ID = TEST_IDS.user;
  const FISCAL_YEAR_ID = 'test-fiscal-year-001';

  const mockFiscalYear = {
    id: FISCAL_YEAR_ID,
    organization_id: ORGANIZATION_ID,
    name: 'FY 2024',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_active: true,
    is_closed: false,
    created_by: USER_ID,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalYearsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<FiscalYearsService>(FiscalYearsService);
  });

  const mockFrom = (queryBuilder: MockQueryBuilder) => {
    mockClient.from.mockReturnValue(queryBuilder);
  };

  // Helper to mock findOne operation separately
  const mockFindOne = (fiscalYear: any) => {
    const findOneBuilder = createMockQueryBuilder();
    findOneBuilder.select.mockReturnValue(findOneBuilder);
    // eq needs to be chainable - each call should return the builder
    findOneBuilder.eq.mockReturnValue(findOneBuilder);
    findOneBuilder.single.mockResolvedValue(mockQueryResult(fiscalYear));
    return findOneBuilder;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - FISCAL YEAR NAMES
  // ============================================================

  describe('Fiscal Year Names (Parameterized)', () => {
    it.each(VALID_FISCAL_YEAR_NAMES)(
      'should accept valid fiscal year name: $name ($start to $end)',
      async ({ name, start, end }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          organization_id: ORGANIZATION_ID,
          name,
          start_date: start,
          end_date: end,
          is_active: true,
          is_closed: false,
        }));
        mockFrom(queryBuilder);

        const dto = {
          name,
          start_date: start,
          end_date: end,
          is_active: false,
        };

        const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

        expect(result.name).toBe(name);
        expect(result.start_date).toBe(start);
        expect(result.end_date).toBe(end);
      }
    );

    it.each(VALID_FISCAL_YEAR_NAMES)(
      'should update fiscal year with name: $name',
      async ({ name }) => {
        // Create a builder that handles both findOne and the update operation
        const queryBuilder = createMockQueryBuilder();

        // Track single calls manually
        let singleCallCount = 0;
        queryBuilder.single.mockImplementation(() => {
          singleCallCount++;
          if (singleCallCount === 1) {
            return Promise.resolve(mockQueryResult(mockFiscalYear)); // findOne
          }
          return Promise.resolve(mockQueryResult({ // update result
            ...mockFiscalYear,
            name,
          }));
        });

        // Ensure all chainable methods return the builder
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.neq.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate

        // Ensure from ALWAYS returns our builder (use mockImplementation)
        mockClient.from.mockImplementation(() => queryBuilder);

        const result = await service.update(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID, {
          name,
        });

        expect(result.name).toBe(name);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('create', () => {
      it('should reject creation with duplicate name', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: 'existing-id' })); // Duplicate exists
        mockFrom(queryBuilder);

        const dto = {
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        };

        await expect(service.create(ORGANIZATION_ID, USER_ID, dto)).rejects.toThrow(
          ConflictException
        );
        await expect(service.create(ORGANIZATION_ID, USER_ID, dto)).rejects.toThrow(
          'already exists'
        );
      });

      it('should validate date range (end_date after start_date)', async () => {
        // Note: The service doesn't validate date ranges - this is handled by the database
        // This test verifies that database errors are properly propagated
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        const dbError = { message: 'End date must be after start date' };
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, dbError)
        );
        mockFrom(queryBuilder);

        const dto = {
          name: 'FY 2024',
          start_date: '2024-12-31',
          end_date: '2024-01-01', // End before start
          is_active: false,
        };

        // The service should propagate the database error
        await expect(service.create(ORGANIZATION_ID, USER_ID, dto)).rejects.toEqual(dbError);
      });

      it('should handle missing optional fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          organization_id: ORGANIZATION_ID,
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          is_active: false,
          is_closed: false,
        }));
        mockFrom(queryBuilder);

        const dto = {
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
        };

        const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

        expect(result.is_active).toBe(false);
        expect(result.is_closed).toBe(false);
      });
    });

    describe('update', () => {
      it('should reject update of non-existent fiscal year', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        const dbError = { message: 'Not found' };
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, dbError));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('non-existent', ORGANIZATION_ID, USER_ID, { name: 'Updated' })
        ).rejects.toEqual(dbError);
      });

      it('should reject update with duplicate name', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.neq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(mockFiscalYear)); // findOne
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: 'other-id' })); // Duplicate exists

        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID, { name: 'Existing Name' })
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('remove', () => {
      it('should reject deletion of active fiscal year', async () => {
        const findOneBuilder = createMockQueryBuilder();
        findOneBuilder.select.mockReturnValue(findOneBuilder);
        findOneBuilder.eq.mockReturnValue(findOneBuilder);
        findOneBuilder.single.mockResolvedValue(
          mockQueryResult({ ...mockFiscalYear, is_active: true, is_closed: false })
        );
        mockClient.from.mockReturnValue(findOneBuilder);

        await expect(service.remove(FISCAL_YEAR_ID, ORGANIZATION_ID)).rejects.toThrow(
          ConflictException
        );
        await expect(service.remove(FISCAL_YEAR_ID, ORGANIZATION_ID)).rejects.toThrow(
          'Cannot delete active fiscal year'
        );
      });

      it('should reject deletion of closed fiscal year', async () => {
        const findOneBuilder = createMockQueryBuilder();
        findOneBuilder.select.mockReturnValue(findOneBuilder);
        findOneBuilder.eq.mockReturnValue(findOneBuilder);
        findOneBuilder.single.mockResolvedValue(
          mockQueryResult({ ...mockFiscalYear, is_active: false, is_closed: true })
        );
        mockClient.from.mockReturnValue(findOneBuilder);

        await expect(service.remove(FISCAL_YEAR_ID, ORGANIZATION_ID)).rejects.toThrow(
          ConflictException
        );
        await expect(service.remove(FISCAL_YEAR_ID, ORGANIZATION_ID)).rejects.toThrow(
          'Cannot delete closed fiscal year'
        );
      });

      it('should reject deletion of non-existent fiscal year', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        const dbError = { message: 'Not found' };
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, dbError));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.remove('non-existent', ORGANIZATION_ID)).rejects.toEqual(dbError);
      });
    });

    describe('close', () => {
      it('should reject closing already closed fiscal year', async () => {
        const findOneBuilder = createMockQueryBuilder();
        findOneBuilder.select.mockReturnValue(findOneBuilder);
        findOneBuilder.eq.mockReturnValue(findOneBuilder);
        findOneBuilder.single.mockResolvedValue(
          mockQueryResult({ ...mockFiscalYear, is_closed: true })
        );
        mockClient.from.mockReturnValue(findOneBuilder);

        await expect(service.close(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID)).rejects.toThrow(
          ConflictException
        );
        await expect(service.close(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID)).rejects.toThrow(
          'already closed'
        );
      });

      it('should reject closing non-existent fiscal year', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        const dbError = { message: 'Not found' };
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, dbError));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.close('non-existent', ORGANIZATION_ID, USER_ID)).rejects.toEqual(dbError);
      });
    });

    describe('reopen', () => {
      it('should reject reopening open fiscal year', async () => {
        const findOneBuilder = createMockQueryBuilder();
        findOneBuilder.select.mockReturnValue(findOneBuilder);
        findOneBuilder.eq.mockReturnValue(findOneBuilder);
        findOneBuilder.single.mockResolvedValue(
          mockQueryResult({ ...mockFiscalYear, is_closed: false })
        );
        mockClient.from.mockReturnValue(findOneBuilder);

        await expect(service.reopen(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID)).rejects.toThrow(
          ConflictException
        );
        await expect(service.reopen(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID)).rejects.toThrow(
          'not closed'
        );
      });

      it('should reject reopening non-existent fiscal year', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        const dbError = { message: 'Not found' };
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, dbError));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.reopen('non-existent', ORGANIZATION_ID, USER_ID)).rejects.toEqual(dbError);
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Active Fiscal Year Management', () => {
    it('should deactivate other fiscal years when activating a new one', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        name: 'FY 2025',
        is_active: true,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        name: 'FY 2025',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        is_active: true,
      };

      await service.create(ORGANIZATION_ID, USER_ID, dto);

      // Verify that other active fiscal years are deactivated
      expect(queryBuilder.update).toHaveBeenCalledWith({ is_active: false });
      expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should not deactivate other fiscal years when is_active is false', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        name: 'FY 2025',
        is_active: false,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        name: 'FY 2025',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        is_active: false,
      };

      await service.create(ORGANIZATION_ID, USER_ID, dto);

      // Should NOT call update to deactivate others
      expect(queryBuilder.update).not.toHaveBeenCalledWith({ is_active: false });
    });

    it('should deactivate others when updating to active', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ ...mockFiscalYear, is_active: false })) // Exists, inactive
        .mockResolvedValueOnce(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockFiscalYear,
        is_active: true,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.update(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID, { is_active: true });

      // Verify deactivation of other active fiscal years
      expect(queryBuilder.update).toHaveBeenCalledWith({ is_active: false });
    });

    it('should not deactivate others when already active', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ ...mockFiscalYear, is_active: true })) // Already active
        .mockResolvedValueOnce(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        ...mockFiscalYear,
        name: 'Updated Name',
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      await service.update(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID, { name: 'Updated Name' });

      // Should NOT deactivate others since it was already active
      const deactivationCalls = queryBuilder.update.mock.calls.filter(
        (call) => call[0] && call[0].is_active === false
      );
      expect(deactivationCalls).toHaveLength(0);
    });

    it('should get active fiscal year', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(mockFiscalYear));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getActive(ORGANIZATION_ID);

      expect(result).toEqual(mockFiscalYear);
      expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return null when no active fiscal year exists', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { code: 'PGRST116' }) // Not found error code
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getActive(ORGANIZATION_ID);

      expect(result).toBeNull();
    });
  });

  describe('Behavior - Fiscal Year Closure', () => {
    it('should close fiscal year and set is_active to false', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);

      // Use mockImplementation to handle sequential calls
      let singleCallCount = 0;
      queryBuilder.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult({ ...mockFiscalYear, is_closed: false, is_active: true }));
        }
        return Promise.resolve(mockQueryResult({
          ...mockFiscalYear,
          is_closed: true,
          is_active: false,
        }));
      });

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.close(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID);

      expect(result.is_closed).toBe(true);
      expect(result.is_active).toBe(false);
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_closed: true,
          is_active: false,
          updated_by: USER_ID,
        })
      );
    });

    it('should set updated_by and updated_at on close', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);

      // Use mockImplementation to handle sequential calls
      let singleCallCount = 0;
      queryBuilder.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult(mockFiscalYear));
        }
        return Promise.resolve(mockQueryResult({
          ...mockFiscalYear,
          is_closed: true,
          is_active: false,
          updated_by: USER_ID,
        }));
      });

      mockClient.from.mockReturnValue(queryBuilder);

      await service.close(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID);

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_by: USER_ID,
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe('Behavior - Fiscal Year Reopening', () => {
    it('should reopen closed fiscal year', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);

      // Use mockImplementation to handle sequential calls
      let singleCallCount = 0;
      queryBuilder.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult({ ...mockFiscalYear, is_closed: true }));
        }
        return Promise.resolve(mockQueryResult({
          ...mockFiscalYear,
          is_closed: false,
        }));
      });

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.reopen(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID);

      expect(result.is_closed).toBe(false);
      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_closed: false,
          updated_by: USER_ID,
        })
      );
    });

    it('should set updated_by and updated_at on reopen', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);

      // Use mockImplementation to handle sequential calls
      let singleCallCount = 0;
      queryBuilder.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult({ ...mockFiscalYear, is_closed: true }));
        }
        return Promise.resolve(mockQueryResult({
          ...mockFiscalYear,
          is_closed: false,
          updated_by: USER_ID,
        }));
      });

      mockClient.from.mockReturnValue(queryBuilder);

      await service.reopen(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID);

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_by: USER_ID,
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe('Behavior - Date Range Management', () => {
    it('should create fiscal year with custom date range', async () => {
      const customRange = {
        start_date: '2023-04-01',
        end_date: '2024-03-31',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        name: 'FY 2023-2024',
        ...customRange,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        name: 'FY 2023-2024',
        ...customRange,
      };

      const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

      expect(result.start_date).toBe(customRange.start_date);
      expect(result.end_date).toBe(customRange.end_date);
    });

    it('should update fiscal year date range', async () => {
      const newRange = {
        start_date: '2024-02-01',
        end_date: '2025-01-31',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate

      // Use mockImplementation to handle sequential calls
      let singleCallCount = 0;
      queryBuilder.single.mockImplementation(() => {
        singleCallCount++;
        if (singleCallCount === 1) {
          return Promise.resolve(mockQueryResult(mockFiscalYear)); // Exists
        }
        return Promise.resolve(mockQueryResult({
          ...mockFiscalYear,
          ...newRange,
        }));
      });

      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.update(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID, newRange);

      expect(result.start_date).toBe(newRange.start_date);
      expect(result.end_date).toBe(newRange.end_date);
    });

    it('should handle fiscal years spanning multiple calendar years', async () => {
      const multiYearRange = {
        start_date: '2023-07-01',
        end_date: '2024-06-30',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        name: 'FY 2023-2024',
        ...multiYearRange,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = {
        name: 'FY 2023-2024',
        ...multiYearRange,
      };

      const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

      expect(result.start_date).toContain('2023');
      expect(result.end_date).toContain('2024');
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Date Edge Cases', () => {
      it('should handle leap year dates', async () => {
        const leapYearRange = {
          start_date: '2024-02-29',
          end_date: '2025-02-28',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          name: 'Leap Year FY',
          ...leapYearRange,
        }));
        mockFrom(queryBuilder);

        const dto = {
          name: 'Leap Year FY',
          ...leapYearRange,
        };

        const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

        expect(result.start_date).toBe('2024-02-29');
      });

      it('should handle end of month dates', async () => {
        const endOfMonthRanges = [
          { start: '2024-01-31', end: '2024-12-31' },
          { start: '2024-02-29', end: '2025-02-28' },
          { start: '2024-04-30', end: '2025-04-30' },
        ];

        for (const range of endOfMonthRanges) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${range.start}`,
            name: 'End of Month FY',
            start_date: range.start,
            end_date: range.end,
          }));
          mockFrom(queryBuilder);

          const dto = {
            name: 'End of Month FY',
            start_date: range.start,
            end_date: range.end,
          };

          const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

          expect(result.start_date).toBe(range.start);
          expect(result.end_date).toBe(range.end);
        }
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple fiscal year creations', async () => {
        const fiscalYears = [
          { name: 'FY 2024', start: '2024-01-01', end: '2024-12-31' },
          { name: 'FY 2025', start: '2025-01-01', end: '2025-12-31' },
          { name: 'FY 2026', start: '2026-01-01', end: '2026-12-31' },
        ];

        for (const fy of fiscalYears) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult({
            id: `new-${fy.name}`,
            name: fy.name,
            start_date: fy.start,
            end_date: fy.end,
          }));
          mockFrom(queryBuilder);

          const dto = {
            name: fy.name,
            start_date: fy.start,
            end_date: fy.end,
          };

          await service.create(ORGANIZATION_ID, USER_ID, dto);
        }

        // All should succeed
        expect(true).toBe(true);
      });
    });

    describe('Database Error Scenarios', () => {
      it('should handle database connection errors', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockRejectedValue(new Error('Connection lost'));
        mockFrom(queryBuilder);

        await expect(service.findAll(ORGANIZATION_ID)).rejects.toThrow();
      });

      it('should handle constraint violations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        const dbError = {
          message: 'Date range overlap with existing fiscal year',
          code: '23514',
        };
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, dbError)
        );
        mockFrom(queryBuilder);

        const dto = {
          name: 'Overlapping FY',
          start_date: '2024-06-01',
          end_date: '2024-12-31',
        };

        await expect(service.create(ORGANIZATION_ID, USER_ID, dto)).rejects.toEqual(dbError);
      });
    });

    describe('Organization Isolation', () => {
      it('should not return fiscal years from other organizations', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null });
          return Promise.resolve({ data: [], error: null });
        });
        mockFrom(queryBuilder);

        const result = await service.findAll('other-org-id');

        expect(result).toEqual([]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', 'other-org-id');
      });

      it('should prevent accessing fiscal year from different organization', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        const dbError = { message: 'Not found' };
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, dbError));
        mockFrom(queryBuilder);

        await expect(
          service.findOne(FISCAL_YEAR_ID, 'different-org-id')
        ).rejects.toEqual(dbError);
      });
    });

    describe('State Transition Edge Cases', () => {
      it('should handle transition from active to closed', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);

        // Use mockImplementation to handle sequential calls
        let singleCallCount = 0;
        queryBuilder.single.mockImplementation(() => {
          singleCallCount++;
          if (singleCallCount === 1) {
            return Promise.resolve(mockQueryResult({ ...mockFiscalYear, is_active: true, is_closed: false }));
          }
          return Promise.resolve(mockQueryResult({
            ...mockFiscalYear,
            is_active: false,
            is_closed: true,
          }));
        });

        mockFrom(queryBuilder);

        const result = await service.close(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID);

        expect(result.is_active).toBe(false);
        expect(result.is_closed).toBe(true);
      });

      it('should handle transition from closed to reopened (not active)', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);

        // Use mockImplementation to handle sequential calls
        let singleCallCount = 0;
        queryBuilder.single.mockImplementation(() => {
          singleCallCount++;
          if (singleCallCount === 1) {
            return Promise.resolve(mockQueryResult({ ...mockFiscalYear, is_active: false, is_closed: true }));
          }
          return Promise.resolve(mockQueryResult({
            ...mockFiscalYear,
            is_active: false, // Should remain inactive
            is_closed: false,
          }));
        });

        mockFrom(queryBuilder);

        const result = await service.reopen(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID);

        expect(result.is_closed).toBe(false);
        expect(result.is_active).toBe(false); // Should remain inactive
      });
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    describe('findAll', () => {
      it('should return all fiscal years ordered by start_date', async () => {
        const mockFiscalYears = [
          { ...mockFiscalYear, id: '1', start_date: '2024-01-01' },
          { ...mockFiscalYear, id: '2', start_date: '2023-01-01' },
          { ...mockFiscalYear, id: '3', start_date: '2022-01-01' },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        // Make the query builder directly return the result when awaited
        queryBuilder.then.mockImplementation((resolve) => {
          resolve({ data: mockFiscalYears, error: null });
          return Promise.resolve({ data: mockFiscalYears, error: null });
        });
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toHaveLength(3);
        expect(queryBuilder.order).toHaveBeenCalledWith('start_date', { ascending: false });
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should return empty array when no fiscal years exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.order.mockReturnValue(queryBuilder);
        queryBuilder.then.mockImplementation((resolve) => {
          resolve({ data: [], error: null });
          return Promise.resolve({ data: [], error: null });
        });
        mockFrom(queryBuilder);

        const result = await service.findAll(ORGANIZATION_ID);

        expect(result).toEqual([]);
      });
    });

    describe('findOne', () => {
      it('should return fiscal year by ID', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(mockFiscalYear));
        mockFrom(queryBuilder);

        const result = await service.findOne(FISCAL_YEAR_ID, ORGANIZATION_ID);

        expect(result).toEqual(mockFiscalYear);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', FISCAL_YEAR_ID);
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
      });

      it('should throw error when fiscal year not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        const dbError = { message: 'Not found' };
        queryBuilder.single.mockResolvedValue(mockQueryResult(null, dbError));
        mockFrom(queryBuilder);

        await expect(service.findOne('non-existent', ORGANIZATION_ID)).rejects.toEqual(dbError);
      });
    });

    describe('create', () => {
      it('should create fiscal year with all fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: 'new-id',
          organization_id: ORGANIZATION_ID,
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          is_active: false,
          is_closed: false,
          created_by: USER_ID,
        }));
        mockFrom(queryBuilder);

        const dto = {
          name: 'FY 2024',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          is_active: false,
        };

        const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

        expect(result.name).toBe(dto.name);
        expect(result.created_by).toBe(USER_ID);
      });
    });

    describe('update', () => {
      it('should update fiscal year fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.neq.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate

        // Use mockImplementation to handle sequential calls
        let singleCallCount = 0;
        queryBuilder.single.mockImplementation(() => {
          singleCallCount++;
          if (singleCallCount === 1) {
            return Promise.resolve(mockQueryResult(mockFiscalYear)); // findOne
          }
          return Promise.resolve(mockQueryResult({ // update result
            ...mockFiscalYear,
            name: 'Updated FY 2024',
            updated_by: USER_ID,
          }));
        });

        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(FISCAL_YEAR_ID, ORGANIZATION_ID, USER_ID, {
          name: 'Updated FY 2024',
        });

        expect(result.name).toBe('Updated FY 2024');
        expect(result.updated_by).toBe(USER_ID);
      });
    });

    describe('remove', () => {
      it('should delete fiscal year successfully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({ ...mockFiscalYear, is_active: false, is_closed: false })
        );
        mockFrom(queryBuilder);

        const result = await service.remove(FISCAL_YEAR_ID, ORGANIZATION_ID);

        expect(result).toEqual({ id: FISCAL_YEAR_ID });
        expect(queryBuilder.delete).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // AGRICULTURAL CONTEXT TESTS
  // ============================================================

  describe('Agricultural Context', () => {
    it('should support agricultural fiscal year aligned with harvest cycle', async () => {
      // Many agricultural operations use fiscal years aligned with harvest seasons
      const harvestCycles = [
        { name: 'FY 2023-2024 (Wheat)', start: '2023-06-01', end: '2024-05-31' },
        { name: 'FY 2024 (Olive Harvest)', start: '2023-10-01', end: '2024-09-30' },
        { name: 'FY 2024 (Vineyard)', start: '2023-09-01', end: '2024-08-31' },
      ];

      for (const cycle of harvestCycles) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult({
          id: `new-${cycle.name}`,
          name: cycle.name,
          start_date: cycle.start,
          end_date: cycle.end,
        }));
        mockFrom(queryBuilder);

        const dto = {
          name: cycle.name,
          start_date: cycle.start,
          end_date: cycle.end,
        };

        const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

        expect(result.name).toBe(cycle.name);
        expect(result.start_date).toBe(cycle.start);
        expect(result.end_date).toBe(cycle.end);
      }
    });

    it('should handle seasonal fiscal years for crop planning', async () => {
      // Some agricultural operations use seasonal fiscal years
      const seasonalFY = {
        name: 'Spring Planting Season 2024',
        start_date: '2024-03-01',
        end_date: '2024-08-31',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        ...seasonalFY,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = seasonalFY;

      const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

      expect(result.name).toContain('Spring');
      expect(result.start_date).toContain('03');
    });

    it('should support multi-year agricultural planning', async () => {
      // Long-term crops (like olive trees, vineyards) may use multi-year fiscal periods
      const multiYearFY = {
        name: '5-Year Development Plan 2024-2029',
        start_date: '2024-01-01',
        end_date: '2028-12-31',
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null)); // No duplicate
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult({
        id: 'new-id',
        ...multiYearFY,
      }));
      mockClient.from.mockReturnValue(queryBuilder);

      const dto = multiYearFY;

      const result = await service.create(ORGANIZATION_ID, USER_ID, dto);

      expect(result.start_date).toContain('2024');
      expect(result.end_date).toContain('2028');
    });
  });
});
