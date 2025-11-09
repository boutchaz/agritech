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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_mappings: {
        Row: {
          account_code: string
          accounting_standard: string
          country_code: string
          created_at: string | null
          description: string | null
          id: string
          mapping_key: string
          mapping_type: string
        }
        Insert: {
          account_code: string
          accounting_standard: string
          country_code: string
          created_at?: string | null
          description?: string | null
          id?: string
          mapping_key: string
          mapping_type: string
        }
        Update: {
          account_code?: string
          accounting_standard?: string
          country_code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          mapping_key?: string
          mapping_type?: string
        }
        Relationships: []
      }
      account_templates: {
        Row: {
          account_code: string
          account_name: string
          account_subtype: string | null
          account_type: string
          accounting_standard: string
          country_code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_group: boolean | null
          metadata: Json | null
          parent_code: string | null
          template_name: string
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_subtype?: string | null
          account_type: string
          accounting_standard: string
          country_code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          metadata?: Json | null
          parent_code?: string | null
          template_name: string
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_subtype?: string | null
          account_type?: string
          accounting_standard?: string
          country_code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          metadata?: Json | null
          parent_code?: string | null
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      accounting_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          exchange_rate: number | null
          id: string
          journal_entry_id: string | null
          organization_id: string
          party_id: string | null
          party_name: string
          party_type: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["accounting_payment_method"]
          payment_number: string
          payment_type: Database["public"]["Enums"]["accounting_payment_type"]
          reference_number: string | null
          remarks: string | null
          status:
            | Database["public"]["Enums"]["accounting_payment_status"]
            | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          organization_id: string
          party_id?: string | null
          party_name: string
          party_type?: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["accounting_payment_method"]
          payment_number: string
          payment_type: Database["public"]["Enums"]["accounting_payment_type"]
          reference_number?: string | null
          remarks?: string | null
          status?:
            | Database["public"]["Enums"]["accounting_payment_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          organization_id?: string
          party_id?: string | null
          party_name?: string
          party_type?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["accounting_payment_method"]
          payment_number?: string
          payment_type?: Database["public"]["Enums"]["accounting_payment_type"]
          reference_number?: string | null
          remarks?: string | null
          status?:
            | Database["public"]["Enums"]["accounting_payment_status"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "accounting_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_subtype: string | null
          account_type: string
          allow_cost_center: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_group: boolean | null
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_subtype?: string | null
          account_type: string
          allow_cost_center?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_subtype?: string | null
          account_type?: string
          allow_cost_center?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      analyses: {
        Row: {
          analysis_date: string
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          created_at: string | null
          data: Json | null
          id: string
          laboratory: string | null
          notes: string | null
          parcel_id: string
          updated_at: string | null
        }
        Insert: {
          analysis_date: string
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          created_at?: string | null
          data?: Json | null
          id?: string
          laboratory?: string | null
          notes?: string | null
          parcel_id: string
          updated_at?: string | null
        }
        Update: {
          analysis_date?: string
          analysis_type?: Database["public"]["Enums"]["analysis_type"]
          created_at?: string | null
          data?: Json | null
          id?: string
          laboratory?: string | null
          notes?: string | null
          parcel_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_recommendations: {
        Row: {
          action_items: Json | null
          analysis_id: string
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          priority: string | null
          recommendation_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          analysis_id: string
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recommendation_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          analysis_id?: string
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recommendation_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_recommendations_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_type: string | null
          bank_code: string | null
          bank_name: string | null
          branch_code: string | null
          created_at: string | null
          currency_code: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          opening_balance: number | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_type?: string | null
          bank_code?: string | null
          bank_name?: string | null
          branch_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_type?: string | null
          bank_code?: string | null
          bank_name?: string | null
          branch_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_coverage_checks: {
        Row: {
          all_cloud_percentages: number[] | null
          aoi_id: string | null
          available_images_count: number | null
          avg_cloud_coverage: number | null
          check_date: string
          created_at: string | null
          date_range_end: string
          date_range_start: string
          farm_id: string | null
          has_suitable_images: boolean
          id: string
          max_cloud_coverage: number | null
          max_cloud_threshold: number
          min_cloud_coverage: number | null
          organization_id: string
          parcel_id: string
          recommended_date: string | null
          suitable_images_count: number | null
          updated_at: string | null
        }
        Insert: {
          all_cloud_percentages?: number[] | null
          aoi_id?: string | null
          available_images_count?: number | null
          avg_cloud_coverage?: number | null
          check_date: string
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          farm_id?: string | null
          has_suitable_images: boolean
          id?: string
          max_cloud_coverage?: number | null
          max_cloud_threshold: number
          min_cloud_coverage?: number | null
          organization_id: string
          parcel_id: string
          recommended_date?: string | null
          suitable_images_count?: number | null
          updated_at?: string | null
        }
        Update: {
          all_cloud_percentages?: number[] | null
          aoi_id?: string | null
          available_images_count?: number | null
          avg_cloud_coverage?: number | null
          check_date?: string
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          farm_id?: string | null
          has_suitable_images?: boolean
          id?: string
          max_cloud_coverage?: number | null
          max_cloud_threshold?: number
          min_cloud_coverage?: number | null
          organization_id?: string
          parcel_id?: string
          recommended_date?: string | null
          suitable_images_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloud_coverage_checks_aoi_id_fkey"
            columns: ["aoi_id"]
            isOneToOne: false
            referencedRelation: "satellite_aois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_coverage_checks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_coverage_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloud_coverage_checks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          farm_id: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          parcel_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          parcel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parcel_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      costs: {
        Row: {
          amount: number
          category_id: string | null
          cost_type: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string
          description: string | null
          farm_id: string | null
          id: string
          notes: string | null
          organization_id: string
          parcel_id: string | null
          reference_id: string | null
          reference_type: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          cost_type: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date: string
          description?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          parcel_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          cost_type?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          parcel_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "costs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costs_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          type_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_categories_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "crop_types"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crop_varieties: {
        Row: {
          category_id: string
          created_at: string | null
          days_to_maturity: number | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          days_to_maturity?: number | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          days_to_maturity?: number | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_varieties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "crop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          actual_harvest_date: string | null
          actual_yield: number | null
          created_at: string | null
          expected_harvest_date: string | null
          expected_yield: number | null
          farm_id: string
          id: string
          name: string
          notes: string | null
          parcel_id: string | null
          planted_area: number | null
          planting_date: string | null
          status: string | null
          updated_at: string | null
          variety_id: string
          yield_unit: string | null
        }
        Insert: {
          actual_harvest_date?: string | null
          actual_yield?: number | null
          created_at?: string | null
          expected_harvest_date?: string | null
          expected_yield?: number | null
          farm_id: string
          id?: string
          name: string
          notes?: string | null
          parcel_id?: string | null
          planted_area?: number | null
          planting_date?: string | null
          status?: string | null
          updated_at?: string | null
          variety_id: string
          yield_unit?: string | null
        }
        Update: {
          actual_harvest_date?: string | null
          actual_yield?: number | null
          created_at?: string | null
          expected_harvest_date?: string | null
          expected_yield?: number | null
          farm_id?: string
          id?: string
          name?: string
          notes?: string | null
          parcel_id?: string | null
          planted_area?: number | null
          planting_date?: string | null
          status?: string | null
          updated_at?: string | null
          variety_id?: string
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crops_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crops_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crops_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "crop_varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          name: string
          symbol: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          name: string
          symbol?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          name?: string
          symbol?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          currency_code: string | null
          customer_code: string | null
          customer_type: string | null
          email: string | null
          id: string
          is_active: boolean | null
          mobile: string | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          price_list: string | null
          state_province: string | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          customer_code?: string | null
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          price_list?: string | null
          state_province?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          customer_code?: string | null
          customer_type?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          mobile?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          price_list?: string | null
          state_province?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_settings: {
        Row: {
          created_at: string | null
          id: string
          layout: Json | null
          organization_id: string
          show_climate_data: boolean | null
          show_financial_data: boolean | null
          show_irrigation_data: boolean | null
          show_maintenance_data: boolean | null
          show_production_data: boolean | null
          show_soil_data: boolean | null
          show_stock_alerts: boolean | null
          show_task_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          organization_id: string
          show_climate_data?: boolean | null
          show_financial_data?: boolean | null
          show_irrigation_data?: boolean | null
          show_maintenance_data?: boolean | null
          show_production_data?: boolean | null
          show_soil_data?: boolean | null
          show_stock_alerts?: boolean | null
          show_task_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          layout?: Json | null
          organization_id?: string
          show_climate_data?: boolean | null
          show_financial_data?: boolean | null
          show_irrigation_data?: boolean | null
          show_maintenance_data?: boolean | null
          show_production_data?: boolean | null
          show_soil_data?: boolean | null
          show_stock_alerts?: boolean | null
          show_task_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      day_laborers: {
        Row: {
          availability: string | null
          created_at: string | null
          daily_rate: number | null
          farm_id: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          rating: number | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          created_at?: string | null
          daily_rate?: number | null
          farm_id: string
          first_name: string
          id?: string
          is_active?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          created_at?: string | null
          daily_rate?: number | null
          farm_id?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "day_laborers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          arrival_time: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_contact: string | null
          customer_email: string | null
          customer_name: string
          delivery_address: string | null
          delivery_date: string
          delivery_note_number: string | null
          delivery_type: string
          departure_time: string | null
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          driver_id: string | null
          farm_id: string
          id: string
          invoice_number: string | null
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          payment_received: number | null
          payment_status: string | null
          payment_terms: string | null
          photos: Json | null
          signature_date: string | null
          signature_image: string | null
          signature_name: string | null
          status: string | null
          total_amount: number | null
          total_quantity: number | null
          updated_at: string | null
          vehicle_info: string | null
        }
        Insert: {
          arrival_time?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_contact?: string | null
          customer_email?: string | null
          customer_name: string
          delivery_address?: string | null
          delivery_date: string
          delivery_note_number?: string | null
          delivery_type: string
          departure_time?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          driver_id?: string | null
          farm_id: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_received?: number | null
          payment_status?: string | null
          payment_terms?: string | null
          photos?: Json | null
          signature_date?: string | null
          signature_image?: string | null
          signature_name?: string | null
          status?: string | null
          total_amount?: number | null
          total_quantity?: number | null
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Update: {
          arrival_time?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_contact?: string | null
          customer_email?: string | null
          customer_name?: string
          delivery_address?: string | null
          delivery_date?: string
          delivery_note_number?: string | null
          delivery_type?: string
          departure_time?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          distance_km?: number | null
          driver_id?: string | null
          farm_id?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_received?: number | null
          payment_status?: string | null
          payment_terms?: string | null
          photos?: Json | null
          signature_date?: string | null
          signature_image?: string | null
          signature_name?: string | null
          status?: string | null
          total_amount?: number | null
          total_quantity?: number | null
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_items: {
        Row: {
          created_at: string | null
          delivery_id: string
          harvest_record_id: string
          id: string
          notes: string | null
          price_per_unit: number
          quality_grade: string | null
          quality_notes: string | null
          quantity: number
          total_amount: number | null
          unit: string
        }
        Insert: {
          created_at?: string | null
          delivery_id: string
          harvest_record_id: string
          id?: string
          notes?: string | null
          price_per_unit: number
          quality_grade?: string | null
          quality_notes?: string | null
          quantity: number
          total_amount?: number | null
          unit: string
        }
        Update: {
          created_at?: string | null
          delivery_id?: string
          harvest_record_id?: string
          id?: string
          notes?: string | null
          price_per_unit?: number
          quality_grade?: string | null
          quality_notes?: string | null
          quantity?: number
          total_amount?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_harvest_record_id_fkey"
            columns: ["harvest_record_id"]
            isOneToOne: false
            referencedRelation: "harvest_records"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking: {
        Row: {
          delivery_id: string
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          notes: string | null
          photo_url: string | null
          recorded_at: string | null
          recorded_by: string | null
          status: string
        }
        Insert: {
          delivery_id: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          photo_url?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          status: string
        }
        Update: {
          delivery_id?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          notes?: string | null
          photo_url?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          employee_id: string | null
          farm_id: string
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          salary: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          farm_id: string
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_id?: string | null
          farm_id?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_management_roles: {
        Row: {
          created_at: string | null
          farm_id: string
          id: string
          is_active: boolean | null
          role: string | null
          role_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          farm_id: string
          id?: string
          is_active?: boolean | null
          role?: string | null
          role_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          farm_id?: string
          id?: string
          is_active?: boolean | null
          role?: string | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_management_roles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_management_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          address: string | null
          certification_status: string | null
          city: string | null
          climate_zone: string | null
          coordinates: Json | null
          country: string | null
          created_at: string | null
          description: string | null
          established_date: string | null
          id: string
          irrigation_type: string | null
          is_active: boolean | null
          location: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          organization_id: string | null
          postal_code: string | null
          size: number | null
          size_unit: string | null
          soil_type: string | null
          state: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          certification_status?: string | null
          city?: string | null
          climate_zone?: string | null
          coordinates?: Json | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          established_date?: string | null
          id?: string
          irrigation_type?: string | null
          is_active?: boolean | null
          location?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          organization_id?: string | null
          postal_code?: string | null
          size?: number | null
          size_unit?: string | null
          soil_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          certification_status?: string | null
          city?: string | null
          climate_zone?: string | null
          coordinates?: Json | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          established_date?: string | null
          id?: string
          irrigation_type?: string | null
          is_active?: boolean | null
          location?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          organization_id?: string | null
          postal_code?: string | null
          size?: number | null
          size_unit?: string | null
          soil_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          farm_id: string
          id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          subcategory: string | null
          transaction_date: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          farm_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          subcategory?: string | null
          transaction_date: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          farm_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          subcategory?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_forecasts: {
        Row: {
          confidence_level: string | null
          cost_estimate: number | null
          created_at: string | null
          created_by: string | null
          crop_type: string
          farm_id: string
          forecast_harvest_date_end: string
          forecast_harvest_date_start: string
          forecast_season: string | null
          historical_basis: Json | null
          id: string
          notes: string | null
          organization_id: string
          parcel_id: string
          planting_date: string | null
          predicted_price_per_unit: number | null
          predicted_quality_grade: string | null
          predicted_revenue: number | null
          predicted_yield_per_hectare: number | null
          predicted_yield_quantity: number
          profit_estimate: number | null
          soil_factors: Json | null
          status: string | null
          unit_of_measure: string
          updated_at: string | null
          variety: string | null
          weather_factors: Json | null
        }
        Insert: {
          confidence_level?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          crop_type: string
          farm_id: string
          forecast_harvest_date_end: string
          forecast_harvest_date_start: string
          forecast_season?: string | null
          historical_basis?: Json | null
          id?: string
          notes?: string | null
          organization_id: string
          parcel_id: string
          planting_date?: string | null
          predicted_price_per_unit?: number | null
          predicted_quality_grade?: string | null
          predicted_revenue?: number | null
          predicted_yield_per_hectare?: number | null
          predicted_yield_quantity: number
          profit_estimate?: number | null
          soil_factors?: Json | null
          status?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          variety?: string | null
          weather_factors?: Json | null
        }
        Update: {
          confidence_level?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          created_by?: string | null
          crop_type?: string
          farm_id?: string
          forecast_harvest_date_end?: string
          forecast_harvest_date_start?: string
          forecast_season?: string | null
          historical_basis?: Json | null
          id?: string
          notes?: string | null
          organization_id?: string
          parcel_id?: string
          planting_date?: string | null
          predicted_price_per_unit?: number | null
          predicted_quality_grade?: string | null
          predicted_revenue?: number | null
          predicted_yield_per_hectare?: number | null
          predicted_yield_quantity?: number
          profit_estimate?: number | null
          soil_factors?: Json | null
          status?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          variety?: string | null
          weather_factors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_forecasts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_forecasts_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          crop_id: string | null
          documents: Json | null
          estimated_revenue: number | null
          expected_price_per_unit: number | null
          farm_id: string
          harvest_date: string
          harvest_task_id: string | null
          humidity: number | null
          id: string
          intended_for: string | null
          notes: string | null
          organization_id: string
          parcel_id: string
          photos: Json | null
          quality_grade: string | null
          quality_notes: string | null
          quality_score: number | null
          quantity: number
          reception_batch_id: string | null
          status: string | null
          storage_location: string | null
          supervisor_id: string | null
          temperature: number | null
          unit: string
          updated_at: string | null
          workers: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          crop_id?: string | null
          documents?: Json | null
          estimated_revenue?: number | null
          expected_price_per_unit?: number | null
          farm_id: string
          harvest_date: string
          harvest_task_id?: string | null
          humidity?: number | null
          id?: string
          intended_for?: string | null
          notes?: string | null
          organization_id: string
          parcel_id: string
          photos?: Json | null
          quality_grade?: string | null
          quality_notes?: string | null
          quality_score?: number | null
          quantity: number
          reception_batch_id?: string | null
          status?: string | null
          storage_location?: string | null
          supervisor_id?: string | null
          temperature?: number | null
          unit: string
          updated_at?: string | null
          workers?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          crop_id?: string | null
          documents?: Json | null
          estimated_revenue?: number | null
          expected_price_per_unit?: number | null
          farm_id?: string
          harvest_date?: string
          harvest_task_id?: string | null
          humidity?: number | null
          id?: string
          intended_for?: string | null
          notes?: string | null
          organization_id?: string
          parcel_id?: string
          photos?: Json | null
          quality_grade?: string | null
          quality_notes?: string | null
          quality_score?: number | null
          quantity?: number
          reception_batch_id?: string | null
          status?: string | null
          storage_location?: string | null
          supervisor_id?: string | null
          temperature?: number | null
          unit?: string
          updated_at?: string | null
          workers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_harvest_task_id_fkey"
            columns: ["harvest_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          batch_number: string | null
          brand: string | null
          category: string | null
          category_id: string
          cost_per_unit: number | null
          created_at: string | null
          description: string | null
          expiry_date: string | null
          farm_id: string
          id: string
          is_active: boolean | null
          item_name: string | null
          item_type: string | null
          last_purchase_date: string | null
          location: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          minimum_quantity: number | null
          name: string
          notes: string | null
          organization_id: string | null
          quantity: number | null
          sku: string | null
          status: string | null
          storage_location: string | null
          subcategory_id: string | null
          supplier: string | null
          supplier_id: string | null
          unit: string | null
          unit_cost: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          batch_number?: string | null
          brand?: string | null
          category?: string | null
          category_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          farm_id: string
          id?: string
          is_active?: boolean | null
          item_name?: string | null
          item_type?: string | null
          last_purchase_date?: string | null
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          minimum_quantity?: number | null
          name: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          sku?: string | null
          status?: string | null
          storage_location?: string | null
          subcategory_id?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          batch_number?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          farm_id?: string
          id?: string
          is_active?: boolean | null
          item_name?: string | null
          item_type?: string | null
          last_purchase_date?: string | null
          location?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          minimum_quantity?: number | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          sku?: string | null
          status?: string | null
          storage_location?: string | null
          subcategory_id?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "product_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string
          cost_per_unit: number | null
          created_at: string | null
          current_quantity: number | null
          expiry_date: string | null
          id: string
          initial_quantity: number
          item_id: string
          manufacturing_date: string | null
          notes: string | null
          organization_id: string
          purchase_order_id: string | null
          received_date: string
          status: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          initial_quantity: number
          item_id: string
          manufacturing_date?: string | null
          notes?: string | null
          organization_id: string
          purchase_order_id?: string | null
          received_date: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number | null
          expiry_date?: string | null
          id?: string
          initial_quantity?: number
          item_id?: string
          manufacturing_date?: string | null
          notes?: string | null
          organization_id?: string
          purchase_order_id?: string | null
          received_date?: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string | null
          enable_batch_tracking: boolean | null
          enable_serial_tracking: boolean | null
          farm_id: string | null
          has_expiry_date: boolean | null
          id: string
          location: string | null
          minimum_stock: number | null
          name: string
          notes: string | null
          organization_id: string
          quantity: number | null
          shelf_life_days: number | null
          supplier: string | null
          unit: string
          updated_at: string | null
          valuation_method: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          enable_batch_tracking?: boolean | null
          enable_serial_tracking?: boolean | null
          farm_id?: string | null
          has_expiry_date?: boolean | null
          id?: string
          location?: string | null
          minimum_stock?: number | null
          name: string
          notes?: string | null
          organization_id: string
          quantity?: number | null
          shelf_life_days?: number | null
          supplier?: string | null
          unit: string
          updated_at?: string | null
          valuation_method?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          enable_batch_tracking?: boolean | null
          enable_serial_tracking?: boolean | null
          farm_id?: string | null
          has_expiry_date?: boolean | null
          id?: string
          location?: string | null
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          quantity?: number | null
          shelf_life_days?: number | null
          supplier?: string | null
          unit?: string
          updated_at?: string | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_serial_numbers: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          id: string
          issued_date: string | null
          issued_to: string | null
          item_id: string
          notes: string | null
          organization_id: string
          purchase_order_id: string | null
          received_date: string | null
          serial_number: string
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          warehouse_id: string | null
          warranty_expiry_date: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          issued_date?: string | null
          issued_to?: string | null
          item_id: string
          notes?: string | null
          organization_id: string
          purchase_order_id?: string | null
          received_date?: string | null
          serial_number: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          issued_date?: string | null
          issued_to?: string | null
          item_id?: string
          notes?: string | null
          organization_id?: string
          purchase_order_id?: string | null
          received_date?: string | null
          serial_number?: string
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_serial_numbers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serial_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serial_numbers_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serial_numbers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_serial_numbers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoice_id: string
          item_name: string
          line_number: number
          line_total: number
          quantity: number
          tax_amount: number | null
          tax_id: string | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id: string
          item_name: string
          line_number: number
          line_total: number
          quantity: number
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          item_name?: string
          line_number?: number
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          farm_id: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          journal_entry_id: string | null
          notes: string | null
          organization_id: string
          outstanding_amount: number | null
          paid_amount: number | null
          parcel_id: string | null
          party_id: string | null
          party_name: string
          party_type: string | null
          payment_terms: string | null
          purchase_order_id: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at: string | null
          subtotal: number
          tax_total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          journal_entry_id?: string | null
          notes?: string | null
          organization_id: string
          outstanding_amount?: number | null
          paid_amount?: number | null
          parcel_id?: string | null
          party_id?: string | null
          party_name: string
          party_type?: string | null
          payment_terms?: string | null
          purchase_order_id?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at?: string | null
          subtotal?: number
          tax_total?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          journal_entry_id?: string | null
          notes?: string | null
          organization_id?: string
          outstanding_amount?: number | null
          paid_amount?: number | null
          parcel_id?: string | null
          party_id?: string | null
          party_name?: string
          party_type?: string | null
          payment_terms?: string | null
          purchase_order_id?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at?: string | null
          subtotal?: number
          tax_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoices_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      item_groups: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          default_cost_center_id: string | null
          default_expense_account_id: string | null
          default_sales_account_id: string | null
          default_tax_id: string | null
          default_warehouse_id: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          organization_id: string
          parent_group_id: string | null
          path: string | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          default_cost_center_id?: string | null
          default_expense_account_id?: string | null
          default_sales_account_id?: string | null
          default_tax_id?: string | null
          default_warehouse_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          organization_id: string
          parent_group_id?: string | null
          path?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          default_cost_center_id?: string | null
          default_expense_account_id?: string | null
          default_sales_account_id?: string | null
          default_tax_id?: string | null
          default_warehouse_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parent_group_id?: string | null
          path?: string | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_groups_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_default_expense_account_id_fkey"
            columns: ["default_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_default_sales_account_id_fkey"
            columns: ["default_sales_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_default_tax_id_fkey"
            columns: ["default_tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "item_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          barcode: string | null
          brand: string | null
          created_at: string | null
          created_by: string | null
          crop_type: string | null
          default_cost_center_id: string | null
          default_expense_account_id: string | null
          default_sales_account_id: string | null
          default_unit: string
          default_warehouse_id: string | null
          description: string | null
          has_batch_no: boolean | null
          has_expiry_date: boolean | null
          has_serial_no: boolean | null
          height: number | null
          id: string
          image_url: string | null
          images: Json | null
          inspection_required_before_delivery: boolean | null
          inspection_required_before_purchase: boolean | null
          is_active: boolean | null
          is_purchase_item: boolean | null
          is_sales_item: boolean | null
          is_stock_item: boolean | null
          item_code: string
          item_group_id: string
          item_name: string
          item_tax_template_id: string | null
          last_purchase_rate: number | null
          last_sales_rate: number | null
          length: number | null
          maintain_stock: boolean | null
          manufacturer_code: string | null
          notes: string | null
          organization_id: string
          seasonality: string | null
          shelf_life_days: number | null
          show_in_website: boolean | null
          standard_rate: number | null
          stock_uom: string
          supplier_part_number: string | null
          updated_at: string | null
          updated_by: string | null
          valuation_method: string | null
          variety: string | null
          volume: number | null
          website_description: string | null
          website_image_url: string | null
          weight_per_unit: number | null
          weight_uom: string | null
          width: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          created_at?: string | null
          created_by?: string | null
          crop_type?: string | null
          default_cost_center_id?: string | null
          default_expense_account_id?: string | null
          default_sales_account_id?: string | null
          default_unit: string
          default_warehouse_id?: string | null
          description?: string | null
          has_batch_no?: boolean | null
          has_expiry_date?: boolean | null
          has_serial_no?: boolean | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inspection_required_before_delivery?: boolean | null
          inspection_required_before_purchase?: boolean | null
          is_active?: boolean | null
          is_purchase_item?: boolean | null
          is_sales_item?: boolean | null
          is_stock_item?: boolean | null
          item_code: string
          item_group_id: string
          item_name: string
          item_tax_template_id?: string | null
          last_purchase_rate?: number | null
          last_sales_rate?: number | null
          length?: number | null
          maintain_stock?: boolean | null
          manufacturer_code?: string | null
          notes?: string | null
          organization_id: string
          seasonality?: string | null
          shelf_life_days?: number | null
          show_in_website?: boolean | null
          standard_rate?: number | null
          stock_uom: string
          supplier_part_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valuation_method?: string | null
          variety?: string | null
          volume?: number | null
          website_description?: string | null
          website_image_url?: string | null
          weight_per_unit?: number | null
          weight_uom?: string | null
          width?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          created_at?: string | null
          created_by?: string | null
          crop_type?: string | null
          default_cost_center_id?: string | null
          default_expense_account_id?: string | null
          default_sales_account_id?: string | null
          default_unit?: string
          default_warehouse_id?: string | null
          description?: string | null
          has_batch_no?: boolean | null
          has_expiry_date?: boolean | null
          has_serial_no?: boolean | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          inspection_required_before_delivery?: boolean | null
          inspection_required_before_purchase?: boolean | null
          is_active?: boolean | null
          is_purchase_item?: boolean | null
          is_sales_item?: boolean | null
          is_stock_item?: boolean | null
          item_code?: string
          item_group_id?: string
          item_name?: string
          item_tax_template_id?: string | null
          last_purchase_rate?: number | null
          last_sales_rate?: number | null
          length?: number | null
          maintain_stock?: boolean | null
          manufacturer_code?: string | null
          notes?: string | null
          organization_id?: string
          seasonality?: string | null
          shelf_life_days?: number | null
          show_in_website?: boolean | null
          standard_rate?: number | null
          stock_uom?: string
          supplier_part_number?: string | null
          updated_at?: string | null
          updated_by?: string | null
          valuation_method?: string | null
          variety?: string | null
          volume?: number | null
          website_description?: string | null
          website_image_url?: string | null
          weight_per_unit?: number | null
          weight_uom?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_default_cost_center_id_fkey"
            columns: ["default_cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_default_expense_account_id_fkey"
            columns: ["default_expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_default_sales_account_id_fkey"
            columns: ["default_sales_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_item_group_id_fkey"
            columns: ["item_group_id"]
            isOneToOne: false
            referencedRelation: "item_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          entry_date: string
          entry_number: string
          id: string
          organization_id: string
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["journal_entry_status"] | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entry_date: string
          entry_number: string
          id?: string
          organization_id: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["journal_entry_status"] | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          organization_id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["journal_entry_status"] | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_items: {
        Row: {
          account_id: string
          cost_center_id: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          farm_id: string | null
          id: string
          journal_entry_id: string
          parcel_id: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          account_id: string
          cost_center_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          farm_id?: string | null
          id?: string
          journal_entry_id: string
          parcel_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          account_id?: string
          cost_center_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          farm_id?: string | null
          id?: string
          journal_entry_id?: string
          parcel_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_items_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_items_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock: {
        Row: {
          acquired_date: string | null
          age_months: number | null
          breed: string | null
          count: number | null
          created_at: string | null
          farm_id: string
          health_status: string | null
          id: string
          is_active: boolean | null
          location: string | null
          notes: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          acquired_date?: string | null
          age_months?: number | null
          breed?: string | null
          count?: number | null
          created_at?: string | null
          farm_id: string
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          notes?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          acquired_date?: string | null
          age_months?: number | null
          breed?: string | null
          count?: number | null
          created_at?: string | null
          farm_id?: string
          health_status?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          notes?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "livestock_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      metayage_settlements: {
        Row: {
          calculation_basis: Database["public"]["Enums"]["calculation_basis"]
          charges_breakdown: Json | null
          created_at: string | null
          created_by: string | null
          documents: Json | null
          farm_id: string
          gross_revenue: number
          harvest_date: string | null
          id: string
          net_revenue: number | null
          notes: string | null
          parcel_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          period_end: string
          period_start: string
          total_charges: number | null
          worker_id: string
          worker_percentage: number
          worker_share_amount: number
        }
        Insert: {
          calculation_basis: Database["public"]["Enums"]["calculation_basis"]
          charges_breakdown?: Json | null
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          farm_id: string
          gross_revenue: number
          harvest_date?: string | null
          id?: string
          net_revenue?: number | null
          notes?: string | null
          parcel_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          period_end: string
          period_start: string
          total_charges?: number | null
          worker_id: string
          worker_percentage: number
          worker_share_amount: number
        }
        Update: {
          calculation_basis?: Database["public"]["Enums"]["calculation_basis"]
          charges_breakdown?: Json | null
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          farm_id?: string
          gross_revenue?: number
          harvest_date?: string | null
          id?: string
          net_revenue?: number | null
          notes?: string | null
          parcel_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          period_end?: string
          period_start?: string
          total_charges?: number | null
          worker_id?: string
          worker_percentage?: number
          worker_share_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "metayage_settlements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metayage_settlements_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metayage_settlements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_stock_balances: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          journal_entry_id: string | null
          notes: string | null
          opening_date: string
          organization_id: string
          posted_at: string | null
          posted_by: string | null
          quantity: number
          serial_numbers: string[] | null
          status: string | null
          total_value: number | null
          updated_at: string | null
          valuation_rate: number
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          journal_entry_id?: string | null
          notes?: string | null
          opening_date: string
          organization_id: string
          posted_at?: string | null
          posted_by?: string | null
          quantity: number
          serial_numbers?: string[] | null
          status?: string | null
          total_value?: number | null
          updated_at?: string | null
          valuation_rate: number
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          journal_entry_id?: string | null
          notes?: string | null
          opening_date?: string
          organization_id?: string
          posted_at?: string | null
          posted_by?: string | null
          quantity?: number
          serial_numbers?: string[] | null
          status?: string | null
          total_value?: number | null
          updated_at?: string | null
          valuation_rate?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_stock_balances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_stock_balances_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_stock_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_stock_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accounting_standard: string | null
          address: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          currency_code: string | null
          description: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          postal_code: string | null
          slug: string | null
          state: string | null
          tax_id: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accounting_standard?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accounting_standard?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          currency_code?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          postal_code?: string | null
          slug?: string | null
          state?: string | null
          tax_id?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      parcel_reports: {
        Row: {
          created_at: string | null
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          parcel_id: string
          status: string | null
          template_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          parcel_id: string
          status?: string | null
          template_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          parcel_id?: string
          status?: string | null
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcel_reports_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          area: number | null
          area_unit: string | null
          boundary: Json | null
          calculated_area: number | null
          created_at: string | null
          crop_category: string | null
          crop_type: string | null
          density_per_hectare: number | null
          description: string | null
          expected_harvest_date: string | null
          farm_id: string | null
          id: string
          irrigation_type: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          perimeter: number | null
          plant_count: number | null
          planting_date: string | null
          planting_density: number | null
          planting_system: string | null
          planting_type: string | null
          planting_year: number | null
          rootstock: string | null
          soil_type: string | null
          spacing: string | null
          tree_count: number | null
          tree_type: string | null
          updated_at: string | null
          variety: string | null
        }
        Insert: {
          area?: number | null
          area_unit?: string | null
          boundary?: Json | null
          calculated_area?: number | null
          created_at?: string | null
          crop_category?: string | null
          crop_type?: string | null
          density_per_hectare?: number | null
          description?: string | null
          expected_harvest_date?: string | null
          farm_id?: string | null
          id?: string
          irrigation_type?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          perimeter?: number | null
          plant_count?: number | null
          planting_date?: string | null
          planting_density?: number | null
          planting_system?: string | null
          planting_type?: string | null
          planting_year?: number | null
          rootstock?: string | null
          soil_type?: string | null
          spacing?: string | null
          tree_count?: number | null
          tree_type?: string | null
          updated_at?: string | null
          variety?: string | null
        }
        Update: {
          area?: number | null
          area_unit?: string | null
          boundary?: Json | null
          calculated_area?: number | null
          created_at?: string | null
          crop_category?: string | null
          crop_type?: string | null
          density_per_hectare?: number | null
          description?: string | null
          expected_harvest_date?: string | null
          farm_id?: string | null
          id?: string
          irrigation_type?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          perimeter?: number | null
          plant_count?: number | null
          planting_date?: string | null
          planting_density?: number | null
          planting_system?: string | null
          planting_type?: string | null
          planting_year?: number | null
          rootstock?: string | null
          soil_type?: string | null
          spacing?: string | null
          tree_count?: number | null
          tree_type?: string | null
          updated_at?: string | null
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcels_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_advances: {
        Row: {
          amount: number
          approved_by: string | null
          approved_date: string | null
          created_at: string | null
          deduction_plan: Json | null
          farm_id: string | null
          id: string
          notes: string | null
          organization_id: string
          paid_by: string | null
          paid_date: string | null
          payment_method: string | null
          reason: string | null
          remaining_balance: number | null
          requested_date: string
          status: string | null
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string | null
          deduction_plan?: Json | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reason?: string | null
          remaining_balance?: number | null
          requested_date?: string
          status?: string | null
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          approved_date?: string | null
          created_at?: string | null
          deduction_plan?: Json | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reason?: string | null
          remaining_balance?: number | null
          requested_date?: string
          status?: string | null
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_advances_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_advances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_advances_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string | null
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "accounting_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_bonuses: {
        Row: {
          amount: number
          bonus_type: string
          created_at: string | null
          description: string | null
          id: string
          payment_record_id: string
        }
        Insert: {
          amount: number
          bonus_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_record_id: string
        }
        Update: {
          amount?: number
          bonus_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          payment_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_bonuses_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_deductions: {
        Row: {
          amount: number
          created_at: string | null
          deduction_type: string
          description: string | null
          id: string
          payment_record_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          deduction_type: string
          description?: string | null
          id?: string
          payment_record_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          deduction_type?: string
          description?: string | null
          id?: string
          payment_record_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_deductions_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          advance_deduction: number | null
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          base_amount: number | null
          bonuses: number | null
          calculated_at: string | null
          calculated_by: string | null
          created_at: string | null
          days_worked: number | null
          deductions: number | null
          farm_id: string
          gross_revenue: number | null
          harvest_amount: number | null
          hours_worked: number | null
          id: string
          metayage_percentage: number | null
          net_amount: number | null
          notes: string | null
          organization_id: string
          overtime_amount: number | null
          paid_at: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string
          period_end: string
          period_start: string
          status: string | null
          tasks_completed: number | null
          tasks_completed_ids: string[] | null
          total_charges: number | null
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          advance_deduction?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          base_amount?: number | null
          bonuses?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string | null
          days_worked?: number | null
          deductions?: number | null
          farm_id: string
          gross_revenue?: number | null
          harvest_amount?: number | null
          hours_worked?: number | null
          id?: string
          metayage_percentage?: number | null
          net_amount?: number | null
          notes?: string | null
          organization_id: string
          overtime_amount?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type: string
          period_end: string
          period_start: string
          status?: string | null
          tasks_completed?: number | null
          tasks_completed_ids?: string[] | null
          total_charges?: number | null
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          advance_deduction?: number | null
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          base_amount?: number | null
          bonuses?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string | null
          days_worked?: number | null
          deductions?: number | null
          farm_id?: string
          gross_revenue?: number | null
          harvest_amount?: number | null
          hours_worked?: number | null
          id?: string
          metayage_percentage?: number | null
          net_amount?: number | null
          notes?: string | null
          organization_id?: string
          overtime_amount?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_type?: string
          period_end?: string
          period_start?: string
          status?: string | null
          tasks_completed?: number | null
          tasks_completed_ids?: string[] | null
          total_charges?: number | null
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_value: number | null
          alert_type: string
          created_at: string | null
          farm_id: string | null
          forecast_id: string | null
          harvest_id: string | null
          id: string
          message: string
          metric_name: string | null
          organization_id: string
          parcel_id: string | null
          recommended_actions: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string | null
          target_value: number | null
          title: string
          updated_at: string | null
          variance_percent: number | null
          yield_history_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type: string
          created_at?: string | null
          farm_id?: string | null
          forecast_id?: string | null
          harvest_id?: string | null
          id?: string
          message: string
          metric_name?: string | null
          organization_id: string
          parcel_id?: string | null
          recommended_actions?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          status?: string | null
          target_value?: number | null
          title: string
          updated_at?: string | null
          variance_percent?: number | null
          yield_history_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number | null
          alert_type?: string
          created_at?: string | null
          farm_id?: string | null
          forecast_id?: string | null
          harvest_id?: string | null
          id?: string
          message?: string
          metric_name?: string | null
          organization_id?: string
          parcel_id?: string | null
          recommended_actions?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string | null
          variance_percent?: number | null
          yield_history_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_alerts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_forecast_id_fkey"
            columns: ["forecast_id"]
            isOneToOne: false
            referencedRelation: "harvest_forecasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvest_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_groups: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          permissions: string[]
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          permissions: string[]
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          permissions?: string[]
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      plantation_types: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          spacing: string
          trees_per_ha: number
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          spacing: string
          trees_per_ha: number
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          spacing?: string
          trees_per_ha?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantation_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profitability_snapshots: {
        Row: {
          cost_breakdown: Json | null
          created_at: string | null
          currency: string | null
          farm_id: string | null
          id: string
          net_profit: number | null
          organization_id: string
          parcel_id: string | null
          period_end: string
          period_start: string
          profit_margin: number | null
          revenue_breakdown: Json | null
          total_costs: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          cost_breakdown?: Json | null
          created_at?: string | null
          currency?: string | null
          farm_id?: string | null
          id?: string
          net_profit?: number | null
          organization_id: string
          parcel_id?: string | null
          period_end: string
          period_start: string
          profit_margin?: number | null
          revenue_breakdown?: Json | null
          total_costs?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          cost_breakdown?: Json | null
          created_at?: string | null
          currency?: string | null
          farm_id?: string | null
          id?: string
          net_profit?: number | null
          organization_id?: string
          parcel_id?: string | null
          period_end?: string
          period_start?: string
          profit_margin?: number | null
          revenue_breakdown?: Json | null
          total_costs?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profitability_snapshots_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profitability_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profitability_snapshots_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          account_id: string | null
          amount: number
          billed_quantity: number | null
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          inventory_item_id: string | null
          item_name: string
          line_number: number
          line_total: number
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          tax_amount: number | null
          tax_id: string | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          amount: number
          billed_quantity?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          inventory_item_id?: string | null
          item_name: string
          line_number: number
          line_total: number
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          billed_quantity?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          line_number?: number
          line_total?: number
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          organization_id: string
          status: string | null
          stock_entry_id: string | null
          stock_received: boolean | null
          stock_received_date: string | null
          subtotal: number | null
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string | null
          tax_amount: number | null
          terms_and_conditions: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date: string
          order_number: string
          organization_id: string
          status?: string | null
          stock_entry_id?: string | null
          stock_received?: boolean | null
          stock_received_date?: string | null
          subtotal?: number | null
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          organization_id?: string
          status?: string | null
          stock_entry_id?: string | null
          stock_received?: boolean | null
          stock_received_date?: string | null
          subtotal?: number | null
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          item_id: string | null
          item_name: string
          line_number: number
          line_total: number
          quantity: number
          quote_id: string
          tax_amount: number | null
          tax_id: string | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          item_id?: string | null
          item_name: string
          line_number: number
          line_total: number
          quantity: number
          quote_id: string
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          item_id?: string | null
          item_name?: string
          line_number?: number
          line_total?: number
          quantity?: number
          quote_id?: string
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          converted_at: string | null
          converted_by: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          customer_name: string
          delivery_terms: string | null
          discount_amount: number | null
          exchange_rate: number | null
          farm_id: string | null
          grand_total: number
          id: string
          notes: string | null
          organization_id: string
          parcel_id: string | null
          payment_terms: string | null
          quote_date: string
          quote_number: string
          reference_number: string | null
          sales_order_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          subtotal: number
          tax_total: number
          terms_and_conditions: string | null
          updated_at: string | null
          valid_until: string
        }
        Insert: {
          accepted_at?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          customer_name: string
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          notes?: string | null
          organization_id: string
          parcel_id?: string | null
          payment_terms?: string | null
          quote_date: string
          quote_number: string
          reference_number?: string | null
          sales_order_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number
          tax_total?: number
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_until: string
        }
        Update: {
          accepted_at?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          customer_name?: string
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          notes?: string | null
          organization_id?: string
          parcel_id?: string | null
          payment_terms?: string | null
          quote_date?: string
          quote_number?: string
          reference_number?: string | null
          sales_order_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal?: number
          tax_total?: number
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      reception_batches: {
        Row: {
          batch_code: string
          created_at: string | null
          created_by: string | null
          crop_id: string | null
          culture_type: string | null
          decision: string | null
          destination_warehouse_id: string | null
          documents: Json | null
          harvest_id: string | null
          humidity_percentage: number | null
          id: string
          lot_code: string | null
          maturity_level: string | null
          moisture_content: number | null
          notes: string | null
          organization_id: string
          parcel_id: string
          photos: Json | null
          quality_checked_by: string | null
          quality_grade: string | null
          quality_notes: string | null
          quality_score: number | null
          quantity: number | null
          quantity_unit: string | null
          received_by: string | null
          reception_date: string
          reception_time: string | null
          sales_order_id: string | null
          status: string | null
          stock_entry_id: string | null
          temperature: number | null
          transformation_order_id: string | null
          updated_at: string | null
          updated_by: string | null
          warehouse_id: string
          weight: number
          weight_unit: string | null
        }
        Insert: {
          batch_code: string
          created_at?: string | null
          created_by?: string | null
          crop_id?: string | null
          culture_type?: string | null
          decision?: string | null
          destination_warehouse_id?: string | null
          documents?: Json | null
          harvest_id?: string | null
          humidity_percentage?: number | null
          id?: string
          lot_code?: string | null
          maturity_level?: string | null
          moisture_content?: number | null
          notes?: string | null
          organization_id: string
          parcel_id: string
          photos?: Json | null
          quality_checked_by?: string | null
          quality_grade?: string | null
          quality_notes?: string | null
          quality_score?: number | null
          quantity?: number | null
          quantity_unit?: string | null
          received_by?: string | null
          reception_date: string
          reception_time?: string | null
          sales_order_id?: string | null
          status?: string | null
          stock_entry_id?: string | null
          temperature?: number | null
          transformation_order_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id: string
          weight: number
          weight_unit?: string | null
        }
        Update: {
          batch_code?: string
          created_at?: string | null
          created_by?: string | null
          crop_id?: string | null
          culture_type?: string | null
          decision?: string | null
          destination_warehouse_id?: string | null
          documents?: Json | null
          harvest_id?: string | null
          humidity_percentage?: number | null
          id?: string
          lot_code?: string | null
          maturity_level?: string | null
          moisture_content?: number | null
          notes?: string | null
          organization_id?: string
          parcel_id?: string
          photos?: Json | null
          quality_checked_by?: string | null
          quality_grade?: string | null
          quality_notes?: string | null
          quality_score?: number | null
          quantity?: number | null
          quantity_unit?: string | null
          received_by?: string | null
          reception_date?: string
          reception_time?: string | null
          sales_order_id?: string | null
          status?: string | null
          stock_entry_id?: string | null
          temperature?: number | null
          transformation_order_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          warehouse_id?: string
          weight?: number
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reception_batches_crop"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_destination_warehouse_id_fkey"
            columns: ["destination_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvest_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_quality_checked_by_fkey"
            columns: ["quality_checked_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      revenues: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          crop_type: string | null
          currency: string | null
          date: string
          description: string | null
          farm_id: string | null
          id: string
          notes: string | null
          organization_id: string
          parcel_id: string | null
          price_per_unit: number | null
          quantity: number | null
          revenue_type: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          crop_type?: string | null
          currency?: string | null
          date: string
          description?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          parcel_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          revenue_type: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          crop_type?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          parcel_id?: string | null
          price_per_unit?: number | null
          quantity?: number | null
          revenue_type?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revenues_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments_audit: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          effective_date: string | null
          id: string
          new_role_id: string
          old_role_id: string | null
          organization_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          new_role_id: string
          old_role_id?: string | null
          organization_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          new_role_id?: string
          old_role_id?: string | null
          organization_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_audit_new_role_id_fkey"
            columns: ["new_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_audit_old_role_id_fkey"
            columns: ["old_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_system_template: boolean | null
          name: string
          organization_id: string | null
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_template?: boolean | null
          name: string
          organization_id?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_template?: boolean | null
          name?: string
          organization_id?: string | null
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          level: number
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_order_items: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string | null
          delivered_quantity: number | null
          description: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          invoiced_quantity: number | null
          item_name: string
          line_number: number
          line_total: number
          quantity: number
          quote_item_id: string | null
          sales_order_id: string
          tax_amount: number | null
          tax_id: string | null
          tax_rate: number | null
          unit_of_measure: string | null
          unit_price: number
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string | null
          delivered_quantity?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoiced_quantity?: number | null
          item_name: string
          line_number: number
          line_total: number
          quantity: number
          quote_item_id?: string | null
          sales_order_id: string
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price: number
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string | null
          delivered_quantity?: number | null
          description?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          invoiced_quantity?: number | null
          item_name?: string
          line_number?: number
          line_total?: number
          quantity?: number
          quote_item_id?: string | null
          sales_order_id?: string
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_of_measure?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_contact: string | null
          customer_id: string | null
          customer_name: string
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          organization_id: string
          shipping_address: string | null
          status: string | null
          stock_entry_id: string | null
          stock_issued: boolean | null
          stock_issued_date: string | null
          subtotal: number | null
          tax_amount: number | null
          terms_and_conditions: string | null
          total_amount: number | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_id?: string | null
          customer_name: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date: string
          order_number: string
          organization_id: string
          shipping_address?: string | null
          status?: string | null
          stock_entry_id?: string | null
          stock_issued?: boolean | null
          stock_issued_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_contact?: string | null
          customer_id?: string | null
          customer_name?: string
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          organization_id?: string
          shipping_address?: string | null
          status?: string | null
          stock_entry_id?: string | null
          stock_issued?: boolean | null
          stock_issued_date?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          terms_and_conditions?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_aois: {
        Row: {
          area_hectares: number | null
          created_at: string | null
          description: string | null
          farm_id: string | null
          geometry_json: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          parcel_id: string | null
          updated_at: string | null
        }
        Insert: {
          area_hectares?: number | null
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          geometry_json?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          parcel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          area_hectares?: number | null
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          geometry_json?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parcel_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satellite_aois_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_aois_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_aois_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_files: {
        Row: {
          created_at: string | null
          date: string
          file_path: string
          file_size: number
          filename: string
          id: string
          index: string
          organization_id: string
          parcel_id: string | null
          public_url: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          file_path: string
          file_size: number
          filename: string
          id?: string
          index: string
          organization_id: string
          parcel_id?: string | null
          public_url: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          file_path?: string
          file_size?: number
          filename?: string
          id?: string
          index?: string
          organization_id?: string
          parcel_id?: string | null
          public_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satellite_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_files_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_indices_data: {
        Row: {
          cloud_coverage_percentage: number | null
          created_at: string | null
          date: string
          farm_id: string | null
          geotiff_expires_at: string | null
          geotiff_url: string | null
          id: string
          image_source: string | null
          index_name: string
          max_value: number | null
          mean_value: number | null
          median_value: number | null
          metadata: Json | null
          min_value: number | null
          organization_id: string
          parcel_id: string
          percentile_25: number | null
          percentile_75: number | null
          percentile_90: number | null
          pixel_count: number | null
          processing_job_id: string | null
          std_value: number | null
          updated_at: string | null
        }
        Insert: {
          cloud_coverage_percentage?: number | null
          created_at?: string | null
          date: string
          farm_id?: string | null
          geotiff_expires_at?: string | null
          geotiff_url?: string | null
          id?: string
          image_source?: string | null
          index_name: string
          max_value?: number | null
          mean_value?: number | null
          median_value?: number | null
          metadata?: Json | null
          min_value?: number | null
          organization_id: string
          parcel_id: string
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          pixel_count?: number | null
          processing_job_id?: string | null
          std_value?: number | null
          updated_at?: string | null
        }
        Update: {
          cloud_coverage_percentage?: number | null
          created_at?: string | null
          date?: string
          farm_id?: string | null
          geotiff_expires_at?: string | null
          geotiff_url?: string | null
          id?: string
          image_source?: string | null
          index_name?: string
          max_value?: number | null
          mean_value?: number | null
          median_value?: number | null
          metadata?: Json | null
          min_value?: number | null
          organization_id?: string
          parcel_id?: string
          percentile_25?: number | null
          percentile_75?: number | null
          percentile_90?: number | null
          pixel_count?: number | null
          processing_job_id?: string | null
          std_value?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satellite_indices_data_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_indices_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_indices_data_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_processing_jobs: {
        Row: {
          cloud_coverage_threshold: number | null
          completed_at: string | null
          completed_tasks: number | null
          created_at: string | null
          date_range_end: string
          date_range_start: string
          error_message: string | null
          failed_tasks: number | null
          farm_id: string | null
          id: string
          indices: string[]
          job_type: string | null
          organization_id: string
          parcel_id: string | null
          progress_percentage: number | null
          results_summary: Json | null
          scale: number | null
          started_at: string | null
          status: string | null
          total_tasks: number | null
          updated_at: string | null
        }
        Insert: {
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          completed_tasks?: number | null
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          error_message?: string | null
          failed_tasks?: number | null
          farm_id?: string | null
          id?: string
          indices: string[]
          job_type?: string | null
          organization_id: string
          parcel_id?: string | null
          progress_percentage?: number | null
          results_summary?: Json | null
          scale?: number | null
          started_at?: string | null
          status?: string | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Update: {
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          completed_tasks?: number | null
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          error_message?: string | null
          failed_tasks?: number | null
          farm_id?: string | null
          id?: string
          indices?: string[]
          job_type?: string | null
          organization_id?: string
          parcel_id?: string | null
          progress_percentage?: number | null
          results_summary?: Json | null
          scale?: number | null
          started_at?: string | null
          status?: string | null
          total_tasks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satellite_processing_jobs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_processing_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_processing_jobs_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_processing_tasks: {
        Row: {
          aoi_id: string | null
          attempts: number | null
          cloud_coverage_threshold: number | null
          completed_at: string | null
          created_at: string | null
          date_range_end: string
          date_range_start: string
          error_message: string | null
          farm_id: string | null
          id: string
          indices: string[]
          max_attempts: number | null
          organization_id: string
          parcel_id: string
          priority: number | null
          processing_job_id: string
          result_data: Json | null
          scale: number | null
          started_at: string | null
          status: string | null
          task_type: string | null
          updated_at: string | null
        }
        Insert: {
          aoi_id?: string | null
          attempts?: number | null
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          created_at?: string | null
          date_range_end: string
          date_range_start: string
          error_message?: string | null
          farm_id?: string | null
          id?: string
          indices: string[]
          max_attempts?: number | null
          organization_id: string
          parcel_id: string
          priority?: number | null
          processing_job_id: string
          result_data?: Json | null
          scale?: number | null
          started_at?: string | null
          status?: string | null
          task_type?: string | null
          updated_at?: string | null
        }
        Update: {
          aoi_id?: string | null
          attempts?: number | null
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          created_at?: string | null
          date_range_end?: string
          date_range_start?: string
          error_message?: string | null
          farm_id?: string | null
          id?: string
          indices?: string[]
          max_attempts?: number | null
          organization_id?: string
          parcel_id?: string
          priority?: number | null
          processing_job_id?: string
          result_data?: Json | null
          scale?: number | null
          started_at?: string | null
          status?: string | null
          task_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "satellite_processing_tasks_aoi_id_fkey"
            columns: ["aoi_id"]
            isOneToOne: false
            referencedRelation: "satellite_aois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_processing_tasks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_processing_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_processing_tasks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_processing_tasks_processing_job_id_fkey"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "satellite_processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      soil_analyses: {
        Row: {
          analysis_date: string | null
          biological: Json | null
          chemical: Json | null
          created_at: string | null
          id: string
          notes: string | null
          parcel_id: string | null
          physical: Json | null
          test_type_id: string | null
          updated_at: string | null
        }
        Insert: {
          analysis_date?: string | null
          biological?: Json | null
          chemical?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          parcel_id?: string | null
          physical?: Json | null
          test_type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          analysis_date?: string | null
          biological?: Json | null
          chemical?: Json | null
          created_at?: string | null
          id?: string
          notes?: string | null
          parcel_id?: string | null
          physical?: Json | null
          test_type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "soil_analyses_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stock_account_mappings: {
        Row: {
          created_at: string | null
          credit_account_id: string
          debit_account_id: string
          entry_type: string
          id: string
          item_category: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_account_id: string
          debit_account_id: string
          entry_type: string
          id?: string
          item_category?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_account_id?: string
          debit_account_id?: string
          entry_type?: string
          id?: string
          item_category?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_account_mappings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_account_mappings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_account_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_closing_entries: {
        Row: {
          closing_date: string
          created_at: string | null
          created_by: string | null
          fiscal_period: string | null
          fiscal_year: number
          id: string
          notes: string | null
          organization_id: string
          posted_at: string | null
          posted_by: string | null
          status: string | null
          total_quantity: number | null
          total_valuation: number | null
          updated_at: string | null
        }
        Insert: {
          closing_date: string
          created_at?: string | null
          created_by?: string | null
          fiscal_period?: string | null
          fiscal_year: number
          id?: string
          notes?: string | null
          organization_id: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          total_quantity?: number | null
          total_valuation?: number | null
          updated_at?: string | null
        }
        Update: {
          closing_date?: string
          created_at?: string | null
          created_by?: string | null
          fiscal_period?: string | null
          fiscal_year?: number
          id?: string
          notes?: string | null
          organization_id?: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          total_quantity?: number | null
          total_valuation?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_closing_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_closing_items: {
        Row: {
          batch_number: string | null
          closing_id: string
          closing_quantity: number
          closing_rate: number
          closing_value: number | null
          created_at: string | null
          id: string
          item_id: string
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          closing_id: string
          closing_quantity: number
          closing_rate: number
          closing_value?: number | null
          created_at?: string | null
          id?: string
          item_id: string
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          closing_id?: string
          closing_quantity?: number
          closing_rate?: number
          closing_value?: number | null
          created_at?: string | null
          id?: string
          item_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_closing_items_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "stock_closing_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_closing_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_closing_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          entry_date: string | null
          entry_number: string
          entry_type: string
          from_warehouse_id: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          organization_id: string
          posted_at: string | null
          posted_by: string | null
          purpose: string | null
          reception_batch_id: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          status: string | null
          to_warehouse_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entry_date?: string | null
          entry_number: string
          entry_type: string
          from_warehouse_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          organization_id: string
          posted_at?: string | null
          posted_by?: string | null
          purpose?: string | null
          reception_batch_id?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          status?: string | null
          to_warehouse_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entry_date?: string | null
          entry_number?: string
          entry_type?: string
          from_warehouse_id?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          organization_id?: string
          posted_at?: string | null
          posted_by?: string | null
          purpose?: string | null
          reception_batch_id?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          status?: string | null
          to_warehouse_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_entries_reception_batch"
            columns: ["reception_batch_id"]
            isOneToOne: false
            referencedRelation: "reception_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entry_items: {
        Row: {
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          item_id: string
          item_name: string
          line_number: number | null
          notes: string | null
          physical_quantity: number | null
          quantity: number
          serial_number: string | null
          source_warehouse_id: string | null
          stock_entry_id: string
          system_quantity: number | null
          target_warehouse_id: string | null
          total_cost: number | null
          unit: string
          variance: number | null
        }
        Insert: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id: string
          item_name: string
          line_number?: number | null
          notes?: string | null
          physical_quantity?: number | null
          quantity: number
          serial_number?: string | null
          source_warehouse_id?: string | null
          stock_entry_id: string
          system_quantity?: number | null
          target_warehouse_id?: string | null
          total_cost?: number | null
          unit: string
          variance?: number | null
        }
        Update: {
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string
          item_name?: string
          line_number?: number | null
          notes?: string | null
          physical_quantity?: number | null
          quantity?: number
          serial_number?: string | null
          source_warehouse_id?: string | null
          stock_entry_id?: string
          system_quantity?: number | null
          target_warehouse_id?: string | null
          total_cost?: number | null
          unit?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_entry_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_source_warehouse_id_fkey"
            columns: ["source_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entry_items_target_warehouse_id_fkey"
            columns: ["target_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          balance_quantity: number
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string | null
          created_by: string | null
          id: string
          item_id: string
          movement_date: string | null
          movement_type: string
          organization_id: string
          quantity: number
          serial_number: string | null
          stock_entry_id: string | null
          stock_entry_item_id: string | null
          total_cost: number | null
          unit: string
          warehouse_id: string
        }
        Insert: {
          balance_quantity: number
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id: string
          movement_date?: string | null
          movement_type: string
          organization_id: string
          quantity: number
          serial_number?: string | null
          stock_entry_id?: string | null
          stock_entry_item_id?: string | null
          total_cost?: number | null
          unit: string
          warehouse_id: string
        }
        Update: {
          balance_quantity?: number
          batch_number?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_id?: string
          movement_date?: string | null
          movement_type?: string
          organization_id?: string
          quantity?: number
          serial_number?: string | null
          stock_entry_id?: string | null
          stock_entry_item_id?: string | null
          total_cost?: number | null
          unit?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_entry_item_id_fkey"
            columns: ["stock_entry_item_id"]
            isOneToOne: false
            referencedRelation: "stock_entry_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_valuation: {
        Row: {
          batch_number: string | null
          cost_per_unit: number
          created_at: string | null
          id: string
          item_id: string
          organization_id: string
          quantity: number
          remaining_quantity: number | null
          serial_number: string | null
          stock_entry_id: string | null
          total_cost: number | null
          valuation_date: string | null
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          cost_per_unit: number
          created_at?: string | null
          id?: string
          item_id: string
          organization_id: string
          quantity: number
          remaining_quantity?: number | null
          serial_number?: string | null
          stock_entry_id?: string | null
          total_cost?: number | null
          valuation_date?: string | null
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          item_id?: string
          organization_id?: string
          quantity?: number
          remaining_quantity?: number | null
          serial_number?: string | null
          stock_entry_id?: string | null
          total_cost?: number | null
          valuation_date?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_valuation_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_valuation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_valuation_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_valuation_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      structures: {
        Row: {
          condition: string | null
          created_at: string | null
          farm_id: string | null
          id: string
          installation_date: string
          is_active: boolean | null
          location: Json | null
          name: string
          notes: string | null
          organization_id: string
          structure_details: Json | null
          type: string
          updated_at: string | null
          usage: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          farm_id?: string | null
          id?: string
          installation_date: string
          is_active?: boolean | null
          location?: Json | null
          name: string
          notes?: string | null
          organization_id: string
          structure_details?: Json | null
          type: string
          updated_at?: string | null
          usage?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          farm_id?: string | null
          id?: string
          installation_date?: string
          is_active?: boolean | null
          location?: Json | null
          name?: string
          notes?: string | null
          organization_id?: string
          structure_details?: Json | null
          type?: string
          updated_at?: string | null
          usage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "structures_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_usage: {
        Row: {
          created_at: string | null
          farms_count: number | null
          id: string
          organization_id: string
          parcels_count: number | null
          period_end: string
          period_start: string
          satellite_reports_count: number | null
          subscription_id: string
          updated_at: string | null
          users_count: number | null
        }
        Insert: {
          created_at?: string | null
          farms_count?: number | null
          id?: string
          organization_id: string
          parcels_count?: number | null
          period_end: string
          period_start: string
          satellite_reports_count?: number | null
          subscription_id: string
          updated_at?: string | null
          users_count?: number | null
        }
        Update: {
          created_at?: string | null
          farms_count?: number | null
          id?: string
          organization_id?: string
          parcels_count?: number | null
          period_end?: string
          period_start?: string
          satellite_reports_count?: number | null
          subscription_id?: string
          updated_at?: string | null
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string | null
          default_duration: number | null
          default_skills: string[] | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_duration?: number | null
          default_skills?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_duration?: number | null
          default_skills?: string[] | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          attachments: Json | null
          comment: string
          created_at: string | null
          id: string
          task_id: string
          type: string | null
          updated_at: string | null
          user_id: string
          worker_id: string | null
        }
        Insert: {
          attachments?: Json | null
          comment: string
          created_at?: string | null
          id?: string
          task_id: string
          type?: string | null
          updated_at?: string | null
          user_id: string
          worker_id?: string | null
        }
        Update: {
          attachments?: Json | null
          comment?: string
          created_at?: string | null
          id?: string
          task_id?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          depends_on_task_id: string
          id: string
          lag_days: number | null
          task_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_task_id: string
          id?: string
          lag_days?: number | null
          task_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_task_id?: string
          id?: string
          lag_days?: number | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_equipment: {
        Row: {
          condition_after: string | null
          condition_before: string | null
          created_at: string | null
          end_time: string | null
          equipment_name: string
          fuel_used: number | null
          id: string
          notes: string | null
          quantity: number | null
          start_time: string | null
          task_id: string
          updated_at: string | null
        }
        Insert: {
          condition_after?: string | null
          condition_before?: string | null
          created_at?: string | null
          end_time?: string | null
          equipment_name: string
          fuel_used?: number | null
          id?: string
          notes?: string | null
          quantity?: number | null
          start_time?: string | null
          task_id: string
          updated_at?: string | null
        }
        Update: {
          condition_after?: string | null
          condition_before?: string | null
          created_at?: string | null
          end_time?: string | null
          equipment_name?: string
          fuel_used?: number | null
          id?: string
          notes?: string | null
          quantity?: number | null
          start_time?: string | null
          task_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_equipment_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          estimated_duration: number | null
          id: string
          is_recurring: boolean | null
          name: string
          recurrence_pattern: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_recurring?: boolean | null
          name: string
          recurrence_pattern?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          estimated_duration?: number | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          recurrence_pattern?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      task_time_logs: {
        Row: {
          break_duration: number | null
          created_at: string | null
          end_time: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          start_time: string
          task_id: string
          total_hours: number | null
          updated_at: string | null
          worker_id: string
        }
        Insert: {
          break_duration?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          start_time: string
          task_id: string
          total_hours?: number | null
          updated_at?: string | null
          worker_id: string
        }
        Update: {
          break_duration?: number | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          start_time?: string
          task_id?: string
          total_hours?: number | null
          updated_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_cost: number | null
          actual_duration: number | null
          actual_end: string | null
          actual_start: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          attachments: Json | null
          category_id: string | null
          checklist: Json | null
          completed_date: string | null
          completion_percentage: number | null
          cost_estimate: number | null
          created_at: string | null
          crop_id: string | null
          description: string | null
          due_date: string | null
          equipment_required: string[] | null
          estimated_duration: number | null
          farm_id: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          organization_id: string | null
          parcel_id: string | null
          parent_task_id: string | null
          priority: string | null
          quality_rating: number | null
          repeat_pattern: Json | null
          required_skills: string[] | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: string | null
          task_type: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          weather_dependency: boolean | null
          worker_id: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_duration?: number | null
          actual_end?: string | null
          actual_start?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category_id?: string | null
          checklist?: Json | null
          completed_date?: string | null
          completion_percentage?: number | null
          cost_estimate?: number | null
          created_at?: string | null
          crop_id?: string | null
          description?: string | null
          due_date?: string | null
          equipment_required?: string[] | null
          estimated_duration?: number | null
          farm_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          organization_id?: string | null
          parcel_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          quality_rating?: number | null
          repeat_pattern?: Json | null
          required_skills?: string[] | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          task_type?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
          weather_dependency?: boolean | null
          worker_id?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_duration?: number | null
          actual_end?: string | null
          actual_start?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          attachments?: Json | null
          category_id?: string | null
          checklist?: Json | null
          completed_date?: string | null
          completion_percentage?: number | null
          cost_estimate?: number | null
          created_at?: string | null
          crop_id?: string | null
          description?: string | null
          due_date?: string | null
          equipment_required?: string[] | null
          estimated_duration?: number | null
          farm_id?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          organization_id?: string | null
          parcel_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          quality_rating?: number | null
          repeat_pattern?: Json | null
          required_skills?: string[] | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: string | null
          task_type?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          weather_dependency?: boolean | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      taxes: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          rate: number
          tax_type: Database["public"]["Enums"]["tax_type"] | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          rate: number
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          rate?: number
          tax_type?: Database["public"]["Enums"]["tax_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      test_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parameters: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parameters?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parameters?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tree_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tree_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trees_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tree_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          language: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          password_set: boolean | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          password_set?: boolean | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          password_set?: boolean | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      utilities: {
        Row: {
          account_number: string | null
          amount: number
          billing_date: string
          consumption_unit: string | null
          consumption_value: number | null
          cost_per_parcel: number | null
          created_at: string | null
          due_date: string | null
          farm_id: string
          id: string
          invoice_url: string | null
          is_recurring: boolean | null
          notes: string | null
          parcel_id: string | null
          payment_status: string | null
          provider: string | null
          recurring_frequency: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          amount: number
          billing_date: string
          consumption_unit?: string | null
          consumption_value?: number | null
          cost_per_parcel?: number | null
          created_at?: string | null
          due_date?: string | null
          farm_id: string
          id?: string
          invoice_url?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          parcel_id?: string | null
          payment_status?: string | null
          provider?: string | null
          recurring_frequency?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number
          billing_date?: string
          consumption_unit?: string | null
          consumption_value?: number | null
          cost_per_parcel?: number | null
          created_at?: string | null
          due_date?: string | null
          farm_id?: string
          id?: string
          invoice_url?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          parcel_id?: string | null
          payment_status?: string | null
          provider?: string | null
          recurring_frequency?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utilities_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utilities_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capacity: number | null
          capacity_unit: string | null
          city: string | null
          created_at: string | null
          description: string | null
          farm_id: string | null
          has_quality_lab: boolean | null
          has_weighing_station: boolean | null
          humidity_controlled: boolean | null
          id: string
          is_active: boolean | null
          is_reception_center: boolean | null
          location: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          organization_id: string
          postal_code: string | null
          reception_type: string | null
          security_level: string | null
          temperature_controlled: boolean | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          capacity_unit?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          has_quality_lab?: boolean | null
          has_weighing_station?: boolean | null
          humidity_controlled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_reception_center?: boolean | null
          location?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          organization_id: string
          postal_code?: string | null
          reception_type?: string | null
          security_level?: string | null
          temperature_controlled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          capacity_unit?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          has_quality_lab?: boolean | null
          has_weighing_station?: boolean | null
          humidity_controlled?: boolean | null
          id?: string
          is_active?: boolean | null
          is_reception_center?: boolean | null
          location?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          organization_id?: string
          postal_code?: string | null
          reception_type?: string | null
          security_level?: string | null
          temperature_controlled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_records: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          farm_id: string
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string | null
          task_description: string
          total_payment: number | null
          updated_at: string | null
          work_date: string
          worker_id: string | null
          worker_type: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          farm_id: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          task_description: string
          total_payment?: number | null
          updated_at?: string | null
          work_date: string
          worker_id?: string | null
          worker_type: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          farm_id?: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string | null
          task_description?: string
          total_payment?: number | null
          updated_at?: string | null
          work_date?: string
          worker_id?: string | null
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_records_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      work_units: {
        Row: {
          allow_decimal: boolean | null
          base_unit: string | null
          code: string
          conversion_factor: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          name_fr: string | null
          organization_id: string
          unit_category: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          allow_decimal?: boolean | null
          base_unit?: string | null
          code: string
          conversion_factor?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          name_fr?: string | null
          organization_id: string
          unit_category: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          allow_decimal?: boolean | null
          base_unit?: string | null
          code?: string
          conversion_factor?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          name_fr?: string | null
          organization_id?: string
          unit_category?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          address: string | null
          bank_account: string | null
          calculation_basis:
            | Database["public"]["Enums"]["calculation_basis"]
            | null
          certifications: string[] | null
          cin: string | null
          cnss_number: string | null
          created_at: string | null
          created_by: string | null
          daily_rate: number | null
          date_of_birth: string | null
          documents: Json | null
          email: string | null
          end_date: string | null
          farm_id: string | null
          first_name: string
          hire_date: string
          id: string
          is_active: boolean | null
          is_cnss_declared: boolean | null
          last_name: string
          metayage_contract_details: Json | null
          metayage_percentage: number | null
          metayage_type: Database["public"]["Enums"]["metayage_type"] | null
          monthly_salary: number | null
          notes: string | null
          organization_id: string
          payment_frequency:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          payment_method: string | null
          phone: string | null
          position: string | null
          specialties: string[] | null
          total_days_worked: number | null
          total_tasks_completed: number | null
          updated_at: string | null
          user_id: string | null
          worker_type: Database["public"]["Enums"]["worker_type"]
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          calculation_basis?:
            | Database["public"]["Enums"]["calculation_basis"]
            | null
          certifications?: string[] | null
          cin?: string | null
          cnss_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          date_of_birth?: string | null
          documents?: Json | null
          email?: string | null
          end_date?: string | null
          farm_id?: string | null
          first_name: string
          hire_date?: string
          id?: string
          is_active?: boolean | null
          is_cnss_declared?: boolean | null
          last_name: string
          metayage_contract_details?: Json | null
          metayage_percentage?: number | null
          metayage_type?: Database["public"]["Enums"]["metayage_type"] | null
          monthly_salary?: number | null
          notes?: string | null
          organization_id: string
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          payment_method?: string | null
          phone?: string | null
          position?: string | null
          specialties?: string[] | null
          total_days_worked?: number | null
          total_tasks_completed?: number | null
          updated_at?: string | null
          user_id?: string | null
          worker_type?: Database["public"]["Enums"]["worker_type"]
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          calculation_basis?:
            | Database["public"]["Enums"]["calculation_basis"]
            | null
          certifications?: string[] | null
          cin?: string | null
          cnss_number?: string | null
          created_at?: string | null
          created_by?: string | null
          daily_rate?: number | null
          date_of_birth?: string | null
          documents?: Json | null
          email?: string | null
          end_date?: string | null
          farm_id?: string | null
          first_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean | null
          is_cnss_declared?: boolean | null
          last_name?: string
          metayage_contract_details?: Json | null
          metayage_percentage?: number | null
          metayage_type?: Database["public"]["Enums"]["metayage_type"] | null
          monthly_salary?: number | null
          notes?: string | null
          organization_id?: string
          payment_frequency?:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          payment_method?: string | null
          phone?: string | null
          position?: string | null
          specialties?: string[] | null
          total_days_worked?: number | null
          total_tasks_completed?: number | null
          updated_at?: string | null
          user_id?: string | null
          worker_type?: Database["public"]["Enums"]["worker_type"]
        }
        Relationships: [
          {
            foreignKeyName: "workers_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      dropgeometrytable:
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      generate_invoice_number: {
        Args: {
          p_invoice_type: Database["public"]["Enums"]["invoice_type"]
          p_organization_id: string
        }
        Returns: string
      }
      generate_item_code: {
        Args: {
          p_item_group_id: string
          p_organization_id: string
          p_prefix: string
        }
        Returns: string
      }
      generate_journal_entry_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      generate_purchase_order_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      generate_quote_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      generate_sales_order_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_account_id_by_code: {
        Args: { p_code: string; p_org_id: string }
        Returns: string
      }
      get_account_id_by_mapping: {
        Args: {
          p_mapping_key: string
          p_mapping_type: string
          p_org_id: string
        }
        Returns: string
      }
      get_farm_hierarchy_tree: {
        Args: { org_uuid: string; root_farm_id?: string }
        Returns: {
          farm_id: string
          farm_name: string
          farm_size: number
          farm_type: string
          hierarchy_level: number
          is_active: boolean
          manager_name: string
          parcel_count: number
          parent_farm_id: string
          subparcel_count: number
        }[]
      }
      get_parcel_performance_summary: {
        Args: {
          p_farm_id?: string
          p_from_date?: string
          p_organization_id: string
          p_parcel_id?: string
          p_to_date?: string
        }
        Returns: {
          avg_profit_margin: number
          avg_target_yield: number
          avg_variance_percent: number
          avg_yield_per_hectare: number
          crop_type: string
          farm_name: string
          last_harvest_date: string
          parcel_id: string
          parcel_name: string
          performance_rating: string
          total_cost: number
          total_harvests: number
          total_profit: number
          total_revenue: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      has_valid_subscription: { Args: { org_id: string }; Returns: boolean }
      is_organization_member: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { use_typmod?: boolean }; Returns: string }
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      seed_chart_of_accounts: {
        Args: {
          p_accounting_standard?: string
          p_country_code?: string
          p_org_id: string
        }
        Returns: {
          accounts_created: number
          message: string
          success: boolean
        }[]
      }
      seed_french_chart_of_accounts: {
        Args: { p_org_id: string }
        Returns: {
          accounts_created: number
          message: string
          success: boolean
        }[]
      }
      seed_moroccan_chart_of_accounts: {
        Args: { p_org_id: string }
        Returns: {
          accounts_created: number
          message: string
          success: boolean
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_askml:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geom: unknown }; Returns: number }
        | { Args: { geog: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      accounting_payment_method:
        | "cash"
        | "bank_transfer"
        | "check"
        | "card"
        | "mobile_money"
      accounting_payment_status:
        | "draft"
        | "submitted"
        | "reconciled"
        | "cancelled"
      accounting_payment_type: "receive" | "pay"
      analysis_type: "soil" | "plant" | "water"
      calculation_basis: "net_revenue" | "gross_revenue"
      invoice_status:
        | "draft"
        | "submitted"
        | "paid"
        | "partially_paid"
        | "overdue"
        | "cancelled"
      invoice_type: "sales" | "purchase"
      journal_entry_status: "draft" | "posted" | "cancelled"
      metayage_type: "khammass" | "rebaa" | "tholth" | "custom"
      payment_frequency: "monthly" | "daily" | "per_task" | "harvest_share"
      purchase_order_status:
        | "draft"
        | "submitted"
        | "confirmed"
        | "partially_received"
        | "received"
        | "partially_billed"
        | "billed"
        | "cancelled"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
        | "cancelled"
      sales_order_status:
        | "draft"
        | "confirmed"
        | "processing"
        | "partially_delivered"
        | "delivered"
        | "partially_invoiced"
        | "invoiced"
        | "cancelled"
      tax_type: "sales" | "purchase" | "both"
      worker_type: "fixed_salary" | "daily_worker" | "metayage"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      accounting_payment_method: [
        "cash",
        "bank_transfer",
        "check",
        "card",
        "mobile_money",
      ],
      accounting_payment_status: [
        "draft",
        "submitted",
        "reconciled",
        "cancelled",
      ],
      accounting_payment_type: ["receive", "pay"],
      analysis_type: ["soil", "plant", "water"],
      calculation_basis: ["net_revenue", "gross_revenue"],
      invoice_status: [
        "draft",
        "submitted",
        "paid",
        "partially_paid",
        "overdue",
        "cancelled",
      ],
      invoice_type: ["sales", "purchase"],
      journal_entry_status: ["draft", "posted", "cancelled"],
      metayage_type: ["khammass", "rebaa", "tholth", "custom"],
      payment_frequency: ["monthly", "daily", "per_task", "harvest_share"],
      purchase_order_status: [
        "draft",
        "submitted",
        "confirmed",
        "partially_received",
        "received",
        "partially_billed",
        "billed",
        "cancelled",
      ],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
        "cancelled",
      ],
      sales_order_status: [
        "draft",
        "confirmed",
        "processing",
        "partially_delivered",
        "delivered",
        "partially_invoiced",
        "invoiced",
        "cancelled",
      ],
      tax_type: ["sales", "purchase", "both"],
      worker_type: ["fixed_salary", "daily_worker", "metayage"],
    },
  },
} as const
