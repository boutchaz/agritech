import {
  agromindCalibrationFixture,
  OLIVIER_INTENSIF_NDVI_THRESHOLDS,
} from './test-fixture';

describe('Calibration acceptance fixture', () => {
  it('should provide a deterministic olive parcel dataset for calibration', () => {
    expect(agromindCalibrationFixture.parcel).toEqual({
      id: 'fixture-parcel-001',
      crop_type: 'olivier',
      system: 'intensif',
      area_ha: 5,
      trees_per_ha: 200,
      variety: 'Picholine Marocaine',
    });

    expect(agromindCalibrationFixture.ndvi_thresholds).toEqual(
      OLIVIER_INTENSIF_NDVI_THRESHOLDS,
    );
    expect(agromindCalibrationFixture.satellite_readings).toHaveLength(30);
    expect(agromindCalibrationFixture.weather_readings).toHaveLength(30);
    expect(agromindCalibrationFixture.satellite_readings[0]?.date).toBe('2026-01-01');
    expect(agromindCalibrationFixture.satellite_readings[29]?.date).toBe('2026-01-30');

    const baselineNdvi =
      agromindCalibrationFixture.satellite_readings.reduce(
        (sum, reading) => sum + reading.ndvi,
        0,
      ) / agromindCalibrationFixture.satellite_readings.length;

    expect(baselineNdvi).toBeCloseTo(
      agromindCalibrationFixture.expected_output.baseline_ndvi,
      2,
    );
  });

  it('should expose the expected calibration output shape', () => {
    const { expected_output } = agromindCalibrationFixture;

    expect(expected_output.confidence_score).toBeGreaterThanOrEqual(0.7);
    expect(['normal', 'stressed', 'optimal']).toContain(
      expected_output.zone_classification,
    );
    expect(expected_output.phenology_stage).toBeTruthy();
    expect(expected_output.phenology_stage.length).toBeGreaterThan(0);
    expect(expected_output).toEqual({
      baseline_ndvi: 0.55,
      confidence_score: 0.82,
      zone_classification: 'normal',
      phenology_stage: 'repos_vegetatif',
    });
  });
});
