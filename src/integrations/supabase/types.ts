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
      application_events: {
        Row: {
          applicant_user_id: string
          application_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
          recruiter_user_id: string
        }
        Insert: {
          applicant_user_id: string
          application_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          recruiter_user_id: string
        }
        Update: {
          applicant_user_id?: string
          application_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          recruiter_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
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
          pinned: boolean
          polished_text: string | null
          raw_text: string
          strength_score: number | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          company?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          polished_text?: string | null
          raw_text: string
          strength_score?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company?: string | null
          created_at?: string
          id?: string
          pinned?: boolean
          polished_text?: string | null
          raw_text?: string
          strength_score?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          prize: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          prize?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          prize?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_channels: {
        Row: {
          admin_only_posting: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          position: number
          slug: string
        }
        Insert: {
          admin_only_posting?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
          slug: string
        }
        Update: {
          admin_only_posting?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          body: string
          channel_id: string
          created_at: string
          id: string
          image_url: string | null
          is_locked: boolean
          is_pinned: boolean
          reaction_count: number
          reply_count: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          channel_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_locked?: boolean
          is_pinned?: boolean
          reaction_count?: number
          reply_count?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_locked?: boolean
          is_pinned?: boolean
          reaction_count?: number
          reply_count?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string | null
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string | null
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string | null
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      community_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          reaction_count: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          reaction_count?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          reaction_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string | null
          reason: string | null
          reply_id: string | null
          reporter_user_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string | null
          reply_id?: string | null
          reporter_user_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string | null
          reply_id?: string | null
          reporter_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "community_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          instructor: string | null
          instructor_avatar_url: string | null
          is_featured: boolean
          is_published: boolean
          lessons: number | null
          level: string | null
          price: number | null
          rating: number | null
          reviews: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          instructor_avatar_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          lessons?: number | null
          level?: string | null
          price?: number | null
          rating?: number | null
          reviews?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          instructor_avatar_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          lessons?: number | null
          level?: string | null
          price?: number | null
          rating?: number | null
          reviews?: number | null
          title?: string
          updated_at?: string
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
      email_send_log_recruiter: {
        Row: {
          application_id: string | null
          body: string
          created_at: string
          error_message: string | null
          id: string
          job_id: string | null
          recipient_email: string
          recruiter_user_id: string
          status: string
          subject: string
          template_slug: string | null
        }
        Insert: {
          application_id?: string | null
          body: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          recipient_email: string
          recruiter_user_id: string
          status?: string
          subject: string
          template_slug?: string | null
        }
        Update: {
          application_id?: string | null
          body?: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          recipient_email?: string
          recruiter_user_id?: string
          status?: string
          subject?: string
          template_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_recruiter_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_recruiter_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruiter_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          slug: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          slug: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          slug?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
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
      hire_for_me_requests: {
        Row: {
          additional_notes: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          employment_type: string | null
          headcount: number
          id: string
          involvement_level: string | null
          location: string | null
          must_have_skills: string[] | null
          nice_to_have_skills: string[] | null
          payment_reference: string | null
          payment_status: string
          price_amount: number | null
          price_currency: string | null
          pricing_tier: string | null
          role_description: string | null
          role_title: string
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          status: string
          timeline: string | null
          updated_at: string
          user_id: string | null
          work_type: string | null
        }
        Insert: {
          additional_notes?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          employment_type?: string | null
          headcount?: number
          id?: string
          involvement_level?: string | null
          location?: string | null
          must_have_skills?: string[] | null
          nice_to_have_skills?: string[] | null
          payment_reference?: string | null
          payment_status?: string
          price_amount?: number | null
          price_currency?: string | null
          pricing_tier?: string | null
          role_description?: string | null
          role_title: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
          user_id?: string | null
          work_type?: string | null
        }
        Update: {
          additional_notes?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          employment_type?: string | null
          headcount?: number
          id?: string
          involvement_level?: string | null
          location?: string | null
          must_have_skills?: string[] | null
          nice_to_have_skills?: string[] | null
          payment_reference?: string | null
          payment_status?: string
          price_amount?: number | null
          price_currency?: string | null
          pricing_tier?: string | null
          role_description?: string | null
          role_title?: string
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
          user_id?: string | null
          work_type?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_avatar_seed: string | null
          applicant_email: string
          applicant_headline: string | null
          applicant_location: string | null
          applicant_name: string | null
          applicant_phone: string | null
          applicant_user_id: string
          boosted_until: string | null
          cover_letter: string | null
          created_at: string
          id: string
          is_boosted: boolean
          is_featured: boolean
          job_id: string
          match_score: number | null
          recruiter_notes: string | null
          recruiter_user_id: string
          resume_content: string | null
          resume_version_id: string | null
          screening_answers: Json
          status: string
          updated_at: string
        }
        Insert: {
          applicant_avatar_seed?: string | null
          applicant_email: string
          applicant_headline?: string | null
          applicant_location?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          applicant_user_id: string
          boosted_until?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          is_boosted?: boolean
          is_featured?: boolean
          job_id: string
          match_score?: number | null
          recruiter_notes?: string | null
          recruiter_user_id: string
          resume_content?: string | null
          resume_version_id?: string | null
          screening_answers?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_avatar_seed?: string | null
          applicant_email?: string
          applicant_headline?: string | null
          applicant_location?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          applicant_user_id?: string
          boosted_until?: string | null
          cover_letter?: string | null
          created_at?: string
          id?: string
          is_boosted?: boolean
          is_featured?: boolean
          job_id?: string
          match_score?: number | null
          recruiter_notes?: string | null
          recruiter_user_id?: string
          resume_content?: string | null
          resume_version_id?: string | null
          screening_answers?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruiter_jobs"
            referencedColumns: ["id"]
          },
        ]
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
      live_sessions: {
        Row: {
          attendees: number | null
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          host: string | null
          host_avatar_url: string | null
          host_bio: string | null
          host_role: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          join_url: string | null
          learnings: string[]
          location: string | null
          platform: string | null
          recording_youtube_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          host?: string | null
          host_avatar_url?: string | null
          host_bio?: string | null
          host_role?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          join_url?: string | null
          learnings?: string[]
          location?: string | null
          platform?: string | null
          recording_youtube_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          host?: string | null
          host_avatar_url?: string | null
          host_bio?: string | null
          host_role?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          join_url?: string | null
          learnings?: string[]
          location?: string | null
          platform?: string | null
          recording_youtube_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          paid_until: string | null
          phone: string | null
          plan_day: number
          portfolio_url: string | null
          profile_setup_completed: boolean
          resume_file_name: string | null
          resume_url: string | null
          roadmap_progress: Json | null
          skills: string[] | null
          struggle_areas: string[] | null
          target_role: string | null
          target_roles: string[] | null
          target_salary_min: number | null
          tokens_remaining: number
          updated_at: string
          user_id: string
          work_preference: string[] | null
          years_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
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
          paid_until?: string | null
          phone?: string | null
          plan_day?: number
          portfolio_url?: string | null
          profile_setup_completed?: boolean
          resume_file_name?: string | null
          resume_url?: string | null
          roadmap_progress?: Json | null
          skills?: string[] | null
          struggle_areas?: string[] | null
          target_role?: string | null
          target_roles?: string[] | null
          target_salary_min?: number | null
          tokens_remaining?: number
          updated_at?: string
          user_id: string
          work_preference?: string[] | null
          years_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
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
          paid_until?: string | null
          phone?: string | null
          plan_day?: number
          portfolio_url?: string | null
          profile_setup_completed?: boolean
          resume_file_name?: string | null
          resume_url?: string | null
          roadmap_progress?: Json | null
          skills?: string[] | null
          struggle_areas?: string[] | null
          target_role?: string | null
          target_roles?: string[] | null
          target_salary_min?: number | null
          tokens_remaining?: number
          updated_at?: string
          user_id?: string
          work_preference?: string[] | null
          years_experience?: string | null
        }
        Relationships: []
      }
      recruiter_jobs: {
        Row: {
          applications_count: number
          benefits: string | null
          company_logo_url: string | null
          created_at: string
          description: string | null
          employment_type: string | null
          experience_level: string | null
          featured_until: string | null
          id: string
          is_featured: boolean
          is_paid_slot: boolean
          location: string | null
          posted_at: string | null
          requirements: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          screening_questions: Json
          shortlisted_count: number
          skills: string[] | null
          status: string
          title: string
          updated_at: string
          user_id: string
          work_type: string | null
        }
        Insert: {
          applications_count?: number
          benefits?: string | null
          company_logo_url?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_paid_slot?: boolean
          location?: string | null
          posted_at?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          screening_questions?: Json
          shortlisted_count?: number
          skills?: string[] | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          work_type?: string | null
        }
        Update: {
          applications_count?: number
          benefits?: string | null
          company_logo_url?: string | null
          created_at?: string
          description?: string | null
          employment_type?: string | null
          experience_level?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_paid_slot?: boolean
          location?: string | null
          posted_at?: string | null
          requirements?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          screening_questions?: Json
          shortlisted_count?: number
          skills?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      recruiter_payments: {
        Row: {
          amount_kobo: number
          created_at: string
          currency: string
          feature_days: number | null
          id: string
          job_id: string | null
          metadata: Json
          paid_at: string | null
          paystack_access_code: string | null
          paystack_reference: string | null
          purpose: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          created_at?: string
          currency?: string
          feature_days?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json
          paid_at?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          purpose: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          created_at?: string
          currency?: string
          feature_days?: number | null
          id?: string
          job_id?: string | null
          metadata?: Json
          paid_at?: string | null
          paystack_access_code?: string | null
          paystack_reference?: string | null
          purpose?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recruiter_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_profiles: {
        Row: {
          company_description: string | null
          company_logo_url: string | null
          company_name: string | null
          company_size: string | null
          company_website: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          onboarding_completed_steps: string[]
          onboarding_dismissed: boolean
          phone: string | null
          role_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_description?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          onboarding_completed_steps?: string[]
          onboarding_dismissed?: boolean
          phone?: string | null
          role_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_description?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          onboarding_completed_steps?: string[]
          onboarding_dismissed?: boolean
          phone?: string | null
          role_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          title: string
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          title: string
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          title?: string
          type?: string | null
          updated_at?: string
          url?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_application_event: {
        Args: { _application_id: string; _kind: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "talent" | "recruiter"
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
    Enums: {
      app_role: ["admin", "talent", "recruiter"],
    },
  },
} as const
