export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      coach_availability: {
        Row: {
          coach_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available: boolean
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          day_of_week: number
          start_time: string
          end_time: string
          is_available?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          is_available?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      coach_notes: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          session_id: string | null
          title: string
          content: string
          privacy_level: "private" | "shared_with_client"
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          session_id?: string | null
          title: string
          content: string
          privacy_level?: "private" | "shared_with_client"
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          session_id?: string | null
          title?: string
          content?: string
          privacy_level?: "private" | "shared_with_client"
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_coach_id_fkey"
            columns: ["coach_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: "session_reminder" | "new_message" | "session_confirmation" | "system_update"
          title: string
          message: string
          data: Json | null
          read_at: string | null
          sent_at: string | null
          scheduled_for: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: "session_reminder" | "new_message" | "session_confirmation" | "system_update"
          title: string
          message: string
          data?: Json | null
          read_at?: string | null
          sent_at?: string | null
          scheduled_for?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: "session_reminder" | "new_message" | "session_confirmation" | "system_update"
          title?: string
          message?: string
          data?: Json | null
          read_at?: string | null
          sent_at?: string | null
          scheduled_for?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reflections: {
        Row: {
          id: string
          client_id: string
          session_id: string | null
          content: string
          mood_rating: number | null
          insights: string | null
          goals_for_next_session: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          session_id?: string | null
          content: string
          mood_rating?: number | null
          insights?: string | null
          goals_for_next_session?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          session_id?: string | null
          content?: string
          mood_rating?: number | null
          insights?: string | null
          goals_for_next_session?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          coach_id: string
          client_id: string
          title: string
          description: string | null
          scheduled_at: string
          duration_minutes: number
          status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
          meeting_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          coach_id: string
          client_id: string
          title: string
          description?: string | null
          scheduled_at: string
          duration_minutes?: number
          status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
          meeting_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          coach_id?: string
          client_id?: string
          title?: string
          description?: string | null
          scheduled_at?: string
          duration_minutes?: number
          status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
          meeting_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          role: "client" | "coach" | "admin"
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          timezone: string
          language: "en" | "he"
          status: "active" | "inactive" | "suspended"
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          role?: "client" | "coach" | "admin"
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: "en" | "he"
          status?: "active" | "inactive" | "suspended"
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: "client" | "coach" | "admin"
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          timezone?: string
          language?: "en" | "he"
          status?: "active" | "inactive" | "suspended"
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      client_progress: {
        Row: {
          client_id: string | null
          client_name: string | null
          total_sessions: number | null
          completed_sessions: number | null
          upcoming_sessions: number | null
          total_reflections: number | null
          average_mood_rating: number | null
          last_session_date: string | null
          last_reflection_date: string | null
          sessions_this_month: number | null
          reflections_this_month: number | null
        }
        Relationships: []
      }
      coach_statistics: {
        Row: {
          coach_id: string | null
          coach_name: string | null
          total_sessions: number | null
          completed_sessions: number | null
          upcoming_sessions: number | null
          cancelled_sessions: number | null
          total_clients: number | null
          active_clients: number | null
          sessions_this_week: number | null
          sessions_this_month: number | null
          average_rating: number | null
        }
        Relationships: []
      }
      session_details: {
        Row: {
          id: string | null
          title: string | null
          description: string | null
          scheduled_at: string | null
          duration_minutes: number | null
          status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show" | null
          meeting_url: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
          coach_id: string | null
          coach_name: string | null
          coach_email: string | null
          coach_avatar_url: string | null
          client_id: string | null
          client_name: string | null
          client_email: string | null
          client_avatar_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_session: {
        Args: {
          coach_id: string
          client_id: string
          title: string
          scheduled_at: string
          duration_minutes?: number
          description?: string
        }
        Returns: string
      }
      get_available_time_slots: {
        Args: {
          coach_id: string
          target_date: string
          slot_duration?: number
        }
        Returns: {
          start_time: string
          end_time: string
          is_available: boolean
        }[]
      }
      get_upcoming_sessions: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          title: string
          scheduled_at: string
          duration_minutes: number
          status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
          coach_name: string
          client_name: string
          meeting_url: string
        }[]
      }
      is_time_slot_available: {
        Args: {
          coach_id: string
          start_time: string
          duration_minutes?: number
        }
        Returns: boolean
      }
      mark_notifications_read: {
        Args: {
          user_id: string
          notification_ids?: string[]
        }
        Returns: number
      }
      send_notification: {
        Args: {
          user_id: string
          notification_type: "session_reminder" | "new_message" | "session_confirmation" | "system_update"
          title: string
          message: string
          data?: Json
          scheduled_for?: string
        }
        Returns: string
      }
    }
    Enums: {
      notification_type: "session_reminder" | "new_message" | "session_confirmation" | "system_update"
      privacy_level: "private" | "shared_with_client"
      session_status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show"
      user_role: "client" | "coach" | "admin"
      user_status: "active" | "inactive" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}