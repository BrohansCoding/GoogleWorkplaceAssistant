import { useContext, useState } from "react";
import { MessageSquare, Folder, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import FolderChatInterface from "@/components/FolderChatInterface";
import { MobileContext } from "@/context/MobileContext";

const FoldersView = () => {
  const mobileContext = useContext(MobileContext);
  const [showChat, setShowChat] = useState(true);
  
  // Get mobile state safely
  const isMobile = mobileContext?.isMobile || false;
  
  return (
    <div className="flex flex-col h-full bg-gray-800/60 backdrop-blur-sm relative overflow-hidden">
      <div className="p-4 flex-1 overflow-auto">
        <div className="text-center max-w-xl mx-auto p-6 rounded-xl bg-gray-800/80 shadow-lg border border-gray-700">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-900 flex items-center justify-center">
            <Folder className="h-10 w-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-emerald-400">Google Drive Assistant</h2>
          <p className="text-gray-300 mb-4">
            Access your Google Drive documents and ask questions about your files. Simply paste a Google Drive document link into the chat and start asking questions.
          </p>
          <div className="bg-gray-900/80 p-4 rounded-lg border border-emerald-900">
            <h3 className="text-sm font-semibold text-emerald-400 mb-2">How it works:</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Paste a Google Drive document link into the chat
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Ask questions about the document content
              </li>
              <li className="flex items-center">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                Get AI-powered responses based on your file
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Fixed Chat Sidebar */}
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
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-medium text-gray-200">Folder Assistant</h3>
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
          
          {/* Folder Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <FolderChatInterface />
          </div>
        </div>
      </div>
      
      {/* Mobile Chat Toggle Button */}
      {isMobile && !showChat && (
        <Button
          className="fixed bottom-20 right-4 rounded-full w-12 h-12 bg-emerald-700 shadow-lg z-20 flex items-center justify-center"
          onClick={() => setShowChat(true)}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default FoldersView;