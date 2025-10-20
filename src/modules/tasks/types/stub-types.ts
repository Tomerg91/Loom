/**
 * Stub types for tasks module
 *
 * These are temporary types used when the tasks tables don't exist in the database yet.
 * Once the tasks migration (20251001000000_add_tasks_domain.sql) is applied to production,
 * these should be replaced with generated Supabase types.
 */

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  coach_id: string;
  client_id: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  coach_id: string;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInstanceRow = {
  id: string;
  task_id: string;
  client_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskProgressUpdateRow = {
  id: string;
  instance_id: string;
  note: string | null;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
};

export type TaskAttachmentRow = {
  id: string;
  task_id: string;
  file_id: string;
  created_at: string;
};

// Database type structure
export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: TaskRow;
        Insert: Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_categories: {
        Row: TaskCategoryRow;
        Insert: Omit<TaskCategoryRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskCategoryRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_instances: {
        Row: TaskInstanceRow;
        Insert: Omit<TaskInstanceRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskInstanceRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_progress_updates: {
        Row: TaskProgressUpdateRow;
        Insert: Omit<TaskProgressUpdateRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TaskProgressUpdateRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      task_attachments: {
        Row: TaskAttachmentRow;
        Insert: Omit<TaskAttachmentRow, 'id' | 'created_at'>;
        Update: Partial<Omit<TaskAttachmentRow, 'id' | 'created_at'>>;
      };
    };
  };
};
