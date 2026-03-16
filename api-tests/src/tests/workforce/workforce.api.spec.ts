import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

test.describe('Workers API @workforce @smoke', () => {
  let createdWorkerId: string;

  test('GET /workers - should list workers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/workers');

    expect(response.status()).toBe(200);
  });

  test('POST /workers - should create a worker', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/workers', {
      data: testData.worker(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    if (body.id) createdWorkerId = body.id;
  });

  test('GET /workers/:id - should get worker by id', async ({ authedRequest }) => {
    if (!createdWorkerId) test.skip();

    const response = await authedRequest.get(`/api/v1/workers/${createdWorkerId}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(createdWorkerId);
  });

  test('PATCH /workers/:id - should update a worker', async ({ authedRequest }) => {
    if (!createdWorkerId) test.skip();

    const response = await authedRequest.patch(`/api/v1/workers/${createdWorkerId}`, {
      data: { first_name: 'Updated' },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /workers/:id - should delete a worker', async ({ authedRequest }) => {
    if (!createdWorkerId) test.skip();

    const response = await authedRequest.delete(`/api/v1/workers/${createdWorkerId}`);

    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Tasks API @workforce @smoke', () => {
  let createdTaskId: string;

  test('GET /tasks - should list tasks', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/tasks');

    expect(response.status()).toBe(200);
  });

  test('POST /tasks - should create a task', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/tasks', {
      data: testData.task(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    if (body.id) createdTaskId = body.id;
  });

  test('GET /tasks/:id - should get task by id', async ({ authedRequest }) => {
    if (!createdTaskId) test.skip();

    const response = await authedRequest.get(`/api/v1/tasks/${createdTaskId}`);

    expect(response.status()).toBe(200);
  });

  test('PATCH /tasks/:id - should update a task', async ({ authedRequest }) => {
    if (!createdTaskId) test.skip();

    const response = await authedRequest.patch(`/api/v1/tasks/${createdTaskId}`, {
      data: { title: `Updated Task ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /tasks/:id - should delete a task', async ({ authedRequest }) => {
    if (!createdTaskId) test.skip();

    const response = await authedRequest.delete(`/api/v1/tasks/${createdTaskId}`);

    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Task Assignments API @workforce', () => {
  test('GET /task-assignments - should list task assignments', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/task-assignments');

    expect(response.status()).toBe(200);
  });
});

test.describe('Piece Work API @workforce', () => {
  test('GET /piece-work - should list piece work entries', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/piece-work');

    expect(response.status()).toBe(200);
  });
});

test.describe('Work Units API @workforce', () => {
  test('GET /work-units - should list work units', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/work-units');

    expect(response.status()).toBe(200);
  });
});
