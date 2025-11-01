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
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["id"]
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
        Relationships: []
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
            referencedColumns: ["id"]
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
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_summary"
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
        ]
      }
      document_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_type: string
          footer_background_color: string | null
          footer_border_color: string | null
          footer_border_top: boolean | null
          footer_custom_text: string | null
          footer_enabled: boolean | null
          footer_font_size: number | null
          footer_height: number | null
          footer_include_company_info: boolean | null
          footer_position: string | null
          footer_text: string | null
          footer_text_color: string | null
          header_background_color: string | null
          header_border_bottom: boolean | null
          header_border_color: string | null
          header_company_info: boolean | null
          header_company_name: boolean | null
          header_custom_text: string | null
          header_enabled: boolean | null
          header_height: number | null
          header_logo_height: number | null
          header_logo_position: string | null
          header_logo_url: string | null
          header_logo_width: number | null
          header_text_color: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          page_margin_bottom: number | null
          page_margin_left: number | null
          page_margin_right: number | null
          page_margin_top: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_type: string
          footer_background_color?: string | null
          footer_border_color?: string | null
          footer_border_top?: boolean | null
          footer_custom_text?: string | null
          footer_enabled?: boolean | null
          footer_font_size?: number | null
          footer_height?: number | null
          footer_include_company_info?: boolean | null
          footer_position?: string | null
          footer_text?: string | null
          footer_text_color?: string | null
          header_background_color?: string | null
          header_border_bottom?: boolean | null
          header_border_color?: string | null
          header_company_info?: boolean | null
          header_company_name?: boolean | null
          header_custom_text?: string | null
          header_enabled?: boolean | null
          header_height?: number | null
          header_logo_height?: number | null
          header_logo_position?: string | null
          header_logo_url?: string | null
          header_logo_width?: number | null
          header_text_color?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          page_margin_bottom?: number | null
          page_margin_left?: number | null
          page_margin_right?: number | null
          page_margin_top?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          footer_background_color?: string | null
          footer_border_color?: string | null
          footer_border_top?: boolean | null
          footer_custom_text?: string | null
          footer_enabled?: boolean | null
          footer_font_size?: number | null
          footer_height?: number | null
          footer_include_company_info?: boolean | null
          footer_position?: string | null
          footer_text?: string | null
          footer_text_color?: string | null
          header_background_color?: string | null
          header_border_bottom?: boolean | null
          header_border_color?: string | null
          header_company_info?: boolean | null
          header_company_name?: boolean | null
          header_custom_text?: string | null
          header_enabled?: boolean | null
          header_height?: number | null
          header_logo_height?: number | null
          header_logo_position?: string | null
          header_logo_url?: string | null
          header_logo_width?: number | null
          header_text_color?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          page_margin_bottom?: number | null
          page_margin_left?: number | null
          page_margin_right?: number | null
          page_margin_top?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "current_session_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      harvest_forecasts: {
        Row: {
          actual_harvest_id: string | null
          actual_yield_quantity: number | null
          adjustment_factors: Json | null
          based_on_historical_years: number | null
          confidence_level: string | null
          created_at: string | null
          created_by: string | null
          crop_type: string
          currency_code: string | null
          estimated_cost: number | null
          estimated_price_per_unit: number | null
          estimated_profit: number | null
          estimated_revenue: number | null
          farm_id: string
          forecast_accuracy_percent: number | null
          forecast_harvest_date_end: string
          forecast_harvest_date_start: string
          forecast_method: string | null
          forecast_season: string | null
          id: string
          max_yield_quantity: number | null
          min_yield_quantity: number | null
          notes: string | null
          organization_id: string
          parcel_id: string
          planting_date: string | null
          predicted_quality_grade: string | null
          predicted_yield_per_hectare: number | null
          predicted_yield_quantity: number
          status: string | null
          unit_of_measure: string | null
          updated_at: string | null
          variety: string | null
        }
        Insert: {
          actual_harvest_id?: string | null
          actual_yield_quantity?: number | null
          adjustment_factors?: Json | null
          based_on_historical_years?: number | null
          confidence_level?: string | null
          created_at?: string | null
          created_by?: string | null
          crop_type: string
          currency_code?: string | null
          estimated_cost?: number | null
          estimated_price_per_unit?: number | null
          estimated_profit?: number | null
          estimated_revenue?: number | null
          farm_id: string
          forecast_accuracy_percent?: number | null
          forecast_harvest_date_end: string
          forecast_harvest_date_start: string
          forecast_method?: string | null
          forecast_season?: string | null
          id?: string
          max_yield_quantity?: number | null
          min_yield_quantity?: number | null
          notes?: string | null
          organization_id: string
          parcel_id: string
          planting_date?: string | null
          predicted_quality_grade?: string | null
          predicted_yield_per_hectare?: number | null
          predicted_yield_quantity: number
          status?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          variety?: string | null
        }
        Update: {
          actual_harvest_id?: string | null
          actual_yield_quantity?: number | null
          adjustment_factors?: Json | null
          based_on_historical_years?: number | null
          confidence_level?: string | null
          created_at?: string | null
          created_by?: string | null
          crop_type?: string
          currency_code?: string | null
          estimated_cost?: number | null
          estimated_price_per_unit?: number | null
          estimated_profit?: number | null
          estimated_revenue?: number | null
          farm_id?: string
          forecast_accuracy_percent?: number | null
          forecast_harvest_date_end?: string
          forecast_harvest_date_start?: string
          forecast_method?: string | null
          forecast_season?: string | null
          id?: string
          max_yield_quantity?: number | null
          min_yield_quantity?: number | null
          notes?: string | null
          organization_id?: string
          parcel_id?: string
          planting_date?: string | null
          predicted_quality_grade?: string | null
          predicted_yield_per_hectare?: number | null
          predicted_yield_quantity?: number
          status?: string | null
          unit_of_measure?: string | null
          updated_at?: string | null
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_forecasts_actual_harvest_id_fkey"
            columns: ["actual_harvest_id"]
            isOneToOne: false
            referencedRelation: "harvest_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_forecasts_actual_harvest_id_fkey"
            columns: ["actual_harvest_id"]
            isOneToOne: false
            referencedRelation: "harvests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_forecasts_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
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
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "harvest_records_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_summary"
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
      harvests: {
        Row: {
          buyer_contact: string | null
          buyer_name: string | null
          created_at: string | null
          created_by: string | null
          crop_id: string | null
          delivery_address: string | null
          delivery_date: string | null
          delivery_status: string | null
          farm_id: string
          harvest_date: string
          id: string
          notes: string | null
          organization_id: string
          parcel_id: string | null
          payment_status: string | null
          price_per_unit: number | null
          quality_grade: string | null
          quantity: number
          total_value: number | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string | null
          created_by?: string | null
          crop_id?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_status?: string | null
          farm_id: string
          harvest_date: string
          id?: string
          notes?: string | null
          organization_id: string
          parcel_id?: string | null
          payment_status?: string | null
          price_per_unit?: number | null
          quality_grade?: string | null
          quantity: number
          total_value?: number | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          buyer_contact?: string | null
          buyer_name?: string | null
          created_at?: string | null
          create