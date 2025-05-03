import { useState, useRef, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Trash, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Chat message interface
interface ChatMessageType {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Define interface for Drive item metadata
interface DriveItemMetadata {
  id: string;
  name: string;
  mimeType: string;
  type: 'file' | 'folder';
  webViewLink?: string;
  thumbnailLink?: string;
}

// Define the Drive chat request type
interface DriveChatRequest {
  messages: {
    role: string;
    content: string;
  }[];
  driveItemId: string;
  driveItemType: 'file' | 'folder';
}

interface FolderChatInterfaceProps {
  driveItem: DriveItemMetadata | null;
}

const FolderChatInterface = ({ driveItem }: FolderChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear chat messages
  const clearChat = () => {
    setMessages([]);
  };

  // Initialize chat when driveItem changes
  useEffect(() => {
    if (driveItem && messages.length === 0) {
      // Add welcome message when a new Drive item is loaded
      const itemTypeText = driveItem.type === 'folder' ? 'folder' : 'file';
      
      // Assistant welcome message
      const assistantMessage: ChatMessageType = {
        role: 'assistant',
        content: `I'll help you with questions about the ${itemTypeText} "${driveItem.name}". What would you like to know about its contents?`,
        timestamp: new Date(),
      };
      
      setMessages([assistantMessage]);
    }
  }, [driveItem]);

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Regular chat message
    if (!driveItem) {
      toast({
        title: "No drive item selected",
        description: "Please first connect to a Google Drive file or folder",
        variant: "destructive",
      });
      return;
    }
    
    // Add user message to the chat
    const userMessage: ChatMessageType = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    
    setMessages([...messages, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      // Prepare request for AI
      const chatRequest: DriveChatRequest = {
        messages: [
          ...messages.map(({ role, content }) => ({ role, content })),
          { role: userMessage.role, content: userMessage.content },
        ],
        driveItemId: driveItem.id,
        driveItemType: driveItem.type
      };

      // Determine which endpoint to use based on item type
      const endpoint = driveItem.type === 'folder' 
        ? "/api/drive/folder/chat" 
        : "/api/drive/file/chat";

      // Send request to backend
      const response = await fetch(endpoint, {
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

      // Add AI response to the chat
      const assistantMessage: ChatMessageType = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Check for specific permission errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("403") || 
          errorMessage.includes("401") || 
          errorMessage.includes("permission")) {
        
        toast({
          title: "Permission Error",
          description: "You don't have sufficient access to this file. The app can only access files you explicitly shared. Try re-authenticating or using a different file.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to get a response. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Interface Header with clear button */}
      <div className="p-3 flex justify-end">
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
      
      {/* Chat Messages Container - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bot className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              {driveItem 
                ? `Ask questions about "${driveItem.name}"` 
                : "Connect to a Google Drive file or folder to get started"}
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
              <div className="inline-block bg-emerald-700 text-white px-3 py-2 rounded-t-lg rounded-bl-lg shadow-md max-w-[85%]">
                <p className="text-sm">{message.content}</p>
              </div>
            ) : (
              <div className="inline-block bg-gray-800 text-gray-200 px-4 py-3 rounded-t-lg rounded-br-lg shadow-md border border-gray-700 max-w-[85%]">
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
          </div>
        ))}
        
        {/* Loading state for chat */}
        {isLoading && (
          <div className="chat-message">
            <div className="inline-block bg-gray-900 text-gray-200 px-4 py-3 rounded-lg shadow-md border border-gray-700 flex items-center">
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse delay-100"></div>
                <div className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input - Fixed at the bottom */}
      <div className="p-3 border-t border-gray-700">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Input
              type="text"
              placeholder={driveItem 
                ? `Ask about this ${driveItem.type}...` 
                : "Connect a Drive file or folder first..."
              }
              className="w-full pl-4 pr-12 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading || !driveItem}
            />
            <Button 
              type="submit"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-emerald-700 hover:bg-emerald-600 rounded-full flex items-center justify-center"
              disabled={!inputValue.trim() || isLoading || !driveItem}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderChatInterface;