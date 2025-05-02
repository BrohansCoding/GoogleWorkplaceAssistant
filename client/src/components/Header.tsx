import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, LogOut, RefreshCw } from "lucide-react";
import { MobileContext } from "@/context/MobileContext";
import { AuthContext } from "@/components/SimpleAuthProvider";
import { signOut as firebaseSignOut } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  activeView: "calendar" | "chat";
  setActiveView: (view: "calendar" | "chat") => void;
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
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-google-blue" />
          <h1 className="text-xl font-medium hidden md:block">Calendar Agent</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Switcher for larger screens */}
          {!isMobile && (
            <div className="mr-4 flex bg-neutral-100 rounded-lg p-1">
              <Button
                variant={activeView === "calendar" ? "default" : "ghost"}
                size="sm"
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${
                  activeView === "calendar" 
                    ? "bg-white shadow-sm text-neutral-800" 
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
                onClick={() => setActiveView("calendar")}
              >
                Calendar
              </Button>
              <Button
                variant={activeView === "chat" ? "default" : "ghost"}
                size="sm"
                className={`px-4 py-1.5 rounded-md text-sm font-medium ${
                  activeView === "chat" 
                    ? "bg-white shadow-sm text-neutral-800" 
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
                onClick={() => setActiveView("chat")}
              >
                Chat
              </Button>
            </div>
          )}
          
          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-neutral-800">
                  {user.displayName || 'User'}
                </span>
                <span className="text-xs text-neutral-600">
                  {user.email || ''}
                </span>
              </div>
              <Avatar className="w-8 h-8">
                {user.photoURL ? (
                  <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                ) : (
                  <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                )}
              </Avatar>
              <Button
                variant="outline"
                size="sm"
                className="text-neutral-600 hover:text-neutral-800 flex items-center gap-1 text-xs"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
