import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

/**
 * Mock Authentication API for Playwright Testing
 * This endpoint creates mock JWT tokens and sets session cookies for testing
 */

// Test user roles mapping
const getTestUserRole = (email: string): string => {
  // Admin users
  if (['dhana@aggrandizedigital.com', 'saravana@aggrandizedigital.com'].includes(email)) {
    return 'admin';
  }
  
  // Marketing team
  if (['veera@aggrandizedigital.com', 'saran@aggrandizedigital.com'].includes(email)) {
    return 'marketing';
  }
  
  // Processing team
  if (['abbas@aggrandizedigital.com', 'gokul@aggrandizedigital.com'].includes(email)) {
    return 'processing';
  }
  
  // Default to member for other test emails
  return 'member';
};

// Create proper NextAuth-compatible JWT token
const createMockJWT = async (userEmail: string, userName: string) => {
  const role = getTestUserRole(userEmail);
  
  const payload = {
    name: userName,
    email: userEmail,
    picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=667eea&color=fff`,
    sub: `test-${userEmail}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    jti: `test-${Date.now()}`,
    role: role,
    teamMember: true,
    isExternal: false,
    permissions: getTestUserPermissions(role)
  };

  // Create a proper JWT token using the same secret NextAuth uses
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'test-secret');
  
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(secret);

  return { payload, jwt };
};

// Get permissions for test user role
const getTestUserPermissions = (role: string) => {
  const rolePermissions = {
    admin: {
      canAccessOrder: true,
      canAccessProcessing: true,
      canAccessInventory: true,
      canAccessTools: true,
      canAccessPayments: true,
      canAccessTodos: true
    },
    marketing: {
      canAccessOrder: true,
      canAccessProcessing: false,
      canAccessInventory: true,
      canAccessTools: true,
      canAccessPayments: false,
      canAccessTodos: true
    },
    processing: {
      canAccessOrder: false,
      canAccessProcessing: true,
      canAccessInventory: false,
      canAccessTools: true,
      canAccessPayments: false,
      canAccessTodos: true
    },
    member: {
      canAccessOrder: false,
      canAccessProcessing: false,
      canAccessInventory: false,
      canAccessTools: false,
      canAccessPayments: false,
      canAccessTodos: true
    }
  };
  
  return rolePermissions[role as keyof typeof rolePermissions] || rolePermissions.member;
};

export async function POST(request: NextRequest) {
  // Only allow in test mode
  const isTestMode = process.env.NODE_ENV === 'test' || 
                    process.env.PLAYWRIGHT_TEST_MODE === 'true' ||
                    request.headers.get('x-playwright-test') === 'true';
  
  if (!isTestMode) {
    return NextResponse.json({ error: 'Test auth only available in test mode' }, { status: 403 });
  }

  try {
    const { userEmail, userName } = await request.json();
    
    if (!userEmail || !userName) {
      return NextResponse.json({ error: 'userEmail and userName are required' }, { status: 400 });
    }

    // Create mock JWT payload and token
    const { payload: mockJWT, jwt: jwtToken } = await createMockJWT(userEmail, userName);
    
    // Use the JWT as the session token
    const sessionToken = jwtToken;
    
    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        name: userName,
        email: userEmail,
        role: mockJWT.role,
        teamMember: mockJWT.teamMember,
        isExternal: mockJWT.isExternal,
        permissions: mockJWT.permissions,
        image: mockJWT.picture
      },
      token: mockJWT,
      sessionToken
    });

    // Set session cookies (similar to NextAuth)
    const cookieOptions = {
      httpOnly: false, // Allow access from client for testing
      secure: false, // Allow in non-HTTPS for local testing
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    };

    // Set NextAuth-style cookies for compatibility
    response.cookies.set('next-auth.session-token', sessionToken, cookieOptions);
    response.cookies.set('next-auth.csrf-token', `test-csrf-${Date.now()}`, cookieOptions);
    
    // Set additional test cookies
    response.cookies.set('test-user-email', userEmail, cookieOptions);
    response.cookies.set('test-user-role', mockJWT.role, cookieOptions);

    return response;
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({ error: 'Failed to create test session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Only allow in test mode
  const isTestMode = process.env.NODE_ENV === 'test' || 
                    process.env.PLAYWRIGHT_TEST_MODE === 'true' ||
                    request.headers.get('x-playwright-test') === 'true';
  
  if (!isTestMode) {
    return NextResponse.json({ error: 'Test auth only available in test mode' }, { status: 403 });
  }

  // Clear test cookies
  const response = NextResponse.json({ success: true, message: 'Test session cleared' });
  
  // Clear all auth-related cookies
  const cookieOptions = {
    httpOnly: false,
    secure: false,
    sameSite: 'lax' as const,
    maxAge: 0, // Expire immediately
    path: '/'
  };

  response.cookies.set('next-auth.session-token', '', cookieOptions);
  response.cookies.set('next-auth.csrf-token', '', cookieOptions);
  response.cookies.set('test-user-email', '', cookieOptions);
  response.cookies.set('test-user-role', '', cookieOptions);

  return response;
}