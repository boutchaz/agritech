import { NotificationData } from './socket';

type ParcelIdParam = { parcelId: string };

export type NotificationRedirect =
  | { to: '/tasks/$taskId'; params: { taskId: string } }
  | { to: '/marketplace/orders' }
  | { to: '/marketplace/quote-requests/received' }
  | { to: '/pest-alerts/$reportId'; params: { reportId: string } }
  | { to: '/parcels/$parcelId'; params: ParcelIdParam }
  | { to: '/crop-cycles/$cycleId'; params: { cycleId: string } }
  | { to: '/compliance/certifications/$certId'; params: { certId: string } }
  | { to: '/workers/$workerId'; params: { workerId: string } }
  | { to: '/parcels/$parcelId/ai/recommendations'; params: ParcelIdParam }
  | { to: '/parcels/$parcelId/ai/alerts'; params: ParcelIdParam }
  | { to: '/production/intelligence' }
  | { to: '/production/soil-analysis' }
  | { to: '/quality-control' }
  | { to: '/accounting/payments' }
  | { to: '/accounting/invoices' }
  | { to: '/stock/inventory' }
  | { to: '/inventory/reception-batches' }
  | { to: '/lab-services' }
  | { to: '/harvests' }
  | { to: '/campaigns' }
  | { to: '/settings/users' }
  | { to: '/settings/work-units' }
  | { to: '/workforce/workers/piece-work' }
  | { to: '/accounting' };

const getDataValue = (data: NotificationData['data'], key: string): string | undefined => {
  const value = data?.[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

export function getNotificationRedirect(notification: NotificationData): NotificationRedirect | null {
  const data = notification.data;
  const parcelId = getDataValue(data, 'parcelId') ?? getDataValue(data, 'parcel_id');

  switch (notification.type) {
    case 'member_removed':
      return null;
    case 'member_added':
    case 'role_changed':
      return { to: '/settings/users' };
    case 'work_unit_completed':
      return { to: '/settings/work-units' };
    case 'piece_work_created':
      return { to: '/workforce/workers/piece-work' };
    case 'campaign_status_changed':
      return { to: '/campaigns' };
    case 'harvest_completed':
    case 'harvest_event_recorded':
      return { to: '/harvests' };
    case 'lab_results_available':
      return { to: '/lab-services' };
    case 'reception_batch_decision':
      return { to: '/inventory/reception-batches' };
    case 'low_inventory':
      return { to: '/stock/inventory' };
    case 'quality_inspection_completed':
      return { to: '/quality-control' };
    case 'journal_entry_posted':
      return { to: '/accounting' };
    case 'ai_recommendation_created':
      if (parcelId) {
        return { to: '/parcels/$parcelId/ai/recommendations', params: { parcelId } };
      }
      return { to: '/production/intelligence' };
    case 'ai_alert_triggered':
      if (parcelId) {
        return { to: '/parcels/$parcelId/ai/alerts', params: { parcelId } };
      }
      return { to: '/production/intelligence' };
    case 'soil_analysis_completed':
      if (parcelId) {
        return { to: '/parcels/$parcelId', params: { parcelId } };
      }
      return { to: '/production/soil-analysis' };
    default:
      break;
  }

  const taskId = getDataValue(data, 'taskId');
  if (taskId) {
    return { to: '/tasks/$taskId', params: { taskId } };
  }

  const orderId = getDataValue(data, 'orderId');
  if (orderId) {
    return { to: '/marketplace/orders' };
  }

  const quoteRequestId = getDataValue(data, 'quoteRequestId');
  if (quoteRequestId) {
    return { to: '/marketplace/quote-requests/received' };
  }

  const reportId = getDataValue(data, 'report_id');
  if (reportId) {
    return { to: '/pest-alerts/$reportId', params: { reportId } };
  }

  if (parcelId) {
    return { to: '/parcels/$parcelId', params: { parcelId } };
  }

  const cycleId = getDataValue(data, 'cycleId');
  if (cycleId) {
    return { to: '/crop-cycles/$cycleId', params: { cycleId } };
  }

  const certificationId = getDataValue(data, 'certificationId');
  if (certificationId) {
    return { to: '/compliance/certifications/$certId', params: { certId: certificationId } };
  }

  const workerId = getDataValue(data, 'workerId');
  if (workerId) {
    return { to: '/workers/$workerId', params: { workerId } };
  }

  const paymentId = getDataValue(data, 'paymentId');
  if (paymentId) {
    return { to: '/accounting/payments' };
  }

  const invoiceId = getDataValue(data, 'invoiceId');
  if (invoiceId) {
    return { to: '/accounting/invoices' };
  }

  const stockEntryId = getDataValue(data, 'stockEntryId');
  const itemId = getDataValue(data, 'itemId');
  if (stockEntryId || itemId) {
    return { to: '/stock/inventory' };
  }

  const batchId = getDataValue(data, 'batchId');
  if (batchId) {
    return { to: '/inventory/reception-batches' };
  }

  const analysisId = getDataValue(data, 'analysisId');
  if (analysisId) {
    return { to: '/lab-services' };
  }

  const deliveryId = getDataValue(data, 'deliveryId');
  if (deliveryId) {
    return null;
  }

  return null;
}
