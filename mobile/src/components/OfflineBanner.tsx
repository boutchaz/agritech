import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { useTheme } from '@/providers/ThemeProvider';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const offlineMessage = `${t('offline.title', { defaultValue: 'You are offline' })}. ${t('offline.message', { defaultValue: 'Some features may be unavailable' })}`;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOffline(state.isConnected !== true);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top, backgroundColor: colors.error }]}>
      <Text style={styles.text}>{offlineMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingBottom: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
