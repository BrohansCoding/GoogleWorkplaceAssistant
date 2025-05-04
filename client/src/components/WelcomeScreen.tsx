import { ArrowRight, CalendarIcon, Folder, Mail, BrainCircuit, RocketIcon, SparklesIcon, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import UnifiedLoginButton from "./UnifiedLoginButton";
import { Button } from "@/components/ui/button";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface WelcomeScreenProps {
  onAuthSuccess?: () => void;
}

const WelcomeScreen = ({ onAuthSuccess }: WelcomeScreenProps) => {
  const { firebaseConfigValid, errorMessage } = useUnifiedAuth();
  const { toast } = useToast();
  
  // Show toast for configuration errors
  useEffect(() => {
    if (!firebaseConfigValid && errorMessage) {
      toast({
        title: "Configuration Error",
        description: "Firebase configuration is missing or incomplete. Please check the environment variables.",
        variant: "destructive",
        duration: 7000
      });
    }
  }, [firebaseConfigValid, errorMessage, toast]);
  
  return (
    <div className="flex flex-col items-center w-full h-full">
      {/* Configuration error banner */}
      {!firebaseConfigValid && errorMessage && (
        <div className="w-full bg-red-900/70 text-white px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-200" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-100">Firebase Configuration Error</h3>
            <p className="text-sm text-red-200 mt-1">
              {errorMessage} Please ensure all required environment variables are set.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a 
                href="https://console.firebase.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs bg-red-800/50 hover:bg-red-800 px-2 py-1 rounded text-red-100"
              >
                Firebase Console <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              <a 
                href="https://github.com/username/repo/blob/main/README.md#firebase-setup" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs bg-red-800/50 hover:bg-red-800 px-2 py-1 rounded text-red-100"
              >
                Setup Instructions <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero section */}
      <div className="w-full bg-gradient-to-r from-blue-900/40 to-emerald-800/30 backdrop-blur p-8 md:p-16 flex flex-col items-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">Google Workspace Assistant</h1>
        <p className="text-lg text-gray-300 max-w-2xl text-center mb-6">
          Connect your Google Workspace and get AI-powered assistance for your calendar, files, and email
        </p>
        
        <div className="flex flex-col items-center bg-gray-800/60 p-6 rounded-lg border border-gray-700 max-w-xl w-full mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">One-Click Access to All Services</h2>
          <p className="text-gray-300 text-center mb-4">
            Sign in once to connect all your Google services - Calendar, Drive, and Email.
            We'll request the necessary permissions in a single step.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full mb-4">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>Google Calendar</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>Google Drive</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span>Gmail</span>
            </div>
          </div>
          
          <UnifiedLoginButton 
            className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 text-lg rounded-full flex items-center gap-2 w-full sm:w-auto"
            text="Get Started with All Services"
            onSuccess={onAuthSuccess}
            showIcon={true}
            fullWidth={true}
          />
        </div>
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
              Visualize and manage your Google Calendar with a clean, organized interface. Navigate with day and week views to track your schedule.
            </p>
          </div>
          <div className="p-5 border-t border-gray-700 mt-auto">
            <Button
              variant="outline"
              className="w-full justify-between group"
              onClick={onAuthSuccess}
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
              variant="outline"
              className="w-full justify-between group"
              onClick={onAuthSuccess}
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
              Let AI help manage your inbox by automatically categorizing your emails into smart categories for better organization.
            </p>
          </div>
          <div className="p-5 border-t border-gray-700 mt-auto">
            <Button
              variant="outline"
              className="w-full justify-between group"
              onClick={onAuthSuccess}
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