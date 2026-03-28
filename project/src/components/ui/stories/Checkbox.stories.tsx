import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../checkbox';
import { Label } from '../label';

const meta: Meta<typeof Checkbox> = {
  title: 'Design System/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    checked: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const TaskList: Story = {
  name: 'Task Checklist (Domain)',
  render: () => (
    <div className="space-y-3">
      {[
        { id: 'task1', label: 'Irrigation parcelle B3', checked: true },
        { id: 'task2', label: 'Traitement phytosanitaire A1', checked: true },
        { id: 'task3', label: 'Récolte blé zone Nord', checked: false },
        { id: 'task4', label: 'Analyse sol parcelle C2', checked: false },
      ].map((task) => (
        <div key={task.id} className="flex items-center space-x-2">
          <Checkbox id={task.id} defaultChecked={task.checked} />
          <Label
            htmlFor={task.id}
            className={task.checked ? 'line-through text-gray-400' : ''}
          >
            {task.label}
          </Label>
        </div>
      ))}
    </div>
  ),
};
