import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { CalendarProvider } from "./context/CalendarContext";
import { MobileProvider } from "./context/MobileContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <CalendarProvider>
      <MobileProvider>
        <App />
      </MobileProvider>
    </CalendarProvider>
  </AuthProvider>
);
