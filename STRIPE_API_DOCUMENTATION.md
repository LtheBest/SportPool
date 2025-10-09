# TeamMove Modern Stripe API Documentation

## Overview

This document provides comprehensive documentation for the modernized Stripe integration in TeamMove platform. The new system supports three subscription types: 'Découverte' (free), event packs (one-time payments), and pro subscriptions (recurring).

## Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Subscription Plans](#subscription-plans)
- [Payment Flow](#payment-flow)
- [Error Handling](#error-handling)
- [Admin Functions](#admin-functions)
- [Environment Variables](#environment-variables)
- [Testing](#testing)

## Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Token Refresh

If a token expires, use the refresh token endpoint:
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

## API Endpoints

### Stripe Configuration

#### Get Stripe Configuration
```http
GET /api/stripe/config
```

**Description**: Retrieves Stripe public key and configuration for frontend initialization.

**Response**:
```json
{
  "success": true,
  "data": {
    "publishableKey": "pk_test_...",
    "currency": "eur"
  }
}
```

### Payment Processing

#### Create Checkout Session
```http
POST /api/stripe/create-checkout
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "planType": "evenementielle_single|evenementielle_pack10|pro_club|pro_pme|pro_entreprise",
  "successUrl": "https://teammove.fr/payment-success-modern",
  "cancelUrl": "https://teammove.fr/payment-cancelled-modern"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_...",
    "url": "https://checkout.stripe.com/..."
  }
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PLAN",
    "message": "Invalid subscription plan type"
  }
}
```

#### Verify Payment
```http
POST /api/stripe/verify-payment
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "sessionId": "cs_test_..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentStatus": "paid",
    "subscriptionUpdated": true,
    "userPlan": "pro_club",
    "expiresAt": "2024-11-09T10:30:00Z"
  }
}
```

### Admin Endpoints

#### Get All Users (Admin Only)
```http
GET /api/admin/users
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "userType": "pro_club",
        "subscriptionStatus": "active",
        "subscriptionExpiry": "2024-11-09T10:30:00Z",
        "eventsCreated": 5,
        "eventsRemaining": 15
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

#### Delete User Account (Admin Only)
```http
DELETE /api/admin/users/:userId
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "reason": "User requested account deletion",
  "sendNotification": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "User account deleted successfully",
  "emailSent": true
}
```

#### Toggle User Status (Admin Only)
```http
PATCH /api/admin/users/:userId/status
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "action": "activate|deactivate",
  "reason": "Optional reason for status change"
}
```

#### Get System Statistics (Admin Only)
```http
GET /api/admin/statistics
Authorization: Bearer <admin_jwt_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeSubscriptions": 75,
    "revenue": {
      "monthly": 2450.50,
      "total": 15750.25
    },
    "eventPacks": {
      "sold": 45,
      "revenue": 675.00
    }
  }
}
```

## Subscription Plans

### Plan Types and Features

#### Découverte (Free)
- **Plan ID**: `decouverte`
- **Price**: Free
- **Features**:
  - 2 events per month
  - Basic event management
  - Community support

#### Événementielle Single
- **Plan ID**: `evenementielle_single`
- **Price**: €15 (one-time)
- **Stripe Price ID**: `STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID`
- **Features**:
  - 1 additional event creation
  - All basic features

#### Événementielle Pack 10
- **Plan ID**: `evenementielle_pack10`
- **Price**: €150 (one-time)
- **Stripe Price ID**: `STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID`
- **Features**:
  - 10 additional event creations
  - Bulk event management
  - Priority support

#### Pro Club
- **Plan ID**: `pro_club`
- **Price**: €19.99/month
- **Stripe Price ID**: `STRIPE_PRO_CLUB_PRICE_ID`
- **Features**:
  - Unlimited events
  - Advanced analytics
  - Team collaboration
  - Priority support

#### Pro PME
- **Plan ID**: `pro_pme`
- **Price**: €49/month
- **Stripe Price ID**: `STRIPE_PRO_PME_PRICE_ID`
- **Features**:
  - Everything in Pro Club
  - Advanced integrations
  - Custom branding
  - API access

#### Pro Entreprise
- **Plan ID**: `pro_entreprise`
- **Price**: €99/month
- **Stripe Price ID**: `STRIPE_PRO_ENTREPRISE_PRICE_ID`
- **Features**:
  - Everything in Pro PME
  - Enterprise support
  - Custom features
  - SLA guarantees

## Payment Flow

### Frontend Integration

1. **Initialize Stripe**:
```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY);
```

2. **Create Checkout Session**:
```javascript
const response = await fetch('/api/stripe/create-checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    planType: 'pro_club',
    successUrl: `${window.location.origin}/payment-success-modern`,
    cancelUrl: `${window.location.origin}/payment-cancelled-modern`
  })
});

const { sessionId } = await response.json();
```

3. **Redirect to Checkout**:
```javascript
const stripe = await stripePromise;
await stripe.redirectToCheckout({ sessionId });
```

4. **Handle Success**:
After successful payment, users are redirected to `/payment-success-modern` where payment verification occurs automatically.

### Backend Payment Processing

1. **Session Creation**: Creates Stripe Checkout Session with proper metadata
2. **Payment Verification**: Verifies payment status and updates user subscription
3. **Email Notifications**: Sends confirmation emails for successful payments
4. **Subscription Management**: Updates user plan and expiry dates

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_PLAN` | Invalid subscription plan type | Check planType parameter |
| `STRIPE_ERROR` | Stripe API error | Check Stripe configuration |
| `AUTHENTICATION_REQUIRED` | Missing or invalid JWT token | Provide valid authentication |
| `PAYMENT_FAILED` | Payment processing failed | Retry with valid payment method |
| `SESSION_NOT_FOUND` | Checkout session not found | Create new checkout session |
| `INSUFFICIENT_PERMISSIONS` | Admin access required | Ensure user has admin role |

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  }
}
```

## Admin Functions

### User Management

Admins can:
- View all users with pagination and filtering
- Delete user accounts with email notifications
- Activate/deactivate user accounts
- View user subscription details and payment history

### Feature Management

Admins can:
- Toggle system features on/off
- Configure subscription plan availability
- Manage pricing and plan features
- View system statistics and analytics

### Email Notifications

The system automatically sends emails for:
- Account deletion confirmations
- Payment confirmations
- Subscription renewals
- Account status changes

## Environment Variables

### Required Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_test_... # or pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Subscription Price IDs
STRIPE_EVENEMENTIELLE_SINGLE_PRICE_ID=price_...
STRIPE_EVENEMENTIELLE_PACK10_PRICE_ID=price_...
STRIPE_PRO_CLUB_PRICE_ID=price_...
STRIPE_PRO_PME_PRICE_ID=price_...
STRIPE_PRO_ENTREPRISE_PRICE_ID=price_...

# Email Configuration
SENDGRID_API_KEY=SG.....
SENDGRID_FROM_EMAIL=noreply@teammove.fr
SENDGRID_FROM_NAME=TeamMove

# Application
APP_URL=https://teammove.fr
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
```

### Optional Variables

```bash
# Feature Flags
ENABLE_MODERN_STRIPE=true
ENABLE_WEBHOOK_VALIDATION=true
ENABLE_EMAIL_NOTIFICATIONS=true

# Payment URLs
PAYMENT_SUCCESS_URL=/payment-success-modern
PAYMENT_CANCEL_URL=/payment-cancelled-modern

# Rate Limiting
STRIPE_RATE_LIMIT_MAX=100
STRIPE_RATE_LIMIT_WINDOW=900000

# Logging
LOG_LEVEL=info
DEBUG=false
VERBOSE_LOGS=false
```

## Testing

### Test Cards

Use Stripe's test cards for development:

```
# Successful payment
4242 4242 4242 4242

# Declined payment
4000 0000 0000 0002

# Requires authentication
4000 0025 0000 3155
```

### Testing Checklist

1. **Payment Success Flow**:
   - [ ] Create checkout session
   - [ ] Complete payment with test card
   - [ ] Verify redirect to success page
   - [ ] Confirm subscription updated
   - [ ] Check email notification sent

2. **Payment Failure Flow**:
   - [ ] Create checkout session
   - [ ] Use declined test card
   - [ ] Verify redirect to cancel page
   - [ ] Confirm no subscription change

3. **Admin Functions**:
   - [ ] List users with pagination
   - [ ] Delete user account
   - [ ] Toggle user status
   - [ ] View system statistics

4. **Authentication**:
   - [ ] Access protected endpoints with valid token
   - [ ] Handle expired token (401 response)
   - [ ] Refresh token functionality

### API Testing with curl

```bash
# Get Stripe config
curl -X GET http://localhost:8080/api/stripe/config

# Create checkout session (requires auth)
curl -X POST http://localhost:8080/api/stripe/create-checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "pro_club", "successUrl": "http://localhost:5173/payment-success-modern", "cancelUrl": "http://localhost:5173/payment-cancelled-modern"}'

# Verify payment (requires auth)
curl -X POST http://localhost:8080/api/stripe/verify-payment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "cs_test_..."}'
```

## Security Considerations

### Authentication
- All payment endpoints require valid JWT authentication
- Admin endpoints require additional role verification
- Tokens have short expiry times with refresh capability

### Input Validation
- All request parameters are validated and sanitized
- Plan types are strictly validated against allowed values
- URLs are validated for proper format and domain

### Rate Limiting
- API endpoints have rate limiting to prevent abuse
- Configurable limits per endpoint and user

### Error Handling
- Sensitive information is not exposed in error messages
- All errors are logged for security monitoring
- Graceful degradation for service failures

## Support and Troubleshooting

### Common Issues

1. **"Invalid plan type" error**: Ensure planType matches exactly one of the allowed values
2. **"Authentication required" error**: Check JWT token is valid and not expired
3. **"Stripe error" responses**: Verify Stripe keys and configuration
4. **Payment verification fails**: Ensure session ID is correct and payment completed

### Logging

Enable detailed logging for troubleshooting:
```bash
DEBUG=true
VERBOSE_LOGS=true
LOG_LEVEL=debug
```

### Contact

For technical support or questions about this API:
- Development Team: dev@teammove.fr
- Admin Support: admin@teammove.fr
- General Support: support@teammove.fr