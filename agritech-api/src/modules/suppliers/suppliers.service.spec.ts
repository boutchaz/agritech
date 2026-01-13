import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_SUPPLIER_TYPES = ['seeds', 'fertilizer', 'equipment', 'general', 'transport'];
  const VALID_CURRENCIES = ['MAD', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

  const MOCK_SUPPLIERS = [
    {
      id: 'sup1',
      organization_id: TEST_IDS.organization,
      name: 'AgriSeed Corp',
      supplier_code: 'SEED-001',
      contact_person: 'Ahmed Benali',
      email: 'ahmed@agriseed.ma',
      phone: '+212-500-000001',
      mobile: '+212-600-000001',
      address: '123 Industrial Zone',
      city: 'Casablanca',
      state_province: 'Casablanca-Settat',
      postal_code: '20000',
      country: 'Morocco',
      website: 'https://agriseed.ma',
      tax_id: '12345678',
      payment_terms: 'NET 30',
      currency_code: 'MAD',
      supplier_type: 'seeds',
      assigned_to: TEST_IDS.user,
      notes: 'Premium seed supplier',
      is_active: true,
      created_by: TEST_IDS.user,
    },
    {
      id: 'sup2',
      organization_id: TEST_IDS.organization,
      name: 'FertTech Solutions',
      supplier_code: 'FERT-001',
      contact_person: 'Fatima Zahra',
      email: 'contact@ferttech.com',
      phone: '+212-500-000002',
      supplier_type: 'fertilizer',
      is_active: true,
      created_by: TEST_IDS.user,
    },
  ];

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
        SuppliersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - SUPPLIER TYPES AND CURRENCIES
  // ============================================================

  describe('Supplier Types and Currencies (Parameterized)', () => {
    it.each(VALID_SUPPLIER_TYPES)(
      'should create supplier with type: %s',
      async (supplierType) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            supplier_type: supplierType,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            supplier_type: supplierType as any,
          },
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.supplier_type).toBe(supplierType);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            supplier_type: supplierType,
          })
        );
      }
    );

    it.each(VALID_CURRENCIES)(
      'should create supplier with currency: %s',
      async (currency) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            currency_code: currency,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            currency_code: currency,
          },
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.currency_code).toBe(currency);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('findAll', () => {
      it.each([null, undefined, '', '   ', '\t\n'])(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.then.mockResolvedValue(mockQueryResult([]));
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.findAll(orgId as any);

          expect(result).toEqual([]);
        }
      );

      it('should handle invalid filter values gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          name: '',
          supplier_code: '',
          supplier_type: '' as any,
          is_active: true,
        });

        expect(result).toBeDefined();
      });

      it('should handle database error on fetch', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(
          mockQueryResult(null, { message: 'Database connection failed' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(Error);
        await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(
          'Failed to fetch suppliers'
        );
      });
    });

    describe('findOne', () => {
      it.each([null, undefined, '', 'invalid-uuid', 'non-existent'])(
        'should handle invalid supplier ID: %s',
        async (supplierId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Not found' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(service.findOne(supplierId as any, TEST_IDS.organization)).rejects.toThrow(
            NotFoundException
          );
        }
      );

      it('should throw NotFoundException when supplier not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.findOne('non-existent', TEST_IDS.organization)).rejects.toThrow(
          NotFoundException
        );
        await expect(service.findOne('non-existent', TEST_IDS.organization)).rejects.toThrow(
          'Supplier with ID non-existent not found'
        );
      });
    });

    describe('create', () => {
      it.each([
        { name: '', expected: 'name is required' },
        { name: '   ', expected: 'name cannot be empty' },
        { name: null, expected: 'name cannot be null' },
        { name: undefined, expected: 'name is required' },
      ])('should reject invalid supplier name: $expected', async ({ name }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Name is required' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create({ name: name as any } as any, TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(Error);
      });

      it('should reject invalid email format', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Invalid email' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create(
            {
              name: 'Test Supplier',
              email: 'invalid-email',
            } as any,
            TEST_IDS.organization,
            TEST_IDS.user
          )
        ).rejects.toThrow(Error);
      });

      it('should require userId for creation', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            created_by: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          { name: 'Test Supplier' } as any,
          TEST_IDS.organization,
          null as any
        );

        expect(result.created_by).toBeNull();
      });
    });

    describe('update', () => {
      it('should reject update of non-existent supplier', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('non-existent', { name: 'Updated' }, TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });

      it('should reject invalid phone number format', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_SUPPLIERS[0]))
          .mockResolvedValueOnce(
            mockQueryResult(null, { message: 'Invalid phone format' })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('sup1', { phone: 'invalid-phone' }, TEST_IDS.organization)
        ).rejects.toThrow(Error);
      });
    });

    describe('delete', () => {
      it('should reject deletion of non-existent supplier', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.delete('non-existent', TEST_IDS.organization)).rejects.toThrow(
          NotFoundException
        );
      });
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - CRUD Operations', () => {
    describe('findAll', () => {
      it('should return only active suppliers by default', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result).toEqual(MOCK_SUPPLIERS);
        expect(mockClient.from).toHaveBeenCalledWith('suppliers');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
        expect(queryBuilder.order).toHaveBeenCalledWith('name', { ascending: true });
      });

      it('should return all suppliers when is_active is explicitly set to false', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([
          ...MOCK_SUPPLIERS,
          { ...MOCK_SUPPLIERS[0], id: 'sup3', is_active: false },
        ]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, { is_active: false });

        expect(result.length).toBeGreaterThan(0);
        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', false);
      });

      it('should return empty array when no suppliers exist', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization);

        expect(result).toEqual([]);
      });
    });

    describe('findAll with Filters', () => {
      it('should filter suppliers by name (case insensitive)', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_SUPPLIERS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          name: 'AgriSeed',
        });

        expect(result).toEqual([MOCK_SUPPLIERS[0]]);
        expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%AgriSeed%');
      });

      it('should filter suppliers by supplier_code', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_SUPPLIERS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          supplier_code: 'SEED-001',
        });

        expect(result).toEqual([MOCK_SUPPLIERS[0]]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('supplier_code', 'SEED-001');
      });

      it('should filter suppliers by supplier_type', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_SUPPLIERS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          supplier_type: 'seeds',
        });

        expect(result).toEqual([MOCK_SUPPLIERS[0]]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('supplier_type', 'seeds');
      });

      it('should filter suppliers by assigned_to', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_SUPPLIERS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          assigned_to: TEST_IDS.user,
        });

        expect(result).toEqual([MOCK_SUPPLIERS[0]]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('assigned_to', TEST_IDS.user);
      });

      it('should apply multiple filters simultaneously', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.ilike.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult([MOCK_SUPPLIERS[0]]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findAll(TEST_IDS.organization, {
          name: 'AgriSeed',
          supplier_type: 'seeds',
          is_active: true,
        });

        expect(result).toEqual([MOCK_SUPPLIERS[0]]);
        expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%AgriSeed%');
        expect(queryBuilder.eq).toHaveBeenCalledWith('supplier_type', 'seeds');
        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
      });
    });

    describe('findOne', () => {
      it('should return supplier by ID with organization context', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne('sup1', TEST_IDS.organization);

        expect(result).toEqual(MOCK_SUPPLIERS[0]);
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'sup1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });
    });

    describe('create', () => {
      it('should create supplier with all optional fields', async () => {
        const newSupplier = {
          name: 'New Supplier',
          supplier_code: 'NEW-001',
          contact_person: 'John Doe',
          email: 'john@newsupplier.com',
          phone: '+212-500-000003',
          mobile: '+212-600-000003',
          address: '456 Business Park',
          city: 'Rabat',
          state_province: 'Rabat-Salé-Kénitra',
          postal_code: '10000',
          country: 'Morocco',
          website: 'https://newsupplier.com',
          tax_id: '87654321',
          payment_terms: 'NET 45',
          currency_code: 'MAD',
          supplier_type: 'equipment',
          assigned_to: TEST_IDS.user,
          notes: 'Test supplier',
          is_active: true,
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup3',
            organization_id: TEST_IDS.organization,
            ...newSupplier,
            created_by: TEST_IDS.user,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          newSupplier as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.name).toBe(newSupplier.name);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            organization_id: TEST_IDS.organization,
            name: newSupplier.name,
            supplier_code: newSupplier.supplier_code,
            contact_person: newSupplier.contact_person,
            email: newSupplier.email,
            phone: newSupplier.phone,
            mobile: newSupplier.mobile,
            address: newSupplier.address,
            city: newSupplier.city,
            state_province: newSupplier.state_province,
            postal_code: newSupplier.postal_code,
            country: newSupplier.country,
            website: newSupplier.website,
            tax_id: newSupplier.tax_id,
            payment_terms: newSupplier.payment_terms,
            currency_code: newSupplier.currency_code,
            supplier_type: newSupplier.supplier_type,
            assigned_to: newSupplier.assigned_to,
            notes: newSupplier.notes,
            is_active: newSupplier.is_active,
            created_by: TEST_IDS.user,
          })
        );
      });

      it('should create supplier with only required fields', async () => {
        const newSupplier = {
          name: 'Minimal Supplier',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup3',
            organization_id: TEST_IDS.organization,
            name: 'Minimal Supplier',
            supplier_code: null,
            contact_person: null,
            email: null,
            phone: null,
            mobile: null,
            address: null,
            city: null,
            state_province: null,
            postal_code: null,
            country: null,
            website: null,
            tax_id: null,
            payment_terms: null,
            currency_code: null,
            supplier_type: null,
            assigned_to: null,
            notes: null,
            is_active: true,
            created_by: TEST_IDS.user,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          newSupplier as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.name).toBe('Minimal Supplier');
        expect(result.is_active).toBe(true);
        expect(queryBuilder.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Minimal Supplier',
            is_active: true,
            created_by: TEST_IDS.user,
          })
        );
      });

      it('should handle database error on create', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Duplicate key violation' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.create({ name: 'Duplicate' } as any, TEST_IDS.organization, TEST_IDS.user)
        ).rejects.toThrow(Error);
      });
    });

    describe('update', () => {
      it('should update supplier with partial data', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_SUPPLIERS[0]))
          .mockResolvedValueOnce(
            mockQueryResult({
              ...MOCK_SUPPLIERS[0],
              name: 'Updated Supplier',
              email: 'updated@email.com',
            })
          );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.update(
          'sup1',
          {
            name: 'Updated Supplier',
            email: 'updated@email.com',
          },
          TEST_IDS.organization
        );

        expect(result.name).toBe('Updated Supplier');
        expect(result.email).toBe('updated@email.com');
        expect(queryBuilder.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Supplier',
            email: 'updated@email.com',
          })
        );
      });

      it('should verify supplier exists before update', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.update('sup1', { name: 'Updated' }, TEST_IDS.organization);

        expect(queryBuilder.single).toHaveBeenCalledTimes(2); // Once for verification, once for update
      });

      it('should handle database error on update', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_SUPPLIERS[0]))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Update failed' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.update('sup1', { name: 'Updated' }, TEST_IDS.organization)
        ).rejects.toThrow(Error);
      });
    });

    describe('delete', () => {
      it('should soft delete supplier (set is_active to false)', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.delete('sup1', TEST_IDS.organization);

        expect(result).toEqual({ message: 'Supplier deleted successfully' });
        expect(queryBuilder.update).toHaveBeenCalledWith({
          is_active: false,
        });
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'sup1');
        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should verify supplier exists before deletion', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.delete('sup1', TEST_IDS.organization);

        expect(queryBuilder.single).toHaveBeenCalled(); // Verification call
      });

      it('should handle database error on delete', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single
          .mockResolvedValueOnce(mockQueryResult(MOCK_SUPPLIERS[0]))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Delete failed' }))
          .mockResolvedValueOnce(mockQueryResult(null, { message: 'Delete failed' }));
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(service.delete('sup1', TEST_IDS.organization)).rejects.toThrow(Error);
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Organization Context', () => {
      it('should enforce organization context in findAll', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findAll(TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should enforce organization context in findOne', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.findOne('sup1', TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should enforce organization context in update', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.update('sup1', { name: 'Updated' }, TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });

      it('should enforce organization context in delete', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS[0]));
        mockClient.from.mockReturnValue(queryBuilder);

        await service.delete('sup1', TEST_IDS.organization);

        expect(queryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      });
    });

    describe('Contact Information', () => {
      it.each([
        { email: 'test@example.com', valid: true },
        { email: 'test.user@example.co.uk', valid: true },
        { email: 'test+tag@example.com', valid: true },
        { email: 'invalid-email', valid: false },
        { email: '@example.com', valid: false },
        { email: 'test@', valid: false },
      ])('should handle email: $email', async ({ email }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            email: email,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            email: email,
          } as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.email).toBe(email);
      });

      it.each([
        { phone: '+212-600-000000', format: 'Moroccan' },
        { phone: '+1-555-123-4567', format: 'US' },
        { phone: '+33-1-23-45-67-89', format: 'French' },
        { phone: '+44-20-1234-5678', format: 'UK' },
      ])('should handle $format phone number format', async ({ phone }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            phone: phone,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            phone: phone,
          } as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.phone).toBe(phone);
      });
    });

    describe('Special Characters in Names', () => {
      it.each([
        { name: "Côte d'Ivoire Suppliers", desc: 'French accents' },
        { name: 'São Paulo Agro', desc: 'Portuguese tilde' },
        { name: 'Москва Агро', desc: 'Cyrillic characters' },
        { name: 'المورد الزراعي', desc: 'Arabic characters' },
        { name: '東京サプライヤー', desc: 'Japanese characters' },
        { name: "O'Connor & Sons", desc: 'Apostrophe' },
        { name: 'Mueller-Meyer AG', desc: 'Hyphen' },
      ])('should handle $desc in supplier name', async ({ name }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: name,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          { name } as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.name).toBe(name);
      });
    });

    describe('Payment Terms', () => {
      it.each([
        'NET 30',
        'NET 45',
        'NET 60',
        'COD',
        'Advance',
        '30 Days EOM',
        '2/10 NET 30',
      ])('should handle payment terms: %s', async (paymentTerms) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            payment_terms: paymentTerms,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            payment_terms: paymentTerms,
          } as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.payment_terms).toBe(paymentTerms);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous fetch requests', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS));
        mockClient.from.mockReturnValue(queryBuilder);

        const promises = [
          service.findAll(TEST_IDS.organization),
          service.findAll(TEST_IDS.organization),
          service.findAll(TEST_IDS.organization),
        ];

        const results = await Promise.all(promises);

        results.forEach((result) => {
          expect(result).toEqual(MOCK_SUPPLIERS);
        });
      });
    });

    describe('Null and Undefined Handling', () => {
      it('should handle null optional fields in create', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            email: null,
            phone: null,
            supplier_code: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            email: null,
            phone: null,
            supplier_code: null,
          } as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.email).toBeNull();
        expect(result.phone).toBeNull();
        expect(result.supplier_code).toBeNull();
      });

      it('should handle undefined optional fields in create', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: 'sup-new',
            organization_id: TEST_IDS.organization,
            name: 'Test Supplier',
            website: null,
            tax_id: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.create(
          {
            name: 'Test Supplier',
            website: undefined,
            tax_id: undefined,
          } as any,
          TEST_IDS.organization,
          TEST_IDS.user
        );

        expect(result.website).toBeNull();
        expect(result.tax_id).toBeNull();
      });
    });
  });

  // ============================================================
  // INTEGRATION-LIKE TESTS
  // ============================================================

  describe('Integration Scenarios', () => {
    it('should support full supplier lifecycle', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(queryBuilder);
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single
        .mockResolvedValueOnce(mockQueryResult({
          id: 'sup-new',
          organization_id: TEST_IDS.organization,
          name: 'New Supplier',
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'sup-new',
          organization_id: TEST_IDS.organization,
          name: 'New Supplier',
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'sup-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Supplier',
          email: 'updated@email.com',
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'sup-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Supplier',
          email: 'updated@email.com',
          is_active: true,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'sup-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Supplier',
          email: 'updated@email.com',
          is_active: false,
        }))
        .mockResolvedValueOnce(mockQueryResult({
          id: 'sup-new',
          organization_id: TEST_IDS.organization,
          name: 'Updated Supplier',
          email: 'updated@email.com',
          is_active: false,
        }));
      mockClient.from.mockReturnValue(queryBuilder);

      // Create
      const created = await service.create(
        { name: 'New Supplier' } as any,
        TEST_IDS.organization,
        TEST_IDS.user
      );
      expect(created.name).toBe('New Supplier');

      // Read
      const found = await service.findOne('sup-new', TEST_IDS.organization);
      expect(found.name).toBe('New Supplier');

      // Update
      const updated = await service.update(
        'sup-new',
        {
          name: 'Updated Supplier',
          email: 'updated@email.com',
        },
        TEST_IDS.organization
      );
      expect(updated.name).toBe('Updated Supplier');

      // Delete (soft delete)
      const deleted = await service.delete('sup-new', TEST_IDS.organization);
      expect(deleted.message).toBe('Supplier deleted successfully');
    });

    it('should handle filtering suppliers by different criteria', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.ilike.mockReturnValue(queryBuilder);
      queryBuilder.then.mockResolvedValue(mockQueryResult(MOCK_SUPPLIERS));
      mockClient.from.mockReturnValue(queryBuilder);

      // Filter by name
      const byName = await service.findAll(TEST_IDS.organization, {
        name: 'AgriSeed',
      });
      expect(byName).toBeDefined();

      // Filter by type
      const byType = await service.findAll(TEST_IDS.organization, {
        supplier_type: 'seeds',
      });
      expect(byType).toBeDefined();

      // Filter by assigned user
      const byUser = await service.findAll(TEST_IDS.organization, {
        assigned_to: TEST_IDS.user,
      });
      expect(byUser).toBeDefined();
    });
  });
});
