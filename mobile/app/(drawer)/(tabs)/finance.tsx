import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { format, isPast } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccountingDashboard, useInvoices, useSalesOrders } from '@/hooks/useAccounting';
import { useTheme } from '@/providers/ThemeProvider';
import type { InvoiceStatus } from '@/types/accounting';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_CONFIG: Record<InvoiceStatus, { icon: IconName; color: (c: ReturnType<typeof useTheme>['colors']) => string }> = {
  paid: { icon: 'checkmark-circle', color: (c) => c.success },
  pending: { icon: 'time-outline', color: (c) => c.warning },
  overdue: { icon: 'alert-circle', color: (c) => c.error },
  draft: { icon: 'document-outline', color: (c) => c.textTertiary },
  cancelled: { icon: 'close-circle', color: (c) => c.textTertiary },
};

function formatCurrency(amount: number, currency = 'MAD') {
  return `${amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default function FinanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useAccountingDashboard();
  const { data: invoicesData, isLoading: invoicesLoading, refetch: refetchInvoices } = useInvoices();
  const { data: ordersData, refetch: refetchOrders } = useSalesOrders();

  const invoices = invoicesData?.data ?? [];
  const orders = ordersData?.data ?? [];
  const recentInvoices = invoices.slice(0, 6);
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');
  const isLoading = dashLoading && !dashboard;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchDash(), refetchInvoices(), refetchOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDash, refetchInvoices, refetchOrders]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Finance</Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.brandPrimary} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Finance</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
          Revenue and invoicing overview
        </Text>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        {/* Revenue card - hero */}
        <View style={[styles.kpiCardHero, { backgroundColor: themeColors.brandContainer }]}>
          <View style={styles.kpiHeader}>
            <Ionicons name="trending-up" size={20} color={themeColors.brandText} />
            <Text style={[styles.kpiLabel, { color: themeColors.brandText }]}>Total Revenue</Text>
          </View>
          <Text style={[styles.kpiValueHero, { color: themeColors.onBrand }]}>
            {formatCurrency(dashboard?.total_revenue ?? 0)}
          </Text>
        </View>

        {/* Secondary KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: themeColors.warningContainer }]}>
              <Ionicons name="time-outline" size={18} color={themeColors.warning} />
            </View>
            <Text style={[styles.kpiSmallValue, { color: themeColors.textPrimary }]}>
              {dashboard?.pending_invoices ?? 0}
            </Text>
            <Text style={[styles.kpiSmallLabel, { color: themeColors.textTertiary }]}>Pending</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: themeColors.errorContainer }]}>
              <Ionicons name="alert-circle-outline" size={18} color={themeColors.error} />
            </View>
            <Text style={[styles.kpiSmallValue, { color: themeColors.error }]}>
              {formatCurrency(dashboard?.overdue_amount ?? 0)}
            </Text>
            <Text style={[styles.kpiSmallLabel, { color: themeColors.textTertiary }]}>Overdue</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: themeColors.infoContainer }]}>
              <Ionicons name="cart-outline" size={18} color={themeColors.info} />
            </View>
            <Text style={[styles.kpiSmallValue, { color: themeColors.textPrimary }]}>
              {dashboard?.pending_orders ?? 0}
            </Text>
            <Text style={[styles.kpiSmallLabel, { color: themeColors.textTertiary }]}>Orders</Text>
          </View>
        </View>
      </View>

      {/* Recent Invoices */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Recent Invoices</Text>
          <TouchableOpacity onPress={() => router.push('/(drawer)/(accounting)' as Href)}>
            <Text style={[styles.seeAllLink, { color: themeColors.brandPrimary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {invoicesLoading && invoices.length === 0 ? (
          <View style={styles.loadingSmall}>
            <ActivityIndicator size="small" color={themeColors.brandPrimary} />
          </View>
        ) : recentInvoices.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: themeColors.surfaceLow }]}>
            <Ionicons name="document-text-outline" size={36} color={themeColors.iconSubtle} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No invoices yet</Text>
          </View>
        ) : (
          recentInvoices.map((invoice) => {
            const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
            const statusColor = statusCfg.color(themeColors);
            const isOverdue = invoice.status === 'pending' && isPast(new Date(invoice.due_date));

            return (
              <TouchableOpacity
                key={invoice.id}
                style={[styles.invoiceRow, { backgroundColor: themeColors.surfaceLowest }]}
                activeOpacity={0.7}
                onPress={() => {}}
              >
                <View style={styles.invoiceLeft}>
                  <View style={styles.invoiceTopRow}>
                    <Text style={[styles.invoiceNumber, { color: themeColors.textPrimary }]}>
                      {invoice.invoice_number}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '1A' }]}>
                      <Ionicons name={statusCfg.icon} size={12} color={isOverdue ? themeColors.error : statusColor} />
                      <Text style={[styles.statusText, { color: isOverdue ? themeColors.error : statusColor }]}>
                        {isOverdue ? 'Overdue' : invoice.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.invoiceCustomer, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {invoice.customer?.name ?? 'Customer'}
                  </Text>
                  <Text style={[styles.invoiceDate, { color: themeColors.textTertiary }]}>
                    {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                    {invoice.due_date ? ` · Due ${format(new Date(invoice.due_date), 'MMM d')}` : ''}
                  </Text>
                </View>
                <View style={styles.invoiceRight}>
                  <Text style={[styles.invoiceAmount, { color: themeColors.textPrimary }]}>
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </Text>
                  {invoice.paid_amount > 0 && invoice.paid_amount < invoice.total_amount && (
                    <Text style={[styles.invoicePaid, { color: themeColors.success }]}>
                      Paid: {formatCurrency(invoice.paid_amount, invoice.currency)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Pending Orders</Text>
          {pendingOrders.slice(0, 5).map((order) => (
            <View
              key={order.id}
              style={[styles.orderRow, { backgroundColor: themeColors.surfaceLowest }]}
            >
              <View style={[styles.orderIcon, { backgroundColor: themeColors.infoContainer }]}>
                <Ionicons name="cart" size={16} color={themeColors.info} />
              </View>
              <View style={styles.orderInfo}>
                <Text style={[styles.orderNumber, { color: themeColors.textPrimary }]}>
                  {order.order_number}
                </Text>
                <Text style={[styles.orderMeta, { color: themeColors.textTertiary }]}>
                  {order.customer?.name ?? 'Customer'} · {format(new Date(order.order_date), 'MMM d')}
                </Text>
              </View>
              <View style={styles.orderAmountCol}>
                <Text style={[styles.orderAmount, { color: themeColors.textPrimary }]}>
                  {formatCurrency(order.total_amount, order.currency)}
                </Text>
                <View style={[styles.orderStatusBadge, { backgroundColor: themeColors.warningContainer }]}>
                  <Text style={[styles.orderStatusText, { color: themeColors.warning }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingSmall: { paddingVertical: 32, alignItems: 'center' },

  header: { paddingHorizontal: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 4 },

  // KPIs
  kpiGrid: { paddingHorizontal: 16, marginTop: 20, gap: 12 },
  kpiCardHero: { borderRadius: 16, padding: 20 },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiLabel: { fontSize: 13, fontWeight: '600' },
  kpiValueHero: { fontSize: 28, fontWeight: '800', marginTop: 8, letterSpacing: -0.5 },

  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  kpiIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiSmallValue: { fontSize: 15, fontWeight: '700' },
  kpiSmallLabel: { fontSize: 11, marginTop: 2 },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAllLink: { fontSize: 14, fontWeight: '600' },

  // Invoices
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  invoiceLeft: { flex: 1 },
  invoiceTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invoiceNumber: { fontSize: 15, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  invoiceCustomer: { fontSize: 13, marginTop: 4 },
  invoiceDate: { fontSize: 12, marginTop: 2 },
  invoiceRight: { alignItems: 'flex-end', marginLeft: 12 },
  invoiceAmount: { fontSize: 15, fontWeight: '700' },
  invoicePaid: { fontSize: 11, marginTop: 2 },

  // Orders
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  orderIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  orderInfo: { flex: 1 },
  orderNumber: { fontSize: 14, fontWeight: '600' },
  orderMeta: { fontSize: 12, marginTop: 2 },
  orderAmountCol: { alignItems: 'flex-end' },
  orderAmount: { fontSize: 14, fontWeight: '700' },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  orderStatusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 32, borderRadius: 16, gap: 8 },
  emptyText: { fontSize: 14 },
});
