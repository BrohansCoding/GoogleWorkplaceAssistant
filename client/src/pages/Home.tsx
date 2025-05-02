import { useState, useContext } from "react";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import ChatInterface from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MessageSquare } from "lucide-react";
import { AuthContext } from "@/components/AuthProvider";
import { MobileContext } from "@/context/MobileContext";

const Home = () => {
  const { user } = useContext(AuthContext);
  const mobileContext = useContext(MobileContext);
  const [activeView, setActiveView] = useState<"calendar" | "chat">("calendar");
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  // If mobile, show only active view
  const showCalendar = !isMobile || activeView === "calendar";
  const showChat = !isMobile || activeView === "chat";
  
  console.log("Home: User authenticated, showing main app", user?.uid);
  
  return (
    <div className="h-screen flex flex-col">
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex flex-1 overflow-hidden">
        {showCalendar && (
          <div className={`${isMobile ? "w-full" : "w-1/2 lg:w-3/5"} h-full`}>
            <CalendarView />
          </div>
        )}
        
        {showChat && (
          <div className={`${isMobile ? "w-full" : "w-1/2 lg:w-2/5"} h-full`}>
            <ChatInterface />
          </div>
        )}
      </main>
      
      {/* Mobile Navigation */}
      {isMobile && (
        <div className="border-t border-neutral-200 bg-white">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "calendar" 
                  ? "text-google-blue border-t-2 border-google-blue -mt-[2px]" 
                  : "text-neutral-600"
              }`}
              onClick={() => setActiveView("calendar")}
            >
              <CalendarIcon className="h-5 w-5" />
              <span className="text-xs mt-1">Calendar</span>
            </Button>
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "chat" 
                  ? "text-google-blue border-t-2 border-google-blue -mt-[2px]" 
                  : "text-neutral-600"
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
