import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, LogOut, Folder, Mail, ArrowLeft } from "lucide-react";
import { MobileContext } from "@/context/MobileContext";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

interface HeaderProps {
  activeView: "calendar" | "folders" | "email" | "home";
  setActiveView: (view: "calendar" | "folders" | "email" | "home") => void;
}

const Header = ({ activeView, setActiveView }: HeaderProps) => {
  const { user, logout } = useUnifiedAuth();
  const mobileContext = useContext(MobileContext);
  const isMobile = mobileContext?.isMobile || false;

  const handleLogout = async () => {
    try {
      console.log("Header: Sign out requested");
      await logout();
      setActiveView("home");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <h1 className="text-xl font-medium text-white">Google Workspace Assistant</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-300">
                    {user.displayName || 'User'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {user.email || ''}
                  </span>
                </div>
                <Avatar className="w-8 h-8 border border-gray-600">
                  {user.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                  ) : (
                    <AvatarFallback className="bg-gray-700 text-gray-300">{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                  )}
                </Avatar>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-gray-200 flex items-center gap-1 text-xs"
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
        <div className="flex border-b border-gray-700">
          {/* Back to Home Button */}
          <Button
            variant="ghost"
            size="sm"
            className="px-2 mr-2 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-300 hover:bg-gray-800"
            onClick={() => setActiveView("home")}
            title="Back to Home"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        
          <Button
            variant="ghost"
            className={`px-4 py-2 rounded-none text-sm font-medium ${
              activeView === "calendar" 
                ? "text-blue-400 border-b-2 border-blue-500 bg-transparent" 
                : "text-gray-400 hover:text-blue-300 hover:bg-gray-800"
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
                ? "text-blue-400 border-b-2 border-blue-500 bg-transparent" 
                : "text-gray-400 hover:text-blue-300 hover:bg-gray-800"
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
                ? "text-purple-400 border-b-2 border-purple-500 bg-transparent" 
                : "text-gray-400 hover:text-purple-300 hover:bg-gray-800"
            }`}
            onClick={() => setActiveView("email")}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
