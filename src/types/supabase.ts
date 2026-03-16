// src/types/supabase.ts

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
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'agent' | 'viewer'
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'agent' | 'viewer'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'agent' | 'viewer'
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          status: 'new' | 'contacted' | 'qualified' | 'visiting' | 'proposal' | 'negotiation' | 'closed' | 'lost'
          source: string | null
          notes: string | null
          assigned_to: string | null
          value: number | null
          is_subscribed?: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'visiting' | 'proposal' | 'negotiation' | 'closed' | 'lost'
          source?: string | null
          notes?: string | null
          assigned_to?: string | null
          value?: number | null
          is_subscribed?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          company?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'visiting' | 'proposal' | 'negotiation' | 'closed' | 'lost'
          source?: string | null
          notes?: string | null
          assigned_to?: string | null
          value?: number | null
          is_subscribed?: boolean
        }
      }
      inventory: {
        Row: {
          id: string
          created_at: string
          modelo: string
          numero_vivienda: string
          superficie_parcela: number
          superficie_util: number
          superficie_construida: number
          habitaciones: number
          banos: number
          precio: number
        }
        Insert: {
          id?: string
          created_at?: string
          modelo: string
          numero_vivienda: string
          superficie_parcela: number
          superficie_util: number
          superficie_construida: number
          habitaciones: number
          banos: number
          precio: number
        }
        Update: {
          id?: string
          created_at?: string
          modelo?: string
          numero_vivienda?: string
          superficie_parcela?: number
          superficie_util?: number
          superficie_construida?: number
          habitaciones?: number
          banos?: number
          precio?: number
        }
      }
      agenda: {
        Row: {
          id: number
          created_at: string
          lead_id: string | null
          title: string
          type: 'Llamada' | 'Email' | 'WhatsApp' | 'Visita' | 'Reunión'
          due_date: string
          completed: boolean
          user_id: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          lead_id?: string | null
          title: string
          type: 'Llamada' | 'Email' | 'WhatsApp' | 'Visita' | 'Reunión'
          due_date: string
          completed?: boolean
          user_id?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          lead_id?: string | null
          title?: string
          type?: 'Llamada' | 'Email' | 'WhatsApp' | 'Visita' | 'Reunión'
          due_date?: string
          completed?: boolean
          user_id?: string | null
        }
      }
      newsletters: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          subject: string
          design: Json | null
          html_content: string | null
          status: 'draft' | 'sent'
          sent_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          subject: string
          design?: Json | null
          html_content?: string | null
          status?: 'draft' | 'sent'
          sent_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          subject?: string
          design?: Json | null
          html_content?: string | null
          status?: 'draft' | 'sent'
          sent_at?: string | null
        }
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