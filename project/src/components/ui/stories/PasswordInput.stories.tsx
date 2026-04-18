import type { Meta, StoryObj } from '@storybook/react';
import { PasswordInput } from '../PasswordInput';
import { FormField } from '../FormField';

const meta: Meta<typeof PasswordInput> = {
  title: 'Design System/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {
  args: { placeholder: 'Enter password...' },
};

export const Invalid: Story = {
  args: { invalid: true, placeholder: 'Enter password...' },
};

export const WithFormField: Story = {
  render: () => (
    <div className="w-80 space-y-4">
      <FormField label="Password" required>
        <PasswordInput placeholder="Enter password..." />
      </FormField>
      <FormField label="Confirm Password" error="Passwords don't match" required>
        <PasswordInput invalid placeholder="Confirm..." />
      </FormField>
    </div>
  ),
};
