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
    <section className="w-full h-full bg-white overflow-y-auto border-r border-neutral-200">
      <div className="p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium text-neutral-800">My Calendar</h2>
            {(isLoading || isRefreshing) && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-300 border-t-google-blue" />
            )}
            <Button 
              variant="outline"
              size="sm"
              className="ml-2 text-xs flex items-center gap-1"
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
              className="p-1.5 rounded-full hover:bg-neutral-100"
              onClick={goToPreviousDay}
            >
              <ChevronLeft className="h-5 w-5 text-neutral-600" />
            </Button>
            
            <span className="text-sm font-medium px-2">
              {format(selectedDate, "MMMM d, yyyy")}
            </span>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-1.5 rounded-full hover:bg-neutral-100"
              onClick={goToNextDay}
            >
              <ChevronRight className="h-5 w-5 text-neutral-600" />
            </Button>
            
            <Button 
              variant="ghost" 
              className="ml-2 px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md"
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
              <div className="w-16 text-right pr-2 text-xs text-neutral-500">&nbsp;</div>
              <div className="flex-1 text-sm font-medium pl-2 py-1 bg-neutral-100 rounded-md">
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
                    <div className="w-16 text-right pr-2 text-xs text-neutral-500 pt-1">
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </div>
                    <div className="flex-1 relative min-h-[60px]">
                      {index % 3 === 0 && (
                        <Skeleton className="absolute top-0 left-0 right-0 h-16 rounded-md" />
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
                <div className="w-16 text-right pr-2 text-xs text-neutral-500 pt-1">
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
                        className={`calendar-event absolute top-0 left-0 right-0 p-2 rounded-md shadow-sm transition-transform cursor-pointer hover:translate-y-[-2px] bg-opacity-10 border-l-4 ${
                          eventColor === 'google-blue' ? 'bg-google-blue border-google-blue' :
                          eventColor === 'google-green' ? 'bg-google-green border-google-green' :
                          eventColor === 'google-purple' ? 'bg-google-purple border-google-purple' :
                          eventColor === 'google-red' ? 'bg-google-red border-google-red' :
                          eventColor === 'google-yellow' ? 'bg-google-yellow border-google-yellow' :
                          eventColor === 'cyan-500' ? 'bg-cyan-500 border-cyan-500' :
                          eventColor === 'orange-500' ? 'bg-orange-500 border-orange-500' :
                          eventColor === 'pink-500' ? 'bg-pink-500 border-pink-500' :
                          eventColor === 'teal-500' ? 'bg-teal-500 border-teal-500' :
                          eventColor === 'indigo-500' ? 'bg-indigo-500 border-indigo-500' :
                          eventColor === 'amber-500' ? 'bg-amber-500 border-amber-500' :
                          'bg-google-blue border-google-blue'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-neutral-800">
                            {event.summary}
                          </span>
                          <span className="text-xs text-neutral-600">
                            {format(new Date(event.start.dateTime), "h:mm")} - {format(new Date(event.end.dateTime), "h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-xs text-neutral-600">
                          {event.attendees && event.attendees.length > 0 ? (
                            <>
                              <Users className="text-neutral-500 h-3 w-3 mr-1" />
                              <span>{event.attendees.length} participants</span>
                            </>
                          ) : event.location ? (
                            <>
                              <MapPin className="text-neutral-500 h-3 w-3 mr-1" />
                              <span>{event.location}</span>
                            </>
                          ) : (
                            <>
                              <VideoIcon className="text-neutral-500 h-3 w-3 mr-1" />
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
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="h-6 w-6 text-neutral-500" />
              </div>
              <h3 className="text-lg font-medium text-neutral-800 mb-1">No events found</h3>
              <p className="text-sm text-neutral-600 max-w-xs">
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
