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
          created_by?: string | null
          crop_id?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_status?: string | null
          farm_id?: string
          harvest_date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          parcel_id?: string | null
          payment_status?: string | null
          price_per_unit?: number | null
          quality_grade?: string | null
          quantity?: number
          total_value?: number | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvests_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
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
          packaging_size: number | null
          packaging_type: string | null
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
          packaging_size?: number | null
          packaging_type?: string | null
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
          packaging_size?: number | null
          packaging_type?: string | null
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
      inventory_items: {
        Row: {
          batch_number: string | null
          brand: string | null
          category: string | null
          cost_per_unit: number | null
          created_at: string
          expiry_date: string | null
          farm_id: string | null
          id: string
          last_purchase_date: string | null
          location: string | null
          minimum_stock: number | null
          name: string
          notes: string | null
          organization_id: string
          packaging_size: number | null
          packaging_type: string | null
          quantity: number
          status: string | null
          supplier: string | null
          unit: string
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          batch_number?: string | null
          brand?: string | null
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          farm_id?: string | null
          id?: string
          last_purchase_date?: string | null
          location?: string | null
          minimum_stock?: number | null
          name: string
          notes?: string | null
          organization_id: string
          packaging_size?: number | null
          packaging_type?: string | null
          quantity?: number
          status?: string | null
          supplier?: string | null
          unit: string
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          batch_number?: string | null
          brand?: string | null
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          expiry_date?: string | null
          farm_id?: string | null
          id?: string
          last_purchase_date?: string | null
          location?: string | null
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          packaging_size?: number | null
          packaging_type?: string | null
          quantity?: number
          status?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
          warehouse_id?: string | null
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
            foreignKeyName: "inventory_items_warehouse_id_fkey"
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
          rate: number | null
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
          rate?: number | null
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
          rate?: number | null
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
            referencedColumns: ["id"]
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
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "vw_invoice_aging"
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
          purchase_order_id: string | null
          remarks: string | null
          sales_order_id: string | null
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
          purchase_order_id?: string | null
          remarks?: string | null
          sales_order_id?: string | null
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
          purchase_order_id?: string | null
          remarks?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
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
      lab_result_parameters: {
        Row: {
          created_at: string | null
          id: string
          interpretation: string | null
          order_id: string
          parameter_code: string | null
          parameter_name: string
          recommendation: string | null
          reference_range_max: number | null
          reference_range_min: number | null
          unit: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interpretation?: string | null
          order_id: string
          parameter_code?: string | null
          parameter_name: string
          recommendation?: string | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interpretation?: string | null
          order_id?: string
          parameter_code?: string | null
          parameter_name?: string
          recommendation?: string | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          unit?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_result_parameters_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_service_orders: {
        Row: {
          actual_completion_date: string | null
          actual_price: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          expected_completion_date: string | null
          farm_id: string | null
          id: string
          lab_reference_number: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          organization_id: string
          paid: boolean | null
          parcel_id: string | null
          payment_date: string | null
          provider_id: string
          quoted_price: number | null
          results_data: Json | null
          results_document_url: string | null
          results_received_date: string | null
          sample_collected_by: string | null
          sample_collection_date: string | null
          sample_collection_notes: string | null
          sample_depth_cm: number | null
          sample_location_coordinates: Json | null
          sample_photos: string[] | null
          sent_to_lab_date: string | null
          service_type_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          actual_completion_date?: string | null
          actual_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expected_completion_date?: string | null
          farm_id?: string | null
          id?: string
          lab_reference_number?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          organization_id: string
          paid?: boolean | null
          parcel_id?: string | null
          payment_date?: string | null
          provider_id: string
          quoted_price?: number | null
          results_data?: Json | null
          results_document_url?: string | null
          results_received_date?: string | null
          sample_collected_by?: string | null
          sample_collection_date?: string | null
          sample_collection_notes?: string | null
          sample_depth_cm?: number | null
          sample_location_coordinates?: Json | null
          sample_photos?: string[] | null
          sent_to_lab_date?: string | null
          service_type_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          actual_completion_date?: string | null
          actual_price?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expected_completion_date?: string | null
          farm_id?: string | null
          id?: string
          lab_reference_number?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          organization_id?: string
          paid?: boolean | null
          parcel_id?: string | null
          payment_date?: string | null
          provider_id?: string
          quoted_price?: number | null
          results_data?: Json | null
          results_document_url?: string | null
          results_received_date?: string | null
          sample_collected_by?: string | null
          sample_collection_date?: string | null
          sample_collection_notes?: string | null
          sample_depth_cm?: number | null
          sample_location_coordinates?: Json | null
          sample_photos?: string[] | null
          sent_to_lab_date?: string | null
          service_type_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "current_session_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "lab_service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_sample_collected_by_fkey"
            columns: ["sample_collected_by"]
            isOneToOne: false
            referencedRelation: "current_session_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_sample_collected_by_fkey"
            columns: ["sample_collected_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_orders_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "lab_service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_service_providers: {
        Row: {
          accreditations: Json | null
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          turnaround_days: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accreditations?: Json | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          turnaround_days?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accreditations?: Json | null
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          turnaround_days?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      lab_service_recommendations: {
        Row: {
          application_method: string | null
          created_at: string | null
          description: string
          id: string
          implemented_by: string | null
          implemented_date: string | null
          notes: string | null
          order_id: string
          parcel_id: string | null
          priority: string | null
          recommendation_type: string
          status: string | null
          suggested_products: Json | null
          suggested_quantities: Json | null
          timing: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          application_method?: string | null
          created_at?: string | null
          description: string
          id?: string
          implemented_by?: string | null
          implemented_date?: string | null
          notes?: string | null
          order_id: string
          parcel_id?: string | null
          priority?: string | null
          recommendation_type: string
          status?: string | null
          suggested_products?: Json | null
          suggested_quantities?: Json | null
          timing?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          application_method?: string | null
          created_at?: string | null
          description?: string
          id?: string
          implemented_by?: string | null
          implemented_date?: string | null
          notes?: string | null
          order_id?: string
          parcel_id?: string | null
          priority?: string | null
          recommendation_type?: string
          status?: string | null
          suggested_products?: Json | null
          suggested_quantities?: Json | null
          timing?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_service_recommendations_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "current_session_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_recommendations_implemented_by_fkey"
            columns: ["implemented_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_recommendations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_service_recommendations_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_service_types: {
        Row: {
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parameters_tested: Json | null
          price: number | null
          provider_id: string | null
          sample_requirements: string | null
          turnaround_days: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parameters_tested?: Json | null
          price?: number | null
          provider_id?: string | null
          sample_requirements?: string | null
          turnaround_days?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parameters_tested?: Json | null
          price?: number | null
          provider_id?: string | null
          sample_requirements?: string | null
          turnaround_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_service_types_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "lab_service_providers"
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "accounting_payment_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "accounting_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_summary"
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
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
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
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          farm_id: string | null
          id: string
          organization_id: string
          payment_date: string
          payment_method: string | null
          payment_type: string
          reference_number: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          worker_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          organization_id: string
          payment_date: string
          payment_method?: string | null
          payment_type: string
          reference_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          organization_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reference_number?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
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
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "active_workers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_payment_history"
            referencedColumns: ["worker_id"]
          },
          {
            foreignKeyName: "payments_worker_id_fkey"
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
          resolution_notes: string | null
          resolved_at: string | null
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
          resolution_notes?: string | null
          resolved_at?: string | null
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
          resolution_notes?: string | null
          resolved_at?: string | null
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
            referencedRelation: "harvest_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvests"
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
          {
            foreignKeyName: "performance_alerts_yield_history_id_fkey"
            columns: ["yield_history_id"]
            isOneToOne: false
            referencedRelation: "yield_history"
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
            foreignKeyName: "purchase_order_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          billed_amount: number | null
          confirmed_at: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_country: string | null
          delivery_postal_code: string | null
          delivery_terms: string | null
          discount_amount: number | null
          exchange_rate: number | null
          expected_delivery_date: string | null
          farm_id: string | null
          grand_total: number
          id: string
          notes: string | null
          organization_id: string
          outstanding_amount: number | null
          parcel_id: string | null
          payment_terms: string | null
          po_date: string
          po_number: string
          received_amount: number | null
          shipping_charges: number | null
          status: Database["public"]["Enums"]["purchase_order_status"] | null
          submitted_at: string | null
          submitted_by: string | null
          subtotal: number
          supplier_id: string | null
          supplier_name: string
          supplier_quote_ref: string | null
          tax_total: number
          updated_at: string | null
        }
        Insert: {
          billed_amount?: number | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_postal_code?: string | null
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          expected_delivery_date?: string | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          notes?: string | null
          organization_id: string
          outstanding_amount?: number | null
          parcel_id?: string | null
          payment_terms?: string | null
          po_date: string
          po_number: string
          received_amount?: number | null
          shipping_charges?: number | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal?: number
          supplier_id?: string | null
          supplier_name: string
          supplier_quote_ref?: string | null
          tax_total?: number
          updated_at?: string | null
        }
        Update: {
          billed_amount?: number | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_country?: string | null
          delivery_postal_code?: string | null
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          expected_delivery_date?: string | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          notes?: string | null
          organization_id?: string
          outstanding_amount?: number | null
          parcel_id?: string | null
          payment_terms?: string | null
          po_date?: string
          po_number?: string
          received_amount?: number | null
          shipping_charges?: number | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          submitted_at?: string | null
          submitted_by?: string | null
          subtotal?: number
          supplier_id?: string | null
          supplier_name?: string
          supplier_quote_ref?: string | null
          tax_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "purchase_orders_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
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
            foreignKeyName: "quote_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
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
            foreignKeyName: "sales_order_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          customer_name: string
          customer_po_number: string | null
          delivered_amount: number | null
          delivery_terms: string | null
          discount_amount: number | null
          exchange_rate: number | null
          expected_delivery_date: string | null
          farm_id: string | null
          grand_total: number
          id: string
          invoiced_amount: number | null
          notes: string | null
          order_date: string
          order_number: string
          organization_id: string
          outstanding_amount: number | null
          parcel_id: string | null
          payment_terms: string | null
          quote_id: string | null
          shipping_address: string | null
          shipping_charges: number | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          status: Database["public"]["Enums"]["sales_order_status"] | null
          subtotal: number
          tax_total: number
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          customer_name: string
          customer_po_number?: string | null
          delivered_amount?: number | null
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          expected_delivery_date?: string | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          invoiced_amount?: number | null
          notes?: string | null
          order_date: string
          order_number: string
          organization_id: string
          outstanding_amount?: number | null
          parcel_id?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          shipping_address?: string | null
          shipping_charges?: number | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"] | null
          subtotal?: number
          tax_total?: number
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_po_number?: string | null
          delivered_amount?: number | null
          delivery_terms?: string | null
          discount_amount?: number | null
          exchange_rate?: number | null
          expected_delivery_date?: string | null
          farm_id?: string | null
          grand_total?: number
          id?: string
          invoiced_amount?: number | null
          notes?: string | null
          order_date?: string
          order_number?: string
          organization_id?: string
          outstanding_amount?: number | null
          parcel_id?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          shipping_address?: string | null
          shipping_charges?: number | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          status?: Database["public"]["Enums"]["sales_order_status"] | null
          subtotal?: number
          tax_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_collection_schedules: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          custom_interval_days: number | null
          farm_id: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_collection_date: string | null
          next_collection_date: string
          notification_emails: string[] | null
          notify_days_before: number | null
          organization_id: string
          parcel_id: string | null
          service_type_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          custom_interval_days?: number | null
          farm_id?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_collection_date?: string | null
          next_collection_date: string
          notification_emails?: string[] | null
          notify_days_before?: number | null
          organization_id: string
          parcel_id?: string | null
          service_type_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          custom_interval_days?: number | null
          farm_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_collection_date?: string | null
          next_collection_date?: string
          notification_emails?: string[] | null
          notify_days_before?: number | null
          organization_id?: string
          parcel_id?: string | null
          service_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_collection_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "current_session_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_collection_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_collection_schedules_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_collection_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_collection_schedules_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sample_collection_schedules_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "lab_service_types"
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
            referencedRelation: "subscription_status"
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
            foreignKeyName: "taxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
            referencedColumns: ["id"]
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
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
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
          humidity_controlled: boolean | null
          id: string
          is_active: boolean | null
          location: string | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          organization_id: string
          postal_code: string | null
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
          humidity_controlled?: boolean | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          organization_id: string
          postal_code?: string | null
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
          humidity_controlled?: boolean | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          organization_id?: string
          postal_code?: string | null
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
      yield_benchmarks: {
        Row: {
          acceptable_threshold_percent: number | null
          benchmark_type: string
          created_at: string | null
          created_by: string | null
          crop_type: string
          excellent_threshold_percent: number | null
          farm_id: string | null
          good_threshold_percent: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string
          parcel_id: string | null
          source: string | null
          target_profit_margin_percent: number | null
          target_revenue_per_hectare: number | null
          target_yield_per_hectare: number
          unit_of_measure: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          variety: string | null
        }
        Insert: {
          acceptable_threshold_percent?: number | null
          benchmark_type: string
          created_at?: string | null
          created_by?: string | null
          crop_type: string
          excellent_threshold_percent?: number | null
          farm_id?: string | null
          good_threshold_percent?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id: string
          parcel_id?: string | null
          source?: string | null
          target_profit_margin_percent?: number | null
          target_revenue_per_hectare?: number | null
          target_yield_per_hectare: number
          unit_of_measure?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variety?: string | null
        }
        Update: {
          acceptable_threshold_percent?: number | null
          benchmark_type?: string
          created_at?: string | null
          created_by?: string | null
          crop_type?: string
          excellent_threshold_percent?: number | null
          farm_id?: string | null
          good_threshold_percent?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string
          parcel_id?: string | null
          source?: string | null
          target_profit_margin_percent?: number | null
          target_revenue_per_hectare?: number | null
          target_yield_per_hectare?: number
          unit_of_measure?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_benchmarks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_benchmarks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_history: {
        Row: {
          actual_yield_per_hectare: number | null
          actual_yield_quantity: number
          cost_amount: number | null
          created_at: string | null
          created_by: string | null
          crop_type: string
          currency_code: string | null
          farm_id: string
          growing_days: number | null
          harvest_date: string
          harvest_id: string | null
          harvest_season: string | null
          id: string
          irrigation_total_m3: number | null
          notes: string | null
          organization_id: string
          parcel_id: string
          performance_rating: string | null
          price_per_unit: number | null
          profit_amount: number | null
          profit_margin_percent: number | null
          quality_grade: string | null
          revenue_amount: number | null
          soil_conditions: Json | null
          target_yield_per_hectare: number | null
          target_yield_quantity: number | null
          unit_of_measure: string | null
          updated_at: string | null
          variety: string | null
          weather_conditions: Json | null
          yield_variance_percent: number | null
        }
        Insert: {
          actual_yield_per_hectare?: number | null
          actual_yield_quantity: number
          cost_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          crop_type: string
          currency_code?: string | null
          farm_id: string
          growing_days?: number | null
          harvest_date: string
          harvest_id?: string | null
          harvest_season?: string | null
          id?: string
          irrigation_total_m3?: number | null
          notes?: string | null
          organization_id: string
          parcel_id: string
          performance_rating?: string | null
          price_per_unit?: number | null
          profit_amount?: number | null
          profit_margin_percent?: number | null
          quality_grade?: string | null
          revenue_amount?: number | null
          soil_conditions?: Json | null
          target_yield_per_hectare?: number | null
          target_yield_quantity?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          variety?: string | null
          weather_conditions?: Json | null
          yield_variance_percent?: number | null
        }
        Update: {
          actual_yield_per_hectare?: number | null
          actual_yield_quantity?: number
          cost_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          crop_type?: string
          currency_code?: string | null
          farm_id?: string
          growing_days?: number | null
          harvest_date?: string
          harvest_id?: string | null
          harvest_season?: string | null
          id?: string
          irrigation_total_m3?: number | null
          notes?: string | null
          organization_id?: string
          parcel_id?: string
          performance_rating?: string | null
          price_per_unit?: number | null
          profit_amount?: number | null
          profit_margin_percent?: number | null
          quality_grade?: string | null
          revenue_amount?: number | null
          soil_conditions?: Json | null
          target_yield_per_hectare?: number | null
          target_yield_quantity?: number | null
          unit_of_measure?: string | null
          updated_at?: string | null
          variety?: string | null
          weather_conditions?: Json | null
          yield_variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_history_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "yield_history_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_history_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvest_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_history_harvest_id_fkey"
            columns: ["harvest_id"]
            isOneToOne: false
            referencedRelation: "harvests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_history_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accounting_payment_summary: {
        Row: {
          allocated_amount: number | null
          amount: number | null
          bank_account_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          id: string | null
          organization_id: string | null
          party_id: string | null
          party_name: string | null
          party_type: string | null
          payment_date: string | null
          payment_method:
            | Database["public"]["Enums"]["accounting_payment_method"]
            | null
          payment_number: string | null
          payment_type:
            | Database["public"]["Enums"]["accounting_payment_type"]
            | null
          reference_number: string | null
          remarks: string | null
          unallocated_amount: number | null
          updated_at: string | null
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
            foreignKeyName: "accounting_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      active_workers_summary: {
        Row: {
          active_tasks: number | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          last_name: string | null
          organization_id: string | null
          phone: string | null
          position: string | null
          worker_type: Database["public"]["Enums"]["worker_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignable_users: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string | null
          organization_id: string | null
          role: string | null
          source_type: string | null
        }
        Relationships: []
      }
      current_session_status: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
          organization_id: string | null
          organization_name: string | null
          role: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
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
      harvest_summary: {
        Row: {
          farm_name: string | null
          harvest_date: string | null
          id: string | null
          notes: string | null
          organization_id: string | null
          parcel_id: string | null
          parcel_name: string | null
          quality_grade: string | null
          quantity: number | null
          total_costs: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvests_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string | null
          cost_center_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string | null
          journal_entry_id: string | null
        }
        Insert: {
          account_id?: string | null
          cost_center_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string | null
          journal_entry_id?: string | null
        }
        Update: {
          account_id?: string | null
          cost_center_id?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string | null
          journal_entry_id?: string | null
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
            foreignKeyName: "journal_items_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_summary: {
        Row: {
          allocated_amount: number | null
          amount: number | null
          bank_account_id: string | null
          bank_account_name: string | null
          bank_gl_account_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          organization_id: string | null
          party_id: string | null
          party_name: string | null
          party_type: string | null
          payment_date: string | null
          payment_method:
            | Database["public"]["Enums"]["accounting_payment_method"]
            | null
          payment_number: string | null
          payment_type:
            | Database["public"]["Enums"]["accounting_payment_type"]
            | null
          reference_number: string | null
          remarks: string | null
          unallocated_amount: number | null
          updated_at: string | null
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
            foreignKeyName: "accounting_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["bank_gl_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["bank_gl_account_id"]
            isOneToOne: false
            referencedRelation: "vw_account_balances"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_status: {
        Row: {
          current_farms: number | null
          current_parcels: number | null
          current_period_end: string | null
          current_period_start: string | null
          current_users: number | null
          has_advanced_reporting: boolean | null
          has_ai_recommendations: boolean | null
          has_analytics: boolean | null
          has_api_access: boolean | null
          has_priority_support: boolean | null
          has_sensor_integration: boolean | null
          id: string | null
          max_farms: number | null
          max_parcels: number | null
          max_satellite_reports: number | null
          max_users: number | null
          organization_id: string | null
          organization_name: string | null
          status: string | null
          subscription_tier: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_summary: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          category_id: string | null
          completed_date: string | null
          created_at: string | null
          crop_id: string | null
          description: string | null
          due_date: string | null
          estimated_duration: number | null
          farm_id: string | null
          farm_name: string | null
          id: string | null
          notes: string | null
          organization_id: string | null
          parcel_id: string | null
          parcel_name: string | null
          priority: string | null
          status: string | null
          title: string | null
          updated_at: string | null
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
            foreignKeyName: "tasks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_account_balances: {
        Row: {
          account_subtype: string | null
          account_type: string | null
          balance: number | null
          code: string | null
          id: string | null
          name: string | null
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
        ]
      }
      vw_invoice_aging: {
        Row: {
          aging_bucket: string | null
          days_overdue: number | null
          due_date: string | null
          grand_total: number | null
          id: string | null
          invoice_date: string | null
          invoice_number: string | null
          invoice_type: Database["public"]["Enums"]["invoice_type"] | null
          organization_id: string | null
          outstanding_amount: number | null
          party_name: string | null
        }
        Insert: {
          aging_bucket?: never
          days_overdue?: never
          due_date?: string | null
          grand_total?: number | null
          id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          organization_id?: string | null
          outstanding_amount?: number | null
          party_name?: string | null
        }
        Update: {
          aging_bucket?: never
          days_overdue?: never
          due_date?: string | null
          grand_total?: number | null
          id?: string | null
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          organization_id?: string | null
          outstanding_amount?: number | null
          party_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ledger: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          account_type: string | null
          cost_center_id: string | null
          cost_center_name: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          entry_number: string | null
          entry_status:
            | Database["public"]["Enums"]["journal_entry_status"]
            | null
          farm_id: string | null
          id: string | null
          journal_entry_id: string | null
          organization_id: string | null
          parcel_id: string | null
          reference_id: string | null
          reference_type: string | null
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
            foreignKeyName: "cost_centers_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "journal_items_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_payment_history: {
        Row: {
          amount: number | null
          first_name: string | null
          full_name: string | null
          last_name: string | null
          organization_id: string | null
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          worker_id: string | null
        }
        Relationships: [
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
      calculate_performance_rating: {
        Args: { variance_percent: number }
        Returns: string
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
      create_role_from_template: {
        Args: { custom_name?: string; org_id: string; template_id: string }
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
      generate_lab_order_number: { Args: never; Returns: string }
      generate_payment_number: {
        Args: {
          p_organization_id: string
          p_payment_type: Database["public"]["Enums"]["accounting_payment_type"]
        }
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
      get_account_balance: {
        Args: {
          p_account_id: string
          p_as_of_date?: string
          p_organization_id?: string
        }
        Returns: number
      }
      get_account_balance_period: {
        Args: {
          p_account_id: string
          p_end_date: string
          p_organization_id?: string
          p_start_date: string
        }
        Returns: number
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
      get_planting_system_recommendations: {
        Args: { p_crop_category: string; p_crop_type?: string }
        Returns: {
          density_per_hectare: number
          description: string
          spacing: string
          system_type: string
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
      seed_chart_of_accounts: {
        Args: { currency_code?: string; org_id: string }
        Returns: undefined
      }
      update_expired_subscriptions: { Args: never; Returns: undefined }
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
      accounting_payment_type: "receive" | "pay" | "received" | "paid"
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
      journal_entry_status: "draft" | "submitted" | "posted" | "cancelled"
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
      accounting_payment_type: ["receive", "pay", "received", "paid"],
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
      journal_entry_status: ["draft", "submitted", "posted", "cancelled"],
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
