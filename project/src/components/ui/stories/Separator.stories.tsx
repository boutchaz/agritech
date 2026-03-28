import type { Meta, StoryObj } from '@storybook/react';
import { Separator } from '../separator';

const meta: Meta<typeof Separator> = {
  title: 'Design System/Separator',
  component: Separator,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-80">
      <p className="text-sm font-medium">Farm Details</p>
      <Separator className="my-3" />
      <p className="text-sm text-gray-500">Parcel information below.</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center gap-3 h-8">
      <span className="text-sm">Parcels: 12</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Tasks: 8</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Workers: 24</span>
    </div>
  ),
};
