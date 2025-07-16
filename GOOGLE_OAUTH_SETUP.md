# Google OAuth Setup Guide

## The Issue

If you're getting an error when clicking "Sign up with Google", it's because the Google OAuth environment variables are not configured.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Database
DATABASE_URL="mongodb://localhost:27017/better-auth"

# Email (for password reset and verification)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"

# Better Auth Configuration
BETTER_AUTH_URL="http://localhost:3000"
EMAIL_VERIFICATION_CALLBACK_URL="http://localhost:3000/email-verified"

# Google OAuth (Required for Google Sign In/Sign Up)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## How to Get Google OAuth Credentials

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set the following:
   - **Name**: Your app name (e.g., "BS Consulting")
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`

### Step 3: Copy the Credentials

1. Copy the **Client ID** and **Client Secret**
2. Add them to your `.env.local` file

## Testing

After setting up the environment variables:

1. Restart your development server
2. Try the "Sign up with Google" button again
3. Check the browser console for any error messages

## Common Issues

- **"Invalid redirect_uri"**: Make sure the redirect URI in Google Console matches exactly
- **"Client ID not found"**: Check that GOOGLE_CLIENT_ID is set correctly
- **"Network error"**: Check your internet connection and Google API status

## Production Setup

For production, you'll need to:

1. Update the redirect URIs in Google Console to include your production domain
2. Update BETTER_AUTH_URL in your environment variables
3. Use a proper email service (like SendGrid, AWS SES, etc.)
