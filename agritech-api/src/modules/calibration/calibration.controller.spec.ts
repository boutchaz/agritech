import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CalibrationController } from './calibration.controller';
import { CalibrationService } from './calibration.service';
import { StartCalibrationDto } from './dto/start-calibration.dto';
import { Request } from 'express';

const mockCalibrationService = {
  startCalibration: jest.fn(),
  getLatestCalibration: jest.fn(),
  getCalibrationReport: jest.fn(),
  validateCalibration: jest.fn(),
  getPercentiles: jest.fn(),
  getZones: jest.fn(),
};

function makeRequest(parcelId: string, organizationId?: string): Request {
  return {
    params: { parcelId },
    headers: organizationId ? { 'x-organization-id': organizationId } : {},
  } as unknown as Request;
}

describe('CalibrationController', () => {
  let controller: CalibrationController;

  const parcelId = 'parcel-001';
  const organizationId = 'org-001';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalibrationController],
      providers: [
        { provide: CalibrationService, useValue: mockCalibrationService },
      ],
    })
      .overrideGuard(require('../auth/guards/jwt-auth.guard').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('../../common/guards/organization.guard').OrganizationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CalibrationController>(CalibrationController);
  });

  describe('startCalibration', () => {
    it('calls service.startCalibration with parcelId, organizationId, and dto', async () => {
      const dto: StartCalibrationDto = {};
      const serviceResult = { id: 'cal-001', parcel_id: parcelId, status: 'completed' };
      mockCalibrationService.startCalibration.mockResolvedValue(serviceResult);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.startCalibration(parcelId, dto, req);

      expect(mockCalibrationService.startCalibration).toHaveBeenCalledWith(
        parcelId,
        organizationId,
        dto,
      );
      expect(result).toEqual(serviceResult);
    });

    it('throws BadRequestException when organization ID header is missing', async () => {
      const dto: StartCalibrationDto = {};
      const req = makeRequest(parcelId);

      await expect(controller.startCalibration(parcelId, dto, req)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockCalibrationService.startCalibration).not.toHaveBeenCalled();
    });

    it('propagates service errors', async () => {
      const dto: StartCalibrationDto = {};
      mockCalibrationService.startCalibration.mockRejectedValue(
        new BadRequestException('Satellite and weather readings are required'),
      );

      const req = makeRequest(parcelId, organizationId);
      await expect(controller.startCalibration(parcelId, dto, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLatestCalibration', () => {
    it('calls service.getLatestCalibration with parcelId and organizationId', async () => {
      const serviceResult = { id: 'cal-001', parcel_id: parcelId, status: 'completed' };
      mockCalibrationService.getLatestCalibration.mockResolvedValue(serviceResult);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.getLatestCalibration(parcelId, req);

      expect(mockCalibrationService.getLatestCalibration).toHaveBeenCalledWith(
        parcelId,
        organizationId,
      );
      expect(result).toEqual(serviceResult);
    });

    it('returns null when no calibration exists', async () => {
      mockCalibrationService.getLatestCalibration.mockResolvedValue(null);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.getLatestCalibration(parcelId, req);

      expect(result).toEqual(null);
    });

    it('throws BadRequestException when organization ID header is missing', async () => {
      const req = makeRequest(parcelId);

      await expect(controller.getLatestCalibration(parcelId, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCalibrationReport', () => {
    it('calls service.getCalibrationReport with parcelId and organizationId', async () => {
      const serviceResult = { calibration: { id: 'cal-001' }, report: {} };
      mockCalibrationService.getCalibrationReport.mockResolvedValue(serviceResult);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.getCalibrationReport(parcelId, req);

      expect(mockCalibrationService.getCalibrationReport).toHaveBeenCalledWith(
        parcelId,
        organizationId,
      );
      expect(result).toEqual(serviceResult);
    });

    it('returns null when no calibration report exists', async () => {
      mockCalibrationService.getCalibrationReport.mockResolvedValue(null);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.getCalibrationReport(parcelId, req);

      expect(result).toEqual(null);
    });

    it('throws BadRequestException when organization ID header is missing', async () => {
      const req = makeRequest(parcelId);

      await expect(controller.getCalibrationReport(parcelId, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('propagates service errors', async () => {
      mockCalibrationService.getCalibrationReport.mockRejectedValue(
        new BadRequestException('Failed to fetch calibration'),
      );

      const req = makeRequest(parcelId, organizationId);
      await expect(controller.getCalibrationReport(parcelId, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateCalibration', () => {
    it('calls getLatestCalibration then validateCalibration with the calibration id', async () => {
      const latestCalibration = { id: 'cal-001', parcel_id: parcelId, status: 'completed' };
      const validatedCalibration = { ...latestCalibration, status: 'validated' };
      mockCalibrationService.getLatestCalibration.mockResolvedValue(latestCalibration);
      mockCalibrationService.validateCalibration.mockResolvedValue(validatedCalibration);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.validateCalibration(parcelId, req);

      expect(mockCalibrationService.getLatestCalibration).toHaveBeenCalledWith(
        parcelId,
        organizationId,
      );
      expect(mockCalibrationService.validateCalibration).toHaveBeenCalledWith(
        'cal-001',
        organizationId,
      );
      expect(result).toEqual(validatedCalibration);
    });

    it('throws NotFoundException when no calibration exists for the parcel', async () => {
      mockCalibrationService.getLatestCalibration.mockResolvedValue(null);

      const req = makeRequest(parcelId, organizationId);
      await expect(controller.validateCalibration(parcelId, req)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCalibrationService.validateCalibration).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when organization ID header is missing', async () => {
      const req = makeRequest(parcelId);

      await expect(controller.validateCalibration(parcelId, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('propagates service errors from validateCalibration', async () => {
      const latestCalibration = { id: 'cal-001', parcel_id: parcelId, status: 'completed' };
      mockCalibrationService.getLatestCalibration.mockResolvedValue(latestCalibration);
      mockCalibrationService.validateCalibration.mockRejectedValue(
        new BadRequestException('Only completed calibrations can be validated'),
      );

      const req = makeRequest(parcelId, organizationId);
      await expect(controller.validateCalibration(parcelId, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPercentiles', () => {
    it('calls service.getPercentiles with parcelId and organizationId', async () => {
      const serviceResult = { percentiles: { '10': 0.3, '50': 0.5, '90': 0.7 } };
      mockCalibrationService.getPercentiles.mockResolvedValue(serviceResult);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.getPercentiles(parcelId, req);

      expect(mockCalibrationService.getPercentiles).toHaveBeenCalledWith(parcelId, organizationId);
      expect(result).toEqual(serviceResult);
    });

    it('throws BadRequestException when organization ID header is missing', async () => {
      const req = makeRequest(parcelId);

      await expect(controller.getPercentiles(parcelId, req)).rejects.toThrow(BadRequestException);
    });

    it('propagates NotFoundException from service when no NDVI readings exist', async () => {
      mockCalibrationService.getPercentiles.mockRejectedValue(
        new NotFoundException('No NDVI readings found for parcel'),
      );

      const req = makeRequest(parcelId, organizationId);
      await expect(controller.getPercentiles(parcelId, req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getZones', () => {
    it('calls service.getZones with parcelId and organizationId', async () => {
      const serviceResult = {
        zones: ['optimal', 'normal', 'stressed'],
        distribution: { optimal: 0.6, normal: 0.3, stressed: 0.1 },
      };
      mockCalibrationService.getZones.mockResolvedValue(serviceResult);

      const req = makeRequest(parcelId, organizationId);
      const result = await controller.getZones(parcelId, req);

      expect(mockCalibrationService.getZones).toHaveBeenCalledWith(parcelId, organizationId);
      expect(result).toEqual(serviceResult);
    });

    it('throws BadRequestException when organization ID header is missing', async () => {
      const req = makeRequest(parcelId);

      await expect(controller.getZones(parcelId, req)).rejects.toThrow(BadRequestException);
    });

    it('propagates NotFoundException from service when no NDVI readings exist', async () => {
      mockCalibrationService.getZones.mockRejectedValue(
        new NotFoundException('No NDVI readings found for parcel'),
      );

      const req = makeRequest(parcelId, organizationId);
      await expect(controller.getZones(parcelId, req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('organization ID extraction', () => {
    it('uses the first value when x-organization-id header is an array', async () => {
      const serviceResult = { id: 'cal-001', parcel_id: parcelId, status: 'completed' };
      mockCalibrationService.getLatestCalibration.mockResolvedValue(serviceResult);

      const req = {
        params: { parcelId },
        headers: { 'x-organization-id': ['org-001', 'org-002'] },
      } as unknown as Request;

      const result = await controller.getLatestCalibration(parcelId, req);

      expect(mockCalibrationService.getLatestCalibration).toHaveBeenCalledWith(
        parcelId,
        'org-001',
      );
      expect(result).toEqual(serviceResult);
    });
  });
});
