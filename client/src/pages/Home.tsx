import { useState, useContext } from "react";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import ChatInterface from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MessageSquare } from "lucide-react";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { MobileContext } from "@/context/MobileContext";

const Home = () => {
  const { user } = useContext(AuthContext);
  const mobileContext = useContext(MobileContext);
  const [activeView, setActiveView] = useState<"calendar" | "chat">("calendar");
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  console.log("Home: User authenticated, showing main app", user?.uid);
  
  return (
    <div className="h-screen flex flex-col">
      <Header activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex flex-1 overflow-hidden">
        {/* Always show both calendar and chat side by side on desktop */}
        {!isMobile && (
          <>
            <div className="w-3/5 h-full border-r border-border">
              <CalendarView />
            </div>
            <div className="w-2/5 h-full">
              <ChatInterface />
            </div>
          </>
        )}
        
        {/* On mobile, show only the active view */}
        {isMobile && activeView === "calendar" && (
          <div className="w-full h-full">
            <CalendarView />
          </div>
        )}
        
        {isMobile && activeView === "chat" && (
          <div className="w-full h-full">
            <ChatInterface />
          </div>
        )}
      </main>
      
      {/* Mobile Navigation */}
      {isMobile && (
        <div className="border-t border-border bg-card">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              className={`flex flex-col items-center py-2 px-4 ${
                activeView === "calendar" 
                  ? "text-primary border-t-2 border-primary -mt-[2px]" 
                  : "text-muted-foreground"
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
                  ? "text-primary border-t-2 border-primary -mt-[2px]" 
                  : "text-muted-foreground"
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
