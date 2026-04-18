import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';
import { MapPin, BarChart3, ListTodo, Settings } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[500px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-gray-600">Overview content goes here.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm text-gray-600">Analytics dashboard.</p>
      </TabsContent>
      <TabsContent value="tasks">
        <p className="text-sm text-gray-600">Task management area.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-gray-600">Settings panel.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithIcons: Story = {
  name: 'Parcel Detail Tabs',
  render: () => (
    <Tabs defaultValue="map" className="w-[500px]">
      <TabsList>
        <TabsTrigger value="map"><MapPin className="h-4 w-4" /> Map</TabsTrigger>
        <TabsTrigger value="indices"><BarChart3 className="h-4 w-4" /> Indices</TabsTrigger>
        <TabsTrigger value="tasks"><ListTodo className="h-4 w-4" /> Tasks</TabsTrigger>
        <TabsTrigger value="settings"><Settings className="h-4 w-4" /> Config</TabsTrigger>
      </TabsList>
      <TabsContent value="map">
        <div className="h-32 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
          Map view placeholder
        </div>
      </TabsContent>
      <TabsContent value="indices">
        <div className="h-32 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
          NDVI / NDWI charts
        </div>
      </TabsContent>
    </Tabs>
  ),
};
