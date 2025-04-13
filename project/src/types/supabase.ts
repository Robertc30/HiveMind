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
      messages: {
        Row: {
          id: string
          room_id: string
          username: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          username: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          username?: string
          content?: string
          created_at?: string
        }
      }
      presence: {
        Row: {
          id: string
          room_id: string
          username: string
          last_seen: string
        }
        Insert: {
          id?: string
          room_id: string
          username: string
          last_seen?: string
        }
        Update: {
          id?: string
          room_id?: string
          username?: string
          last_seen?: string
        }
      }
    }
  }
}