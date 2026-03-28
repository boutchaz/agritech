import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../collapsible';
import { Button } from '../button';
import { ChevronsUpDown } from 'lucide-react';

const meta: Meta = {
  title: 'Design System/Collapsible',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-80 space-y-2">
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">Satellite Indices (3)</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="rounded-md border px-4 py-3 text-sm">NDVI — 0.72</div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border px-4 py-3 text-sm">NDWI — 0.34</div>
          <div className="rounded-md border px-4 py-3 text-sm">EVI — 0.65</div>
        </CollapsibleContent>
      </Collapsible>
    );
  },
};
