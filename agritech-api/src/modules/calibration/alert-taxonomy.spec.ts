import { getAlertsForCulture, getAlertByCode, getCriticalAlerts, getIrreversibleAlerts, reloadAlertTaxonomy } from './alert-taxonomy';

describe('AlertTaxonomy V2', () => {
  beforeEach(() => reloadAlertTaxonomy());

  it('has 20 OLI alerts for olivier', () => {
    const olivierAlerts = getAlertsForCulture('olivier');
    expect(olivierAlerts.length).toBe(20);
  });

  it('OLI-01 is urgent hydric stress', () => {
    const alert = getAlertByCode('OLI-01');
    expect(alert).toBeDefined();
    expect(alert!.priority).toBe('urgent');
    expect(alert!.category).toBe('hydric_stress');
    expect(alert!.seuil_entree.length).toBeGreaterThan(0);
  });

  it('OLI-06 is irreversible', () => {
    const alert = getAlertByCode('OLI-06');
    expect(alert).toBeDefined();
    expect(alert!.irreversible).toBe(true);
  });

  it('OLI-14 is info priority', () => {
    const alert = getAlertByCode('OLI-14');
    expect(alert).toBeDefined();
    expect(alert!.priority).toBe('info');
  });

  it('has structured prescription on OLI-01', () => {
    const alert = getAlertByCode('OLI-01');
    expect(alert!.prescription).toBeDefined();
    expect(alert!.prescription.action).toBeTruthy();
    expect(alert!.prescription.suivi).toBeDefined();
    expect(alert!.prescription.suivi.indicateur).toBeTruthy();
  });

  it('critical alerts includes all urgent codes', () => {
    const critical = getCriticalAlerts();
    const urgentCodes = critical.filter(a => a.culture === 'olivier').map(a => a.code);
    expect(urgentCodes).toContain('OLI-01');
    expect(urgentCodes).toContain('OLI-03');
    expect(urgentCodes).toContain('OLI-06');
    expect(urgentCodes).toContain('OLI-15');
    expect(urgentCodes).toContain('OLI-20');
  });

  it('irreversible alerts are OLI-06, OLI-11, OLI-17', () => {
    const irrev = getIrreversibleAlerts().filter(a => a.culture === 'olivier');
    const codes = irrev.map(a => a.code).sort();
    expect(codes).toEqual(['OLI-06', 'OLI-11', 'OLI-17']);
  });
});
