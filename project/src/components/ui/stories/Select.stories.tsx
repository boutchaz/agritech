import type { Meta, StoryObj } from '@storybook/react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../radix-select'
import { Label } from '../label'

const meta: Meta<typeof SelectTrigger> = {
  title: 'Design System/Select',
  component: SelectTrigger,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
}

export default meta
type Story = StoryObj<typeof SelectTrigger>

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a crop" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="wheat">Wheat</SelectItem>
        <SelectItem value="corn">Corn</SelectItem>
        <SelectItem value="sunflower">Sunflower</SelectItem>
        <SelectItem value="olives">Olives</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select a crop" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Cereals</SelectLabel>
          <SelectItem value="wheat">Wheat</SelectItem>
          <SelectItem value="barley">Barley</SelectItem>
          <SelectItem value="corn">Corn</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Fruits & Trees</SelectLabel>
          <SelectItem value="olives">Olives</SelectItem>
          <SelectItem value="citrus">Citrus</SelectItem>
          <SelectItem value="almonds">Almonds</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

export const Invalid: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-64" invalid>
        <SelectValue placeholder="Select a crop" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="wheat">Wheat</SelectItem>
        <SelectItem value="corn">Corn</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Not available" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="wheat">Wheat</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="parcel-select">Parcel</Label>
      <Select>
        <SelectTrigger id="parcel-select" className="w-64">
          <SelectValue placeholder="Choose a parcel" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="b1">Parcel B1 — 12 ha</SelectItem>
          <SelectItem value="b2">Parcel B2 — 8 ha</SelectItem>
          <SelectItem value="c3">Parcel C3 — 20 ha</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const AgroginaDomain: Story = {
  name: 'Agrogina Domain (Irrigation Scheduler)',
  render: () => (
    <div className="w-80 space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label>Irrigation method</Label>
        <Select defaultValue="drip">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="drip">Drip irrigation</SelectItem>
            <SelectItem value="sprinkler">Sprinkler</SelectItem>
            <SelectItem value="furrow">Furrow</SelectItem>
            <SelectItem value="flood">Flood</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Frequency</Label>
        <Select defaultValue="weekly">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="every2days">Every 2 days</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Disabled field</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Locked by admin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
}
