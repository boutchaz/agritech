import type { Meta, StoryObj } from '@storybook/react';
import { Label } from '../label';
import { Input } from '../Input';

const meta: Meta<typeof Label> = {
  title: 'Design System/Label',
  component: Label,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: { children: 'Farm Name' },
};

export const WithInput: Story = {
  render: () => (
    <div className="w-64 space-y-1.5">
      <Label htmlFor="name">Farm Name</Label>
      <Input id="name" placeholder="e.g., Ferme Al Baraka" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <div className="w-64 space-y-1.5">
      <Label htmlFor="name">
        Farm Name <span className="text-red-500">*</span>
      </Label>
      <Input id="name" placeholder="Required" />
    </div>
  ),
};
