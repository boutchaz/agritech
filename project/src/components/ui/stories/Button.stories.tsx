import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../button';
import { Plus, Trash2, Download, Loader2, ChevronRight } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'orange', 'purple', 'green', 'blue', 'amber'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
    asChild: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Button' },
};

export const Destructive: Story = {
  args: { children: 'Delete', variant: 'destructive' },
};

export const Outline: Story = {
  args: { children: 'Outline', variant: 'outline' },
};

export const Secondary: Story = {
  args: { children: 'Secondary', variant: 'secondary' },
};

export const Ghost: Story = {
  args: { children: 'Ghost', variant: 'ghost' },
};

export const Link: Story = {
  args: { children: 'Link', variant: 'link' },
};

export const Small: Story = {
  args: { children: 'Small', size: 'sm' },
};

export const Large: Story = {
  args: { children: 'Large', size: 'lg' },
};

export const Icon: Story = {
  args: { size: 'icon', children: <Plus className="h-4 w-4" /> },
};

export const WithIcon: Story = {
  args: { children: <><Plus className="h-4 w-4" /> Create Farm</> },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

export const Loading: Story = {
  args: {
    children: <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>,
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Button>Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Button variant="orange">Orange</Button>
        <Button variant="purple">Purple</Button>
        <Button variant="green">Green</Button>
        <Button variant="blue">Blue</Button>
        <Button variant="amber">Amber</Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon"><Plus className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Button><Plus className="h-4 w-4" /> Add Item</Button>
        <Button variant="destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
        <Button variant="outline"><Download className="h-4 w-4" /> Export</Button>
        <Button variant="ghost">Next <ChevronRight className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Button variant="orange"><Plus className="h-4 w-4" /> Record Harvest</Button>
        <Button variant="purple"><Plus className="h-4 w-4" /> Add Workers</Button>
        <Button variant="green"><Plus className="h-4 w-4" /> Approve</Button>
        <Button variant="blue"><Download className="h-4 w-4" /> Export</Button>
        <Button variant="amber"><Plus className="h-4 w-4" /> Save Draft</Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Button disabled>Disabled</Button>
        <Button disabled><Loader2 className="h-4 w-4 animate-spin" /> Loading...</Button>
      </div>
    </div>
  ),
};
