import { useState, useCallback, useContext, useEffect } from "react";
import { CalendarContext } from "@/context/CalendarContext";
import { fetchCalendarEvents, fetchCalendarEventsRange, calculateCalendarStats } from "@/lib/calendarApi";
import { subWeeks, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CalendarEventType } from "@shared/schema";

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  if (context === null) {
    // We'll provide a fallback implementation instead of throwing
    console.warn("useCalendar was used outside of a CalendarProvider. Some features may not work correctly.");
    
    // Return a minimal implementation
    return {
      events: [] as CalendarEventType[],
      stats: null,
      isLoading,
      error,
      fetchEvents: async () => [] as CalendarEventType[],
      fetchCalendarStats: async () => null,
    };
  }
  
  const { events, setEvents, stats, setStats } = context;

  // Fetch calendar events for a specific day
  const fetchEvents = useCallback(async (date: Date) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchCalendarEvents(date);
      setEvents(data);
      
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch calendar events');
      setError(error);
      toast({
        title: "Failed to load calendar",
        description: error.message,
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [setEvents, toast]);

  // Fetch calendar stats for analysis (looks at last 4 weeks)
  const fetchCalendarStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const endDate = endOfDay(new Date());
      const startDate = subWeeks(endDate, 4); // Get 4 weeks of data
      
      const events = await fetchCalendarEventsRange(startDate, endDate);
      const calculatedStats = calculateCalendarStats(events);
      
      setStats(calculatedStats);
      return calculatedStats;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch calendar statistics');
      setError(error);
      toast({
        title: "Failed to analyze calendar",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setStats, toast]);

  return {
    events,
    stats,
    isLoading,
    error,
    fetchEvents,
    fetchCalendarStats,
  };
};
