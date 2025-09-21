# Supabase SMTP Configuration Guide

## Steps to Configure Email in Supabase Dashboard:

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://app.supabase.com
   - Go to **Authentication** → **Email Templates**

2. **Configure SMTP Settings**
   - Go to **Settings** → **Auth**
   - Scroll to **SMTP Settings**
   - Enable "Custom SMTP"

3. **Add SMTP Provider Details**

   ### Using Gmail (Development)
   ```
   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
   Password: your-app-specific-password
   Sender email: your-email@gmail.com
   Sender name: AgriTech Platform
   ```

   ### Using SendGrid (Production)
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: your-sendgrid-api-key
   Sender email: noreply@yourdomain.com
   Sender name: AgriTech Platform
   ```

   ### Using Resend (Recommended)
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: your-resend-api-key
   Sender email: onboarding@resend.dev
   Sender name: AgriTech Platform
   ```

4. **Test Configuration**
   - Save the settings
   - Test with "Send test email"

## Alternative: Disable Email Confirmation (Development Only)

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle OFF "Confirm email"
3. Save changes

This will auto-confirm users without sending emails.