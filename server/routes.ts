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
      // Get tokens with clear names
      const { 
        oauthToken,    // OAuth token specifically for Google Calendar API
        refreshToken,  // OAuth refresh token for token renewal
        idToken,       // Firebase ID token for authentication
        token,         // Legacy/generic token parameter
        accessToken,   // Legacy parameter
        user
      } = req.body;
      
      // Determine which token to use for Google Calendar
      // Prioritize oauthToken, then fall back to less specific names
      const googleApiToken = oauthToken || accessToken || token;
      
      // Basic validation
      if (!user || !user.uid) {
        return res.status(400).json({ 
          message: "Invalid request. User data required.",
          details: { userDataReceived: !!user }
        });
      }
      
      console.log("Auth request received:");
      console.log("- User:", user.email || user.displayName || user.uid);
      console.log("- OAuth token for Google API:", googleApiToken ? `Present (${googleApiToken.length} chars)` : "Missing");
      console.log("- OAuth refresh token:", refreshToken ? `Present (${refreshToken.length} chars)` : "Missing");
      console.log("- Firebase ID token:", idToken ? `Present (${idToken.length} chars)` : "Missing");
      
      // Check token types for debugging (helps identify issues)
      if (googleApiToken) {
        // OAuth tokens are usually much shorter than JWT tokens
        const isLikelyOAuth = googleApiToken.length < 500 && !googleApiToken.includes('.');
        const isLikelyJWT = googleApiToken.split('.').length === 3;
        
        console.log("Google API token appears to be:", 
          isLikelyOAuth ? "OAuth token (correct for Calendar API)" : 
          isLikelyJWT ? "JWT token (INCORRECT for Calendar API)" : 
          "Unknown format"
        );
        
        if (isLikelyJWT) {
          console.warn("WARNING: Using a JWT token for Google Calendar API will fail!");
        }
      }
      
      // Store user and tokens in session
      if (req.session) {
        console.log("Storing user and tokens in session");
        (req.session as any).user = user;
        
        // Store tokens with explicit names
        if (googleApiToken) {
          console.log("Storing Google API OAuth token");
          (req.session as any).googleApiToken = googleApiToken;
          (req.session as any).tokenTimestamp = Date.now();
          
          // Also store refresh token if provided
          if (refreshToken) {
            console.log("Storing OAuth refresh token");
            (req.session as any).refreshToken = refreshToken;
          } else {
            console.log("No refresh token provided - token renewal won't be possible server-side");
          }
        } else {
          console.warn("No Google API OAuth token provided - Calendar API access will fail");
        }
        
        // Also store the Firebase ID token if provided
        if (idToken) {
          console.log("Storing Firebase ID token");
          (req.session as any).firebaseIdToken = idToken;
        }
        
        console.log("Session data stored successfully");
      } else {
        console.log("Session object not available");
        return res.status(500).json({ message: "Session storage unavailable" });
      }
      
      return res.status(200).json({ 
        message: "Authentication successful", 
        user,
        tokenStatus: {
          googleApiToken: !!googleApiToken,
          refreshToken: !!refreshToken,
          firebaseIdToken: !!idToken
        }
      });
    } catch (error) {
      console.error("Error authenticating with Google:", error);
      return res.status(500).json({ message: "Authentication failed" });
    }
  });
  
  // Endpoint for token updating (not refreshing)
  app.post("/api/auth/token", async (req: Request, res: Response) => {
    try {
      // Get tokens with clear names to avoid confusion
      const { 
        oauthToken,   // OAuth token for Google Calendar API
        idToken,      // Firebase ID token 
        token,        // Generic token (legacy support)
        accessToken,  // Legacy support
        user 
      } = req.body;
      
      // Determine which token to use for Google Calendar API
      // Prioritize explicitly named oauthToken
      const googleApiToken = oauthToken || accessToken || token;
      
      if (!user || !user.uid) {
        return res.status(400).json({ 
          message: "Invalid request. User data required.",
          details: { userDataReceived: !!user }
        });
      }
      
      console.log("Token refresh request received from:", user.email || user.displayName || user.uid);
      console.log("- OAuth token present:", !!googleApiToken);
      console.log("- OAuth token length:", googleApiToken?.length);
      console.log("- ID token present:", !!idToken);
      
      if (req.session) {
        // Update user in session
        console.log("Updating user data in session");
        (req.session as any).user = user;
        
        // Update Google API token if provided
        if (googleApiToken) {
          console.log("Updating Google API OAuth token");
          (req.session as any).googleApiToken = googleApiToken;
          (req.session as any).tokenTimestamp = Date.now();
          
          // Also update legacy token name for backward compatibility
          (req.session as any).googleToken = googleApiToken;
        }
        
        // Update Firebase ID token if provided
        if (idToken) {
          console.log("Updating Firebase ID token");
          (req.session as any).firebaseIdToken = idToken;
        }
        
        // Check token types to warn about potential issues
        if (googleApiToken) {
          const isLikelyJWT = googleApiToken.split('.').length === 3;
          if (isLikelyJWT) {
            console.warn("WARNING: Received a JWT token for Google Calendar API. This will likely fail!");
          }
        }
        
        console.log("Session updated successfully");
        return res.status(200).json({ 
          message: "Token updated successfully",
          tokenStatus: {
            googleApiToken: !!googleApiToken,
            firebaseIdToken: !!idToken
          }
        });
      } else {
        console.log("Session object not available for token update");
        return res.status(500).json({ message: "Session not available" });
      }
    } catch (error) {
      console.error("Error updating token:", error);
      return res.status(500).json({ message: "Failed to update token" });
    }
  });
  
  // Endpoint for OAuth token refresh using refresh token
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const { 
        refreshToken,  // OAuth refresh token for Google Calendar API
        idToken,       // Firebase ID token for authentication
        user 
      } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ 
          message: "Refresh token required",
          code: "REFRESH_TOKEN_MISSING"
        });
      }
      
      if (!user || !user.uid) {
        return res.status(400).json({ 
          message: "Invalid request. User data required.",
          details: { userDataReceived: !!user }
        });
      }
      
      console.log("OAuth token refresh request received from:", user.email || user.displayName || user.uid);
      console.log("- Refresh token present:", !!refreshToken);
      console.log("- Refresh token length:", refreshToken?.length);
      
      try {
        // Call Google's token endpoint to refresh the access token
        // This must be done server-side as it requires client secret
        const response = await axios.post(
          "https://oauth2.googleapis.com/token",
          {
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token"
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          }
        );
        
        // Extract the new access token from the response
        const newAccessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        
        if (!newAccessToken) {
          console.error("No access token in refresh response:", response.data);
          return res.status(500).json({ 
            message: "Failed to refresh token: no access token returned",
            code: "REFRESH_FAILED"
          });
        }
        
        console.log("Successfully refreshed OAuth token");
        console.log("- New access token length:", newAccessToken.length);
        console.log("- Token expires in:", expiresIn, "seconds");
        
        // Store the new token in session
        if (req.session) {
          console.log("Updating session with new access token");
          (req.session as any).user = user;
          (req.session as any).googleApiToken = newAccessToken;
          (req.session as any).tokenTimestamp = Date.now();
          
          // Also update legacy token name for backward compatibility
          (req.session as any).googleToken = newAccessToken;
          
          // Update Firebase ID token if provided
          if (idToken) {
            console.log("Updating Firebase ID token");
            (req.session as any).firebaseIdToken = idToken;
          }
        } else {
          console.log("Session object not available for token update");
        }
        
        // Return the new access token to the client
        return res.status(200).json({
          message: "Token refreshed successfully",
          oauthToken: newAccessToken,
          expiresIn: expiresIn,
          tokenStatus: {
            googleApiToken: true,
            firebaseIdToken: !!idToken
          }
        });
      } catch (refreshError) {
        console.error("Error refreshing OAuth token:", refreshError);
        
        // Handle specific Google API errors
        if (axios.isAxiosError(refreshError) && refreshError.response) {
          console.error("Google API error details:", {
            status: refreshError.response.status,
            data: refreshError.response.data
          });
          
          if (refreshError.response.status === 400 && 
              refreshError.response.data.error === "invalid_grant") {
            // The refresh token is invalid or expired
            return res.status(401).json({
              message: "Refresh token is invalid or expired",
              code: "INVALID_REFRESH_TOKEN"
            });
          }
        }
        
        return res.status(500).json({
          message: "Failed to refresh OAuth token",
          code: "REFRESH_ERROR",
          error: refreshError instanceof Error ? refreshError.message : String(refreshError)
        });
      }
    } catch (error) {
      console.error("Error in refresh endpoint:", error);
      return res.status(500).json({ 
        message: "Error processing refresh request",
        error: error instanceof Error ? error.message : String(error)
      });
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
      
      // Get tokens from session
      let token = (req.session as any)?.googleApiToken || (req.session as any)?.googleToken as string | undefined;
      const refreshToken = (req.session as any)?.refreshToken as string | undefined;
      const tokenTimestamp = (req.session as any)?.tokenTimestamp as number | undefined;
      const user = (req.session as any)?.user;
      
      // Log session information for debugging
      console.log("\n=========== CALENDAR API REQUEST ===========");
      console.log("Session object:", req.session ? "exists" : "missing");
      console.log("Session content:", Object.keys(req.session || {}));
      console.log("Session ID:", req.sessionID || "no session ID");
      
      console.log("\nCalendar API request details:");
      console.log("- Access token available:", !!token);
      console.log("- Refresh token available:", !!refreshToken);
      console.log("- User in session:", !!user);
      console.log("- Token type:", token ? typeof token : "N/A");
      console.log("- Token length:", token ? token.length : "N/A");
      console.log("- Token age (minutes):", tokenTimestamp ? Math.floor((Date.now() - tokenTimestamp) / (1000 * 60)) : "unknown");
      console.log("- Token prefix:", token ? `${token.substring(0, 20)}...` : "N/A");
      console.log("- Query params:", { timeMin, timeMax });
      
      if (token) {
        // Check if token looks like a JWT (Firebase) or OAuth token
        const isJwt = token.split('.').length === 3;
        console.log("- Token appears to be:", isJwt ? "JWT (Firebase ID token)" : "OAuth access token");
        console.log("- WARNING:", isJwt ? "JWT tokens cannot be used for Google Calendar API!" : "Token format looks correct for OAuth");
      }
      
      // If no token or token is expired, try to refresh it if we have a refresh token
      if (!token || (tokenTimestamp && (Date.now() - tokenTimestamp) > 55 * 60 * 1000)) {
        console.log("Token missing or expired");
        
        // Check if we have a refresh token and user data to perform a refresh
        if (refreshToken && user) {
          console.log("Attempting to refresh the token server-side");
          
          try {
            // Call Google's token endpoint to refresh the access token
            const response = await axios.post(
              "https://oauth2.googleapis.com/token",
              {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: "refresh_token"
              },
              {
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded"
                }
              }
            );
            
            // Extract the new access token from the response
            const newAccessToken = response.data.access_token;
            
            if (!newAccessToken) {
              console.error("No access token in refresh response");
              return res.status(401).json({ 
                message: "Failed to refresh token automatically", 
                code: "TOKEN_REFRESH_FAILED" 
              });
            }
            
            console.log("Successfully refreshed token automatically!");
            console.log("- New token length:", newAccessToken.length);
            
            // Update the token in session
            (req.session as any).googleApiToken = newAccessToken;
            (req.session as any).googleToken = newAccessToken; // For backward compatibility
            (req.session as any).tokenTimestamp = Date.now();
            
            // Continue with the new token
            token = newAccessToken;
          } catch (refreshError) {
            console.error("Error automatically refreshing token:", refreshError);
            return res.status(401).json({ 
              message: "Authentication required - token refresh failed", 
              code: "TOKEN_REFRESH_FAILED" 
            });
          }
        } else {
          // No refresh token or user data available
          if (!token) {
            return res.status(401).json({ message: "Authentication required", code: "TOKEN_MISSING" });
          } else {
            return res.status(401).json({ message: "Token expired", code: "TOKEN_EXPIRED" });
          }
        }
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
      
      console.log(`Successfully processed ${events.length} events (${events.filter((e: any) => e.start.dateTime).length} with dateTime, ${events.length - events.filter((e: any) => e.start.dateTime).length} all-day)`);
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
