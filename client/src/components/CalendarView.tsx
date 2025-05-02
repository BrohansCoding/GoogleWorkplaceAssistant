import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Users, VideoIcon, MapPin, RefreshCw } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { CalendarEventType } from "@shared/schema";
import { organizeEventsByHour } from "@/lib/calendarApi";
import { useToast } from "@/hooks/use-toast";

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { events, isLoading, fetchEvents } = useCalendar();
  const [timeSlots, setTimeSlots] = useState<{
    hour: number;
    time: string;
    events: CalendarEventType[];
  }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log("Fetching events for date:", selectedDate);
    fetchEvents(selectedDate);
  }, [selectedDate, fetchEvents]);

  useEffect(() => {
    console.log("Events from calendar API:", events);
    if (events) {
      const organized = organizeEventsByHour(events, selectedDate);
      console.log("Organized time slots:", organized);
      setTimeSlots(organized);
    }
  }, [events, selectedDate]);

  const goToPreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchEvents(selectedDate);
      toast({
        title: "Calendar refreshed",
        description: "Your calendar has been synced with the latest data.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Could not refresh calendar data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get event color based on colorId from Google Calendar
  const getEventColor = (colorId?: string) => {
    const colorMap: Record<string, string> = {
      "1": "google-blue", // Blue
      "2": "google-green", // Green
      "3": "google-purple", // Purple
      "4": "google-red", // Red
      "5": "google-yellow", // Yellow
      "6": "cyan-500", // Cyan
      "7": "orange-500", // Orange
      "8": "pink-500", // Pink
      "9": "teal-500", // Teal
      "10": "indigo-500", // Indigo
      "11": "amber-500", // Amber
    };
    
    return colorMap[colorId || "1"] || "google-blue";
  };

  return (
    <section className="w-full h-full bg-background overflow-y-auto border-r border-border">
      <div className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium text-foreground">My Calendar</h2>
            {(isLoading || isRefreshing) && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-border border-t-primary" />
            )}
            <Button 
              variant="outline"
              size="sm"
              className="ml-2 text-xs flex items-center gap-1 text-foreground hover:bg-primary hover:text-primary-foreground"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-1.5 rounded-full hover:bg-muted"
              onClick={goToPreviousDay}
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </Button>
            
            <span className="text-sm font-medium px-2 text-foreground">
              {format(selectedDate, "MMMM d, yyyy")}
            </span>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-1.5 rounded-full hover:bg-muted"
              onClick={goToNextDay}
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </Button>
            
            <Button 
              variant="ghost" 
              className="ml-2 px-3 py-1 text-sm hover:bg-muted rounded-md"
              onClick={goToToday}
              disabled={isSameDay(selectedDate, new Date())}
            >
              Today
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        <div className="calendar-container">
          {/* Time slots header */}
          <div className="grid grid-cols-1 gap-2 mb-2">
            <div className="flex">
              <div className="w-16 text-right pr-2 text-xs text-muted-foreground">&nbsp;</div>
              <div className="flex-1 text-sm font-medium pl-2 py-1 bg-card rounded-md text-card-foreground">
                {format(selectedDate, "EEEE, MMMM d")}
              </div>
            </div>
          </div>
          
          {/* Loading skeleton */}
          {isLoading && (
            <>
              {Array.from({ length: 10 }).map((_, index) => (
                <div className="grid grid-cols-1 gap-2 mb-1" key={`skeleton-${index}`}>
                  <div className="flex items-start">
                    <div className="w-16 text-right pr-2 text-xs text-muted-foreground pt-1">
                      <Skeleton className="h-4 w-10 ml-auto bg-muted" />
                    </div>
                    <div className="flex-1 relative min-h-[60px]">
                      {index % 3 === 0 && (
                        <Skeleton className="absolute top-0 left-0 right-0 h-16 rounded-md bg-muted" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
          
          {/* Time slots with events */}
          {!isLoading && timeSlots.map((slot) => (
            <div className="grid grid-cols-1 gap-2 mb-1" key={slot.hour}>
              <div className="flex items-start">
                <div className="w-16 text-right pr-2 text-xs text-muted-foreground pt-1">
                  {slot.time}
                </div>
                <div className="flex-1 relative min-h-[60px]">
                  {slot.events.map((event) => {
                    // Get the color for the event
                    const eventColor = getEventColor(event.colorId);
                    // Use className string concatenation to ensure Tailwind picks up the classes
                    return (
                      <div 
                        key={event.id}
                        className={`calendar-event absolute top-0 left-0 right-0 p-2 rounded-md shadow-md transition-transform cursor-pointer hover:translate-y-[-2px] border-l-4 z-10 bg-opacity-80 ${
                          eventColor === 'google-blue' ? 'bg-card border-primary text-foreground' :
                          eventColor === 'google-green' ? 'bg-card border-green-500 text-foreground' :
                          eventColor === 'google-purple' ? 'bg-card border-purple-500 text-foreground' :
                          eventColor === 'google-red' ? 'bg-card border-red-500 text-foreground' :
                          eventColor === 'google-yellow' ? 'bg-card border-yellow-500 text-foreground' :
                          eventColor === 'cyan-500' ? 'bg-card border-cyan-500 text-foreground' :
                          eventColor === 'orange-500' ? 'bg-card border-orange-500 text-foreground' :
                          eventColor === 'pink-500' ? 'bg-card border-pink-500 text-foreground' :
                          eventColor === 'teal-500' ? 'bg-card border-teal-500 text-foreground' :
                          eventColor === 'indigo-500' ? 'bg-card border-indigo-500 text-foreground' :
                          eventColor === 'amber-500' ? 'bg-card border-amber-500 text-foreground' :
                          'bg-card border-primary text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {event.summary}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.start.dateTime), "h:mm")} - {format(new Date(event.end.dateTime), "h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          {event.attendees && event.attendees.length > 0 ? (
                            <>
                              <Users className="h-3 w-3 mr-1" />
                              <span>{event.attendees.length} participants</span>
                            </>
                          ) : event.location ? (
                            <>
                              <MapPin className="h-3 w-3 mr-1" />
                              <span>{event.location}</span>
                            </>
                          ) : (
                            <>
                              <VideoIcon className="h-3 w-3 mr-1" />
                              <span>Google Meet</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty state when no events */}
          {!isLoading && events && events.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No events found</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                There are no events scheduled for this day. Enjoy your free time!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default CalendarView;
