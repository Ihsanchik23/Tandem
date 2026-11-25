export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      attendance_events: {
        Row: {
          accuracy_m: number | null
          created_at: string
          distance_m: number | null
          id: string
          kind: Database["public"]["Enums"]["attendance_kind"]
          lat: number | null
          lng: number | null
          organization_id: string
          result: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          created_at?: string
          distance_m?: number | null
          id?: string
          kind: Database["public"]["Enums"]["attendance_kind"]
          lat?: number | null
          lng?: number | null
          organization_id: string
          result: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          created_at?: string
          distance_m?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["attendance_kind"]
          lat?: number | null
          lng?: number | null
          organization_id?: string
          result?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_organization_id_unit_id_fkey"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "attendance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          organization_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          organization_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          organization_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_prefs: {
        Row: {
          organization_id: string
          positions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          organization_id: string
          positions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          organization_id?: string
          positions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "canvas_prefs_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      chat_reads: {
        Row: {
          last_read_at: string
          organization_id: string
          page_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          organization_id: string
          page_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          organization_id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reads_organization_id_page_id_fkey"
            columns: ["organization_id", "page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "chat_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          organization_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          organization_id: string
          position: string | null
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          position?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          position?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          body: string | null
          client_id: string
          created_at: string
          deleted_at: string | null
          id: string
          organization_id: string
          page_id: string
          reply_to_id: string | null
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          client_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          page_id: string
          reply_to_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string | null
          client_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          page_id?: string
          reply_to_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_page_id_fkey"
            columns: ["organization_id", "page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          key: string
          kind: Database["public"]["Enums"]["module_kind"]
          name: string
        }
        Insert: {
          key: string
          kind: Database["public"]["Enums"]["module_kind"]
          name: string
        }
        Update: {
          key?: string
          kind?: Database["public"]["Enums"]["module_kind"]
          name?: string
        }
        Relationships: []
      }
      organization_founders: {
        Row: {
          organization_id: string
          user_id: string
        }
        Insert: {
          organization_id: string
          user_id: string
        }
        Update: {
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_founders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_founders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          enabled: boolean
          module_key: string
          organization_id: string
        }
        Insert: {
          enabled?: boolean
          module_key: string
          organization_id: string
        }
        Update: {
          enabled?: boolean
          module_key?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_access: {
        Row: {
          organization_id: string
          page_id: string
          user_id: string
        }
        Insert: {
          organization_id: string
          page_id: string
          user_id: string
        }
        Update: {
          organization_id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_access_organization_id_page_id_fkey"
            columns: ["organization_id", "page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      page_scopes: {
        Row: {
          id: string
          kind: Database["public"]["Enums"]["scope_kind"]
          organization_id: string
          page_id: string
          unit_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          kind: Database["public"]["Enums"]["scope_kind"]
          organization_id: string
          page_id: string
          unit_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          kind?: Database["public"]["Enums"]["scope_kind"]
          organization_id?: string
          page_id?: string
          unit_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_scopes_organization_id_page_id_fkey"
            columns: ["organization_id", "page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "page_scopes_organization_id_unit_id_fkey"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "page_scopes_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      pages: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          module_key: string
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["page_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          module_key: string
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["page_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          module_key?: string
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["page_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_module_key_fkey"
            columns: ["module_key"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          first_name?: string
          id: string
          last_name?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          owner_user_id: string
          paid_until: string
          plan: string
          seats: number
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          owner_user_id: string
          paid_until: string
          plan?: string
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          owner_user_id?: string
          paid_until?: string
          plan?: string
          seats?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_coassignees: {
        Row: {
          organization_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          organization_id: string
          task_id: string
          user_id: string
        }
        Update: {
          organization_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_coassignees_organization_id_task_id_fkey"
            columns: ["organization_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "task_coassignees_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          organization_id: string
          task_id: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          organization_id: string
          task_id: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_organization_id_task_id_fkey"
            columns: ["organization_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      task_events: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          kind: string
          organization_id: string
          task_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          kind: string
          organization_id: string
          task_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          kind?: string
          organization_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_events_organization_id_task_id_fkey"
            columns: ["organization_id", "task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          due_at: string
          id: string
          organization_id: string
          page_id: string
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_at: string
          id?: string
          organization_id: string
          page_id: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_at?: string
          id?: string
          organization_id?: string
          page_id?: string
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_assignee_id_fkey"
            columns: ["organization_id", "assignee_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "tasks_organization_id_page_id_fkey"
            columns: ["organization_id", "page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_members: {
        Row: {
          created_at: string
          organization_id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_members_organization_id_unit_id_fkey"
            columns: ["organization_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "unit_members_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          created_at: string
          head_user_id: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          organization_id: string
          parent_id: string | null
          radius_m: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          head_user_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          organization_id: string
          parent_id?: string | null
          radius_m?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          head_user_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          radius_m?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_organization_id_head_user_id_fkey"
            columns: ["organization_id", "head_user_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "units_organization_id_parent_id_fkey"
            columns: ["organization_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      add_task_comment: {
        Args: { p_body: string; p_task: string }
        Returns: string
      }
      admin_activate_subscription: {
        Args: { p_paid_until: string; p_seats?: number; p_user: string }
        Returns: string
      }
      attendance_max_accuracy: { Args: never; Returns: number }
      can_access_page: { Args: { p_page: string }; Returns: boolean }
      can_edit_task: { Args: { p_task: string }; Returns: boolean }
      can_manage_page: { Args: { p_page: string }; Returns: boolean }
      can_work_task: { Args: { p_task: string }; Returns: boolean }
      check_attendance: {
        Args: {
          p_accuracy_m: number
          p_kind: Database["public"]["Enums"]["attendance_kind"]
          p_lat: number
          p_lng: number
        }
        Returns: Json
      }
      check_task_people: {
        Args: { p_assignee: string; p_co: string[]; p_page: string }
        Returns: undefined
      }
      create_invite: { Args: { p_org: string }; Returns: string }
      create_organization: {
        Args: {
          p_city?: string
          p_description?: string
          p_logo_url?: string
          p_name: string
          p_slug: string
        }
        Returns: string
      }
      create_page: {
        Args: {
          p_description?: string
          p_icon?: string
          p_module: string
          p_name: string
          p_org: string
          p_scopes: Json
        }
        Returns: string
      }
      create_task: {
        Args: {
          p_assignee?: string
          p_coassignees?: string[]
          p_description: string
          p_due_at: string
          p_page: string
          p_priority?: Database["public"]["Enums"]["task_priority"]
          p_title: string
        }
        Returns: string
      }
      delete_message: { Args: { p_message: string }; Returns: undefined }
      delete_task_comment: { Args: { p_comment: string }; Returns: undefined }
      delete_unit_branch: {
        Args: { p_unit: string }
        Returns: {
          pages_archived: number
          units_deleted: number
        }[]
      }
      distance_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      edit_task_comment: {
        Args: { p_body: string; p_comment: string }
        Returns: undefined
      }
      get_invite_preview: {
        Args: { p_token: string }
        Returns: {
          is_valid: boolean
          logo_url: string
          name: string
          organization_id: string
          slug: string
        }[]
      }
      get_my_chats: {
        Args: never
        Returns: {
          icon: string
          last_message_at: string
          last_message_author: string
          last_message_body: string
          name: string
          organization_id: string
          page_id: string
          status: Database["public"]["Enums"]["page_status"]
          unread_count: number
        }[]
      }
      get_page_people: {
        Args: { p_page: string }
        Returns: {
          avatar_url: string
          first_name: string
          last_name: string
          position: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
          username: string
        }[]
      }
      get_unit_branch_summary: {
        Args: { p_unit: string }
        Returns: {
          members_count: number
          pages_count: number
          pages_to_archive: number
          units_count: number
          will_be_unassigned: number
        }[]
      }
      has_role: {
        Args: {
          p_org: string
          p_roles: Database["public"]["Enums"]["member_role"][]
        }
        Returns: boolean
      }
      is_member: { Args: { p_org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      leave_organization: { Args: never; Returns: undefined }
      like_pattern: { Args: { p_query: string }; Returns: string }
      log_task_event: {
        Args: { p_details?: Json; p_kind: string; p_task: string }
        Returns: undefined
      }
      manager_unit_ids: {
        Args: { p_org: string; p_user: string }
        Returns: string[]
      }
      mark_chat_read: { Args: { p_page: string }; Returns: undefined }
      my_role: {
        Args: { p_org: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      my_unit_subtree: { Args: { p_org: string }; Returns: string[] }
      org_is_active: { Args: { p_org: string }; Returns: boolean }
      recompute_page_access: { Args: { p_org: string }; Returns: undefined }
      remove_member: {
        Args: { p_org: string; p_user: string }
        Returns: undefined
      }
      replace_page_scopes: {
        Args: { p_page: string; p_scopes: Json }
        Returns: undefined
      }
      require_uid: { Args: never; Returns: string }
      revoke_invite: { Args: { p_invite: string }; Returns: undefined }
      save_canvas_positions: {
        Args: { p_org: string; p_positions: Json }
        Returns: undefined
      }
      search_organizations: {
        Args: {
          p_city?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          city: string
          description: string
          id: string
          logo_url: string
          members_count: number
          name: string
          slug: string
        }[]
      }
      search_organizations_filtered: {
        Args: {
          p_city?: string
          p_limit?: number
          p_max_members?: number
          p_min_members?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          city: string
          description: string
          id: string
          logo_url: string
          members_count: number
          name: string
          slug: string
        }[]
      }
      search_people: {
        Args: {
          p_city?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          avatar_url: string
          city: string
          first_name: string
          id: string
          last_name: string
          organization_id: string
          organization_logo: string
          organization_name: string
          position: string
          username: string
        }[]
      }
      send_message: {
        Args: {
          p_body: string
          p_client_id: string
          p_page: string
          p_reply_to?: string
        }
        Returns: string
      }
      set_member_position: {
        Args: { p_org: string; p_position: string; p_user: string }
        Returns: undefined
      }
      set_member_role: {
        Args: {
          p_org: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_user: string
        }
        Returns: undefined
      }
      set_page_archived: {
        Args: { p_archived: boolean; p_page: string }
        Returns: undefined
      }
      set_task_archived: {
        Args: { p_archived: boolean; p_task: string }
        Returns: undefined
      }
      set_task_assignees: {
        Args: {
          p_assignee: string
          p_coassignees?: string[]
          p_expected_version: number
          p_task: string
        }
        Returns: number
      }
      set_task_status: {
        Args: {
          p_status: Database["public"]["Enums"]["task_status"]
          p_task: string
        }
        Returns: number
      }
      task_page_writable: { Args: { p_page: string }; Returns: boolean }
      unit_branch_ids: { Args: { p_unit: string }; Returns: string[] }
      update_page: {
        Args: {
          p_description?: string
          p_icon?: string
          p_name: string
          p_page: string
        }
        Returns: undefined
      }
      update_page_scope: {
        Args: { p_page: string; p_scopes: Json }
        Returns: undefined
      }
      update_task: {
        Args: {
          p_description: string
          p_due_at: string
          p_expected_version: number
          p_priority: Database["public"]["Enums"]["task_priority"]
          p_task: string
          p_title: string
        }
        Returns: number
      }
      write_audit: {
        Args: {
          p_action: string
          p_details?: Json
          p_org: string
          p_target_id?: string
          p_target_type?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance_kind: "check_in" | "check_out"
      member_role: "owner" | "admin" | "manager" | "employee"
      module_kind: "page" | "company"
      page_status: "active" | "archived"
      scope_kind: "organization" | "unit" | "user"
      subscription_status: "active" | "expired" | "canceled"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_kind: ["check_in", "check_out"],
      member_role: ["owner", "admin", "manager", "employee"],
      module_kind: ["page", "company"],
      page_status: ["active", "archived"],
      scope_kind: ["organization", "unit", "user"],
      subscription_status: ["active", "expired", "canceled"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
