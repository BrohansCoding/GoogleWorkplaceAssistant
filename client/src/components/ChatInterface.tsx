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
  const [showChatDialog, setShowChatDialog] = useState(false);
  
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

  // Show chat dialog when a message is sent and scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setShowChatDialog(true);
    }
    
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
    <section className="w-full flex flex-col h-full relative">
      {/* Chat Dialog (appears when messages exist) */}
      {showChatDialog && messages.length > 0 && (
        <div className="fixed top-28 right-6 w-96 h-[520px] z-20 flex flex-col bg-gray-800/95 rounded-xl shadow-lg border border-gray-700">
          {/* Chat header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <div className="text-sm font-medium text-gray-200">Calendar Assistant</div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-gray-700"
                onClick={clearChat}
              >
                <Trash className="h-3 w-3 text-gray-400" />
              </Button>
              <Button
                variant="ghost" 
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-gray-700"
                onClick={() => setShowChatDialog(false)}
              >
                <X className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          </div>
          
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {/* Chat Messages */}
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`chat-message ${
                  message.role === "user" ? "user-message mb-4 flex justify-end" : "assistant-message mb-4 flex"
                }`}
              >
                {message.role === "user" ? (
                  <div className="chat-bubble-user bg-blue-600 text-white px-4 py-2 max-w-xs rounded-t-xl rounded-bl-xl shadow-md">
                    <p className="text-sm">{message.content}</p>
                  </div>
                ) : (
                  <div className="chat-bubble-assistant bg-gray-900 text-gray-200 px-4 py-2 max-w-xs rounded-t-xl rounded-br-xl shadow-md border border-gray-700">
                    <ChatMessageContent content={message.content} />
                  </div>
                )}
              </div>
            ))}

            {/* Loading state for chat */}
            {isLoading && (
              <div className="chat-message assistant-message mb-4 flex">
                <div className="chat-bubble-assistant bg-gray-900 text-gray-200 px-4 py-3 rounded-t-xl rounded-br-xl shadow-md border border-gray-700 flex items-center">
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
          
          {/* Chat input in dialog */}
          <div className="p-3 border-t border-gray-700">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-gray-700"
                  disabled={!inputValue.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Chat Input Trigger on Right Side */}
      <div className="fixed top-28 right-6 w-80 z-20">
        <div className="bg-gray-800/95 rounded-xl shadow-lg border border-gray-700 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-400" />
              <div className="text-sm font-medium text-gray-200">Calendar Assistant</div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-gray-700"
                onClick={() => setShowChatDialog(true)}
              >
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span className="absolute top-0 right-0 h-3 w-3 bg-blue-500 rounded-full"></span>
              </Button>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Input
                type="text"
                placeholder="Ask about your calendar..."
                className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-gray-700"
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 pl-2 text-xs text-gray-400">
              <span>Ask me anything about your schedule</span>
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
