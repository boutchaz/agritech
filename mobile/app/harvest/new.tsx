import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCreateHarvest } from '@/hooks/useHarvests';
import { useFarms, useParcels } from '@/hooks/useFarms';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';

type QualityGrade = 'A' | 'B' | 'C';

interface FormData {
  farmId: string;
  parcelId: string;
  quantity: string;
  unit: string;
  qualityGrade: QualityGrade;
  notes: string;
  photos: string[];
  location: {
    lat: number;
    lng: number;
  } | null;
}

const UNITS = ['kg', 'tonnes', 'crates', 'boxes'];

export default function NewHarvestScreen() {
  const router = useRouter();
  const createHarvest = useCreateHarvest();
  const { data: farms, isLoading: farmsLoading } = useFarms();
  
  const [formData, setFormData] = useState<FormData>({
    farmId: '',
    parcelId: '',
    quantity: '',
    unit: 'kg',
    qualityGrade: 'A',
    notes: '',
    photos: [],
    location: null,
  });

  const { data: parcels, isLoading: parcelsLoading } = useParcels(formData.farmId || undefined);

  const updateForm = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (key === 'farmId') {
      setFormData((prev) => ({ ...prev, parcelId: '' }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      updateForm('photos', [...formData.photos, result.assets[0].uri]);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5 - formData.photos.length,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      updateForm('photos', [...formData.photos, ...newPhotos].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    updateForm(
      'photos',
      formData.photos.filter((_, i) => i !== index)
    );
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location permission is needed');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    updateForm('location', {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    });
  };

  const handleSubmit = async () => {
    if (!formData.farmId) {
      Alert.alert('Error', 'Please select a farm');
      return;
    }
    if (!formData.parcelId) {
      Alert.alert('Error', 'Please select a parcel');
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      await createHarvest.mutateAsync({
        farm_id: formData.farmId,
        parcel_id: formData.parcelId,
        harvest_date: new Date().toISOString().split('T')[0],
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        quality_grade: formData.qualityGrade,
        notes: formData.notes || undefined,
        photoUris: formData.photos.length > 0 ? formData.photos : undefined,
        location: formData.location || undefined,
      });

      Alert.alert('Success', 'Harvest record saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save harvest record';
      Alert.alert('Error', message);
    }
  };

  const isSubmitting = createHarvest.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Record Harvest',
          headerRight: () => (
            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Farm & Parcel</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Select Farm *</Text>
              {farmsLoading ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <View style={styles.pickerContainer}>
                  {farms?.map((farm) => (
                    <TouchableOpacity
                      key={farm.id}
                      style={[
                        styles.pickerOption,
                        formData.farmId === farm.id && styles.pickerOptionSelected,
                      ]}
                      onPress={() => updateForm('farmId', farm.id)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.farmId === farm.id && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {farm.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {formData.farmId && (
                <>
                  <Text style={[styles.label, { marginTop: spacing.md }]}>Select Parcel *</Text>
                  {parcelsLoading ? (
                    <ActivityIndicator size="small" color={colors.primary[600]} />
                  ) : (
                    <View style={styles.pickerContainer}>
                      {parcels?.map((parcel) => (
                        <TouchableOpacity
                          key={parcel.id}
                          style={[
                            styles.pickerOption,
                            formData.parcelId === parcel.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => updateForm('parcelId', parcel.id)}
                        >
                          <Text
                            style={[
                              styles.pickerOptionText,
                              formData.parcelId === parcel.id && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {parcel.name}
                            {parcel.current_crop && ` - ${parcel.current_crop}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Harvest Details</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.quantity}
                    onChangeText={(text) => updateForm('quantity', text)}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Unit</Text>
                  <View style={styles.unitPicker}>
                    {UNITS.map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitOption,
                          formData.unit === unit && styles.unitOptionSelected,
                        ]}
                        onPress={() => updateForm('unit', unit)}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            formData.unit === unit && styles.unitTextSelected,
                          ]}
                        >
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Quality Grade</Text>
              <View style={styles.gradeContainer}>
                {(['A', 'B', 'C'] as QualityGrade[]).map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[
                      styles.gradeOption,
                      formData.qualityGrade === grade && styles.gradeOptionSelected,
                    ]}
                    onPress={() => updateForm('qualityGrade', grade)}
                  >
                    <Text
                      style={[
                        styles.gradeText,
                        formData.qualityGrade === grade && styles.gradeTextSelected,
                      ]}
                    >
                      Grade {grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.card}>
              <View style={styles.photoGrid}>
                {formData.photos.map((photo) => (
                  <View key={photo} style={styles.photoItem}>
                     <Image source={{ uri: photo }} style={styles.photoImage} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
                {formData.photos.length < 5 && (
                  <View style={styles.photoActions}>
                    <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                      <Ionicons name="camera" size={24} color={colors.primary[600]} />
                      <Text style={styles.photoButtonText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                      <Ionicons name="images" size={24} color={colors.primary[600]} />
                      <Text style={styles.photoButtonText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location & Notes</Text>
            <View style={styles.card}>
              <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
                <Ionicons
                  name={formData.location ? 'checkmark-circle' : 'location'}
                  size={20}
                  color={formData.location ? colors.primary[600] : colors.gray[600]}
                />
                <Text style={styles.locationButtonText}>
                  {formData.location
                    ? `${formData.location.lat.toFixed(4)}, ${formData.location.lng.toFixed(4)}`
                    : 'Add GPS Location'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => updateForm('notes', text)}
                placeholder="Add any notes about this harvest..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  saveButton: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  inputHalf: {
    flex: 1,
    marginRight: spacing.sm,
  },
  pickerContainer: {
    marginTop: spacing.xs,
  },
  pickerOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  pickerOptionText: {
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  pickerOptionTextSelected: {
    color: colors.primary[700],
    fontWeight: '500',
  },
  unitPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitOption: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  unitOptionSelected: {
    backgroundColor: colors.primary[600],
  },
  unitText: {
    fontSize: fontSize.sm,
    color: colors.gray[600],
  },
  unitTextSelected: {
    color: colors.white,
    fontWeight: '500',
  },
  gradeContainer: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  gradeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    marginRight: spacing.xs,
  },
  gradeOptionSelected: {
    backgroundColor: colors.primary[600],
  },
  gradeText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    color: colors.gray[600],
  },
  gradeTextSelected: {
    color: colors.white,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photoItem: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.red[500],
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
  },
  photoButton: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  photoButtonText: {
    fontSize: fontSize.xs,
    color: colors.primary[600],
    marginTop: spacing.xs,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  locationButtonText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
});
