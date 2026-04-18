import type { Meta, StoryObj } from '@storybook/react';
import { NativeSelect } from '../NativeSelect';
import { FormField } from '../FormField';

const meta: Meta<typeof NativeSelect> = {
  title: 'Design System/NativeSelect',
  component: NativeSelect,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof NativeSelect>;

export const Default: Story = {
  render: () => (
    <NativeSelect className="w-64">
      <option value="">Select crop type...</option>
      <option value="wheat">Blé tendre</option>
      <option value="olive">Olivier</option>
      <option value="citrus">Agrumes</option>
      <option value="corn">Maïs</option>
    </NativeSelect>
  ),
};

export const Disabled: Story = {
  render: () => (
    <NativeSelect disabled className="w-64">
      <option>Disabled select</option>
    </NativeSelect>
  ),
};

export const Invalid: Story = {
  render: () => (
    <NativeSelect invalid className="w-64">
      <option value="">Select required...</option>
    </NativeSelect>
  ),
};

export const WithFormField: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <FormField label="Crop Type" required>
        <NativeSelect>
          <option value="">Select...</option>
          <option value="wheat">Blé tendre</option>
          <option value="olive">Olivier</option>
          <option value="citrus">Agrumes</option>
        </NativeSelect>
      </FormField>
      <FormField label="Irrigation" required error="Please select irrigation type">
        <NativeSelect invalid>
          <option value="">Select...</option>
          <option value="drip">Goutte-à-goutte</option>
          <option value="sprinkler">Aspersion</option>
          <option value="flood">Gravitaire</option>
        </NativeSelect>
      </FormField>
    </div>
  ),
};
