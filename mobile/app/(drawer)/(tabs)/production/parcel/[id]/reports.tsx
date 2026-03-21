import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

export default function ReportsTab() {
  const { colors: themeColors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: themeColors.surfaceLowest }]}>
        <View style={[styles.iconWrap, { backgroundColor: themeColors.brandContainer + '30' }]}>
          <Ionicons name="document-text" size={28} color={themeColors.brandPrimary} />
        </View>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Reports</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          AI-generated reports and compliance documents for this parcel
        </Text>
      </View>

      <View style={styles.featureList}>
        {[
          { icon: 'analytics-outline', title: 'Campaign Reports', desc: 'Seasonal summaries with yield analysis and recommendations' },
          { icon: 'shield-checkmark-outline', title: 'Compliance Reports', desc: 'Regulatory compliance and certification documentation' },
          { icon: 'download-outline', title: 'Export Data', desc: 'Download parcel data in PDF or CSV format' },
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
