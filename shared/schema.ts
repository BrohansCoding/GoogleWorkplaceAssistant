import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // Firebase UID as primary external identifier
  firebaseUid: text("firebase_uid").notNull().unique(),
  // Optional username for future use
  username: text("username").unique(),
  // User profile info from Google
  displayName: text("display_name"),
  email: text("email"),
  photoURL: text("photo_url"),
  // Google Calendar integration tokens
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  // When the user was first created
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Last login time
  lastLoginAt: timestamp("last_login_at").notNull().defaultNow(),
});

// Chat history
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Calendar events (for caching)
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  googleEventId: text("google_event_id").notNull(),
  summary: text("summary"),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  attendees: jsonb("attendees"),
  colorId: text("color_id"),
});

// Define schemas and types for insertion
export const insertUserSchema = createInsertSchema(users).pick({
  firebaseUid: true,
  username: true,
  displayName: true,
  email: true,
  photoURL: true,
  accessToken: true,
  refreshToken: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  role: true,
  content: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  userId: true,
  googleEventId: true,
  summary: true,
  description: true,
  location: true,
  startTime: true,
  endTime: true,
  attendees: true,
  colorId: true,
});

// Types for the application
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Chat message format for the frontend
export interface ChatMessageType {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Calendar event format for the frontend
export interface CalendarEventType {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: string;
  }[];
  colorId?: string;
}

// API request types
export interface GroqChatRequest {
  messages: {
    role: string;
    content: string;
  }[];
  calendarSummary: {
    events: CalendarEventType[];
    stats?: {
      totalMeetings: number;
      totalDuration: number;
      averageDuration: number;
    };
  };
}
