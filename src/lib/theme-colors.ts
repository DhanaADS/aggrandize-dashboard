// Theme color system for TeamHub
export interface ThemeColor {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  gradient: string;
}

export const THEME_COLORS: ThemeColor[] = [
  {
    id: 'teal',
    name: 'Teal Ocean',
    primary: '#66C5CC',
    secondary: '#4A9CA6',
    gradient: 'linear-gradient(135deg, #66C5CC 0%, #4A9CA6 100%)'
  },
  {
    id: 'golden',
    name: 'Golden Sun',
    primary: '#F6CF71',
    secondary: '#E6B85C',
    gradient: 'linear-gradient(135deg, #F6CF71 0%, #E6B85C 100%)'
  },
  {
    id: 'coral',
    name: 'Coral Sunset',
    primary: '#F89C74',
    secondary: '#E6865A',
    gradient: 'linear-gradient(135deg, #F89C74 0%, #E6865A 100%)'
  },
  {
    id: 'purple',
    name: 'Purple Dream',
    primary: '#DCB0F2',
    secondary: '#C994E6',
    gradient: 'linear-gradient(135deg, #DCB0F2 0%, #C994E6 100%)'
  },
  {
    id: 'green',
    name: 'Forest Green',
    primary: '#87C55F',
    secondary: '#72A548',
    gradient: 'linear-gradient(135deg, #87C55F 0%, #72A548 100%)'
  },
  {
    id: 'blue',
    name: 'Sky Blue',
    primary: '#9EB9F3',
    secondary: '#7FA3E8',
    gradient: 'linear-gradient(135deg, #9EB9F3 0%, #7FA3E8 100%)'
  },
  {
    id: 'pink',
    name: 'Rose Pink',
    primary: '#FE88B1',
    secondary: '#E87298',
    gradient: 'linear-gradient(135deg, #FE88B1 0%, #E87298 100%)'
  },
  {
    id: 'lime',
    name: 'Lime Fresh',
    primary: '#C9DB74',
    secondary: '#B5C85E',
    gradient: 'linear-gradient(135deg, #C9DB74 0%, #B5C85E 100%)'
  },
  {
    id: 'mint',
    name: 'Mint Fresh',
    primary: '#8BE0A4',
    secondary: '#6FD188',
    gradient: 'linear-gradient(135deg, #8BE0A4 0%, #6FD188 100%)'
  },
  {
    id: 'lavender',
    name: 'Lavender Dream',
    primary: '#B497E7',
    secondary: '#9B7EDB',
    gradient: 'linear-gradient(135deg, #B497E7 0%, #9B7EDB 100%)'
  },
  {
    id: 'default',
    name: 'Default Blue',
    primary: '#667eea',
    secondary: '#764ba2',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }
];

export const DEFAULT_THEME = THEME_COLORS[10]; // Default blue theme

// Theme context functions
export const getStoredTheme = (): ThemeColor => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  
  const storedThemeId = localStorage.getItem('teamhub-theme');
  return THEME_COLORS.find(theme => theme.id === storedThemeId) || DEFAULT_THEME;
};

export const setStoredTheme = (themeId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('teamhub-theme', themeId);
};

export const SEVERITY_COLORS = {
  high: '#FF5252',    // Red for urgent/high priority
  medium: '#FF9800',  // Orange for medium priority  
  low: '#4CAF50',     // Green for low priority
  info: '#2196F3'     // Blue for information
};