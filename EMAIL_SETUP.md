# Email Verification Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Get Free Resend API Key

1. Go to [Resend.com](https://resend.com) and sign up
2. Go to API Keys → Create API Key
3. Copy the key (starts with `re_`)

### Step 2: Add to .env.local

```env
RESEND_API_KEY="re_your-api-key-here"
```

### Step 3: Test

Restart your dev server and try signing up - emails will work immediately!

---

## Free Email Service Setup (Resend)

This project uses **Resend** for email verification, which offers a generous free tier (3,000 emails/month).

### Step 1: Create Resend Account

1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Get API Key

1. After logging in, go to the API Keys section
2. Create a new API key
3. Copy the API key (starts with `re_`)

### Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Database
DATABASE_URL="your-database-url"

# Better Auth Configuration
BETTER_AUTH_URL="http://localhost:3000"
EMAIL_VERIFICATION_CALLBACK_URL="http://localhost:3000/email-verified"

# Email Service (Resend - Free Tier)
RESEND_API_KEY="re_your-api-key-here"
FROM_EMAIL="noreply@yourdomain.com"  # Optional: defaults to noreply@yourdomain.com
```

### Step 4: Verify Domain (Optional but Recommended)

For production, you should verify your domain with Resend:

1. Go to Domains section in Resend dashboard
2. Add your domain (e.g., `yourdomain.com`)
3. Follow the DNS setup instructions
4. Update `FROM_EMAIL` to use your verified domain

### Development Mode

If you don't set up Resend, the app will fall back to local development mode using MailDev/MailHog:

1. Install MailDev: `npm install -g maildev`
2. Run: `maildev`
3. Access email preview at: `http://localhost:1080`

### Testing Email Verification

1. Start your development server
2. Create a new account
3. Check your email (or MailDev interface)
4. Click the verification link
5. You should be redirected to the email verified page

### Production Deployment

For production, make sure to:

1. Set up a verified domain in Resend
2. Update `BETTER_AUTH_URL` to your production domain
3. Update `EMAIL_VERIFICATION_CALLBACK_URL` to your production domain
4. Set `FROM_EMAIL` to use your verified domain

### Troubleshooting

- **Emails not sending**: Check your Resend API key and domain verification
- **Verification links not working**: Ensure `BETTER_AUTH_URL` and `EMAIL_VERIFICATION_CALLBACK_URL` are correct
- **Development emails**: Make sure MailDev is running if not using Resend

### Free Tier Limits

- **Resend**: 3,000 emails/month free
- **MailDev**: Unlimited (local development only)

This setup provides a production-ready email verification system with a generous free tier!
