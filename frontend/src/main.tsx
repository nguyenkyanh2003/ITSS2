
  import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App.tsx";
import { NotificationProvider } from "./context/NotificationContext";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </BrowserRouter>
);
  