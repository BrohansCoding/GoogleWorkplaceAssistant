import { useState, useRef, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Trash, Send, ExternalLink, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Chat message interface
interface ChatMessageType {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Define interface for file metadata
interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

// Define the Drive chat request type
interface DriveChatRequest {
  messages: {
    role: string;
    content: string;
  }[];
  driveFileUrl: string;
}

const FolderChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [driveFileUrl, setDriveFileUrl] = useState<string>("");
  const [currentFile, setCurrentFile] = useState<DriveFileMetadata | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear chat messages
  const clearChat = () => {
    setMessages([]);
    setCurrentFile(null);
    setDriveFileUrl("");
  };

  // Extract the file ID from a Google Drive URL
  const extractFileIdFromUrl = (url: string): string | null => {
    try {
      // Google Drive URL formats:
      // https://drive.google.com/file/d/{fileId}/view
      // https://drive.google.com/open?id={fileId}
      // https://docs.google.com/document/d/{fileId}/edit
      // https://docs.google.com/spreadsheets/d/{fileId}/edit
      // https://docs.google.com/presentation/d/{fileId}/edit
      
      let fileId: string | null = null;
      
      // Handle file/d/{fileId}/view format
      if (url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([^/]+)/);
        if (match && match[1]) {
          fileId = match[1];
        }
      } 
      // Handle ?id= format
      else if (url.includes('?id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) {
          fileId = match[1];
        }
      } 
      // Handle docs.google.com with document/spreadsheet/presentation format
      else if (url.includes('docs.google.com')) {
        const match = url.match(/\/d\/([^/]+)/);
        if (match && match[1]) {
          fileId = match[1];
        }
      }
      
      return fileId;
    } catch (error) {
      console.error("Error extracting file ID:", error);
      return null;
    }
  };

  // Fetch file metadata
  const fetchFileMetadata = async (fileUrl: string) => {
    try {
      const fileId = extractFileIdFromUrl(fileUrl);
      
      if (!fileId) {
        toast({
          title: "Invalid Drive URL",
          description: "Please enter a valid Google Drive file URL",
          variant: "destructive",
        });
        return null;
      }
      
      setIsLoading(true);
      
      const response = await fetch(`/api/drive/metadata?fileId=${fileId}`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.status}`);
      }
      
      const data = await response.json();
      return data.file;
    } catch (error) {
      console.error("Error fetching file metadata:", error);
      toast({
        title: "Error",
        description: "Failed to access the Drive file. Please check your permissions.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Check if input is a Google Drive URL and we don't have a file loaded yet
    if (!currentFile && inputValue.includes('drive.google.com')) {
      setDriveFileUrl(inputValue);
      
      // Process the Drive URL to get file metadata
      const fileMetadata = await fetchFileMetadata(inputValue);
      
      if (fileMetadata) {
        setCurrentFile(fileMetadata);
        
        // Add user message
        const userMessage: ChatMessageType = {
          role: 'user',
          content: `I'd like to ask questions about this file: ${fileMetadata.name}`,
          timestamp: new Date(),
        };
        
        // Add assistant welcome message
        const assistantMessage: ChatMessageType = {
          role: 'assistant',
          content: `I'll help you with questions about "${fileMetadata.name}". What would you like to know about this document?`,
          timestamp: new Date(),
        };
        
        setMessages([...messages, userMessage, assistantMessage]);
        setInputValue("");
      }
      
      return;
    }
    
    // Regular chat message
    if (!currentFile) {
      toast({
        title: "No file selected",
        description: "Please first share a Google Drive file URL",
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
        driveFileUrl: driveFileUrl,
      };

      // Send request to backend
      const response = await fetch("/api/drive/chat", {
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
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
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
      
      {/* Current File Banner */}
      {currentFile && (
        <div className="mx-3 p-2 mb-3 bg-emerald-950/50 border border-emerald-800/50 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-300 truncate max-w-[160px]">{currentFile.name}</span>
          </div>
          {currentFile.webViewLink && (
            <a 
              href={currentFile.webViewLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
      
      {/* Chat Messages Container - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bot className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Paste a Google Drive URL to start analyzing documents and asking questions about your files.
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
              placeholder={currentFile ? "Ask a question about this document..." : "Paste a Google Drive file URL..."}
              className="w-full pl-4 pr-12 py-2 bg-gray-900 border border-gray-700 rounded-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <Button 
              type="submit"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-emerald-700 hover:bg-emerald-600 rounded-full flex items-center justify-center"
              disabled={!inputValue.trim() || isLoading}
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