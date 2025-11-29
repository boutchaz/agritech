import { createFileRoute } from '@tanstack/react-router'

import ItemGroupsManagement from '@/components/Stock/ItemGroupsManagement';

function GroupsPage() {
  return <ItemGroupsManagement />;
}

export const Route = createFileRoute('/stock/groups')({
  component: GroupsPage,
});
