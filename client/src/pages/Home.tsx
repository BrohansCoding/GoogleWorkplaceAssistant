import { useState, useContext } from "react";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import ChatInterface from "@/components/ChatInterface";
import FoldersView from "@/components/FoldersView";
import EmailView from "@/components/EmailView";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MessageSquare, Folder, Mail, X } from "lucide-react";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { MobileContext } from "@/context/MobileContext";

const Home = () => {
  const { user } = useContext(AuthContext);
  const mobileContext = useContext(MobileContext);
  const [activeView, setActiveView] = useState<"calendar" | "folders" | "email">("calendar");
  const [showChat, setShowChat] = useState(true);
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  console.log("Router: rendering with user:", user ? user.uid : "not authenticated");
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex flex-1 overflow-hidden p-4">
        {/* Main content area with calendar/folders/email views */}
        <div className={`flex-grow h-full overflow-auto rounded-xl shadow-lg border border-gray-700 bg-gray-800/80 backdrop-blur-sm 
          ${activeView === "calendar" ? "mr-0 md:mr-[320px]" : "mr-0"}`}>
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
              top: isMobile ? '72px' : '72px',
              height: isMobile ? 'calc(100% - 132px)' : 'calc(100% - 72px)'
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
      {isMobile && (
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
              <CalendarIcon className="h-5 w-5" />
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
              <Folder className="h-5 w-5" />
              <span className="text-xs mt-1">Folders</span>
            </Button>
            
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "email" 
                  ? "text-blue-400 border-t-2 border-blue-500 -mt-[2px]" 
                  : "text-gray-400"
              }`}
              onClick={() => setActiveView("email")}
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs mt-1">Email</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
