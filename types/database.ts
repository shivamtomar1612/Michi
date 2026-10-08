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
      analytics_events: {
        Row: {
          created_at: string
          destination_id: string | null
          event_name: string
          experience_id: string | null
          id: string
          metadata: Json
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          event_name: string
          experience_id?: string | null
          id?: string
          metadata?: Json
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          event_name?: string
          experience_id?: string | null
          id?: string
          metadata?: Json
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_reference: string
          cultural_requirements: Json
          created_at: string
          experience_id: string
          experience_title_snapshot: string | null
          guests: number
          id: string
          notes: string
          rule_acknowledgment: Json
          slot_id: string
          slot_starts_at_snapshot: string | null
          slot_ends_at_snapshot: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_price_jpy: number
          traveler_id: string
          updated_at: string
        }
        Insert: {
          booking_reference?: string
          cultural_requirements?: Json
          created_at?: string
          experience_id: string
          experience_title_snapshot?: string | null
          guests: number
          id?: string
          notes?: string
          rule_acknowledgment?: Json
          slot_id: string
          slot_starts_at_snapshot?: string | null
          slot_ends_at_snapshot?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price_jpy: number
          traveler_id: string
          updated_at?: string
        }
        Update: {
          booking_reference?: string
          cultural_requirements?: Json
          created_at?: string
          experience_id?: string
          experience_title_snapshot?: string | null
          guests?: number
          id?: string
          notes?: string
          rule_acknowledgment?: Json
          slot_id?: string
          slot_starts_at_snapshot?: string | null
          slot_ends_at_snapshot?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_price_jpy?: number
          traveler_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_slot_experience_match"
            columns: ["slot_id", "experience_id"]
            isOneToOne: false
            referencedRelation: "experience_slots"
            referencedColumns: ["id", "experience_id"]
          },
          {
            foreignKeyName: "bookings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_feedback: {
        Row: {
          author_id: string | null
          comment: string
          created_at: string
          destination_id: string
          host_id: string | null
          id: string
          pressure_score: number | null
          sentiment: Database["public"]["Enums"]["feedback_sentiment"]
        }
        Insert: {
          author_id?: string | null
          comment?: string
          created_at?: string
          destination_id: string
          host_id?: string | null
          id?: string
          pressure_score?: number | null
          sentiment: Database["public"]["Enums"]["feedback_sentiment"]
        }
        Update: {
          author_id?: string | null
          comment?: string
          created_at?: string
          destination_id?: string
          host_id?: string | null
          id?: string
          pressure_score?: number | null
          sentiment?: Database["public"]["Enums"]["feedback_sentiment"]
        }
        Relationships: [
          {
            foreignKeyName: "community_feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_feedback_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_feedback_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_companion_rate_limits: {
        Row: {
          request_count: number
          requester_hash: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          request_count?: number
          requester_hash: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          request_count?: number
          requester_hash?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      cultural_content: {
        Row: {
          authority_level: number
          canonical_source_url: string | null
          category: string | null
          content: string
          content_hash: string
          created_at: string
          destination_id: string | null
          effective_from: string | null
          embedding: string | null
          embedding_dimensions: number | null
          embedding_model: string | null
          experience_id: string | null
          id: string
          is_active: boolean
          is_time_sensitive: boolean
          language: string
          last_verified_at: string | null
          location_scope: Json
          metadata: Json
          next_verification_at: string | null
          original_language: string | null
          retrieved_at: string | null
          reviewed_by: string | null
          search_vector: unknown
          source_id: string
          source_name: string | null
          source_type: string
          source_url: string | null
          stale_after: string | null
          status: Database["public"]["Enums"]["cultural_source_status"]
          subcategory: string | null
          summary: string | null
          title: string
          updated_at: string
          verification_note: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          authority_level?: number
          canonical_source_url?: string | null
          category?: string | null
          content: string
          content_hash: string
          created_at?: string
          destination_id?: string | null
          effective_from?: string | null
          embedding?: string | null
          embedding_dimensions?: number | null
          embedding_model?: string | null
          experience_id?: string | null
          id?: string
          is_active?: boolean
          is_time_sensitive?: boolean
          language?: string
          last_verified_at?: string | null
          location_scope?: Json
          metadata?: Json
          next_verification_at?: string | null
          original_language?: string | null
          retrieved_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          source_id: string
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          stale_after?: string | null
          status?: Database["public"]["Enums"]["cultural_source_status"]
          subcategory?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          verification_note?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          authority_level?: number
          canonical_source_url?: string | null
          category?: string | null
          content?: string
          content_hash?: string
          created_at?: string
          destination_id?: string | null
          effective_from?: string | null
          embedding?: string | null
          embedding_dimensions?: number | null
          embedding_model?: string | null
          experience_id?: string | null
          id?: string
          is_active?: boolean
          is_time_sensitive?: boolean
          language?: string
          last_verified_at?: string | null
          location_scope?: Json
          metadata?: Json
          next_verification_at?: string | null
          original_language?: string | null
          retrieved_at?: string | null
          reviewed_by?: string | null
          search_vector?: unknown
          source_id?: string
          source_name?: string | null
          source_type?: string
          source_url?: string | null
          stale_after?: string | null
          status?: Database["public"]["Enums"]["cultural_source_status"]
          subcategory?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          verification_note?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultural_content_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_content_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_content_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cultural_content_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "cultural_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_evidence_requests: {
        Row: {
          id: number
          requested_at: string
          requester_hash: string
        }
        Insert: {
          id?: never
          requested_at?: string
          requester_hash: string
        }
        Update: {
          id?: never
          requested_at?: string
          requester_hash?: string
        }
        Relationships: []
      }
      cultural_ingestion_attempts: {
        Row: {
          attempted_at: string
          id: number
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_ingestion_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_sources: {
        Row: {
          allow_automatic_ingestion: boolean
          approved_domains: string[]
          approved_urls: string[]
          authority_level: number
          authority_rank: number
          base_url: string | null
          city: string | null
          country: string
          created_at: string
          default_verification_status: string
          id: string
          is_active: boolean
          language: string
          metadata: Json
          name: string
          notes: string
          prefecture: string | null
          publisher: string
          region: string | null
          source_type: string
          source_url: string
          stale_after: string | null
          status: Database["public"]["Enums"]["cultural_source_status"]
          terms_reviewed_at: string | null
          terms_reviewed_by: string | null
          title: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          allow_automatic_ingestion?: boolean
          approved_domains?: string[]
          approved_urls?: string[]
          authority_level?: number
          authority_rank?: number
          base_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          default_verification_status?: string
          id?: string
          is_active?: boolean
          language?: string
          metadata?: Json
          name: string
          notes?: string
          prefecture?: string | null
          publisher: string
          region?: string | null
          source_type?: string
          source_url: string
          stale_after?: string | null
          status?: Database["public"]["Enums"]["cultural_source_status"]
          terms_reviewed_at?: string | null
          terms_reviewed_by?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          allow_automatic_ingestion?: boolean
          approved_domains?: string[]
          approved_urls?: string[]
          authority_level?: number
          authority_rank?: number
          base_url?: string | null
          city?: string | null
          country?: string
          created_at?: string
          default_verification_status?: string
          id?: string
          is_active?: boolean
          language?: string
          metadata?: Json
          name?: string
          notes?: string
          prefecture?: string | null
          publisher?: string
          region?: string | null
          source_type?: string
          source_url?: string
          stale_after?: string | null
          status?: Database["public"]["Enums"]["cultural_source_status"]
          terms_reviewed_at?: string | null
          terms_reviewed_by?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cultural_sources_terms_reviewed_by_fkey"
            columns: ["terms_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          authority_level: number
          base_url: string
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          is_official: boolean
          name: string
          notes: string | null
          prefecture: string | null
          region: string | null
          retrieval_method: string
          robots_status: string
          source_type: string
          terms_url: string | null
          updated_at: string
        }
        Insert: {
          authority_level: number
          base_url: string
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_official?: boolean
          name: string
          notes?: string | null
          prefecture?: string | null
          region?: string | null
          retrieval_method?: string
          robots_status?: string
          source_type: string
          terms_url?: string | null
          updated_at?: string
        }
        Update: {
          authority_level?: number
          base_url?: string
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_official?: boolean
          name?: string
          notes?: string | null
          prefecture?: string | null
          region?: string | null
          retrieval_method?: string
          robots_status?: string
          source_type?: string
          terms_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      destination_health_signals: {
        Row: {
          component_key: string
          created_at: string
          data_mode: string
          data_status: string
          destination_id: string
          expires_at: string
          id: string
          metadata: Json
          observed_at: string
          retrieved_at: string | null
          source_authority: number | null
          source_name: string
          source_type: string
          source_url: string
          truth_category: string
          value: number
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          component_key: string
          created_at?: string
          data_mode: string
          data_status?: string
          destination_id: string
          expires_at: string
          id?: string
          metadata?: Json
          observed_at: string
          retrieved_at?: string | null
          source_authority?: number | null
          source_name: string
          source_type: string
          source_url: string
          truth_category: string
          value: number
          verification_status: string
          verified_at?: string | null
        }
        Update: {
          component_key?: string
          created_at?: string
          data_mode?: string
          data_status?: string
          destination_id?: string
          expires_at?: string
          id?: string
          metadata?: Json
          observed_at?: string
          retrieved_at?: string | null
          source_authority?: number | null
          source_name?: string
          source_type?: string
          source_url?: string
          truth_category?: string
          value?: number
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_health_signals_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          capacity_score: number
          city: string | null
          community_score: number
          content_hash: string | null
          coordinate_source: string | null
          coordinate_verified_at: string | null
          country: string
          created_at: string
          crowd_score: number
          cultural_summary: string
          data_source: string
          data_status: string
          description: string
          health_score: number
          id: string
          image_url: string | null
          last_verified_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          name_ja: string | null
          next_verification_at: string | null
          popularity_score: number
          prefecture: string
          region: string
          retrieved_at: string | null
          slug: string
          source_authority: number | null
          source_id: string | null
          source_name: string | null
          source_type: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["destination_status"]
          transport_score: number
          updated_at: string
          verification_status: string
        }
        Insert: {
          capacity_score?: number
          city?: string | null
          community_score?: number
          content_hash?: string | null
          coordinate_source?: string | null
          coordinate_verified_at?: string | null
          country?: string
          created_at?: string
          crowd_score?: number
          cultural_summary?: string
          data_source?: string
          data_status?: string
          description?: string
          health_score?: number
          id?: string
          image_url?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_ja?: string | null
          next_verification_at?: string | null
          popularity_score?: number
          prefecture: string
          region: string
          retrieved_at?: string | null
          slug: string
          source_authority?: number | null
          source_id?: string | null
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["destination_status"]
          transport_score?: number
          updated_at?: string
          verification_status?: string
        }
        Update: {
          capacity_score?: number
          city?: string | null
          community_score?: number
          content_hash?: string | null
          coordinate_source?: string | null
          coordinate_verified_at?: string | null
          country?: string
          created_at?: string
          crowd_score?: number
          cultural_summary?: string
          data_source?: string
          data_status?: string
          description?: string
          health_score?: number
          id?: string
          image_url?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_ja?: string | null
          next_verification_at?: string | null
          popularity_score?: number
          prefecture?: string
          region?: string
          retrieved_at?: string | null
          slug?: string
          source_authority?: number | null
          source_id?: string | null
          source_name?: string | null
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["destination_status"]
          transport_score?: number
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_slots: {
        Row: {
          booked_count: number
          capacity: number
          created_at: string
          ends_at: string
          experience_id: string
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          booked_count?: number
          capacity: number
          created_at?: string
          ends_at: string
          experience_id: string
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          booked_count?: number
          capacity?: number
          created_at?: string
          ends_at?: string
          experience_id?: string
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_slots_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          accessibility: Json
          booking_policy: Json
          created_at: string
          cultural_context: string
          description: string
          destination_id: string
          duration_minutes: number
          host_id: string
          id: string
          image_paths: string[]
          interests: string[]
          is_paused: boolean
          is_verified: boolean
          languages: string[]
          latitude: number | null
          longitude: number | null
          max_capacity: number
          meeting_point: string
          photography_policy: string
          price_jpy: number
          rules: Json
          short_description: string
          slug: string
          source_external_experience_id: string | null
          status: Database["public"]["Enums"]["experience_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accessibility?: Json
          booking_policy?: Json
          created_at?: string
          cultural_context?: string
          description?: string
          destination_id: string
          duration_minutes: number
          host_id: string
          id?: string
          image_paths?: string[]
          interests?: string[]
          is_paused?: boolean
          is_verified?: boolean
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          max_capacity: number
          meeting_point?: string
          photography_policy?: string
          price_jpy?: number
          rules?: Json
          short_description?: string
          slug: string
          source_external_experience_id?: string | null
          status?: Database["public"]["Enums"]["experience_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accessibility?: Json
          booking_policy?: Json
          created_at?: string
          cultural_context?: string
          description?: string
          destination_id?: string
          duration_minutes?: number
          host_id?: string
          id?: string
          image_paths?: string[]
          interests?: string[]
          is_paused?: boolean
          is_verified?: boolean
          languages?: string[]
          latitude?: number | null
          longitude?: number | null
          max_capacity?: number
          meeting_point?: string
          photography_policy?: string
          price_jpy?: number
          rules?: Json
          short_description?: string
          slug?: string
          source_external_experience_id?: string | null
          status?: Database["public"]["Enums"]["experience_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_source_external_experience_id_fkey"
            columns: ["source_external_experience_id"]
            isOneToOne: false
            referencedRelation: "external_experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      external_experiences: {
        Row: {
          accessibility: Json | null
          accessibility_status: string
          booking_mode: string
          canonical_source_url: string
          category: string | null
          content_hash: string
          created_at: string
          data_status: string
          destination_id: string
          duration_minutes: number | null
          external_booking_url: string | null
          id: string
          image_attribution: string | null
          image_license: string | null
          image_source: string | null
          image_url: string | null
          image_usage_status: string
          last_verified_at: string
          listing_source: string
          michi_booking_enabled: boolean
          next_verification_at: string | null
          official_url: string
          operator_name: string
          original_language: string | null
          place_id: string | null
          price_max_jpy: number | null
          price_min_jpy: number | null
          price_text: string | null
          price_verified_at: string | null
          retrieved_at: string
          short_description: string | null
          slug: string
          source_authority: number
          source_id: string
          source_name: string
          source_type: string
          source_url: string
          title: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          accessibility?: Json | null
          accessibility_status?: string
          booking_mode?: string
          canonical_source_url: string
          category?: string | null
          content_hash: string
          created_at?: string
          data_status?: string
          destination_id: string
          duration_minutes?: number | null
          external_booking_url?: string | null
          id?: string
          image_attribution?: string | null
          image_license?: string | null
          image_source?: string | null
          image_url?: string | null
          image_usage_status?: string
          last_verified_at: string
          listing_source?: string
          michi_booking_enabled?: boolean
          next_verification_at?: string | null
          official_url: string
          operator_name: string
          original_language?: string | null
          place_id?: string | null
          price_max_jpy?: number | null
          price_min_jpy?: number | null
          price_text?: string | null
          price_verified_at?: string | null
          retrieved_at: string
          short_description?: string | null
          slug: string
          source_authority: number
          source_id: string
          source_name: string
          source_type: string
          source_url: string
          title: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          accessibility?: Json | null
          accessibility_status?: string
          booking_mode?: string
          canonical_source_url?: string
          category?: string | null
          content_hash?: string
          created_at?: string
          data_status?: string
          destination_id?: string
          duration_minutes?: number | null
          external_booking_url?: string | null
          id?: string
          image_attribution?: string | null
          image_license?: string | null
          image_source?: string | null
          image_url?: string | null
          image_usage_status?: string
          last_verified_at?: string
          listing_source?: string
          michi_booking_enabled?: boolean
          next_verification_at?: string | null
          official_url?: string
          operator_name?: string
          original_language?: string | null
          place_id?: string | null
          price_max_jpy?: number | null
          price_min_jpy?: number | null
          price_text?: string | null
          price_verified_at?: string | null
          retrieved_at?: string
          short_description?: string | null
          slug?: string
          source_authority?: number
          source_id?: string
          source_name?: string
          source_type?: string
          source_url?: string
          title?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_experiences_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_experiences_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_experiences_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      host_applications: {
        Row: {
          accessibility_details: string
          applicant_id: string
          availability_plan: string
          cancellation_rules: string
          capacity_plan: string
          contact_email: string
          created_at: string
          cultural_rules: string
          experience_description: string
          external_experience_id: string | null
          id: string
          legal_name: string
          official_website: string | null
          organization_name: string
          ownership_evidence: string
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: Database["public"]["Enums"]["host_application_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          accessibility_details?: string
          applicant_id: string
          availability_plan?: string
          cancellation_rules?: string
          capacity_plan?: string
          contact_email: string
          created_at?: string
          cultural_rules?: string
          experience_description?: string
          external_experience_id?: string | null
          id?: string
          legal_name: string
          official_website?: string | null
          organization_name: string
          ownership_evidence?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["host_application_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          accessibility_details?: string
          applicant_id?: string
          availability_plan?: string
          cancellation_rules?: string
          capacity_plan?: string
          contact_email?: string
          created_at?: string
          cultural_rules?: string
          experience_description?: string
          external_experience_id?: string | null
          id?: string
          legal_name?: string
          official_website?: string | null
          organization_name?: string
          ownership_evidence?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["host_application_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_applications_external_experience_id_fkey"
            columns: ["external_experience_id"]
            isOneToOne: false
            referencedRelation: "external_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_applications_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      host_invitations: {
        Row: {
          created_at: string
          email: string
          external_experience_id: string | null
          id: string
          invited_by: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          external_experience_id?: string | null
          id?: string
          invited_by: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          external_experience_id?: string | null
          id?: string
          invited_by?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_invitations_external_experience_id_fkey"
            columns: ["external_experience_id"]
            isOneToOne: false
            referencedRelation: "external_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itineraries: {
        Row: {
          budget_jpy: number | null
          created_at: string
          end_date: string | null
          id: string
          interests: Json
          name: string
          preferences: Json
          share_token: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["itinerary_status"]
          traveler_id: string
          updated_at: string
          visibility: Database["public"]["Enums"]["itinerary_visibility"]
        }
        Insert: {
          budget_jpy?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          interests?: Json
          name: string
          preferences?: Json
          share_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["itinerary_status"]
          traveler_id: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["itinerary_visibility"]
        }
        Update: {
          budget_jpy?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          interests?: Json
          name?: string
          preferences?: Json
          share_token?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["itinerary_status"]
          traveler_id?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["itinerary_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "itineraries_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          created_at: string
          crowd_score: number | null
          availability_checked_at: string | null
          availability_status: string
          booking_mode: string
          cultural_context_snapshot: string
          data_status: string
          destination_id: string | null
          destination_health_score: number | null
          destination_health_status: string
          cost_status: string
          ends_at: string | null
          estimated_cost_jpy: number
          external_experience_id: string | null
          experience_id: string | null
          id: string
          item_type: string
          itinerary_id: string
          local_benefit_score: number | null
          interest_compatibility: number | null
          recommendation_score: number | null
          rationale: string
          sequence: number
          source_name: string | null
          source_url: string | null
          source_verified_at: string | null
          starts_at: string | null
          suggestion_origin: string
          title: string
          transport_estimate: Json
        }
        Insert: {
          created_at?: string
          crowd_score?: number | null
          availability_checked_at?: string | null
          availability_status?: string
          booking_mode?: string
          cultural_context_snapshot?: string
          data_status?: string
          destination_id?: string | null
          destination_health_score?: number | null
          destination_health_status?: string
          cost_status?: string
          ends_at?: string | null
          estimated_cost_jpy?: number
          external_experience_id?: string | null
          experience_id?: string | null
          id?: string
          item_type: string
          itinerary_id: string
          local_benefit_score?: number | null
          interest_compatibility?: number | null
          recommendation_score?: number | null
          rationale?: string
          sequence?: number
          source_name?: string | null
          source_url?: string | null
          source_verified_at?: string | null
          starts_at?: string | null
          suggestion_origin?: string
          title: string
          transport_estimate?: Json
        }
        Update: {
          created_at?: string
          crowd_score?: number | null
          availability_checked_at?: string | null
          availability_status?: string
          booking_mode?: string
          cultural_context_snapshot?: string
          data_status?: string
          destination_id?: string | null
          destination_health_score?: number | null
          destination_health_status?: string
          cost_status?: string
          ends_at?: string | null
          estimated_cost_jpy?: number
          external_experience_id?: string | null
          experience_id?: string | null
          id?: string
          item_type?: string
          itinerary_id?: string
          local_benefit_score?: number | null
          interest_compatibility?: number | null
          recommendation_score?: number | null
          rationale?: string
          sequence?: number
          source_name?: string | null
          source_url?: string | null
          source_verified_at?: string | null
          starts_at?: string | null
          suggestion_origin?: string
          title?: string
          transport_estimate?: Json
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_external_experience_id_fkey"
            columns: ["external_experience_id"]
            isOneToOne: false
            referencedRelation: "external_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_items_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_decisions: {
        Row: {
          created_at: string
          decision: string
          experience_id: string | null
          external_experience_id: string | null
          id: string
          recommendation_log_id: string
          suggestion_origin: string
          traveler_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          experience_id?: string | null
          external_experience_id?: string | null
          id?: string
          recommendation_log_id: string
          suggestion_origin: string
          traveler_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          experience_id?: string | null
          external_experience_id?: string | null
          id?: string
          recommendation_log_id?: string
          suggestion_origin?: string
          traveler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_decisions_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_decisions_external_experience_id_fkey"
            columns: ["external_experience_id"]
            isOneToOne: false
            referencedRelation: "external_experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_decisions_recommendation_log_id_fkey"
            columns: ["recommendation_log_id"]
            isOneToOne: false
            referencedRelation: "recommendation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itinerary_decisions_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_achievements: {
        Row: {
          description: string
          earned_at: string
          id: string
          metadata: Json
          title: string
          traveler_id: string
          type: string
        }
        Insert: {
          description?: string
          earned_at?: string
          id?: string
          metadata?: Json
          title: string
          traveler_id: string
          type: string
        }
        Update: {
          description?: string
          earned_at?: string
          id?: string
          metadata?: Json
          title?: string
          traveler_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_achievements_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          accessibility: Json | null
          accessibility_status: string
          address: string | null
          admission_text: string | null
          canonical_source_url: string
          content_hash: string
          coordinate_source: string | null
          coordinate_verified_at: string | null
          created_at: string
          cultural_context: string | null
          data_status: string
          description: string | null
          destination_id: string
          id: string
          image_attribution: string | null
          image_license: string | null
          image_source: string | null
          image_url: string | null
          image_usage_status: string
          last_verified_at: string
          latitude: number | null
          location_scope: string | null
          longitude: number | null
          name: string
          name_ja: string | null
          next_verification_at: string | null
          official_url: string | null
          opening_hours_source: string | null
          opening_hours_text: string | null
          opening_hours_verified_at: string | null
          original_language: string | null
          photography_policy: string | null
          place_type: string
          retrieved_at: string
          short_description: string | null
          slug: string
          source_authority: number
          source_id: string
          source_name: string
          source_type: string
          source_url: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          accessibility?: Json | null
          accessibility_status?: string
          address?: string | null
          admission_text?: string | null
          canonical_source_url: string
          content_hash: string
          coordinate_source?: string | null
          coordinate_verified_at?: string | null
          created_at?: string
          cultural_context?: string | null
          data_status?: string
          description?: string | null
          destination_id: string
          id?: string
          image_attribution?: string | null
          image_license?: string | null
          image_source?: string | null
          image_url?: string | null
          image_usage_status?: string
          last_verified_at: string
          latitude?: number | null
          location_scope?: string | null
          longitude?: number | null
          name: string
          name_ja?: string | null
          next_verification_at?: string | null
          official_url?: string | null
          opening_hours_source?: string | null
          opening_hours_text?: string | null
          opening_hours_verified_at?: string | null
          original_language?: string | null
          photography_policy?: string | null
          place_type: string
          retrieved_at: string
          short_description?: string | null
          slug: string
          source_authority: number
          source_id: string
          source_name: string
          source_type: string
          source_url: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          accessibility?: Json | null
          accessibility_status?: string
          address?: string | null
          admission_text?: string | null
          canonical_source_url?: string
          content_hash?: string
          coordinate_source?: string | null
          coordinate_verified_at?: string | null
          created_at?: string
          cultural_context?: string | null
          data_status?: string
          description?: string | null
          destination_id?: string
          id?: string
          image_attribution?: string | null
          image_license?: string | null
          image_source?: string | null
          image_url?: string | null
          image_usage_status?: string
          last_verified_at?: string
          latitude?: number | null
          location_scope?: string | null
          longitude?: number | null
          name?: string
          name_ja?: string | null
          next_verification_at?: string | null
          official_url?: string | null
          opening_hours_source?: string | null
          opening_hours_text?: string | null
          opening_hours_verified_at?: string | null
          original_language?: string | null
          photography_policy?: string | null
          place_type?: string
          retrieved_at?: string
          short_description?: string | null
          slug?: string
          source_authority?: number
          source_id?: string
          source_name?: string
          source_type?: string
          source_url?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accessibility_preferences: Json
          avatar_url: string | null
          created_at: string
          dietary_preferences: Json
          full_name: string
          id: string
          nationality: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          accessibility_preferences?: Json
          avatar_url?: string | null
          created_at?: string
          dietary_preferences?: Json
          full_name?: string
          id: string
          nationality?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          accessibility_preferences?: Json
          avatar_url?: string | null
          created_at?: string
          dietary_preferences?: Json
          full_name?: string
          id?: string
          nationality?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          created_at: string
          decision: string
          experience_id: string
          id: string
          recommendation_log_id: string
          traveler_id: string
        }
        Insert: {
          created_at?: string
          decision: string
          experience_id: string
          id?: string
          recommendation_log_id: string
          traveler_id: string
        }
        Update: {
          created_at?: string
          decision?: string
          experience_id?: string
          id?: string
          recommendation_log_id?: string
          traveler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_feedback_recommendation_log_id_fkey"
            columns: ["recommendation_log_id"]
            isOneToOne: false
            referencedRelation: "recommendation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_feedback_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_logs: {
        Row: {
          created_at: string
          id: string
          input_context: Json
          recommendations: Json
          selected_recommendation_id: string | null
          traveler_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_context?: Json
          recommendations?: Json
          selected_recommendation_id?: string | null
          traveler_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_context?: Json
          recommendations?: Json
          selected_recommendation_id?: string | null
          traveler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_logs_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traveler_feedback: {
        Row: {
          booking_id: string
          comment: string
          created_at: string
          cultural_depth_score: number
          cultural_preparation_completed: boolean
          host_rating: number
          id: string
          preparation_helpfulness: number | null
          understanding_score: number
        }
        Insert: {
          booking_id: string
          comment?: string
          created_at?: string
          cultural_depth_score: number
          cultural_preparation_completed?: boolean
          host_rating: number
          id?: string
          preparation_helpfulness?: number | null
          understanding_score: number
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          cultural_depth_score?: number
          cultural_preparation_completed?: boolean
          host_rating?: number
          id?: string
          preparation_helpfulness?: number | null
          understanding_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "traveler_feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      traveler_reflections: {
        Row: {
          booking_id: string
          created_at: string
          reflection: string
          traveler_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          reflection: string
          traveler_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          reflection?: string
          traveler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "traveler_reflections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traveler_reflections_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_host_experience: {
        Args: { p_experience_id: string }
        Returns: undefined
      }
      confirm_experience_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      consume_cultural_companion_limit: {
        Args: { p_requester_hash: string }
        Returns: boolean
      }
      consume_guest_request_limit: {
        Args: { p_max_requests?: number; p_requester_hash: string; p_route_key: string }
        Returns: boolean
      }
      consume_cultural_evidence_limit: {
        Args: { p_requester_hash: string }
        Returns: boolean
      }
      consume_cultural_ingestion_limit: { Args: never; Returns: boolean }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      decline_experience_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      cancel_experience_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      cancel_host_experience_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      complete_experience_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      enqueue_booking_preparation_reminders: {
        Args: never
        Returns: number
      }
      dmo_destination_metrics: {
        Args: never
        Returns: {
          active_experience_count: number
          average_community_pressure: number
          booking_count: number
          destination_id: string
          destination_name: string
          remaining_slot_capacity: number
        }[]
      }
      get_shared_itinerary: {
        Args: { p_share_token: string }
        Returns: Json
      }
      get_cultural_passport_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          cultural_preparation_completed: number
          experiences_completed: number
          local_experiences_supported: number
          regions_explored: number
          responsible_alternatives_selected: number
        }[]
      }
      match_cultural_content: {
        Args: {
          match_category?: string
          match_count?: number
          match_destination_id?: string
          match_experience_id?: string
          match_language?: string
          query_embedding: string
          requested_model?: string
        }
        Returns: {
          id: string
          similarity: number
        }[]
      }
      request_experience_booking: {
        Args: {
          p_guests: number
          p_notes?: string
          p_cultural_requirements?: Json
          p_rule_acknowledgment: Json
          p_slot_id: string
        }
        Returns: string
      }
      reorder_itinerary_items: {
        Args: { p_item_ids: string[]; p_itinerary_id: string }
        Returns: boolean
      }
      submit_experience_reflection: {
        Args: {
          p_booking_id: string
          p_cultural_depth_score: number
          p_cultural_preparation_completed: boolean
          p_host_rating: number
          p_learning_reflection: string
          p_preparation_helpfulness: number | null
          p_understanding_score: number
        }
        Returns: undefined
      }
      review_host_application: {
        Args: {
          p_application_id: string
          p_note: string
          p_ownership_checked: boolean
          p_status: Database["public"]["Enums"]["host_application_status"]
        }
        Returns: undefined
      }
      sync_host_experience_cultural_rules: {
        Args: { p_experience_id: string; p_source_url: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "traveler" | "host" | "dmo" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "refunded"
      cultural_source_status: "pending" | "verified" | "stale" | "rejected"
      destination_status: "draft" | "published" | "archived"
      experience_status: "draft" | "published" | "paused" | "archived"
      feedback_sentiment: "positive" | "neutral" | "negative"
      host_application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "verified"
        | "rejected"
        | "suspended"
      itinerary_status: "draft" | "planned" | "completed" | "archived"
      itinerary_visibility: "private" | "shared"
      slot_status: "open" | "full" | "cancelled" | "closed"
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
      app_role: ["traveler", "host", "dmo", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
      ],
      cultural_source_status: ["pending", "verified", "stale", "rejected"],
      destination_status: ["draft", "published", "archived"],
      experience_status: ["draft", "published", "paused", "archived"],
      feedback_sentiment: ["positive", "neutral", "negative"],
      host_application_status: [
        "draft",
        "submitted",
        "under_review",
        "verified",
        "rejected",
        "suspended",
      ],
      itinerary_status: ["draft", "planned", "completed", "archived"],
      itinerary_visibility: ["private", "shared"],
      slot_status: ["open", "full", "cancelled", "closed"],
    },
  },
} as const
