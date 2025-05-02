import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useEffect, useContext } from "react";
import { auth, checkRedirectResult } from "./lib/firebase";
import { AuthContext } from "@/context/AuthContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const authContext = useContext(AuthContext);
  
  useEffect(() => {
    console.log("App: Checking for redirect result on mount");
    
    // Check for redirect result when component mounts
    const handleRedirectResult = async () => {
      try {
        const result = await checkRedirectResult();
        if (result && result.user && authContext) {
          console.log("App: Redirect result received, setting user", result.user.uid);
          authContext.setUser(result.user);
        }
      } catch (error) {
        console.error("App: Error handling redirect result", error);
      }
    };
    
    // If already logged in, no need to check redirect
    if (!auth.currentUser) {
      handleRedirectResult();
    } else if (authContext && auth.currentUser) {
      console.log("App: User already logged in, syncing with context");
      authContext.setUser(auth.currentUser);
    }
  }, [authContext]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
