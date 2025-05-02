import { CalendarEventType } from '@shared/schema';
import { format, startOfDay, endOfDay, addDays, parseISO } from 'date-fns';
import { auth } from '@/lib/firebase-setup';
import { getIdToken } from 'firebase/auth';
import { getStoredOAuthToken, getGoogleCalendarToken } from '@/lib/firebase';

// Internal function for handling token refresh if needed
const makeCalendarRequest = async (url: string, retryCount = 0): Promise<any> => {
  const MAX_RETRIES = 1; // Only retry once to avoid infinite loops
  
  try {
    // First attempt to make request with credentials from session
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // If unauthorized (401) and we have a user logged in, we need to handle token refresh
    if (response.status === 401 && auth.currentUser) {
      const responseData = await response.json();
      
      // Only attempt refresh if token expired or missing (not if other auth issues)
      if (responseData.code === 'TOKEN_EXPIRED' || responseData.code === 'TOKEN_MISSING') {
        console.log('Token expired or missing, attempting token refresh flow...');
        
        try {
          // Try to get a fresh token using our enhanced token refresh flow
          const freshToken = await getGoogleCalendarToken();
          
          if (freshToken) {
            console.log('Successfully obtained fresh OAuth token, sending to server...');
            
            // Get a fresh Firebase ID token for authentication with our server
            const idToken = await getIdToken(auth.currentUser, true);
            
            // Send the fresh token to our backend
            const tokenResponse = await fetch('/api/auth/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                oauthToken: freshToken,  // The fresh OAuth token for Google Calendar API
                idToken,                 // Firebase ID token for our server auth
                user: {
                  uid: auth.currentUser.uid,
                  displayName: auth.currentUser.displayName,
                  email: auth.currentUser.email,
                  photoURL: auth.currentUser.photoURL
                }
              }),
              credentials: 'include'
            });
            
            if (!tokenResponse?.ok) {
              console.error('Failed to update token on server:', await tokenResponse.text());
              throw new Error('Failed to update token on server');
            }
            
            console.log('Server token updated successfully, retrying original request...');
            
            // Retry the original request now with the fresh token in the session
            // Only retry once to avoid infinite loops
            if (retryCount < MAX_RETRIES) {
              return makeCalendarRequest(url, retryCount + 1);
            } else {
              throw new Error('Max retries exceeded');
            }
          } else {
            // No valid token available and refresh failed
            console.warn('Could not get a fresh OAuth token - user needs to re-authenticate');
            throw new Error('OAUTH_EXPIRED');
          }
        } catch (refreshError) {
          console.error('Error during token refresh flow:', refreshError);
          
          // If the error is specifically that OAuth is expired, pass it through
          if (refreshError instanceof Error && refreshError.message === 'OAUTH_EXPIRED') {
            throw refreshError;
          }
          
          throw new Error('Failed to refresh authentication');
        }
      }
      
      // If it's not a token issue or refresh failed
      throw new Error(`Authentication required: ${responseData.message}`);
    }
    
    // For non-401 errors
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Calendar API request error:', error);
    throw error;
  }
};

// Fetch calendar events from Google Calendar API through our backend proxy
export const fetchCalendarEvents = async (date: Date): Promise<CalendarEventType[]> => {
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);
  
  const formattedStartDate = encodeURIComponent(startDate.toISOString());
  const formattedEndDate = encodeURIComponent(endDate.toISOString());
  
  try {
    const url = `/api/calendar/events?timeMin=${formattedStartDate}&timeMax=${formattedEndDate}`;
    const data = await makeCalendarRequest(url);
    return data.events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Get calendar events for a range (useful for analytics)
export const fetchCalendarEventsRange = async (
  startDate: Date,
  endDate: Date
): Promise<CalendarEventType[]> => {
  const formattedStartDate = encodeURIComponent(startDate.toISOString());
  const formattedEndDate = encodeURIComponent(endDate.toISOString());
  
  try {
    const url = `/api/calendar/events?timeMin=${formattedStartDate}&timeMax=${formattedEndDate}`;
    const data = await makeCalendarRequest(url);
    return data.events;
  } catch (error) {
    console.error('Error fetching calendar events range:', error);
    throw error;
  }
};

// Helper functions for calendar events
export const getEventDuration = (event: CalendarEventType): number => {
  const start = parseISO(event.start.dateTime);
  const end = parseISO(event.end.dateTime);
  return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
};

export const calculateCalendarStats = (events: CalendarEventType[]) => {
  const totalMeetings = events.length;
  const totalDuration = events.reduce((acc, event) => acc + getEventDuration(event), 0);
  const averageDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0;
  
  return {
    totalMeetings,
    totalDuration,
    averageDuration,
  };
};

// Add a new calendar event
export const addCalendarEvent = async (
  summary: string,
  start: {
    dateTime: string;
    timeZone?: string;
  },
  end: {
    dateTime: string;
    timeZone?: string;
  },
  description?: string,
  location?: string
): Promise<CalendarEventType> => {
  try {
    // Make sure we have a valid token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Get tokens for authentication with our server
    const idToken = await getIdToken(user, true);
    const oauthToken = await getGoogleCalendarToken();
    
    if (!oauthToken) {
      throw new Error('Google Calendar access token required');
    }
    
    // First ensure our server has the latest tokens
    await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oauthToken, 
        idToken,
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        }
      }),
      credentials: 'include'
    });
    
    // Now create the event
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        description,
        location,
        start,
        end
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create event');
    }
    
    const data = await response.json();
    return data.event;
  } catch (error) {
    console.error('Error adding calendar event:', error);
    throw error;
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  try {
    // Make sure we have a valid token
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Authentication required');
    }
    
    // Get tokens for authentication with our server
    const idToken = await getIdToken(user, true);
    const oauthToken = await getGoogleCalendarToken();
    
    if (!oauthToken) {
      throw new Error('Google Calendar access token required');
    }
    
    // First ensure our server has the latest tokens
    await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oauthToken, 
        idToken,
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        }
      }),
      credentials: 'include'
    });
    
    // Now delete the event
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete event');
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

// Format events by hour for day view
export const organizeEventsByHour = (events: CalendarEventType[], date: Date) => {
  // Create time slots for every hour from 6am to 9pm
  const startHour = 6; // 6am
  const endHour = 21; // 9pm
  
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);
  
  const timeSlots = hours.map(hour => {
    // Create a new date object to avoid modifying the original date
    const hourDate = new Date(date);
    hourDate.setHours(hour, 0, 0, 0);
    return {
      hour,
      time: format(hourDate, 'h:mm a'),
      events: [] as CalendarEventType[]
    };
  });
  
  // Assign events to their respective time slots
  events.forEach(event => {
    // Skip events without dateTime field (all-day events use 'date' instead of 'dateTime')
    if (!event.start.dateTime) {
      return;
    }
    
    const startTime = parseISO(event.start.dateTime);
    const eventStartHour = startTime.getHours();
    
    // Find the appropriate time slot
    const slotIndex = timeSlots.findIndex(slot => slot.hour === eventStartHour);
    
    if (slotIndex !== -1) {
      // Event falls within our displayed hours
      timeSlots[slotIndex].events.push(event);
    } else if (eventStartHour < startHour) {
      // Early morning events go into the first slot
      timeSlots[0].events.push(event);
    } else if (eventStartHour > endHour) {
      // Late night events go into the last slot
      timeSlots[timeSlots.length - 1].events.push(event);
    }
  });
  
  return timeSlots;
};

// Parse AI response for calendar action commands
export const parseAIActionCommand = (response: string): { 
  type: 'ADD_EVENT' | 'DELETE_EVENT' | null;
  data: any;
  message: string; 
} => {
  // Check if response contains an action command
  if (response.includes('ACTION:ADD_EVENT')) {
    // Extract JSON data
    const jsonMatch = response.match(/ACTION:ADD_EVENT\s*(\{[\s\S]*\})/);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        // Parse the JSON data
        const eventData = JSON.parse(jsonMatch[1]);
        
        // Get the regular message part (before the ACTION command)
        const messageParts = response.split('ACTION:ADD_EVENT');
        const message = messageParts[0].trim();
        
        return {
          type: 'ADD_EVENT',
          data: eventData,
          message
        };
      } catch (error) {
        console.error('Error parsing event JSON:', error);
      }
    }
  } else if (response.includes('ACTION:DELETE_EVENT')) {
    // Extract event ID
    const idMatch = response.match(/ACTION:DELETE_EVENT\s*([a-zA-Z0-9_]+)/);
    
    if (idMatch && idMatch[1]) {
      // Get the regular message part (before the ACTION command)
      const messageParts = response.split('ACTION:DELETE_EVENT');
      const message = messageParts[0].trim();
      
      return {
        type: 'DELETE_EVENT',
        data: { id: idMatch[1] },
        message
      };
    }
  }
  
  // No action command found
  return {
    type: null,
    data: null,
    message: response
  };
};
