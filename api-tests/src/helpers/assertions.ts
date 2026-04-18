import { expect, type APIResponse } from '@playwright/test';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export async function expectPaginated<T>(
  responsePromise: Promise<APIResponse>,
  entityName: string,
): Promise<PaginatedResponse<T>> {
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body: PaginatedResponse<T> = await response.json();
  expect(body.data, `${entityName} response should have .data array`).toBeDefined();
  expect(body.total, `${entityName} response should have .total number`).toBeDefined();
  expect(Array.isArray(body.data), `${entityName} .data should be an array`).toBe(true);
  return body;
}

export async function expectObject(
  responsePromise: Promise<APIResponse>,
  entityName: string,
): Promise<Record<string, any>> {
  const response = await responsePromise;
  expect([200, 201]).toContain(response.status());
  const body = await response.json();
  expect(body, `${entityName} should return a JSON object`).toBeTruthy();
  expect(typeof body, `${entityName} should be an object`).toBe('object');
  return body;
}

export async function expectArray(
  responsePromise: Promise<APIResponse>,
  entityName: string,
): Promise<any[]> {
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body), `${entityName} should return an array`).toBe(true);
  return body;
}

export async function expectStatus(
  responsePromise: Promise<APIResponse>,
  allowed: number[],
): Promise<any> {
  const response = await responsePromise;
  expect(allowed, `Status ${response.status()} not in allowed [${allowed.join(', ')}]`).toContain(response.status());
  return response.json();
}

export async function expectExactStatus(
  responsePromise: Promise<APIResponse>,
  expected: number,
): Promise<APIResponse> {
  const response = await responsePromise;
  expect(response.status()).toBe(expected);
  return response;
}

export async function expectError(
  responsePromise: Promise<APIResponse>,
  allowedErrors: number[],
): Promise<Record<string, any>> {
  const response = await responsePromise;
  expect(allowedErrors, `Status ${response.status()} not in allowed errors [${allowedErrors.join(', ')}]`).toContain(response.status());
  const body = await response.json();
  expect(body, 'Error response should have a body').toBeTruthy();
  return body;
}

export async function expectUnauthorized(
  responsePromise: Promise<APIResponse>,
): Promise<void> {
  const response = await responsePromise;
  expect(response.status()).toBe(401);
}

export async function createWithCleanup<T>(
  request: any,
  path: string,
  data: Record<string, unknown>,
): Promise<{ entity: T & { id: string }; id: string } | null> {
  const response = await request.post(path, { data });
  if (!response.ok()) {
    return null;
  }
  const entity = await response.json() as T & { id: string };
  if (!entity.id) {
    return null;
  }
  return { entity, id: entity.id };
}
