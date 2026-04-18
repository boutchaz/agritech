import type { Meta, StoryObj } from '@storybook/react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '../drawer';
import { Button } from '../button';
import { FormField } from '../FormField';
import { Input } from '../Input';

const meta: Meta<typeof Drawer> = {
  title: 'Design System/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Right: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Parcel Details</DrawerTitle>
          <DrawerDescription>Edit parcel information</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 px-0 mt-4">
          <FormField label="Name" required>
            <Input defaultValue="Parcelle B3" />
          </FormField>
          <FormField label="Area (ha)">
            <Input type="number" defaultValue="12.5" />
          </FormField>
        </div>
        <DrawerFooter className="mt-6">
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const Left: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Filters</Button>
      </DrawerTrigger>
      <DrawerContent side="left">
        <DrawerHeader>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription>Filter parcels by criteria</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 mt-4">
          <FormField label="Crop Type">
            <Input placeholder="Search crops..." />
          </FormField>
          <FormField label="Min Area (ha)">
            <Input type="number" placeholder="0" />
          </FormField>
        </div>
        <DrawerFooter className="mt-6">
          <Button variant="outline">Reset</Button>
          <Button>Apply</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
