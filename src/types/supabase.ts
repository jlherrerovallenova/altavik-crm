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
          secondary_email?: string | null
          phone: string | null
          company: string | null
          status: 'new' | 'contacted' | 'qualified' | 'visiting' | 'proposal' | 'negotiation' | 'closed' | 'lost'
          source: string | null
          notes: string | null
          assigned_to: string | null
          value: number | null
          is_subscribed?: boolean
          dni: string | null
          civil_status: string | null
          address: string | null
          postal_code: string | null
          city: string | null
          nationality: string | null
          occupation: string | null
          joint_buyer_name: string | null
          joint_buyer_dni: string | null
          joint_buyer_email: string | null
          joint_buyer_phone: string | null
          property_id: string | null
          province: string | null
          sale_status: string | null
          feedback_sent: boolean | null
          feedback_sent_at: string | null
          feedback_rating: string | null
          feedback_responded_at: string | null
          interest_bedrooms: string[] | null
          interest_floor: string[] | null
          client_quality_rating: number | null
          survey_data: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email?: string | null
          secondary_email?: string | null
          phone?: string | null
          company?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'visiting' | 'proposal' | 'negotiation' | 'closed' | 'lost'
          source?: string | null
          notes?: string | null
          assigned_to?: string | null
          value?: number | null
          is_subscribed?: boolean
          dni?: string | null
          civil_status?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          nationality?: string | null
          occupation?: string | null
          joint_buyer_name?: string | null
          joint_buyer_dni?: string | null
          joint_buyer_email?: string | null
          joint_buyer_phone?: string | null
          property_id?: string | null
          province?: string | null
          sale_status?: string | null
          interest_bedrooms?: string[] | null
          interest_floor?: string[] | null
          client_quality_rating?: number | null
          survey_data?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string | null
          secondary_email?: string | null
          phone?: string | null
          company?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'visiting' | 'proposal' | 'negotiation' | 'closed' | 'lost'
          source?: string | null
          notes?: string | null
          assigned_to?: string | null
          value?: number | null
          is_subscribed?: boolean
          dni?: string | null
          civil_status?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          nationality?: string | null
          occupation?: string | null
          joint_buyer_name?: string | null
          joint_buyer_dni?: string | null
          joint_buyer_email?: string | null
          joint_buyer_phone?: string | null
          property_id?: string | null
          province?: string | null
          sale_status?: string | null
          interest_bedrooms?: string[] | null
          interest_floor?: string[] | null
          client_quality_rating?: number | null
          survey_data?: Json | null
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
          comentario: string | null
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
          comentario?: string | null
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
          comentario?: string | null
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
      sales: {
        Row: {
          id: string
          created_at: string
          lead_id: string
          property_id: string
          sale_status: 'reserva' | 'contrato' | 'mensualidades' | 'escrituracion' | 'completada'
          sale_price: number
          iva_percentage: number
          reservation_amount: number
          reservation_date: string | null
          contract_date: string | null
          escritura_date: string | null
          notes: string | null
          commission_percentage: number
        }
        Insert: {
          id?: string
          created_at?: string
          lead_id: string
          property_id: string
          sale_status?: 'reserva' | 'contrato' | 'mensualidades' | 'escrituracion' | 'completada'
          sale_price: number
          iva_percentage?: number
          reservation_amount?: number
          reservation_date?: string | null
          contract_date?: string | null
          escritura_date?: string | null
          notes?: string | null
          commission_percentage?: number
        }
        Update: {
          id?: string
          created_at?: string
          lead_id?: string
          property_id?: string
          sale_status?: 'reserva' | 'contrato' | 'mensualidades' | 'escrituracion' | 'completada'
          sale_price?: number
          iva_percentage?: number
          reservation_amount?: number
          reservation_date?: string | null
          contract_date?: string | null
          escritura_date?: string | null
          notes?: string | null
          commission_percentage?: number
        }
      }
      installments: {
        Row: {
          id: string
          created_at: string
          sale_id: string
          installment_number: number
          due_date: string
          amount: number
          paid: boolean
          paid_date: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          sale_id: string
          installment_number: number
          due_date: string
          amount: number
          paid?: boolean
          paid_date?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          sale_id?: string
          installment_number?: number
          due_date?: string
          amount?: number
          paid?: boolean
          paid_date?: string | null
        }
      }
      promoter_invoices: {
        Row: {
          id: string
          created_at: string
          sale_id: string
          milestone: 'reserva' | 'contrato' | 'escrituracion'
          amount: number
          invoice_number: string | null
          status: 'pending' | 'sent' | 'paid' | 'cancelled'
          issued_date: string | null
          paid_date: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          sale_id: string
          milestone: 'reserva' | 'contrato' | 'escrituracion'
          amount: number
          invoice_number?: string | null
          status?: 'pending' | 'sent' | 'paid' | 'cancelled'
          issued_date?: string | null
          paid_date?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          sale_id?: string
          milestone?: 'reserva' | 'contrato' | 'escrituracion'
          amount?: number
          invoice_number?: string | null
          status?: 'pending' | 'sent' | 'paid' | 'cancelled'
          issued_date?: string | null
          paid_date?: string | null
          notes?: string | null
        }
      }
      incoming_emails: {
        Row: {
          id: string
          created_at: string
          subject: string
          sender_name: string
          sender_email: string
          body: string
          date_received: string
          is_read: boolean
          is_processed: boolean
          tags: string[]
          lead_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          subject: string
          sender_name: string
          sender_email: string
          body: string
          date_received: string
          is_read?: boolean
          is_processed?: boolean
          tags?: string[]
          lead_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          subject?: string
          sender_name?: string
          sender_email?: string
          body?: string
          date_received?: string
          is_read?: boolean
          is_processed?: boolean
          tags?: string[]
          lead_id?: string | null
        }
      }
      lead_history: {
        Row: {
          id: string
          created_at: string
          lead_id: string
          user_id: string | null
          event_type: string
          description: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          lead_id: string
          user_id?: string | null
          event_type: string
          description: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          lead_id?: string
          user_id?: string | null
          event_type?: string
          description?: string
          metadata?: Json | null
        }
      }
      sent_documents: {
        Row: {
          id: string
          created_at: string
          lead_id: string
          doc_name: string
          method: string
          sent_at: string
          tracking_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          lead_id: string
          doc_name: string
          method: string
          sent_at?: string
          tracking_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          lead_id?: string
          doc_name?: string
          method?: string
          sent_at?: string
          tracking_id?: string | null
        }
      }
      email_tracking: {
        Row: {
          id: string
          created_at: string
          lead_id: string | null
          subject: string | null
          status: string
          opens_count: number
          first_opened_at: string | null
          last_opened_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          lead_id?: string | null
          subject?: string | null
          status?: string
          opens_count?: number
          first_opened_at?: string | null
          last_opened_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          lead_id?: string | null
          subject?: string | null
          status?: string
          opens_count?: number
          first_opened_at?: string | null
          last_opened_at?: string | null
        }
      }
      sale_documents: {
        Row: {
          id: string
          created_at: string
          sale_id: string
          name: string
          file_path: string
          document_type: string
          file_size: number
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          sale_id: string
          name: string
          file_path: string
          document_type: string
          file_size: number
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          sale_id?: string
          name?: string
          file_path?: string
          document_type?: string
          file_size?: number
          uploaded_by?: string | null
        }
      }
      whatsapp_templates: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          body: string
          category: 'system' | 'marketing'
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          body: string
          category: 'system' | 'marketing'
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          body?: string
          category?: 'system' | 'marketing'
          is_active?: boolean
        }
      }
      wa_conversations: {
        Row: {
          id: string
          created_at: string
          lead_id: string | null
          phone: string
          lead_name: string
          status: string
          last_message_at: string
          last_message_preview: string
          unread_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          lead_id?: string | null
          phone: string
          lead_name: string
          status?: string
          last_message_at?: string
          last_message_preview?: string
          unread_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          lead_id?: string | null
          phone?: string
          lead_name?: string
          status?: string
          last_message_at?: string
          last_message_preview?: string
          unread_count?: number
        }
      }
      wa_messages: {
        Row: {
          id: string
          created_at: string
          conversation_id: string
          wa_message_id: string | null
          direction: 'inbound' | 'outbound'
          content: string
          type: string
          template_name: string | null
          status: string
          sent_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          conversation_id: string
          wa_message_id?: string | null
          direction: 'inbound' | 'outbound'
          content: string
          type?: string
          template_name?: string | null
          status?: string
          sent_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          conversation_id?: string
          wa_message_id?: string | null
          direction?: 'inbound' | 'outbound'
          content?: string
          type?: string
          template_name?: string | null
          status?: string
          sent_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          created_at: string
          key: string
          value: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          key: string
          value?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          key?: string
          value?: string | null
        }
      }
    }
    Functions: {
      submit_lead_feedback: {
        Args: { p_lead_id: string; p_rating: string }
        Returns: void
      }
      submit_lead_survey: {
        Args: { p_lead_id: string; p_survey_data: Json }
        Returns: void
      }
      increment_email_open: {
        Args: { tracking_id: string }
        Returns: void
      }
    }
  }
}