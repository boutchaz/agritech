import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../dialog';
import { Button } from '../button';
import { Input } from '../Input';
import { FormField } from '../FormField';

const meta: Meta<typeof Dialog> = {
  title: 'Design System/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Parcel</DialogTitle>
          <DialogDescription>Add a new parcel to your farm.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Parcel Name" required>
            <Input placeholder="e.g., Parcelle B3" />
          </FormField>
          <FormField label="Area (ha)">
            <Input type="number" placeholder="12.5" />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Confirmation: Story = {
  name: 'Confirmation Dialog',
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Farm</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This will permanently delete "Ferme Al Baraka" and all associated data.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
