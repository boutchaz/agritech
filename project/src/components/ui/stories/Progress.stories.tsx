import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '../progress';

const meta: Meta<typeof Progress> = {
  title: 'Design System/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 60 },
};

export const Empty: Story = {
  args: { value: 0 },
};

export const Full: Story = {
  args: { value: 100 },
};

export const WithLabels: Story = {
  name: 'Task Progress (Domain)',
  render: () => (
    <div className="w-80 space-y-4">
      {[
        { label: 'Irrigation Zone A', value: 100 },
        { label: 'Harvest Zone B', value: 65 },
        { label: 'Soil Analysis', value: 30 },
        { label: 'Planting Season', value: 10 },
      ].map((task) => (
        <div key={task.label} className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">{task.label}</span>
            <span className="text-gray-500">{task.value}%</span>
          </div>
          <Progress value={task.value} className="h-2" />
        </div>
      ))}
    </div>
  ),
};
