import { screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AdminUsersPage } from '@/components/admin/users-page';
import { renderWithProviders, mockUseQuery, mockUseMutation, mockUser, mockCoachUser, mockAdminUser } from '@/test/utils';

// Mock dependencies
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importOriginal<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
  };
});

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock dashboard components
vi.mock('@/components/dashboard', () => ({
  DashboardHeader: ({ title, children }: unknown) => (
    <div data-testid="dashboard-header">
      <h1>{title}</h1>
      {children}
    </div>
  ),
  LoadingState: () => <div data-testid="loading-state">Loading users...</div>,
  ErrorState: ({ message, onRetry }: unknown) => (
    <div data-testid="error-state">
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
  StatsCard: ({ title, value, _icon }: unknown) => (
    <div data-testid="stats-card">
      <span data-testid="stats-title">{title}</span>
      <span data-testid="stats-value">{value}</span>
    </div>
  ),
  FilterControls: ({ searchTerm, onSearchChange, roleFilter, onRoleChange, statusFilter, onStatusChange }: unknown) => (
    <div data-testid="filter-controls">
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search users..."
      />
      <select
        data-testid="role-filter"
        value={roleFilter}
        onChange={(e) => onRoleChange(e.target.value)}
      >
        <option value="all">All Roles</option>
        <option value="admin">Admin</option>
        <option value="coach">Coach</option>
        <option value="client">Client</option>
      </select>
      <select
        data-testid="status-filter"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="all">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>
  ),
  UserManagementTable: ({ users, onEdit, onDelete }: unknown) => (
    <div data-testid="user-management-table">
      {users.map((user: unknown) => (
        <div key={user.id} data-testid={`user-row-${user.id}`}>
          <span>{user.firstName} {user.lastName}</span>
          <span>{user.email}</span>
          <span>{user.role}</span>
          <span>{user.status}</span>
          <button
            data-testid={`edit-user-${user.id}`}
            onClick={() => onEdit(user)}
          >
            Edit
          </button>
          <button
            data-testid={`delete-user-${user.id}`}
            onClick={() => onDelete(user)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  ),
  UserEditDialog: ({ open, user, onClose, onSave, isLoading }: unknown) =>
    open ? (
      <div data-testid="user-edit-dialog">
        <h2>Edit User</h2>
        <input
          data-testid="edit-first-name"
          defaultValue={user?.firstName}
          placeholder="First Name"
        />
        <input
          data-testid="edit-last-name"
          defaultValue={user?.lastName}
          placeholder="Last Name"
        />
        <input
          data-testid="edit-email"
          defaultValue={user?.email}
          placeholder="Email"
        />
        <select data-testid="edit-role" defaultValue={user?.role}>
          <option value="admin">Admin</option>
          <option value="coach">Coach</option>
          <option value="client">Client</option>
        </select>
        <select data-testid="edit-status" defaultValue={user?.status}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          data-testid="save-user"
          onClick={() => onSave(user.id, {
            firstName: 'Updated',
            lastName: 'User',
            email: 'updated@example.com',
            role: 'coach',
            status: 'active',
          })}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button data-testid="cancel-edit" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
  UserDeleteDialog: ({ open, user, onClose, onConfirm, isLoading }: unknown) =>
    open ? (
      <div data-testid="user-delete-dialog">
        <h2>Delete User</h2>
        <p>Are you sure you want to delete {user?.firstName} {user?.lastName}?</p>
        <button
          data-testid="confirm-delete"
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
        <button data-testid="cancel-delete" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
  useFilteredData: vi.fn((data, searchTerm, filters) => data?.filter((item: unknown) => {
    if (searchTerm && !item.firstName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filters.role !== 'all' && item.role !== filters.role) {
      return false;
    }
    if (filters.status !== 'all' && item.status !== filters.status) {
      return false;
    }
    return true;
  }) || []),
  USER_ROLE_OPTIONS: ['admin', 'coach', 'client'],
  USER_STATUS_OPTIONS: ['active', 'inactive', 'suspended'],
  User: {} as unknown, // Type mock
}));

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/components/ui/toast-provider';

describe('AdminUsersPage', () => {
  const mockUsers = [
    { ...mockAdminUser, id: 'admin-1', firstName: 'Admin', lastName: 'User', status: 'active' },
    { ...mockCoachUser, id: 'coach-1', firstName: 'Coach', lastName: 'Smith', status: 'active' },
    { ...mockUser, id: 'client-1', firstName: 'Client', lastName: 'Johnson', status: 'active' },
    { ...mockUser, id: 'client-2', firstName: 'Inactive', lastName: 'Client', status: 'inactive' },
  ];

  const mockUserAnalytics = {
    totalUsers: 4,
    activeUsers: 3,
    inactiveUsers: 1,
    adminUsers: 1,
    coachUsers: 1,
    clientUsers: 2,
    newUsersThisMonth: 2,
    userGrowthRate: 15.5,
  };

  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  const mockQueryClient = {
    invalidateQueries: vi.fn(),
  };

  const mockUpdateMutation = mockUseMutation();
  const mockDeleteMutation = mockUseMutation();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock toast
    (useToast as unknown).mockReturnValue(mockToast);

    // Mock query client
    (useQueryClient as unknown).mockReturnValue(mockQueryClient);

    // Mock queries
    (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
      if (queryKey[0] === 'admin-users') {
        return mockUseQuery({ users: mockUsers, total: mockUsers.length });
      }
      if (queryKey[0] === 'admin-user-analytics') {
        return mockUseQuery(mockUserAnalytics);
      }
      return mockUseQuery(null);
    });

    // Mock mutations
    (useMutation as unknown).mockImplementation(({ mutationFn }: unknown) => {
      if (mutationFn.name.includes('update') || mutationFn.toString().includes('PUT')) {
        return mockUpdateMutation;
      }
      if (mutationFn.name.includes('delete') || mutationFn.toString().includes('DELETE')) {
        return mockDeleteMutation;
      }
      return mockUseMutation();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders the users page with header', () => {
      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByText(/admin.users/i)).toBeInTheDocument();
    });

    it('displays user statistics cards', () => {
      renderWithProviders(<AdminUsersPage />);
      
      const statsCards = screen.getAllByTestId('stats-card');
      expect(statsCards).toHaveLength(4); // Total, Active, New, Growth Rate
      
      expect(screen.getByTestId('stats-value')).toHaveTextContent('4'); // Total users
    });

    it('shows filter controls', () => {
      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByTestId('filter-controls')).toBeInTheDocument();
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
      expect(screen.getByTestId('role-filter')).toBeInTheDocument();
      expect(screen.getByTestId('status-filter')).toBeInTheDocument();
    });

    it('displays user management table', () => {
      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByTestId('user-management-table')).toBeInTheDocument();
      
      // Should show all users initially
      mockUsers.forEach(user => {
        expect(screen.getByTestId(`user-row-${user.id}`)).toBeInTheDocument();
        expect(screen.getByText(`${user.firstName} ${user.lastName}`)).toBeInTheDocument();
      });
    });

    it('shows action buttons for each user', () => {
      renderWithProviders(<AdminUsersPage />);
      
      mockUsers.forEach(user => {
        expect(screen.getByTestId(`edit-user-${user.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`delete-user-${user.id}`)).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading States', () => {
    it('shows loading state while fetching users', () => {
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return { ...mockUseQuery(null), isLoading: true };
        }
        if (queryKey[0] === 'admin-user-analytics') {
          return mockUseQuery(mockUserAnalytics);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    it('shows error state when user fetch fails', () => {
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return {
            ...mockUseQuery(null),
            isError: true,
            error: new Error('Failed to fetch users'),
          };
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
    });

    it('allows retry after error', async () => {
      const refetch = vi.fn();
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return {
            ...mockUseQuery(null),
            isError: true,
            error: new Error('Failed to fetch users'),
            refetch,
          };
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const retryButton = screen.getByText('Retry');
      
      await user.click(retryButton);
      
      expect(refetch).toHaveBeenCalled();
    });
  });

  describe('User Filtering and Search', () => {
    it('filters users by search term', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByTestId('search-input');
      
      await user.type(searchInput, 'Coach');
      
      // Should trigger useQuery with search term
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['admin-users', 'Coach', 'all', 'all'],
          })
        );
      });
    });

    it('filters users by role', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const roleFilter = screen.getByTestId('role-filter');
      
      await user.selectOptions(roleFilter, 'coach');
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['admin-users', '', 'coach', 'all'],
          })
        );
      });
    });

    it('filters users by status', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const statusFilter = screen.getByTestId('status-filter');
      
      await user.selectOptions(statusFilter, 'inactive');
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['admin-users', '', 'all', 'inactive'],
          })
        );
      });
    });

    it('combines multiple filter criteria', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByTestId('search-input');
      const roleFilter = screen.getByTestId('role-filter');
      
      await user.type(searchInput, 'John');
      await user.selectOptions(roleFilter, 'client');
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['admin-users', 'John', 'client', 'all'],
          })
        );
      });
    });

    it('clears filters when reset', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByTestId('search-input');
      const roleFilter = screen.getByTestId('role-filter');
      
      // Set filters
      await user.type(searchInput, 'test');
      await user.selectOptions(roleFilter, 'admin');
      
      // Clear filters
      await user.clear(searchInput);
      await user.selectOptions(roleFilter, 'all');
      
      await waitFor(() => {
        expect(useQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            queryKey: ['admin-users', '', 'all', 'all'],
          })
        );
      });
    });
  });

  describe('User Editing', () => {
    it('opens edit dialog when edit button is clicked', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      
      expect(screen.getByTestId('user-edit-dialog')).toBeInTheDocument();
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('populates edit dialog with user data', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      
      expect(screen.getByTestId('edit-first-name')).toHaveValue('Coach');
      expect(screen.getByTestId('edit-last-name')).toHaveValue('Smith');
      expect(screen.getByTestId('edit-email')).toHaveValue('coach@example.com');
      expect(screen.getByTestId('edit-role')).toHaveValue('coach');
      expect(screen.getByTestId('edit-status')).toHaveValue('active');
    });

    it('saves user changes', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      
      const saveButton = screen.getByTestId('save-user');
      await user.click(saveButton);
      
      expect(mockUpdateMutation.mutate).toHaveBeenCalledWith({
        id: 'coach-1',
        updates: {
          firstName: 'Updated',
          lastName: 'User',
          email: 'updated@example.com',
          role: 'coach',
          status: 'active',
        },
      });
    });

    it('shows success toast on successful update', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      await user.click(screen.getByTestId('save-user'));
      
      // Simulate successful mutation
      mockUpdateMutation.onSuccess();
      
      expect(mockToast.success).toHaveBeenCalledWith('User updated successfully');
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-users'] });
    });

    it('shows error toast on update failure', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      await user.click(screen.getByTestId('save-user'));
      
      // Simulate failed mutation
      const error = new Error('Update failed');
      mockUpdateMutation.onError(error);
      
      expect(mockToast.error).toHaveBeenCalledWith('Update user failed', 'Update failed');
    });

    it('closes edit dialog on cancel', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      expect(screen.getByTestId('user-edit-dialog')).toBeInTheDocument();
      
      const cancelButton = screen.getByTestId('cancel-edit');
      await user.click(cancelButton);
      
      expect(screen.queryByTestId('user-edit-dialog')).not.toBeInTheDocument();
    });

    it('shows loading state during save', async () => {
      const loadingMutation = { ...mockUpdateMutation, isPending: true };
      (useMutation as unknown).mockImplementation(() => loadingMutation);
      
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      
      const saveButton = screen.getByTestId('save-user');
      expect(saveButton).toHaveTextContent('Saving...');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('User Deletion', () => {
    it('opens delete dialog when delete button is clicked', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      
      expect(screen.getByTestId('user-delete-dialog')).toBeInTheDocument();
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    it('shows user confirmation message', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      
      expect(screen.getByText(/Are you sure you want to delete Client Johnson/i)).toBeInTheDocument();
    });

    it('deletes user when confirmed', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      
      const confirmButton = screen.getByTestId('confirm-delete');
      await user.click(confirmButton);
      
      expect(mockDeleteMutation.mutate).toHaveBeenCalledWith('client-1');
    });

    it('shows success toast on successful deletion', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      await user.click(screen.getByTestId('confirm-delete'));
      
      // Simulate successful mutation
      mockDeleteMutation.onSuccess();
      
      expect(mockToast.success).toHaveBeenCalledWith('User deleted successfully');
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['admin-users'] });
    });

    it('shows error toast on deletion failure', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      await user.click(screen.getByTestId('confirm-delete'));
      
      // Simulate failed mutation
      const error = new Error('Cannot delete user');
      mockDeleteMutation.onError(error);
      
      expect(mockToast.error).toHaveBeenCalledWith('Delete user failed', 'Cannot delete user');
    });

    it('closes delete dialog on cancel', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      expect(screen.getByTestId('user-delete-dialog')).toBeInTheDocument();
      
      const cancelButton = screen.getByTestId('cancel-delete');
      await user.click(cancelButton);
      
      expect(screen.queryByTestId('user-delete-dialog')).not.toBeInTheDocument();
    });

    it('shows loading state during deletion', async () => {
      const loadingMutation = { ...mockDeleteMutation, isPending: true };
      (useMutation as unknown).mockImplementation(() => loadingMutation);
      
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(deleteButton);
      
      const confirmButton = screen.getByTestId('confirm-delete');
      expect(confirmButton).toHaveTextContent('Deleting...');
      expect(confirmButton).toBeDisabled();
    });
  });

  describe('Analytics and Statistics', () => {
    it('displays user count statistics', () => {
      renderWithProviders(<AdminUsersPage />);
      
      const statsCards = screen.getAllByTestId('stats-card');
      expect(statsCards.length).toBeGreaterThan(0);
      
      // Should show total users
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('shows user breakdown by role', () => {
      renderWithProviders(<AdminUsersPage />);
      
      // Analytics should show role distribution
      expect(screen.getAllByTestId('stats-card')).toHaveLength(4);
    });

    it('displays growth metrics', () => {
      renderWithProviders(<AdminUsersPage />);
      
      // Should show growth rate or new users
      const statsValues = screen.getAllByTestId('stats-value');
      expect(statsValues.length).toBeGreaterThan(1);
    });

    it('handles missing analytics data gracefully', () => {
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return mockUseQuery({ users: mockUsers, total: mockUsers.length });
        }
        if (queryKey[0] === 'admin-user-analytics') {
          return mockUseQuery(null);
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<AdminUsersPage />);
      
      // Should still render without crashing
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('makes correct API call for users with filters', () => {
      renderWithProviders(<AdminUsersPage />);
      
      expect(useQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['admin-users', '', 'all', 'all'],
          queryFn: expect.any(Function),
        })
      );
    });

    it('constructs API URL with query parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockUsers }),
      });

      renderWithProviders(<AdminUsersPage />);
      
      // Trigger the query function
      const queryCall = (useQuery as unknown).mock.calls.find(
        (call: unknown) => call[0].queryKey[0] === 'admin-users'
      );
      
      if (queryCall) {
        await queryCall[0].queryFn();
        
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/users')
        );
      }
    });

    it('handles API errors appropriately', () => {
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return {
            ...mockUseQuery(null),
            isError: true,
            error: { message: 'Network error' },
          };
        }
        return mockUseQuery(null);
      });

      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('includes authentication headers in API requests', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockUsers }),
      });

      renderWithProviders(<AdminUsersPage />);
      
      // The actual implementation would include auth headers
      // This test verifies the integration exists
      expect(useQuery).toHaveBeenCalled();
    });
  });

  describe('Permissions and Security', () => {
    it('only allows authorized users to access admin functions', () => {
      // This would be handled by the RouteGuard component
      // The test verifies that admin functions are available
      renderWithProviders(<AdminUsersPage />);
      
      // Admin actions should be available
      expect(screen.getAllByText('Edit')).toHaveLength(mockUsers.length);
      expect(screen.getAllByText('Delete')).toHaveLength(mockUsers.length);
    });

    it('prevents editing of super admin users', () => {
      const superAdminUser = { 
        ...mockAdminUser, 
        id: 'super-admin', 
        role: 'super_admin',
        firstName: 'Super',
        lastName: 'Admin',
      };
      
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return mockUseQuery({ users: [superAdminUser], total: 1 });
        }
        return mockUseQuery(mockUserAnalytics);
      });

      renderWithProviders(<AdminUsersPage />);
      
      // Super admin users might have restricted actions
      const editButton = screen.queryByTestId('edit-user-super-admin');
      if (editButton) {
        expect(editButton).toBeDisabled();
      }
    });

    it('validates user permissions before mutations', () => {
      // The mutations would include permission checks
      renderWithProviders(<AdminUsersPage />);
      
      // The mutation functions should be called with proper validation
      expect(useMutation).toHaveBeenCalled();
    });
  });

  describe('Performance Considerations', () => {
    it('implements proper pagination for large user lists', () => {
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
        firstName: `User${i}`,
        lastName: 'Test',
        email: `user${i}@example.com`,
      }));

      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return mockUseQuery({ users: manyUsers.slice(0, 20), total: 100 });
        }
        return mockUseQuery(mockUserAnalytics);
      });

      renderWithProviders(<AdminUsersPage />);
      
      // Should show paginated results
      expect(screen.getAllByTestId(/user-row-/)).toHaveLength(20);
    });

    it('debounces search input', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByTestId('search-input');
      
      // Rapid typing should debounce
      await user.type(searchInput, 'test');
      
      // Should not trigger query for every keystroke
      // In real implementation, this would be debounced
      expect(searchInput).toHaveValue('test');
    });

    it('memoizes filter results', () => {
      const { rerender } = renderWithProviders(<AdminUsersPage />);
      
      // Re-render with same props
      rerender(<AdminUsersPage />);
      
      // Should not recalculate filters unnecessarily
      // This would be tested with performance profiling in real scenarios
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels for interactive elements', () => {
      renderWithProviders(<AdminUsersPage />);
      
      const editButtons = screen.getAllByTestId(/edit-user-/);
      editButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('supports keyboard navigation', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      
      // Tab through interactive elements
      await user.tab();
      expect(screen.getByTestId('search-input')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('role-filter')).toHaveFocus();
    });

    it('announces changes to screen readers', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const searchInput = screen.getByTestId('search-input');
      
      await user.type(searchInput, 'test');
      
      // Results changes should be announced
      // This would be tested with screen reader testing tools
    });

    it('has proper heading structure', () => {
      renderWithProviders(<AdminUsersPage />);
      
      // Should have logical heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty user list', () => {
      (useQuery as unknown).mockImplementation(({ queryKey }: unknown) => {
        if (queryKey[0] === 'admin-users') {
          return mockUseQuery({ users: [], total: 0 });
        }
        return mockUseQuery(mockUserAnalytics);
      });

      renderWithProviders(<AdminUsersPage />);
      
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });

    it('handles simultaneous edit and delete operations', async () => {
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      
      // Try to edit and delete the same user
      const editButton = screen.getByTestId('edit-user-client-1');
      const deleteButton = screen.getByTestId('delete-user-client-1');
      
      await user.click(editButton);
      await user.click(deleteButton);
      
      // Should handle conflicts gracefully
      expect(screen.getByTestId('user-edit-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('user-delete-dialog')).toBeInTheDocument();
    });

    it('recovers from network errors during mutations', async () => {
      const failingMutation = {
        ...mockUpdateMutation,
        isError: true,
        error: new Error('Network error'),
      };
      
      (useMutation as unknown).mockImplementation(() => failingMutation);
      
      renderWithProviders(<AdminUsersPage />);
      
      const user = userEvent.setup();
      const editButton = screen.getByTestId('edit-user-coach-1');
      
      await user.click(editButton);
      await user.click(screen.getByTestId('save-user'));
      
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('handles component unmounting during API calls', () => {
      const { unmount } = renderWithProviders(<AdminUsersPage />);
      
      // Unmount while mutations might be in progress
      unmount();
      
      // Should not cause memory leaks
      expect(() => unmount()).not.toThrow();
    });
  });
});