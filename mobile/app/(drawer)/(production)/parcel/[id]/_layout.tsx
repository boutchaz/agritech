import { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Slot } from 'expo-router';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';
import { useParcel, useFarm } from '@/hooks/useFarms';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type ParcelTab = {
  key: string;
  label: string;
  icon: IconName;
  route: string;
};

const PARCEL_TABS: ParcelTab[] = [
  { key: 'index', label: 'Overview', icon: 'grid-outline', route: '' },
  { key: 'agromind', label: 'Agromind IA', icon: 'sparkles-outline', route: '/agromind' },
  { key: 'soil', label: 'Analysis', icon: 'flask-outline', route: '/soil' },
  { key: 'satellite', label: 'Satellite', icon: 'globe-outline', route: '/satellite' },
  { key: 'weather', label: 'Weather', icon: 'cloud-outline', route: '/weather' },
  { key: 'production', label: 'Production', icon: 'leaf-outline', route: '/production' },
  { key: 'profitability', label: 'Profitability', icon: 'trending-up-outline', route: '/profitability' },
  { key: 'reports', label: 'Reports', icon: 'document-text-outline', route: '/reports' },
];

export default function ParcelDetailLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const { data: parcel, isLoading } = useParcel(id);
  const { data: farm } = useFarm(parcel?.farm_id || '');

  // Determine active tab from pathname
  const activeTab = PARCEL_TABS.find((tab) => {
    if (tab.route === '') {
      // index matches when pathname ends with the id or /index
      return pathname.endsWith(`/${id}`) || pathname.endsWith('/index');
    }
    return pathname.endsWith(tab.route);
  })?.key ?? 'index';

  if (isLoading && !parcel) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={themeColors.brandPrimary} />
        </View>
      </View>
    );
  }

  const statusColor =
    parcel?.status === 'active'
      ? themeColors.success
      : parcel?.status === 'fallow'
        ? themeColors.warning
        : themeColors.textTertiary;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: themeColors.background }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {parcel?.name ?? 'Parcel'}
          </Text>
          <View style={styles.headerMeta}>
            {farm && (
              <Text style={[styles.headerFarm, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {farm.name}
              </Text>
            )}
            {parcel && (
              <View style={[styles.statusPill, { backgroundColor: statusColor + '1A' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{parcel.status}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Scrollable tab bar */}
      <View style={[styles.tabBarContainer, { borderBottomColor: themeColors.outlineVariant }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {PARCEL_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabItem,
                  isActive && [styles.tabItemActive, { borderBottomColor: themeColors.brandPrimary }],
                ]}
                onPress={() => {
                  const target = tab.route === ''
                    ? `/(drawer)/(production)/parcel/${id}`
                    : `/(drawer)/(production)/parcel/${id}${tab.route}`;
                  router.replace(target as any);
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? (tab.icon.replace('-outline', '') as IconName) : tab.icon}
                  size={18}
                  color={isActive ? themeColors.brandPrimary : themeColors.iconSubtle}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? themeColors.brandPrimary : themeColors.textTertiary,
                      fontWeight: isActive ? '600' : '400',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab content */}
      <Slot />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  headerFarm: {
    fontSize: 13,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tabBarContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 13,
  },
});
