import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// The local release server (scripts/serve.mjs) shuts down after 10 idle minutes;
// this keeps it alive while the app is open.
if (import.meta.env.PROD) {
  const ping = () => fetch('/__heartbeat', { cache: 'no-store' }).catch(() => {});
  setInterval(ping, 60_000);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
