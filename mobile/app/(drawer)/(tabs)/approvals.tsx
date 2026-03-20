import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/constants/tokens';

export default function ApprovalsScreen() {
  return (
    <View style={styles.container}>
      <PageHeader title="Approvals" showBack={false} />
      <View style={styles.body}>
        <Ionicons name="checkmark-done-outline" size={56} color={palette.primary + '33'} />
        <Text style={styles.title}>Approvals</Text>
        <Text style={styles.subtitle}>Pending approvals, task completions, harvest validation</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '900', color: palette.primary, marginTop: 16, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: palette.onSurfaceVariant, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
