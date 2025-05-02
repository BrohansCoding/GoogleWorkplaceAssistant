import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, Info } from "lucide-react";
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
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <section className="w-full flex flex-col bg-background h-full relative">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-lg mx-auto">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-foreground mb-1">Calendar Agent</h2>
              <p className="text-sm text-muted-foreground">
                Ask me questions about your schedule, and I'll help you manage your time effectively.
              </p>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${
                message.role === "user" ? "user-message mb-4 flex justify-end" : "assistant-message mb-4 flex"
              }`}
            >
              {message.role === "user" ? (
                <div className="chat-bubble-user bg-primary text-primary-foreground px-4 py-2 max-w-xs rounded-t-xl rounded-bl-xl shadow-md">
                  <p className="text-sm">{message.content}</p>
                </div>
              ) : (
                <div className="chat-bubble-assistant bg-card text-card-foreground px-4 py-2 max-w-xs rounded-t-xl rounded-br-xl shadow-md border border-border">
                  <ChatMessageContent content={message.content} />
                </div>
              )}
            </div>
          ))}

          {/* Loading state for chat */}
          {isLoading && (
            <div className="chat-message assistant-message mb-4 flex">
              <div className="chat-bubble-assistant bg-card text-card-foreground px-4 py-3 rounded-t-xl rounded-br-xl shadow-md border border-border flex items-center">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-primary/50 rounded-full animate-pulse"></div>
                  <div className="h-2 w-2 bg-primary/50 rounded-full animate-pulse delay-100"></div>
                  <div className="h-2 w-2 bg-primary/50 rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Fixed Chat Input Area */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-2/3 p-4 border-t border-border bg-card shadow-lg">
        <form className="max-w-lg mx-auto" onSubmit={handleSubmit}>
          <div className="relative">
            <Input
              type="text"
              placeholder="Ask about your calendar or schedule..."
              className="w-full pl-4 pr-12 py-6 bg-background border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground rounded-full disabled:opacity-50 disabled:bg-muted"
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 pl-4 text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>Your data is processed securely and not stored permanently</span>
          </div>
        </form>
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
