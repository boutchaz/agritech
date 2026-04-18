import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

export default function ProfitabilityTab() {
  const { colors: themeColors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: themeColors.surfaceLowest }]}>
        <View style={[styles.iconWrap, { backgroundColor: themeColors.successContainer }]}>
          <Ionicons name="trending-up" size={28} color={themeColors.success} />
        </View>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Profitability</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          Revenue, costs, and margin analysis for this parcel
        </Text>
      </View>

      <View style={styles.featureList}>
        {[
          { icon: 'cash-outline', title: 'Revenue Tracking', desc: 'Income from harvests and sales linked to this parcel' },
          { icon: 'receipt-outline', title: 'Cost Analysis', desc: 'Inputs, labor, and operational expenses breakdown' },
          { icon: 'pie-chart-outline', title: 'Margin Analysis', desc: 'Net profit margin and return on investment per crop cycle' },
        ].map((item) => (
          <View key={item.title} style={[styles.featureCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={[styles.featureIcon, { backgroundColor: themeColors.surfaceContainer }]}>
              <Ionicons name={item.icon as any} size={20} color={themeColors.brandPrimary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={[styles.featureTitle, { color: themeColors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.featureDesc, { color: themeColors.textTertiary }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  featureList: { gap: 10 },
  featureCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12 },
  featureIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  featureDesc: { fontSize: 13, marginTop: 2 },
});
