
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { NotificationProvider } from "./context/NotificationContext";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <NotificationProvider>
      <App />
    </NotificationProvider>
  );
  