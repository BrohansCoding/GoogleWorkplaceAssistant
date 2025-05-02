import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useContext } from "react";
import { AuthContext } from "@/components/AuthProvider";
import SimpleLogin from "@/components/SimpleLogin";

function Router() {
  // Get authentication state from context
  const { user, isLoading } = useContext(AuthContext);
  
  // If loading, show a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-300 border-t-google-blue" />
      </div>
    );
  }
  
  // If no user, show login
  if (!user) {
    return <SimpleLogin />;
  }
  
  // If authenticated, show the app
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
