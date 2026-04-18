import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const meta: Meta<typeof Alert> = {
  title: 'Design System/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert className="w-96">
      <Info className="h-4 w-4" />
      <AlertTitle>Information</AlertTitle>
      <AlertDescription>Satellite imagery is updated every 5 days.</AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-96">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>Failed to sync parcel data. Check your connection.</AlertDescription>
    </Alert>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="w-96 space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Info</AlertTitle>
        <AlertDescription>New satellite data available for Zone Nord.</AlertDescription>
      </Alert>
      <Alert className="border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Task "Irrigation B3" completed successfully.</AlertDescription>
      </Alert>
      <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>Water stress detected on 3 parcels.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Connection lost. Data may be outdated.</AlertDescription>
      </Alert>
    </div>
  ),
};
