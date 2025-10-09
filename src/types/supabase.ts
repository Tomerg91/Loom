export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          variables?: Json;
          operationName?: string;
          query?: string;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          ip_address: unknown | null;
          resource_id: string | null;
          resource_type: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          resource_id?: string | null;
          resource_type?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          resource_id?: string | null;
          resource_type?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      blocked_ips: {
        Row: {
          blocked_at: string | null;
          blocked_by: string | null;
          blocked_reason: string;
          expires_at: string | null;
          id: string;
          ip_address: unknown;
          is_active: boolean | null;
          unblock_reason: string | null;
          unblocked_at: string | null;
          unblocked_by: string | null;
        };
        Insert: {
          blocked_at?: string | null;
          blocked_by?: string | null;
          blocked_reason: string;
          expires_at?: string | null;
          id?: string;
          ip_address: unknown;
          is_active?: boolean | null;
          unblock_reason?: string | null;
          unblocked_at?: string | null;
          unblocked_by?: string | null;
        };
        Update: {
          blocked_at?: string | null;
          blocked_by?: string | null;
          blocked_reason?: string;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown;
          is_active?: boolean | null;
          unblock_reason?: string | null;
          unblocked_at?: string | null;
          unblocked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'blocked_ips_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'blocked_ips_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'blocked_ips_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'blocked_ips_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'blocked_ips_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'blocked_ips_blocked_by_fkey';
            columns: ['blocked_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocked_ips_unblocked_by_fkey';
            columns: ['unblocked_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'blocked_ips_unblocked_by_fkey';
            columns: ['unblocked_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'blocked_ips_unblocked_by_fkey';
            columns: ['unblocked_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'blocked_ips_unblocked_by_fkey';
            columns: ['unblocked_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'blocked_ips_unblocked_by_fkey';
            columns: ['unblocked_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'blocked_ips_unblocked_by_fkey';
            columns: ['unblocked_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      client_goals: {
        Row: {
          category: string | null;
          client_id: string;
          coach_id: string;
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          priority: string;
          progress_percentage: number | null;
          status: string;
          target_date: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          client_id: string;
          coach_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          priority?: string;
          progress_percentage?: number | null;
          status?: string;
          target_date?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          client_id?: string;
          coach_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          priority?: string;
          progress_percentage?: number | null;
          status?: string;
          target_date?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'client_goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'client_goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'client_goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'client_goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'client_goals_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'client_goals_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      coach_availability: {
        Row: {
          buffer_after_minutes: number | null;
          buffer_before_minutes: number | null;
          coach_id: string;
          created_at: string | null;
          day_of_week: number;
          end_time: string;
          id: string;
          is_available: boolean;
          max_bookings_per_slot: number | null;
          start_time: string;
          timezone: string;
          updated_at: string | null;
        };
        Insert: {
          buffer_after_minutes?: number | null;
          buffer_before_minutes?: number | null;
          coach_id: string;
          created_at?: string | null;
          day_of_week: number;
          end_time: string;
          id?: string;
          is_available?: boolean;
          max_bookings_per_slot?: number | null;
          start_time: string;
          timezone?: string;
          updated_at?: string | null;
        };
        Update: {
          buffer_after_minutes?: number | null;
          buffer_before_minutes?: number | null;
          coach_id?: string;
          created_at?: string | null;
          day_of_week?: number;
          end_time?: string;
          id?: string;
          is_available?: boolean;
          max_bookings_per_slot?: number | null;
          start_time?: string;
          timezone?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      coach_notes: {
        Row: {
          client_id: string;
          coach_id: string;
          content: string;
          created_at: string | null;
          id: string;
          privacy_level: Database['public']['Enums']['privacy_level'];
          session_id: string | null;
          tags: string[] | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          client_id: string;
          coach_id: string;
          content: string;
          created_at?: string | null;
          id?: string;
          privacy_level?: Database['public']['Enums']['privacy_level'];
          session_id?: string | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          client_id?: string;
          coach_id?: string;
          content?: string;
          created_at?: string | null;
          id?: string;
          privacy_level?: Database['public']['Enums']['privacy_level'];
          session_id?: string | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'coach_notes_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coach_notes_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_notes_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_notes_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_notes_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_notes_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'coach_notes_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coach_notes_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coach_notes_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      coach_profiles: {
        Row: {
          bio: string | null;
          certifications: Json | null;
          coach_id: string;
          created_at: string | null;
          currency: string;
          experience_years: number | null;
          id: string;
          languages: string[] | null;
          session_rate: number;
          specializations: string[] | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          bio?: string | null;
          certifications?: Json | null;
          coach_id: string;
          created_at?: string | null;
          currency?: string;
          experience_years?: number | null;
          id?: string;
          languages?: string[] | null;
          session_rate?: number;
          specializations?: string[] | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          bio?: string | null;
          certifications?: Json | null;
          coach_id?: string;
          created_at?: string | null;
          currency?: string;
          experience_years?: number | null;
          id?: string;
          languages?: string[] | null;
          session_rate?: number;
          specializations?: string[] | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          created_at: string | null;
          id: string;
          is_archived: boolean;
          is_muted: boolean;
          joined_at: string | null;
          last_read_at: string | null;
          left_at: string | null;
          role: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          is_archived?: boolean;
          is_muted?: boolean;
          joined_at?: string | null;
          last_read_at?: string | null;
          left_at?: string | null;
          role?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          is_archived?: boolean;
          is_muted?: boolean;
          joined_at?: string | null;
          last_read_at?: string | null;
          left_at?: string | null;
          role?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_participants_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'conversation_participants_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string | null;
          created_by: string;
          id: string;
          is_archived: boolean;
          is_muted: boolean;
          last_message_at: string | null;
          title: string | null;
          type: Database['public']['Enums']['conversation_type'];
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by: string;
          id?: string;
          is_archived?: boolean;
          is_muted?: boolean;
          last_message_at?: string | null;
          title?: string | null;
          type?: Database['public']['Enums']['conversation_type'];
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          id?: string;
          is_archived?: boolean;
          is_muted?: boolean;
          last_message_at?: string | null;
          title?: string | null;
          type?: Database['public']['Enums']['conversation_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'conversations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      database_backups: {
        Row: {
          backup_type: string;
          checksum: string | null;
          completed_at: string | null;
          compression_type: string | null;
          created_at: string;
          duration_ms: number | null;
          file_path: string | null;
          file_size_bytes: number | null;
          id: string;
          include_blobs: boolean | null;
          initiated_by: string | null;
          metadata: Json | null;
          started_at: string;
          status: string;
        };
        Insert: {
          backup_type: string;
          checksum?: string | null;
          completed_at?: string | null;
          compression_type?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          file_path?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          include_blobs?: boolean | null;
          initiated_by?: string | null;
          metadata?: Json | null;
          started_at: string;
          status: string;
        };
        Update: {
          backup_type?: string;
          checksum?: string | null;
          completed_at?: string | null;
          compression_type?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          file_path?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          include_blobs?: boolean | null;
          initiated_by?: string | null;
          metadata?: Json | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      file_analytics_summary: {
        Row: {
          average_download_duration_ms: number | null;
          created_at: string | null;
          date: string;
          download_methods: Json | null;
          failed_downloads: number | null;
          file_id: string;
          id: string;
          successful_downloads: number | null;
          top_countries: string[] | null;
          top_user_agents: string[] | null;
          total_bandwidth_used: number | null;
          total_downloads: number | null;
          unique_downloaders: number | null;
          unique_ip_addresses: number | null;
          updated_at: string | null;
        };
        Insert: {
          average_download_duration_ms?: number | null;
          created_at?: string | null;
          date: string;
          download_methods?: Json | null;
          failed_downloads?: number | null;
          file_id: string;
          id?: string;
          successful_downloads?: number | null;
          top_countries?: string[] | null;
          top_user_agents?: string[] | null;
          total_bandwidth_used?: number | null;
          total_downloads?: number | null;
          unique_downloaders?: number | null;
          unique_ip_addresses?: number | null;
          updated_at?: string | null;
        };
        Update: {
          average_download_duration_ms?: number | null;
          created_at?: string | null;
          date?: string;
          download_methods?: Json | null;
          failed_downloads?: number | null;
          file_id?: string;
          id?: string;
          successful_downloads?: number | null;
          top_countries?: string[] | null;
          top_user_agents?: string[] | null;
          total_bandwidth_used?: number | null;
          total_downloads?: number | null;
          unique_downloaders?: number | null;
          unique_ip_addresses?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'file_analytics_summary_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_analytics_summary_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
        ];
      };
      file_download_logs: {
        Row: {
          bandwidth_used: number | null;
          city: string | null;
          client_info: Json | null;
          country_code: string | null;
          download_duration_ms: number | null;
          download_type: string;
          downloaded_at: string | null;
          downloaded_by: string | null;
          failure_reason: string | null;
          file_id: string;
          file_size_at_download: number | null;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          share_id: string | null;
          success: boolean;
          user_agent: string | null;
        };
        Insert: {
          bandwidth_used?: number | null;
          city?: string | null;
          client_info?: Json | null;
          country_code?: string | null;
          download_duration_ms?: number | null;
          download_type?: string;
          downloaded_at?: string | null;
          downloaded_by?: string | null;
          failure_reason?: string | null;
          file_id: string;
          file_size_at_download?: number | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          share_id?: string | null;
          success?: boolean;
          user_agent?: string | null;
        };
        Update: {
          bandwidth_used?: number | null;
          city?: string | null;
          client_info?: Json | null;
          country_code?: string | null;
          download_duration_ms?: number | null;
          download_type?: string;
          downloaded_at?: string | null;
          downloaded_by?: string | null;
          failure_reason?: string | null;
          file_id?: string;
          file_size_at_download?: number | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          share_id?: string | null;
          success?: boolean;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'file_download_logs_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_download_logs_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
        ];
      };
      file_security_events: {
        Row: {
          created_at: string | null;
          event_details: Json | null;
          event_type: string;
          file_hash: string | null;
          file_id: string | null;
          file_name: string | null;
          file_size: number | null;
          file_type: string | null;
          id: string;
          ip_address: unknown;
          quarantined: boolean | null;
          severity: Database['public']['Enums']['security_severity'];
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          event_details?: Json | null;
          event_type: string;
          file_hash?: string | null;
          file_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          ip_address: unknown;
          quarantined?: boolean | null;
          severity?: Database['public']['Enums']['security_severity'];
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          event_details?: Json | null;
          event_type?: string;
          file_hash?: string | null;
          file_id?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          ip_address?: unknown;
          quarantined?: boolean | null;
          severity?: Database['public']['Enums']['security_severity'];
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'file_security_events_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_security_events_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_security_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_security_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_security_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_security_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_security_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_security_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_shares: {
        Row: {
          access_count: number;
          created_at: string | null;
          expires_at: string | null;
          file_id: string;
          id: string;
          last_accessed_at: string | null;
          permission_type: Database['public']['Enums']['file_permission_type'];
          shared_by: string;
          shared_with: string;
        };
        Insert: {
          access_count?: number;
          created_at?: string | null;
          expires_at?: string | null;
          file_id: string;
          id?: string;
          last_accessed_at?: string | null;
          permission_type?: Database['public']['Enums']['file_permission_type'];
          shared_by: string;
          shared_with: string;
        };
        Update: {
          access_count?: number;
          created_at?: string | null;
          expires_at?: string | null;
          file_id?: string;
          id?: string;
          last_accessed_at?: string | null;
          permission_type?: Database['public']['Enums']['file_permission_type'];
          shared_by?: string;
          shared_with?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'file_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_uploads: {
        Row: {
          auto_version_on_update: boolean | null;
          bucket_name: string;
          created_at: string | null;
          current_version: number | null;
          description: string | null;
          download_count: number;
          file_category: Database['public']['Enums']['file_category'];
          file_size: number;
          file_type: string;
          filename: string;
          id: string;
          is_shared: boolean;
          max_versions: number | null;
          original_filename: string;
          session_id: string | null;
          storage_path: string;
          tags: string[] | null;
          updated_at: string | null;
          user_id: string;
          version_count: number | null;
          versioning_enabled: boolean | null;
        };
        Insert: {
          auto_version_on_update?: boolean | null;
          bucket_name: string;
          created_at?: string | null;
          current_version?: number | null;
          description?: string | null;
          download_count?: number;
          file_category?: Database['public']['Enums']['file_category'];
          file_size: number;
          file_type: string;
          filename: string;
          id?: string;
          is_shared?: boolean;
          max_versions?: number | null;
          original_filename: string;
          session_id?: string | null;
          storage_path: string;
          tags?: string[] | null;
          updated_at?: string | null;
          user_id: string;
          version_count?: number | null;
          versioning_enabled?: boolean | null;
        };
        Update: {
          auto_version_on_update?: boolean | null;
          bucket_name?: string;
          created_at?: string | null;
          current_version?: number | null;
          description?: string | null;
          download_count?: number;
          file_category?: Database['public']['Enums']['file_category'];
          file_size?: number;
          file_type?: string;
          filename?: string;
          id?: string;
          is_shared?: boolean;
          max_versions?: number | null;
          original_filename?: string;
          session_id?: string | null;
          storage_path?: string;
          tags?: string[] | null;
          updated_at?: string | null;
          user_id?: string;
          version_count?: number | null;
          versioning_enabled?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'file_uploads_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_uploads_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      file_version_comparisons: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          result: Json | null;
          version_a_id: string;
          version_b_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          result?: Json | null;
          version_a_id: string;
          version_b_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          result?: Json | null;
          version_a_id?: string;
          version_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'file_version_comparisons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_version_a_id_fkey';
            columns: ['version_a_id'];
            isOneToOne: false;
            referencedRelation: 'file_versions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_version_comparisons_version_b_id_fkey';
            columns: ['version_b_id'];
            isOneToOne: false;
            referencedRelation: 'file_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      file_version_shares: {
        Row: {
          access_count: number | null;
          created_at: string | null;
          expires_at: string | null;
          file_id: string;
          id: string;
          last_accessed_at: string | null;
          message: string | null;
          permission_type: string;
          shared_by: string;
          shared_with: string;
          updated_at: string | null;
          version_id: string;
        };
        Insert: {
          access_count?: number | null;
          created_at?: string | null;
          expires_at?: string | null;
          file_id: string;
          id?: string;
          last_accessed_at?: string | null;
          message?: string | null;
          permission_type: string;
          shared_by: string;
          shared_with: string;
          updated_at?: string | null;
          version_id: string;
        };
        Update: {
          access_count?: number | null;
          created_at?: string | null;
          expires_at?: string | null;
          file_id?: string;
          id?: string;
          last_accessed_at?: string | null;
          message?: string | null;
          permission_type?: string;
          shared_by?: string;
          shared_with?: string;
          updated_at?: string | null;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'file_version_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_version_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_version_shares_shared_with_fkey';
            columns: ['shared_with'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_version_shares_version_id_fkey';
            columns: ['version_id'];
            isOneToOne: false;
            referencedRelation: 'file_versions';
            referencedColumns: ['id'];
          },
        ];
      };
      file_versions: {
        Row: {
          change_summary: string | null;
          created_at: string | null;
          created_by: string;
          description: string | null;
          diff_metadata: Json | null;
          file_hash: string;
          file_id: string;
          file_size: number;
          file_type: string;
          filename: string;
          id: string;
          is_current_version: boolean | null;
          is_major_version: boolean | null;
          original_filename: string;
          storage_path: string;
          version_number: number;
        };
        Insert: {
          change_summary?: string | null;
          created_at?: string | null;
          created_by: string;
          description?: string | null;
          diff_metadata?: Json | null;
          file_hash: string;
          file_id: string;
          file_size: number;
          file_type: string;
          filename: string;
          id?: string;
          is_current_version?: boolean | null;
          is_major_version?: boolean | null;
          original_filename: string;
          storage_path: string;
          version_number: number;
        };
        Update: {
          change_summary?: string | null;
          created_at?: string | null;
          created_by?: string;
          description?: string | null;
          diff_metadata?: Json | null;
          file_hash?: string;
          file_id?: string;
          file_size?: number;
          file_type?: string;
          filename?: string;
          id?: string;
          is_current_version?: boolean | null;
          is_major_version?: boolean | null;
          original_filename?: string;
          storage_path?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'file_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_versions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_versions_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_versions_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
        ];
      };
      goal_milestones: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          description: string | null;
          goal_id: string;
          id: string;
          notes: string | null;
          target_date: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          goal_id: string;
          id?: string;
          notes?: string | null;
          target_date?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          description?: string | null;
          goal_id?: string;
          id?: string;
          notes?: string | null;
          target_date?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'goal_milestones_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'client_goals';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_logs: {
        Row: {
          action: Database['public']['Enums']['maintenance_action_type'];
          completed_at: string | null;
          created_at: string;
          duration_ms: number | null;
          error_details: Json | null;
          error_message: string | null;
          id: string;
          initiated_by: string | null;
          initiated_by_email: string | null;
          parameters: Json | null;
          result: Json | null;
          started_at: string;
          status: Database['public']['Enums']['maintenance_status'];
          system_info: Json | null;
          updated_at: string;
        };
        Insert: {
          action: Database['public']['Enums']['maintenance_action_type'];
          completed_at?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          error_details?: Json | null;
          error_message?: string | null;
          id?: string;
          initiated_by?: string | null;
          initiated_by_email?: string | null;
          parameters?: Json | null;
          result?: Json | null;
          started_at?: string;
          status?: Database['public']['Enums']['maintenance_status'];
          system_info?: Json | null;
          updated_at?: string;
        };
        Update: {
          action?: Database['public']['Enums']['maintenance_action_type'];
          completed_at?: string | null;
          created_at?: string;
          duration_ms?: number | null;
          error_details?: Json | null;
          error_message?: string | null;
          id?: string;
          initiated_by?: string | null;
          initiated_by_email?: string | null;
          parameters?: Json | null;
          result?: Json | null;
          started_at?: string;
          status?: Database['public']['Enums']['maintenance_status'];
          system_info?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_attachments: {
        Row: {
          attachment_type: Database['public']['Enums']['attachment_type'];
          created_at: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          id: string;
          message_id: string;
          metadata: Json | null;
          thumbnail_url: string | null;
          updated_at: string | null;
          url: string;
        };
        Insert: {
          attachment_type?: Database['public']['Enums']['attachment_type'];
          created_at?: string | null;
          file_name: string;
          file_size: number;
          file_type: string;
          id?: string;
          message_id: string;
          metadata?: Json | null;
          thumbnail_url?: string | null;
          updated_at?: string | null;
          url: string;
        };
        Update: {
          attachment_type?: Database['public']['Enums']['attachment_type'];
          created_at?: string | null;
          file_name?: string;
          file_size?: number;
          file_type?: string;
          id?: string;
          message_id?: string;
          metadata?: Json | null;
          thumbnail_url?: string | null;
          updated_at?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_attachments_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
        ];
      };
      message_reactions: {
        Row: {
          created_at: string | null;
          emoji: string;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          emoji: string;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          emoji?: string;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_reactions_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'message_reactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      message_read_receipts: {
        Row: {
          id: string;
          message_id: string;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'message_read_receipts_message_id_fkey';
            columns: ['message_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'message_read_receipts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string | null;
          delivered_at: string | null;
          edited_at: string | null;
          id: string;
          is_edited: boolean;
          metadata: Json | null;
          reply_to_id: string | null;
          sender_id: string;
          status: Database['public']['Enums']['message_status'];
          type: Database['public']['Enums']['message_type'];
          updated_at: string | null;
        };
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string | null;
          delivered_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_edited?: boolean;
          metadata?: Json | null;
          reply_to_id?: string | null;
          sender_id: string;
          status?: Database['public']['Enums']['message_status'];
          type?: Database['public']['Enums']['message_type'];
          updated_at?: string | null;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string | null;
          delivered_at?: string | null;
          edited_at?: string | null;
          id?: string;
          is_edited?: boolean;
          metadata?: Json | null;
          reply_to_id?: string | null;
          sender_id?: string;
          status?: Database['public']['Enums']['message_status'];
          type?: Database['public']['Enums']['message_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_reply_to_id_fkey';
            columns: ['reply_to_id'];
            isOneToOne: false;
            referencedRelation: 'messages';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_attempts: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          id: string;
          ip_address: unknown | null;
          method: Database['public']['Enums']['mfa_method'];
          success: boolean;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          ip_address?: unknown | null;
          method: Database['public']['Enums']['mfa_method'];
          success: boolean;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          ip_address?: unknown | null;
          method?: Database['public']['Enums']['mfa_method'];
          success?: boolean;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_audit_log: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          ip_address: unknown | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: unknown | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_backup_codes: {
        Row: {
          code_hash: string;
          code_salt: string;
          created_at: string | null;
          expires_at: string;
          id: string;
          status: Database['public']['Enums']['backup_code_status'];
          used_at: string | null;
          used_ip: unknown | null;
          used_user_agent: string | null;
          user_id: string;
        };
        Insert: {
          code_hash: string;
          code_salt: string;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          status?: Database['public']['Enums']['backup_code_status'];
          used_at?: string | null;
          used_ip?: unknown | null;
          used_user_agent?: string | null;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          code_salt?: string;
          created_at?: string | null;
          expires_at?: string;
          id?: string;
          status?: Database['public']['Enums']['backup_code_status'];
          used_at?: string | null;
          used_ip?: unknown | null;
          used_user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_backup_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_backup_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_backup_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_backup_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_backup_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_backup_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_events: {
        Row: {
          created_at: string | null;
          event_type: Database['public']['Enums']['mfa_event_type'];
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          event_type: Database['public']['Enums']['mfa_event_type'];
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          event_type?: Database['public']['Enums']['mfa_event_type'];
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_sessions: {
        Row: {
          created_at: string | null;
          device_fingerprint: string | null;
          expires_at: string;
          id: string;
          ip_address: unknown | null;
          mfa_verified: boolean | null;
          password_verified: boolean | null;
          session_token: string;
          updated_at: string | null;
          user_agent: string | null;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string | null;
          device_fingerprint?: string | null;
          expires_at: string;
          id?: string;
          ip_address?: unknown | null;
          mfa_verified?: boolean | null;
          password_verified?: boolean | null;
          session_token: string;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string | null;
          device_fingerprint?: string | null;
          expires_at?: string;
          id?: string;
          ip_address?: unknown | null;
          mfa_verified?: boolean | null;
          password_verified?: boolean | null;
          session_token?: string;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_system_config: {
        Row: {
          description: string | null;
          id: string;
          setting_key: string;
          setting_value: Json;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          description?: string | null;
          id?: string;
          setting_key: string;
          setting_value: Json;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          description?: string | null;
          id?: string;
          setting_key?: string;
          setting_value?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_system_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_system_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_system_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_system_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_system_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_system_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      mfa_verification_attempts: {
        Row: {
          attempt_code: string | null;
          created_at: string | null;
          failure_reason: string | null;
          id: string;
          ip_address: unknown | null;
          is_backup_code: boolean | null;
          method_id: string | null;
          method_type: Database['public']['Enums']['mfa_method_type'];
          processing_time_ms: number | null;
          session_id: string | null;
          status: Database['public']['Enums']['mfa_verification_status'];
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          attempt_code?: string | null;
          created_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_backup_code?: boolean | null;
          method_id?: string | null;
          method_type: Database['public']['Enums']['mfa_method_type'];
          processing_time_ms?: number | null;
          session_id?: string | null;
          status: Database['public']['Enums']['mfa_verification_status'];
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          attempt_code?: string | null;
          created_at?: string | null;
          failure_reason?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_backup_code?: boolean | null;
          method_id?: string | null;
          method_type?: Database['public']['Enums']['mfa_method_type'];
          processing_time_ms?: number | null;
          session_id?: string | null;
          status?: Database['public']['Enums']['mfa_verification_status'];
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mfa_verification_attempts_method_id_fkey';
            columns: ['method_id'];
            isOneToOne: false;
            referencedRelation: 'user_mfa_methods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mfa_verification_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_verification_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'mfa_verification_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_verification_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'mfa_verification_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'mfa_verification_attempts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_delivery_logs: {
        Row: {
          channel: string;
          clicked_at: string | null;
          created_at: string | null;
          delivered_at: string | null;
          error_code: string | null;
          error_message: string | null;
          failed_at: string | null;
          id: string;
          notification_id: string;
          opened_at: string | null;
          provider_id: string | null;
          provider_response: Json | null;
          sent_at: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          channel: string;
          clicked_at?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          notification_id: string;
          opened_at?: string | null;
          provider_id?: string | null;
          provider_response?: Json | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          channel?: string;
          clicked_at?: string | null;
          created_at?: string | null;
          delivered_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          failed_at?: string | null;
          id?: string;
          notification_id?: string;
          opened_at?: string | null;
          provider_id?: string | null;
          provider_response?: Json | null;
          sent_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_delivery_logs_notification_id_fkey';
            columns: ['notification_id'];
            isOneToOne: false;
            referencedRelation: 'notifications';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_jobs: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          error_message: string | null;
          id: string;
          max_retries: number | null;
          payload: Json;
          priority: number | null;
          retry_count: number | null;
          scheduled_for: string;
          started_at: string | null;
          status: string;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          max_retries?: number | null;
          payload: Json;
          priority?: number | null;
          retry_count?: number | null;
          scheduled_for?: string;
          started_at?: string | null;
          status?: string;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          max_retries?: number | null;
          payload?: Json;
          priority?: number | null;
          retry_count?: number | null;
          scheduled_for?: string;
          started_at?: string | null;
          status?: string;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          created_at: string | null;
          digest_frequency: string | null;
          email_enabled: boolean;
          email_marketing: boolean;
          email_messages: boolean;
          email_session_reminders: boolean;
          email_session_updates: boolean;
          email_system_updates: boolean;
          id: string;
          inapp_enabled: boolean;
          inapp_messages: boolean;
          inapp_session_reminders: boolean;
          inapp_session_updates: boolean;
          inapp_system_updates: boolean;
          push_enabled: boolean;
          push_messages: boolean;
          push_session_reminders: boolean;
          quiet_hours_enabled: boolean;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          timezone: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          digest_frequency?: string | null;
          email_enabled?: boolean;
          email_marketing?: boolean;
          email_messages?: boolean;
          email_session_reminders?: boolean;
          email_session_updates?: boolean;
          email_system_updates?: boolean;
          id?: string;
          inapp_enabled?: boolean;
          inapp_messages?: boolean;
          inapp_session_reminders?: boolean;
          inapp_session_updates?: boolean;
          inapp_system_updates?: boolean;
          push_enabled?: boolean;
          push_messages?: boolean;
          push_session_reminders?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          digest_frequency?: string | null;
          email_enabled?: boolean;
          email_marketing?: boolean;
          email_messages?: boolean;
          email_session_reminders?: boolean;
          email_session_updates?: boolean;
          email_system_updates?: boolean;
          id?: string;
          inapp_enabled?: boolean;
          inapp_messages?: boolean;
          inapp_session_reminders?: boolean;
          inapp_session_updates?: boolean;
          inapp_system_updates?: boolean;
          push_enabled?: boolean;
          push_messages?: boolean;
          push_session_reminders?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'notification_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_templates: {
        Row: {
          body: string;
          channel: string;
          created_at: string | null;
          html_body: string | null;
          id: string;
          is_active: boolean;
          language: Database['public']['Enums']['language'];
          subject: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at: string | null;
          variables: Json | null;
          version: number;
        };
        Insert: {
          body: string;
          channel: string;
          created_at?: string | null;
          html_body?: string | null;
          id?: string;
          is_active?: boolean;
          language?: Database['public']['Enums']['language'];
          subject?: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at?: string | null;
          variables?: Json | null;
          version?: number;
        };
        Update: {
          body?: string;
          channel?: string;
          created_at?: string | null;
          html_body?: string | null;
          id?: string;
          is_active?: boolean;
          language?: Database['public']['Enums']['language'];
          subject?: string | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          updated_at?: string | null;
          variables?: Json | null;
          version?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          action_label: string | null;
          action_url: string | null;
          channel: string | null;
          created_at: string | null;
          data: Json | null;
          expires_at: string | null;
          id: string;
          message: string;
          priority: string | null;
          read_at: string | null;
          scheduled_for: string | null;
          sent_at: string | null;
          template_id: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Insert: {
          action_label?: string | null;
          action_url?: string | null;
          channel?: string | null;
          created_at?: string | null;
          data?: Json | null;
          expires_at?: string | null;
          id?: string;
          message: string;
          priority?: string | null;
          read_at?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          template_id?: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          user_id: string;
        };
        Update: {
          action_label?: string | null;
          action_url?: string | null;
          channel?: string | null;
          created_at?: string | null;
          data?: Json | null;
          expires_at?: string | null;
          id?: string;
          message?: string;
          priority?: string | null;
          read_at?: string | null;
          scheduled_for?: string | null;
          sent_at?: string | null;
          template_id?: string | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'notification_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          idempotency_key: string | null;
          metadata: Json | null;
          provider: string;
          provider_transaction_id: string | null;
          raw_payload: Json | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json | null;
          provider?: string;
          provider_transaction_id?: string | null;
          raw_payload?: Json | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          idempotency_key?: string | null;
          metadata?: Json | null;
          provider?: string;
          provider_transaction_id?: string | null;
          raw_payload?: Json | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'payments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      practice_journal_entries: {
        Row: {
          body_areas: string[] | null;
          client_id: string;
          content: string;
          created_at: string | null;
          emotions: string[] | null;
          energy_level: number | null;
          id: string;
          insights: string | null;
          mood_rating: number | null;
          practices_done: string[] | null;
          sensations: string[] | null;
          session_id: string | null;
          shared_at: string | null;
          shared_with_coach: boolean | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          body_areas?: string[] | null;
          client_id: string;
          content: string;
          created_at?: string | null;
          emotions?: string[] | null;
          energy_level?: number | null;
          id?: string;
          insights?: string | null;
          mood_rating?: number | null;
          practices_done?: string[] | null;
          sensations?: string[] | null;
          session_id?: string | null;
          shared_at?: string | null;
          shared_with_coach?: boolean | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          body_areas?: string[] | null;
          client_id?: string;
          content?: string;
          created_at?: string | null;
          emotions?: string[] | null;
          energy_level?: number | null;
          id?: string;
          insights?: string | null;
          mood_rating?: number | null;
          practices_done?: string[] | null;
          sensations?: string[] | null;
          session_id?: string | null;
          shared_at?: string | null;
          shared_with_coach?: boolean | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_journal_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'practice_journal_entries_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          created_at: string | null;
          endpoint: string;
          id: string;
          is_active: boolean;
          p256dh_key: string;
          updated_at: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth_key: string;
          created_at?: string | null;
          endpoint: string;
          id?: string;
          is_active?: boolean;
          p256dh_key: string;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth_key?: string;
          created_at?: string | null;
          endpoint?: string;
          id?: string;
          is_active?: boolean;
          p256dh_key?: string;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      quarantined_files: {
        Row: {
          auto_delete_at: string | null;
          file_hash: string;
          file_size: number;
          file_type: string | null;
          id: string;
          original_file_name: string;
          quarantine_reason: string;
          quarantined_at: string | null;
          review_notes: string | null;
          review_status: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          scan_details: string | null;
          scan_provider: string;
          threat_name: string;
          upload_ip_address: unknown | null;
          uploaded_by: string | null;
        };
        Insert: {
          auto_delete_at?: string | null;
          file_hash: string;
          file_size: number;
          file_type?: string | null;
          id?: string;
          original_file_name: string;
          quarantine_reason: string;
          quarantined_at?: string | null;
          review_notes?: string | null;
          review_status?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scan_details?: string | null;
          scan_provider: string;
          threat_name: string;
          upload_ip_address?: unknown | null;
          uploaded_by?: string | null;
        };
        Update: {
          auto_delete_at?: string | null;
          file_hash?: string;
          file_size?: number;
          file_type?: string | null;
          id?: string;
          original_file_name?: string;
          quarantine_reason?: string;
          quarantined_at?: string | null;
          review_notes?: string | null;
          review_status?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scan_details?: string | null;
          scan_provider?: string;
          threat_name?: string;
          upload_ip_address?: unknown | null;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quarantined_files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'quarantined_files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'quarantined_files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'quarantined_files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'quarantined_files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'quarantined_files_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quarantined_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'quarantined_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'quarantined_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'quarantined_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'quarantined_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'quarantined_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limit_violations: {
        Row: {
          endpoint: string;
          id: string;
          ip_address: unknown;
          limit_exceeded_at: string | null;
          request_count: number;
          user_agent: string | null;
          user_id: string | null;
          window_end: string;
          window_start: string;
        };
        Insert: {
          endpoint: string;
          id?: string;
          ip_address: unknown;
          limit_exceeded_at?: string | null;
          request_count: number;
          user_agent?: string | null;
          user_id?: string | null;
          window_end: string;
          window_start: string;
        };
        Update: {
          endpoint?: string;
          id?: string;
          ip_address?: unknown;
          limit_exceeded_at?: string | null;
          request_count?: number;
          user_agent?: string | null;
          user_id?: string | null;
          window_end?: string;
          window_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rate_limit_violations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'rate_limit_violations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'rate_limit_violations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'rate_limit_violations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'rate_limit_violations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'rate_limit_violations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reflections: {
        Row: {
          client_id: string;
          content: string;
          created_at: string | null;
          goals_for_next_session: string | null;
          id: string;
          insights: string | null;
          mood_rating: number | null;
          session_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          client_id: string;
          content: string;
          created_at?: string | null;
          goals_for_next_session?: string | null;
          id?: string;
          insights?: string | null;
          mood_rating?: number | null;
          session_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          client_id?: string;
          content?: string;
          created_at?: string | null;
          goals_for_next_session?: string | null;
          id?: string;
          insights?: string | null;
          mood_rating?: number | null;
          session_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reflections_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'reflections_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'reflections_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'reflections_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'reflections_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'reflections_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reflections_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reflections_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      scheduled_notifications: {
        Row: {
          channel: string;
          created_at: string | null;
          error_message: string | null;
          id: string;
          max_retries: number | null;
          message: string;
          priority: string;
          retry_count: number | null;
          scheduled_for: string;
          sent_at: string | null;
          status: string;
          template_id: string | null;
          template_variables: Json | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          channel: string;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          max_retries?: number | null;
          message: string;
          priority?: string;
          retry_count?: number | null;
          scheduled_for: string;
          sent_at?: string | null;
          status?: string;
          template_id?: string | null;
          template_variables?: Json | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          channel?: string;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          max_retries?: number | null;
          message?: string;
          priority?: string;
          retry_count?: number | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          template_id?: string | null;
          template_variables?: Json | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'scheduled_notifications_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'notification_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'scheduled_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'scheduled_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'scheduled_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'scheduled_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'scheduled_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'scheduled_notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      security_audit_log: {
        Row: {
          event_details: Json | null;
          event_type: string;
          id: string;
          ip_address: unknown | null;
          severity: string | null;
          timestamp: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          event_details?: Json | null;
          event_type: string;
          id?: string;
          ip_address?: unknown | null;
          severity?: string | null;
          timestamp?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          event_details?: Json | null;
          event_type?: string;
          id?: string;
          ip_address?: unknown | null;
          severity?: string | null;
          timestamp?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'security_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'security_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'security_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'security_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'security_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'security_audit_log_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      security_logs: {
        Row: {
          activity_type: string;
          details: string | null;
          id: string;
          ip_address: unknown;
          referer: string | null;
          request_method: string | null;
          request_path: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: Database['public']['Enums']['security_severity'];
          timestamp: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          activity_type: string;
          details?: string | null;
          id?: string;
          ip_address: unknown;
          referer?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: Database['public']['Enums']['security_severity'];
          timestamp?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          activity_type?: string;
          details?: string | null;
          id?: string;
          ip_address?: unknown;
          referer?: string | null;
          request_method?: string | null;
          request_path?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: Database['public']['Enums']['security_severity'];
          timestamp?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'security_logs_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'security_logs_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'security_logs_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'security_logs_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'security_logs_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'security_logs_resolved_by_fkey';
            columns: ['resolved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'security_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'security_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'security_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'security_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'security_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'security_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      session_feedback: {
        Row: {
          anonymous: boolean;
          client_id: string;
          coach_id: string;
          communication_rating: number | null;
          created_at: string | null;
          feedback_text: string | null;
          helpfulness_rating: number | null;
          id: string;
          overall_rating: number;
          preparation_rating: number | null;
          session_id: string;
          updated_at: string | null;
          would_recommend: boolean | null;
        };
        Insert: {
          anonymous?: boolean;
          client_id: string;
          coach_id: string;
          communication_rating?: number | null;
          created_at?: string | null;
          feedback_text?: string | null;
          helpfulness_rating?: number | null;
          id?: string;
          overall_rating: number;
          preparation_rating?: number | null;
          session_id: string;
          updated_at?: string | null;
          would_recommend?: boolean | null;
        };
        Update: {
          anonymous?: boolean;
          client_id?: string;
          coach_id?: string;
          communication_rating?: number | null;
          created_at?: string | null;
          feedback_text?: string | null;
          helpfulness_rating?: number | null;
          id?: string;
          overall_rating?: number;
          preparation_rating?: number | null;
          session_id?: string;
          updated_at?: string | null;
          would_recommend?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'session_feedback_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_feedback_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_feedback_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_feedback_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_feedback_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'session_feedback_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_feedback_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_feedback_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_feedback_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_feedback_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_feedback_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'session_feedback_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_feedback_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_feedback_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      session_files: {
        Row: {
          created_at: string | null;
          file_category: Database['public']['Enums']['file_category'];
          file_id: string;
          id: string;
          is_required: boolean;
          session_id: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          file_category?: Database['public']['Enums']['file_category'];
          file_id: string;
          id?: string;
          is_required?: boolean;
          session_id: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          file_category?: Database['public']['Enums']['file_category'];
          file_id?: string;
          id?: string;
          is_required?: boolean;
          session_id?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'session_files_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_files_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_files_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_files_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'session_files_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      session_ratings: {
        Row: {
          client_id: string;
          coach_id: string;
          created_at: string | null;
          id: string;
          rating: number;
          review: string | null;
          session_id: string;
          updated_at: string | null;
        };
        Insert: {
          client_id: string;
          coach_id: string;
          created_at?: string | null;
          id?: string;
          rating: number;
          review?: string | null;
          session_id: string;
          updated_at?: string | null;
        };
        Update: {
          client_id?: string;
          coach_id?: string;
          created_at?: string | null;
          id?: string;
          rating?: number;
          review?: string | null;
          session_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'session_ratings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_ratings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_ratings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_ratings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_ratings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'session_ratings_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_ratings_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_ratings_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'session_ratings_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_ratings_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'session_ratings_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'session_ratings_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_ratings_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: true;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_ratings_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: true;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      sessions: {
        Row: {
          client_id: string;
          coach_id: string;
          created_at: string | null;
          description: string | null;
          duration_minutes: number;
          id: string;
          meeting_url: string | null;
          notes: string | null;
          scheduled_at: string;
          status: Database['public']['Enums']['session_status'];
          title: string;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          client_id: string;
          coach_id: string;
          created_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          meeting_url?: string | null;
          notes?: string | null;
          scheduled_at: string;
          status?: Database['public']['Enums']['session_status'];
          title: string;
          type?: string;
          updated_at?: string | null;
        };
        Update: {
          client_id?: string;
          coach_id?: string;
          created_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          meeting_url?: string | null;
          notes?: string | null;
          scheduled_at?: string;
          status?: Database['public']['Enums']['session_status'];
          title?: string;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sessions_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sessions_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'sessions_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'sessions_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'sessions_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'sessions_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      system_audit_logs: {
        Row: {
          action: Database['public']['Enums']['audit_action_type'];
          created_at: string;
          description: string | null;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          request_id: string | null;
          resource: string | null;
          resource_id: string | null;
          risk_level: string | null;
          session_id: string | null;
          user_agent: string | null;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: Database['public']['Enums']['audit_action_type'];
          created_at?: string;
          description?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          request_id?: string | null;
          resource?: string | null;
          resource_id?: string | null;
          risk_level?: string | null;
          session_id?: string | null;
          user_agent?: string | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: Database['public']['Enums']['audit_action_type'];
          created_at?: string;
          description?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          request_id?: string | null;
          resource?: string | null;
          resource_id?: string | null;
          risk_level?: string | null;
          session_id?: string | null;
          user_agent?: string | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      system_health: {
        Row: {
          component: string;
          created_at: string | null;
          id: string;
          last_checked_at: string | null;
          metrics: Json | null;
          status: string;
        };
        Insert: {
          component: string;
          created_at?: string | null;
          id?: string;
          last_checked_at?: string | null;
          metrics?: Json | null;
          status: string;
        };
        Update: {
          component?: string;
          created_at?: string | null;
          id?: string;
          last_checked_at?: string | null;
          metrics?: Json | null;
          status?: string;
        };
        Relationships: [];
      };
      system_health_checks: {
        Row: {
          check_type: string;
          created_at: string;
          error_message: string | null;
          id: string;
          metrics: Json | null;
          performed_by: string | null;
          response_time_ms: number | null;
          status: string;
        };
        Insert: {
          check_type: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          metrics?: Json | null;
          performed_by?: string | null;
          response_time_ms?: number | null;
          status: string;
        };
        Update: {
          check_type?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          metrics?: Json | null;
          performed_by?: string | null;
          response_time_ms?: number | null;
          status?: string;
        };
        Relationships: [];
      };
      temporary_file_shares: {
        Row: {
          created_at: string | null;
          created_by: string;
          current_downloads: number | null;
          description: string | null;
          expires_at: string;
          file_id: string;
          id: string;
          is_active: boolean | null;
          max_downloads: number | null;
          metadata: Json | null;
          password_hash: string | null;
          share_token: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by: string;
          current_downloads?: number | null;
          description?: string | null;
          expires_at: string;
          file_id: string;
          id?: string;
          is_active?: boolean | null;
          max_downloads?: number | null;
          metadata?: Json | null;
          password_hash?: string | null;
          share_token: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          current_downloads?: number | null;
          description?: string | null;
          expires_at?: string;
          file_id?: string;
          id?: string;
          is_active?: boolean | null;
          max_downloads?: number | null;
          metadata?: Json | null;
          password_hash?: string | null;
          share_token?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'temporary_file_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'temporary_file_shares_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
        ];
      };
      temporary_share_access_logs: {
        Row: {
          access_type: string;
          accessed_at: string | null;
          bytes_served: number | null;
          city: string | null;
          country_code: string | null;
          failure_reason: string | null;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          share_id: string;
          success: boolean;
          user_agent: string | null;
        };
        Insert: {
          access_type?: string;
          accessed_at?: string | null;
          bytes_served?: number | null;
          city?: string | null;
          country_code?: string | null;
          failure_reason?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          share_id: string;
          success?: boolean;
          user_agent?: string | null;
        };
        Update: {
          access_type?: string;
          accessed_at?: string | null;
          bytes_served?: number | null;
          city?: string | null;
          country_code?: string | null;
          failure_reason?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          share_id?: string;
          success?: boolean;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'temporary_share_access_logs_share_id_fkey';
            columns: ['share_id'];
            isOneToOne: false;
            referencedRelation: 'temporary_file_shares';
            referencedColumns: ['id'];
          },
        ];
      };
      trusted_devices: {
        Row: {
          created_at: string | null;
          created_from_ip: unknown | null;
          device_fingerprint: string;
          device_name: string | null;
          expires_at: string;
          id: string;
          ip_address: unknown | null;
          last_used_at: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_from_ip?: unknown | null;
          device_fingerprint: string;
          device_name?: string | null;
          expires_at: string;
          id?: string;
          ip_address?: unknown | null;
          last_used_at?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          created_from_ip?: unknown | null;
          device_fingerprint?: string;
          device_name?: string | null;
          expires_at?: string;
          id?: string;
          ip_address?: unknown | null;
          last_used_at?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'trusted_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'trusted_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'trusted_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'trusted_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'trusted_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'trusted_devices_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      typing_indicators: {
        Row: {
          conversation_id: string;
          expires_at: string | null;
          id: string;
          started_at: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          expires_at?: string | null;
          id?: string;
          started_at?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          expires_at?: string | null;
          id?: string;
          started_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'typing_indicators_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'typing_indicators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'typing_indicators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'typing_indicators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'typing_indicators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'typing_indicators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'typing_indicators_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_download_statistics: {
        Row: {
          created_at: string | null;
          favorite_download_method: string | null;
          file_id: string;
          first_download_at: string | null;
          id: string;
          last_download_at: string | null;
          metadata: Json | null;
          total_bandwidth_used: number | null;
          total_downloads: number | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          favorite_download_method?: string | null;
          file_id: string;
          first_download_at?: string | null;
          id?: string;
          last_download_at?: string | null;
          metadata?: Json | null;
          total_bandwidth_used?: number | null;
          total_downloads?: number | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          favorite_download_method?: string | null;
          file_id?: string;
          first_download_at?: string | null;
          id?: string;
          last_download_at?: string | null;
          metadata?: Json | null;
          total_bandwidth_used?: number | null;
          total_downloads?: number | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_download_statistics_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'file_uploads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_download_statistics_file_id_fkey';
            columns: ['file_id'];
            isOneToOne: false;
            referencedRelation: 'user_accessible_files';
            referencedColumns: ['id'];
          },
        ];
      };
      user_mfa: {
        Row: {
          backup_codes: string[] | null;
          created_at: string | null;
          id: string;
          is_enabled: boolean;
          secret_key: string | null;
          updated_at: string | null;
          user_id: string;
          verified_at: string | null;
        };
        Insert: {
          backup_codes?: string[] | null;
          created_at?: string | null;
          id?: string;
          is_enabled?: boolean;
          secret_key?: string | null;
          updated_at?: string | null;
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          backup_codes?: string[] | null;
          created_at?: string | null;
          id?: string;
          is_enabled?: boolean;
          secret_key?: string | null;
          updated_at?: string | null;
          user_id?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_mfa_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'user_mfa_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'user_mfa_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'user_mfa_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'user_mfa_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_mfa_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_mfa_methods: {
        Row: {
          created_at: string | null;
          credential_id: string | null;
          email_address: string | null;
          failure_count: number | null;
          id: string;
          last_used_at: string | null;
          locked_until: string | null;
          method_name: string | null;
          method_type: Database['public']['Enums']['mfa_method_type'];
          phone_number: string | null;
          public_key: string | null;
          qr_code_url: string | null;
          secret_encrypted: string | null;
          secret_salt: string | null;
          status: Database['public']['Enums']['mfa_status'];
          updated_at: string | null;
          user_id: string;
          verification_code: string | null;
          verification_expires_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          credential_id?: string | null;
          email_address?: string | null;
          failure_count?: number | null;
          id?: string;
          last_used_at?: string | null;
          locked_until?: string | null;
          method_name?: string | null;
          method_type: Database['public']['Enums']['mfa_method_type'];
          phone_number?: string | null;
          public_key?: string | null;
          qr_code_url?: string | null;
          secret_encrypted?: string | null;
          secret_salt?: string | null;
          status?: Database['public']['Enums']['mfa_status'];
          updated_at?: string | null;
          user_id: string;
          verification_code?: string | null;
          verification_expires_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          credential_id?: string | null;
          email_address?: string | null;
          failure_count?: number | null;
          id?: string;
          last_used_at?: string | null;
          locked_until?: string | null;
          method_name?: string | null;
          method_type?: Database['public']['Enums']['mfa_method_type'];
          phone_number?: string | null;
          public_key?: string | null;
          qr_code_url?: string | null;
          secret_encrypted?: string | null;
          secret_salt?: string | null;
          status?: Database['public']['Enums']['mfa_status'];
          updated_at?: string | null;
          user_id?: string;
          verification_code?: string | null;
          verification_expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_mfa_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'user_mfa_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'user_mfa_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'user_mfa_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'user_mfa_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_mfa_methods_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_mfa_settings: {
        Row: {
          backup_codes_generated: boolean;
          created_at: string | null;
          id: string;
          is_enabled: boolean;
          is_enforced: boolean;
          last_backup_codes_generated_at: string | null;
          recovery_email: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          backup_codes_generated?: boolean;
          created_at?: string | null;
          id?: string;
          is_enabled?: boolean;
          is_enforced?: boolean;
          last_backup_codes_generated_at?: string | null;
          recovery_email?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          backup_codes_generated?: boolean;
          created_at?: string | null;
          id?: string;
          is_enabled?: boolean;
          is_enforced?: boolean;
          last_backup_codes_generated_at?: string | null;
          recovery_email?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_mfa_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'user_mfa_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'user_mfa_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'user_mfa_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'user_mfa_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_mfa_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string;
          first_name: string | null;
          id: string;
          language: Database['public']['Enums']['language'];
          last_name: string | null;
          last_seen_at: string | null;
          mfa_backup_codes: string[] | null;
          mfa_enabled: boolean | null;
          mfa_secret: string | null;
          mfa_setup_completed: boolean | null;
          mfa_verified_at: string | null;
          phone: string | null;
          remember_device_enabled: boolean | null;
          role: Database['public']['Enums']['user_role'];
          status: Database['public']['Enums']['user_status'];
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email: string;
          first_name?: string | null;
          id: string;
          language?: Database['public']['Enums']['language'];
          last_name?: string | null;
          last_seen_at?: string | null;
          mfa_backup_codes?: string[] | null;
          mfa_enabled?: boolean | null;
          mfa_secret?: string | null;
          mfa_setup_completed?: boolean | null;
          mfa_verified_at?: string | null;
          phone?: string | null;
          remember_device_enabled?: boolean | null;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['user_status'];
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string;
          first_name?: string | null;
          id?: string;
          language?: Database['public']['Enums']['language'];
          last_name?: string | null;
          last_seen_at?: string | null;
          mfa_backup_codes?: string[] | null;
          mfa_enabled?: boolean | null;
          mfa_secret?: string | null;
          mfa_setup_completed?: boolean | null;
          mfa_verified_at?: string | null;
          phone?: string | null;
          remember_device_enabled?: boolean | null;
          role?: Database['public']['Enums']['user_role'];
          status?: Database['public']['Enums']['user_status'];
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      virus_scan_cache: {
        Row: {
          created_at: string | null;
          expires_at: string;
          file_hash: string;
          id: string;
          is_safe: boolean;
          scan_details: string | null;
          scan_id: string | null;
          scan_provider: string;
          threat_name: string | null;
        };
        Insert: {
          created_at?: string | null;
          expires_at: string;
          file_hash: string;
          id?: string;
          is_safe: boolean;
          scan_details?: string | null;
          scan_id?: string | null;
          scan_provider?: string;
          threat_name?: string | null;
        };
        Update: {
          created_at?: string | null;
          expires_at?: string;
          file_hash?: string;
          id?: string;
          is_safe?: boolean;
          scan_details?: string | null;
          scan_id?: string | null;
          scan_provider?: string;
          threat_name?: string | null;
        };
        Relationships: [];
      };
      virus_scan_logs: {
        Row: {
          created_at: string | null;
          file_hash: string;
          file_name: string;
          file_size: number;
          file_type: string | null;
          id: string;
          ip_address: unknown | null;
          is_safe: boolean;
          quarantined: boolean | null;
          scan_details: string | null;
          scan_duration_ms: number | null;
          scan_provider: string;
          threat_name: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          file_hash: string;
          file_name: string;
          file_size: number;
          file_type?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_safe: boolean;
          quarantined?: boolean | null;
          scan_details?: string | null;
          scan_duration_ms?: number | null;
          scan_provider?: string;
          threat_name?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          file_hash?: string;
          file_name?: string;
          file_size?: number;
          file_type?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_safe?: boolean;
          quarantined?: boolean | null;
          scan_details?: string | null;
          scan_duration_ms?: number | null;
          scan_provider?: string;
          threat_name?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'virus_scan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'virus_scan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'virus_scan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'virus_scan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'virus_scan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'virus_scan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      task_attachments: {
        Row: {
          created_at: string;
          file_name: string;
          file_size: number;
          file_url: string;
          id: string;
          mime_type: string | null;
          progress_update_id: string | null;
          task_instance_id: string | null;
          uploaded_by_id: string | null;
        };
        Insert: {
          created_at?: string;
          file_name: string;
          file_size: number;
          file_url: string;
          id?: string;
          mime_type?: string | null;
          progress_update_id?: string | null;
          task_instance_id?: string | null;
          uploaded_by_id?: string | null;
        };
        Update: {
          created_at?: string;
          file_name?: string;
          file_size?: number;
          file_url?: string;
          id?: string;
          mime_type?: string | null;
          progress_update_id?: string | null;
          task_instance_id?: string | null;
          uploaded_by_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_task_instance_id_fkey';
            columns: ['task_instance_id'];
            isOneToOne: false;
            referencedRelation: 'task_instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_progress_update_id_fkey';
            columns: ['progress_update_id'];
            isOneToOne: false;
            referencedRelation: 'task_progress_updates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_uploaded_by_id_fkey';
            columns: ['uploaded_by_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      task_categories: {
        Row: {
          coach_id: string;
          color_hex: string | null;
          created_at: string;
          id: string;
          label: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          color_hex?: string | null;
          created_at?: string;
          id?: string;
          label: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          color_hex?: string | null;
          created_at?: string;
          id?: string;
          label?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_categories_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      task_export_logs: {
        Row: {
          client_id: string;
          coach_id: string;
          file_url: string;
          filters: Json;
          generated_at: string;
          id: string;
        };
        Insert: {
          client_id: string;
          coach_id: string;
          file_url: string;
          filters?: Json;
          generated_at?: string;
          id?: string;
        };
        Update: {
          client_id?: string;
          coach_id?: string;
          file_url?: string;
          filters?: Json;
          generated_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_export_logs_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_export_logs_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      task_instances: {
        Row: {
          completed_at: string | null;
          completion_percentage: number;
          created_at: string;
          due_date: string;
          id: string;
          scheduled_date: string | null;
          status: Database['public']['Enums']['task_status'];
          task_id: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          completion_percentage?: number;
          created_at?: string;
          due_date: string;
          id?: string;
          scheduled_date?: string | null;
          status?: Database['public']['Enums']['task_status'];
          task_id: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          completion_percentage?: number;
          created_at?: string;
          due_date?: string;
          id?: string;
          scheduled_date?: string | null;
          status?: Database['public']['Enums']['task_status'];
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_instances_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_notification_jobs: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          scheduled_at: string;
          sent_at: string | null;
          status: Database['public']['Enums']['task_notification_status'];
          task_instance_id: string;
          type: Database['public']['Enums']['task_notification_type'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload?: Json;
          scheduled_at: string;
          sent_at?: string | null;
          status?: Database['public']['Enums']['task_notification_status'];
          task_instance_id: string;
          type: Database['public']['Enums']['task_notification_type'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          scheduled_at?: string;
          sent_at?: string | null;
          status?: Database['public']['Enums']['task_notification_status'];
          task_instance_id?: string;
          type?: Database['public']['Enums']['task_notification_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_notification_jobs_task_instance_id_fkey';
            columns: ['task_instance_id'];
            isOneToOne: false;
            referencedRelation: 'task_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      task_progress_updates: {
        Row: {
          author_id: string;
          created_at: string;
          id: string;
          is_visible_to_coach: boolean;
          note: string | null;
          percentage: number;
          task_instance_id: string;
        };
        Insert: {
          author_id: string;
          created_at?: string;
          id?: string;
          is_visible_to_coach?: boolean;
          note?: string | null;
          percentage: number;
          task_instance_id: string;
        };
        Update: {
          author_id?: string;
          created_at?: string;
          id?: string;
          is_visible_to_coach?: boolean;
          note?: string | null;
          percentage?: number;
          task_instance_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_progress_updates_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_progress_updates_task_instance_id_fkey';
            columns: ['task_instance_id'];
            isOneToOne: false;
            referencedRelation: 'task_instances';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          archived_at: string | null;
          category_id: string | null;
          client_id: string;
          coach_id: string;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          priority: Database['public']['Enums']['task_priority'];
          recurrence_rule: Json | null;
          status: Database['public']['Enums']['task_status'];
          title: string;
          updated_at: string;
          visibility_to_coach: boolean;
        };
        Insert: {
          archived_at?: string | null;
          category_id?: string | null;
          client_id: string;
          coach_id: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: Database['public']['Enums']['task_priority'];
          recurrence_rule?: Json | null;
          status?: Database['public']['Enums']['task_status'];
          title: string;
          updated_at?: string;
          visibility_to_coach?: boolean;
        };
        Update: {
          archived_at?: string | null;
          category_id?: string | null;
          client_id?: string;
          coach_id?: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          priority?: Database['public']['Enums']['task_priority'];
          recurrence_rule?: Json | null;
          status?: Database['public']['Enums']['task_status'];
          title?: string;
          updated_at?: string;
          visibility_to_coach?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'task_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      client_progress: {
        Row: {
          average_rating: number | null;
          client_id: string | null;
          client_name: string | null;
          client_since: string | null;
          completed_sessions: number | null;
          email: string | null;
          last_session_date: string | null;
          total_ratings: number | null;
          total_sessions: number | null;
          upcoming_sessions: number | null;
        };
        Relationships: [];
      };
      client_progress_summary: {
        Row: {
          average_rating: number | null;
          client_id: string | null;
          client_name: string | null;
          completed_sessions: number | null;
          last_session_date: string | null;
          total_sessions: number | null;
          upcoming_sessions: number | null;
        };
        Relationships: [];
      };
      coach_availability_with_timezone: {
        Row: {
          coach_id: string | null;
          coach_name: string | null;
          created_at: string | null;
          day_of_week: number | null;
          end_time: string | null;
          id: string | null;
          is_available: boolean | null;
          start_time: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'coach_availability_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      coach_statistics: {
        Row: {
          average_rating: number | null;
          coach_id: string | null;
          coach_name: string | null;
          completed_sessions: number | null;
          email: string | null;
          last_session_date: string | null;
          total_clients: number | null;
          total_ratings: number | null;
          total_sessions: number | null;
          upcoming_sessions: number | null;
        };
        Relationships: [];
      };
      coach_stats: {
        Row: {
          active_clients: number | null;
          avg_rating: number | null;
          coach_id: string | null;
          completed_sessions: number | null;
          completion_rate: number | null;
          email: string | null;
          name: string | null;
          total_ratings: number | null;
          total_sessions: number | null;
        };
        Relationships: [];
      };
      daily_notification_stats: {
        Row: {
          channel: string | null;
          stat_date: string | null;
          total_clicked: number | null;
          total_delivered: number | null;
          total_opened: number | null;
          total_sent: number | null;
          type: Database['public']['Enums']['notification_type'] | null;
        };
        Relationships: [];
      };
      database_schema_summary: {
        Row: {
          object_type: string | null;
          schema_name: unknown | null;
          table_name: unknown | null;
          view_definition: string | null;
        };
        Relationships: [];
      };
      mfa_admin_dashboard: {
        Row: {
          active_mfa_sessions: number | null;
          email: string | null;
          failed_verifications_24h: number | null;
          full_name: string | null;
          last_mfa_activity: string | null;
          mfa_enabled: boolean | null;
          mfa_setup_completed: boolean | null;
          role: Database['public']['Enums']['user_role'] | null;
          successful_verifications_24h: number | null;
          trusted_devices_count: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      mfa_statistics: {
        Row: {
          active_mfa_users_24h: number | null;
          failed_attempts_24h: number | null;
          new_mfa_setups_7d: number | null;
          users_with_mfa_enabled: number | null;
          users_without_mfa: number | null;
        };
        Relationships: [];
      };
      security_dashboard: {
        Row: {
          event_count: number | null;
          event_type: string | null;
          hour: string | null;
          severity: string | null;
          unique_ips: number | null;
          unique_users: number | null;
        };
        Relationships: [];
      };
      session_details: {
        Row: {
          client_email: string | null;
          client_name: string | null;
          coach_email: string | null;
          coach_name: string | null;
          created_at: string | null;
          duration_minutes: number | null;
          id: string | null;
          meeting_url: string | null;
          rating: number | null;
          review: string | null;
          scheduled_at: string | null;
          status: Database['public']['Enums']['session_status'] | null;
          title: string | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      user_accessible_files: {
        Row: {
          access_type: string | null;
          bucket_name: string | null;
          created_at: string | null;
          description: string | null;
          download_count: number | null;
          expires_at: string | null;
          file_category: Database['public']['Enums']['file_category'] | null;
          file_size: number | null;
          file_type: string | null;
          filename: string | null;
          id: string | null;
          is_shared: boolean | null;
          original_filename: string | null;
          owner_name: string | null;
          permission_type:
            | Database['public']['Enums']['file_permission_type']
            | null;
          session_id: string | null;
          storage_path: string | null;
          tags: string[] | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'file_uploads_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'session_details';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_uploads_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'client_progress_summary';
            referencedColumns: ['client_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_statistics';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'coach_stats';
            referencedColumns: ['coach_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'mfa_admin_dashboard';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'file_uploads_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      block_ip_address: {
        Args: {
          p_reason: string;
          p_expires_at?: string;
          p_ip_address: unknown;
          p_blocked_by?: string;
        };
        Returns: string;
      };
      can_send_notification: {
        Args: {
          sender_id: string;
          recipient_id: string;
          notification_type: Database['public']['Enums']['notification_type'];
        };
        Returns: boolean;
      };
      can_user_message_user: {
        Args: { recipient_id: string; sender_id: string };
        Returns: boolean;
      };
      cancel_scheduled_notifications: {
        Args: {
          filter_session_id?: string;
          filter_channel?: string;
          filter_type?: Database['public']['Enums']['notification_type'];
          filter_user_id?: string;
        };
        Returns: number;
      };
      check_connection: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      check_mfa_ip_rate_limit: {
        Args: {
          ip_addr: unknown;
          user_uuid: string;
          time_window?: unknown;
          max_attempts?: number;
        };
        Returns: boolean;
      };
      check_mfa_rate_limit: {
        Args: { method_type_param?: string; target_user_id: string };
        Returns: boolean;
      };
      check_suspicious_activity: {
        Args: { time_window?: unknown; user_id: string };
        Returns: Json;
      };
      cleanup_expired_file_shares: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_expired_mfa_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_expired_quarantined_files: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_expired_shares: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_expired_typing_indicators: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_expired_virus_scan_cache: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_mfa_data: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_notification_analytics_data: {
        Args: Record<PropertyKey, never>;
        Returns: {
          inactive_subscriptions_deleted: number;
          old_scheduled_deleted: number;
          old_logs_deleted: number;
        }[];
      };
      cleanup_notification_system: {
        Args: Record<PropertyKey, never>;
        Returns: {
          scheduled_notifications_cleaned: number;
          delivery_logs_cleaned: number;
          jobs_cleaned: number;
        }[];
      };
      cleanup_old_logs: {
        Args: { p_days?: number; p_dry_run?: boolean };
        Returns: {
          table_name: string;
          records_to_delete: number;
          oldest_record: string;
          newest_record: string;
        }[];
      };
      cleanup_old_mfa_data: {
        Args: { events_retention?: unknown; attempts_retention?: unknown };
        Returns: number;
      };
      cleanup_old_notifications: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_old_push_subscriptions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      cleanup_old_security_logs: {
        Args: { retention_days?: number };
        Returns: {
          deleted_violations: number;
          expired_blocks: number;
          deleted_logs: number;
        }[];
      };
      comprehensive_database_cleanup: {
        Args: { dry_run?: boolean };
        Returns: {
          records_affected: number;
          cleanup_type: string;
          action_taken: string;
        }[];
      };
      create_file_version: {
        Args: {
          p_file_size: number;
          p_file_type: string;
          p_original_filename: string;
          p_filename: string;
          p_storage_path: string;
          p_file_hash: string;
          p_change_summary?: string;
          p_is_major_version?: boolean;
          p_created_by?: string;
          p_description?: string;
          p_file_id: string;
        };
        Returns: string;
      };
      create_notification_from_template: {
        Args: {
          input_type: Database['public']['Enums']['notification_type'];
          template_variables?: Json;
          scheduled_for?: string;
          priority?: string;
          input_user_id: string;
          input_channel?: string;
        };
        Returns: string;
      };
      create_session: {
        Args: {
          title: string;
          coach_id: string;
          description?: string;
          duration_minutes?: number;
          scheduled_at: string;
          client_id: string;
        };
        Returns: string;
      };
      create_temporary_file_share: {
        Args: {
          p_file_id: string;
          p_expires_at: string;
          p_created_by: string;
          p_password_hash?: string;
          p_max_downloads?: number;
          p_description?: string;
        };
        Returns: {
          created_at: string | null;
          created_by: string;
          current_downloads: number | null;
          description: string | null;
          expires_at: string;
          file_id: string;
          id: string;
          is_active: boolean | null;
          max_downloads: number | null;
          metadata: Json | null;
          password_hash: string | null;
          share_token: string;
          updated_at: string | null;
        };
      };
      custom_access_token_hook: {
        Args: { event: Json };
        Returns: Json;
      };
      db_health_check: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      decrypt_totp_secret: {
        Args: {
          encrypted_secret: string;
          user_id: string;
          secret_salt: string;
        };
        Returns: string;
      };
      encrypt_totp_secret: {
        Args: { secret: string; user_id: string };
        Returns: {
          salt: string;
          encrypted_secret: string;
        }[];
      };
      generate_backup_codes: {
        Args:
          | { code_count?: number; user_uuid: string }
          | {
              target_user_id: string;
              code_length?: number;
              codes_count?: number;
            };
        Returns: string[];
      };
      generate_share_token: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_active_connections: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_available_time_slots: {
        Args: { slot_duration?: number; coach_id: string; target_date: string };
        Returns: {
          is_available: boolean;
          end_time: string;
          start_time: string;
        }[];
      };
      get_coach_average_rating: {
        Args:
          | { coach_uuid: string }
          | { end_date?: string; p_coach_id: string; start_date?: string };
        Returns: number;
      };
      get_coach_performance_metrics: {
        Args: { start_date: string; end_date: string };
        Returns: {
          active_clients: number;
          completed_sessions: number;
          coach_id: string;
          total_sessions: number;
          completion_rate: number;
          coach_name: string;
        }[];
      };
      get_daily_notification_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_failed: number;
          avg_delivery_time_minutes: number;
          stat_date: string;
          total_sent: number;
          total_delivered: number;
          delivery_rate: number;
        }[];
      };
      get_daily_session_metrics: {
        Args: { end_date: string; start_date: string };
        Returns: {
          date: string;
          total_sessions: number;
          completed_sessions: number;
          cancelled_sessions: number;
          scheduled_sessions: number;
          completion_rate: number;
        }[];
      };
      get_daily_user_growth: {
        Args: { end_date: string; start_date: string };
        Returns: {
          total_users: number;
          date: string;
          new_users: number;
          active_users: number;
        }[];
      };
      get_database_size: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_database_statistics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          index_size: string;
          table_size: string;
          record_count: number;
          table_name: string;
        }[];
      };
      get_enhanced_coach_performance_metrics: {
        Args: { end_date: string; start_date: string };
        Returns: {
          completion_rate: number;
          total_ratings: number;
          active_clients: number;
          completed_sessions: number;
          average_rating: number;
          coach_id: string;
          coach_name: string;
          total_sessions: number;
        }[];
      };
      get_file_download_stats: {
        Args: { p_date_to?: string; p_date_from?: string; p_file_id: string };
        Returns: Json;
      };
      get_file_version_stats: {
        Args: { p_file_id: string };
        Returns: Json;
      };
      get_files_shared_with_user: {
        Args: { user_uuid: string };
        Returns: {
          file_id: string;
          filename: string;
          file_type: string;
          created_at: string;
          expires_at: string;
          permission_type: Database['public']['Enums']['file_permission_type'];
          shared_by_name: string;
          file_size: number;
        }[];
      };
      get_index_usage_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          usage_ratio: number;
          idx_tup_fetch: number;
          idx_tup_read: number;
          indexname: string;
          tablename: string;
          schemaname: string;
          is_unique: boolean;
          index_size: string;
        }[];
      };
      get_long_running_queries: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_next_version_number: {
        Args: { target_file_id: string };
        Returns: number;
      };
      get_notification_delivery_health: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_queued: number;
          error_rate: number;
          avg_delivery_time: number;
          failed_notifications: number;
          processing_notifications: number;
        }[];
      };
      get_notification_overview_stats: {
        Args: {
          filter_channel?: string;
          filter_type?: Database['public']['Enums']['notification_type'];
          start_date: string;
          end_date: string;
        };
        Returns: {
          total_sent: number;
          total_delivered: number;
          click_rate: number;
          open_rate: number;
          delivery_rate: number;
          total_clicked: number;
          total_opened: number;
        }[];
      };
      get_notification_preferences_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          inapp_enabled: number;
          marketing_opted_in: number;
          quiet_hours_enabled: number;
          total_users: number;
          email_enabled: number;
          push_enabled: number;
          avg_reminder_timing: number;
        }[];
      };
      get_notification_queue_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          pending_jobs: number;
          processing_jobs: number;
          failed_jobs: number;
          oldest_pending_notification: string;
          oldest_pending_job: string;
          pending_notifications: number;
          processing_notifications: number;
          failed_notifications: number;
        }[];
      };
      get_notification_time_series: {
        Args: {
          end_date: string;
          start_date: string;
          filter_type?: Database['public']['Enums']['notification_type'];
          filter_channel?: string;
          interval_type?: string;
        };
        Returns: {
          clicked: number;
          opened: number;
          delivered: number;
          sent: number;
          date: string;
        }[];
      };
      get_or_create_direct_conversation: {
        Args: { p_user2_id: string; p_user1_id: string };
        Returns: string;
      };
      get_popular_files: {
        Args: { p_limit?: number; p_date_to?: string; p_date_from?: string };
        Returns: {
          unique_downloaders: number;
          total_downloads: number;
          file_size: number;
          file_type: string;
          filename: string;
          file_id: string;
        }[];
      };
      get_practice_journal_stats: {
        Args: { user_id: string };
        Returns: {
          total_entries: number;
          entries_this_week: number;
          entries_this_month: number;
          shared_entries: number;
          average_mood: number;
          average_energy: number;
          most_common_emotions: string[];
          most_common_sensations: string[];
          practice_streak_days: number;
        }[];
      };
      get_recent_maintenance_operations: {
        Args: {
          p_action?: Database['public']['Enums']['maintenance_action_type'];
          p_limit?: number;
          p_status?: Database['public']['Enums']['maintenance_status'];
        };
        Returns: {
          duration_ms: number;
          result: Json;
          error_message: string;
          action: Database['public']['Enums']['maintenance_action_type'];
          status: Database['public']['Enums']['maintenance_status'];
          id: string;
          initiated_by_email: string;
          started_at: string;
          completed_at: string;
        }[];
      };
      get_security_statistics: {
        Args: { end_date?: string; start_date?: string };
        Returns: {
          rate_limit_violations: number;
          top_blocked_ips: Json;
          blocked_ips_count: number;
          high_events: number;
          critical_events: number;
          total_events: number;
          file_security_events: number;
          quarantined_files: number;
          top_attack_types: Json;
        }[];
      };
      get_share_statistics: {
        Args: { p_share_id: string };
        Returns: Json;
      };
      get_slow_queries: {
        Args: { p_limit?: number; p_min_duration?: unknown };
        Returns: {
          rows_returned: number;
          mean_time: number;
          total_time: number;
          calls: number;
          query_text: string;
        }[];
      };
      get_system_average_rating: {
        Args: { start_date?: string; end_date?: string };
        Returns: number;
      };
      get_system_health_stats: {
        Args: { p_hours?: number };
        Returns: {
          avg_response_time_ms: number;
          error_count: number;
          warning_count: number;
          healthy_count: number;
          check_type: string;
          last_check_at: string;
        }[];
      };
      get_system_overview_metrics: {
        Args: { start_date: string; end_date: string };
        Returns: {
          total_users: number;
          active_users: number;
          total_sessions: number;
          completed_sessions: number;
          total_revenue: number;
          average_rating: number;
          new_users_this_month: number;
          completion_rate: number;
          total_coaches: number;
          total_clients: number;
          active_coaches: number;
          average_sessions_per_user: number;
        }[];
      };
      get_system_statistics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          metric_value: number;
          metric_name: string;
          description: string;
          metric_unit: string;
        }[];
      };
      get_table_sizes: {
        Args: { p_limit?: number };
        Returns: {
          row_count: number;
          size_bytes: number;
          size_pretty: string;
          table_name: string;
        }[];
      };
      get_top_performing_notifications: {
        Args: { end_date: string; start_date: string; limit_count?: number };
        Returns: {
          open_rate: number;
          sent_count: number;
          title: string;
          type: Database['public']['Enums']['notification_type'];
          id: string;
          click_rate: number;
        }[];
      };
      get_unread_message_count: {
        Args: { p_conversation_id: string; p_user_id: string };
        Returns: number;
      };
      get_unread_notification_count: {
        Args: { input_user_id: string };
        Returns: number;
      };
      get_upcoming_sessions: {
        Args: { user_id: string };
        Returns: {
          title: string;
          id: string;
          scheduled_at: string;
          duration_minutes: number;
          status: Database['public']['Enums']['session_status'];
          coach_name: string;
          client_name: string;
          meeting_url: string;
        }[];
      };
      get_user_download_history: {
        Args: { p_offset?: number; p_limit?: number; p_user_id: string };
        Returns: {
          downloaded_at: string;
          file_size: number;
          success: boolean;
          file_id: string;
          filename: string;
          file_type: string;
          download_type: string;
          download_id: string;
        }[];
      };
      get_user_engagement_metrics: {
        Args: { end_date: string; start_date: string };
        Returns: {
          avg_notifications_per_user: number;
          unsubscribe_rate: number;
          engaged_users: number;
          active_users: number;
        }[];
      };
      get_user_mfa_status: {
        Args: { target_user_id: string };
        Returns: Json;
      };
      get_user_role: {
        Args: Record<PropertyKey, never> | { user_id: string };
        Returns: string;
      };
      get_user_storage_usage: {
        Args: { user_uuid: string };
        Returns: {
          total_size_bytes: number;
          total_files: number;
          total_size_mb: number;
        }[];
      };
      get_version_comparison: {
        Args: { p_version_b: number; p_file_id: string; p_version_a: number };
        Returns: Json;
      };
      get_virus_scan_statistics: {
        Args: { end_date?: string; start_date?: string };
        Returns: {
          total_scans: number;
          safe_files: number;
          threats_detected: number;
          quarantined_files: number;
          avg_scan_duration_ms: number;
          scans_by_provider: Json;
          top_threats: Json;
        }[];
      };
      increment_file_download_count: {
        Args: { file_upload_id: string };
        Returns: undefined;
      };
      is_admin: {
        Args: Record<PropertyKey, never> | { user_id?: string };
        Returns: boolean;
      };
      is_client: {
        Args: Record<PropertyKey, never> | { user_id: string };
        Returns: boolean;
      };
      is_coach: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_ip_blocked: {
        Args: { check_ip: unknown };
        Returns: boolean;
      };
      is_time_slot_available: {
        Args: {
          duration_minutes?: number;
          coach_id: string;
          start_time: string;
        };
        Returns: boolean;
      };
      log_audit_event: {
        Args:
          | {
              p_action: Database['public']['Enums']['audit_action_type'];
              p_resource?: string;
              p_resource_id?: string;
              p_description?: string;
              p_metadata?: Json;
              p_risk_level?: string;
              p_ip_address?: unknown;
              p_user_agent?: string;
              p_user_id: string;
            }
          | {
              resource_id_value?: string;
              details_json?: Json;
              ip_addr?: unknown;
              user_agent_string?: string;
              action_name: string;
              resource_type_name?: string;
            };
        Returns: string;
      };
      log_file_download: {
        Args: {
          p_downloaded_by?: string;
          p_user_agent?: string;
          p_city?: string;
          p_client_info?: Json;
          p_country_code?: string;
          p_file_size_at_download?: number;
          p_download_duration_ms?: number;
          p_ip_address?: unknown;
          p_share_id?: string;
          p_download_type?: string;
          p_bandwidth_used?: number;
          p_failure_reason?: string;
          p_success?: boolean;
          p_file_id: string;
        };
        Returns: string;
      };
      log_file_security_event: {
        Args: {
          p_file_size?: number;
          p_file_type?: string;
          p_file_id: string;
          p_severity?: Database['public']['Enums']['security_severity'];
          p_file_hash?: string;
          p_user_id: string;
          p_ip_address: unknown;
          p_event_type: string;
          p_quarantined?: boolean;
          p_event_details?: Json;
          p_file_name?: string;
        };
        Returns: string;
      };
      log_maintenance_action: {
        Args: {
          p_action: Database['public']['Enums']['maintenance_action_type'];
          p_status: Database['public']['Enums']['maintenance_status'];
          p_initiated_by?: string;
          p_parameters?: Json;
          p_result?: Json;
          p_error_message?: string;
        };
        Returns: string;
      };
      log_mfa_event: {
        Args: {
          ip_addr?: unknown;
          event_type_val: Database['public']['Enums']['mfa_event_type'];
          user_uuid: string;
          metadata_val?: Json;
          user_agent_val?: string;
        };
        Returns: string;
      };
      log_push_delivery_status: {
        Args: {
          input_subscription_id: string;
          input_error_message?: string;
          input_provider_response?: Json;
          input_notification_id: string;
          input_status: string;
        };
        Returns: undefined;
      };
      log_security_event: {
        Args:
          | {
              p_severity?: Database['public']['Enums']['security_severity'];
              p_user_id?: string;
              p_user_agent?: string;
              p_referer?: string;
              p_request_path?: string;
              p_request_method?: string;
              p_ip_address: unknown;
              p_activity_type: string;
              p_details?: string;
            }
          | {
              user_agent?: string;
              user_id: string;
              event_type: string;
              event_details?: Json;
              severity?: string;
              ip_address?: unknown;
            };
        Returns: string;
      };
      log_share_access: {
        Args: {
          p_user_agent?: string;
          p_ip_address?: unknown;
          p_share_id: string;
          p_bytes_served?: number;
          p_failure_reason?: string;
          p_success?: boolean;
          p_access_type?: string;
        };
        Returns: string;
      };
      maintenance_cleanup_old_data: {
        Args: {
          p_date_column: string;
          p_table_name: string;
          p_dry_run?: boolean;
          p_batch_size?: number;
          p_days_old: number;
        };
        Returns: {
          batch_number: number;
          batch_completed_at: string;
          records_deleted: number;
          records_processed: number;
        }[];
      };
      maintenance_optimize_tables: {
        Args: { p_analyze_only?: boolean };
        Returns: {
          details: string;
          duration_ms: number;
          status: string;
          operation: string;
          table_name: string;
        }[];
      };
      mark_all_notifications_read: {
        Args: { input_user_id: string };
        Returns: number;
      };
      mark_conversation_as_read: {
        Args: { p_user_id: string; p_conversation_id: string };
        Returns: undefined;
      };
      mark_notification_read: {
        Args: { input_user_id: string; notification_id: string };
        Returns: boolean;
      };
      mark_notifications_read: {
        Args: { user_id: string; notification_ids?: string[] };
        Returns: number;
      };
      process_notification_jobs: {
        Args: { batch_size?: number };
        Returns: {
          failed_count: number;
          success_count: number;
          processed_count: number;
        }[];
      };
      quarantine_file: {
        Args: {
          p_scan_provider: string;
          p_upload_ip?: unknown;
          p_uploaded_by?: string;
          p_scan_details: string;
          p_threat_name: string;
          p_file_type: string;
          p_file_size: number;
          p_file_name: string;
          p_file_hash: string;
        };
        Returns: string;
      };
      refresh_daily_notification_stats: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      rollback_to_version: {
        Args: {
          p_rollback_description?: string;
          p_file_id: string;
          p_target_version: number;
          p_rollback_by: string;
        };
        Returns: string;
      };
      schedule_session_reminders: {
        Args: {
          session_title: string;
          participant_ids: string[];
          session_id: string;
          coach_name: string;
          session_datetime: string;
        };
        Returns: number;
      };
      send_notification: {
        Args:
          | {
              channel?: string;
              title: string;
              message: string;
              data?: Json;
              notification_type: Database['public']['Enums']['notification_type'];
              priority?: string;
              scheduled_for?: string;
              recipient_id: string;
            }
          | {
              notification_type: Database['public']['Enums']['notification_type'];
              user_id: string;
              title: string;
              message: string;
              data?: Json;
              scheduled_for?: string;
            };
        Returns: string;
      };
      send_push_notification: {
        Args: {
          input_user_id: string;
          notification_body: string;
          notification_title: string;
          notification_data?: Json;
          notification_options?: Json;
        };
        Returns: boolean;
      };
      share_journal_entry_with_coach: {
        Args: { entry_id: string };
        Returns: {
          body_areas: string[] | null;
          client_id: string;
          content: string;
          created_at: string | null;
          emotions: string[] | null;
          energy_level: number | null;
          id: string;
          insights: string | null;
          mood_rating: number | null;
          practices_done: string[] | null;
          sensations: string[] | null;
          session_id: string | null;
          shared_at: string | null;
          shared_with_coach: boolean | null;
          title: string | null;
          updated_at: string | null;
        };
      };
      sync_user_role_to_jwt: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      test_database_security_functions: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      test_jwt_role_setup: {
        Args: Record<PropertyKey, never>;
        Returns: {
          details: string;
          test_name: string;
          status: string;
        }[];
      };
      track_file_share_access: {
        Args: { share_id: string };
        Returns: undefined;
      };
      unblock_ip_address: {
        Args: {
          p_unblocked_by: string;
          p_ip_address: unknown;
          p_unblock_reason?: string;
        };
        Returns: boolean;
      };
      unshare_journal_entry: {
        Args: { entry_id: string };
        Returns: {
          body_areas: string[] | null;
          client_id: string;
          content: string;
          created_at: string | null;
          emotions: string[] | null;
          energy_level: number | null;
          id: string;
          insights: string | null;
          mood_rating: number | null;
          practices_done: string[] | null;
          sensations: string[] | null;
          session_id: string | null;
          shared_at: string | null;
          shared_with_coach: boolean | null;
          title: string | null;
          updated_at: string | null;
        };
      };
      update_push_subscription_status: {
        Args: { subscription_endpoint: string; is_active_status: boolean };
        Returns: boolean;
      };
      update_system_health: {
        Args: {
          health_metrics?: Json;
          health_status: string;
          component_name: string;
        };
        Returns: undefined;
      };
      update_user_auth_metadata: {
        Args: { user_id: string; user_role: string };
        Returns: undefined;
      };
      use_backup_code: {
        Args: { backup_code: string; user_uuid: string };
        Returns: boolean;
      };
      user_has_version_access: {
        Args: {
          required_permission?: string;
          user_id: string;
          version_id: string;
        };
        Returns: boolean;
      };
      validate_mfa_enforcement: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      validate_security_context: {
        Args: { p_user_id: string; p_action?: string };
        Returns: Json;
      };
      validate_session_access: {
        Args: { session_id: string; user_id: string; action?: string };
        Returns: boolean;
      };
      validate_session_availability_with_timezone: {
        Args: {
          p_duration_minutes: number;
          p_scheduled_at: string;
          p_coach_id: string;
          p_coach_timezone?: string;
        };
        Returns: boolean;
      };
      validate_temporary_share_access: {
        Args: { p_share_token: string; p_password?: string };
        Returns: {
          share_id: string;
          file_id: string;
          can_access: boolean;
          failure_reason: string;
          file_info: Json;
        }[];
      };
      validate_user_access: {
        Args: { accessing_user_id: string; target_user_id: string };
        Returns: boolean;
      };
      validate_user_role: {
        Args: {
          user_id: string;
          expected_role: Database['public']['Enums']['user_role'];
        };
        Returns: boolean;
      };
      verify_backup_code: {
        Args: {
          target_user_id: string;
          client_ip?: unknown;
          client_user_agent?: string;
          provided_code: string;
        };
        Returns: boolean;
      };
      verify_database_integrity: {
        Args: Record<PropertyKey, never>;
        Returns: {
          check_name: string;
          status: string;
          details: string;
        }[];
      };
    };
    Enums: {
      attachment_type: 'image' | 'document' | 'video' | 'audio' | 'other';
      audit_action_type:
        | 'login'
        | 'logout'
        | 'view_data'
        | 'create_record'
        | 'update_record'
        | 'delete_record'
        | 'export_data'
        | 'import_data'
        | 'maintenance_action'
        | 'security_event'
        | 'system_configuration';
      backup_code_status: 'active' | 'used' | 'expired';
      conversation_type: 'direct' | 'group';
      file_category:
        | 'preparation'
        | 'notes'
        | 'recording'
        | 'resource'
        | 'personal'
        | 'avatar'
        | 'document';
      file_permission_type: 'view' | 'download' | 'edit';
      language: 'en' | 'he';
      maintenance_action_type:
        | 'backup_database'
        | 'database_health_check'
        | 'clear_cache'
        | 'get_cache_stats'
        | 'export_logs'
        | 'cleanup_logs'
        | 'clean_temp_files'
        | 'system_cleanup'
        | 'update_configuration'
        | 'restart_services';
      maintenance_status:
        | 'started'
        | 'in_progress'
        | 'completed'
        | 'failed'
        | 'partial'
        | 'cancelled'
        | 'timeout';
      message_status: 'sent' | 'delivered' | 'read';
      message_type: 'text' | 'file' | 'system';
      mfa_event_type:
        | 'setup'
        | 'enable'
        | 'disable'
        | 'verify_success'
        | 'verify_failure'
        | 'backup_code_used'
        | 'backup_codes_regenerated';
      mfa_method: 'totp' | 'backup_code';
      mfa_method_type: 'totp' | 'sms' | 'email' | 'webauthn';
      mfa_status: 'pending' | 'active' | 'disabled' | 'suspended';
      mfa_verification_status:
        | 'success'
        | 'failed'
        | 'expired'
        | 'rate_limited';
      notification_type:
        | 'session_reminder'
        | 'session_confirmation'
        | 'new_message'
        | 'system_update'
        | 'welcome_message'
        | 'goal_achieved'
        | 'appointment_reminder'
        | 'coach_message'
        | 'client_message'
        | 'session_cancelled'
        | 'session_rescheduled'
        | 'reflection_reminder'
        | 'system_announcement'
        | 'payment_reminder';
      privacy_level: 'private' | 'shared_with_client';
      security_severity: 'low' | 'medium' | 'high' | 'critical';
      session_status:
        | 'scheduled'
        | 'in_progress'
        | 'completed'
        | 'cancelled'
        | 'rescheduled'
        | 'no_show';
      task_notification_status:
        | 'SCHEDULED'
        | 'PROCESSING'
        | 'SENT'
        | 'FAILED'
        | 'CANCELLED';
      task_notification_type:
        | 'ASSIGNMENT_CREATED'
        | 'UPCOMING_DUE'
        | 'OVERDUE'
        | 'RECURRING_PROMPT';
      task_priority: 'LOW' | 'MEDIUM' | 'HIGH';
      task_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
      user_role: 'client' | 'coach' | 'admin';
      user_status: 'active' | 'inactive' | 'suspended';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          level: number | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          level?: number | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      prefixes: {
        Row: {
          bucket_id: string;
          created_at: string | null;
          level: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          bucket_id: string;
          created_at?: string | null;
          level?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string;
          created_at?: string | null;
          level?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prefixes_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string };
        Returns: undefined;
      };
      can_insert_object: {
        Args: { name: string; metadata: Json; owner: string; bucketid: string };
        Returns: undefined;
      };
      delete_prefix: {
        Args: { _name: string; _bucket_id: string };
        Returns: boolean;
      };
      extension: {
        Args: { name: string };
        Returns: string;
      };
      filename: {
        Args: { name: string };
        Returns: string;
      };
      foldername: {
        Args: { name: string };
        Returns: string[];
      };
      get_level: {
        Args: { name: string };
        Returns: number;
      };
      get_prefix: {
        Args: { name: string };
        Returns: string;
      };
      get_prefixes: {
        Args: { name: string };
        Returns: string[];
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          size: number;
          bucket_id: string;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          next_key_token?: string;
          max_keys?: number;
          delimiter_param: string;
          prefix_param: string;
          bucket_id: string;
          next_upload_token?: string;
        };
        Returns: {
          key: string;
          id: string;
          created_at: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string;
          prefix_param: string;
          delimiter_param: string;
          max_keys?: number;
          start_after?: string;
          next_token?: string;
        };
        Returns: {
          updated_at: string;
          name: string;
          id: string;
          metadata: Json;
        }[];
      };
      operation: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      search: {
        Args: {
          limits?: number;
          prefix: string;
          sortorder?: string;
          sortcolumn?: string;
          search?: string;
          offsets?: number;
          levels?: number;
          bucketname: string;
        };
        Returns: {
          metadata: Json;
          last_accessed_at: string;
          created_at: string;
          updated_at: string;
          id: string;
          name: string;
        }[];
      };
      search_legacy_v1: {
        Args: {
          prefix: string;
          sortorder?: string;
          sortcolumn?: string;
          search?: string;
          offsets?: number;
          levels?: number;
          limits?: number;
          bucketname: string;
        };
        Returns: {
          metadata: Json;
          last_accessed_at: string;
          updated_at: string;
          id: string;
          name: string;
          created_at: string;
        }[];
      };
      search_v1_optimised: {
        Args: {
          offsets?: number;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
          levels?: number;
          limits?: number;
          bucketname: string;
          prefix: string;
        };
        Returns: {
          metadata: Json;
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          last_accessed_at: string;
        }[];
      };
      search_v2: {
        Args: {
          prefix: string;
          bucket_name: string;
          limits?: number;
          levels?: number;
          start_after?: string;
        };
        Returns: {
          key: string;
          name: string;
          id: string;
          updated_at: string;
          created_at: string;
          metadata: Json;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      Database[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attachment_type: ['image', 'document', 'video', 'audio', 'other'],
      audit_action_type: [
        'login',
        'logout',
        'view_data',
        'create_record',
        'update_record',
        'delete_record',
        'export_data',
        'import_data',
        'maintenance_action',
        'security_event',
        'system_configuration',
      ],
      backup_code_status: ['active', 'used', 'expired'],
      conversation_type: ['direct', 'group'],
      file_category: [
        'preparation',
        'notes',
        'recording',
        'resource',
        'personal',
        'avatar',
        'document',
      ],
      file_permission_type: ['view', 'download', 'edit'],
      language: ['en', 'he'],
      maintenance_action_type: [
        'backup_database',
        'database_health_check',
        'clear_cache',
        'get_cache_stats',
        'export_logs',
        'cleanup_logs',
        'clean_temp_files',
        'system_cleanup',
        'update_configuration',
        'restart_services',
      ],
      maintenance_status: [
        'started',
        'in_progress',
        'completed',
        'failed',
        'partial',
        'cancelled',
        'timeout',
      ],
      message_status: ['sent', 'delivered', 'read'],
      message_type: ['text', 'file', 'system'],
      mfa_event_type: [
        'setup',
        'enable',
        'disable',
        'verify_success',
        'verify_failure',
        'backup_code_used',
        'backup_codes_regenerated',
      ],
      mfa_method: ['totp', 'backup_code'],
      mfa_method_type: ['totp', 'sms', 'email', 'webauthn'],
      mfa_status: ['pending', 'active', 'disabled', 'suspended'],
      mfa_verification_status: ['success', 'failed', 'expired', 'rate_limited'],
      notification_type: [
        'session_reminder',
        'session_confirmation',
        'new_message',
        'system_update',
        'welcome_message',
        'goal_achieved',
        'appointment_reminder',
        'coach_message',
        'client_message',
        'session_cancelled',
        'session_rescheduled',
        'reflection_reminder',
        'system_announcement',
        'payment_reminder',
      ],
      privacy_level: ['private', 'shared_with_client'],
      security_severity: ['low', 'medium', 'high', 'critical'],
      session_status: [
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'rescheduled',
        'no_show',
      ],
      user_role: ['client', 'coach', 'admin'],
      user_status: ['active', 'inactive', 'suspended'],
    },
  },
  storage: {
    Enums: {},
  },
} as const;
