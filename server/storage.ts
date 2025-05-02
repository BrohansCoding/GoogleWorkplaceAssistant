import { 
  users, type User, type InsertUser,
  chatMessages, type ChatMessage, type InsertChatMessage,
  calendarEvents, type CalendarEvent, type InsertCalendarEvent
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserToken(id: number, accessToken: string, refreshToken?: string): Promise<User | undefined>;
  
  // Chat methods
  getChatMessages(userId: number, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Calendar methods
  getCalendarEvents(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatMessages: Map<number, ChatMessage>;
  private calendarEvents: Map<number, CalendarEvent>;
  private currentUserId: number;
  private currentMessageId: number;
  private currentEventId: number;

  constructor() {
    this.users = new Map();
    this.chatMessages = new Map();
    this.calendarEvents = new Map();
    this.currentUserId = 1;
    this.currentMessageId = 1;
    this.currentEventId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserToken(id: number, accessToken: string, refreshToken?: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { 
      ...user, 
      accessToken,
      ...(refreshToken ? { refreshToken } : {})
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Chat methods
  async getChatMessages(userId: number, limit = 50): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-limit);
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.currentMessageId++;
    const newMessage: ChatMessage = { 
      ...message, 
      id,
      timestamp: new Date() 
    };
    
    this.chatMessages.set(id, newMessage);
    return newMessage;
  }
  
  // Calendar methods
  async getCalendarEvents(userId: number, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values())
      .filter(event => 
        event.userId === userId && 
        event.startTime && 
        event.startTime >= startDate && 
        event.startTime <= endDate
      )
      .sort((a, b) => a.startTime!.getTime() - b.startTime!.getTime());
  }
  
  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.currentEventId++;
    const newEvent: CalendarEvent = { ...event, id };
    
    this.calendarEvents.set(id, newEvent);
    return newEvent;
  }
}

// Create and export storage instance
export const storage = new MemStorage();
