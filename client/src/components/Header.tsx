import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, LogOut, Folder, Mail } from "lucide-react";
import { MobileContext } from "@/context/MobileContext";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { signOut as firebaseSignOut } from "@/lib/firebase";

interface HeaderProps {
  activeView: "calendar" | "chat" | "folders" | "email";
  setActiveView: (view: "calendar" | "chat" | "folders" | "email") => void;
}

const Header = ({ activeView, setActiveView }: HeaderProps) => {
  const authContext = useContext(AuthContext);
  const mobileContext = useContext(MobileContext);
  const user = authContext?.user || null;
  const isMobile = mobileContext?.isMobile || false;

  const handleLogout = async () => {
    try {
      console.log("Header: Sign out requested");
      // Sign out of Firebase
      await firebaseSignOut();
      
      // Clear session on server
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white/60 backdrop-blur-lg border-b border-indigo-100 shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-1.5 rounded-full">
              <CalendarIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <h1 className="text-xl font-medium hidden md:block text-indigo-900">G Assistant</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-800">
                    {user.displayName || 'User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {user.email || ''}
                  </span>
                </div>
                <Avatar className="w-8 h-8 border border-indigo-200">
                  {user.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                  ) : (
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  )}
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-700 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-1 text-xs"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-indigo-100">
          <Button
            variant="ghost"
            className={`px-4 py-2 rounded-none text-sm font-medium ${
              activeView === "calendar" 
                ? "text-indigo-700 border-b-2 border-indigo-500 bg-transparent" 
                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
            onClick={() => setActiveView("calendar")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          
          <Button
            variant="ghost"
            className={`px-4 py-2 rounded-none text-sm font-medium ${
              activeView === "folders" 
                ? "text-indigo-700 border-b-2 border-indigo-500 bg-transparent" 
                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
            onClick={() => setActiveView("folders")}
          >
            <Folder className="mr-2 h-4 w-4" />
            Folders
          </Button>
          
          <Button
            variant="ghost"
            className={`px-4 py-2 rounded-none text-sm font-medium ${
              activeView === "email" 
                ? "text-indigo-700 border-b-2 border-indigo-500 bg-transparent" 
                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
            onClick={() => setActiveView("email")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          
          <Button
            variant="ghost"
            className={`px-4 py-2 rounded-none text-sm font-medium ${
              activeView === "chat" 
                ? "text-indigo-700 border-b-2 border-indigo-500 bg-transparent" 
                : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
            }`}
            onClick={() => setActiveView("chat")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI Chat
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
