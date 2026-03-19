import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/constants/theme';

export default function MiscLayout() {
  const { t } = useTranslation('navigation');

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary[600] },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('domains.misc') }} />
    </Stack>
  );
}
