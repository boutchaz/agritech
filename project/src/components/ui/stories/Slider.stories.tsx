import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Slider } from '../slider'
import { Label } from '../label'

const meta: Meta<typeof Slider> = {
  title: 'Design System/Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    disabled: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
}

export default meta
type Story = StoryObj<typeof Slider>

export const Default: Story = {
  render: () => <Slider defaultValue={[40]} max={100} className="w-64" />,
}

export const WithValue: Story = {
  render: () => {
    const [value, setValue] = useState([60])
    return (
      <div className="flex flex-col gap-2 w-64">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Soil moisture</span>
          <span className="font-medium">{value[0]}%</span>
        </div>
        <Slider value={value} onValueChange={setValue} max={100} />
      </div>
    )
  },
}

export const Range: Story = {
  render: () => {
    const [value, setValue] = useState([20, 80])
    return (
      <div className="flex flex-col gap-2 w-64">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Temperature range</span>
          <span className="font-medium">{value[0]}°C – {value[1]}°C</span>
        </div>
        <Slider value={value} onValueChange={setValue} min={0} max={50} />
      </div>
    )
  },
}

export const WithStep: Story = {
  render: () => {
    const [value, setValue] = useState([25])
    return (
      <div className="flex flex-col gap-2 w-64">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Irrigation dose</span>
          <span className="font-medium">{value[0]} mm</span>
        </div>
        <Slider value={value} onValueChange={setValue} min={0} max={100} step={5} />
      </div>
    )
  },
}

export const Disabled: Story = {
  render: () => <Slider defaultValue={[50]} max={100} disabled className="w-64" />,
}

export const Invalid: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5 w-64">
      <Slider defaultValue={[0]} max={100} invalid />
      <p className="text-xs text-red-500">Value must be greater than 0</p>
    </div>
  ),
}

export const AgroginaDomain: Story = {
  name: 'Agrogina Domain (Parcel Thresholds)',
  render: () => {
    const [ndvi, setNdvi] = useState([0.3, 0.75])
    const [dose, setDose] = useState([30])

    return (
      <div className="w-80 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>NDVI alert range</Label>
            <span className="text-sm font-medium text-primary-600">
              {ndvi[0].toFixed(2)} – {ndvi[1].toFixed(2)}
            </span>
          </div>
          <Slider value={ndvi} onValueChange={setNdvi} min={0} max={1} step={0.01} />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0.00 (bare soil)</span>
            <span>1.00 (dense)</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Irrigation dose</Label>
            <span className="text-sm font-medium text-primary-600">{dose[0]} mm</span>
          </div>
          <Slider value={dose} onValueChange={setDose} min={0} max={80} step={5} />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-400">Locked threshold (disabled)</Label>
          <Slider defaultValue={[60]} max={100} disabled />
        </div>
      </div>
    )
  },
}
