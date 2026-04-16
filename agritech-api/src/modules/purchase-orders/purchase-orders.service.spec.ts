import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { DatabaseService } from '../database/database.service';
import { SequencesService } from '../sequences/sequences.service';
import { StockEntriesService } from '../stock-entries/stock-entries.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { PurchaseOrderStatus } from './dto';
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

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: ReturnType<typeof createMockDatabaseService>;
  let mockSequencesService: {
    generatePurchaseOrderNumber: jest.Mock;
    generateInvoiceNumber: jest.Mock;
  };
  let mockStockEntriesService: { createStockEntry: jest.Mock };
  let mockNotificationsService: { createNotificationsForUsers: jest.Mock };

  const organizationId = TEST_IDS.organization;
  const userId = TEST_IDS.user;
  const purchaseOrderId = 'purchase-order-1';

  const createDto = {
    supplier_id: 'supplier-1',
    supplier_name: 'Supplier One',
    order_date: '2026-04-16',
    items: [
      {
        line_number: 1,
        item_name: 'Fertilizer',
        quantity: 4,
        unit_price: 50,
        discount_percent: 10,
        tax_rate: 20,
        account_id: 'expense-1',
        item_id: 'inventory-1',
        variant_id: 'variant-1',
      },
    ],
  };

  const createdOrder = {
    id: purchaseOrderId,
    order_number: 'PO-001',
    supplier_id: createDto.supplier_id,
    supplier_name: createDto.supplier_name,
    organization_id: organizationId,
    status: PurchaseOrderStatus.DRAFT,
    stock_received: false,
    total_amount: 216,
    items: [
      {
        id: 'po-item-1',
        item_name: 'Fertilizer',
        quantity: 4,
        unit_price: 50,
        discount_percent: 10,
        tax_rate: 20,
        item_id: 'inventory-1',
        variant_id: 'variant-1',
        account_id: 'expense-1',
      },
    ],
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = createMockDatabaseService(mockClient);
    mockSequencesService = {
      generatePurchaseOrderNumber: jest.fn().mockResolvedValue('PO-001'),
      generateInvoiceNumber: jest.fn().mockResolvedValue('BILL-001'),
    };
    mockStockEntriesService = {
      createStockEntry: jest.fn().mockResolvedValue({ id: 'stock-entry-1' }),
    };
    mockNotificationsService = {
      createNotificationsForUsers: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: StockEntriesService, useValue: mockStockEntriesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
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
    it('creates a purchase order and item rows with organization scoping', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      const orderItemsBuilder = createMockQueryBuilder();
      const orgUsersBuilder = createMockQueryBuilder();

      purchaseOrdersBuilder.single
        .mockResolvedValueOnce(mockQueryResult({ id: purchaseOrderId }))
        .mockResolvedValueOnce(mockQueryResult(createdOrder));
      setupThenableMock(orderItemsBuilder, null);
      setupThenableMock(orgUsersBuilder, [{ user_id: 'user-2' }, { user_id: userId }]);

      assignTableBuilders({
        purchase_orders: purchaseOrdersBuilder,
        purchase_order_items: orderItemsBuilder,
        organization_users: orgUsersBuilder,
      });

      const result = await service.create(createDto, organizationId, userId);

      expect(mockSequencesService.generatePurchaseOrderNumber).toHaveBeenCalledWith(organizationId);
      expect(purchaseOrdersBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          created_by: userId,
          order_number: 'PO-001',
          subtotal: 180,
          tax_amount: 36,
          total_amount: 216,
        }),
      );
      expect(orderItemsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          purchase_order_id: purchaseOrderId,
          discount_percent: 10,
          discount_amount: 20,
          tax_amount: 36,
          line_total: 216,
          inventory_item_id: 'inventory-1',
        }),
      ]);
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['user-2'],
        organizationId,
        NotificationType.PURCHASE_ORDER_CREATED,
        'New purchase order #PO-001',
        'Purchase order #PO-001 created — 216 total',
        { orderId: purchaseOrderId, orderNumber: 'PO-001', totalAmount: 216 },
      );
      expect(result).toEqual(createdOrder);
    });

    it('throws when purchase order creation fails', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'po insert failed' }),
      );
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      await expect(service.create(createDto, organizationId, userId)).rejects.toThrow(
        new BadRequestException('Failed to create purchase order: po insert failed'),
      );
    });

    it('rolls back the order when item creation fails', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      const orderItemsBuilder = createMockQueryBuilder();

      purchaseOrdersBuilder.single.mockResolvedValueOnce(mockQueryResult({ id: purchaseOrderId }));
      setupThenableMock(orderItemsBuilder, null, { message: 'po items failed' });
      setupThenableMock(purchaseOrdersBuilder, null);

      assignTableBuilders({
        purchase_orders: purchaseOrdersBuilder,
        purchase_order_items: orderItemsBuilder,
      });

      await expect(service.create(createDto, organizationId, userId)).rejects.toThrow(
        new BadRequestException('Failed to create order items: po items failed'),
      );
      expect(purchaseOrdersBuilder.delete).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('applies pagination, filters, sorting, and organization scoping', async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.then.mockImplementation((resolve: (value: { data: null; error: null; count: number }) => void) => {
        const result = { data: null, error: null, count: 3 };
        resolve(result);
        return Promise.resolve(result);
      });
      setupThenableMock(dataBuilder, [createdOrder]);

      mockClient.from
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(dataBuilder);

      const result = await service.findAll(
        {
          page: 1,
          pageSize: 2,
          search: 'Supplier',
          status: PurchaseOrderStatus.CONFIRMED,
          supplier_id: createDto.supplier_id,
          stock_received: 'true',
          dateFrom: '2026-04-01',
          dateTo: '2026-04-30',
          sortBy: 'supplier_name',
          sortDir: SortDirection.ASC,
        },
        organizationId,
      );

      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(dataBuilder.or).toHaveBeenCalledWith(
        'order_number.ilike.%Supplier%,supplier_name.ilike.%Supplier%',
      );
      expect(dataBuilder.eq).toHaveBeenCalledWith('supplier_id', createDto.supplier_id);
      expect(dataBuilder.eq).toHaveBeenCalledWith('stock_received', true);
      expect(dataBuilder.order).toHaveBeenCalledWith('supplier_name', { ascending: true });
      expect(dataBuilder.range).toHaveBeenCalledWith(0, 1);
      expect(result.totalPages).toBe(2);
      expect(result.data).toEqual([createdOrder]);
    });

    it('throws when fetch fails', async () => {
      const countBuilder = createMockQueryBuilder();
      const dataBuilder = createMockQueryBuilder();

      countBuilder.then.mockImplementation((resolve: (value: { data: null; error: null; count: number }) => void) => {
        const result = { data: null, error: null, count: 0 };
        resolve(result);
        return Promise.resolve(result);
      });
      dataBuilder.then.mockImplementation((resolve: (value: { data: null; error: { message: string } }) => void) => {
        const result = { data: null, error: { message: 'fetch failed' } };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(dataBuilder);

      await expect(service.findAll({}, organizationId)).rejects.toThrow(
        new BadRequestException('Failed to fetch purchase orders: fetch failed'),
      );
    });
  });

  describe('findOne', () => {
    it('returns a purchase order scoped to the organization', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(mockQueryResult(createdOrder));
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      const result = await service.findOne(purchaseOrderId, organizationId);

      expect(purchaseOrdersBuilder.eq).toHaveBeenCalledWith('id', purchaseOrderId);
      expect(purchaseOrdersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toEqual(createdOrder);
    });

    it('throws when the purchase order does not exist', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'missing' }));
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      await expect(service.findOne(purchaseOrderId, organizationId)).rejects.toThrow(
        new NotFoundException(`Purchase order with ID ${purchaseOrderId} not found`),
      );
    });
  });

  describe('createMaterialReceipt', () => {
    it('creates a material receipt for stockable items and updates the order', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: purchaseOrderId,
          order_number: 'PO-001',
          purchase_order_items: [
            {
              item_id: 'inventory-1',
              variant_id: 'variant-1',
              item_name: 'Fertilizer',
              quantity: 2,
              unit_of_measure: 'kg',
              unit_price: 30,
            },
          ],
        }),
      );
      setupThenableMock(purchaseOrdersBuilder, null);
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      const result = await service.createMaterialReceipt(
        purchaseOrderId,
        organizationId,
        userId,
        { warehouse_id: 'warehouse-1', receipt_date: '2026-04-16' },
      );

      expect(mockStockEntriesService.createStockEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          to_warehouse_id: 'warehouse-1',
          reference_id: purchaseOrderId,
          created_by: userId,
        }),
      );
      expect(purchaseOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          stock_entry_id: 'stock-entry-1',
          stock_received: true,
          stock_received_date: '2026-04-16',
        }),
      );
      expect(result).toEqual({ stock_entry_id: 'stock-entry-1' });
    });

    it('rejects orders without stockable items', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({ id: purchaseOrderId, purchase_order_items: [{ item_name: 'Service' }] }),
      );
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      await expect(
        service.createMaterialReceipt(purchaseOrderId, organizationId, userId, {
          warehouse_id: 'warehouse-1',
          receipt_date: '2026-04-16',
        }),
      ).rejects.toThrow(new BadRequestException('Purchase order has no stockable items'));
    });

    it('throws when the order update fails', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: purchaseOrderId,
          order_number: 'PO-001',
          purchase_order_items: [
            { item_id: 'inventory-1', item_name: 'Fertilizer', quantity: 1, unit_price: 10 },
          ],
        }),
      );
      setupThenableMock(purchaseOrdersBuilder, null, { message: 'update failed' });
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      await expect(
        service.createMaterialReceipt(purchaseOrderId, organizationId, userId, {
          warehouse_id: 'warehouse-1',
          receipt_date: '2026-04-16',
        }),
      ).rejects.toThrow(
        new BadRequestException('Failed to update purchase order: update failed'),
      );
    });
  });

  describe('update', () => {
    it('updates and refetches the purchase order', async () => {
      const updatedOrder = { ...createdOrder, supplier_name: 'Updated Supplier' };
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(createdOrder)
        .mockResolvedValueOnce(updatedOrder);
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(mockQueryResult(updatedOrder));
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      const result = await service.update(
        purchaseOrderId,
        { supplier_name: 'Updated Supplier' },
        organizationId,
      );

      expect(purchaseOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ supplier_name: 'Updated Supplier', updated_at: expect.any(String) }),
      );
      expect(findOneSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual(updatedOrder);
    });

    it('throws when update fails', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(createdOrder);
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'update failed' }));
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      await expect(
        service.update(purchaseOrderId, { supplier_name: 'Updated' }, organizationId),
      ).rejects.toThrow(
        new BadRequestException('Failed to update purchase order: update failed'),
      );
    });
  });

  describe('updateStatus', () => {
    it('updates status, appends notes, and sends notifications', async () => {
      const existingOrder = {
        ...createdOrder,
        status: PurchaseOrderStatus.RECEIVING,
        stock_received: true,
        notes: 'Existing note',
      };
      const updatedOrder = {
        ...existingOrder,
        status: PurchaseOrderStatus.RECEIVED,
        notes: 'Existing note\n\n[received] Goods checked',
      };
      const findOneSpy = jest
        .spyOn(service, 'findOne')
        .mockResolvedValueOnce(existingOrder)
        .mockResolvedValueOnce(updatedOrder);
      const purchaseOrdersBuilder = createMockQueryBuilder();
      const orgUsersBuilder = createMockQueryBuilder();
      setupThenableMock(purchaseOrdersBuilder, null);
      setupThenableMock(orgUsersBuilder, [{ user_id: 'user-2' }]);
      assignTableBuilders({
        purchase_orders: purchaseOrdersBuilder,
        organization_users: orgUsersBuilder,
      });

      const result = await service.updateStatus(
        purchaseOrderId,
        { status: PurchaseOrderStatus.RECEIVED, notes: 'Goods checked' },
        organizationId,
      );

      expect(purchaseOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PurchaseOrderStatus.RECEIVED,
          notes: 'Existing note\n\n[received] Goods checked',
        }),
      );
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['user-2'],
        organizationId,
        NotificationType.PURCHASE_ORDER_STATUS_CHANGED,
        'Purchase order #PO-001 is now received',
        'Status updated from receiving to received',
        {
          orderId: purchaseOrderId,
          orderNumber: 'PO-001',
          previousStatus: PurchaseOrderStatus.RECEIVING,
          newStatus: PurchaseOrderStatus.RECEIVED,
        },
      );
      expect(result).toEqual(updatedOrder);
      expect(findOneSpy).toHaveBeenCalledTimes(2);
    });

    it('rejects received status when stock was not received', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: PurchaseOrderStatus.RECEIVING,
        stock_received: false,
      });

      await expect(
        service.updateStatus(
          purchaseOrderId,
          { status: PurchaseOrderStatus.RECEIVED },
          organizationId,
        ),
      ).rejects.toThrow(new BadRequestException('Cannot mark as received: stock not received yet'));
    });

    it('rejects invalid transitions', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: PurchaseOrderStatus.DRAFT,
      });

      await expect(
        service.updateStatus(
          purchaseOrderId,
          { status: PurchaseOrderStatus.RECEIVED },
          organizationId,
        ),
      ).rejects.toThrow(
        new BadRequestException('Invalid status transition from draft to received'),
      );
    });
  });

  describe('remove', () => {
    it('deletes draft purchase orders only', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: PurchaseOrderStatus.DRAFT,
      });
      const purchaseOrdersBuilder = createMockQueryBuilder();
      setupThenableMock(purchaseOrdersBuilder, null);
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      const result = await service.remove(purchaseOrderId, organizationId);

      expect(purchaseOrdersBuilder.eq).toHaveBeenCalledWith('organization_id', organizationId);
      expect(result).toEqual({ message: 'Purchase order deleted successfully' });
    });

    it('rejects deleting non-draft purchase orders', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        ...createdOrder,
        status: PurchaseOrderStatus.CONFIRMED,
      });

      await expect(service.remove(purchaseOrderId, organizationId)).rejects.toThrow(
        new BadRequestException(
          'Only draft purchase orders can be deleted. Cancel the order instead.',
        ),
      );
    });
  });

  describe('convertToBill', () => {
    it('creates a purchase invoice and updates billed amounts', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      const invoicesBuilder = createMockQueryBuilder();
      const invoiceItemsBuilder = createMockQueryBuilder();
      const purchaseOrderItemsBuilder = createMockQueryBuilder();

      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: PurchaseOrderStatus.CONFIRMED,
          billed_amount: 0,
          total_amount: 216,
          items: [
            {
              id: 'po-item-1',
              item_name: 'Fertilizer',
              quantity: 4,
              billed_quantity: 1,
              unit_price: 50,
              tax_rate: 20,
              account_id: 'expense-1',
              item_id: 'inventory-1',
              variant_id: 'variant-1',
            },
          ],
        }),
      );
      invoicesBuilder.single.mockResolvedValue(mockQueryResult({ id: 'bill-1' }));
      setupThenableMock(invoiceItemsBuilder, null);
      setupThenableMock(purchaseOrdersBuilder, null);
      setupThenableMock(purchaseOrderItemsBuilder, null);
      assignTableBuilders({
        purchase_orders: purchaseOrdersBuilder,
        invoices: invoicesBuilder,
        invoice_items: invoiceItemsBuilder,
        purchase_order_items: purchaseOrderItemsBuilder,
      });

      const result = await service.convertToBill(
        purchaseOrderId,
        { invoice_date: '2026-04-16' },
        organizationId,
        userId,
      );

      expect(mockSequencesService.generateInvoiceNumber).toHaveBeenCalledWith(organizationId, 'purchase');
      expect(invoicesBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: organizationId,
          invoice_type: 'purchase',
          purchase_order_id: purchaseOrderId,
          grand_total: 180,
          outstanding_amount: 180,
          created_by: userId,
        }),
      );
      expect(invoiceItemsBuilder.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          invoice_id: 'bill-1',
          quantity: 3,
          amount: 150,
          tax_amount: 30,
          line_total: 180,
          expense_account_id: 'expense-1',
        }),
      ]);
      expect(purchaseOrdersBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ billed_amount: 180, outstanding_amount: 36, status: 'partially_billed' }),
      );
      expect(purchaseOrderItemsBuilder.update).toHaveBeenCalledWith({ billed_quantity: 4 });
      expect(result).toEqual({ id: 'bill-1' });
    });

    it('rejects cancelled purchase orders', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({ ...createdOrder, status: PurchaseOrderStatus.CANCELLED, items: [] }),
      );
      assignTableBuilders({ purchase_orders: purchaseOrdersBuilder });

      await expect(
        service.convertToBill(purchaseOrderId, {}, organizationId, userId),
      ).rejects.toThrow(new BadRequestException('Cannot convert cancelled order to bill'));
    });

    it('rolls back bill creation when bill items fail', async () => {
      const purchaseOrdersBuilder = createMockQueryBuilder();
      const invoicesBuilder = createMockQueryBuilder();
      const invoiceItemsBuilder = createMockQueryBuilder();

      purchaseOrdersBuilder.single.mockResolvedValue(
        mockQueryResult({
          ...createdOrder,
          status: PurchaseOrderStatus.CONFIRMED,
          items: [{ id: 'po-item-1', item_name: 'Fertilizer', quantity: 1, unit_price: 10 }],
        }),
      );
      invoicesBuilder.single.mockResolvedValue(mockQueryResult({ id: 'bill-1' }));
      setupThenableMock(invoiceItemsBuilder, null, { message: 'bill items failed' });
      setupThenableMock(invoicesBuilder, null);
      assignTableBuilders({
        purchase_orders: purchaseOrdersBuilder,
        invoices: invoicesBuilder,
        invoice_items: invoiceItemsBuilder,
      });

      await expect(
        service.convertToBill(purchaseOrderId, {}, organizationId, userId),
      ).rejects.toThrow(new BadRequestException('Failed to create bill items: bill items failed'));
      expect(invoicesBuilder.delete).toHaveBeenCalled();
    });
  });
});
