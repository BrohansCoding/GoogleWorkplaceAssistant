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
      req.session.user = user;
      req.session.googleToken = token;
      
      // Store in DB if needed
      // await storage.createOrUpdateUser({...});
      
      return res.status(200).json({ message: "Authentication successful", user });
    } catch (error) {
      console.error("Error authenticating with Google:", error);
      return res.status(500).json({ message: "Authentication failed" });
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
      const token = req.session.googleToken;
      
      console.log("Calendar API request received:");
      console.log("- Token available:", !!token);
      console.log("- Query params:", { timeMin, timeMax });
      
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Fetch events from Google Calendar API
      console.log("Fetching events from Google Calendar API...");
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
      
      // Transform events to our format
      const events = response.data.items.map((event: any) => ({
        id: event.id,
        summary: event.summary || "Untitled Event",
        description: event.description || "",
        location: event.location || "",
        start: event.start,
        end: event.end,
        attendees: event.attendees || [],
        colorId: event.colorId || "0",
      }));
      
      console.log(`Successfully processed ${events.length} events`);
      return res.status(200).json({ events });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          data: error.response?.data
        });
        
        if (error.response?.status === 401) {
          return res.status(401).json({ message: "Google Calendar token expired" });
        }
      }
      
      return res.status(500).json({ 
        message: "Failed to fetch calendar events",
        error: error.message
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
