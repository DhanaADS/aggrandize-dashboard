'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    style={{
      position: 'relative',
      display: 'flex',
      height: '40px',
      width: '40px',
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: '50%',
      border: '2px solid rgba(255, 255, 255, 0.1)',
    }}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    style={{
      aspectRatio: '1 / 1',
      height: '100%',
      width: '100%',
      objectFit: 'cover',
    }}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      fontWeight: '600',
    }}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };