import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

import { FormField } from './FormField';

type Coordinates = {
  lat: number;
  lng: number;
};

export interface LocationPickerInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  testID?: string;
}

function isCoordinates(value: unknown): value is Coordinates {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lat' in value &&
    'lng' in value &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number'
  );
}

function formatCoordinates(value: Coordinates | null): string {
  if (!value) {
    return 'Location not set';
  }

  return `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`;
}

export function LocationPickerInput<T extends FieldValues>({
  name,
  control,
  label,
  testID,
}: LocationPickerInputProps<T>) {
  const [isLocating, setIsLocating] = useState(false);

  return (
    <FormField<T> name={name} control={control} label={label} helperText="Use the device's current GPS position.">
      {({ field, fieldState }) => {
        const coordinates = isCoordinates(field.value) ? field.value : null;

        const handleGetLocation = async () => {
          try {
            setIsLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
              Alert.alert('Permission Required', 'Location permission is needed to fetch coordinates.');
              return;
            }

            const position = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });

            field.onChange({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          } catch (error) {
            console.error('Failed to fetch current location:', error);
            Alert.alert('Location Error', 'Unable to fetch the current location right now.');
          } finally {
            setIsLocating(false);
          }
        };

        return (
          <View style={styles.container}>
            <View style={[styles.locationCard, fieldState.error && styles.locationCardError]}>
              <Ionicons color={colors.primary[600]} name="location-outline" size={22} />
              <Text style={styles.coordinatesText}>{formatCoordinates(coordinates)}</Text>
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                disabled={isLocating}
                onPress={() => void handleGetLocation()}
                style={[styles.actionButton, isLocating && styles.actionButtonDisabled]}
                testID={testID}
              >
                {isLocating ? <ActivityIndicator color={colors.white} size="small" /> : null}
                <Text style={styles.primaryButtonText}>
                  {isLocating ? 'Fetching location...' : 'Get current location'}
                </Text>
              </Pressable>

              {coordinates ? (
                <Pressable onPress={() => field.onChange(null)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      }}
    </FormField>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  locationCard: {
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  locationCardError: {
    borderColor: colors.red[600],
  },
  coordinatesText: {
    color: colors.gray[800],
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  actionButtonDisabled: {
    opacity: 0.75,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colors.gray[700],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
