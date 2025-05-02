import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, Info, Trash, X, MessageSquare } from "lucide-react";
import { ChatMessageType, GroqChatRequest } from "@shared/schema";
import { CalendarContext } from "@/context/CalendarContext";
import { useToast } from "@/hooks/use-toast";
import { fetchCalendarEventsRange, calculateCalendarStats } from "@/lib/calendarApi";
import { subWeeks, endOfDay } from "date-fns";

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  const calendarContext = useContext(CalendarContext);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get data safely from calendar context
  const events = calendarContext?.events || [];
  const stats = calendarContext?.stats || null;
  
  // Function to fetch calendar stats
  const fetchCalendarStats = useCallback(async () => {
    try {
      if (!calendarContext) return null;
      
      // Calculate date range (last 4 weeks)
      const endDate = endOfDay(new Date());
      const startDate = subWeeks(endDate, 4);
      
      // Fetch events data
      const eventsData = await fetchCalendarEventsRange(startDate, endDate);
      
      // Calculate stats
      const calculatedStats = calculateCalendarStats(eventsData);
      
      // Update context
      calendarContext.setStats(calculatedStats);
      
      return calculatedStats;
    } catch (error) {
      console.error("Failed to fetch calendar statistics:", error);
      return null;
    }
  }, [calendarContext]);
  
  // Send a message to the AI assistant
  const sendMessage = useCallback(
    async (content: string) => {
      try {
        // Update calendar stats before sending message
        await fetchCalendarStats();
        
        // Add user message to chat
        const userMessage: ChatMessageType = {
          role: "user",
          content,
        };
        
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        // Create formatted stats object if available
        const formattedStats = stats ? {
          totalMeetings: stats.totalMeetings,
          totalDuration: stats.totalDuration,
          averageDuration: stats.averageDuration
        } : undefined;

        // Prepare request for AI
        const chatRequest: GroqChatRequest = {
          messages: [
            ...messages.map(({ role, content }) => ({ role, content })),
            { role: userMessage.role, content: userMessage.content },
          ],
          calendarSummary: {
            events: events,
            stats: formattedStats
          },
        };

        // Send request to backend
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(chatRequest),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`);
        }

        const data = await response.json();
        
        // Add AI response to chat
        const assistantMessage: ChatMessageType = {
          role: "assistant",
          content: data.response,
        };
        
        setMessages((prev) => [...prev, assistantMessage]);
        
        return assistantMessage;
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Failed to send message",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [messages, events, stats, fetchCalendarStats, toast]
  );
  
  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a slight delay to ensure DOM is fully updated
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <section className="w-full h-full flex flex-col">
      <div className="bg-gray-800/95 flex flex-col h-full w-full">
        {/* Chat Header */}
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-gray-200">Calendar Assistant</h3>
          </div>
          {messages.length > 0 && (
            <Button 
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-700"
              onClick={clearChat}
            >
              <Trash className="h-3 w-3 text-gray-400" />
            </Button>
          )}
        </div>
        
        {/* Chat Messages - Scrollable container that doesn't expand */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">
                Ask me about your schedule, upcoming meetings, or to summarize your calendar.
              </p>
            </div>
          )}
          
          {/* Chat Messages */}
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${
                message.role === "user" ? "text-right" : ""
              }`}
            >
              {message.role === "user" ? (
                <div className="inline-block bg-blue-600 text-white px-3 py-2 rounded-t-lg rounded-bl-lg shadow-md max-w-[85%]">
                  <p className="text-sm">{message.content}</p>
                </div>
              ) : (
                <div className="inline-block bg-gray-900 text-gray-200 px-3 py-2 rounded-t-lg rounded-br-lg shadow-md border border-gray-700 max-w-[85%]">
                  <ChatMessageContent content={message.content} />
                </div>
              )}
            </div>
          ))}

          {/* Loading state for chat */}
          {isLoading && (
            <div className="chat-message">
              <div className="inline-block bg-gray-900 text-gray-200 px-4 py-3 rounded-lg shadow-md border border-gray-700 flex items-center">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse delay-100"></div>
                  <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat Input - Fixed at the bottom */}
        <div className="sticky bottom-0 p-3 border-t border-gray-700 bg-gray-800/95 backdrop-blur-sm">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Input
                type="text"
                placeholder="Ask about your calendar..."
                className="w-full pl-4 pr-12 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-gray-700"
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

// Component to handle formatted chat content (e.g., code blocks, lists, etc.)
const ChatMessageContent = ({ content }: { content: string }) => {
  // Check if content has email format
  if (content.includes("Subject:") && content.includes("Hi") && content.includes("Thanks")) {
    return (
      <div>
        <p className="text-sm">{content.substring(0, content.indexOf("Subject:"))}</p>
        <div className="mt-2 p-2 bg-background rounded text-xs border border-border">
          {content.substring(content.indexOf("Subject:")).split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  }
  
  // Check if content has bullet points
  if (content.includes("•") || content.includes("- ")) {
    const parts = content.split(/(?=•)|(?=- )/);
    
    return (
      <div className="text-sm">
        {parts.map((part, index) => {
          if (part.startsWith("•") || part.startsWith("- ")) {
            return (
              <div key={index} className={index > 0 ? "mt-1" : ""}>
                <span className="text-primary">{part.substring(0, 2)}</span>
                {part.substring(2)}
              </div>
            );
          }
          return <p key={index} className={index > 0 ? "mt-2" : ""}>{part}</p>;
        })}
      </div>
    );
  }
  
  // Simple text content
  return <p className="text-sm">{content}</p>;
};

export default ChatInterface;
