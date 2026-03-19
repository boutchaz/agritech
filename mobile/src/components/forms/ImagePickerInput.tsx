import { useCallback } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoImagePicker from 'expo-image-picker';
import type { Control, FieldValues, Path } from 'react-hook-form';

import { borderRadius, colors, fontSize, fontWeight, spacing } from '@/constants/theme';

import { FormField } from './FormField';

export interface ImagePickerInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  multiple?: boolean;
  maxImages?: number;
  aspect?: [number, number];
  testID?: string;
}

function getImageUris(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function trimSelection(uris: string[], multiple: boolean, maxImages: number): string[] {
  if (!multiple) {
    return uris.slice(0, 1);
  }

  return uris.slice(0, maxImages);
}

export function ImagePickerInput<T extends FieldValues>({
  name,
  control,
  label,
  multiple = false,
  maxImages,
  aspect,
  testID,
}: ImagePickerInputProps<T>) {
  const effectiveMax = multiple ? Math.max(1, maxImages ?? 5) : 1;

  const showSourcePicker = useCallback(
    async (currentImages: string[], onChange: (value: string[]) => void) => {
      const launchCamera = async () => {
        try {
          const { status } = await ExpoImagePicker.requestCameraPermissionsAsync();

          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
            return;
          }

          const result = await ExpoImagePicker.launchCameraAsync({
            allowsEditing: !multiple,
            aspect,
            mediaTypes: 'images',
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            const nextImages = trimSelection([...currentImages, result.assets[0].uri], multiple, effectiveMax);
            onChange(nextImages);
          }
        } catch (error) {
          console.error('Failed to open camera:', error);
          Alert.alert('Image Error', 'Unable to open the camera right now.');
        }
      };

      const launchLibrary = async () => {
        try {
          const result = await ExpoImagePicker.launchImageLibraryAsync({
            allowsEditing: !multiple,
            allowsMultipleSelection: multiple,
            aspect,
            mediaTypes: 'images',
            quality: 0.8,
            selectionLimit: Math.max(1, effectiveMax - currentImages.length),
          });

          if (!result.canceled) {
            const nextUris = result.assets.map((asset) => asset.uri);
            const nextImages = trimSelection([...currentImages, ...nextUris], multiple, effectiveMax);
            onChange(nextImages);
          }
        } catch (error) {
          console.error('Failed to open gallery:', error);
          Alert.alert('Image Error', 'Unable to open the photo library right now.');
        }
      };

      Alert.alert('Add image', 'Choose image source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => void launchCamera() },
        { text: 'Gallery', onPress: () => void launchLibrary() },
      ]);
    },
    [aspect, effectiveMax, multiple],
  );

  return (
    <FormField<T>
      name={name}
      control={control}
      label={label}
      helperText={multiple ? `Add up to ${effectiveMax} images.` : 'Add one image.'}
    >
      {({ field, fieldState }) => {
        const imageUris = getImageUris(field.value);

        return (
          <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
              <View style={styles.previewRow}>
                {imageUris.map((uri) => (
                  <View key={uri} style={styles.imageCard}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <Pressable
                      onPress={() => field.onChange(imageUris.filter((imageUri) => imageUri !== uri))}
                      style={styles.removeButton}
                    >
                      <Ionicons color={colors.white} name="close" size={14} />
                    </Pressable>
                  </View>
                ))}

                {imageUris.length === 0 ? (
                  <View style={[styles.emptyState, fieldState.error && styles.emptyStateError]}>
                    <Ionicons color={colors.gray[400]} name="image-outline" size={28} />
                    <Text style={styles.emptyStateText}>No images selected</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => void showSourcePicker(imageUris, field.onChange)}
              style={[styles.actionButton, fieldState.error && styles.actionButtonError]}
              testID={testID}
            >
              <Ionicons color={colors.primary[700]} name="camera-outline" size={18} />
              <Text style={styles.actionButtonText}>
                {imageUris.length === 0 ? 'Add image' : multiple ? 'Add more images' : 'Replace image'}
              </Text>
            </Pressable>
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
  previewScroll: {
    minHeight: 100,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  imageCard: {
    borderRadius: borderRadius.lg,
    height: 96,
    overflow: 'hidden',
    position: 'relative',
    width: 96,
  },
  imagePreview: {
    backgroundColor: colors.gray[100],
    height: '100%',
    width: '100%',
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: colors.red[600],
    borderRadius: borderRadius.full,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.xs,
    top: spacing.xs,
    width: 24,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.xs,
    height: 96,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    width: 160,
  },
  emptyStateError: {
    borderColor: colors.red[600],
  },
  emptyStateText: {
    color: colors.gray[500],
    fontSize: fontSize.sm,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  actionButtonError: {
    borderColor: colors.red[600],
  },
  actionButtonText: {
    color: colors.primary[700],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
