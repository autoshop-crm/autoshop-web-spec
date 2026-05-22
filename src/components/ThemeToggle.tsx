import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { Box, IconButton, Tooltip, alpha, useTheme } from '@mui/material';
import { ThemeMode } from '../styles/theme';

interface ThemeToggleProps {
  themeMode: ThemeMode;
  onToggle: () => void;
}

export const ThemeToggle = ({ themeMode, onToggle }: ThemeToggleProps) => {
  const theme = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <Tooltip title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}>
      <IconButton
        onClick={onToggle}
        color="inherit"
        aria-label="Переключить тему"
        sx={{
          p: 0,
          borderRadius: 999,
          '&:hover': {
            backgroundColor: 'transparent'
          }
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: 64,
            height: 34,
            borderRadius: 999,
            px: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: isDark ? alpha('#0F172A', 0.9) : alpha('#BFDBFE', 0.9),
            border: `1px solid ${theme.palette.divider}`,
            transition: 'background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
            boxShadow: isDark
              ? 'inset 0 1px 2px rgba(15, 23, 42, 0.55)'
              : 'inset 0 1px 2px rgba(255, 255, 255, 0.6)'
          }}
        >
          <LightModeRoundedIcon
            sx={{
              fontSize: 18,
              color: isDark ? alpha('#F8FAFC', 0.55) : '#F59E0B',
              transition: 'color 220ms ease, transform 220ms ease, opacity 220ms ease',
              transform: isDark ? 'scale(0.9)' : 'scale(1)',
              opacity: isDark ? 0.65 : 1,
              zIndex: 1
            }}
          />
          <DarkModeRoundedIcon
            sx={{
              fontSize: 18,
              color: isDark ? '#C4B5FD' : alpha('#1E293B', 0.5),
              transition: 'color 220ms ease, transform 220ms ease, opacity 220ms ease',
              transform: isDark ? 'scale(1)' : 'scale(0.9)',
              opacity: isDark ? 1 : 0.65,
              zIndex: 1
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 3,
              left: isDark ? 'calc(100% - 31px)' : 3,
              width: 26,
              height: 26,
              borderRadius: '50%',
              bgcolor: isDark ? '#E5E7EB' : '#FFFFFF',
              boxShadow: isDark
                ? '0 2px 8px rgba(15, 23, 42, 0.35)'
                : '0 2px 8px rgba(37, 99, 235, 0.22)',
              transition: 'left 240ms cubic-bezier(0.4, 0, 0.2, 1), background-color 220ms ease, box-shadow 220ms ease'
            }}
          />
        </Box>
      </IconButton>
    </Tooltip>
  );
};
