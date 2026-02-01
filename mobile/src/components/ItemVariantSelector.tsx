import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, X, Package } from 'lucide-react-native';

interface ProductVariant {
  id: string;
  variant_name: string;
  variant_sku?: string;
  quantity: number;
  unit: string;
  standard_rate?: number;
  last_purchase_rate?: number;
  is_active: boolean;
}

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  default_unit?: string;
  has_variants?: boolean;
}

interface ItemVariantSelectorProps {
  organizationId: string;
  itemId: string | null;
  variantId: string | null;
  onItemChange: (itemId: string | null) => void;
  onVariantChange: (variantId: string | null) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  showPricing?: boolean;
}

/**
 * ItemVariantSelector - A combined component for selecting items and their variants (Mobile)
 *
 * Features:
 * - Searchable item dropdown with modal
 * - Auto-loads variants when item is selected
 * - Shows variant stock levels and pricing
 * - Handles items without variants gracefully
 */
export function ItemVariantSelector({
  organizationId,
  itemId,
  variantId,
  onItemChange,
  onVariantChange,
  disabled = false,
  error,
  placeholder = 'Select an item...',
  showPricing = true,
}: ItemVariantSelectorProps) {
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // Fetch items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['items', organizationId, itemSearch],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/items?organization_id=${organizationId}${itemSearch ? `&search=${encodeURIComponent(itemSearch)}` : ''}&limit=50`
      );
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch variants when item is selected
  const { data: variants, isLoading: variantsLoading } = useQuery({
    queryKey: ['item-variants', organizationId, itemId],
    queryFn: async () => {
      if (!itemId) return [];
      const response = await fetch(
        `/api/v1/items/${itemId}/variants?organization_id=${organizationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch variants');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!itemId && !!organizationId,
  });

  const selectedItem = items?.find((i: Item) => i.id === itemId);
  const hasVariants = selectedItem?.has_variants || (variants && variants.length > 0);
  const selectedVariant = variants?.find((v: ProductVariant) => v.id === variantId);

  // Reset variant when item changes
  useEffect(() => {
    if (itemId && !hasVariants) {
      onVariantChange(null);
    }
  }, [itemId, hasVariants, onVariantChange]);

  const handleItemSelect = (item: Item) => {
    onItemChange(item.id);
    onVariantChange(null);
    setItemModalVisible(false);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    onVariantChange(variant.id);
    setVariantModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Item Selection */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Item</Text>
        <TouchableOpacity
          style={[styles.selectButton, disabled && styles.disabledButton]}
          onPress={() => !disabled && setItemModalVisible(true)}
          disabled={disabled}
        >
          <Text style={styles.selectText} numberOfLines={1}>
            {selectedItem ? `${selectedItem.item_code} - ${selectedItem.item_name}` : placeholder}
          </Text>
          {itemsLoading ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <ChevronDown size={20} color="#6b7280" />
          )}
        </TouchableOpacity>
      </View>

      {/* Variant Selection - Only show if item has variants */}
      {hasVariants && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Variant</Text>
          <TouchableOpacity
            style={[styles.selectButton, disabled && styles.disabledButton]}
            onPress={() => !disabled && setVariantModalVisible(true)}
            disabled={disabled}
          >
            <Text style={styles.selectText} numberOfLines={1}>
              {selectedVariant ? selectedVariant.variant_name : 'Select a variant...'}
            </Text>
            {variantsLoading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <ChevronDown size={20} color="#6b7280" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Variant Info Display */}
      {selectedVariant && showPricing && (
        <View style={styles.variantInfo}>
          {selectedVariant.standard_rate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Standard Rate:</Text>
              <Text style={styles.infoValue}>
                {parseFloat(selectedVariant.standard_rate).toFixed(2)} MAD
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Stock:</Text>
            <Text style={[
              styles.infoValue,
              selectedVariant.quantity <= 0 ? styles.outOfStock :
              selectedVariant.quantity <= 10 ? styles.lowStock :
              styles.inStock
            ]}>
              {selectedVariant.quantity} {selectedVariant.unit}
            </Text>
          </View>
        </View>
      )}

      {/* Error Display */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Item Selection Modal */}
      <Modal
        visible={itemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setItemModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setItemModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Item</Text>
                  <TouchableOpacity onPress={() => setItemModalVisible(false)}>
                    <X size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                  <Package size={20} color="#9ca3af" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search items..."
                    value={itemSearch}
                    onChangeText={setItemSearch}
                    autoCapitalize="none"
                  />
                </View>

                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.listItem}
                      onPress={() => handleItemSelect(item)}
                    >
                      <Text style={styles.listItemPrimary}>{item.item_name}</Text>
                      <Text style={styles.listItemSecondary}>{item.item_code}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        {itemSearch ? 'No items found' : 'No items available'}
                      </Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Variant Selection Modal */}
      <Modal
        visible={variantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVariantModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVariantModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Variant</Text>
                  <TouchableOpacity onPress={() => setVariantModalVisible(false)}>
                    <X size={24} color="#374151" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={variants}
                  keyExtractor={(variant) => variant.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.listItem,
                        (!item.is_active || item.quantity <= 0) && styles.disabledItem
                      ]}
                      onPress={() => item.is_active && item.quantity > 0 && handleVariantSelect(item)}
                      disabled={!item.is_active || item.quantity <= 0}
                    >
                      <View style={styles.variantItemContent}>
                        <Text style={styles.listItemPrimary}>{item.variant_name}</Text>
                        {item.variant_sku && (
                          <Text style={styles.listItemSecondary}>SKU: {item.variant_sku}</Text>
                        )}
                        <View style={styles.variantMeta}>
                          <Text style={[
                            styles.stockText,
                            item.quantity <= 0 ? styles.outOfStock :
                            item.quantity <= 10 ? styles.lowStock :
                            styles.inStock
                          ]}>
                            Stock: {item.quantity} {item.unit}
                          </Text>
                          {!item.is_active && (
                            <Text style={styles.inactiveText}>Inactive</Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No variants available</Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

/**
 * InlineVariantSelector - A compact version for use in forms (Mobile)
 */
interface InlineVariantSelectorProps {
  organizationId: string;
  itemId: string;
  value: string | null;
  onChange: (variantId: string | null) => void;
  disabled?: boolean;
  error?: string;
  showStock?: boolean;
}

export function InlineVariantSelector({
  organizationId,
  itemId,
  value,
  onChange,
  disabled = false,
  error,
  showStock = true,
}: InlineVariantSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const { data: variants, isLoading } = useQuery({
    queryKey: ['item-variants', organizationId, itemId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/items/${itemId}/variants?organization_id=${organizationId}`
      );
      if (!response.ok) throw new Error('Failed to fetch variants');
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!itemId && !!organizationId,
  });

  const selectedVariant = variants?.find((v: ProductVariant) => v.id === value);

  if (!variants || variants.length === 0) {
    return <Text style={styles.noVariantsText}>No variants available</Text>;
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.inlineSelectButton, error && styles.inlineError, disabled && styles.disabledButton]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.inlineSelectText} numberOfLines={1}>
          {selectedVariant ? selectedVariant.variant_name : 'Select variant...'}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#6366f1" />
        ) : (
          <ChevronDown size={16} color="#6b7280" />
        )}
      </TouchableOpacity>

      {selectedVariant && showStock && (
        <Text style={styles.stockHint}>
          {selectedVariant.quantity} {selectedVariant.unit} available
        </Text>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.smallModalContent}>
                <FlatList
                  data={variants}
                  keyExtractor={(variant) => variant.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.listItem,
                        !item.is_active && styles.disabledItem
                      ]}
                      onPress={() => {
                        onChange(item.id);
                        setModalVisible(false);
                      }}
                      disabled={!item.is_active}
                    >
                      <Text style={styles.listItemPrimary}>{item.variant_name}</Text>
                      {showStock && (
                        <Text style={styles.listItemSecondary}>
                          Stock: {item.quantity} {item.unit}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  fieldContainer: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  variantInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  inStock: {
    color: '#059669',
  },
  lowStock: {
    color: '#d97706',
  },
  outOfStock: {
    color: '#dc2626',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 16,
  },
  smallModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  disabledItem: {
    opacity: 0.5,
  },
  variantItemContent: {
    gap: 4,
  },
  listItemPrimary: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  listItemSecondary: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  variantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inactiveText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },

  // Inline styles
  inlineSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 38,
  },
  inlineError: {
    borderColor: '#dc2626',
  },
  inlineSelectText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  stockHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  noVariantsText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
