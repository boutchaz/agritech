import type { Meta, StoryObj } from '@storybook/react';
import { ScrollArea } from '../scroll-area';
import { Separator } from '../separator';

const meta: Meta<typeof ScrollArea> = {
  title: 'Design System/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

const parcels = Array.from({ length: 20 }, (_, i) => ({
  name: `Parcelle ${String.fromCharCode(65 + Math.floor(i / 5))}${(i % 5) + 1}`,
  area: `${(Math.random() * 30 + 5).toFixed(1)} ha`,
}));

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Parcels</h4>
        {parcels.map((p) => (
          <div key={p.name}>
            <div className="text-sm py-2">
              <span className="font-medium">{p.name}</span>
              <span className="text-gray-500 ml-2">{p.area}</span>
            </div>
            <Separator />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};
