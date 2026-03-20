import { StyleSheet, View, Text } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontSize, fontWeight } from '@/constants/theme';

export interface AvatarProps {
  uri?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  testID?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const textSizeMap = {
  sm: fontSize.xs,
  md: fontSize.sm,
  lg: fontSize.lg,
  xl: fontSize.xl,
};

/** expo-image cannot load web `blob:` URLs on native; avoid passing them as `uri`. */
function isRenderableRemoteUri(uri: string): boolean {
  const t = uri.trim().toLowerCase();
  if (!t) return false;
  if (t.startsWith('blob:') || t.startsWith('data:')) return false;
  return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('file://');
}

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return '--';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function Avatar({ uri, name, size = 'md', testID }: AvatarProps) {
  const dimension = sizeMap[size];

  return (
    <View
      testID={testID}
      style={[styles.container, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
    >
      {uri && isRenderableRemoteUri(uri) ? (
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.fallback, { borderRadius: dimension / 2 }]}>
          <Text style={[styles.initials, { fontSize: textSizeMap[size] }]}>{getInitials(name)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.gray[700],
    fontWeight: fontWeight.semibold,
  },
});
