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
          n_orden: string
          planta: string
          portal: string
          letra: string
          orientacion: string
          dormitorios: number
          banos: number
          sup_util: number
          sup_construida: number
          sup_terrazas: number
          sup_porche: number
          garaje: string
          trastero: string
          precio: number
          estado_vivienda: string
        }
        Insert: {
          id?: string
          created_at?: string
          n_orden: string
          planta: string
          portal?: string
          letra?: string
          orientacion?: string
          dormitorios?: number
          banos?: number
          sup_util?: number
          sup_construida?: number
          sup_terrazas?: number
          sup_porche?: number
          garaje?: string
          trastero?: string
          precio: number
          estado_vivienda?: string
        }
        Update: {
          id?: string
          created_at?: string
          n_orden?: string
          planta?: string
          portal?: string
          letra?: string
          orientacion?: string
          dormitorios?: number
          banos?: number
          sup_util?: number
          sup_construida?: number
          sup_terrazas?: number
          sup_porche?: number
          garaje?: string
          trastero?: string
          precio?: number
          estado_vivienda?: string
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
  }
}