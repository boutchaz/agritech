import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  StatCardSkeleton,
  ParcelCardSkeleton,
  TaskCardSkeleton,
  WidgetSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
  ChartSkeleton,
  StatsGridSkeleton,
} from '../skeleton';

const meta: Meta = {
  title: 'Design System/Skeleton',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Basic: Story = {
  render: () => (
    <div className="space-y-3 w-64">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  ),
};

export const StatCards: Story = {
  name: 'Stat Card Skeleton',
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  ),
};

export const ParcelCards: Story = {
  name: 'Parcel Card Skeleton',
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-[600px]">
      <ParcelCardSkeleton />
      <ParcelCardSkeleton />
    </div>
  ),
};

export const TaskCards: Story = {
  name: 'Task Card Skeleton',
  render: () => (
    <div className="w-80 space-y-3">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  ),
};

export const Widget: Story = {
  render: () => <WidgetSkeleton className="w-80" />,
};

export const TableRows: Story = {
  name: 'Table Row Skeleton',
  render: () => (
    <div className="w-[600px] border rounded-lg">
      <TableRowSkeleton columns={4} />
      <TableRowSkeleton columns={4} />
      <TableRowSkeleton columns={4} />
      <TableRowSkeleton columns={4} />
    </div>
  ),
};

export const ListItems: Story = {
  name: 'List Item Skeleton',
  render: () => (
    <div className="w-80 border rounded-lg divide-y">
      <ListItemSkeleton />
      <ListItemSkeleton />
      <ListItemSkeleton />
    </div>
  ),
};

export const Chart: Story = {
  render: () => <ChartSkeleton className="w-96" />,
};

export const FullDashboard: Story = {
  name: 'Dashboard Loading State',
  render: () => (
    <div className="space-y-6 w-[800px]">
      <StatsGridSkeleton count={3} />
      <div className="grid grid-cols-2 gap-6">
        <WidgetSkeleton lines={4} />
        <ChartSkeleton height="h-40" />
      </div>
    </div>
  ),
};
