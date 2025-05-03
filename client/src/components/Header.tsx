import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, LogOut, Folder, Mail, Home } from "lucide-react";
import { MobileContext } from "@/context/MobileContext";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { signOut as firebaseSignOut } from "@/lib/firebase";

interface HeaderProps {
  activeView: "calendar" | "folders" | "email";
  setActiveView: (view: "calendar" | "folders" | "email") => void;
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
    <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-900 p-1.5 rounded-full">
              <CalendarIcon className="h-5 w-5 text-blue-400" />
            </div>
            <h1 className="text-xl font-medium hidden md:block text-white">G Assistant</h1>
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
                ? "text-blue-400 border-b-2 border-blue-500 bg-transparent" 
                : "text-gray-400 hover:text-blue-300 hover:bg-gray-800"
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
