
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { loadContextGraph } from "./storage/config";

  loadContextGraph().then(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
