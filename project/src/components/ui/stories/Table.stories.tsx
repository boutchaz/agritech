import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '../table';
import { Badge } from '../badge';

const meta: Meta<typeof Table> = {
  title: 'Design System/Table',
  component: Table,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Table>;

const parcels = [
  { name: 'Parcelle A1', crop: 'Blé tendre', area: '25 ha', ndvi: 0.78, status: 'Healthy' },
  { name: 'Parcelle B3', crop: 'Olivier', area: '12.5 ha', ndvi: 0.62, status: 'Stress' },
  { name: 'Parcelle C2', crop: 'Agrumes', area: '8 ha', ndvi: 0.85, status: 'Healthy' },
  { name: 'Parcelle D1', crop: 'Maïs', area: '15 ha', ndvi: 0.45, status: 'Critical' },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>List of farm parcels with latest satellite data.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Parcel</TableHead>
          <TableHead>Crop</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>NDVI</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {parcels.map((p) => (
          <TableRow key={p.name}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.crop}</TableCell>
            <TableCell>{p.area}</TableCell>
            <TableCell>{p.ndvi}</TableCell>
            <TableCell>
              <Badge
                variant={p.status === 'Healthy' ? 'default' : p.status === 'Stress' ? 'secondary' : 'destructive'}
              >
                {p.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
