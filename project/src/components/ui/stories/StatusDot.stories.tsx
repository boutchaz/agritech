import type { Meta, StoryObj } from '@storybook/react';
import { StatusDot } from '../status-dot';

const meta: Meta<typeof StatusDot> = {
  title: 'Design System/StatusDot',
  component: StatusDot,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['gray', 'green', 'red', 'yellow', 'amber', 'blue', 'orange', 'primary'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pulse: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof StatusDot>;

export const Default: Story = {
  args: { color: 'green', size: 'md' },
};

export const AllColors: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2"><StatusDot color="gray" /> Gray</div>
      <div className="flex items-center gap-2"><StatusDot color="green" /> Green</div>
      <div className="flex items-center gap-2"><StatusDot color="red" /> Red</div>
      <div className="flex items-center gap-2"><StatusDot color="yellow" /> Yellow</div>
      <div className="flex items-center gap-2"><StatusDot color="amber" /> Amber</div>
      <div className="flex items-center gap-2"><StatusDot color="blue" /> Blue</div>
      <div className="flex items-center gap-2"><StatusDot color="orange" /> Orange</div>
      <div className="flex items-center gap-2"><StatusDot color="primary" /> Primary</div>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2"><StatusDot size="sm" color="green" /> Small</div>
      <div className="flex items-center gap-2"><StatusDot size="md" color="green" /> Medium</div>
      <div className="flex items-center gap-2"><StatusDot size="lg" color="green" /> Large</div>
    </div>
  ),
};

export const Pulsing: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <StatusDot color="blue" pulse /> Syncing...
    </div>
  ),
};

export const TaskStatus: Story = {
  name: 'Task Status Legend',
  render: () => (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2"><StatusDot color="gray" /> Pending</div>
      <div className="flex items-center gap-2"><StatusDot color="amber" /> In Progress</div>
      <div className="flex items-center gap-2"><StatusDot color="green" /> Completed</div>
      <div className="flex items-center gap-2"><StatusDot color="red" /> Overdue</div>
    </div>
  ),
};
