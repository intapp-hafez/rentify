export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      deposits: {
        Row: {
          id: string
          contract_id: string
          tenant_id: string
          amount: number
          status: 'held' | 'returned' | 'deducted' | 'transferred'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          tenant_id: string
          amount: number
          status?: 'held' | 'returned' | 'deducted' | 'transferred'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          tenant_id?: string
          amount?: number
          status?: 'held' | 'returned' | 'deducted' | 'transferred'
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: 'admin' | 'manager' | 'tenant'
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'tenant'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'tenant'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      units: {
        Row: {
          id: string
          number: string | null
          title: string
          address: string | null
          type: string
          floor: string | null
          area: number | null
          rooms: number | null
          baths: number | null
          rent_price: number
          status: string
          city: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number?: string | null
          title: string
          address?: string | null
          type: string
          floor?: string | null
          area?: number | null
          rooms?: number | null
          baths?: number | null
          rent_price: number
          status?: string
          city?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string | null
          title?: string
          address?: string | null
          type: string
          floor?: string | null
          area?: number | null
          rooms?: number | null
          baths?: number | null
          rent_price?: number
          status?: string
          city?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          user_id: string | null
          full_name: string
          phone: string | null
          email: string | null
          civil_id: string | null
          job: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          full_name: string
          phone?: string | null
          email?: string | null
          civil_id?: string | null
          job?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          full_name?: string
          phone?: string | null
          email?: string | null
          civil_id?: string | null
          job?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      contracts: {
        Row: {
          id: string
          number: string | null
          unit_id: string
          tenant_id: string
          start_date: string
          end_date: string
          rent_amount: number
          deposit: number | null
          payment_frequency: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          number?: string | null
          unit_id: string
          tenant_id: string
          start_date: string
          end_date: string
          rent_amount: number
          deposit?: number | null
          payment_frequency?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          number?: string | null
          unit_id?: string
          tenant_id?: string
          start_date?: string
          end_date?: string
          rent_amount?: number
          deposit?: number | null
          payment_frequency?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          contract_id: string
          amount: number
          payment_date: string
          status: string
          receipt_url: string | null
          receipt_number: string | null
          payment_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          amount: number
          payment_date: string
          status?: string
          receipt_url?: string | null
          receipt_number?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          amount?: number
          payment_date?: string
          status?: string
          receipt_url?: string | null
          receipt_number?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      maintenance: {
        Row: {
          id: string
          number: string | null
          unit_id: string
          tenant_id: string
          description: string
          type: string | null
          priority: string | null
          status: string
          cost: number | null
          maintenance_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          number?: string | null
          unit_id: string
          tenant_id: string
          description?: string
          type?: string | null
          priority?: string | null
          status?: string
          cost?: number | null
          maintenance_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          number?: string | null
          unit_id?: string
          tenant_id?: string
          description?: string
          type?: string | null
          priority?: string | null
          status?: string
          cost?: number | null
          maintenance_date?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          value: string[]
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string[]
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          type: string
          value: number
          start_date: string
          end_date: string
          created_at: string
        }
        Insert: {
          id?: string
          type?: string
          value?: number
          start_date?: string
          end_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          value?: number
          start_date?: string
          end_date?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
