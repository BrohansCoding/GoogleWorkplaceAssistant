import { CalendarEventType } from '@shared/schema';
import { format, startOfDay, endOfDay, addDays, parseISO } from 'date-fns';
import { auth } from '@/lib/firebase-setup';
import { getIdToken } from 'firebase/auth';

// Internal function for handling token refresh if needed
const makeCalendarRequest = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // If unauthorized and user is logged in, try to refresh the token and retry
    if (response.status === 401 && auth.currentUser) {
      const responseData = await response.json();
      
      // Only attempt refresh if token expired (not if other auth issues)
      if (responseData.code === 'TOKEN_EXPIRED' || responseData.code === 'TOKEN_MISSING') {
        console.log('Token expired, refreshing...');
        
        try {
          // Get a fresh ID token from Firebase
          const newToken = await getIdToken(auth.currentUser, true);
          
          // Send the refreshed token to our backend
          const tokenResponse = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: newToken, 
              user: {
                uid: auth.currentUser.uid,
                displayName: auth.currentUser.displayName,
                email: auth.currentUser.email,
                photoURL: auth.currentUser.photoURL
              }
            }),
            credentials: 'include'
          });
          
          if (!tokenResponse.ok) {
            throw new Error('Failed to refresh token on server');
          }
          
          // Retry the original request now that we have a fresh token
          console.log('Token refreshed, retrying request...');
          const retryResponse = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Retry failed: ${retryResponse.status}`);
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
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
