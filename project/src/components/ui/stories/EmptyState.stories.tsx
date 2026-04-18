import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from '../empty-state';
import { Building2, Inbox, ListTodo, MapPin, Sprout } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'Design System/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['card', 'table', 'full-page', 'inline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Card: Story = {
  args: {
    icon: Building2,
    title: 'No farms found',
    description: 'Get started by creating your first farm.',
    action: { label: 'Create Farm', onClick: () => {} },
    variant: 'card',
  },
};

export const Table: Story = {
  args: {
    icon: Inbox,
    description: 'No items match your filters.',
    variant: 'table',
  },
};

export const FullPage: Story = {
  args: {
    icon: Sprout,
    title: 'Welcome to AgroGina',
    description: 'Start by adding your first farm and parcels.',
    action: { label: 'Get Started', onClick: () => {} },
    secondaryAction: { label: 'Import Data', onClick: () => {} },
    variant: 'full-page',
  },
};

export const Inline: Story = {
  args: {
    icon: ListTodo,
    description: 'No tasks assigned yet.',
    variant: 'inline',
  },
};

export const DomainExamples: Story = {
  name: 'Agricultural Examples',
  render: () => (
    <div className="space-y-6 max-w-lg">
      <EmptyState
        icon={MapPin}
        title="No parcels"
        description="Add parcels to track crops, soil analysis, and satellite data."
        action={{ label: 'Add Parcel', onClick: () => {} }}
      />
      <EmptyState
        variant="table"
        icon={ListTodo}
        title="No tasks"
        description="Create tasks to coordinate your farm workers."
        action={{ label: 'Create Task', onClick: () => {} }}
      />
    </div>
  ),
};
