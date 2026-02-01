import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ProductVariant {
  id: string;
  variant_name: string;
  variant_sku?: string;
  quantity: number;
  unit: string;
  standard_rate?: number;
  last_purchase_rate?: number;
  barcode?: string;
  is_active: boolean;
}

interface Item {
  id: string;
  item_code: string;
  item_name: string;
  default_unit?: string;
  has_variants: boolean;
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
 * ItemVariantSelector - A combined component for selecting items and their variants
 *
 * Features:
 * - Searchable item dropdown
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

  const handleItemChange = (value: string) => {
    const newItemId = value || null;
    onItemChange(newItemId);
    onVariantChange(null); // Reset variant when item changes
  };

  const handleVariantChange = (value: string) => {
    onVariantChange(value || null);
  };

  return (
    <div className="space-y-3">
      {/* Item Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Item
        </label>
        <select
          value={itemId || ''}
          onChange={(e) => handleItemChange(e.target.value)}
          disabled={disabled || itemsLoading}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        >
          <option value="">{placeholder}</option>
          {items?.map((item: Item) => (
            <option key={item.id} value={item.id}>
              {item.item_code} - {item.item_name}
            </option>
          ))}
        </select>
        {itemsLoading && (
          <p className="mt-1 text-xs text-gray-500">Loading items...</p>
        )}
      </div>

      {/* Variant Selection - Only show if item has variants */}
      {hasVariants && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Variant
          </label>
          <select
            value={variantId || ''}
            onChange={(e) => handleVariantChange(e.target.value)}
            disabled={disabled || variantsLoading}
            className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          >
            <option value="">Select a variant...</option>
            {variants?.map((variant: ProductVariant) => (
              <option
                key={variant.id}
                value={variant.id}
                disabled={!variant.is_active || variant.quantity <= 0}
              >
                {variant.variant_name}
                {variant.variant_sku && ` (${variant.variant_sku})`}
                {!variant.is_active && ' [Inactive]'}
                {variant.quantity <= 0 && ' [Out of Stock]'}
                {variant.quantity > 0 && variant.quantity <= 10 && ` [Low: ${variant.quantity}]`}
              </option>
            ))}
          </select>
          {variantsLoading && (
            <p className="mt-1 text-xs text-gray-500">Loading variants...</p>
          )}
        </div>
      )}

      {/* Variant Info Display */}
      {selectedVariant && showPricing && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Variant:</span>
              <span className="ml-2 font-medium">{selectedVariant.variant_name}</span>
            </div>
            <div>
              <span className="text-gray-500">Unit:</span>
              <span className="ml-2 font-medium">{selectedVariant.unit}</span>
            </div>
            {selectedVariant.standard_rate && (
              <div>
                <span className="text-gray-500">Standard Rate:</span>
                <span className="ml-2 font-medium">
                  {parseFloat(selectedVariant.standard_rate).toFixed(2)} MAD
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Stock:</span>
              <span className={`ml-2 font-medium ${
                selectedVariant.quantity <= 0 ? 'text-red-600' :
                selectedVariant.quantity <= 10 ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {selectedVariant.quantity} {selectedVariant.unit}
              </span>
            </div>
            {selectedVariant.barcode && (
              <div className="col-span-2">
                <span className="text-gray-500">Barcode:</span>
                <span className="ml-2">{selectedVariant.barcode}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

/**
 * InlineVariantSelector - A compact version for use in tables or forms
 * Shows variant dropdown for a specific item
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
    return (
      <span className="text-sm text-gray-500">No variants available</span>
    );
  }

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || isLoading}
        className={`text-sm px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100' : 'bg-white'}`}
      >
        <option value="">Select variant...</option>
        {variants.map((variant: ProductVariant) => (
          <option
            key={variant.id}
            value={variant.id}
            disabled={!variant.is_active}
          >
            {variant.variant_name}
            {showStock && ` (Stock: ${variant.quantity})`}
            {!variant.is_active && ' [Inactive]'}
          </option>
        ))}
      </select>
      {isLoading && (
        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          Loading...
        </span>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {selectedVariant && (
        <p className="mt-1 text-xs text-gray-500">
          {selectedVariant.quantity} {selectedVariant.unit} available
        </p>
      )}
    </div>
  );
}
