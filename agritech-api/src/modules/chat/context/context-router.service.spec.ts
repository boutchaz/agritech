import { ContextRouterService, ContextNeeds } from './context-router.service';

describe('ContextRouterService', () => {
  let service: ContextRouterService;

  beforeEach(() => {
    service = new ContextRouterService();
  });

  describe('analyzeQuery', () => {
    it('should always return farm=true and worker=true', () => {
      const result = service.analyzeQuery('random question');
      expect(result.farm).toBe(true);
      expect(result.worker).toBe(true);
    });

    it('should detect worker-related queries', () => {
      const result = service.analyzeQuery('how many workers do I have?');
      expect(result.worker).toBe(true);
    });

    it('should detect accounting-related queries', () => {
      const result = service.analyzeQuery('show me the invoices');
      expect(result.accounting).toBe(true);
    });

    it('should detect inventory-related queries', () => {
      const result = service.analyzeQuery('what is the stock level?');
      expect(result.inventory).toBe(true);
    });

    it('should detect production-related queries', () => {
      const result = service.analyzeQuery('harvest yield this season');
      expect(result.production).toBe(true);
    });

    it('should detect supplier/customer-related queries', () => {
      const result = service.analyzeQuery('list my suppliers');
      expect(result.supplierCustomer).toBe(true);
    });

    it('should detect weather-related queries', () => {
      const result = service.analyzeQuery('weather forecast for tomorrow');
      expect(result.weather).toBe(true);
    });

    it('should detect satellite-related queries', () => {
      const result = service.analyzeQuery('show NDVI for my parcels');
      expect(result.satellite).toBe(true);
    });

    it('should activate all key modules for general/overview queries', () => {
      const result = service.analyzeQuery('bonjour');
      expect(result.accounting).toBe(true);
      expect(result.inventory).toBe(true);
      expect(result.production).toBe(true);
      expect(result.weather).toBe(true);
      expect(result.alerts).toBe(true);
      expect(result.forecast).toBe(true);
      expect(result.settings).toBe(true);
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for recommendation queries', () => {
      const result = service.analyzeQuery('recommendation parcelle');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for diagnostic queries', () => {
      const result = service.analyzeQuery('diagnostic de ma parcelle');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for plan/intervention queries', () => {
      const result = service.analyzeQuery('what interventions are planned?');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for "what should I do" queries', () => {
      const result = service.analyzeQuery('what should I do about my parcel?');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for French action queries', () => {
      const result = service.analyzeQuery('que faire pour la parcelle?');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for Arabic queries', () => {
      const result = service.analyzeQuery('ماذا أفعل بالقطعة؟');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for calibration queries', () => {
      const result = service.analyzeQuery('show calibration results');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should activate agromindiaIntel for parcel health queries', () => {
      const result = service.analyzeQuery('how is my parcel doing?');
      expect(result.agromindiaIntel).toBe(true);
    });

    it('should detect French queries', () => {
      const result = service.analyzeQuery('combien de travailleurs?');
      expect(result.worker).toBe(true);
    });

    it('should detect Arabic queries', () => {
      const result = service.analyzeQuery('كم عدد العمال');
      expect(result.worker).toBe(true);
    });
  });
});
