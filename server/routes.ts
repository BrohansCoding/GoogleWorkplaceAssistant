import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { GroqChatRequest } from "@shared/schema";
import { getGroqCompletion } from "./groqApi";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { token, user } = req.body;
      
      if (!token || !user || !user.uid) {
        return res.status(400).json({ message: "Invalid request. Token and user data required." });
      }
      
      // Store user in session
      // TypeScript workaround for session properties
      if (req.session) {
        console.log("Storing user and token in session");
        (req.session as any).user = user;
        (req.session as any).googleToken = token;
        (req.session as any).tokenTimestamp = Date.now(); // Track token age
        
        // Verify storage
        console.log("Verifying token storage, token exists:", !!(req.session as any).googleToken);
      } else {
        console.log("Session object not available");
      }
      
      // Store in DB if needed
      // await storage.createOrUpdateUser({...});
      
      return res.status(200).json({ message: "Authentication successful", user });
    } catch (error) {
      console.error("Error authenticating with Google:", error);
      return res.status(500).json({ message: "Authentication failed" });
    }
  });
  
  // Endpoint for token refreshing
  app.post("/api/auth/token", async (req: Request, res: Response) => {
    try {
      const { token, user } = req.body;
      
      if (!token || !user || !user.uid) {
        return res.status(400).json({ message: "Invalid request. Token and user data required." });
      }
      
      if (req.session) {
        // Update token in session
        console.log("Updating token in session");
        (req.session as any).googleToken = token;
        (req.session as any).tokenTimestamp = Date.now(); // Track token age
        
        return res.status(200).json({ message: "Token updated successfully" });
      } else {
        console.log("Session object not available for token update");
        return res.status(500).json({ message: "Session not available" });
      }
    } catch (error) {
      console.error("Error updating token:", error);
      return res.status(500).json({ message: "Failed to update token" });
    }
  });
  
  app.post("/api/auth/signout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to sign out" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Successfully signed out" });
    });
  });
  
  // Google Calendar API proxy
  app.get("/api/calendar/events", async (req: Request, res: Response) => {
    try {
      const { timeMin, timeMax } = req.query;
      
      // Get token from session, handle possible TS errors with type assertion
      const token = (req.session as any)?.googleToken as string | undefined;
      const tokenTimestamp = (req.session as any)?.tokenTimestamp as number | undefined;
      
      // Log session information for debugging
      console.log("\n=========== CALENDAR API REQUEST ===========");
      console.log("Session object:", req.session ? "exists" : "missing");
      console.log("Session content:", Object.keys(req.session || {}));
      console.log("Session ID:", req.sessionID || "no session ID");
      
      console.log("\nCalendar API request details:");
      console.log("- Token available:", !!token);
      console.log("- Token type:", token ? typeof token : "N/A");
      console.log("- Token length:", token ? token.length : "N/A");
      console.log("- Token age (minutes):", tokenTimestamp ? Math.floor((Date.now() - tokenTimestamp) / (1000 * 60)) : "unknown");
      console.log("- Query params:", { timeMin, timeMax });
      
      if (!token) {
        return res.status(401).json({ message: "Authentication required", code: "TOKEN_MISSING" });
      }
      
      // Check if token is likely expired (tokens typically last 60 minutes)
      if (tokenTimestamp && (Date.now() - tokenTimestamp) > 55 * 60 * 1000) { // 55 min threshold
        console.log("Token appears to be expired or close to expiration");
        return res.status(401).json({ message: "Token needs refresh", code: "TOKEN_EXPIRED" });
      }
      
      // Fetch events from Google Calendar API
      console.log("Fetching events from Google Calendar API...");
      console.log("Authorization header:", `Bearer ${token.substring(0, 10)}...`);
      
      const response = await axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 100
        },
      });
      
      console.log(`Retrieved ${response.data.items?.length || 0} events`);
      
      // Handle empty response
      if (!response.data.items || response.data.items.length === 0) {
        console.log("No events found in the specified time range");
        return res.status(200).json({ events: [] });
      }
      
      // Log sample event for debugging
      if (response.data.items.length > 0) {
        const sampleEvent = response.data.items[0];
        console.log("\nSample event structure:");
        console.log("- ID:", sampleEvent.id);
        console.log("- Summary:", sampleEvent.summary);
        console.log("- Start:", JSON.stringify(sampleEvent.start));
        console.log("- End:", JSON.stringify(sampleEvent.end));
        console.log("- Has dateTime:", !!sampleEvent.start.dateTime);
        console.log("- Has date (all day):", !!sampleEvent.start.date);
      }
      
      // Transform events to our format
      const events = response.data.items.map((event: any) => {
        // Handle all-day events which use 'date' instead of 'dateTime'
        let start = event.start;
        let end = event.end;
        
        // Convert all-day events to have dateTime format
        if (event.start.date && !event.start.dateTime) {
          const startDate = new Date(event.start.date);
          const endDate = new Date(event.end.date);
          
          // Set to 9:00 AM for all-day events
          startDate.setHours(9, 0, 0, 0);
          // End time is the start of the next day in all-day events, so subtract 1 day and set to 5:00 PM
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(17, 0, 0, 0);
          
          start = {
            dateTime: startDate.toISOString(),
            timeZone: event.start.timeZone
          };
          
          end = {
            dateTime: endDate.toISOString(),
            timeZone: event.end.timeZone
          };
          
          console.log(`Converted all-day event: ${event.summary}`);
        }
        
        return {
          id: event.id,
          summary: event.summary || "Untitled Event",
          description: event.description || "",
          location: event.location || "",
          start: start,
          end: end,
          attendees: event.attendees || [],
          colorId: event.colorId || "0",
        };
      });
      
      console.log(`Successfully processed ${events.length} events (${events.filter(e => e.start.dateTime).length} with dateTime, ${events.length - events.filter(e => e.start.dateTime).length} all-day)`);
      return res.status(200).json({ events });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          data: error.response?.data
        });
        
        if (error.response?.status === 401) {
          return res.status(401).json({ 
            message: "Google Calendar token expired", 
            code: "TOKEN_EXPIRED"
          });
        }
      }
      
      // Handle unknown error types safely
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ 
        message: "Failed to fetch calendar events",
        error: errorMessage
      });
    }
  });
  
  // Groq API proxy for AI assistant
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { messages, calendarSummary } = req.body as GroqChatRequest;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      // Generate system message with calendar context
      const eventsCount = calendarSummary.events?.length || 0;
      const eventsSummary = calendarSummary.events
        ?.map(e => `- ${e.summary}: ${new Date(e.start.dateTime).toLocaleString()} to ${new Date(e.end.dateTime).toLocaleString()}`)
        .join("\n");
      
      const systemMessage = `You are a helpful Calendar Assistant that helps users manage their time effectively. 
      You have access to the user's Google Calendar data.
      
      Current Calendar Summary:
      ${eventsCount > 0 ? `The user has ${eventsCount} events in the selected time period.
      ${eventsSummary}` : "The user has no events in the selected time period."}
      
      ${calendarSummary.stats ? `
      Calendar Statistics:
      - Total meetings in last 4 weeks: ${calendarSummary.stats.totalMeetings}
      - Total meeting time: ${Math.round(calendarSummary.stats.totalDuration / 60)} hours
      - Average meeting duration: ${Math.round(calendarSummary.stats.averageDuration)} minutes
      ` : ""}
      
      Please provide helpful insights, suggestions, and responses based on the user's calendar data.`;
      
      // Get response from Groq
      const assistantResponse = await getGroqCompletion(systemMessage, messages);
      
      return res.status(200).json({ response: assistantResponse });
    } catch (error) {
      console.error("Error getting AI response:", error);
      return res.status(500).json({ message: "Failed to get assistant response" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
