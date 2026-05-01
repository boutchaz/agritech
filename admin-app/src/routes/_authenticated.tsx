import { createFileRoute, Outlet, Navigate, useRouterState } from '@tanstack/react-router';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/hooks/useAuth';

function AuthenticatedLayout() {
  const { user, isLoading, isInternalAdmin, signOut } = useAuth();
  const { location } = useRouterState();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    const current = `${location.pathname}${location.searchStr ?? ''}`;
    return <Navigate to="/login" search={{ redirect: current }} />;
  }

  if (!isInternalAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-8">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-gray-900 sm:text-2xl">Access Denied</h1>
          <p className="mb-4 text-sm text-gray-600 sm:text-base">
            You don't have internal admin privileges to access this application.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                } finally {
                  window.location.href = '/login';
                }
              }}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="text-primary hover:underline"
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
});
