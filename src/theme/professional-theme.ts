// AGGRANDIZE Professional Theme Configuration

export interface ProfessionalTheme {
  name: 'light' | 'dark';
  colors: {
    primary: {
      main: string;
    };
    background: {
      default: string;
      paper: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    border: {
      default: string;
    };
    hover: {
      main: string;
    };
    active: {
      main: string;
    };
  };
}

// Light Theme Configuration
export const lightTheme: ProfessionalTheme = {
  name: 'light',
  colors: {
    primary: {
      main: "#00A78E",
    },
    background: {
      default: "#F8F9FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1F2937",
      secondary: "#6B7280",
    },
    border: {
      default: "#E5E7EB",
    },
    hover: {
      main: "#F3F4F6",
    },
    active: {
      main: "#E0F2F1",
    },
  },
};

// Dark Theme Configuration
export const darkTheme: ProfessionalTheme = {
  name: 'dark',
  colors: {
    primary: {
      main: "#00C5B8",
    },
    background: {
      default: "#0D1117",
      paper: "#161B22",
    },
    text: {
      primary: "#E5E7EB",
      secondary: "#8D96A0",
    },
    border: {
      default: "#21262D",
    },
    hover: {
      main: "rgba(255, 255, 255, 0.05)",
    },
    active: {
      main: "rgba(0, 197, 184, 0.2)",
    },
  },
};