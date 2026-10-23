import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { preloadPdfLibs } from './lib/pdf';
import './index.css';

// The local release server (scripts/serve.mjs) shuts down after 10 idle minutes;
// this keeps it alive while the app is open. Browsers pause background tabs, so also
// ping as soon as the tab is visible again.
if (import.meta.env.PROD) {
  const ping = () => fetch('/__heartbeat', { cache: 'no-store' }).catch(() => {});
  setInterval(ping, 60_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && ping());
  // load the PDF code while the server is surely up, so exports work even after it stops
  window.addEventListener('load', () => setTimeout(preloadPdfLibs, 1500));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
