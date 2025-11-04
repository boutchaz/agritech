Initialising login role...
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
      accounting_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string
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
          currency_code?: string
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
          currency_code?: string
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
            foreignKeyName: "accounting_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "accounting_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            foreignKeyName: "accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
        ]
      }
      analyses: {
        Row: {
          analysis_date: string
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          created_at: string
          data: Json
          id: string
          laboratory: string | null
          notes: string | null
          parcel_id: string
          updated_at: string
        }
        Insert: {
          analysis_date: string
          analysis_type: Database["public"]["Enums"]["analysis_type"]
          created_at?: string
          data?: Json
          id?: string
          laboratory?: string | null
          notes?: string | null
          parcel_id: string
          updated_at?: string
        }
        Update: {
          analysis_date?: string
          analysis_type?: Database["public"]["Enums"]["analysis_type"]
          created_at?: string
          data?: Json
          id?: string
          laboratory?: string | null
          notes?: string | null
          parcel_id?: string
          updated_at?: string
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
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          priority: string | null
          recommendation_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: Json | null
          analysis_id: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recommendation_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: Json | null
          analysis_id?: string
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recommendation_type?: string | null
          title?: string
          updated_at?: string
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string
          current_balance: number | null
          gl_account_id: string
          iban: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          opening_balance: number | null
          organization_id: string
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          current_balance?: number | null
          gl_account_id: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          opening_balance?: number | null
          organization_id: string
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          current_balance?: number | null
          gl_account_id?: string
          iban?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          opening_balance?: number | null
          organization_id?: string
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bank_accounts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
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
          updated_at: string
        }
        Insert: {
          all_cloud_percentages?: number[] | null
          aoi_id?: string | null
          available_images_count?: number | null
          avg_cloud_coverage?: number | null
          check_date: string
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          all_cloud_percentages?: number[] | null
          aoi_id?: string | null
          available_images_count?: number | null
          avg_cloud_coverage?: number | null
          check_date?: string
          created_at?: string
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
          updated_at?: string
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
            foreignKeyName: "cloud_coverage_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          {
            foreignKeyName: "cost_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          farm_id: string | null
          id: string
          is_active: boolean | null
          is_group: boolean | null
          name: string
          organization_id: string
          parcel_id: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name: string
          organization_id: string
          parcel_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          is_active?: boolean | null
          is_group?: boolean | null
          name?: string
          organization_id?: string
          parcel_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "cost_centers_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
          currency: string
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
          currency?: string
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
          currency?: string
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
            foreignKeyName: "costs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          decimal_places: number | null
          is_active: boolean | null
          name: string
          symbol: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          decimal_places?: number | null
          is_active?: boolean | null
          name: string
          symbol?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          decimal_places?: number | null
          is_active?: boolean | null
          name?: string
          symbol?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "dashboard_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "dashboard_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
        Relationships: []
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
          total_amount: number
          total_quantity: number
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
          total_amount?: number
          total_quantity?: number
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
          total_amount?: number
          total_quantity?: number
          updated_at?: string | null
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
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
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            foreignKeyName: "delivery_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_harvest_record_id_fkey"
            columns: ["harvest_record_id"]
            isOneToOne: false
            referencedRelation: "harvest_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_items_harvest_record_id_fkey"
            columns: ["harvest_record_id"]
            isOneToOne: false
            referencedRelation: "harvest_summary"
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
          {
            foreignKeyName: "delivery_tracking_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
        Relationships: []
      }
      farm_management_roles: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          is_active: boolean
          role: string | null
          role_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          is_active?: boolean
          role?: string | null
          role_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          is_active?: boolean
          role?: string | null
          role_id?: string | null
          updated_at?: string
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
          {
            foreignKeyName: "farm_management_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "farms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
        Relationships: []
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
          workers: Json
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
          workers?: Json
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
          workers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "harvest_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "harvest_records_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "task_summary"
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
            foreignKeyName: "harvest_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "harvest_records_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_reception_batch_id_fkey"
            columns: ["reception_batch_id"]
            isOneToOne: false
            referencedRelation: "reception_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
          unit: string
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
          unit?: string
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
          unit?: string
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
          created_at: string
          current_quantity: number
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
          updated_at: string
        }
        Insert: {
          batch_number: string
          cost_per_unit?: number | null
          created_at?: string
          current_quantity?: number
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
          updated_at?: string
        }
        Update: {
          batch_number?: string
          cost_per_unit?: number | null
          created_at?: string
          current_quantity?: number
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
          updated_at?: string
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
            foreignKeyName: "inventory_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
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
          quantity: number
          shelf_life_days: number | null
          supplier: string | null
          unit: string
          updated_at: string
          valuation_method: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
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
          quantity?: number
          shelf_life_days?: number | null
          supplier?: string | null
          unit: string
          updated_at?: string
          valuation_method?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
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
          quantity?: number
          shelf_life_days?: number | null
          supplier?: string | null
          unit?: string
          updated_at?: string
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
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      inventory_serial_numbers: {
        Row: {
          cost_per_unit: number | null
          created_at: string
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
          updated_at: string
          warehouse_id: string | null
          warranty_expiry_date: string | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
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
          updated_at?: string
          warehouse_id?: string | null
          warranty_expiry_date?: string | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
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
          updated_at?: string
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
            foreignKeyName: "inventory_serial_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          amount: number
          created_at: string | null
          description: string | null
          expense_account_id: string | null
          id: string
          income_account_id: string | null
          invoice_id: string
          item_code: string | null
          item_name: string
          quantity: number
          tax_amount: number | null
          tax_id: string | null
          tax_rate: number | null
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          expense_account_id?: string | null
          id?: string
          income_account_id?: string | null
          invoice_id: string
          item_code?: string | null
          item_name: string
          quantity: number
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          expense_account_id?: string | null
          id?: string
          income_account_id?: string | null
          invoice_id?: string
          item_code?: string | null
          item_name?: string
          quantity?: number
          tax_amount?: number | null
          tax_id?: string | null
          tax_rate?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_expense_account_id_fkey"
            columns: ["expense_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "invoice_items_income_account_id_fkey"
            columns: ["income_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_income_account_id_fkey"
            columns: ["income_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vw_invoice_aging"
            referencedColumns: ["invoice_id"]
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
          attachment_url: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string
          due_date: string
          exchange_rate: number | null
          farm_id: string | null
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          journal_entry_id: string | null
          organization_id: string
          outstanding_amount: number
          parcel_id: string | null
          party_id: string | null
          party_name: string
          party_type: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at: string | null
          submitted_by: string | null
          subtotal: number
          tax_total: number
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          due_date: string
          exchange_rate?: number | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          invoice_date: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          journal_entry_id?: string | null
          organization_id: string
          outstanding_amount?: number
          parcel_id?: string | null
          party_id?: string | null
          party_name: string
          party_type?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal?: number
          tax_total?: number
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          due_date?: string
          exchange_rate?: number | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          journal_entry_id?: string | null
          organization_id?: string
          outstanding_amount?: number
          parcel_id?: string | null
          party_id?: string | null
          party_name?: string
          party_type?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal?: number
          tax_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "invoices_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
          posting_date: string
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["journal_entry_status"] | null
          total_credit: number
          total_debit: number
          updated_at: string | null
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
          posting_date: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["journal_entry_status"] | null
          total_credit?: number
          total_debit?: number
          updated_at?: string | null
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
          posting_date?: string
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["journal_entry_status"] | null
          total_credit?: number
          total_debit?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "journal_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
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
          count: number
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
          count?: number
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
          count?: number
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
        Relationships: []
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
            foreignKeyName: "metayage_settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metayage_settlements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "metayage_settlements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
          created_at: string
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
          updated_at: string
          valuation_rate: number
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
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
          updated_at?: string
          valuation_rate: number
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
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
          updated_at?: string
          valuation_rate?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_stock_balances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "opening_stock_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "opening_stock_balances_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
          invited_by: string | null
          is_active: boolean | null
          organization_id: string | null
          role: string | null
          role_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          organization_id?: string | null
          role?: string | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean | null
          organization_id?: string | null
          role?: string | null
          role_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          currency_symbol: string | null
          description: string | null
          email: string | null
          id: string
          language: string | null
          logo_url: string | null
          name: string
          onboarding_completed: boolean | null
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          slug: string
          state: string | null
          status: string | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          description?: string | null
          email?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          slug: string
          state?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          currency_symbol?: string | null
          description?: string | null
          email?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          slug?: string
          state?: string | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
        ]
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
          status: string
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
          status?: string
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
          status?: string
          template_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcel_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
          farm_id: string | null
          id: string
          irrigation_type: string | null
          name: string
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
          farm_id?: string | null
          id?: string
          irrigation_type?: string | null
          name: string
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
          farm_id?: string | null
          id?: string
          irrigation_type?: string | null
          name?: string
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
        Relationships: []
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
            foreignKeyName: "payment_advances_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "payment_advances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_advances_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_advances_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_advances_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "payment_advances_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vw_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
          {
            foreignKeyName: "payment_bonuses_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
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
          {
            foreignKeyName: "payment_deductions_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
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
          base_amount: number
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
          base_amount?: number
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
          base_amount?: number
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
            foreignKeyName: "payment_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_records_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "payment_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_records_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
      payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string
          exchange_rate: number | null
          id: string
          journal_entry_id: string | null
          organization_id: string
          party_id: string | null
          party_name: string
          party_type: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          reference_number: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          organization_id: string
          party_id?: string | null
          party_name: string
          party_type?: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          reference_number?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          organization_id?: string
          party_id?: string | null
          party_name?: string
          party_type?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
          reference_number?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
          id: string
          organization_id: string
          spacing: string
          trees_per_ha: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          spacing: string
          trees_per_ha: number
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          spacing?: string
          trees_per_ha?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantation_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantation_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          currency: string
          farm_id: string | null
          id: string
          net_profit: number
          organization_id: string
          parcel_id: string | null
          period_end: string
          period_start: string
          profit_margin: number | null
          revenue_breakdown: Json | null
          total_costs: number
          total_revenue: number
          updated_at: string | null
        }
        Insert: {
          cost_breakdown?: Json | null
          created_at?: string | null
          currency?: string
          farm_id?: string | null
          id?: string
          net_profit?: number
          organization_id: string
          parcel_id?: string | null
          period_end: string
          period_start: string
          profit_margin?: number | null
          revenue_breakdown?: Json | null
          total_costs?: number
          total_revenue?: number
          updated_at?: string | null
        }
        Update: {
          cost_breakdown?: Json | null
          created_at?: string | null
          currency?: string
          farm_id?: string | null
          id?: string
          net_profit?: number
          organization_id?: string
          parcel_id?: string | null
          period_end?: string
          period_start?: string
          profit_margin?: number | null
          revenue_breakdown?: Json | null
          total_costs?: number
          total_revenue?: number
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
            foreignKeyName: "profitability_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
          id: string
          item_description: string | null
          item_id: string | null
          item_name: string
          line_total: number | null
          purchase_order_id: string
          quantity: number
          quantity_received: number | null
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name: string
          line_total?: number | null
          purchase_order_id: string
          quantity: number
          quantity_received?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name?: string
          line_total?: number | null
          purchase_order_id?: string
          quantity?: number
          quantity_received?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
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
          order_date?: string
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
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "purchase_orders_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
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
      reception_batches: {
        Row: {
          batch_code: string
          created_at: string
          created_by: string | null
          crop_id: string | null
          culture_type: string | null
          decision: string
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
          status: string
          stock_entry_id: string | null
          temperature: number | null
          transformation_order_id: string | null
          updated_at: string
          updated_by: string | null
          warehouse_id: string
          weight: number
          weight_unit: string
        }
        Insert: {
          batch_code: string
          created_at?: string
          created_by?: string | null
          crop_id?: string | null
          culture_type?: string | null
          decision?: string
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
          status?: string
          stock_entry_id?: string | null
          temperature?: number | null
          transformation_order_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warehouse_id: string
          weight: number
          weight_unit?: string
        }
        Update: {
          batch_code?: string
          created_at?: string
          created_by?: string | null
          crop_id?: string | null
          culture_type?: string | null
          decision?: string
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
          status?: string
          stock_entry_id?: string | null
          temperature?: number | null
          transformation_order_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warehouse_id?: string
          weight?: number
          weight_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "reception_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_crop_id_fkey"
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
            foreignKeyName: "reception_batches_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvest_summary"
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
            foreignKeyName: "reception_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_quality_checked_by_fkey"
            columns: ["quality_checked_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "reception_batches_quality_checked_by_fkey"
            columns: ["quality_checked_by"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reception_batches_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "reception_batches_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
            foreignKeyName: "reception_batches_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          currency: string
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
          currency?: string
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
          currency?: string
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
            foreignKeyName: "revenues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "revenues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            foreignKeyName: "role_assignments_audit_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "role_assignments_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "role_assignments_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
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
          permissions: Json
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
          permissions?: Json
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
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "role_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
          id: string
          item_description: string | null
          item_id: string | null
          item_name: string
          line_total: number | null
          quantity: number
          quantity_delivered: number | null
          sales_order_id: string
          tax_amount: number | null
          tax_rate: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name: string
          line_total?: number | null
          quantity: number
          quantity_delivered?: number | null
          sales_order_id: string
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_description?: string | null
          item_id?: string | null
          item_name?: string
          line_total?: number | null
          quantity?: number
          quantity_delivered?: number | null
          sales_order_id?: string
          tax_amount?: number | null
          tax_rate?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
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
          order_date?: string
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
            foreignKeyName: "sales_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "sales_orders_stock_entry_id_fkey"
            columns: ["stock_entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_aois: {
        Row: {
          area_hectares: number | null
          created_at: string
          description: string | null
          farm_id: string | null
          geometry_json: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          parcel_id: string | null
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          created_at?: string
          description?: string | null
          farm_id?: string | null
          geometry_json?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          parcel_id?: string | null
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          created_at?: string
          description?: string | null
          farm_id?: string | null
          geometry_json?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          parcel_id?: string | null
          updated_at?: string
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
            foreignKeyName: "satellite_aois_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            foreignKeyName: "satellite_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
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
          updated_at: string
        }
        Insert: {
          cloud_coverage_percentage?: number | null
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          cloud_coverage_percentage?: number | null
          created_at?: string
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
          updated_at?: string
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
            foreignKeyName: "satellite_indices_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "satellite_indices_data_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "satellite_indices_data_processing_job_id_fkey"
            columns: ["processing_job_id"]
            isOneToOne: false
            referencedRelation: "satellite_processing_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      satellite_processing_jobs: {
        Row: {
          cloud_coverage_threshold: number | null
          completed_at: string | null
          completed_tasks: number | null
          created_at: string
          date_range_end: string
          date_range_start: string
          error_message: string | null
          failed_tasks: number | null
          farm_id: string | null
          id: string
          indices: string[]
          job_type: string
          organization_id: string
          parcel_id: string | null
          progress_percentage: number | null
          results_summary: Json | null
          scale: number | null
          started_at: string | null
          status: string
          total_tasks: number | null
          updated_at: string
        }
        Insert: {
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          completed_tasks?: number | null
          created_at?: string
          date_range_end: string
          date_range_start: string
          error_message?: string | null
          failed_tasks?: number | null
          farm_id?: string | null
          id?: string
          indices: string[]
          job_type?: string
          organization_id: string
          parcel_id?: string | null
          progress_percentage?: number | null
          results_summary?: Json | null
          scale?: number | null
          started_at?: string | null
          status?: string
          total_tasks?: number | null
          updated_at?: string
        }
        Update: {
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          completed_tasks?: number | null
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          error_message?: string | null
          failed_tasks?: number | null
          farm_id?: string | null
          id?: string
          indices?: string[]
          job_type?: string
          organization_id?: string
          parcel_id?: string | null
          progress_percentage?: number | null
          results_summary?: Json | null
          scale?: number | null
          started_at?: string | null
          status?: string
          total_tasks?: number | null
          updated_at?: string
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
            foreignKeyName: "satellite_processing_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
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
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          aoi_id?: string | null
          attempts?: number | null
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          created_at?: string
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
          status?: string
          task_type?: string
          updated_at?: string
        }
        Update: {
          aoi_id?: string | null
          attempts?: number | null
          cloud_coverage_threshold?: number | null
          completed_at?: string | null
          created_at?: string
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
          status?: string
          task_type?: string
          updated_at?: string
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
            foreignKeyName: "satellite_processing_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          analysis_date: string
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
          analysis_date?: string
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
          analysis_date?: string
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
      stock_account_mappings: {
        Row: {
          created_at: string
          credit_account_id: string
          debit_account_id: string
          entry_type: string
          id: string
          item_category: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_account_id: string
          debit_account_id: string
          entry_type: string
          id?: string
          item_category?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_account_id?: string
          debit_account_id?: string
          entry_type?: string
          id?: string
          item_category?: string | null
          organization_id?: string
          updated_at?: string
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
            foreignKeyName: "stock_account_mappings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "stock_account_mappings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_account_mappings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "stock_account_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_account_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      stock_closing_entries: {
        Row: {
          closing_date: string
          created_at: string
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
          updated_at: string
        }
        Insert: {
          closing_date: string
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          closing_date?: string
          created_at?: string
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_closing_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_closing_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_closing_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "stock_closing_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          created_at: string
          created_by: string | null
          entry_date: string
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
          status: string
          to_warehouse_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
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
          status?: string
          to_warehouse_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_date?: string
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
          status?: string
          to_warehouse_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
            foreignKeyName: "stock_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "stock_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_reception_batch_id_fkey"
            columns: ["reception_batch_id"]
            isOneToOne: false
            referencedRelation: "reception_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_entry_items: {
        Row: {
          batch_number: string | null
          cost_per_unit: number | null
          created_at: string
          expiry_date: string | null
          id: string
          item_id: string
          item_name: string
          line_number: number
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
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id: string
          item_name: string
          line_number?: number
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
          created_at?: string
          expiry_date?: string | null
          id?: string
          item_id?: string
          item_name?: string
          line_number?: number
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
            referencedRelation: "inventory_items"
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
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          movement_date: string
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
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          movement_date?: string
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
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          movement_date?: string
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
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
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
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          created_at: string
          id: string
          item_id: string
          organization_id: string
          quantity: number
          remaining_quantity: number
          serial_number: string | null
          stock_entry_id: string | null
          total_cost: number | null
          valuation_date: string
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          cost_per_unit: number
          created_at?: string
          id?: string
          item_id: string
          organization_id: string
          quantity: number
          remaining_quantity?: number
          serial_number?: string | null
          stock_entry_id?: string | null
          total_cost?: number | null
          valuation_date?: string
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          cost_per_unit?: number
          created_at?: string
          id?: string
          item_id?: string
          organization_id?: string
          quantity?: number
          remaining_quantity?: number
          serial_number?: string | null
          stock_entry_id?: string | null
          total_cost?: number | null
          valuation_date?: string
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
            foreignKeyName: "stock_valuation_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          condition: string
          created_at: string | null
          farm_id: string | null
          id: string
          installation_date: string
          is_active: boolean | null
          location: Json
          name: string
          notes: string | null
          organization_id: string
          structure_details: Json | null
          type: string
          updated_at: string | null
          usage: string | null
        }
        Insert: {
          condition?: string
          created_at?: string | null
          farm_id?: string | null
          id?: string
          installation_date: string
          is_active?: boolean | null
          location?: Json
          name: string
          notes?: string | null
          organization_id: string
          structure_details?: Json | null
          type: string
          updated_at?: string | null
          usage?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          farm_id?: string | null
          id?: string
          installation_date?: string
          is_active?: boolean | null
          location?: Json
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
          {
            foreignKeyName: "structures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            foreignKeyName: "subscription_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["subscription_id"]
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
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          has_advanced_reporting: boolean | null
          has_ai_recommendations: boolean | null
          has_analytics: boolean | null
          has_api_access: boolean | null
          has_priority_support: boolean | null
          has_sensor_integration: boolean | null
          id: string
          max_farms: number
          max_parcels: number
          max_satellite_reports: number | null
          max_users: number
          metadata: Json | null
          organization_id: string
          plan_type: string
          polar_customer_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          has_advanced_reporting?: boolean | null
          has_ai_recommendations?: boolean | null
          has_analytics?: boolean | null
          has_api_access?: boolean | null
          has_priority_support?: boolean | null
          has_sensor_integration?: boolean | null
          id?: string
          max_farms?: number
          max_parcels?: number
          max_satellite_reports?: number | null
          max_users?: number
          metadata?: Json | null
          organization_id: string
          plan_type: string
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          has_advanced_reporting?: boolean | null
          has_ai_recommendations?: boolean | null
          has_analytics?: boolean | null
          has_api_access?: boolean | null
          has_priority_support?: boolean | null
          has_sensor_integration?: boolean | null
          id?: string
          max_farms?: number
          max_parcels?: number
          max_satellite_reports?: number | null
          max_users?: number
          metadata?: Json | null
          organization_id?: string
          plan_type?: string
          polar_customer_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string | null
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
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          postal_code: string | null
          tax_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          {
            foreignKeyName: "task_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "task_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_comments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "task_comments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
            referencedRelation: "task_summary"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "task_summary"
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
            referencedRelation: "task_summary"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "task_summary"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "task_time_logs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
            foreignKeyName: "tasks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
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
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "task_summary"
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
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
          code: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          purchase_account_id: string | null
          rate: number
          sales_account_id: string | null
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          purchase_account_id?: string | null
          rate: number
          sales_account_id?: string | null
          tax_type: Database["public"]["Enums"]["tax_type"]
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          purchase_account_id?: string | null
          rate?: number
          sales_account_id?: string | null
          tax_type?: Database["public"]["Enums"]["tax_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "taxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "taxes_purchase_account_id_fkey"
            columns: ["purchase_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxes_purchase_account_id_fkey"
            columns: ["purchase_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "taxes_sales_account_id_fkey"
            columns: ["sales_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxes_sales_account_id_fkey"
            columns: ["sales_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["account_id"]
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
          created_at: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      trees: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
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
          password_set?: boolean | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
        ]
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
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
        Relationships: []
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
            foreignKeyName: "workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      active_workers_summary: {
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
          farm_name: string | null
          first_name: string | null
          hire_date: string | null
          id: string | null
          is_active: boolean | null
          is_cnss_declared: boolean | null
          last_name: string | null
          metayage_contract_details: Json | null
          metayage_percentage: number | null
          metayage_type: Database["public"]["Enums"]["metayage_type"] | null
          monthly_salary: number | null
          notes: string | null
          organization_id: string | null
          organization_name: string | null
          payment_frequency:
            | Database["public"]["Enums"]["payment_frequency"]
            | null
          payment_method: string | null
          phone: string | null
          position: string | null
          specialties: string[] | null
          total_days_worked: number | null
          total_paid: number | null
          total_tasks_completed: number | null
          updated_at: string | null
          user_id: string | null
          work_records_count: number | null
          worker_type: Database["public"]["Enums"]["worker_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      assignable_users: {
        Row: {
          first_name: string | null
          full_name: string | null
          last_name: string | null
          organization_id: string | null
          role: string | null
          user_id: string | null
          user_type: string | null
          worker_id: string | null
          worker_position: string | null
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
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      current_session_status: {
        Row: {
          access_status: string | null
          has_access: boolean | null
          organization_id: string | null
          organization_name: string | null
          plan_type: string | null
          subscription_status: string | null
          user_id: string | null
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
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      delivery_summary: {
        Row: {
          arrival_time: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_contact: string | null
          customer_email: string | null
          customer_name: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_note_number: string | null
          delivery_type: string | null
          departure_time: string | null
          destination_lat: number | null
          destination_lng: number | null
          distance_km: number | null
          driver_id: string | null
          driver_name: string | null
          farm_id: string | null
          farm_name: string | null
          id: string | null
          invoice_number: string | null
          item_count: number | null
          notes: string | null
          organization_id: string | null
          organization_name: string | null
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
          tracking_update_count: number | null
          updated_at: string | null
          vehicle_info: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
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
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      harvest_summary: {
        Row: {
          created_at: string | null
          created_by: string | null
          crop_id: string | null
          crop_name: string | null
          delivery_count: number | null
          documents: Json | null
          estimated_revenue: number | null
          expected_price_per_unit: number | null
          farm_id: string | null
          farm_name: string | null
          harvest_date: string | null
          harvest_task_id: string | null
          humidity: number | null
          id: string | null
          intended_for: string | null
          notes: string | null
          organization_id: string | null
          parcel_id: string | null
          parcel_name: string | null
          photos: Json | null
          quality_grade: string | null
          quality_notes: string | null
          quality_score: number | null
          quantity: number | null
          quantity_delivered: number | null
          status: string | null
          storage_location: string | null
          supervisor_id: string | null
          supervisor_name: string | null
          temperature: number | null
          unit: string | null
          updated_at: string | null
          worker_count: number | null
          workers: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "harvest_records_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "task_summary"
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
            foreignKeyName: "harvest_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
      payment_summary: {
        Row: {
          advance_deduction: number | null
          approved_at: string | null
          approved_by: string | null
          approved_by_email: string | null
          attachments: Json | null
          base_amount: number | null
          bonus_count: number | null
          bonuses: number | null
          calculated_at: string | null
          calculated_by: string | null
          calculated_by_email: string | null
          created_at: string | null
          days_worked: number | null
          deduction_count: number | null
          deductions: number | null
          farm_id: string | null
          farm_name: string | null
          gross_revenue: number | null
          harvest_amount: number | null
          hours_worked: number | null
          id: string | null
          metayage_percentage: number | null
          net_amount: number | null
          notes: string | null
          organization_id: string | null
          organization_name: string | null
          overtime_amount: number | null
          paid_at: string | null
          paid_by: string | null
          paid_by_email: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_type: string | null
          period_end: string | null
          period_start: string | null
          position: string | null
          status: string | null
          tasks_completed: number | null
          tasks_completed_ids: string[] | null
          total_charges: number | null
          updated_at: string | null
          worker_id: string | null
          worker_name: string | null
          worker_type: Database["public"]["Enums"]["worker_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_records_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "payment_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payment_records_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "payment_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
      subscription_status: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          expiration_status: string | null
          farms_count: number | null
          is_valid: boolean | null
          max_farms: number | null
          max_parcels: number | null
          max_users: number | null
          organization_id: string | null
          organization_name: string | null
          parcels_count: number | null
          plan_type: string | null
          status: string | null
          subscription_id: string | null
          users_count: number | null
        }
        Relationships: []
      }
      task_summary: {
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
          category_name: string | null
          checklist: Json | null
          comment_count: number | null
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
          farm_name: string | null
          id: string | null
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          organization_id: string | null
          parcel_id: string | null
          parcel_name: string | null
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
          time_log_count: number | null
          title: string | null
          total_hours_logged: number | null
          updated_at: string | null
          weather_dependency: boolean | null
          worker_id: string | null
          worker_name: string | null
          worker_type: Database["public"]["Enums"]["worker_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
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
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
            referencedRelation: "task_summary"
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
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "tasks_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
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
      vw_account_balances: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          balance: number | null
          organization_id: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      vw_invoice_aging: {
        Row: {
          aging_bucket: string | null
          days_overdue: number | null
          due_date: string | null
          grand_total: number | null
          invoice_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["invoice_type"] | null
          organization_id: string | null
          outstanding_amount: number | null
          party_name: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
        }
        Insert: {
          aging_bucket?: never
          days_overdue?: never
          due_date?: string | null
          grand_total?: number | null
          invoice_date?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          organization_id?: string | null
          outstanding_amount?: number | null
          party_name?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
        }
        Update: {
          aging_bucket?: never
          days_overdue?: never
          due_date?: string | null
          grand_total?: number | null
          invoice_date?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          organization_id?: string | null
          outstanding_amount?: number | null
          party_name?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      vw_ledger: {
        Row: {
          account_code: string | null
          account_name: string | null
          account_type: string | null
          cost_center_name: string | null
          created_at: string | null
          created_by: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          farm_name: string | null
          id: string | null
          organization_id: string | null
          parcel_name: string | null
          posting_date: string | null
          reference_number: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["journal_entry_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "assignable_users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      worker_payment_history: {
        Row: {
          approved_amount: number | null
          average_payment: number | null
          last_payment_date: string | null
          pending_amount: number | null
          total_paid: number | null
          total_payments: number | null
          worker_id: string | null
          worker_name: string | null
          worker_type: Database["public"]["Enums"]["worker_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_subscription_check_to_table: {
        Args: { table_name: string }
        Returns: undefined
      }
      assign_role_with_audit: {
        Args: {
          new_role_id: string
          reason?: string
          target_org_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      calculate_daily_worker_payment: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_worker_id: string
        }
        Returns: {
          base_amount: number
          days_worked: number
          hours_worked: number
          overtime_amount: number
          tasks_completed: number
        }[]
      }
      calculate_fixed_salary_payment: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_worker_id: string
        }
        Returns: {
          base_amount: number
          days_worked: number
          hours_worked: number
          overtime_amount: number
          tasks_completed: number
        }[]
      }
      calculate_metayage_share: {
        Args: {
          p_gross_revenue: number
          p_total_charges?: number
          p_worker_id: string
        }
        Returns: number
      }
      calculate_profitability: {
        Args: {
          p_end_date?: string
          p_organization_id: string
          p_parcel_id?: string
          p_start_date?: string
        }
        Returns: {
          cost_breakdown: Json
          net_profit: number
          parcel_id: string
          parcel_name: string
          profit_margin: number
          revenue_breakdown: Json
          total_costs: number
          total_revenue: number
        }[]
      }
      can_add_user: { Args: { org_id: string }; Returns: boolean }
      can_create_farm: { Args: { org_id: string }; Returns: boolean }
      can_create_parcel: { Args: { org_id: string }; Returns: boolean }
      can_create_resource: {
        Args: { p_organization_id: string; p_resource_type: string }
        Returns: boolean
      }
      can_user_perform_action: {
        Args: {
          action_name: string
          org_id: string
          resource_name: string
          user_id: string
        }
        Returns: boolean
      }
      check_overdue_tasks: { Args: never; Returns: undefined }
      create_material_issue_from_so: {
        Args: {
          p_issue_date?: string
          p_sales_order_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      create_material_receipt_from_po: {
        Args: {
          p_purchase_order_id: string
          p_receipt_date?: string
          p_warehouse_id: string
        }
        Returns: string
      }
      create_role_from_template: {
        Args: { custom_name?: string; org_id: string; template_id: string }
        Returns: string
      }
      create_sales_order_from_reception_batch: {
        Args: {
          p_customer_id: string
          p_item_id: string
          p_reception_batch_id: string
          p_unit_price: number
        }
        Returns: string
      }
      create_stock_entry_from_reception_batch: {
        Args: {
          p_destination_warehouse_id: string
          p_item_id: string
          p_reception_batch_id: string
        }
        Returns: string
      }
      create_stock_journal_entry: {
        Args: { p_stock_entry_id: string }
        Returns: string
      }
      debug_parcel_access: {
        Args: { test_org_id: string; test_user_id: string }
        Returns: {
          can_see_farms: boolean
          farm_count: number
          is_org_member: boolean
          parcel_count: number
        }[]
      }
      delete_all_users: { Args: never; Returns: undefined }
      delete_farm_direct: {
        Args: { p_farm_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "farms"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_farm_safe: {
        Args: { farm_id: string }
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "farms"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_parcel_direct: {
        Args: { p_parcel_id: string }
        Returns: {
          area: number | null
          area_unit: string | null
          boundary: Json | null
          calculated_area: number | null
          created_at: string | null
          crop_category: string | null
          crop_type: string | null
          density_per_hectare: number | null
          description: string | null
          farm_id: string | null
          id: string
          irrigation_type: string | null
          name: string
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
        }[]
        SetofOptions: {
          from: "*"
          to: "parcels"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_parcel_safe: {
        Args: { parcel_id: string }
        Returns: {
          area: number | null
          area_unit: string | null
          boundary: Json | null
          calculated_area: number | null
          created_at: string | null
          crop_category: string | null
          crop_type: string | null
          density_per_hectare: number | null
          description: string | null
          farm_id: string | null
          id: string
          irrigation_type: string | null
          name: string
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
        }[]
        SetofOptions: {
          from: "*"
          to: "parcels"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_user_cascade: { Args: { user_uuid: string }; Returns: undefined }
      enforce_subscription_on_session: { Args: never; Returns: undefined }
      generate_invoice_number: {
        Args: {
          p_invoice_type: Database["public"]["Enums"]["invoice_type"]
          p_organization_id: string
        }
        Returns: string
      }
      generate_journal_entry_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      generate_payment_number:
        | {
            Args: {
              p_organization_id: string
              p_payment_type: Database["public"]["Enums"]["payment_type"]
            }
            Returns: string
          }
        | {
            Args: {
              p_organization_id: string
              p_payment_type: Database["public"]["Enums"]["accounting_payment_type"]
            }
            Returns: string
          }
      generate_reception_batch_code: {
        Args: {
          p_culture_type: string
          p_organization_id: string
          p_warehouse_id: string
        }
        Returns: string
      }
      generate_stock_entry_number: {
        Args: { p_organization_id: string }
        Returns: string
      }
      get_current_user_profile: {
        Args: never
        Returns: {
          email: string
          first_name: string
          full_name: string
          id: string
          last_name: string
        }[]
      }
      get_expiring_items: {
        Args: { p_days_ahead?: number; p_organization_id: string }
        Returns: {
          batch_number: string
          current_quantity: number
          days_to_expiry: number
          expiry_date: string
          item_id: string
          item_name: string
        }[]
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
          parent_farm_id: string
          sub_farms_count: number
        }[]
      }
      get_farm_structures: {
        Args: { farm_uuid: string }
        Returns: {
          condition: string
          created_at: string
          installation_date: string
          is_active: boolean
          location: Json
          notes: string
          structure_details: Json
          structure_id: string
          structure_name: string
          structure_type: string
          updated_at: string
          usage: string
        }[]
      }
      get_harvest_statistics: {
        Args: {
          p_end_date: string
          p_organization_id: string
          p_start_date: string
        }
        Returns: {
          average_quality_score: number
          top_parcel_name: string
          top_parcel_quantity: number
          total_harvests: number
          total_quantity: number
          total_revenue: number
        }[]
      }
      get_item_stock_value: {
        Args: { p_item_id: string; p_warehouse_id?: string }
        Returns: number
      }
      get_latest_satellite_data: {
        Args: { index_name_param?: string; parcel_uuid: string }
        Returns: {
          cloud_coverage_percentage: number
          created_at: string
          date: string
          geotiff_url: string
          index_name: string
          max_value: number
          mean_value: number
          median_value: number
          min_value: number
          std_value: number
        }[]
      }
      get_low_stock_items: {
        Args: { p_organization_id: string }
        Returns: {
          current_quantity: number
          deficit: number
          item_id: string
          item_name: string
          minimum_quantity: number
        }[]
      }
      get_organization_farms: {
        Args: { org_uuid: string }
        Returns: {
          farm_id: string
          farm_location: string
          farm_name: string
          farm_size: number
          farm_type: string
          hierarchy_level: number
          manager_name: string
          parent_farm_id: string
          sub_farms_count: number
        }[]
      }
      get_organization_role_hierarchy: {
        Args: { org_id: string }
        Returns: {
          display_name: string
          level: number
          permissions_count: number
          role_id: string
          role_name: string
          user_count: number
        }[]
      }
      get_organization_structures: {
        Args: { org_uuid: string }
        Returns: {
          condition: string
          created_at: string
          farm_id: string
          farm_name: string
          installation_date: string
          is_active: boolean
          location: Json
          notes: string
          structure_details: Json
          structure_id: string
          structure_name: string
          structure_type: string
          updated_at: string
          usage: string
        }[]
      }
      get_parcels_for_satellite_processing: {
        Args: { org_uuid: string }
        Returns: {
          area_hectares: number
          boundary: Json
          farm_id: string
          farm_name: string
          irrigation_type: string
          notes: string
          organization_id: string
          parcel_id: string
          parcel_name: string
          soil_type: string
        }[]
      }
      get_satellite_data_statistics: {
        Args: {
          end_date_param: string
          index_name_param: string
          parcel_uuid: string
          start_date_param: string
        }
        Returns: {
          data_points_count: number
          first_date: string
          index_name: string
          last_date: string
          max_value: number
          mean_value: number
          median_value: number
          min_value: number
          std_value: number
        }[]
      }
      get_user_effective_permissions: {
        Args: { org_id: string; user_id: string }
        Returns: {
          action: string
          granted_by_role: string
          permission_name: string
          resource: string
        }[]
      }
      get_user_organizations: {
        Args: { user_uuid: string }
        Returns: {
          is_active: boolean
          organization_id: string
          organization_name: string
          organization_slug: string
          user_role: string
        }[]
      }
      get_user_permissions: {
        Args: { user_id: string }
        Returns: {
          action: string
          permission_name: string
          resource: string
        }[]
      }
      get_user_role: {
        Args: { org_id?: string; user_id: string }
        Returns: {
          role_display_name: string
          role_level: number
          role_name: string
        }[]
      }
      get_user_role_level: {
        Args: { org_id: string; user_id: string }
        Returns: number
      }
      get_user_tasks: {
        Args: { user_uuid: string }
        Returns: {
          due_date: string
          farm_name: string
          parcel_name: string
          priority: string
          scheduled_start: string
          status: string
          task_description: string
          task_id: string
          task_title: string
          task_type: string
        }[]
      }
      get_worker_advance_deductions: {
        Args: { p_payment_date: string; p_worker_id: string }
        Returns: number
      }
      get_worker_availability: {
        Args: { p_date: string; p_worker_id: string }
        Returns: {
          is_available: boolean
          tasks_count: number
          total_hours: number
        }[]
      }
      has_feature_access: {
        Args: { feature_name: string; org_id: string }
        Returns: boolean
      }
      has_valid_subscription: { Args: { org_id: string }; Returns: boolean }
      is_active_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_system_admin: { Args: { check_user_id: string }; Returns: boolean }
      is_worker: { Args: { user_uuid: string }; Returns: boolean }
      normalize_role_name: { Args: { legacy_role: string }; Returns: string }
      post_opening_stock_balance: {
        Args: { p_opening_stock_id: string }
        Returns: string
      }
      update_expired_subscriptions: { Args: never; Returns: undefined }
      user_belongs_to_organization: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: { permission_name: string; user_id: string }
        Returns: boolean
      }
      user_has_permission_for_org: {
        Args: { org_id: string; permission_name: string; user_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: {
          p_organization_id: string
          p_role_names: string[]
          p_user_id: string
        }
        Returns: boolean
      }
      validate_role_assignment: {
        Args: {
          new_role_id: string
          target_org_id: string
          target_user_id: string
        }
        Returns: {
          error_message: string
          is_valid: boolean
          warnings: string[]
        }[]
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
      calculation_basis: "gross_revenue" | "net_revenue"
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
      payment_method:
        | "cash"
        | "bank_transfer"
        | "check"
        | "card"
        | "mobile_money"
      payment_status: "draft" | "submitted" | "reconciled" | "cancelled"
      payment_type: "receive" | "pay"
      tax_type: "sales" | "purchase" | "both"
      worker_type: "fixed_salary" | "daily_worker" | "metayage"
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
      calculation_basis: ["gross_revenue", "net_revenue"],
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
      payment_method: [
        "cash",
        "bank_transfer",
        "check",
        "card",
        "mobile_money",
      ],
      payment_status: ["draft", "submitted", "reconciled", "cancelled"],
      payment_type: ["receive", "pay"],
      tax_type: ["sales", "purchase", "both"],
      worker_type: ["fixed_salary", "daily_worker", "metayage"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.54.11 (currently installed v2.47.2)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
