# TeamMove Modern Stripe Integration - Complete Testing Guide

## Overview

This comprehensive testing guide will walk you through testing the complete Stripe integration in the TeamMove platform, including all subscription types, payment flows, admin functions, and error scenarios.

## Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Environment Configuration](#environment-configuration)
3. [Test Data Setup](#test-data-setup)
4. [Payment Flow Testing](#payment-flow-testing)
5. [Admin Function Testing](#admin-function-testing)
6. [Error Scenario Testing](#error-scenario-testing)
7. [API Endpoint Testing](#api-endpoint-testing)
8. [Frontend Component Testing](#frontend-component-testing)
9. [Email Notification Testing](#email-notification-testing)
10. [Performance and Security Testing](#performance-and-security-testing)
11. [Troubleshooting](#troubleshooting)

## Pre-Testing Setup

### 1. Environment Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher)
- PostgreSQL database
- Git
- A modern web browser
- Stripe CLI (optional but recommended)

### 2. Stripe Account Setup

1. Create a Stripe test account at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Get your test API keys from the Stripe dashboard
3. Create the required products and price IDs in Stripe dashboard

#### Creating Stripe Products

Navigate to Stripe Dashboard > Products and create:

**Event Packages:**
1. **Événementielle Single**
   - Name: "Event Pack - Single Event"
   - Price: €15.00 (one-time)
   - Copy the Price ID to `STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID`

2. **Événementielle Pack 10**
   - Name: "Event Pack - 10 Events"
   - Price: €150.00 (one-time)
   - Copy the Price ID to `STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID`

**Pro Subscriptions:**
3. **Pro Club**
   - Name: "Pro Club Subscription"
   - Price: €19.99 (monthly recurring)
   - Copy the Price ID to `STRIPE_PRO_CLUB_PRICE_ID`

4. **Pro PME**
   - Name: "Pro PME Subscription"
   - Price: €49.00 (monthly recurring)
   - Copy the Price ID to `STRIPE_PRO_PME_PRICE_ID`

5. **Pro Entreprise**
   - Name: "Pro Enterprise Subscription"
   - Price: €99.00 (monthly recurring)
   - Copy the Price ID to `STRIPE_PRO_ENTREPRISE_PRICE_ID`

### 3. SendGrid Setup

1. Create a SendGrid account at [https://sendgrid.com/](https://sendgrid.com/)
2. Create an API key
3. Verify a sender email address
4. Update environment variables

## Environment Configuration

### 1. Copy and Configure Environment File

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your actual values
```

### 2. Required Environment Variables

Update your `.env` file with the actual values:

```bash
# Replace with your actual Stripe keys
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key
VITE_STRIPE_PUBLIC_KEY=pk_test_your_actual_public_key

# Replace with your actual Price IDs from Stripe Dashboard
STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID=price_your_actual_price_id_1
STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID=price_your_actual_price_id_2
STRIPE_PRO_CLUB_PRICE_ID=price_your_actual_price_id_3
STRIPE_PRO_PME_PRICE_ID=price_your_actual_price_id_4
STRIPE_PRO_ENTREPRISE_PRICE_ID=price_your_actual_price_id_5

# Replace with your actual SendGrid configuration
SENDGRID_API_KEY=SG.your_actual_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender@domain.com
SENDGRID_FROM_NAME=TeamMove

# Set your application URL
APP_URL=http://localhost:5173
```

### 3. Database Setup

```bash
# Ensure your database is running and migrations are applied
npm run db:migrate

# (Optional) Seed test data
npm run db:seed
```

## Test Data Setup

### 1. Create Test Users

Create different types of users for comprehensive testing:

**Admin User:**
```bash
# Register an admin user (use the admin creation endpoint)
curl -X POST http://localhost:8080/api/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPass123!",
    "firstName": "Admin",
    "lastName": "User",
    "adminSecret": "dev-admin-secret-2024"
  }'
```

**Regular Users:**
```bash
# Create regular test users
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "UserPass123!",
    "firstName": "Test",
    "lastName": "User1"
  }'

curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "UserPass123!",
    "firstName": "Test", 
    "lastName": "User2"
  }'
```

### 2. Start the Application

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# In another terminal, start the backend
npm run server:dev
```

The application should be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080

## Payment Flow Testing

### Test Case 1: Successful Payment Flow

#### 1.1 Test Événementielle Single Payment

**Steps:**
1. Navigate to http://localhost:5173
2. Log in with a regular user account
3. Go to subscription plans page (`/subscription-plans`)
4. Click on "Événementielle Single" plan
5. Click "Subscribe" button
6. You should be redirected to Stripe Checkout
7. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3-digit number (e.g., 123)
   - Name: Any name
8. Complete payment
9. Verify redirect to payment success page
10. Check that subscription is updated in user profile

**Expected Results:**
- ✅ Checkout session created successfully
- ✅ Stripe Checkout loads properly
- ✅ Payment processes successfully
- ✅ Redirected to `/payment-success-modern`
- ✅ Payment verification completes automatically
- ✅ User subscription updated to include event credits
- ✅ Confirmation email sent

#### 1.2 Test Pro Club Subscription

**Steps:**
1. Navigate to subscription plans
2. Select "Pro Club" plan (€19.99/month)
3. Complete payment with test card `4242 4242 4242 4242`
4. Verify subscription status changes to "pro_club"

**Expected Results:**
- ✅ Monthly subscription created in Stripe
- ✅ User plan updated to "pro_club"
- ✅ Subscription expiry set to 1 month from now
- ✅ Unlimited event creation enabled

#### 1.3 Test All Plan Types

Repeat the above process for each plan:
- [ ] Événementielle Pack 10 (€150 one-time)
- [ ] Pro PME (€49/month)
- [ ] Pro Entreprise (€99/month)

### Test Case 2: Payment Cancellation Flow

**Steps:**
1. Start checkout process for any plan
2. On Stripe Checkout page, click "Back" or close the tab
3. Or use the browser back button
4. Verify redirect to payment cancellation page

**Expected Results:**
- ✅ Redirected to `/payment-cancelled-modern`
- ✅ User sees helpful cancellation message
- ✅ "Try Again" button works correctly
- ✅ No subscription changes made
- ✅ User can retry payment

### Test Case 3: Failed Payment Flow

**Steps:**
1. Start checkout process
2. Use declined card: `4000 0000 0000 0002`
3. Attempt to complete payment

**Expected Results:**
- ✅ Payment declined by Stripe
- ✅ User sees appropriate error message
- ✅ Can retry with different payment method
- ✅ No subscription changes made

## Admin Function Testing

### Test Case 4: Admin User Management

#### 4.1 Login as Admin

```bash
# Login as admin to get JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "AdminPass123!"
  }'

# Save the returned JWT token for subsequent requests
export ADMIN_TOKEN="your_jwt_token_here"
```

#### 4.2 View All Users

```bash
curl -X GET http://localhost:8080/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Expected Results:**
- ✅ Returns list of all users
- ✅ Shows subscription status for each user
- ✅ Includes pagination information
- ✅ Shows event usage statistics

#### 4.3 Test User Deletion

```bash
# Delete a user account
curl -X DELETE http://localhost:8080/api/admin/users/2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test deletion",
    "sendNotification": true
  }'
```

**Expected Results:**
- ✅ User account marked as deleted
- ✅ Confirmation email sent to user
- ✅ User can no longer log in
- ✅ Admin receives success confirmation

#### 4.4 Test User Status Toggle

```bash
# Deactivate a user
curl -X PATCH http://localhost:8080/api/admin/users/3/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deactivate",
    "reason": "Test deactivation"
  }'

# Reactivate the user
curl -X PATCH http://localhost:8080/api/admin/users/3/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "activate",
    "reason": "Test reactivation"
  }'
```

**Expected Results:**
- ✅ User status changes correctly
- ✅ Notification emails sent
- ✅ User access affected immediately

### Test Case 5: Admin Dashboard Access

**Steps:**
1. Login as admin user
2. Navigate to `/admin`
3. Test all admin panel functions

**Expected Results:**
- ✅ Admin panel loads correctly
- ✅ User management interface works
- ✅ Statistics display correctly
- ✅ All admin actions function properly

## Error Scenario Testing

### Test Case 6: Authentication Errors

#### 6.1 Test Unauthenticated Access

```bash
# Try to create checkout without authentication
curl -X POST http://localhost:8080/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "pro_club"
  }'
```

**Expected Results:**
- ✅ Returns 401 Unauthorized
- ✅ Error message indicates authentication required

#### 6.2 Test Expired Token

**Steps:**
1. Use an expired JWT token
2. Try to access protected endpoints

**Expected Results:**
- ✅ Returns 401 Unauthorized
- ✅ Frontend redirects to login page

### Test Case 7: Invalid Plan Selection

```bash
# Test with invalid plan type
curl -X POST http://localhost:8080/api/stripe/create-checkout \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "invalid_plan"
  }'
```

**Expected Results:**
- ✅ Returns 400 Bad Request
- ✅ Error indicates invalid plan type
- ✅ Lists valid plan options

### Test Case 8: Stripe Configuration Errors

**Steps:**
1. Temporarily set invalid Stripe keys
2. Try to create checkout session

**Expected Results:**
- ✅ Returns appropriate error message
- ✅ Doesn't expose sensitive Stripe details
- ✅ Logs error for debugging

## API Endpoint Testing

### Test Case 9: Comprehensive API Testing

#### 9.1 Get Stripe Configuration

```bash
curl -X GET http://localhost:8080/api/stripe/config
```

**Expected Results:**
- ✅ Returns public key
- ✅ Returns currency setting
- ✅ No sensitive data exposed

#### 9.2 Create Checkout Session

```bash
curl -X POST http://localhost:8080/api/stripe/create-checkout \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "pro_club",
    "successUrl": "http://localhost:5173/payment-success-modern",
    "cancelUrl": "http://localhost:5173/payment-cancelled-modern"
  }'
```

**Expected Results:**
- ✅ Returns session ID
- ✅ Returns checkout URL
- ✅ URLs are correctly formatted

#### 9.3 Verify Payment

```bash
# Use session ID from successful payment
curl -X POST http://localhost:8080/api/stripe/verify-payment \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "cs_test_your_session_id"
  }'
```

**Expected Results:**
- ✅ Confirms payment status
- ✅ Updates user subscription
- ✅ Returns updated user data

## Frontend Component Testing

### Test Case 10: React Component Testing

#### 10.1 Subscription Plans Component

**Steps:**
1. Navigate to `/subscription-plans`
2. Test each plan selection
3. Verify pricing display
4. Test loading states

**Expected Results:**
- ✅ All plans display correctly
- ✅ Prices match Stripe configuration
- ✅ Loading states work properly
- ✅ Error messages display appropriately

#### 10.2 Payment Success Page

**Steps:**
1. Navigate directly to `/payment-success-modern?session_id=cs_test_valid_id`
2. Test automatic verification
3. Test countdown timer

**Expected Results:**
- ✅ Payment verification runs automatically
- ✅ Success message displays
- ✅ Countdown timer functions
- ✅ Redirect happens after timer

#### 10.3 Payment Cancelled Page

**Steps:**
1. Navigate to `/payment-cancelled-modern`
2. Test retry functionality
3. Test different cancellation reasons

**Expected Results:**
- ✅ Helpful cancellation message
- ✅ Retry button works
- ✅ Navigation back to plans works

#### 10.4 Admin Panel Testing

**Steps:**
1. Login as admin
2. Navigate to `/admin`
3. Test user management functions
4. Test statistics display

**Expected Results:**
- ✅ User list loads and paginates
- ✅ Delete/activate functions work
- ✅ Statistics display correctly
- ✅ All UI interactions work smoothly

## Email Notification Testing

### Test Case 11: Email Functionality

#### 11.1 Payment Confirmation Emails

**Steps:**
1. Complete a successful payment
2. Check email inbox for confirmation
3. Verify email content and formatting

**Expected Results:**
- ✅ Email sent immediately after payment
- ✅ Contains correct payment details
- ✅ Professional formatting
- ✅ Includes next steps information

#### 11.2 Account Deletion Emails

**Steps:**
1. Admin deletes a user account
2. Check user's email inbox
3. Verify deletion notification

**Expected Results:**
- ✅ Deletion email sent to user
- ✅ Contains deletion reason
- ✅ Professional and empathetic tone
- ✅ Contact information provided

#### 11.3 Status Change Emails

**Steps:**
1. Admin changes user status
2. Check for notification emails
3. Verify content accuracy

**Expected Results:**
- ✅ Status change emails sent
- ✅ Clear explanation of change
- ✅ Instructions for next steps

## Performance and Security Testing

### Test Case 12: Security Testing

#### 12.1 Rate Limiting

```bash
# Test rate limiting (run multiple times quickly)
for i in {1..10}; do
  curl -X GET http://localhost:8080/api/stripe/config
done
```

**Expected Results:**
- ✅ Rate limiting engages after configured threshold
- ✅ Appropriate HTTP status codes returned
- ✅ Rate limit headers included

#### 12.2 Input Validation

```bash
# Test with malicious input
curl -X POST http://localhost:8080/api/stripe/create-checkout \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planType": "<script>alert(\"XSS\")</script>",
    "successUrl": "javascript:alert(\"XSS\")"
  }'
```

**Expected Results:**
- ✅ Malicious input rejected
- ✅ Appropriate error messages
- ✅ No script execution

### Test Case 13: Performance Testing

#### 13.1 Load Testing

```bash
# Test concurrent requests (requires `ab` or similar tool)
ab -n 100 -c 10 http://localhost:8080/api/stripe/config
```

**Expected Results:**
- ✅ Reasonable response times under load
- ✅ No memory leaks
- ✅ Error rates remain low

#### 13.2 Database Performance

**Steps:**
1. Create multiple users with subscriptions
2. Test query performance with larger datasets
3. Monitor database connection usage

**Expected Results:**
- ✅ Queries execute within acceptable time
- ✅ Database connections managed properly
- ✅ No connection pool exhaustion

## Troubleshooting

### Common Issues and Solutions

#### 1. Stripe Checkout Not Loading

**Symptoms:**
- Blank Stripe Checkout page
- JavaScript errors in browser console

**Solutions:**
- Verify `VITE_STRIPE_PUBLIC_KEY` is correctly set
- Check browser console for JavaScript errors
- Ensure network connectivity to Stripe
- Verify Stripe keys match (test vs live environment)

#### 2. Payment Verification Failing

**Symptoms:**
- Payment completes but user subscription not updated
- "Session not found" errors

**Solutions:**
- Check `STRIPE_SECRET_KEY` configuration
- Verify session ID is passed correctly in URL
- Check server logs for detailed error messages
- Ensure database connection is working

#### 3. Email Notifications Not Sending

**Symptoms:**
- No confirmation emails received
- SendGrid API errors in logs

**Solutions:**
- Verify `SENDGRID_API_KEY` is valid
- Check sender email is verified in SendGrid
- Review SendGrid activity log in dashboard
- Ensure email addresses are valid format

#### 4. Admin Functions Not Working

**Symptoms:**
- 403 Forbidden errors for admin endpoints
- Admin panel not loading

**Solutions:**
- Verify user has admin role in database
- Check JWT token includes admin claims
- Ensure `ALLOW_ADMIN_CREATION` is true for initial setup
- Verify admin secret matches configuration

#### 5. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- Timeout errors during requests

**Solutions:**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database permissions
- Review connection pool settings

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set debug environment variables
DEBUG=true
VERBOSE_LOGS=true
LOG_LEVEL=debug

# Restart the application
npm run server:dev
```

### Log Analysis

Key log entries to monitor:
- Stripe API calls and responses
- Database query execution times
- Authentication events
- Email sending attempts
- Error stack traces

## Success Criteria

### Payment System ✅
- [ ] All subscription plans work correctly
- [ ] Payment success flow functions properly
- [ ] Payment cancellation handled gracefully
- [ ] Payment failures managed appropriately
- [ ] Subscription status updates accurately

### Admin Functions ✅
- [ ] User management works completely
- [ ] Account deletion with notifications
- [ ] Status toggle functionality
- [ ] Statistics display correctly
- [ ] Admin-only access enforced

### Security & Error Handling ✅
- [ ] Authentication required for protected endpoints
- [ ] Input validation prevents malicious input
- [ ] Rate limiting prevents abuse
- [ ] Appropriate error messages
- [ ] No sensitive data exposure

### User Experience ✅
- [ ] Intuitive subscription plan selection
- [ ] Clear payment flow
- [ ] Helpful error messages
- [ ] Professional email notifications
- [ ] Responsive design works on all devices

### Technical Requirements ✅
- [ ] No redirect URL issues
- [ ] No 401 authentication errors
- [ ] No invalid plan selection errors
- [ ] No queryClient undefined errors
- [ ] Email notifications working properly

## Post-Testing Checklist

After completing all tests:

1. **Review Test Results**
   - [ ] Document any failing tests
   - [ ] Note performance issues
   - [ ] Record user experience feedback

2. **Environment Cleanup**
   - [ ] Remove test data if needed
   - [ ] Reset Stripe test environment
   - [ ] Clear test email inboxes

3. **Production Preparation**
   - [ ] Switch to live Stripe keys for production
   - [ ] Update production environment variables
   - [ ] Configure production email settings
   - [ ] Set up monitoring and alerts

4. **Documentation Updates**
   - [ ] Update any changed API endpoints
   - [ ] Record configuration requirements
   - [ ] Note any environmental dependencies

## Contact and Support

For testing support or questions:
- **Development Team**: dev@teammove.fr
- **Technical Issues**: Create GitHub issue with test results
- **Urgent Problems**: Contact development team directly

Remember to include:
- Environment details (Node.js version, OS, etc.)
- Complete error messages and stack traces
- Steps to reproduce issues
- Expected vs actual behavior