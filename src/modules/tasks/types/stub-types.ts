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
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date: string | null;
  coach_id: string;
  client_id: string;
  category_id: string | null;
  visibility_to_coach: boolean;
  recurrence_rule: unknown | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskCategoryRow = {
  id: string;
  label: string;
  coach_id: string;
  color_hex: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInstanceRow = {
  id: string;
  task_id: string;
  scheduled_date: string | null;
  due_date: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  completion_percentage: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskProgressUpdateRow = {
  id: string;
  task_instance_id: string;
  author_id: string;
  percentage: number;
  note: string | null;
  is_visible_to_coach: boolean;
  created_at: string;
};

export type TaskAttachmentRow = {
  id: string;
  task_instance_id: string | null;
  progress_update_id: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by_id: string | null;
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
        Insert: Omit<TaskProgressUpdateRow, 'id' | 'created_at'>;
        Update: Partial<Omit<TaskProgressUpdateRow, 'id' | 'created_at'>>;
      };
      task_attachments: {
        Row: TaskAttachmentRow;
        Insert: Omit<TaskAttachmentRow, 'id' | 'created_at'>;
        Update: Partial<Omit<TaskAttachmentRow, 'id' | 'created_at'>>;
      };
    };
  };
};
