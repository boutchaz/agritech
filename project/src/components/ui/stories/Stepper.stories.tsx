import type { Meta, StoryObj } from '@storybook/react';
import { Stepper } from '../stepper';

const meta: Meta<typeof Stepper> = {
  title: 'Design System/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  argTypes: {
    currentStep: { control: { type: 'range', min: 0, max: 4 } },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

const calibrationSteps = [
  { label: 'Soil Analysis', description: 'pH, organic matter, nutrients' },
  { label: 'Water Analysis', description: 'EC, SAR, chloride' },
  { label: 'Irrigation', description: 'System type and schedule' },
  { label: 'Validation', description: 'Review and confirm' },
];

export const Horizontal: Story = {
  args: {
    steps: calibrationSteps,
    currentStep: 1,
    orientation: 'horizontal',
  },
  decorators: [(Story) => <div className="w-[600px]"><Story /></div>],
};

export const Vertical: Story = {
  args: {
    steps: calibrationSteps,
    currentStep: 2,
    orientation: 'vertical',
  },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};

export const AllComplete: Story = {
  args: {
    steps: calibrationSteps,
    currentStep: 4,
    orientation: 'horizontal',
  },
  decorators: [(Story) => <div className="w-[600px]"><Story /></div>],
};

export const OnboardingSteps: Story = {
  name: 'Onboarding Flow',
  args: {
    steps: [
      { label: 'Organization', description: 'Create your cooperative' },
      { label: 'Farm', description: 'Add your first farm' },
      { label: 'Modules', description: 'Choose features' },
      { label: 'Complete', description: 'Start using AgroGina' },
    ],
    currentStep: 1,
    orientation: 'horizontal',
  },
  decorators: [(Story) => <div className="w-[600px]"><Story /></div>],
};
