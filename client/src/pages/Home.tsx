import { useState, useContext } from "react";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import ChatInterface from "@/components/ChatInterface";
import FoldersView from "@/components/FoldersView";
import EmailView from "@/components/EmailView";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MessageSquare, Folder, Mail } from "lucide-react";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { MobileContext } from "@/context/MobileContext";

const Home = () => {
  const { user } = useContext(AuthContext);
  const mobileContext = useContext(MobileContext);
  const [activeView, setActiveView] = useState<"calendar" | "folders" | "email">("calendar");
  const [chatOpen, setChatOpen] = useState(true);
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  console.log("Router: rendering with user:", user ? user.uid : "not authenticated");
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex flex-1 overflow-hidden p-4">
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-700 bg-gray-800/80 backdrop-blur-sm flex">
          {/* Main Content Area */}
          <div className="relative flex-grow h-full overflow-hidden">
            {/* Render the active view */}
            {activeView === "calendar" && (
              <div className="h-full overflow-auto">
                <CalendarView />
              </div>
            )}
            {activeView === "folders" && <FoldersView />}
            {activeView === "email" && <EmailView />}
          </div>

          {/* Fixed Chat Sidebar */}
          <div className={`
            fixed right-0 top-0 h-full w-[320px] z-10 transition-transform duration-300 ease-in-out
            ${!isMobile ? 'lg:relative lg:translate-x-0' : ''}
            ${(isMobile && !chatOpen) ? 'translate-x-full' : 'translate-x-0'}
          `}
          style={{ 
            height: !isMobile ? '100%' : 'calc(100% - 120px)', 
            marginTop: !isMobile ? '0' : '72px'
          }}>
            <div className="h-full">
              <ChatInterface onClose={() => setChatOpen(false)} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Chat Toggle Button */}
      {isMobile && !chatOpen && (
        <Button
          className="fixed bottom-20 right-4 rounded-full w-12 h-12 bg-blue-600 shadow-lg z-20 flex items-center justify-center"
          onClick={() => setChatOpen(true)}
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
