# MailForge Email Setup Guide

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Email Service (Resend) - Required for sending emails
RESEND_API_KEY=your_resend_api_key_here

# Email Settings - Required
SENDER_EMAIL=noreply@yourdomain.com
SENDER_NAME=Your Company Name

# App URL - Required for tracking
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Getting Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your domain (or use their test domain)
4. Go to API Keys section
5. Create a new API key
6. Copy the key and add it to your `.env.local`

## Free Tier Limits

- **Resend Free**: 100 emails/day, 3,000 emails/month
- **Domain verification required** for production use
- **Test domain available** for development

## Quick Test Setup

For immediate testing, you can use:

```bash
RESEND_API_KEY=re_your_api_key_here
SENDER_EMAIL=onboarding@resend.dev
SENDER_NAME=MailForge Test
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Restart Development Server

After adding environment variables:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

## Testing Email Sending

1. Create a campaign with your imported contacts
2. Add email content
3. Use "Send Test" to test to your own email
4. If test works, send the full campaign

## Troubleshooting

- **"Email service not configured"**: Check your RESEND_API_KEY
- **"Authentication error"**: Refresh the page and try again
- **"Invalid sender"**: Verify your SENDER_EMAIL domain
- **Rate limit errors**: Wait and try again (free tier limits)