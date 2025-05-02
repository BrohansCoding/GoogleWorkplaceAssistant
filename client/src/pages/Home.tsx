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
  const [activeView, setActiveView] = useState<"calendar" | "chat" | "folders" | "email">("calendar");
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  console.log("Home: User authenticated, showing main app", user?.uid);
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex flex-1 overflow-hidden p-4">
        <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-white/40 bg-white/30 backdrop-blur-sm">
          {/* Render the active view */}
          {activeView === "calendar" && <CalendarView />}
          {activeView === "folders" && <FoldersView />}
          {activeView === "email" && <EmailView />}
          {activeView === "chat" && <ChatInterface />}
        </div>
      </main>
      
      {/* Mobile Navigation */}
      {isMobile && (
        <div className="border-t border-indigo-100 bg-white/80 backdrop-blur-md">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "calendar" 
                  ? "text-indigo-700 border-t-2 border-indigo-500 -mt-[2px]" 
                  : "text-gray-500"
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
                  ? "text-indigo-700 border-t-2 border-indigo-500 -mt-[2px]" 
                  : "text-gray-500"
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
                  ? "text-indigo-700 border-t-2 border-indigo-500 -mt-[2px]" 
                  : "text-gray-500"
              }`}
              onClick={() => setActiveView("email")}
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs mt-1">Email</span>
            </Button>
            
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "chat" 
                  ? "text-indigo-700 border-t-2 border-indigo-500 -mt-[2px]" 
                  : "text-gray-500"
              }`}
              onClick={() => setActiveView("chat")}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-xs mt-1">Chat</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
