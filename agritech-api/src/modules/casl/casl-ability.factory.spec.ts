import { Test, TestingModule } from '@nestjs/testing';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { Action } from './action.enum';
import { DatabaseService } from '../../modules/database/database.service';

describe('CaslAbilityFactory', () => {
    let caslAbilityFactory: CaslAbilityFactory;
    let databaseService: DatabaseService;

    const mockDatabaseService = {
        getAdminClient: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CaslAbilityFactory,
                { provide: DatabaseService, useValue: mockDatabaseService },
            ],
        }).compile();

        caslAbilityFactory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
        databaseService = module.get<DatabaseService>(DatabaseService);
    });

    it('should be defined', () => {
        expect(caslAbilityFactory).toBeDefined();
    });

    describe('createForUser', () => {
        it('should allow system_admin to manage all', async () => {
            const user = { id: 'user-1' };
            const organizationId = 'org-1';

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { role_id: 'role-1', roles: { name: 'system_admin' } },
                    error: null,
                }),
            };

            mockDatabaseService.getAdminClient.mockReturnValue({
                from: jest.fn().mockReturnValue(mockQueryBuilder),
            });

            const ability = await caslAbilityFactory.createForUser(user, organizationId);

            expect(ability.can(Action.Manage, 'all')).toBe(true);
        });

        it('should allow farm_manager to manage Farm and Parcel', async () => {
            const user = { id: 'user-2' };
            const organizationId = 'org-1';

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { role_id: 'role-2', roles: { name: 'farm_manager' } },
                    error: null,
                }),
            };

            mockDatabaseService.getAdminClient.mockReturnValue({
                from: jest.fn().mockReturnValue(mockQueryBuilder),
            });

            const ability = await caslAbilityFactory.createForUser(user, organizationId);

            expect(ability.can(Action.Manage, 'Farm')).toBe(true);
            expect(ability.can(Action.Manage, 'Parcel')).toBe(true);
            expect(ability.can(Action.Read, 'all')).toBe(true);
            expect(ability.can(Action.Delete, 'User')).toBe(false); // Should not be able to delete users
        });

        it('should allow viewer to read all', async () => {
            const user = { id: 'user-3' };
            const organizationId = 'org-1';

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { role_id: 'role-3', roles: { name: 'viewer' } },
                    error: null,
                }),
            };

            mockDatabaseService.getAdminClient.mockReturnValue({
                from: jest.fn().mockReturnValue(mockQueryBuilder),
            });

            const ability = await caslAbilityFactory.createForUser(user, organizationId);

            expect(ability.can(Action.Read, 'all')).toBe(true);
            expect(ability.can(Action.Create, 'Farm')).toBe(false);
        });

        it('should return empty ability if user is not in organization', async () => {
            const user = { id: 'user-4' };
            const organizationId = 'org-1';

            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' },
                }),
            };

            mockDatabaseService.getAdminClient.mockReturnValue({
                from: jest.fn().mockReturnValue(mockQueryBuilder),
            });

            const ability = await caslAbilityFactory.createForUser(user, organizationId);

            expect(ability.can(Action.Read, 'Farm')).toBe(false);
        });
    });
});
