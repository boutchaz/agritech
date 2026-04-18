import type { Meta, StoryObj } from '@storybook/react';
import UserAvatar from '../UserAvatar';

const meta: Meta<typeof UserAvatar> = {
  title: 'Design System/UserAvatar',
  component: UserAvatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof UserAvatar>;

export const WithInitials: Story = {
  args: { firstName: 'Karim', lastName: 'Mansouri', size: 'md' },
};

export const EmailOnly: Story = {
  args: { email: 'karim@ferme.ma', size: 'md' },
};

export const NoData: Story = {
  args: { size: 'md' },
};

export const WithImage: Story = {
  args: {
    src: 'https://api.dicebear.com/7.x/initials/svg?seed=KM',
    firstName: 'Karim',
    lastName: 'Mansouri',
    size: 'md',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <UserAvatar firstName="K" lastName="M" size="xs" />
      <UserAvatar firstName="K" lastName="M" size="sm" />
      <UserAvatar firstName="K" lastName="M" size="md" />
      <UserAvatar firstName="K" lastName="M" size="lg" />
      <UserAvatar firstName="K" lastName="M" size="xl" />
    </div>
  ),
};

export const TeamList: Story = {
  name: 'Farm Team',
  render: () => (
    <div className="space-y-3">
      {[
        { first: 'Karim', last: 'Mansouri', role: 'Farm Manager' },
        { first: 'Hassan', last: 'Alami', role: 'Agronome' },
        { first: 'Fatima', last: 'Benchekroun', role: 'Admin' },
        { first: 'Ahmed', last: 'Tazi', role: 'Worker' },
      ].map((user) => (
        <div key={user.first} className="flex items-center gap-3">
          <UserAvatar firstName={user.first} lastName={user.last} size="sm" />
          <div>
            <p className="text-sm font-medium">{user.first} {user.last}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        </div>
      ))}
    </div>
  ),
};
