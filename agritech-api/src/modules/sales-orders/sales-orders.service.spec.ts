import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { SalesOrderStatus } from './dto';
import { SortDirection } from '../../common/dto/paginated-query.dto';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockDatabaseService,
  mockQueryResult,
  setupThenableMock,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
  let mockSequencesService: {
    generateSalesOrderNumber: jest.Mock;
    generateInvoiceNumber: jest.Mock;
    generateJournalEntryNumber: jest.Mock;
  };
  let mockStockEntriesService: { createStockEntry: jest.Mock };
  let mockNotificationsService: { createNotificationsForUsers: jest.Mock };

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;
  const salesOrderId = 'sales-order-1';

  const createDto = {
    customer_id: 'customer-1',
    customer_name: 'Customer One',
    order_date: '2026-04-16',
    items: [
      {
        line_number: 1,
        item_name: 'Tomatoes',
        quantity: 2,
        unit_price: 100,
        discount_percentage: 10,
        tax_rate: 20,
        account_id: 'account-1',
        item_id: 'inventory-1',
        variant_id: 'variant-1',
      },
    ],
  };

  const createdOrder = {
    id: salesOrderId,
    order_number: 'SO-001',
    customer_id: createDto.customer_id,
    customer_name: createDto.customer_name,
    organization_id: organizationId,
    status: SalesOrderStatus.DRAFT,
    stock_issued: false,
    total_amount: 216,
    items: [
      {
        id: 'item-1',
        item_name: 'Tomatoes',
        quantity: 2,
        unit_price: 100,
        discount_percentage: 10,
        tax_rate: 20,
        item_id: 'inventory-1',
        variant_id: 'variant-1',
      },
    ],
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockSequencesService = {
      generateSalesOrderNumber: jest.fn().mockResolvedValue('SO-001'),
      generateInvoiceNumber: jest.fn().mockResolvedValue('INV-001'),
      generateJournalEntryNumber: jest.fn().mockResolvedValue('JE-001'),
    };
    mockStockEntriesService = {
      createStockEntry: jest.fn().mockResolvedValue({
        id: 'stock-entry-1',
        entry_number: 'SE-001',
      }),
    };
    mockNotificationsService = {
      createNotificationsForUsers: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: StockEntriesService, useValue: mockStockEntriesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<SalesOrdersService>(SalesOrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const assignTableBuilders = (builders: Record<string, MockQueryBuilder>) => {
    mockClient.from.mockImplementation((table: string) => {
      const builder = builders[table];
      if (builder) {
        return builder;
      }
      return createMockQueryBuilder();
    });
  };

  describe('create', () => {
    it('creates a sales order, items, and notifications', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const orderItemsBuilder = createMockQueryBuilder();
      const orgUsersBuilder = createMockQueryBuilder();

      salesOrdersBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ id: salesOrderId }))
        .mockResolvedValueOnce(mockQueryResult(createdOrder));
      setupThenableMock(orderItemsBuilder, null);
      setupThenableMock(orgUsersBuilder, [{ user_id: 'user-2' }, { user_id: userId }]);

      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        sales_order_items: orderItemsBuilder,
        organization_users: orgUsersBuilder,
      });

      const result = await service.create(createDto, organizationId, userId);

      expect(mockSequencesService.generateSalesOrderNumber).toHaveBeenCalledWith(organizationId);
      expect(salesOrdersBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_number: 'SO-001',
          organization_id: organizationId,
          created_by: userId,
          status: SalesOrderStatus.DRAFT,
          subtotal: 180,
          tax_amount: 36,
          total_amount: 216,
        }),
      );
      expect(orderItemsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          sales_order_id: salesOrderId,
          line_number: 1,
          discount_percent: 10,
          amount: 180,
        }),
      ]);
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['user-2'],
        organizationId,
        NotificationType.SALES_ORDER_CREATED,
        'New sales order #SO-001',
        'Sales order #SO-001 created — 216 total',
        { orderId: salesOrderId, orderNumber: 'SO-001', totalAmount: 216 },
      );
      expect(result).toEqual(createdOrder);
    });

    it('throws when order creation fails', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'insert failed' }),
      );

      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      await expect(service.create(createDto, organizationId, userId)).rejects.toThrow(
        new BadRequestException('Failed to create sales order: insert failed'),
      );
    });

    it('rolls back the order when item creation fails', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const orderItemsBuilder = createMockQueryBuilder();

      salesOrdersBuilder.single.mockResolvedValueOnce(mockQueryResult({ id: salesOrderId }));
      setupThenableMock(orderItemsBuilder, null, { message: 'item insert failed' });
      setupThenableMock(salesOrdersBuilder, null);

      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        sales_order_items: orderItemsBuilder,
      });

      await expect(service.create(createDto, organizationId, userId)).rejects.toThrow(
        new BadRequestException('Failed to create order items: item insert failed'),
      );
      expect(salesOrdersBuilder.delete).toHaveBeenCalled();
      expect(salesOrdersBuilder.eq).toHaveBeenCalledWith('id', salesOrderId);
    });
  });

  describe('findAll', () => {
    it('returns paginated sales orders with filters and sorting', async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      setupThenableMock(countBuilder, null);
      countBuilder.then.mockImplementation((resolve: (value: { data: null; error: null; count: number }) => void) => {
        const result = { data: null, error: null, count: 2 };
        resolve(result);
        return Promise.resolve(result);
      });
      setupThenableMock(dataBuilder, [createdOrder]);

      mockClient.from
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(dataBuilder);

      const result = await service.findAll(
        {
          page: 2,
          pageSize: 1,
          search: 'Customer',
          status: SalesOrderStatus.CONFIRMED,
          customer_id: createDto.customer_id,
          stock_issued: 'true',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          sortBy: 'total_amount',
          sortDir: SortDirection.ASC,
        },
        organizationId,
      );

      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(dataBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(countBuilder.or).toHaveBeenCalledWith(
        'order_number.ilike.%Customer%,customer_name.ilike.%Customer%',
      );
      expect(dataBuilder.eq).toHaveBeenCalledWith('status', SalesOrderStatus.CONFIRMED);
      expect(dataBuilder.eq).toHaveBeenCalledWith('customer_id', createDto.customer_id);
      expect(dataBuilder.eq).toHaveBeenCalledWith('stock_issued', true);
      expect(dataBuilder.gte).toHaveBeenCalledWith('order_date', '2026-04-01');
      expect(dataBuilder.lte).toHaveBeenCalledWith('order_date', '2026-04-30');
      expect(dataBuilder.order).toHaveBeenCalledWith('total_amount', { ascending: true });
      expect(dataBuilder.range).toHaveBeenCalledWith(1, 1);
      expect(result).toEqual({
        data: [createdOrder],
        total: 2,
        page: 2,
        pageSize: 1,
        totalPages: 2,
      });
    });

    it('rejects invalid organization ids', async () => {
      await expect(service.findAll({}, 'undefined')).rejects.toThrow(
        new BadRequestException('Valid organization ID is required'),
      );
    });

    it('throws when fetching data fails', async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.then.mockImplementation((resolve: (value: { data: null; error: null; count: number }) => void) => {
        const result = { data: null, error: null, count: 0 };
        resolve(result);
        return Promise.resolve(result);
      });
      dataBuilder.then.mockImplementation((resolve: (value: { data: null; error: { message: string } }) => void) => {
        const result = { data: null, error: { message: 'select failed' } };
        resolve(result);
        return Promise.resolve(result);
      });

      mockClient.from
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(dataBuilder);

      await expect(service.findAll({}, organizationId)).rejects.toThrow(
        new BadRequestException('Failed to fetch sales orders: select failed'),
      );
    });
  });

  describe('findOne', () => {
    it('returns a sales order scoped to the organization', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      salesOrdersBuilder.single.mockResolvedValue(mockQueryResult(createdOrder));
      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      const result = await service.findOne(salesOrderId, organizationId);

      expect(salesOrdersBuilder.eq).toHaveBeenCalledWith('id', salesOrderId);
      expect(salesOrdersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toEqual(createdOrder);
    });

    it('throws when the sales order is missing', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      salesOrdersBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'missing' }));
      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      await expect(service.findOne(salesOrderId, organizationId)).rejects.toThrow(
        new NotFoundException(`Sales order with ID ${salesOrderId} not found`),
      );
    });
  });

  describe('update', () => {
    it('updates a sales order and refetches it', async () => {
      const updatedOrder = { ...createdOrder, customer_name: 'Updated Customer' };
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(createdOrder)
        .mockResolvedValueOnce(updatedOrder);
      const salesOrdersBuilder = createMockQueryBuilder();
      salesOrdersBuilder.single.mockResolvedValue(mockQueryResult(updatedOrder));
      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      const result = await service.update(
        salesOrderId,
        { customer_name: 'Updated Customer' },
        organizationId,
      );

      expect(salesOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ customer_name: 'Updated Customer', updated_at: expect.any(String) }),
      );
      expect(salesOrdersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(findOneSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual(updatedOrder);
    });

    it('throws when the update query fails', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(createdOrder);
      const salesOrdersBuilder = createMockQueryBuilder();
      salesOrdersBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'update failed' }));
      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      await expect(
        service.update(salesOrderId, { customer_name: 'Updated' }, organizationId),
      ).rejects.toThrow(new BadRequestException('Failed to update sales order: update failed'));
    });
  });

  describe('updateStatus', () => {
    it('updates the status, appends notes, and notifies organization users', async () => {
      const existingOrder = {
        ...createdOrder,
        status: SalesOrderStatus.PROCESSING,
        order_number: 'SO-001',
        notes: 'Existing note',
        stock_issued: true,
      };
      const updatedOrder = {
        ...existingOrder,
        status: SalesOrderStatus.SHIPPED,
        notes: 'Existing note\n\n[shipped] Delivered to carrier',
      };
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(existingOrder)
        .mockResolvedValueOnce(updatedOrder);
      const salesOrdersBuilder = createMockQueryBuilder();
      const orgUsersBuilder = createMockQueryBuilder();
      setupThenableMock(salesOrdersBuilder, null);
      setupThenableMock(orgUsersBuilder, [{ user_id: 'user-2' }]);
      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        organization_users: orgUsersBuilder,
      });

      const result = await service.updateStatus(
        salesOrderId,
        { status: SalesOrderStatus.SHIPPED, notes: 'Delivered to carrier' },
        organizationId,
      );

      expect(salesOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SalesOrderStatus.SHIPPED,
          notes: 'Existing note\n\n[shipped] Delivered to carrier',
        }),
      );
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['user-2'],
        organizationId,
        NotificationType.SALES_ORDER_STATUS_CHANGED,
        'Sales order #SO-001 is now shipped',
        'Status updated from processing to shipped',
        {
          orderId: salesOrderId,
          orderNumber: 'SO-001',
          previousStatus: SalesOrderStatus.PROCESSING,
          newStatus: SalesOrderStatus.SHIPPED,
        },
      );
      expect(findOneSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual(updatedOrder);
    });

    it('rejects invalid transitions when stock is not issued', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: SalesOrderStatus.PROCESSING,
        stock_issued: false,
      });

      await expect(
        service.updateStatus(salesOrderId, { status: SalesOrderStatus.SHIPPED }, organizationId),
      ).rejects.toThrow(new BadRequestException('Cannot ship order: stock not issued'));
    });

    it('rejects invalid status transitions', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: SalesOrderStatus.DRAFT,
      });

      await expect(
        service.updateStatus(salesOrderId, { status: SalesOrderStatus.DELIVERED }, organizationId),
      ).rejects.toThrow(
        new BadRequestException('Invalid status transition from draft to delivered'),
      );
    });
  });

  describe('remove', () => {
    it('deletes draft sales orders only within the organization', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: SalesOrderStatus.DRAFT,
      });
      const salesOrdersBuilder = createMockQueryBuilder();
      setupThenableMock(salesOrdersBuilder, null);
      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      const result = await service.remove(salesOrderId, organizationId);

      expect(salesOrdersBuilder.delete).toHaveBeenCalled();
      expect(salesOrdersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toEqual({ message: 'Sales order deleted successfully' });
    });

    it('rejects deleting non-draft sales orders', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: SalesOrderStatus.CONFIRMED,
      });

      await expect(service.remove(salesOrderId, organizationId)).rejects.toThrow(
        new BadRequestException(
          'Only draft sales orders can be deleted. Cancel the order instead.',
        ),
      );
    });
  });

  describe('convertToInvoice', () => {
    it('creates an invoice for remaining quantities and updates item invoiced quantities', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const invoicesBuilder = createMockQueryBuilder();
      const invoiceItemsBuilder = createMockQueryBuilder();
      const salesOrderItemsBuilder = createMockQueryBuilder();

      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: SalesOrderStatus.CONFIRMED,
          items: [
            {
              id: 'item-1',
              item_name: 'Tomatoes',
              quantity: 5,
              invoiced_quantity: 2,
              unit_price: 50,
              tax_rate: 20,
              description: 'Fresh',
              unit_of_measure: 'kg',
            },
          ],
        }),
      );
      invoicesBuilder.single.mockResolvedValue(mockQueryResult({ id: 'invoice-1' }));
      setupThenableMock(invoiceItemsBuilder, null);
      setupThenableMock(salesOrderItemsBuilder, null);
      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        invoices: invoicesBuilder,
        invoice_items: invoiceItemsBuilder,
        sales_order_items: salesOrderItemsBuilder,
      });

      const result = await service.convertToInvoice(
        salesOrderId,
        { invoice_date: '2026-04-16' },
        organizationId,
        userId,
      );

      expect(mockSequencesService.generateInvoiceNumber).toHaveBeenCalledWith(organizationId, 'sales');
      expect(invoicesBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          invoice_type: 'sales',
          sales_order_id: salesOrderId,
          grand_total: 180,
          outstanding_amount: 180,
          created_by: userId,
        }),
      );
      expect(invoiceItemsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          invoice_id: 'invoice-1',
          quantity: 3,
          amount: 150,
          tax_amount: 30,
          line_total: 180,
        }),
      ]);
      expect(salesOrderItemsBuilder.update).toHaveBeenCalledWith({ invoiced_quantity: 5 });
      expect(result).toEqual({ id: 'invoice-1' });
    });

    it('rejects cancelled sales orders', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({ ...createdOrder, status: SalesOrderStatus.CANCELLED, items: [] }),
      );
      assignTableBuilders({ sales_orders: salesOrdersBuilder });

      await expect(
        service.convertToInvoice(salesOrderId, {}, organizationId, userId),
      ).rejects.toThrow(new BadRequestException('Cannot convert cancelled order to invoice'));
    });

    it('rolls back invoice creation when invoice items fail', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const invoicesBuilder = createMockQueryBuilder();
      const invoiceItemsBuilder = createMockQueryBuilder();

      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: SalesOrderStatus.CONFIRMED,
          items: [{ id: 'item-1', item_name: 'Tomatoes', quantity: 1, unit_price: 10 }],
        }),
      );
      invoicesBuilder.single.mockResolvedValue(mockQueryResult({ id: 'invoice-1' }));
      setupThenableMock(invoiceItemsBuilder, null, { message: 'items failed' });
      setupThenableMock(invoicesBuilder, null);
      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        invoices: invoicesBuilder,
        invoice_items: invoiceItemsBuilder,
      });

      await expect(
        service.convertToInvoice(salesOrderId, {}, organizationId, userId),
      ).rejects.toThrow(new BadRequestException('Failed to create invoice items: items failed'));
      expect(invoicesBuilder.delete).toHaveBeenCalled();
    });
  });

  describe('issueStock', () => {
    it('creates a material issue for stockable items and marks the order as issued', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const warehousesBuilder = createMockQueryBuilder();
      const cogsSpy = jest
        .spyOn(service as unknown as { createCOGSJournalEntry: (...args: unknown[]) => Promise<void> }, 'createCOGSJournalEntry')
        .mockResolvedValue(undefined);

      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: SalesOrderStatus.CONFIRMED,
          stock_issued: false,
          order_number: 'SO-001',
          items: [
            {
              item_id: 'inventory-1',
              variant_id: 'variant-1',
              item_name: 'Tomatoes',
              quantity: 2,
              unit_of_measure: 'kg',
            },
          ],
        }),
      );
      warehousesBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'warehouse-1', name: 'Main', is_active: true }),
      );
      setupThenableMock(salesOrdersBuilder, null);
      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        warehouses: warehousesBuilder,
      });

      const result = await service.issueStock(
        salesOrderId,
        organizationId,
        userId,
        'warehouse-1',
      );

      expect(mockStockEntriesService.createStockEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          reference_id: salesOrderId,
          from_warehouse_id: 'warehouse-1',
          created_by: userId,
          items: [
            expect.objectContaining({
              item_id: 'inventory-1',
              source_warehouse_id: 'warehouse-1',
            }),
          ],
        }),
      );
      expect(salesOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ stock_issued: true, stock_entry_id: 'stock-entry-1' }),
      );
      expect(cogsSpy).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Stock issued successfully',
        stock_entry_id: 'stock-entry-1',
        stock_entry_number: 'SE-001',
      });
    });

    it('marks non-stockable orders as issued without creating a stock entry', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const warehousesBuilder = createMockQueryBuilder();

      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: SalesOrderStatus.CONFIRMED,
          stock_issued: false,
          items: [{ item_name: 'Service fee', quantity: 1, unit_price: 50 }],
        }),
      );
      warehousesBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'warehouse-1', name: 'Main', is_active: true }),
      );
      setupThenableMock(salesOrdersBuilder, null);
      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        warehouses: warehousesBuilder,
      });

      const result = await service.issueStock(
        salesOrderId,
        organizationId,
        userId,
        'warehouse-1',
      );

      expect(mockStockEntriesService.createStockEntry).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'No stockable items in order, marked as stock issued',
        stock_entry_id: null,
      });
    });

    it('rejects issuing stock for inactive warehouses', async () => {
      const salesOrdersBuilder = createMockQueryBuilder();
      const warehousesBuilder = createMockQueryBuilder();

      salesOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: SalesOrderStatus.CONFIRMED,
          stock_issued: false,
          items: createdOrder.items,
        }),
      );
      warehousesBuilder.single.mockResolvedValue(
        mockQueryResult({ id: 'warehouse-1', name: 'Main', is_active: false }),
      );
      assignTableBuilders({
        sales_orders: salesOrdersBuilder,
        warehouses: warehousesBuilder,
      });

      await expect(
        service.issueStock(salesOrderId, organizationId, userId, 'warehouse-1'),
      ).rejects.toThrow(
        new BadRequestException('Cannot issue stock from an inactive warehouse'),
      );
    });
  });
});
