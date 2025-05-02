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
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  console.log("Home: User authenticated, showing main app", user?.uid);
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex flex-1 overflow-hidden p-4">
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-gray-700 bg-gray-800/80 backdrop-blur-sm">
          {/* Render the active view */}
          {activeView === "calendar" && (
            <div className="h-full flex flex-col lg:flex-row">
              <div className="flex-1 h-full overflow-auto lg:pr-96">
                <CalendarView />
              </div>
              <div className="hidden lg:block lg:w-96 lg:border-l border-gray-700 lg:fixed lg:right-4 lg:top-[5.5rem] lg:bottom-4 lg:h-[calc(100vh-5.5rem-1rem)] lg:bg-gray-800/80 lg:backdrop-blur-sm lg:rounded-r-xl">
                <ChatInterface />
              </div>
            </div>
          )}
          {activeView === "folders" && <FoldersView />}
          {activeView === "email" && <EmailView />}
        </div>
      </main>
      
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
