import { CalendarEventType } from '@shared/schema';
import { format, startOfDay, endOfDay, addDays, parseISO } from 'date-fns';

// Fetch calendar events from Google Calendar API through our backend proxy
export const fetchCalendarEvents = async (date: Date): Promise<CalendarEventType[]> => {
  const startDate = startOfDay(date);
  const endDate = endOfDay(date);
  
  const formattedStartDate = encodeURIComponent(startDate.toISOString());
  const formattedEndDate = encodeURIComponent(endDate.toISOString());
  
  try {
    const response = await fetch(
      `/api/calendar/events?timeMin=${formattedStartDate}&timeMax=${formattedEndDate}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.status}`);
    }
    
    const data = await response.json();
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
    const response = await fetch(
      `/api/calendar/events?timeMin=${formattedStartDate}&timeMax=${formattedEndDate}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events range: ${response.status}`);
    }
    
    const data = await response.json();
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
    const hourDate = new Date(date.setHours(hour, 0, 0, 0));
    return {
      hour,
      time: format(hourDate, 'h:mm a'),
      events: [] as CalendarEventType[]
    };
  });
  
  // Assign events to their respective time slots
  events.forEach(event => {
    const startTime = parseISO(event.start.dateTime);
    const startHour = startTime.getHours();
    
    // Find the appropriate time slot
    const slotIndex = timeSlots.findIndex(slot => slot.hour === startHour);
    
    if (slotIndex !== -1) {
      timeSlots[slotIndex].events.push(event);
    } else if (startHour < startHour) {
      // Early morning events go into the first slot
      timeSlots[0].events.push(event);
    } else if (startHour > endHour) {
      // Late night events go into the last slot
      timeSlots[timeSlots.length - 1].events.push(event);
    }
  });
  
  return timeSlots;
};
