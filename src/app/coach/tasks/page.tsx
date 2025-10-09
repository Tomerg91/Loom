import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { TaskListView } from '@/modules/tasks/components';

export default function CoachTasksPage() {
  return (
    <CoachOrAdminRoute>
      <div className="mx-auto w-full max-w-6xl space-y-8 py-8">
        <TaskListView />
      </div>
    </CoachOrAdminRoute>
  );
}
