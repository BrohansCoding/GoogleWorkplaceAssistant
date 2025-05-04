import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { UnifiedAuthProvider } from "./components/UnifiedAuthProvider";
import { CalendarProvider } from "./context/CalendarContext";
import { MobileProvider } from "./context/MobileContext";

createRoot(document.getElementById("root")!).render(
  <UnifiedAuthProvider>
    <CalendarProvider>
      <MobileProvider>
        <App />
      </MobileProvider>
    </CalendarProvider>
  </UnifiedAuthProvider>
);
