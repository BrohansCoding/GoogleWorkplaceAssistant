import { useState, useContext, useEffect } from "react";
import Header from "@/components/Header";
import CalendarView from "@/components/CalendarView";
import ChatInterface from "@/components/ChatInterface";
import FoldersView from "@/components/FoldersView";
import EmailView from "@/components/EmailView";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MessageSquare, Folder, Mail, X, ArrowRight, BrainCircuit, RocketIcon, SparklesIcon } from "lucide-react";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { MobileContext } from "@/context/MobileContext";

const Home = () => {
  const { user } = useContext(AuthContext);
  const mobileContext = useContext(MobileContext);
  const [activeView, setActiveView] = useState<"calendar" | "folders" | "email" | "home">("home");
  const [showChat, setShowChat] = useState(true);
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  console.log("Router: rendering with user:", user ? user.uid : "not authenticated");
  
  // Always start on home screen when component is loaded the first time
  useEffect(() => {
    // Make sure we show the home view by default
    setActiveView("home");
  }, []);
  
  // Home screen with agent cards
  const renderHomeScreen = () => (
    <div className="flex flex-col items-center w-full h-full">
      {/* Hero section */}
      <div className="w-full bg-gradient-to-r from-blue-900/40 to-emerald-800/30 backdrop-blur p-8 md:p-16 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">Google Workspace Assistant</h1>
        <p className="text-lg text-gray-300 max-w-2xl text-center">
          Connect your Google Workspace and get AI-powered assistance for your calendar, files, and email
        </p>
        
        <Button 
          onClick={() => setActiveView("calendar")}
          className="mt-8 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 text-lg rounded-full flex items-center gap-2"
        >
          Get Started <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Agent cards */}
      <div className="container mx-auto px-4 py-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Calendar Assistant */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-emerald-600/50 hover:translate-y-[-4px] transition-all">
          <div className="p-5 bg-gradient-to-b from-blue-900/30 to-transparent">
            <div className="h-12 w-12 rounded-full bg-blue-700/50 flex items-center justify-center mb-4">
              <CalendarIcon className="h-6 w-6 text-blue-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Calendar Assistant</h2>
            <p className="text-gray-400">
              Schedule smarter with your intelligent calendar assistant. Get insights about your time usage and meeting patterns.
            </p>
          </div>
          <div className="p-5 border-t border-gray-700 mt-auto">
            <Button
              onClick={() => setActiveView("calendar")} 
              className="w-full justify-between group"
              variant="outline"
            >
              <span>Explore Calendar</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
        
        {/* Folders Assistant */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-emerald-600/50 hover:translate-y-[-4px] transition-all">
          <div className="p-5 bg-gradient-to-b from-emerald-900/30 to-transparent">
            <div className="h-12 w-12 rounded-full bg-emerald-700/50 flex items-center justify-center mb-4">
              <Folder className="h-6 w-6 text-emerald-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Drive Assistant</h2>
            <p className="text-gray-400">
              Chat with your Drive files and folders. Ask questions about your documents and get instant, intelligent answers.
            </p>
          </div>
          <div className="p-5 border-t border-gray-700 mt-auto">
            <Button
              onClick={() => setActiveView("folders")} 
              className="w-full justify-between group"
              variant="outline"
            >
              <span>Explore Drive</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
        
        {/* Email Assistant */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col hover:border-emerald-600/50 hover:translate-y-[-4px] transition-all">
          <div className="p-5 bg-gradient-to-b from-purple-900/30 to-transparent">
            <div className="h-12 w-12 rounded-full bg-purple-700/50 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-purple-300" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email Assistant</h2>
            <p className="text-gray-400">
              Let AI help manage your inbox. Summarize emails, draft responses, and categorize important messages.
            </p>
          </div>
          <div className="p-5 border-t border-gray-700 mt-auto">
            <Button
              onClick={() => setActiveView("email")} 
              className="w-full justify-between group"
              variant="outline"
            >
              <span>Explore Email</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Features section */}
      <div className="w-full bg-gray-900/80 py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-white mb-12">Intelligent Workspace Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-blue-900/30 p-3 mb-4">
                <SparklesIcon className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Smart Scheduling</h3>
              <p className="text-gray-400 text-center">
                AI-powered calendar analysis helps you optimize your schedule and find the best times for meetings.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-emerald-900/30 p-3 mb-4">
                <MessageSquare className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Document Chat</h3>
              <p className="text-gray-400 text-center">
                Ask questions about your files in natural language and get relevant answers from your documents.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-purple-900/30 p-3 mb-4">
                <RocketIcon className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Productivity Boost</h3>
              <p className="text-gray-400 text-center">
                Save time with AI-powered assistants that help you work more efficiently across your Google Workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {activeView !== "home" && <Header activeView={activeView} setActiveView={setActiveView} />}
      
      <main className="flex flex-1 overflow-hidden p-0">
        {/* Main content area with different views */}
        <div className={`flex-grow h-full overflow-auto ${activeView !== "home" ? "rounded-xl shadow-lg border border-gray-700 bg-gray-800/80 backdrop-blur-sm m-4" : ""} 
          ${activeView === "calendar" ? "mr-0 md:mr-[320px]" : "mr-0"}`}>
          {activeView === "home" && renderHomeScreen()}
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
                  ? "text-purple-400 border-t-2 border-purple-500 -mt-[2px]" 
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
