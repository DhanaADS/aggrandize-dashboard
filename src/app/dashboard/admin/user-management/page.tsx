'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { createClient } from '@/lib/supabase/client';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'marketing' | 'processing' | 'member';
  created_at: string;
}

export default function UserManagementPage() {
  const { user, isAdmin } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Load team members
  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, created_at')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadTeamMembers();
    }
  }, [user, isAdmin]);

  // Update user role
  const updateUserRole = async (userId: string, newRole: TeamMember['role']) => {
    if (!isAdmin) return;

    try {
      setUpdating(userId);
      const supabase = createClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      // Update local state
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === userId 
            ? { ...member, role: newRole }
            : member
        )
      );
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  if (!user) {
    return (
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem 1.5rem',
        textAlign: 'center' 
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '4rem 2rem',
          color: '#ffffff'
        }}>
          <h2 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
            Please log in to access user management.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem 1.5rem',
        textAlign: 'center' 
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '4rem 2rem',
          color: '#ffffff'
        }}>
          <h2 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '1rem' }}>Access Denied</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
            Only administrators can access user management.
          </p>
        </div>
      </div>
    );
  }

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'marketing': return '#f59e0b';
      case 'processing': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getRoleIcon = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return '👑';
      case 'marketing': return '📢';
      case 'processing': return '⚙️';
      default: return '👤';
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1.5rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem'
      }}>
        <h1 style={{
          color: '#ffffff',
          fontSize: '2.5rem',
          fontWeight: 800,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.2
        }}>
          👥 User Management
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '1.125rem',
          margin: 0,
          lineHeight: 1.5
        }}>
          Manage team member roles for AGGRANDIZE Digital
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{teamMembers.length}</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Total Members</div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📢</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{teamMembers.filter(m => m.role === 'marketing').length}</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Marketing</div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{teamMembers.filter(m => m.role === 'processing').length}</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Processing</div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👑</div>
          <div style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>{teamMembers.filter(m => m.role === 'admin').length}</div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Admins</div>
        </div>
      </div>

      {/* Team Members List */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <h2 style={{
            color: '#ffffff',
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            👥 Team Members
          </h2>
        </div>

        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTop: '3px solid #00ff88',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>Loading team members...</p>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : teamMembers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#ffffff'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.5 }}>👥</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>No team members found</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '1rem' }}>
              Team members will appear here once they log in.
            </p>
          </div>
        ) : (
          <div style={{ padding: '1rem' }}>
            {teamMembers.map((member) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  marginBottom: '0.75rem',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    {getRoleIcon(member.role)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem'
                    }}>
                      {member.full_name || member.email.split('@')[0]}
                    </div>
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.875rem'
                    }}>
                      {member.email}
                    </div>
                  </div>

                  <div style={{
                    background: `${getRoleColor(member.role)}20`,
                    border: `1px solid ${getRoleColor(member.role)}40`,
                    color: getRoleColor(member.role),
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    {getRoleIcon(member.role)} {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </div>
                </div>

                {/* Role Selection Dropdown */}
                <div style={{ marginLeft: '1rem' }}>
                  <select
                    value={member.role}
                    onChange={(e) => updateUserRole(member.id, e.target.value as TeamMember['role'])}
                    disabled={updating === member.id || member.id === user?.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      cursor: updating === member.id ? 'not-allowed' : 'pointer',
                      opacity: updating === member.id ? 0.5 : 1
                    }}
                  >
                    <option value="member" style={{ background: '#1a1a1a', color: '#ffffff' }}>👤 Member</option>
                    <option value="marketing" style={{ background: '#1a1a1a', color: '#ffffff' }}>📢 Marketing</option>
                    <option value="processing" style={{ background: '#1a1a1a', color: '#ffffff' }}>⚙️ Processing</option>
                    <option value="admin" style={{ background: '#1a1a1a', color: '#ffffff' }}>👑 Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}