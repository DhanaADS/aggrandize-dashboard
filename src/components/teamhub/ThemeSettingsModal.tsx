'use client';

import { useState } from 'react';
import { ThemeColor, THEME_COLORS } from '@/lib/theme-colors';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeSettingsModalProps {
  onClose: () => void;
}

export default function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
  const { currentTheme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>(currentTheme);

  const handleThemeSelect = (theme: ThemeColor) => {
    setSelectedTheme(theme);
    setTheme(theme); // Apply immediately for preview
  };

  const handleSave = () => {
    setTheme(selectedTheme);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 3000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: '#2a2a2a',
        width: '100%',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        padding: '20px',
        maxHeight: '80vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: '#ffffff',
              margin: '0 0 4px'
            }}>
              Theme Settings
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#b0b0b0',
              margin: 0
            }}>
              Customize your TeamHub appearance
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#ccc',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Theme Colors Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#ffffff',
            margin: '0 0 16px'
          }}>
            Header Theme Colors
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#b0b0b0',
            margin: '0 0 20px'
          }}>
            Choose your favorite color for the header background
          </p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            {THEME_COLORS.map(theme => (
              <div
                key={theme.id}
                onClick={() => handleThemeSelect(theme)}
                style={{
                  cursor: 'pointer',
                  padding: '12px',
                  borderRadius: '16px',
                  background: '#3a3a3a',
                  border: selectedTheme.id === theme.id ? '2px solid #ffffff' : '2px solid transparent',
                  transition: 'all 0.3s ease',
                  textAlign: 'center'
                }}
              >
                {/* Color Preview */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: theme.gradient,
                  margin: '0 auto 8px',
                  border: '3px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {selectedTheme.id === theme.id && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#ffffff',
                      fontSize: '20px',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
                
                {/* Theme Name */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: selectedTheme.id === theme.id ? '#ffffff' : '#e0e0e0',
                  marginBottom: '4px'
                }}>
                  {theme.name}
                </div>
                
                {/* Color Code */}
                <div style={{
                  fontSize: '11px',
                  color: '#888',
                  fontFamily: 'monospace'
                }}>
                  {theme.primary}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#ffffff',
            margin: '0 0 16px'
          }}>
            Preview
          </h3>
          <div style={{
            background: selectedTheme.gradient,
            borderRadius: '16px',
            padding: '20px',
            color: '#ffffff',
            textAlign: 'center'
          }}>
            <h4 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 8px',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Hello! TeamHub
            </h4>
            <p style={{
              fontSize: '14px',
              opacity: 0.9,
              margin: 0,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              This is how your header will look
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '16px',
              border: '1px solid #555',
              borderRadius: '12px',
              background: '#3a3a3a',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2,
              padding: '16px',
              border: 'none',
              borderRadius: '12px',
              background: selectedTheme.gradient,
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Apply Theme
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}