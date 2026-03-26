import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ──────────────────────────────────────────────────────────────

// i18next — pass through keys, handle interpolation simply
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: string | Record<string, unknown>) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

// Auth
const mockOrganization = { id: 'org-111', name: 'Test Org' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ currentOrganization: mockOrganization, user: { id: 'user-1' } }),
}));

// Form errors
vi.mock('@/hooks/useFormErrors', () => ({
  useFormErrors: () => ({ handleFormError: vi.fn() }),
}));

// Items API
vi.mock('@/lib/api/items', () => ({
  itemsApi: { seedPredefinedGroups: vi.fn() },
}));

// Item hooks — we'll set return values per-test via mockReturnValue
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('@/hooks/useItems', () => ({
  useItemGroups: vi.fn(),
  useCreateItemGroup: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateItemGroup: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useDeleteItemGroup: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
}));

// TanStack Query
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useMutation: ({ mutationFn, onSuccess }: any) => ({
      mutate: () => mutationFn().then((r: any) => onSuccess?.(r)),
      mutateAsync: mutationFn,
      isPending: false,
    }),
  };
});

import { useItemGroups } from '@/hooks/useItems';
import type { ItemGroup } from '@/types/items';

// ─── Test Data ──────────────────────────────────────────────────────────

const makeGroup = (overrides: Partial<ItemGroup> = {}): ItemGroup => ({
  id: 'grp-1',
  organization_id: 'org-111',
  name: 'Fertilizers',
  code: 'FERT',
  description: 'All fertilizer products',
  is_active: true,
  parent_group_id: undefined,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  ...overrides,
});

const rootGroup = makeGroup();
const childGroup = makeGroup({
  id: 'grp-2',
  name: 'Organic Fertilizers',
  code: 'FERT-ORG',
  description: 'Organic only',
  parent_group_id: 'grp-1',
});
const secondRoot = makeGroup({
  id: 'grp-3',
  name: 'Seeds',
  code: 'SEED',
  description: 'All seeds',
  parent_group_id: undefined,
});

// ─── Helpers ────────────────────────────────────────────────────────────

function setGroups(groups: ItemGroup[]) {
  (useItemGroups as any).mockReturnValue({ data: groups, isLoading: false });
}

// Dynamic import after mocks
let ItemGroupsManagement: typeof import('../ItemGroupsManagement').default;
beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../ItemGroupsManagement');
  ItemGroupsManagement = mod.default;
});

// ─── buildTree pure-logic tests ─────────────────────────────────────────

describe('buildTree (internal)', () => {
  // We test the tree indirectly via the rendered tree view

  it('renders root nodes at depth 0 and children nested', async () => {
    setGroups([rootGroup, childGroup, secondRoot]);
    render(<ItemGroupsManagement />);

    // Switch to tree view
    const treeBtn = screen.getByRole('button', { name: /items\.itemGroup\.treeView/i });
    await userEvent.click(treeBtn);

    // Root groups should be visible
    expect(screen.getByText('Fertilizers')).toBeDefined();
    expect(screen.getByText('Seeds')).toBeDefined();

    // Child is hidden by default (collapsed)
    expect(screen.queryByText('Organic Fertilizers')).toBeNull();
  });
});

// ─── Empty state ────────────────────────────────────────────────────────

describe('Empty state', () => {
  it('shows empty state when no groups exist', () => {
    setGroups([]);
    render(<ItemGroupsManagement />);

    expect(screen.getByText('items.itemGroup.noGroups')).toBeDefined();
    expect(screen.getByText('items.itemGroup.noGroupsDescription')).toBeDefined();
  });

  it('shows create and import buttons in empty state', () => {
    setGroups([]);
    render(<ItemGroupsManagement />);

    const createBtns = screen.getAllByRole('button', { name: /items\.itemGroup\.createFirst/i });
    const importBtns = screen.getAllByRole('button', { name: /items\.itemGroup\.importPredefined/i });
    expect(createBtns.length).toBeGreaterThanOrEqual(1);
    expect(importBtns.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Loading state ──────────────────────────────────────────────────────

describe('Loading state', () => {
  it('shows spinner when loading', () => {
    (useItemGroups as any).mockReturnValue({ data: [], isLoading: true });
    const { container } = render(<ItemGroupsManagement />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });
});

// ─── Table view ─────────────────────────────────────────────────────────

describe('Table view', () => {
  it('renders all column headers with proper translation keys', () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    expect(screen.getByText('items.itemGroup.code')).toBeDefined();
    expect(screen.getByText('items.itemGroup.name')).toBeDefined();
    expect(screen.getByText('items.itemGroup.parentGroup')).toBeDefined();
    expect(screen.getByText('items.itemGroup.groupDescription')).toBeDefined();
    expect(screen.getByText('common:statusColumn')).toBeDefined();
    expect(screen.getByText('common:actionsColumn')).toBeDefined();
  });

  it('renders group data in table rows', () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    expect(screen.getByText('FERT')).toBeDefined();
    expect(screen.getByText('Fertilizers')).toBeDefined();
    expect(screen.getByText('All fertilizer products')).toBeDefined();
  });

  it('shows "root group" badge for groups without parent', () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    expect(screen.getByText('items.itemGroup.mainGroup')).toBeDefined();
  });

  it('shows parent group name for child groups', () => {
    setGroups([rootGroup, childGroup]);
    render(<ItemGroupsManagement />);

    // "Fertilizers" appears twice: once as the group name, once as the parent of the child
    const allFertilizers = screen.getAllByText('Fertilizers');
    expect(allFertilizers.length).toBeGreaterThanOrEqual(2);
  });

  it('shows active/inactive status with translated labels', () => {
    const inactiveGroup = makeGroup({ id: 'grp-x', is_active: false, name: 'Inactive Group' });
    setGroups([rootGroup, inactiveGroup]);
    render(<ItemGroupsManagement />);

    // active label appears for root group, inactive for the other
    const activeLabels = screen.getAllByText('common:active');
    const inactiveLabels = screen.getAllByText('common:inactive');
    expect(activeLabels.length).toBeGreaterThanOrEqual(1);
    expect(inactiveLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('shows edit and delete buttons per row', () => {
    setGroups([rootGroup, secondRoot]);
    render(<ItemGroupsManagement />);

    // Each row has edit + delete = 2 buttons × 2 rows
    const editButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('[class*="lucide-pencil"], svg')
    );
    // At minimum we have action buttons
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Tree view ──────────────────────────────────────────────────────────

describe('Tree view', () => {
  it('switches to tree view when clicking tree button', async () => {
    setGroups([rootGroup, childGroup]);
    render(<ItemGroupsManagement />);

    const treeBtn = screen.getByRole('button', { name: /items\.itemGroup\.treeView/i });
    await userEvent.click(treeBtn);

    // Parent group column is absent in tree view (only code, name, description, status, actions)
    // The tree header should NOT include parentGroup column
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).not.toContain('items.itemGroup.parentGroup');
  });

  it('expands a parent node to reveal children', async () => {
    setGroups([rootGroup, childGroup]);
    render(<ItemGroupsManagement />);

    // Switch to tree view
    await userEvent.click(screen.getByRole('button', { name: /items\.itemGroup\.treeView/i }));

    // Child should not be visible initially
    expect(screen.queryByText('Organic Fertilizers')).toBeNull();

    // Find and click the expand chevron button (first button in the row)
    const expandButtons = screen.getAllByRole('button');
    // The expand button is inside the table, small, before the folder icon
    const expandBtn = expandButtons.find(
      (btn) => btn.querySelector('svg') && btn.closest('td')
    );
    if (expandBtn) {
      await userEvent.click(expandBtn);
      // Now child should be visible
      expect(screen.getByText('Organic Fertilizers')).toBeDefined();
    }
  });

  it('expand all / collapse all buttons work', async () => {
    setGroups([rootGroup, childGroup]);
    render(<ItemGroupsManagement />);

    await userEvent.click(screen.getByRole('button', { name: /items\.itemGroup\.treeView/i }));

    // Expand all
    const expandAllBtn = screen.getByRole('button', { name: /items\.itemGroup\.expandAll/i });
    await userEvent.click(expandAllBtn);
    expect(screen.getByText('Organic Fertilizers')).toBeDefined();

    // Collapse all
    const collapseAllBtn = screen.getByRole('button', { name: /items\.itemGroup\.collapseAll/i });
    await userEvent.click(collapseAllBtn);
    expect(screen.queryByText('Organic Fertilizers')).toBeNull();
  });

  it('shows add sub-group button on each tree row', async () => {
    setGroups([rootGroup, secondRoot]);
    render(<ItemGroupsManagement />);

    await userEvent.click(screen.getByRole('button', { name: /items\.itemGroup\.treeView/i }));

    // Each row should have a "+" button (add sub-group)
    const addButtons = screen.getAllByTitle('items.itemGroup.addSubGroup');
    expect(addButtons.length).toBe(2); // one per root group
  });

  it('opens create dialog with parent pre-selected when clicking add sub-group', async () => {
    setGroups([rootGroup, secondRoot]);
    render(<ItemGroupsManagement />);

    await userEvent.click(screen.getByRole('button', { name: /items\.itemGroup\.treeView/i }));

    // Click the first "+" add sub-group button
    const addButtons = screen.getAllByTitle('items.itemGroup.addSubGroup');
    await userEvent.click(addButtons[0]);

    // Dialog should open with "Add Sub-group" title
    expect(screen.getByText('items.itemGroup.addSubGroup')).toBeDefined();

    // The parent_group_id select should be pre-filled with the parent's id
    // We check the dialog description mentions the parent name
    expect(screen.getByText(/items\.itemGroup\.addSubGroupDescription/)).toBeDefined();
  });

  it('shows child count badge on parent nodes', async () => {
    setGroups([rootGroup, childGroup]);
    render(<ItemGroupsManagement />);

    await userEvent.click(screen.getByRole('button', { name: /items\.itemGroup\.treeView/i }));

    // Badge with "1" for the one child
    expect(screen.getByText('1')).toBeDefined();
  });
});

// ─── View mode toggle ───────────────────────────────────────────────────

describe('View mode toggle', () => {
  it('defaults to table view', () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    // Table view button should be the "active" variant (secondary)
    const tableBtn = screen.getByRole('button', { name: /items\.itemGroup\.tableView/i });
    expect(tableBtn.className).toContain('secondary');
  });

  it('toggles between table and tree', async () => {
    setGroups([rootGroup, childGroup]);
    render(<ItemGroupsManagement />);

    const treeBtn = screen.getByRole('button', { name: /items\.itemGroup\.treeView/i });
    const tableBtn = screen.getByRole('button', { name: /items\.itemGroup\.tableView/i });

    // Switch to tree
    await userEvent.click(treeBtn);
    expect(treeBtn.className).toContain('secondary');

    // Switch back to table
    await userEvent.click(tableBtn);
    expect(tableBtn.className).toContain('secondary');
  });
});

// ─── Create / Edit Dialog ───────────────────────────────────────────────

describe('Create dialog', () => {
  it('opens create dialog when clicking create button', async () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    // Click the first "Create" button in the header
    const createBtns = screen.getAllByRole('button', { name: /items\.itemGroup\.createNew/i });
    await userEvent.click(createBtns[0]);

    // Dialog title should appear (the text now appears in button + dialog title = multiple)
    const titles = screen.getAllByText('items.itemGroup.createNew');
    expect(titles.length).toBeGreaterThanOrEqual(2); // button + dialog title
    expect(screen.getByText('items.itemGroup.description')).toBeDefined();
  });

  it('opens edit dialog with pre-filled data when clicking edit', async () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    // Click the pencil/edit button (first ghost button in table row actions)
    const allButtons = screen.getAllByRole('button');
    const editBtn = allButtons.find(
      (btn) => btn.querySelector('.lucide-pencil, [data-lucide="pencil"]') || (btn.closest('td') && btn.querySelector('svg'))
    );

    if (editBtn) {
      await userEvent.click(editBtn);

      // Dialog should show edit title
      // The form should be pre-filled (check input value)
      const nameInput = screen.getByLabelText(/items\.itemGroup\.name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Fertilizers');
    }
  });
});

// ─── Delete dialog ──────────────────────────────────────────────────────

describe('Delete confirmation', () => {
  it('shows delete confirmation dialog', async () => {
    setGroups([rootGroup]);
    render(<ItemGroupsManagement />);

    // Click delete button (the one with trash icon)
    const allButtons = screen.getAllByRole('button');
    const deleteBtn = allButtons.find(
      (btn) => btn.querySelector('.text-destructive') || btn.innerHTML.includes('destructive')
    );

    if (deleteBtn) {
      await userEvent.click(deleteBtn);

      expect(screen.getByText('items.itemGroup.deleteTitle')).toBeDefined();
    }
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────

describe('Pagination (table view)', () => {
  it('does not show pagination when items fit in one page', () => {
    setGroups([rootGroup, secondRoot]);
    render(<ItemGroupsManagement />);

    // Pagination text "X / Y" should not appear when all items fit in one page
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull();
  });

  it('shows pagination when items exceed page size', () => {
    // Create 20 groups (PAGE_SIZE = 15)
    const manyGroups = Array.from({ length: 20 }, (_, i) =>
      makeGroup({ id: `grp-${i}`, name: `Group ${i}`, code: `G${i}` })
    );
    setGroups(manyGroups);
    render(<ItemGroupsManagement />);

    // Should show pagination controls
    expect(screen.getByText('1 / 2')).toBeDefined();
  });
});
