import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

describe('Blog Feeds - Sitemap & RSS', () => {
  let api: ApiIntegrationTestHelper;

  beforeAll(async () => {
    api = await setupRealApiIntegration('00000000-0000-0000-0000-000000000001');
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET /sitemap.xml', () => {
    it('should return XML with status 200', async () => {
      const res = await api.get('/sitemap.xml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('xml');
    });

    it('should contain urlset element', async () => {
      const res = await api.get('/sitemap.xml');
      expect(res.text).toContain('<urlset');
      expect(res.text).toContain('</urlset>');
    });

    it('should contain the blog listing URL at minimum', async () => {
      const res = await api.get('/sitemap.xml');
      expect(res.text).toContain('/blog');
    });
  });

  describe('GET /rss.xml', () => {
    it('should return RSS XML with status 200', async () => {
      const res = await api.get('/rss.xml');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('xml');
    });

    it('should contain rss element', async () => {
      const res = await api.get('/rss.xml');
      expect(res.text).toContain('<rss');
      expect(res.text).toContain('<channel>');
    });
  });
});
