import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../tooltip';
import { Button } from '../button';
import { Info, Settings, Trash2, Plus } from 'lucide-react';

const meta: Meta = {
  title: 'Design System/Tooltip',
  tags: ['autodocs'],
  decorators: [(Story) => <TooltipProvider delayDuration={100}><Story /></TooltipProvider>],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>NDVI measures vegetation health from 0 to 1</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <div className="flex items-center gap-8 p-12">
      <Tooltip>
        <TooltipTrigger asChild><Button variant="outline" size="sm">Top</Button></TooltipTrigger>
        <TooltipContent side="top"><p>Top tooltip</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="outline" size="sm">Right</Button></TooltipTrigger>
        <TooltipContent side="right"><p>Right tooltip</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="outline" size="sm">Bottom</Button></TooltipTrigger>
        <TooltipContent side="bottom"><p>Bottom tooltip</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild><Button variant="outline" size="sm">Left</Button></TooltipTrigger>
        <TooltipContent side="left"><p>Left tooltip</p></TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const ActionBar: Story = {
  name: 'Action Bar (Domain)',
  render: () => (
    <div className="flex items-center gap-1 p-2 border rounded-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon"><Plus className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent><p>Add parcel</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent><p>Settings</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent><p>Delete</p></TooltipContent>
      </Tooltip>
    </div>
  ),
};
