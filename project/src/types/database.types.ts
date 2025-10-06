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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      inventory_items: {
        Row: {
          category: string | null
          cost_per_unit: number | null
          created_at: string
          farm_id: string | null
          id: string
          location: string | null
          minimum_stock: number | null
          name: string
          notes: string | null
          organization_id: string
          quantity: number
          supplier: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          farm_id?: string | null
          id?: string
          location?: string | null
          minimum_stock?: number | null
          name: string
          notes?: string | null
          organization_id: string
          quantity?: number
          supplier?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number | null
          created_at?: string
          farm_id?: string | null
          id?: string
          location?: string | null
          minimum_stock?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          supplier?: string | null
          unit?: string
          updated_at?: string
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
          description: string | null
          farm_id: string | null
          id: string
          irrigation_type: string | null
          name: string
          perimeter: number | null
          planting_date: string | null
          planting_density: number | null
          planting_type: string | null
          soil_type: string | null
          updated_at: string | null
          variety: string | null
        }
        Insert: {
          area?: number | null
          area_unit?: string | null
          boundary?: Json | null
          calculated_area?: number | null
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          irrigation_type?: string | null
          name: string
          perimeter?: number | null
          planting_date?: string | null
          planting_density?: number | null
          planting_type?: string | null
          soil_type?: string | null
          updated_at?: string | null
          variety?: string | null
        }
        Update: {
          area?: number | null
          area_unit?: string | null
          boundary?: Json | null
          calculated_area?: number | null
          created_at?: string | null
          description?: string | null
          farm_id?: string | null
          id?: string
          irrigation_type?: string | null
          name?: string
          perimeter?: number | null
          planting_date?: string | null
          planting_density?: number | null
          planting_type?: string | null
          soil_type?: string | null
          updated_at?: string | null
          variety?: string | null
        }
        Relationships: []
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
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "task_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_duration: number | null
          assigned_to: string | null
          category_id: string
          completed_date: string | null
          created_at: string | null
          crop_id: string | null
          description: string | null
          due_date: string | null
          estimated_duration: number | null
          farm_id: string
          id: string
          notes: string | null
          parcel_id: string | null
          priority: string | null
          status: string | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_duration?: number | null
          assigned_to?: string | null
          category_id: string
          completed_date?: string | null
          created_at?: string | null
          crop_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          farm_id: string
          id?: string
          notes?: string | null
          parcel_id?: string | null
          priority?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_duration?: number | null
          assigned_to?: string | null
          category_id?: string
          completed_date?: string | null
          created_at?: string | null
          crop_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          farm_id?: string
          id?: string
          notes?: string | null
          parcel_id?: string | null
          priority?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
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
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
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
          created_at: string | null
          farm_id: string
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          notes: string | null
          payment_status: string | null
          task_description: string
          total_payment: number | null
          updated_at: string | null
          work_date: string
          worker_id: string | null
          worker_type: string
        }
        Insert: {
          created_at?: string | null
          farm_id: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          task_description: string
          total_payment?: number | null
          updated_at?: string | null
          work_date: string
          worker_id?: string | null
          worker_type: string
        }
        Update: {
          created_at?: string | null
          farm_id?: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          notes?: string | null
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
          {
            foreignKeyName: "workers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "subscription_status"
            referencedColumns: ["organization_id"]
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
          compensation_display: string | null
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
          total_tasks_completed: number | null
          updated_at: string | null
          worker_type: Database["public"]["Enums"]["worker_type"] | null
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
          {
            foreignKeyName: "workers_organization_id_fkey"
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
      can_add_user: {
        Args: { org_id: string }
        Returns: boolean
      }
      can_create_farm: {
        Args: { org_id: string }
        Returns: boolean
      }
      can_create_parcel: {
        Args: { org_id: string }
        Returns: boolean
      }
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
      delete_all_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      delete_user_cascade: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      enforce_subscription_on_session: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_profile: {
        Args: Record<PropertyKey, never>
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
      has_feature_access: {
        Args: { feature_name: string; org_id: string }
        Returns: boolean
      }
      has_valid_subscription: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_active_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_system_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      update_expired_subscriptions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      analysis_type: "soil" | "plant" | "water"
      calculation_basis: "gross_revenue" | "net_revenue"
      metayage_type: "khammass" | "rebaa" | "tholth" | "custom"
      payment_frequency: "monthly" | "daily" | "per_task" | "harvest_share"
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
      analysis_type: ["soil", "plant", "water"],
      calculation_basis: ["gross_revenue", "net_revenue"],
      metayage_type: ["khammass", "rebaa", "tholth", "custom"],
      payment_frequency: ["monthly", "daily", "per_task", "harvest_share"],
      worker_type: ["fixed_salary", "daily_worker", "metayage"],
    },
  },
} as const
