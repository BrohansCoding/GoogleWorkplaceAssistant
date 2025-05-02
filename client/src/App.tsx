import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { useContext } from "react";
import { AuthContext } from "@/components/SimpleAuthProvider";
import NewLoginButton from "@/components/NewLoginButton";
import SimpleAuthProvider from "@/components/SimpleAuthProvider";

function Router() {
  // Get authentication state from context
  const { user, isLoading } = useContext(AuthContext);
  
  console.log("Router: rendering with user:", user ? "authenticated" : "not authenticated");
  
  // If no user, show login
  if (!user) {
    return <NewLoginButton />;
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
      <SimpleAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </SimpleAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
