import type { Meta, StoryObj } from '@storybook/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Design System/Accordion',
  component: Accordion,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-96">
      <AccordionItem value="irrigation">
        <AccordionTrigger>Irrigation Settings</AccordionTrigger>
        <AccordionContent>
          Configure drip irrigation schedules, flow rates, and automated triggers based on soil moisture sensors.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="fertilization">
        <AccordionTrigger>Fertilization Plan</AccordionTrigger>
        <AccordionContent>
          NPK ratios, application schedules, and fertigation integration with your irrigation system.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="phytosanitary">
        <AccordionTrigger>Phytosanitary Treatments</AccordionTrigger>
        <AccordionContent>
          Track product applications, respect PHI (Pre-Harvest Interval), and maintain compliance records.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-96">
      <AccordionItem value="soil">
        <AccordionTrigger>Soil Analysis</AccordionTrigger>
        <AccordionContent>pH, organic matter, CEC, and nutrient levels.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="water">
        <AccordionTrigger>Water Analysis</AccordionTrigger>
        <AccordionContent>EC, SAR, chloride, and bicarbonate levels.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="foliar">
        <AccordionTrigger>Foliar Analysis</AccordionTrigger>
        <AccordionContent>Leaf nutrient content for precision fertilization.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
