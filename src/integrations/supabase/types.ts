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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_date: string | null
          company: string
          cover_letter_id: string | null
          created_at: string
          follow_up_date: string | null
          follow_up_sent: boolean | null
          id: string
          interview_date: string | null
          job_title: string
          job_type: string | null
          location: string | null
          match_score: number | null
          notes: string | null
          offer_deadline: string | null
          offered_salary: string | null
          resume_version_id: string | null
          salary: string | null
          source: string | null
          source_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_date?: string | null
          company: string
          cover_letter_id?: string | null
          created_at?: string
          follow_up_date?: string | null
          follow_up_sent?: boolean | null
          id?: string
          interview_date?: string | null
          job_title: string
          job_type?: string | null
          location?: string | null
          match_score?: number | null
          notes?: string | null
          offer_deadline?: string | null
          offered_salary?: string | null
          resume_version_id?: string | null
          salary?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_date?: string | null
          company?: string
          cover_letter_id?: string | null
          created_at?: string
          follow_up_date?: string | null
          follow_up_sent?: boolean | null
          id?: string
          interview_date?: string | null
          job_title?: string
          job_type?: string | null
          location?: string | null
          match_score?: number | null
          notes?: string | null
          offer_deadline?: string | null
          offered_salary?: string | null
          resume_version_id?: string | null
          salary?: string | null
          source?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      brag_entries: {
        Row: {
          category: string
          company: string | null
          created_at: string
          id: string
          polished_text: string | null
          raw_text: string
          strength_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          company?: string | null
          created_at?: string
          id?: string
          polished_text?: string | null
          raw_text: string
          strength_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company?: string | null
          created_at?: string
          id?: string
          polished_text?: string | null
          raw_text?: string
          strength_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          brag_entry_ids: string[] | null
          created_at: string
          generated_content: string
          id: string
          job_id: string | null
          tone: string | null
          user_id: string
        }
        Insert: {
          brag_entry_ids?: string[] | null
          created_at?: string
          generated_content: string
          id?: string
          job_id?: string | null
          tone?: string | null
          user_id: string
        }
        Update: {
          brag_entry_ids?: string[] | null
          created_at?: string
          generated_content?: string
          id?: string
          job_id?: string | null
          tone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "saved_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_jobs: {
        Row: {
          benefits: string | null
          company: string
          company_logo_url: string | null
          description: string | null
          experience_level: string | null
          expires_date: string | null
          id: string
          ingested_at: string | null
          is_active: boolean | null
          job_title: string
          location: string | null
          posted_date: string | null
          requirements: string | null
          salary_max: number | null
          salary_min: number | null
          salary_raw: string | null
          skills: string[] | null
          source: string
          source_id: string | null
          source_url: string
          work_type: string | null
        }
        Insert: {
          benefits?: string | null
          company: string
          company_logo_url?: string | null
          description?: string | null
          experience_level?: string | null
          expires_date?: string | null
          id?: string
          ingested_at?: string | null
          is_active?: boolean | null
          job_title: string
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_raw?: string | null
          skills?: string[] | null
          source: string
          source_id?: string | null
          source_url: string
          work_type?: string | null
        }
        Update: {
          benefits?: string | null
          company?: string
          company_logo_url?: string | null
          description?: string | null
          experience_level?: string | null
          expires_date?: string | null
          id?: string
          ingested_at?: string | null
          is_active?: boolean | null
          job_title?: string
          location?: string | null
          posted_date?: string | null
          requirements?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_raw?: string | null
          skills?: string[] | null
          source?: string
          source_id?: string | null
          source_url?: string
          work_type?: string | null
        }
        Relationships: []
      }
      job_user_matches: {
        Row: {
          computed_at: string | null
          experience_match_score: number | null
          id: string
          job_id: string | null
          location_match_score: number | null
          match_score: number | null
          matching_skills: string[] | null
          missing_skills: string[] | null
          skill_match_score: number | null
          user_id: string
        }
        Insert: {
          computed_at?: string | null
          experience_match_score?: number | null
          id?: string
          job_id?: string | null
          location_match_score?: number | null
          match_score?: number | null
          matching_skills?: string[] | null
          missing_skills?: string[] | null
          skill_match_score?: number | null
          user_id: string
        }
        Update: {
          computed_at?: string | null
          experience_match_score?: number | null
          id?: string
          job_id?: string | null
          location_match_score?: number | null
          match_score?: number | null
          matching_skills?: string[] | null
          missing_skills?: string[] | null
          skill_match_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_user_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "external_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          career_goal: string | null
          career_persona: string | null
          city: string | null
          created_at: string
          current_role: string | null
          current_salary_range: string | null
          email: string | null
          experience_years: number | null
          full_name: string | null
          id: string
          job_search_status: string | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          onboarding_completed: boolean | null
          phone: string | null
          plan_day: number
          roadmap_progress: Json | null
          skills: string[] | null
          struggle_areas: string[] | null
          target_role: string | null
          target_salary_min: number | null
          tokens_remaining: number
          updated_at: string
          user_id: string
          work_preference: string[] | null
          years_experience: string | null
        }
        Insert: {
          bio?: string | null
          career_goal?: string | null
          career_persona?: string | null
          city?: string | null
          created_at?: string
          current_role?: string | null
          current_salary_range?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          job_search_status?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan_day?: number
          roadmap_progress?: Json | null
          skills?: string[] | null
          struggle_areas?: string[] | null
          target_role?: string | null
          target_salary_min?: number | null
          tokens_remaining?: number
          updated_at?: string
          user_id: string
          work_preference?: string[] | null
          years_experience?: string | null
        }
        Update: {
          bio?: string | null
          career_goal?: string | null
          career_persona?: string | null
          city?: string | null
          created_at?: string
          current_role?: string | null
          current_salary_range?: string | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          job_search_status?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          plan_day?: number
          roadmap_progress?: Json | null
          skills?: string[] | null
          struggle_areas?: string[] | null
          target_role?: string | null
          target_salary_min?: number | null
          tokens_remaining?: number
          updated_at?: string
          user_id?: string
          work_preference?: string[] | null
          years_experience?: string | null
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          ats_score: number | null
          brag_entry_ids: string[] | null
          created_at: string
          generated_content: string
          id: string
          job_id: string | null
          source_type: string
          target_role: string | null
          template: string | null
          user_id: string
        }
        Insert: {
          ats_score?: number | null
          brag_entry_ids?: string[] | null
          created_at?: string
          generated_content: string
          id?: string
          job_id?: string | null
          source_type: string
          target_role?: string | null
          template?: string | null
          user_id: string
        }
        Update: {
          ats_score?: number | null
          brag_entry_ids?: string[] | null
          created_at?: string
          generated_content?: string
          id?: string
          job_id?: string | null
          source_type?: string
          target_role?: string | null
          template?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "saved_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          company: string
          created_at: string
          description: string | null
          id: string
          location: string | null
          match_score: number | null
          salary: string | null
          skills: string[] | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          match_score?: number | null
          salary?: string | null
          skills?: string[] | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          match_score?: number | null
          salary?: string | null
          skills?: string[] | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_usage: {
        Row: {
          created_at: string
          credits_used: number
          id: string
          tool_name: string
          tool_route: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          id?: string
          tool_name: string
          tool_route?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          id?: string
          tool_name?: string
          tool_route?: string | null
          user_id?: string
        }
        Relationships: []
      }
      zara_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_tokens: { Args: { _amount: number }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
