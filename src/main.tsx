import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { initDatabase } from './db/seed';
import './styles/tokens.css';
import './styles/global.css';
import './styles/glass.css';

// First-run setup. Screens read the database through live queries,
// so they update by themselves once this finishes.
initDatabase();

// HashRouter (URLs like /#/money) works on GitHub Pages with no server config.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
