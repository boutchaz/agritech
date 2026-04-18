import type { Meta, StoryObj } from '@storybook/react';
import { PageLoader, SectionLoader, ButtonLoader } from '../loader';
import { Button } from '../button';

const meta: Meta = {
  title: 'Design System/Loader',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Page: Story = {
  name: 'PageLoader',
  render: () => (
    <div className="border rounded-lg h-64">
      <PageLoader />
    </div>
  ),
};

export const Section: Story = {
  name: 'SectionLoader',
  render: () => (
    <div className="border rounded-lg w-80">
      <SectionLoader />
    </div>
  ),
};

export const InButton: Story = {
  name: 'ButtonLoader',
  render: () => (
    <div className="flex gap-3">
      <Button disabled><ButtonLoader className="mr-2" /> Saving...</Button>
      <Button variant="outline" disabled><ButtonLoader className="mr-2" /> Loading...</Button>
      <Button variant="destructive" disabled><ButtonLoader className="mr-2" /> Deleting...</Button>
    </div>
  ),
};

export const AllLoaders: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-2">Page Loader (route transitions)</p>
        <div className="border rounded-lg h-40"><PageLoader /></div>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Section Loader (widget loading)</p>
        <div className="border rounded-lg w-64"><SectionLoader /></div>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Button Loader (form submitting)</p>
        <Button disabled><ButtonLoader className="mr-2" /> Processing...</Button>
      </div>
    </div>
  ),
};
