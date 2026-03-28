import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '../badge';

const meta: Meta<typeof Badge> = {
  title: 'Design System/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: 'Active' },
};

export const Secondary: Story = {
  args: { children: 'Pending', variant: 'secondary' },
};

export const Destructive: Story = {
  args: { children: 'Overdue', variant: 'destructive' },
};

export const Outline: Story = {
  args: { children: 'Draft', variant: 'outline' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge>Active</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="destructive">Overdue</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
};

export const UseCases: Story = {
  name: 'Agricultural Use Cases',
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-gray-500 mb-2">Task Status</p>
        <div className="flex gap-2">
          <Badge>Completed</Badge>
          <Badge variant="secondary">In Progress</Badge>
          <Badge variant="destructive">Overdue</Badge>
          <Badge variant="outline">Scheduled</Badge>
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Parcel Health</p>
        <div className="flex gap-2">
          <Badge className="bg-green-600">Healthy</Badge>
          <Badge className="bg-yellow-500">Stress Detected</Badge>
          <Badge className="bg-red-600">Critical</Badge>
        </div>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Roles</p>
        <div className="flex gap-2">
          <Badge variant="outline">Admin</Badge>
          <Badge variant="outline">Farm Manager</Badge>
          <Badge variant="outline">Agronome</Badge>
          <Badge variant="outline">Worker</Badge>
        </div>
      </div>
    </div>
  ),
};
