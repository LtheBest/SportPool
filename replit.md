# replit.md

## Overview

CovoitSport is a comprehensive sports carpooling web application designed for clubs, associations, and companies to organize and manage transportation for sporting events. The platform features a React frontend with shadcn/ui components, an Express.js backend, and PostgreSQL database with Drizzle ORM. Users can register organizations, create events, invite participants via email, manage carpooling logistics (drivers/passengers), and communicate through an integrated messaging system. The application provides a complete event lifecycle from creation to participant management, with role-based access (passengers and drivers with seat availability) and responsive design for all devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, built using Vite
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Design System**: Consistent component library with variants using class-variance-authority

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful endpoints organized by feature (auth, events, messages, invitations)
- **Authentication**: Session-based authentication with express-session
- **Password Security**: bcrypt for password hashing
- **Error Handling**: Centralized error middleware with structured error responses
- **Development Tools**: Hot reloading with Vite integration for development mode

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling with @neondatabase/serverless
- **Tables**: Organizations, events, event_participants, event_invitations, and messages with proper foreign key relationships

### Authentication and Authorization
- **Session Management**: Express-session with secure cookie configuration
- **Password Security**: bcrypt hashing with salt rounds
- **Route Protection**: Middleware-based authentication for protected endpoints
- **Session Storage**: In-memory sessions for development (production would use persistent store)
- **User Context**: Organization-based authentication (clubs, associations, companies)

### External Dependencies
- **Database**: Neon PostgreSQL serverless database
- **Email Service**: Not yet implemented (placeholder for invitation system)
- **File Storage**: Local storage for development (placeholder for logos/attachments)
- **Fonts**: Google Fonts (Inter) and Font Awesome icons
- **Development Tools**: Replit-specific plugins and banners for development environment