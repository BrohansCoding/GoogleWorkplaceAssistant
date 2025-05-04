import { useContext, useState, FormEvent, useEffect } from "react";
import { MessageSquare, Folder, X, FileText, Search, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FolderChatInterface from "@/components/FolderChatInterface";
import { MobileContext } from "@/context/MobileContext";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

// Define interface for Drive item metadata
interface DriveItemMetadata {
  id: string;
  name: string;
  mimeType: string;
  type: 'file' | 'folder';
  webViewLink?: string;
  thumbnailLink?: string;
}

const FoldersView = () => {
  const mobileContext = useContext(MobileContext);
  const { user, isAuthenticated, hasOAuthToken } = useUnifiedAuth();
  const [showChat, setShowChat] = useState(true);
  const [driveUrl, setDriveUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentDriveItem, setCurrentDriveItem] = useState<DriveItemMetadata | null>(null);
  const { toast } = useToast();
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  // Function to handle authentication success
  useEffect(() => {
    if (isAuthenticated && hasOAuthToken) {
      toast({
        title: "Drive Access Granted",
        description: "You can now access your Google Drive files and folders.",
        variant: "default",
      });
    }
  }, [isAuthenticated, hasOAuthToken, toast]);

  // Extract the file/folder ID from a Google Drive URL
  const extractIdFromUrl = (url: string): string | null => {
    try {
      // Google Drive URL formats:
      // https://drive.google.com/file/d/{fileId}/view
      // https://drive.google.com/open?id={fileId}
      // https://docs.google.com/document/d/{fileId}/edit
      // https://docs.google.com/spreadsheets/d/{fileId}/edit
      // https://docs.google.com/presentation/d/{fileId}/edit
      // https://drive.google.com/drive/folders/{folderId}
      
      let id: string | null = null;
      
      // Handle folders
      if (url.includes('/drive/folders/')) {
        const match = url.match(/\/drive\/folders\/([^/?]+)/);
        if (match && match[1]) {
          id = match[1];
        }
      } 
      // Handle file/d/{fileId}/view format
      else if (url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([^/]+)/);
        if (match && match[1]) {
          id = match[1];
        }
      } 
      // Handle ?id= format
      else if (url.includes('?id=')) {
        const match = url.match(/[?&]id=([^&]+)/);
        if (match && match[1]) {
          id = match[1];
        }
      } 
      // Handle docs.google.com with document/spreadsheet/presentation format
      else if (url.includes('docs.google.com')) {
        const match = url.match(/\/d\/([^/]+)/);
        if (match && match[1]) {
          id = match[1];
        }
      }
      
      return id;
    } catch (error) {
      console.error("Error extracting ID:", error);
      return null;
    }
  };

  // Imported at the top of the file

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!driveUrl.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Extract the ID from the URL
      const id = extractIdFromUrl(driveUrl);
      
      if (!id) {
        toast({
          title: "Invalid Drive URL",
          description: "Please enter a valid Google Drive file or folder URL",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      // Determine if it's a folder or file
      const isFolder = driveUrl.includes('/drive/folders/');
      
      // Make request to appropriate endpoint
      const endpoint = isFolder ? `/api/drive/folder?folderId=${id}` : `/api/drive/metadata?fileId=${id}`;
      
      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
      });
      
      // Handle permission errors - force re-auth with updated scopes
      if (response.status === 403 || response.status === 401) {
        const errorData = await response.json();
        // Check for either PERMISSION_DENIED, ACCESS_DENIED or any code that indicates insufficient permissions
        if (errorData.code === "PERMISSION_DENIED" || 
            errorData.code === "ACCESS_DENIED" || 
            response.status === 403) {
          // We need additional permissions
          toast({
            title: "Additional Google Drive Permissions Required",
            description: "You need to grant full Drive access permissions. Please sign in again.",
            variant: "default",
          });
          
          // Force re-auth with updated scopes
          await forceReauthWithUpdatedScopes();
          setIsLoading(false);
          return;
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to get Drive item: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Set the current Drive item
      setCurrentDriveItem({
        ...data.item,
        type: isFolder ? 'folder' : 'file'
      });
      
      // Clear the input
      setDriveUrl("");
      
      // Ensure chat is visible
      setShowChat(true);
      
    } catch (error) {
      console.error("Error fetching Drive item:", error);
      toast({
        title: "Error",
        description: "Failed to access the Drive item. Please check your permissions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-800/60 backdrop-blur-sm relative overflow-hidden">
      <div className="p-4 flex-1 overflow-auto">
        <div className="max-w-xl mx-auto rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
          {/* Main Drive Assistant Info Section */}
          <div className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-900 flex items-center justify-center">
              <Folder className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-emerald-400">Google Drive Assistant</h2>
            <p className="text-gray-300 mb-4">
              Access your Google Drive files and folders. Simply paste a Google Drive link below to analyze content you've specifically shared with this app.
            </p>
            <p className="text-sm text-gray-400 mb-4 italic">
              Note: Due to Google's permission model, this app can only access files and folders that you've explicitly opened with it. The app cannot see your entire Drive.
            </p>
          </div>
          
          {/* Drive URL Form Section */}
          <div className="px-6 pb-4">
            {!isAuthenticated || !hasOAuthToken ? (
              <div className="mb-5 p-6 bg-emerald-900/20 border border-emerald-900/30 rounded-lg">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-emerald-400 animate-spin mb-4" />
                  <h3 className="text-lg font-semibold text-emerald-400 mb-2">Connecting to Google Drive</h3>
                  <p className="text-sm text-gray-300 mb-2 text-center">
                    Please wait while we establish a connection to your Google account...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mb-5">
                <h3 className="text-md font-semibold text-emerald-400 mb-3">Enter a Drive File or Folder URL</h3>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Paste a Google Drive file or folder URL..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-900 border border-emerald-800 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    type="submit"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 bg-emerald-700 hover:bg-emerald-600 rounded-md flex items-center justify-center"
                    disabled={!driveUrl.trim() || isLoading}
                  >
                    {isLoading ? "Loading..." : "Connect"}
                    <Search className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </form>
            )}
            
            <div className="bg-gray-900/80 p-4 rounded-lg border border-emerald-900 mb-5">
              <h3 className="text-sm font-semibold text-emerald-400 mb-2">How it works:</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Paste any Google Drive file or folder link above
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Ask questions about the file content or folder contents
                </li>
                <li className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Get AI-powered responses based on your Drive items
                </li>
              </ul>
            </div>
          </div>
          
          {/* Chat Section Below the Instructions */}
          {currentDriveItem && (
            <div className="border-t border-gray-700 mt-2">
              {/* Chat Header */}
              <div className="p-3 bg-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-sm font-medium text-gray-200">Folder Assistant</h3>
                </div>
              </div>
              
              {/* Current Item Banner */}
              <div className="mx-3 mt-2 p-2 bg-emerald-950/50 border border-emerald-800/50 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentDriveItem.type === 'folder' ? (
                    <Folder className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-emerald-400" />
                  )}
                  <span className="text-xs text-emerald-300 truncate max-w-[160px]">
                    {currentDriveItem.name}
                  </span>
                </div>
              </div>
              
              {/* Folder Chat Interface */}
              <div className="h-[400px] overflow-hidden">
                <FolderChatInterface driveItem={currentDriveItem} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Chat Toggle Button */}
      {isMobile && !showChat && (
        <Button
          className="fixed bottom-20 right-4 rounded-full w-12 h-12 bg-emerald-700 shadow-lg z-20 flex items-center justify-center"
          onClick={() => setShowChat(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default FoldersView;