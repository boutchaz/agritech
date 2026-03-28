import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from '../Textarea';
import { FormField } from '../FormField';

const meta: Meta<typeof Textarea> = {
  title: 'Design System/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: { placeholder: 'Enter observation notes...' },
};

export const WithValue: Story = {
  args: { defaultValue: 'Parcelle B3: signes de stress hydrique détectés dans la zone est. Recommandation: augmenter la fréquence d\'irrigation.' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Read-only observation' },
};

export const Invalid: Story = {
  args: { invalid: true, placeholder: 'Required field' },
};

export const WithFormField: Story = {
  render: () => (
    <div className="w-96">
      <FormField label="Observation Notes" required error="Notes are required for compliance">
        <Textarea invalid placeholder="Describe field observations..." />
      </FormField>
    </div>
  ),
};
