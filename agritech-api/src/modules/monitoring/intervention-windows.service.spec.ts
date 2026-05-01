import { Test, TestingModule } from '@nestjs/testing';
import { InterventionWindowsService } from './intervention-windows.service';

describe('InterventionWindowsService', () => {
  let service: InterventionWindowsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InterventionWindowsService],
    }).compile();

    service = module.get<InterventionWindowsService>(InterventionWindowsService);
  });

  describe('checkInterventionWindow', () => {
    it('returns critical when the BBCH stage is unknown', () => {
      const result = service.checkInterventionWindow('foliar spray', null);

      expect(result).toEqual({
        status: 'critical',
        reason: 'Current phenological stage is unknown',
      });
    });

    it('returns critical when the BBCH stage format is invalid', () => {
      const result = service.checkInterventionWindow('foliar spray', 'BBCH-60');

      expect(result).toEqual({
        status: 'critical',
        reason: 'Invalid BBCH stage format',
      });
    });

    it.each(['60', '69'])('forbids foliar treatments during flowering at BBCH %s', (bbch) => {
      const result = service.checkInterventionWindow('phytosanitaire spray', bbch);

      expect(result).toEqual({
        status: 'forbidden',
        reason: 'Foliar treatments are forbidden during flowering (BBCH 60-69)',
      });
    });

    it.each(['10', '79'])('forbids pruning during active growth at BBCH %s', (bbch) => {
      const result = service.checkInterventionWindow('pruning', bbch);

      expect(result).toEqual({
        status: 'forbidden',
        reason: 'Severe pruning is forbidden during active growth',
      });
    });

    it('marks nitrogen interventions as critical after veraison', () => {
      const result = service.checkInterventionWindow('nitrogen fertigation', '80');

      expect(result).toEqual({
        status: 'critical',
        reason: 'Nitrogen fertigation after veraison is strongly discouraged',
      });
    });

    it('rounds numeric BBCH values before applying nitrogen restrictions', () => {
      const result = service.checkInterventionWindow('azote', '79.6');

      expect(result).toEqual({
        status: 'critical',
        reason: 'Nitrogen fertigation after veraison is strongly discouraged',
      });
    });

    it('returns effective when the intervention is compatible with the BBCH stage', () => {
      const result = service.checkInterventionWindow('foliar spray', '59');

      expect(result).toEqual({
        status: 'effective',
        reason: 'Intervention is compatible with current BBCH stage',
      });
    });
  });
});
