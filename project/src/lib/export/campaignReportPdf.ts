import type { F3CampaignBilanResponse } from '@/lib/api/calibration-v2';

function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return 'N/A';
  }
  return value.toFixed(digits);
}

function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) {
    return 'N/A';
  }
  return `${value.toFixed(digits)}%`;
}

function buildReportHtml(parcelId: string, bilan: F3CampaignBilanResponse): string {
  const now = new Date();
  const generatedAt = now.toLocaleString('fr-FR');

  const alertRows = bilan.alerts_summary
    .map((item) => `<tr><td>${item.code}</td><td>${item.count}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Rapport de campagne - ${parcelId}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    .meta { color: #4b5563; font-size: 12px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
    .label { font-size: 12px; color: #6b7280; }
    .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>Rapport de campagne</h1>
  <div class="meta">Parcelle: ${parcelId} | Genere le: ${generatedAt}</div>

  <div class="grid">
    <div class="card">
      <div class="label">Rendement predit</div>
      <div class="value">${formatNumber(bilan.predicted_yield.min)} - ${formatNumber(bilan.predicted_yield.max)} T/ha</div>
    </div>
    <div class="card">
      <div class="label">Rendement reel</div>
      <div class="value">${formatNumber(bilan.actual_yield)} T/ha</div>
    </div>
    <div class="card">
      <div class="label">Ecart rendement</div>
      <div class="value">${formatPercent(bilan.yield_deviation_pct)}</div>
    </div>
    <div class="card">
      <div class="label">Alternance N+1</div>
      <div class="value">${bilan.alternance_status_next}</div>
    </div>
  </div>

  <div class="card" style="margin-bottom: 12px;">
    <div class="label">Interventions</div>
    <div class="value" style="font-size: 16px;">${bilan.interventions_executed} executees / ${bilan.interventions_planned} planifiees</div>
  </div>

  <div class="card" style="margin-bottom: 12px;">
    <div class="label">Evolution score sante</div>
    <div class="value" style="font-size: 16px;">${bilan.health_score_evolution.start}/100 -> ${bilan.health_score_evolution.end}/100</div>
  </div>

  <div class="card">
    <div class="label">Resume alertes</div>
    <table>
      <thead>
        <tr><th>Code alerte</th><th>Occurrences</th></tr>
      </thead>
      <tbody>
        ${alertRows || '<tr><td colspan="2">Aucune alerte</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export function exportCampaignBilanPdf(parcelId: string, bilan: F3CampaignBilanResponse): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!popup) {
    return;
  }

  popup.document.open();
  popup.document.write(buildReportHtml(parcelId, bilan));
  popup.document.close();
  popup.focus();
  popup.print();
}
