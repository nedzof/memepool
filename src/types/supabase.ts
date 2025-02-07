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
      posts: {
        Row: {
          txid: string
          amount: number
          content: string
          media_url: string | null
          locked_until: number
          handle_id: string
          created_at: string
        }
        Insert: {
          txid: string
          amount: number
          content: string
          media_url?: string | null
          locked_until: number
          handle_id: string
          created_at?: string
        }
        Update: {
          txid?: string
          amount?: number
          content?: string
          media_url?: string | null
          locked_until?: number
          handle_id?: string
          created_at?: string
        }
      }
      locklikes: {
        Row: {
          txid: string
          amount: number
          locked_until: number
          created_at: string
        }
        Insert: {
          txid: string
          amount: number
          locked_until: number
          created_at?: string
        }
        Update: {
          txid?: string
          amount?: number
          locked_until?: number
          created_at?: string
        }
      }
      creators: {
        Row: {
          handle: string
          created_at: string
        }
        Insert: {
          handle: string
          created_at?: string
        }
        Update: {
          handle?: string
          created_at?: string
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
  }
} 