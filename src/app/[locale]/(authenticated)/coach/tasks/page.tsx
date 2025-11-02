import { CoachOrAdminRoute } from '@/components/auth/route-guard';
import { TaskListView } from '@/modules/tasks/components';

export default function CoachTasksPage() {
  return (
    <CoachOrAdminRoute>
      <div className="container mx-auto py-8">
        <TaskListView />
      </div>
    </CoachOrAdminRoute>
  );
}
