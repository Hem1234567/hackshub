import { createRoot } from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App.tsx";
import "./index.css";

// Disable right-click context menu (hides "Inspect" option)
document.addEventListener('contextmenu', (e) => e.preventDefault());

const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
            updateSW(true);
        }
    },
});

createRoot(document.getElementById("root")!).render(<App />);
