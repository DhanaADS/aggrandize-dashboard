import { createTheme, Theme } from '@mui/material/styles';

// AGGRANDIZE Brand Colors - Based on Design Mockups
const brandColors = {
  dark: {
    primary: '#00BCD4',      // Use the vibrant accent for primary actions
    surface: '#1f2937',      // A lighter grey for cards and surfaces
    background: '#1f2937',   // A very dark grey for the main background
    sidebar: '#1f2937',      // Consistent with other surfaces
    accent: '#00BCD4',       // Accent/highlight color
    text: {
      primary: '#E0E0E0',    // A light grey, not pure white
      secondary: '#B0BEC5',
      disabled: '#546E7A'
    }
  },
  light: {
    primary: '#FFFFFF',      // Main light theme color  
    surface: '#FFFFFF',      // Cards and elevated surfaces
    background: '#FFFFFF',   // Page background
    sidebar: '#FFFFFF',      // Sidebar background
    accent: '#00ACC1',       // Accent/highlight color
    text: {
      primary: '#212121',
      secondary: '#757575', 
      disabled: '#BDBDBD'
    }
  }
};

// Common theme configuration
const commonTheme = {
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
};

// Dark Theme
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: brandColors.dark.primary,
      light: brandColors.dark.surface,
      dark: brandColors.dark.background,
      contrastText: brandColors.dark.text.primary,
    },
    secondary: {
      main: brandColors.dark.accent,
      light: '#4DD0E1',
      dark: '#00838F',
      contrastText: brandColors.dark.text.primary,
    },
    background: {
      default: brandColors.dark.background,
      paper: brandColors.dark.surface,
    },
    text: {
      primary: brandColors.dark.text.primary,
      secondary: brandColors.dark.text.secondary,
      disabled: brandColors.dark.text.disabled,
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.08)',
      disabled: 'rgba(255, 255, 255, 0.26)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brandColors.dark.background,
          color: brandColors.dark.text.primary,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.dark.sidebar,
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: brandColors.dark.sidebar,
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.dark.surface,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.dark.surface,
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
  },
});

// Light Theme
export const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.light.accent, // Use the project's accent color
      light: '#5ddef4',      // Lighter shade of the accent
      dark: '#007c91',       // Darker shade of the accent
      contrastText: '#ffffff', // White text provides good contrast
    },
    secondary: {
      main: brandColors.light.accent,
      light: '#4DD0E1',
      dark: '#00838F',
      contrastText: brandColors.light.primary,
    },
    background: {
      default: brandColors.light.background,
      paper: brandColors.light.primary,
    },
    text: {
      primary: brandColors.light.text.primary,
      secondary: brandColors.light.text.secondary,
      disabled: brandColors.light.text.disabled,
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brandColors.light.background,
          color: brandColors.light.text.primary,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.light.sidebar,
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          color: brandColors.light.text.primary,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: brandColors.light.sidebar,
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.light.primary,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.light.primary,
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
  },
});

// Export brand colors for direct use
export { brandColors };