import { ArrowRight, CalendarIcon, Folder, Mail, BrainCircuit, RocketIcon, SparklesIcon } from "lucide-react";
import UnifiedLoginButton from "./UnifiedLoginButton";

interface WelcomeScreenProps {
  onAuthSuccess?: () => void;
}

const WelcomeScreen = ({ onAuthSuccess }: WelcomeScreenProps) => {
  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Hero section */}
      <div className="w-full bg-gradient-to-r from-blue-900/40 to-emerald-800/30 backdrop-blur p-8 md:p-16 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">Google Workspace Assistant</h1>
        <p className="text-lg text-gray-300 max-w-2xl text-center">
          Connect your Google Workspace and get AI-powered assistance for your calendar, files, and email
        </p>
        
        <UnifiedLoginButton 
          className="mt-8 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 text-lg rounded-full flex items-center gap-2"
          text="Get Started"
          onSuccess={onAuthSuccess}
        />
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
            <UnifiedLoginButton
              variant="outline"
              className="w-full justify-between group"
              text="Connect Calendar"
              onSuccess={onAuthSuccess}
            />
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
            <UnifiedLoginButton
              variant="outline"
              className="w-full justify-between group"
              text="Connect Drive"
              onSuccess={onAuthSuccess}
            />
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
            <UnifiedLoginButton
              variant="outline"
              className="w-full justify-between group"
              text="Connect Email"
              onSuccess={onAuthSuccess}
            />
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
                <BrainCircuit className="h-6 w-6 text-emerald-400" />
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
};

export default WelcomeScreen;