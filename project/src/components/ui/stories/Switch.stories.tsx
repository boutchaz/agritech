import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '../switch';
import { Label } from '../label';

const meta: Meta<typeof Switch> = {
  title: 'Design System/Switch',
  component: Switch,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    checked: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const Checked: Story = {
  args: { checked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="notifications" />
      <Label htmlFor="notifications">Enable notifications</Label>
    </div>
  ),
};

export const SettingsPanel: Story = {
  name: 'Settings Panel (Domain)',
  render: () => (
    <div className="w-80 space-y-4">
      {[
        { id: 'alerts', label: 'Water stress alerts', desc: 'Get notified when NDVI drops', on: true },
        { id: 'weather', label: 'Weather warnings', desc: 'Frost and heat wave alerts', on: true },
        { id: 'offline', label: 'Offline mode', desc: 'Cache data for field use', on: false },
        { id: 'dark', label: 'Dark mode', desc: 'Reduce eye strain at night', on: false },
      ].map((s) => (
        <div key={s.id} className="flex items-center justify-between">
          <div>
            <Label htmlFor={s.id} className="text-sm font-medium">{s.label}</Label>
            <p className="text-xs text-gray-500">{s.desc}</p>
          </div>
          <Switch id={s.id} defaultChecked={s.on} />
        </div>
      ))}
    </div>
  ),
};
