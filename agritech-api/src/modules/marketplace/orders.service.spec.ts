import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DatabaseService } from '../database/database.service';
import { CartService } from './cart.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('OrdersService - Stock Deduction', () => {
    let ordersService: OrdersService;
    let databaseService: DatabaseService;
    let cartService: CartService;
    let notificationsService: NotificationsService;

    // Mock Supabase client
    const mockSupabaseClient = {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(),
        rpc: jest.fn(),
    };

    const mockDatabaseService = {
        getClientWithAuth: jest.fn(() => mockSupabaseClient),
        getAdminClient: jest.fn(() => mockSupabaseClient),
    };

    const mockCartService = {
        getCart: jest.fn(),
        clearCart: jest.fn(),
    };

    const mockNotificationsService = {
        sendOrderConfirmationEmail: jest.fn(),
        sendNewOrderNotificationToSeller: jest.fn(),
        sendOrderStatusUpdateEmail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: CartService, useValue: mockCartService },
                { provide: NotificationsService, useValue: mockNotificationsService },
            ],
        }).compile();

        ordersService = module.get<OrdersService>(OrdersService);
        databaseService = module.get<DatabaseService>(DatabaseService);
        cartService = module.get<CartService>(CartService);
        notificationsService = module.get<NotificationsService>(NotificationsService);

        // Reset mocks before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(ordersService).toBeDefined();
    });

    describe('createOrder', () => {
        const mockToken = 'test-token';
        const mockUser = { id: 'user-123', email: 'buyer@test.com' };
        const mockUserData = { organization_id: 'org-buyer' };
        const mockOrderDto = {
            shipping_details: {
                name: 'Test User',
                address: '123 Test St',
                city: 'Casablanca',
                postal_code: '20000',
                phone: '+212600000000',
                email: 'buyer@test.com',
            },
            payment_method: 'cod',
            notes: 'Test order',
        };

        it('should deduct stock from marketplace_listings when order is created', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'cart-item-1',
                        listing_id: 'listing-1',
                        item_id: null,
                        seller_organization_id: 'org-seller',
                        title: 'Test Product',
                        quantity: 5,
                        unit_price: 100,
                        unit: 'kg',
                        image_url: 'https://test.com/image.jpg',
                    },
                ],
            };

            const mockOrder = {
                id: 'order-123',
                buyer_organization_id: 'org-buyer',
                seller_organization_id: 'org-seller',
                status: 'pending',
                total_amount: 500,
            };

            const mockOrderItem = {
                id: 'order-item-1',
                order_id: 'order-123',
                listing_id: 'listing-1',
                product_type: 'listing',
                title: 'Test Product',
                quantity: 5,
                unit_price: 100,
            };

            // Mock chain methods
            const mockSelect = jest.fn().mockReturnThis();
            const mockEq = jest.fn().mockReturnThis();
            const mockSingle = jest.fn().mockResolvedValue({ data: mockUserData, error: null });
            const mockInsert = jest.fn().mockReturnThis();
            const mockUpdate = jest.fn().mockReturnThis();
            const mockDelete = jest.fn().mockReturnThis();

            mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockCartService.getCart.mockResolvedValue(mockCart);

            // Mock from() to return different query builders for different tables
            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === 'auth_users_view') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_orders') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
                            }),
                        }),
                        delete: mockDelete,
                    };
                }
                if (table === 'marketplace_order_items') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({ data: [mockOrderItem], error: null }),
                        }),
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }
                if (table === 'organizations') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { name: 'Test Org', email: 'seller@test.com' },
                                    error: null
                                }),
                            }),
                        }),
                    };
                }
                return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete };
            });

            // Mock RPC call for stock deduction
            mockSupabaseClient.rpc.mockResolvedValue({ error: null });

            const result = await ordersService.createOrder(mockToken, mockOrderDto as any);

            expect(result).toBeDefined();
            expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('deduct_marketplace_listing_stock', {
                p_listing_id: 'listing-1',
                p_quantity: 5,
            });
        });

        it('should scope rollback deletes to buyer organization', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'cart-item-1',
                        listing_id: 'listing-1',
                        item_id: null,
                        seller_organization_id: 'org-seller',
                        title: 'Test Product',
                        quantity: 5,
                        unit_price: 100,
                        unit: 'kg',
                        image_url: 'https://test.com/image.jpg',
                    },
                ],
            };

            const mockOrder = {
                id: 'order-123',
                buyer_organization_id: 'org-buyer',
                seller_organization_id: 'org-seller',
                status: 'pending',
                total_amount: 500,
            };

            const mockSelect = jest.fn().mockReturnThis();
            const mockEq = jest.fn().mockReturnThis();
            const mockInsert = jest.fn().mockReturnThis();
            const mockUpdate = jest.fn().mockReturnThis();
            const mockDelete = jest.fn().mockReturnThis();

            const deleteQuery = {
                eq: jest.fn().mockReturnThis(),
                then: jest.fn().mockImplementation((resolve: any) =>
                    resolve({ data: null, error: null })
                ),
            };

            mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockCartService.getCart.mockResolvedValue(mockCart);

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === 'auth_users_view') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_orders') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
                            }),
                        }),
                        delete: jest.fn().mockReturnValue(deleteQuery),
                    };
                }
                if (table === 'marketplace_order_items') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({
                                data: null,
                                error: { message: 'Insert failed' },
                            }),
                        }),
                    };
                }
                return { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, eq: mockEq };
            });

            await expect(ordersService.createOrder(mockToken, mockOrderDto as any))
                .rejects.toThrow(HttpException);

            expect(deleteQuery.eq).toHaveBeenCalledWith('buyer_organization_id', mockUserData.organization_id);
        });

        it('should create stock_movement (OUT) for inventory items', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'cart-item-1',
                        listing_id: null,
                        item_id: 'item-1',
                        seller_organization_id: 'org-seller',
                        title: 'Inventory Item',
                        quantity: 10,
                        unit_price: 50,
                        unit: 'kg',
                        image_url: null,
                    },
                ],
            };

            const mockOrder = {
                id: 'order-123',
                buyer_organization_id: 'org-buyer',
                seller_organization_id: 'org-seller',
                status: 'pending',
                total_amount: 500,
            };

            const mockOrderItem = {
                id: 'order-item-1',
                order_id: 'order-123',
                item_id: 'item-1',
                product_type: 'item',
                title: 'Inventory Item',
                quantity: 10,
                unit_price: 50,
            };

            const mockStockValuation = {
                warehouse_id: 'warehouse-1',
                remaining_quantity: 50,
                cost_per_unit: 45,
                item_id: 'item-1',
            };

            const mockMovement = {
                id: 'movement-1',
                organization_id: 'org-seller',
                movement_type: 'OUT',
                item_id: 'item-1',
                quantity: -10,
            };

            mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockCartService.getCart.mockResolvedValue(mockCart);

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === 'auth_users_view') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_orders') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
                            }),
                        }),
                        delete: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }
                if (table === 'marketplace_order_items') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({ data: [mockOrderItem], error: null }),
                        }),
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }
                if (table === 'stock_valuation') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                gt: jest.fn().mockReturnValue({
                                    order: jest.fn().mockReturnValue({
                                        limit: jest.fn().mockReturnValue({
                                            single: jest.fn().mockResolvedValue({
                                                data: mockStockValuation,
                                                error: null
                                            }),
                                        }),
                                    }),
                                }),
                                single: jest.fn().mockResolvedValue({
                                    data: mockStockValuation,
                                    error: null
                                }),
                            }),
                        }),
                        update: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockResolvedValue({ error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'stock_movements') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockMovement, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'organizations') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { name: 'Test Org', email: 'seller@test.com' },
                                    error: null
                                }),
                            }),
                        }),
                    };
                }
                return {};
            });

            const result = await ordersService.createOrder(mockToken, mockOrderDto as any);

            expect(result).toBeDefined();
            // Verify stock movement was created
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('stock_movements');
        });

        it('should throw error when insufficient stock in listing', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'cart-item-1',
                        listing_id: 'listing-1',
                        item_id: null,
                        seller_organization_id: 'org-seller',
                        title: 'Test Product',
                        quantity: 100,
                        unit_price: 100,
                        unit: 'kg',
                    },
                ],
            };

            const mockOrder = {
                id: 'order-123',
                buyer_organization_id: 'org-buyer',
                seller_organization_id: 'org-seller',
                status: 'pending',
                total_amount: 10000,
            };

            const mockOrderItem = {
                id: 'order-item-1',
                order_id: 'order-123',
                listing_id: 'listing-1',
                product_type: 'listing',
                title: 'Test Product',
                quantity: 100,
                unit_price: 100,
            };

            mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockCartService.getCart.mockResolvedValue(mockCart);

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === 'auth_users_view') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_orders') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
                            }),
                        }),
                        delete: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }
                if (table === 'marketplace_order_items') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({ data: [mockOrderItem], error: null }),
                        }),
                    };
                }
                return {};
            });

            // Mock RPC call to fail with insufficient stock error
            mockSupabaseClient.rpc.mockResolvedValue({
                error: { message: 'Insufficient stock for listing' }
            });

            await expect(ordersService.createOrder(mockToken, mockOrderDto as any)).rejects.toThrow(HttpException);
        });

        it('should mark order_items as stock_deducted=true', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'cart-item-1',
                        listing_id: 'listing-1',
                        item_id: null,
                        seller_organization_id: 'org-seller',
                        title: 'Test Product',
                        quantity: 5,
                        unit_price: 100,
                        unit: 'kg',
                    },
                ],
            };

            const mockOrder = {
                id: 'order-123',
                buyer_organization_id: 'org-buyer',
                seller_organization_id: 'org-seller',
                status: 'pending',
                total_amount: 500,
            };

            const mockOrderItem = {
                id: 'order-item-1',
                order_id: 'order-123',
                listing_id: 'listing-1',
                product_type: 'listing',
                title: 'Test Product',
                quantity: 5,
                unit_price: 100,
            };

            const mockUpdate = jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockCartService.getCart.mockResolvedValue(mockCart);

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === 'auth_users_view') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_orders') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_order_items') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({ data: [mockOrderItem], error: null }),
                        }),
                        update: mockUpdate,
                    };
                }
                if (table === 'organizations') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({
                                    data: { name: 'Test Org', email: 'seller@test.com' },
                                    error: null
                                }),
                            }),
                        }),
                    };
                }
                return {};
            });

            mockSupabaseClient.rpc.mockResolvedValue({ error: null });

            await ordersService.createOrder(mockToken, mockOrderDto as any);

            expect(mockUpdate).toHaveBeenCalled();
        });

        it('should rollback order if stock deduction fails', async () => {
            const mockCart = {
                id: 'cart-123',
                items: [
                    {
                        id: 'cart-item-1',
                        listing_id: 'listing-1',
                        item_id: null,
                        seller_organization_id: 'org-seller',
                        title: 'Test Product',
                        quantity: 5,
                        unit_price: 100,
                        unit: 'kg',
                    },
                ],
            };

            const mockOrder = {
                id: 'order-123',
                buyer_organization_id: 'org-buyer',
                seller_organization_id: 'org-seller',
                status: 'pending',
                total_amount: 500,
            };

            const mockOrderItem = {
                id: 'order-item-1',
                order_id: 'order-123',
                listing_id: 'listing-1',
                product_type: 'listing',
                title: 'Test Product',
                quantity: 5,
                unit_price: 100,
            };

            const mockDelete = jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
            });

            mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
            mockCartService.getCart.mockResolvedValue(mockCart);

            mockSupabaseClient.from.mockImplementation((table: string) => {
                if (table === 'auth_users_view') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockUserData, error: null }),
                            }),
                        }),
                    };
                }
                if (table === 'marketplace_orders') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockReturnValue({
                                single: jest.fn().mockResolvedValue({ data: mockOrder, error: null }),
                            }),
                        }),
                        delete: mockDelete,
                    };
                }
                if (table === 'marketplace_order_items') {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({ data: [mockOrderItem], error: null }),
                        }),
                    };
                }
                return {};
            });

            // Mock stock deduction failure
            mockSupabaseClient.rpc.mockResolvedValue({
                error: { message: 'Stock deduction failed' }
            });

            await expect(ordersService.createOrder(mockToken, mockOrderDto as any)).rejects.toThrow(HttpException);
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
