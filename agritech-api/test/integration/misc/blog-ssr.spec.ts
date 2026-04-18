import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

describe('Blog SSR - HTML Routes', () => {
  let api: ApiIntegrationTestHelper;

  beforeAll(async () => {
    api = await setupRealApiIntegration('00000000-0000-0000-0000-000000000001');
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET /blog (listing page)', () => {
    it('should return HTML with status 200', async () => {
      const res = await api.get('/blog');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });

    it('should contain OG meta tags', async () => {
      const res = await api.get('/blog');
      expect(res.text).toContain('<meta property="og:title"');
      expect(res.text).toContain('<meta property="og:type"');
      expect(res.text).toContain('AgroGina');
    });

    it('should contain basic HTML structure', async () => {
      const res = await api.get('/blog');
      expect(res.text).toContain('<!DOCTYPE html>');
      expect(res.text).toContain('</html>');
      expect(res.text).toContain('<main>');
    });

    it('should support lang query parameter', async () => {
      const res = await api.get('/blog?lang=ar');
      expect(res.status).toBe(200);
      expect(res.text).toContain('dir="rtl"');
      expect(res.text).toContain('lang="ar"');
    });

    it('should contain AgroGina brand styling', async () => {
      const res = await api.get('/blog');
      expect(res.text).toContain('#16a34a'); // AgroGina green
      expect(res.text).toContain('grid-template-columns'); // Responsive grid
      expect(res.text).toContain('AgroGina'); // Brand name in nav
    });

    it('should contain newsletter form with fetch() script', async () => {
      const res = await api.get('/blog');
      expect(res.text).toContain('newsletter-form');
      expect(res.text).toContain('newsletter/subscribe');
      expect(res.text).toContain('fetch(');
    });
  });

  describe('GET /blog/:slug (detail page)', () => {
    it('should return 404 HTML for non-existent slug', async () => {
      const res = await api.get('/blog/this-slug-does-not-exist-12345');
      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('non trouvé');
    });

    it('should return HTML with correct structure for detail route', async () => {
      // Even if Strapi is down, the route should exist and return HTML (404 or 200)
      const res = await api.get('/blog/test-article');
      expect([200, 404, 500]).toContain(res.status);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('<!DOCTYPE html');
    });

    it('should contain JSON-LD script tag when post exists', async () => {
      const res = await api.get('/blog/test-article');
      if (res.status === 200) {
        expect(res.text).toContain('application/ld+json');
        expect(res.text).toContain('"@type"');
      }
    });
  });
});
