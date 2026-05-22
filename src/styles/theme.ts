import { createTheme } from '@mui/material';

export type ThemeMode = 'light' | 'dark';

const appFontFamily = ['Droid Sans', 'system-ui', 'sans-serif'].join(',');

export const createAppTheme = (mode: ThemeMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#2563EB'
      },
      background:
        mode === 'light'
          ? {
              default: '#F3F4F6',
              paper: '#FFFFFF'
            }
          : {
              default: '#0F172A',
              paper: '#111827'
            },
      text:
        mode === 'light'
          ? {
              primary: '#1E293B',
              secondary: '#64748B'
            }
          : {
              primary: '#E5E7EB',
              secondary: '#94A3B8'
            },
      divider: mode === 'light' ? '#E2E8F0' : '#1F2937'
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: appFontFamily,
      button: {
        fontFamily: appFontFamily,
        fontWeight: 700,
        fontSize: '0.95rem',
        letterSpacing: '0.01em',
        textTransform: 'none'
      }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === 'light'
                ? '0 1px 3px rgba(15, 23, 42, 0.08)'
                : '0 10px 30px rgba(2, 6, 23, 0.35)'
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: mode === 'light' ? '#E2E8F0' : '#1F2937'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            fontFamily: appFontFamily,
            fontWeight: 700,
            letterSpacing: '0.01em',
            textTransform: 'none'
          }
        }
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontFamily: appFontFamily
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          label: {
            fontFamily: appFontFamily,
            fontWeight: 700
          }
        }
      },
      MuiInputBase: {
        styleOverrides: {
          input: {
            fontFamily: appFontFamily
          }
        }
      }
    }
  });
