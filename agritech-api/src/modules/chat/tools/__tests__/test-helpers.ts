import { HarvestsService } from '../../../harvests/harvests.service';
import { ProductApplicationsService } from '../../../product-applications/product-applications.service';
import { ParcelEventsService } from '../../../parcel-events/parcel-events.service';
import { StockEntriesService } from '../../../stock-entries/stock-entries.service';
import { TaskAssignmentsService } from '../../../task-assignments/task-assignments.service';

/**
 * Returns mock providers for all services injected into ChatToolsService.
 * Use in test module providers array.
 */
export function getChatToolsServiceMockProviders() {
  return [
    {
      provide: HarvestsService,
      useValue: { create: jest.fn().mockResolvedValue({ id: 'harvest-id' }) },
    },
    {
      provide: ProductApplicationsService,
      useValue: { createProductApplication: jest.fn().mockResolvedValue({ id: 'app-id' }) },
    },
    {
      provide: ParcelEventsService,
      useValue: { createEvent: jest.fn().mockResolvedValue({ id: 'event-id' }) },
    },
    {
      provide: StockEntriesService,
      useValue: { createStockEntry: jest.fn().mockResolvedValue({ id: 'stock-entry-id' }) },
    },
    {
      provide: TaskAssignmentsService,
      useValue: { createAssignment: jest.fn().mockResolvedValue({ id: 'assignment-id' }) },
    },
  ];
}
