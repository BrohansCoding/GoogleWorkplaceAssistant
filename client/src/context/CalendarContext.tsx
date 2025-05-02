import { createContext, useState, ReactNode } from "react";
import { CalendarEventType } from "@shared/schema";

interface CalendarStats {
  totalMeetings: number;
  totalDuration: number;
  averageDuration: number;
}

interface CalendarContextType {
  events: CalendarEventType[] | null;
  setEvents: (events: CalendarEventType[]) => void;
  stats: CalendarStats | null;
  setStats: (stats: CalendarStats | null) => void;
}

export const CalendarContext = createContext<CalendarContextType | null>(null);

interface CalendarProviderProps {
  children: ReactNode;
}

export const CalendarProvider = ({ children }: CalendarProviderProps) => {
  const [events, setEvents] = useState<CalendarEventType[] | null>(null);
  const [stats, setStats] = useState<CalendarStats | null>(null);

  return (
    <CalendarContext.Provider
      value={{
        events,
        setEvents,
        stats,
        setStats,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};
