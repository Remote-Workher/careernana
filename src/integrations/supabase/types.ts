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
      accountability_checkins: {
        Row: {
          applications_count: number
          applied: boolean
          checkin_date: string
          created_at: string
          id: string
          partnership_id: string
          reflection: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applications_count?: number
          applied?: boolean
          checkin_date?: string
          created_at?: string
          id?: string
          partnership_id: string
          reflection?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applications_count?: number
          applied?: boolean
          checkin_date?: string
          created_at?: string
          id?: string
          partnership_id?: string
          reflection?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_checkins_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          partnership_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          partnership_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          partnership_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_messages_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_partner_challenges: {
        Row: {
          created_at: string
          daily_target: number
          description: string | null
          duration_days: number
          id: string
          partnership_id: string
          start_date: string
          status: string
          title: string
          updated_at: string
          user_a_progress: number
          user_b_progress: number
        }
        Insert: {
          created_at?: string
          daily_target?: number
          description?: string | null
          duration_days?: number
          id?: string
          partnership_id: string
          start_date?: string
          status?: string
          title: string
          updated_at?: string
          user_a_progress?: number
          user_b_progress?: number
        }
        Update: {
          created_at?: string
          daily_target?: number
          description?: string | null
          duration_days?: number
          id?: string
          partnership_id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_a_progress?: number
          user_b_progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "accountability_partner_challenges_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_partnerships: {
        Row: {
          created_at: string
          id: string
          jitsi_room: string
          last_activity_at: string
          status: string
          streak: number
          updated_at: string
          user_a: string
          user_b: string
          weekly_call_day: string | null
          weekly_call_time: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          jitsi_room?: string
          last_activity_at?: string
          status?: string
          streak?: number
          updated_at?: string
          user_a: string
          user_b: string
          weekly_call_day?: string | null
          weekly_call_time?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          jitsi_room?: string
          last_activity_at?: string
          status?: string
          streak?: number
          updated_at?: string
          user_a?: string
          user_b?: string
          weekly_call_day?: string | null
          weekly_call_time?: string | null
        }
        Relationships: []
      }
      accountability_prefs: {
        Row: {
          availability: string | null
          career_stage: string | null
          checkin_days: string[]
          created_at: string
          current_position: string | null
          experience_level: string | null
          goal: string | null
          goal_timeline: string | null
          goal_type: string | null
          id: string
          is_searching: boolean
          role: string | null
          target_industry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          career_stage?: string | null
          checkin_days?: string[]
          created_at?: string
          current_position?: string | null
          experience_level?: string | null
          goal?: string | null
          goal_timeline?: string | null
          goal_type?: string | null
          id?: string
          is_searching?: boolean
          role?: string | null
          target_industry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          career_stage?: string | null
          checkin_days?: string[]
          created_at?: string
          current_position?: string | null
          experience_level?: string | null
          goal?: string | null
          goal_timeline?: string | null
          goal_type?: string | null
          id?: string
          is_searching?: boolean
          role?: string | null
          target_industry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      accountability_requests: {
        Row: {
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          message: string | null
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_scopes: {
        Row: {
          created_at: string
          is_super: boolean
          sections: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_super?: boolean
          sections?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_super?: boolean
          sections?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          applied_via: string
          company: string
          cover_letter_id: string | null
          created_at: string
          description: string | null
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
          applied_via?: string
          company: string
          cover_letter_id?: string | null
          created_at?: string
          description?: string | null
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
          applied_via?: string
          company?: string
          cover_letter_id?: string | null
          created_at?: string
          description?: string | null
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
      challenge_progress: {
        Row: {
          challenge_key: string
          completed_at: string | null
          completed_tasks: number[]
          created_at: string
          id: string
          joined_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_key: string
          completed_at?: string | null
          completed_tasks?: number[]
          created_at?: string
          id?: string
          joined_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_key?: string
          completed_at?: string | null
          completed_tasks?: number[]
          created_at?: string
          id?: string
          joined_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_tasks: {
        Row: {
          action_item: string | null
          challenge_id: string
          created_at: string
          day_number: number
          description: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          action_item?: string | null
          challenge_id: string
          created_at?: string
          day_number: number
          description?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_item?: string | null
          challenge_id?: string
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_tasks_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
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
      classes: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          instructor: string | null
          is_published: boolean
          level: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          instructor?: string | null
          is_published?: boolean
          level?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          instructor?: string | null
          is_published?: boolean
          level?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
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
      community_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "community_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      community_polls: {
        Row: {
          allow_multiple: boolean
          closes_at: string | null
          created_at: string
          id: string
          options: Json
          post_id: string
          question: string
          user_id: string
        }
        Insert: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          options?: Json
          post_id: string
          question: string
          user_id: string
        }
        Update: {
          allow_multiple?: boolean
          closes_at?: string | null
          created_at?: string
          id?: string
          options?: Json
          post_id?: string
          question?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string | null
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
          author_avatar_url?: string | null
          author_name?: string | null
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
          author_avatar_url?: string | null
          author_name?: string | null
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
          author_avatar_url: string | null
          author_name: string | null
          body: string
          created_at: string
          id: string
          post_id: string
          reaction_count: number
          user_id: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name?: string | null
          body: string
          created_at?: string
          id?: string
          post_id: string
          reaction_count?: number
          user_id: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string | null
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
      course_lessons: {
        Row: {
          class_id: string | null
          course_id: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_preview: boolean
          position: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          class_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_preview?: boolean
          position?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          class_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_preview?: boolean
          position?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_type: string | null
          id: string
          position: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          image_url: string | null
          instructor: string | null
          instructor_avatar_url: string | null
          instructor_bio: string | null
          is_featured: boolean
          is_published: boolean
          lessons: number | null
          level: string | null
          preview_video_url: string | null
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
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          instructor_avatar_url?: string | null
          instructor_bio?: string | null
          is_featured?: boolean
          is_published?: boolean
          lessons?: number | null
          level?: string | null
          preview_video_url?: string | null
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
          duration?: string | null
          id?: string
          image_url?: string | null
          instructor?: string | null
          instructor_avatar_url?: string | null
          instructor_bio?: string | null
          is_featured?: boolean
          is_published?: boolean
          lessons?: number | null
          level?: string | null
          preview_video_url?: string | null
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
      job_alerts: {
        Row: {
          created_at: string
          experience_level: string | null
          frequency: string
          id: string
          is_active: boolean
          keywords: string
          location: string | null
          updated_at: string
          user_id: string
          work_type: string | null
        }
        Insert: {
          created_at?: string
          experience_level?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          keywords?: string
          location?: string | null
          updated_at?: string
          user_id: string
          work_type?: string | null
        }
        Update: {
          created_at?: string
          experience_level?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          keywords?: string
          location?: string | null
          updated_at?: string
          user_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applicant_avatar_seed: string | null
          applicant_email: string
          applicant_headline: string | null
          applicant_linkedin: string | null
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
          portfolio_url: string | null
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
          applicant_linkedin?: string | null
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
          portfolio_url?: string | null
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
          applicant_linkedin?: string | null
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
          portfolio_url?: string | null
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
      lesson_notes: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      member_monthly_usage: {
        Row: {
          courses_used: number
          created_at: string
          id: string
          period_month: string
          resources_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          courses_used?: number
          created_at?: string
          id?: string
          period_month: string
          resources_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          courses_used?: number
          created_at?: string
          id?: string
          period_month?: string
          resources_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_coin_grants: {
        Row: {
          amount: number
          created_at: string
          id: string
          period_month: string
          tier: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          period_month: string
          tier: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          period_month?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      product_purchases: {
        Row: {
          amount_naira: number
          created_at: string
          currency: string
          id: string
          kind: string
          metadata: Json
          paystack_reference: string | null
          product_id: string
          product_title: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_naira?: number
          created_at?: string
          currency?: string
          id?: string
          kind: string
          metadata?: Json
          paystack_reference?: string | null
          product_id: string
          product_title?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_naira?: number
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          metadata?: Json
          paystack_reference?: string | null
          product_id?: string
          product_title?: string | null
          status?: string
          user_id?: string
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
          last_monthly_grant: string | null
          linkedin_url: string | null
          location: string | null
          onboarding_completed: boolean | null
          paid_until: string | null
          phone: string | null
          plan_day: number
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          portfolio_url: string | null
          profile_setup_completed: boolean
          referral_code: string | null
          referred_by_code: string | null
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
          last_monthly_grant?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          paid_until?: string | null
          phone?: string | null
          plan_day?: number
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          portfolio_url?: string | null
          profile_setup_completed?: boolean
          referral_code?: string | null
          referred_by_code?: string | null
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
          last_monthly_grant?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          paid_until?: string | null
          phone?: string | null
          plan_day?: number
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          portfolio_url?: string | null
          profile_setup_completed?: boolean
          referral_code?: string | null
          referred_by_code?: string | null
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
          application_deadline: string | null
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
          application_deadline?: string | null
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
          application_deadline?: string | null
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
      referrals: {
        Row: {
          coins_awarded: number
          created_at: string
          id: string
          paid_amount_naira: number
          plan_tier: string
          referee_user_id: string
          referrer_code: string
          referrer_user_id: string
        }
        Insert: {
          coins_awarded?: number
          created_at?: string
          id?: string
          paid_amount_naira?: number
          plan_tier: string
          referee_user_id: string
          referrer_code: string
          referrer_user_id: string
        }
        Update: {
          coins_awarded?: number
          created_at?: string
          id?: string
          paid_amount_naira?: number
          plan_tier?: string
          referee_user_id?: string
          referrer_code?: string
          referrer_user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: string | null
          file_url: string | null
          format: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_published: boolean
          price: number
          title: string
          type: string | null
          unlock_month: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          file_url?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          price?: number
          title: string
          type?: string | null
          unlock_month?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          file_url?: string | null
          format?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_published?: boolean
          price?: number
          title?: string
          type?: string | null
          unlock_month?: string | null
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
      skills_gap_analyses: {
        Row: {
          created_at: string
          current_skills: string[]
          id: string
          job_description: string | null
          job_id: string | null
          match_score: number
          required_skills: string[]
          result: Json
          target_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_skills?: string[]
          id?: string
          job_description?: string | null
          job_id?: string | null
          match_score?: number
          required_skills?: string[]
          result?: Json
          target_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_skills?: string[]
          id?: string
          job_description?: string | null
          job_id?: string | null
          match_score?: number
          required_skills?: string[]
          result?: Json
          target_role?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_payments: {
        Row: {
          amount_naira: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          paid_until: string
          paystack_reference: string | null
          period: string
          period_days: number
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          status: string
          user_id: string
        }
        Insert: {
          amount_naira: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_until: string
          paystack_reference?: string | null
          period: string
          period_days: number
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          status?: string
          user_id: string
        }
        Update: {
          amount_naira?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          paid_until?: string
          paystack_reference?: string | null
          period?: string
          period_days?: number
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          status?: string
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
      consume_member_quota: { Args: { _kind: string }; Returns: Json }
      consume_tokens: { Args: { _amount: number }; Returns: number }
      current_partnership: { Args: { _uid: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_recruiter_company_info: {
        Args: { _user_ids: string[] }
        Returns: {
          company_logo_url: string
          company_name: string
          user_id: string
        }[]
      }
      grant_monthly_coins: { Args: never; Returns: Json }
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
      record_referral_payout: {
        Args: {
          _paid_amount_naira: number
          _plan_tier: string
          _referee_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "talent" | "recruiter"
      plan_tier: "free" | "standard" | "premium"
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
      plan_tier: ["free", "standard", "premium"],
    },
  },
} as const
