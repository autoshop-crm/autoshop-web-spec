import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { createAppTheme, ThemeMode } from './styles/theme';
import './styles/global.css';

const THEME_MODE_KEY = 'autoshop.themeMode';

const getInitialThemeMode = (): ThemeMode => {
  const savedMode = localStorage.getItem(THEME_MODE_KEY);
  if (savedMode === 'light' || savedMode === 'dark') {
    return savedMode;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const Root = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  useEffect(() => {
    localStorage.setItem(THEME_MODE_KEY, themeMode);
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((currentMode) => (currentMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App themeMode={themeMode} onToggleThemeMode={toggleThemeMode} />
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
