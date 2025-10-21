'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Shield,
  UserCheck
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { 
  DashboardHeader,
  LoadingState,
  ErrorState,
  StatsCard,
  FilterControls,
  UserManagementTable,
  UserEditDialog,
  UserDeleteDialog,
  User,
  useFilteredData,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS
} from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast-provider';


// User interface is now imported from dashboard components

export function AdminUsersPage() {
  const t = useTranslations('admin.users');
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  // Form state is now handled by the UserEditDialog component

  const { data: usersData, isLoading, error: queryError } = useQuery({
    queryKey: ['admin-users', searchTerm, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch user analytics for dashboard stats
  const { data: userAnalytics } = useQuery({
    queryKey: ['admin-user-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users/analytics');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user analytics');
      }
      
      const result = await response.json();
      return result.data;
    },
  });

  const users = usersData?.users || [];

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<User> }) => {
      const response = await fetch(`/api/admin/users/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      success('User updated successfully');
      setEditingUser(null);
    },
    onError: (err) => {
      error('Update user failed', err.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      success('User deleted successfully');
      setDeletingUser(null);
    },
    onError: (err) => {
      error('Delete user failed', err.message);
    },
  });

  // Event handlers
  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleUpdateUser = (userId: string, updates: Partial<User>) => {
    updateUserMutation.mutate({
      id: userId,
      updates,
    });
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDeleteUser = () => {
    if (!deletingUser) return;
    
    deleteUserMutation.mutate(deletingUser.id);
  };

  // Use filtered data hook
  const filteredUsers = useFilteredData<User>(
    users,
    searchTerm,
    ['email', 'firstName', 'lastName'],
    { role: roleFilter, status: statusFilter }
  );

  if (isLoading) {
    return <LoadingState title={t('title')} description={t('description')} />;
  }

  if (queryError) {
    return <ErrorState title={t('title')} description={t('description')} message="Error loading users" />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t('title')}
        description={t('description')}
        showTimeRange={false}
        showRefresh={false}
        showExport={false}
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('addUser')}
        </Button>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Users"
          value={userAnalytics?.totalUsers || users?.length || 0}
          icon={Users}
          trend={userAnalytics?.newUsersThisMonth ? {
            value: `+${userAnalytics.newUsersThisMonth} this month`,
            isPositive: true,
          } : undefined}
        />
        <StatsCard
          title="Active Users"
          value={userAnalytics?.activeUsers || users?.filter((u: User) => u.status === 'active').length || 0}
          icon={UserCheck}
          trend={userAnalytics?.newUsersThisWeek ? {
            value: `+${userAnalytics.newUsersThisWeek} this week`,
            isPositive: true,
          } : undefined}
        />
        <StatsCard
          title="Coaches"
          value={userAnalytics?.usersByRole?.coach || users?.filter((u: User) => u.role === 'coach').length || 0}
          icon={Shield}
        />
        <StatsCard
          title="Clients"
          value={userAnalytics?.usersByRole?.client || users?.filter((u: User) => u.role === 'client').length || 0}
          icon={Users}
        />
      </div>

      {/* Filters */}
      <FilterControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search users..."
        filters={[
          {
            value: roleFilter,
            onChange: setRoleFilter,
            options: USER_ROLE_OPTIONS,
            placeholder: "Filter by role"
          },
          {
            value: statusFilter,
            onChange: setStatusFilter,
            options: USER_STATUS_OPTIONS,
            placeholder: "Filter by status"
          }
        ]}
      />

      <UserManagementTable
        users={filteredUsers}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
      />

      <UserEditDialog
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleUpdateUser}
        isSaving={updateUserMutation.isPending}
      />

      <UserDeleteDialog
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={confirmDeleteUser}
        isDeleting={deleteUserMutation.isPending}
      />
    </div>
  );
}

// Export as default for dynamic imports
export default AdminUsersPage;