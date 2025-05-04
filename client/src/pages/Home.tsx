import { useState, useEffect, useContext } from "react";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import ChatInterface from "@/components/ChatInterface";
import FoldersView from "@/components/FoldersView";
import EmailView from "@/components/EmailView";
import WelcomeScreen from "@/components/WelcomeScreen";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { MobileContext } from "@/context/MobileContext";

const Home = () => {
  const { isAuthenticated, isLoading, hasOAuthToken, login } = useUnifiedAuth();
  const mobileContext = useContext(MobileContext);
  const [activeView, setActiveView] = useState<"calendar" | "folders" | "email" | "home">("home");
  const [showChat, setShowChat] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  // Handle successful authentication
  const handleAuthSuccess = () => {
    // Navigate to the calendar view after successful auth
    setActiveView("calendar");
  };
  
  // Check if user is already authenticated on component load
  useEffect(() => {
    if (isAuthenticated && hasOAuthToken) {
      // If already authenticated, go to calendar view (dashboard)
      setActiveView("calendar");
    } else {
      // Otherwise show home/welcome screen
      setActiveView("home");
    }
  }, [isAuthenticated, hasOAuthToken]);
  
  // Force loading timeout after 10 seconds to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  // Handle manual retry if loading times out
  const handleRetry = () => {
    window.location.reload();
  };
  
  // Handle request for reconnection
  const handleReconnect = async () => {
    try {
      // Clear any previous local storage flags to ensure clean authentication
      localStorage.removeItem('RE_AUTH_IN_PROGRESS');
      await login();
    } catch (error) {
      console.error("Failed to reconnect:", error);
    }
  };
  
  // Show loading timeout error
  if (isLoading && loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-white mb-4">Loading Taking Too Long</h2>
          <p className="text-gray-300 mb-6">
            There seems to be an issue with authentication. You can try manually reloading
            the page or click the button below.
          </p>
          <Button 
            onClick={handleRetry} 
            className="bg-blue-600 hover:bg-blue-500"
          >
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white"></div>
              <span>Retry Authentication</span>
            </div>
          </Button>
        </div>
      </div>
    );
  }
  
  // If the user is not authenticated, show the welcome screen
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <WelcomeScreen onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }
  
  // Show the reconnection screen if authenticated but missing OAuth token
  if (!isLoading && isAuthenticated && !hasOAuthToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-semibold text-white mb-4">Additional Permissions Needed</h2>
          <p className="text-gray-300 mb-6">
            You're signed in, but you need to grant access to your Google Workspace 
            (Calendar, Drive, and Gmail) to use this application.
          </p>
          <Button 
            onClick={handleReconnect} 
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            Connect Google Workspace
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading your workspace...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {activeView !== "home" && <Header activeView={activeView} setActiveView={setActiveView} />}
      
      <main className="flex flex-1 overflow-hidden p-0">
        {/* Main content area with different views */}
        <div className={`flex-grow h-full overflow-auto ${activeView !== "home" ? "rounded-xl shadow-lg border border-gray-700 bg-gray-800/80 backdrop-blur-sm m-4" : ""} 
          ${activeView === "calendar" ? "mr-0 md:mr-[320px]" : "mr-0"}`}>
          {activeView === "home" && <WelcomeScreen onAuthSuccess={handleAuthSuccess} />}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "folders" && <FoldersView />}
          {activeView === "email" && <EmailView />}
        </div>
        
        {/* Fixed Chat Sidebar - Only visible on Calendar tab */}
        {activeView === "calendar" && (
          <div 
            className={`fixed right-0 top-0 bottom-0 w-[320px] bg-gray-800 border-l border-gray-700 shadow-lg z-10 
              ${showChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} 
              transition-transform duration-300`}
            style={{
              top: isMobile ? '72px' : '100px', // Adjusted top position to be lower
              height: isMobile ? 'calc(100% - 132px)' : 'calc(100% - 120px)' // Made height smaller
            }}
          >
            <div className="h-full flex flex-col">
              {/* Chat Header */}
              <div className="p-3 border-b border-gray-700 bg-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-medium text-gray-200">Calendar Assistant</h3>
                </div>
                {isMobile && (
                  <Button 
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-gray-700"
                    onClick={() => setShowChat(false)}
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
              </div>
              
              {/* Chat Interface */}
              <div className="flex-1 overflow-hidden">
                <ChatInterface />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Chat Toggle Button - Only visible on Calendar tab */}
      {isMobile && !showChat && activeView === "calendar" && (
        <Button
          className="fixed bottom-20 right-4 rounded-full w-12 h-12 bg-blue-600 shadow-lg z-20 flex items-center justify-center"
          onClick={() => setShowChat(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
      
      {/* Mobile Navigation */}
      {isMobile && activeView !== "home" && (
        <div className="border-t border-gray-700 bg-gray-800/90 backdrop-blur-md">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "calendar" 
                  ? "text-blue-400 border-t-2 border-blue-500 -mt-[2px]" 
                  : "text-gray-400"
              }`}
              onClick={() => setActiveView("calendar")}
            >
              <span className="text-xs mt-1">Calendar</span>
            </Button>
            
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "folders" 
                  ? "text-blue-400 border-t-2 border-blue-500 -mt-[2px]" 
                  : "text-gray-400"
              }`}
              onClick={() => setActiveView("folders")}
            >
              <span className="text-xs mt-1">Folders</span>
            </Button>
            
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "email" 
                  ? "text-purple-400 border-t-2 border-purple-500 -mt-[2px]" 
                  : "text-gray-400"
              }`}
              onClick={() => setActiveView("email")}
            >
              <span className="text-xs mt-1">Email</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
