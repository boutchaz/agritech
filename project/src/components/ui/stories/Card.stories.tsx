import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Button } from '../button';
import { Badge } from '../badge';
import { MapPin, Leaf, TrendingUp } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">Card content area</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create Farm</CardTitle>
        <CardDescription>Add a new farm to your organization</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">Fill in farm details to get started.</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Create</Button>
      </CardFooter>
    </Card>
  ),
};

export const ParcelCard: Story = {
  name: 'Parcel Card (Domain Example)',
  render: () => (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Parcelle B3</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" /> Meknes, Zone Nord
            </CardDescription>
          </div>
          <Badge className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Culture</span>
            <p className="font-medium flex items-center gap-1"><Leaf className="h-3 w-3 text-green-600" /> Blé tendre</p>
          </div>
          <div>
            <span className="text-gray-500">Surface</span>
            <p className="font-medium">12.5 ha</p>
          </div>
          <div>
            <span className="text-gray-500">NDVI</span>
            <p className="font-medium flex items-center gap-1"><TrendingUp className="h-3 w-3 text-green-600" /> 0.72</p>
          </div>
          <div>
            <span className="text-gray-500">Irrigation</span>
            <p className="font-medium">Goutte-à-goutte</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};

export const StatCard: Story = {
  name: 'Stat/KPI Card',
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Parcels', value: '24', change: '+2 this month', color: 'text-green-600' },
        { label: 'Active Tasks', value: '12', change: '3 overdue', color: 'text-yellow-600' },
        { label: 'Workers', value: '45', change: '8 day laborers', color: 'text-blue-600' },
      ].map((stat) => (
        <Card key={stat.label} className="w-48">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.color}`}>{stat.change}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
