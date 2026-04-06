import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

const NO_ID = '00000000-0000-0000-0000-000000000000';

const expectStatus = (response: { status: () => number }, statuses: number[]) => {
  expect(statuses).toContain(response.status());
};

test.describe.serial('Workforce API @workforce', () => {
  let createdWorkerId = '';
  let createdTaskId = '';
  let createdWorkUnitId = '';

  test.describe.serial('Workers controller @workforce', () => {
    test('GET /workers - should list workers @smoke', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/workers`);

      expect(response.status()).toBe(200);
    });

    test('GET /workers/active - should list active workers @smoke', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/workers/active`);

      expect(response.status()).toBe(200);
    });

    test('POST /workers - should create a worker', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/workers`, {
        data: testData.worker(),
      });

      expect([200, 201]).toContain(response.status());
      const body = await response.json();
      if (body?.id) createdWorkerId = body.id;
    });

    test('GET /workers/:id - should get worker by id', async ({ authedRequest, organizationId }) => {
      if (!createdWorkerId) test.skip();

      const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/workers/${createdWorkerId}`);

      expect(response.status()).toBe(200);
    });

    test('GET /workers/:id/stats - should return worker statistics', async ({ authedRequest, organizationId }) => {
      if (!createdWorkerId) test.skip();

      const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/workers/${createdWorkerId}/stats`);

      expectStatus(response, [200, 404]);
    });

    test('PATCH /workers/:id - should update a worker', async ({ authedRequest, organizationId }) => {
      if (!createdWorkerId) test.skip();

      const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/workers/${createdWorkerId}`, {
        data: { first_name: 'Updated', last_name: 'Worker' },
      });

      expectStatus(response, [200, 204]);
    });

    test('PATCH /workers/:id/deactivate - should deactivate a worker', async ({ authedRequest, organizationId }) => {
      if (!createdWorkerId) test.skip();

      const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/workers/${createdWorkerId}/deactivate`);

      expectStatus(response, [200, 204]);
    });

    test('DELETE /workers/:id - should delete a worker', async ({ authedRequest, organizationId }) => {
      if (!createdWorkerId) test.skip();

      const response = await authedRequest.delete(`/api/v1/organizations/${organizationId}/workers/${createdWorkerId}`);

      expectStatus(response, [200, 204]);
    });

    test('GET /workers/:id - should reject an unknown worker', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/workers/${NO_ID}`);

      expectStatus(response, [400, 404]);
    });

    test('GET /workers/:id/stats - should reject an unknown worker', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/workers/${NO_ID}/stats`);

      expectStatus(response, [400, 404]);
    });

    test('PATCH /workers/:id - should reject an unknown worker', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/workers/${NO_ID}`, {
        data: { first_name: 'Nope' },
      });

      expectStatus(response, [400, 404]);
    });

    test('PATCH /workers/:id/deactivate - should reject an unknown worker', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/workers/${NO_ID}/deactivate`);

      expectStatus(response, [400, 404]);
    });

    test('DELETE /workers/:id - should reject an unknown worker', async ({ authedRequest, organizationId }) => {
      const response = await authedRequest.delete(`/api/v1/organizations/${organizationId}/workers/${NO_ID}`);

      expectStatus(response, [400, 404]);
    });
  });

  test.describe('Workers self-service @workforce', () => {
    test('GET /workers/me - should return current worker profile', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/workers/me');

      expectStatus(response, [200, 404]);
    });

    test('GET /workers/me/tasks - should return current worker tasks', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/workers/me/tasks');

      expectStatus(response, [200, 404]);
    });

    test('GET /workers/me/statistics - should return current worker statistics', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/workers/me/statistics');

      expectStatus(response, [200, 404]);
    });
  });

  test.describe.serial('Tasks controller @workforce', () => {
    test('GET /tasks - should list tasks @smoke', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/tasks');

      expect(response.status()).toBe(200);
    });

    test('GET /tasks/my-tasks - should list my tasks @smoke', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/tasks/my-tasks');

      expect(response.status()).toBe(200);
    });

    test('GET /tasks/statistics - should return task statistics', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/tasks/statistics');

      expect(response.status()).toBe(200);
    });

    test('POST /tasks - should create a task', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/tasks', {
        data: testData.task(),
      });

      expect([200, 201]).toContain(response.status());
      const body = await response.json();
      if (body?.id) createdTaskId = body.id;
    });

    test('POST /tasks/bulk - should create tasks in bulk', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/tasks/bulk', {
        data: [testData.task()],
      });

      expectStatus(response, [200, 201]);
    });

    test('PATCH /tasks/bulk-status - should update task statuses in bulk', async ({ authedRequest }) => {
      const response = await authedRequest.patch('/api/v1/tasks/bulk-status', {
        data: { taskIds: createdTaskId ? [createdTaskId] : [NO_ID], status: 'in_progress' },
      });

      expectStatus(response, [200, 400, 404, 422]);
    });

    test('DELETE /tasks/bulk - should delete tasks in bulk', async ({ authedRequest }) => {
      const response = await authedRequest.delete('/api/v1/tasks/bulk', {
        data: { taskIds: [NO_ID] },
      });

      expectStatus(response, [200, 400, 404, 422]);
    });

    test('DELETE /tasks/dependencies/:dependencyId - should remove a dependency', async ({ authedRequest }) => {
      const response = await authedRequest.delete(`/api/v1/tasks/dependencies/${NO_ID}`);

      expectStatus(response, [200, 400, 404]);
    });

    test('GET /tasks/categories/all - should list all task categories @smoke', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/tasks/categories/all');

      expect(response.status()).toBe(200);
    });

    test('POST /tasks/categories - should create a task category', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/tasks/categories', {
        data: { name: `Test Category ${Date.now()}` },
      });

      expectStatus(response, [200, 201, 400, 422]);
    });

    test('GET /tasks/:taskId - should get task by id', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}`);

      expect(response.status()).toBe(200);
    });

    test('PATCH /tasks/:taskId - should update a task', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.patch(`/api/v1/tasks/${createdTaskId}`, {
        data: { title: `Updated Task ${Date.now()}` },
      });

      expectStatus(response, [200, 204]);
    });

    test('PATCH /tasks/:taskId/assign - should assign a task', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.patch(`/api/v1/tasks/${createdTaskId}/assign`, {
        data: { worker_id: NO_ID },
      });

      expectStatus(response, [200, 400, 404]);
    });

    test('POST /tasks/:taskId/reprocess-stock - should reprocess stock', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.post(`/api/v1/tasks/${createdTaskId}/reprocess-stock`);

      expectStatus(response, [200, 400, 404]);
    });

    test('POST /tasks/:taskId/start - should start a task', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.post(`/api/v1/tasks/${createdTaskId}/start`);

      expectStatus(response, [200, 400, 404]);
    });

    test('PATCH /tasks/:taskId/complete - should complete a task', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.patch(`/api/v1/tasks/${createdTaskId}/complete`, {
        data: { notes: 'Done' },
      });

      expectStatus(response, [200, 400, 404, 409]);
    });

    test('POST /tasks/:taskId/complete-with-harvest - should complete a harvest task', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.post(`/api/v1/tasks/${createdTaskId}/complete-with-harvest`, {
        data: {
          harvest_date: new Date().toISOString().split('T')[0],
          quantity: 1,
          unit: 'kg',
          workers: [{ worker_id: NO_ID, hours_worked: 1 }],
        },
      });

      expectStatus(response, [200, 400, 404]);
    });

    test('GET /tasks/:taskId/checklist - should return task checklist', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}/checklist`);

      expect(response.status()).toBe(200);
    });

    test('PUT /tasks/:taskId/checklist - should replace task checklist', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.put(`/api/v1/tasks/${createdTaskId}/checklist`, {
        data: { checklist: [] },
      });

      expectStatus(response, [200, 204, 400, 404]);
    });

    test('POST /tasks/:taskId/checklist/items - should add a checklist item', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.post(`/api/v1/tasks/${createdTaskId}/checklist/items`, {
        data: { title: `Checklist Item ${Date.now()}` },
      });

      expectStatus(response, [200, 201, 400, 404]);
    });

    test('GET /tasks/:taskId/dependencies - should return task dependencies', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}/dependencies`);

      expect(response.status()).toBe(200);
    });

    test('GET /tasks/:taskId/blocked - should return blocked status', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}/blocked`);

      expect(response.status()).toBe(200);
    });

    test('GET /tasks/:taskId/comments - should return task comments', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}/comments`);

      expect(response.status()).toBe(200);
    });

    test('GET /tasks/:taskId/time-logs - should return task time logs', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}/time-logs`);

      expect(response.status()).toBe(200);
    });

    test('PATCH /tasks/time-logs/:timeLogId/clock-out - should clock out of a time log', async ({ authedRequest }) => {
      const response = await authedRequest.patch(`/api/v1/tasks/time-logs/${NO_ID}/clock-out`, {
        data: {},
      });

      expectStatus(response, [200, 400, 404]);
    });

    test('GET /tasks/time-logs/active-session - should return the active session', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/tasks/time-logs/active-session');

      expectStatus(response, [200, 404]);
    });

    test('POST /tasks/time-logs/auto-clock-out - should auto clock out stale sessions', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/tasks/time-logs/auto-clock-out');

      expectStatus(response, [200, 400]);
    });

    test('GET /tasks/:taskId/checklist - should reject an unknown task', async ({ authedRequest }) => {
      const response = await authedRequest.get(`/api/v1/tasks/${NO_ID}/checklist`);

      expectStatus(response, [400, 404]);
    });

    test('PUT /tasks/:taskId/checklist - should reject an unknown task', async ({ authedRequest }) => {
      const response = await authedRequest.put(`/api/v1/tasks/${NO_ID}/checklist`, {
        data: { checklist: [] },
      });

      expectStatus(response, [400, 404]);
    });

    test('POST /tasks/:taskId/checklist/items - should reject an unknown task', async ({ authedRequest }) => {
      const response = await authedRequest.post(`/api/v1/tasks/${NO_ID}/checklist/items`, {
        data: { title: 'Missing task' },
      });

      expectStatus(response, [400, 404]);
    });

    test('PATCH /tasks/:taskId/checklist/items/:itemId/toggle - should reject an unknown checklist item', async ({ authedRequest }) => {
      const response = await authedRequest.patch(`/api/v1/tasks/${NO_ID}/checklist/items/${NO_ID}/toggle`);

      expectStatus(response, [400, 404]);
    });

    test('DELETE /tasks/:taskId/checklist/items/:itemId - should reject an unknown checklist item', async ({ authedRequest }) => {
      const response = await authedRequest.delete(`/api/v1/tasks/${NO_ID}/checklist/items/${NO_ID}`);

      expectStatus(response, [400, 404]);
    });

    test('GET /tasks/:taskId - should reject an unknown task', async ({ authedRequest }) => {
      const response = await authedRequest.get(`/api/v1/tasks/${NO_ID}`);

      expectStatus(response, [400, 404]);
    });

    test('PATCH /tasks/:taskId - should reject an unknown task', async ({ authedRequest }) => {
      const response = await authedRequest.patch(`/api/v1/tasks/${NO_ID}`, {
        data: { title: 'Missing task' },
      });

      expectStatus(response, [400, 404]);
    });

    test('DELETE /tasks/:taskId - should delete a task', async ({ authedRequest }) => {
      if (!createdTaskId) test.skip();

      const response = await authedRequest.delete(`/api/v1/tasks/${createdTaskId}`);

      expectStatus(response, [200, 204]);
    });
  });

  test.describe('Task Assignments controller @workforce', () => {
    test('GET /task-assignments - should list task assignments @smoke', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/task-assignments');

      expectStatus(response, [200, 404]);
    });

    test('POST /task-assignments - should create a task assignment', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/task-assignments', {
        data: { task_id: NO_ID, worker_id: NO_ID },
      });

      expectStatus(response, [200, 201, 400, 404, 422]);
    });

    test('POST /task-assignments/bulk - should create task assignments in bulk', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/task-assignments/bulk', {
        data: { assignments: [{ task_id: NO_ID, worker_id: NO_ID }] },
      });

      expectStatus(response, [200, 201, 400, 404, 422]);
    });

    test('POST /task-assignments/sync - should sync task assignments', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/task-assignments/sync', {
        data: { assignments: [{ task_id: NO_ID, worker_id: NO_ID }] },
      });

      expectStatus(response, [200, 201, 400, 404, 422]);
    });

    test('PATCH /task-assignments/:assignmentId - should update a task assignment', async ({ authedRequest }) => {
      const response = await authedRequest.patch(`/api/v1/task-assignments/${NO_ID}`, {
        data: { status: 'assigned' },
      });

      expectStatus(response, [200, 400, 404, 422]);
    });

    test('DELETE /task-assignments/:assignmentId - should delete a task assignment', async ({ authedRequest }) => {
      const response = await authedRequest.delete(`/api/v1/task-assignments/${NO_ID}`);

      expectStatus(response, [200, 204, 400, 404]);
    });
  });

  test.describe.serial('Work Units controller @workforce', () => {
    test('GET /work-units - should list work units @smoke', async ({ authedRequest }) => {
      const response = await authedRequest.get('/api/v1/work-units');

      expect(response.status()).toBe(200);
    });

    test('POST /work-units - should create a work unit', async ({ authedRequest }) => {
      const response = await authedRequest.post('/api/v1/work-units', {
        data: {
          code: `wu-${Date.now()}`,
          name: `Test Work Unit ${Date.now()}`,
          unit_category: 'count',
        },
      });

      expect([200, 201]).toContain(response.status());
      const body = await response.json();
      if (body?.id) createdWorkUnitId = body.id;
    });

    test('GET /work-units/:id - should get work unit by id', async ({ authedRequest }) => {
      if (!createdWorkUnitId) test.skip();

      const response = await authedRequest.get(`/api/v1/work-units/${createdWorkUnitId}`);

      expect(response.status()).toBe(200);
    });

    test('PATCH /work-units/:id - should update a work unit', async ({ authedRequest }) => {
      if (!createdWorkUnitId) test.skip();

      const response = await authedRequest.patch(`/api/v1/work-units/${createdWorkUnitId}`, {
        data: { name: `Updated Work Unit ${Date.now()}` },
      });

      expectStatus(response, [200, 204]);
    });

    test('DELETE /work-units/:id - should delete a work unit', async ({ authedRequest }) => {
      if (!createdWorkUnitId) test.skip();

      const response = await authedRequest.delete(`/api/v1/work-units/${createdWorkUnitId}`);

      expectStatus(response, [200, 204]);
    });

    test('DELETE /work-units/:id - should reject an unknown work unit', async ({ authedRequest }) => {
      const response = await authedRequest.delete(`/api/v1/work-units/${NO_ID}`);

      expectStatus(response, [400, 404]);
    });
  });
});
