import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ConfirmDialog } from '../confirm-dialog';
import { Button } from '../button';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Design System/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Destructive: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>Delete Parcel</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Parcelle B3?"
          description="This will permanently delete the parcel and all associated satellite data, task history, and soil analysis. This action cannot be undone."
          variant="destructive"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => new Promise(r => setTimeout(r, 1000))}
        />
      </>
    );
  },
};

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Complete Harvest</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Mark harvest as complete?"
          description="This will close all related tasks and update the parcel status."
          confirmLabel="Complete"
          cancelLabel="Cancel"
          onConfirm={() => {}}
        />
      </>
    );
  },
};

export const WithAsyncAction: Story = {
  name: 'With Loading State',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>Submit Invoice</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Submit invoice?"
          description="This will create a journal entry and update stock levels."
          confirmLabel="Submit"
          onConfirm={() => new Promise(r => setTimeout(r, 2000))}
        />
      </>
    );
  },
};
