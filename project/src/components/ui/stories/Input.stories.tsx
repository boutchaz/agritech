import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../Input';
import { FormField } from '../FormField';

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Enter farm name...' },
};

export const WithValue: Story = {
  args: { defaultValue: 'Ferme Al Baraka', placeholder: 'Enter farm name...' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Disabled input', placeholder: 'Disabled' },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: '', placeholder: 'Required field' },
};

export const Number: Story = {
  args: { type: 'number', placeholder: 'Hectares...', defaultValue: '300' },
};

export const Search: Story = {
  args: { type: 'search', placeholder: 'Search parcels...' },
};

export const FileUpload: Story = {
  args: { type: 'file', accept: '.csv,.xlsx' },
};

export const WithFormField: Story = {
  name: 'With FormField Wrapper',
  render: () => (
    <div className="w-80 space-y-4">
      <FormField label="Farm Name" htmlFor="name" required>
        <Input id="name" placeholder="e.g., Ferme Al Baraka" />
      </FormField>
      <FormField label="Area (ha)" htmlFor="area" helper="Total cultivated area in hectares">
        <Input id="area" type="number" placeholder="300" />
      </FormField>
      <FormField label="Location" htmlFor="location" error="Location is required" required>
        <Input id="location" invalid placeholder="e.g., Meknes" />
      </FormField>
    </div>
  ),
};

export const States: Story = {
  name: 'All States',
  render: () => (
    <div className="w-80 space-y-3">
      <Input placeholder="Default" />
      <Input defaultValue="With value" />
      <Input disabled defaultValue="Disabled" />
      <Input invalid defaultValue="Invalid state" />
      <Input type="file" />
    </div>
  ),
};
