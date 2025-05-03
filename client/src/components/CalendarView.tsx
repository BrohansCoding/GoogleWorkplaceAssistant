import { useState, useEffect } from "react";
import { format, addDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Users, VideoIcon, MapPin, RefreshCw, Calendar as CalendarDayIcon, CalendarDays, Info } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";
import { useAuth } from "@/hooks/useAuth";
import { CalendarEventType } from "@shared/schema";
import { organizeEventsByHour, fetchCalendarEventsRange } from "@/lib/calendarApi";
import { useToast } from "@/hooks/use-toast";
import CalendarAuthButton from "@/components/CalendarAuthButton";

const CalendarView = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'day' | 'week'>('day');
  const { events, isLoading, fetchEvents } = useCalendar();
  const { user } = useAuth();
  const [timeSlots, setTimeSlots] = useState<{
    hour: number;
    time: string;
    events: CalendarEventType[];
  }[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEventType[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasCalendarAuth, setHasCalendarAuth] = useState<boolean>(!!user);
  const { toast } = useToast();
  
  // Function to handle successful calendar authentication
  const handleCalendarAuthSuccess = () => {
    setHasCalendarAuth(true);
    toast({
      title: "Calendar Access Granted",
      description: "You can now access your Google Calendar events.",
      variant: "default",
    });
    
    // Fetch events for the selected date
    fetchEvents(selectedDate);
  };

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

  // Function to fetch week events
  const fetchWeekEvents = async () => {
    if (viewType === 'week') {
      try {
        const start = startOfWeek(selectedDate);
        const end = endOfWeek(selectedDate);
        const weekEventsData = await fetchCalendarEventsRange(start, end);
        setWeekEvents(weekEventsData);
      } catch (error) {
        console.error("Failed to fetch week events:", error);
        toast({
          title: "Error fetching week events",
          description: "Could not load your weekly calendar",
          variant: "destructive",
        });
      }
    }
  };

  // Effect to fetch week events when view type changes to week
  useEffect(() => {
    if (viewType === 'week') {
      fetchWeekEvents();
    }
  }, [viewType, selectedDate]);

  const goToPrevious = () => {
    if (viewType === 'day') {
      setSelectedDate(prev => addDays(prev, -1));
    } else {
      // In week view, go back a week
      setSelectedDate(prev => addDays(prev, -7));
    }
  };

  const goToNext = () => {
    if (viewType === 'day') {
      setSelectedDate(prev => addDays(prev, 1));
    } else {
      // In week view, go forward a week
      setSelectedDate(prev => addDays(prev, 7));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };
  
  const toggleViewType = () => {
    setViewType(prev => prev === 'day' ? 'week' : 'day');
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
    <section className="w-full h-full bg-gray-900">
      <div className="p-4">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-800/60 backdrop-blur-sm">
            <div className="text-center max-w-md p-8 rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-900 flex items-center justify-center">
                <CalendarDayIcon className="h-10 w-10 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-blue-400">Calendar Assistant</h2>
              <p className="text-gray-300 mb-6">
                Connect your Google Calendar to view and manage your schedule, analyze your time usage, and get AI-powered insights about your calendar.
              </p>
              <div className="mt-2">
                <CalendarAuthButton onAuthSuccess={handleCalendarAuthSuccess} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium text-gray-100">My Calendar</h2>
                {(isLoading || isRefreshing) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-blue-400" />
                )}
                <Button 
                  variant="outline"
                  size="sm"
                  className="ml-2 text-xs flex items-center gap-1 text-gray-200 border-gray-700 hover:bg-gray-800 hover:text-gray-100"
                  onClick={handleRefresh}
                  disabled={isLoading || isRefreshing}
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-gray-800 rounded-md p-1 mr-2 flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 rounded-sm flex items-center gap-1.5 ${
                      viewType === 'day' 
                        ? 'bg-blue-900/60 text-blue-300' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    onClick={() => setViewType('day')}
                  >
                    <CalendarDayIcon className="h-4 w-4" />
                    <span className="text-xs">Day</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`px-2 rounded-sm flex items-center gap-1.5 ${
                      viewType === 'week' 
                        ? 'bg-blue-900/60 text-blue-300' 
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    onClick={() => setViewType('week')}
                  >
                    <CalendarDays className="h-4 w-4" />
                    <span className="text-xs">Week</span>
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-5 w-5 text-blue-400" />
                </Button>
                
                <span className="text-sm font-medium px-3 text-gray-200 bg-gray-800 py-1 rounded-md">
                  {viewType === 'day' 
                    ? format(selectedDate, "MMMM d, yyyy")
                    : `${format(startOfWeek(selectedDate), "MMM d")} - ${format(endOfWeek(selectedDate), "MMM d")}`
                  }
                </span>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1.5 rounded-full bg-gray-800 hover:bg-gray-700"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="ml-2 px-3 py-1 text-sm rounded-md bg-blue-900 text-blue-300 hover:bg-blue-800"
                  onClick={goToToday}
                  disabled={isSameDay(selectedDate, new Date())}
                >
                  Today
                </Button>
              </div>
            </div>

            {/* Calendar View */}
            <div className="calendar-container">
              {viewType === 'day' ? (
                <>
                  {/* Day View */}
                  {/* Time slots header */}
                  <div className="grid grid-cols-1 gap-2 mb-2">
                    <div className="flex">
                      <div className="w-16 text-right pr-2 text-xs text-gray-500">&nbsp;</div>
                      <div className="flex-1 text-sm font-medium pl-2 py-1 bg-gray-800 rounded-md text-gray-200 shadow-sm border border-gray-700">
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
                            <div className="w-16 text-right pr-2 text-xs pt-1">
                              <Skeleton className="h-4 w-10 ml-auto bg-gray-700" />
                            </div>
                            <div className="flex-1 relative min-h-[60px]">
                              {index % 3 === 0 && (
                                <Skeleton className="absolute top-0 left-0 right-0 h-16 rounded-md bg-gray-800 backdrop-blur-sm border border-gray-700" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Time slots with events */}
                  {!isLoading && timeSlots.length > 0 && timeSlots.map((slot) => (
                    <div className="grid grid-cols-1 gap-2 mb-1" key={slot.hour}>
                      <div className="flex items-start">
                        <div className="w-16 text-right pr-2 text-xs text-gray-500 pt-1 font-medium">
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
                                className={`calendar-event absolute top-0 left-0 right-0 p-2 rounded-md shadow-md transition-transform cursor-pointer hover:translate-y-[-2px] border-l-4 z-10 bg-gray-800/90 backdrop-blur-sm ${
                                  eventColor === 'google-blue' ? 'border-blue-500 text-gray-200' :
                                  eventColor === 'google-green' ? 'border-green-500 text-gray-200' :
                                  eventColor === 'google-purple' ? 'border-purple-500 text-gray-200' :
                                  eventColor === 'google-red' ? 'border-red-500 text-gray-200' :
                                  eventColor === 'google-yellow' ? 'border-yellow-500 text-gray-200' :
                                  eventColor === 'cyan-500' ? 'border-cyan-500 text-gray-200' :
                                  eventColor === 'orange-500' ? 'border-orange-500 text-gray-200' :
                                  eventColor === 'pink-500' ? 'border-pink-500 text-gray-200' :
                                  eventColor === 'teal-500' ? 'border-teal-500 text-gray-200' :
                                  eventColor === 'indigo-500' ? 'border-indigo-500 text-gray-200' :
                                  eventColor === 'amber-500' ? 'border-amber-500 text-gray-200' :
                                  'border-blue-500 text-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-200">
                                    {event.summary}
                                  </span>
                                  <span className="text-xs text-gray-300 bg-gray-700 px-1.5 py-0.5 rounded-full">
                                    {format(new Date(event.start.dateTime), "h:mm")} - {format(new Date(event.end.dateTime), "h:mm a")}
                                  </span>
                                </div>
                                <div className="flex items-center mt-1 text-xs text-gray-400">
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
                  
                  {/* Empty state when no events for the day */}
                  {!isLoading && timeSlots.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-10 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="rounded-full bg-gray-700 p-3 mb-3">
                        <Info className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-200 mb-1">No events found</h3>
                      <p className="text-sm text-gray-400 max-w-xs text-center">
                        There are no events scheduled for this day. Enjoy your free time!
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Week View */}
                  {/* Week view implementation here */}
                  <div className="flex flex-col items-center justify-center p-6 bg-gray-800/50 rounded-lg border border-gray-700">
                    <CalendarDays className="h-10 w-10 text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-200 mb-1">Week View Coming Soon</h3>
                    <p className="text-sm text-gray-400 max-w-xs text-center">
                      We're still working on the week view. Please check back soon!
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default CalendarView;