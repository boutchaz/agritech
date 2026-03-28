import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from '../FormField';
import { Input } from '../Input';
import { Textarea } from '../Textarea';
import { NativeSelect } from '../NativeSelect';

const meta: Meta<typeof FormField> = {
  title: 'Design System/FormField',
  component: FormField,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  render: () => (
    <div className="w-80">
      <FormField label="Farm Name" htmlFor="name">
        <Input id="name" placeholder="e.g., Ferme Al Baraka" />
      </FormField>
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="w-80">
      <FormField label="Farm Name" htmlFor="name" required>
        <Input id="name" placeholder="Required field" />
      </FormField>
    </div>
  ),
};

export const WithHelper: Story = {
  render: () => (
    <div className="w-80">
      <FormField label="Area" htmlFor="area" helper="Total cultivated area in hectares">
        <Input id="area" type="number" placeholder="300" />
      </FormField>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="w-80">
      <FormField label="Farm Name" htmlFor="name" required error="Farm name is required">
        <Input id="name" invalid />
      </FormField>
    </div>
  ),
};

export const CompleteForm: Story = {
  name: 'Full Form Example',
  render: () => (
    <div className="w-96 space-y-4">
      <FormField label="Parcel Name" required>
        <Input placeholder="e.g., Parcelle B3" />
      </FormField>
      <FormField label="Area (ha)" helper="Enter area in hectares">
        <Input type="number" placeholder="12.5" />
      </FormField>
      <FormField label="Crop Type" required>
        <NativeSelect>
          <option value="">Select crop...</option>
          <option value="wheat">Blé tendre</option>
          <option value="olive">Olivier</option>
          <option value="citrus">Agrumes</option>
        </NativeSelect>
      </FormField>
      <FormField label="Notes" helper="Optional field observations">
        <Textarea placeholder="Describe the parcel..." />
      </FormField>
      <FormField label="GPS Coordinates" error="Invalid coordinates format" required>
        <Input invalid placeholder="33.8935, -5.5473" />
      </FormField>
    </div>
  ),
};
