# SmartTask AI - Intelligent Task & Project Management

A comprehensive AI-powered task management and project planning platform with real-time collaboration, analytics, and intelligent automation.

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Development](#development)
- [Authentication & Security](#authentication--security)
- [API Integration](#api-integration)
- [Contributing](#contributing)

## 🎯 Project Overview

SmartTask AI is a full-stack application designed to help teams and individuals manage projects and tasks efficiently with AI-powered insights and real-time collaboration features.

**Frontend**: React + Next.js application with modern UI/UX
**Backend**: Express.js API with PostgreSQL database

## ✨ Features

### User Features
- 📊 **Dashboard**: Overview of projects, tasks, and analytics
- 📁 **Project Management**: Create, edit, and organize projects
- ✅ **Task Management**: Kanban board, task lists, and task details
- 📈 **Analytics**: Productivity metrics and progress tracking
- 🔔 **Notifications**: Real-time task updates and mentions
- 👤 **Profile Management**: User settings and preferences
- 🔍 **Global Search**: Search across tasks and projects
- 📎 **File Attachments**: Upload and manage project files

### Admin Features
- 👥 **User Management**: View, manage, and deactivate users
- 📊 **System Analytics**: Platform-wide analytics and insights
- 🎯 **Activity Monitoring**: Track user activities
- ⚙️ **System Configuration**: Manage platform settings

### Security Features
- 🔐 **JWT Authentication**: Secure token-based auth with refresh tokens
- 🍪 **HTTP-Only Cookies**: Tokens stored in secure HTTP-only cookies (prevents XSS)
- 🔄 **Automatic Token Refresh**: Seamless session management
- 👮 **Role-Based Access Control**: User and Admin role separation
- 🛡️ **Protected Routes**: Authentication guards on all protected pages

## 🏗️ Architecture

### Frontend Architecture
```
NextJS App Router
├── User Routes (/user_features)
│   ├── Dashboard
│   ├── Projects
│   ├── Tasks
│   ├── Analytics
│   ├── Notifications
│   └── Profile
├── Admin Routes (/admin_features)
│   ├── Dashboard
│   ├── Users
│   ├── Activity
│   ├── Analytics
│   └── Projects
├── Auth Routes
│   ├── Login
│   ├── Register
│   └── Admin Login
└── Public Routes
    ├── Homepage
    └── Landing
```

### State Management
- **Redux Toolkit**: Centralized state management for auth, user data
- **Custom Hooks**: Reusable logic for common operations
- **Local Storage**: Client-side caching (with security considerations)
- **Cookies**: Secure token persistence with HTTP-only flags

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios with interceptors
- **Charts**: Recharts for analytics
- **Icons**: Lucide Icons
- **Type Safety**: TypeScript
- **Code Quality**: ESLint

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Access & Refresh tokens)
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Validation**: Custom middleware

## 📁 Project Structure

```
aitask/
├── client/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/                    # App Router pages
│   │   │   ├── admin_features/     # Admin dashboard pages
│   │   │   ├── user_features/      # User dashboard pages
│   │   │   ├── login/              # Login page
│   │   │   ├── register/           # Registration page
│   │   │   ├── admin-login/        # Admin login page
│   │   │   ├── homepage/           # Home page
│   │   │   ├── layout.tsx          # Root layout
│   │   │   └── page.tsx            # Index page
│   │   ├── components/             # Reusable components
│   │   │   ├── kanban/            # Kanban board components
│   │   │   ├── ui/                # UI components
│   │   │   └── providers/         # App providers
│   │   ├── lib/                   # Utilities & helpers
│   │   │   ├── axios.ts           # Axios instance with interceptors
│   │   │   ├── adminAxios.ts      # Admin axios instance
│   │   │   ├── tokenStorage.ts    # Cookie-based token management
│   │   │   └── api/               # API service files
│   │   └── store/                 # Redux store
│   │       ├── index.ts
│   │       └── slices/            # Redux slices
│   ├── public/                     # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── server/                          # Express Backend
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   ├── routes/                # API routes
│   │   ├── middlewares/           # Auth & custom middleware
│   │   ├── services/              # Business logic
│   │   └── utils/                 # Utilities
│   ├── prisma/                    # Database schema
│   └── package.json
└── README.md
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Frontend Setup

1. **Install dependencies**:
```bash
cd client
npm install
```

2. **Create environment file** (`.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

3. **Run development server**:
```bash
npm run dev
```

4. **Open application**:
Navigate to http://localhost:3000

### Backend Setup

1. **Install dependencies**:
```bash
cd server
npm install
```

2. **Setup PostgreSQL database**:
```bash
# Create database
createdb smarttask_ai
```

3. **Configure environment** (`.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/smarttask_ai
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
```

4. **Run migrations**:
```bash
npx prisma migrate dev
```

5. **Start server**:
```bash
npm start
```

## 💻 Development

### Available Scripts

**Frontend**:
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
npm run type-check # TypeScript type checking
```

**Backend**:
```bash
npm start        # Start server
npm run dev      # Start with nodemon
npm test         # Run tests
```

### Code Standards
- Follow ESLint configuration
- Use TypeScript for type safety
- Write meaningful commit messages
- Add comments for complex logic
- Test before committing

## 🔐 Authentication & Security

### Auth Flow

1. **User Login**:
   - User submits credentials
   - Backend validates and returns access & refresh tokens
   - Tokens stored in HTTP-only cookies

2. **Token Refresh**:
   - Axios interceptor checks token expiration
   - Automatically requests new access token using refresh token
   - Updates cookie with new token

3. **Session Persistence**:
   - On page refresh, app rehydrates auth from cookies
   - No need for user to re-login

4. **Logout**:
   - Clear auth cookies
   - Clear Redux state
   - Redirect to login page

### Security Measures
- ✅ HTTP-only cookies prevent XSS token theft
- ✅ JWT tokens for stateless authentication
- ✅ Refresh token rotation for enhanced security
- ✅ Protected routes with auth guards
- ✅ Type-safe error handling
- ✅ CORS enabled for safe cross-origin requests

## 🔗 API Integration

### Token Storage (tokenStorage.ts)
Centralized cookie management for auth tokens:
```typescript
saveAuthTokens(accessToken, refreshToken, user, isAdmin)
getAccessToken(isAdmin)
getRefreshToken(isAdmin)
getStoredUser(isAdmin)
clearAuthTokens(isAdmin)
```

### Axios Instances
- **User API** (`lib/axios.ts`): For user requests with auto token refresh
- **Admin API** (`lib/adminAxios.ts`): For admin-only requests

### Interceptors
- Request interceptor: Adds access token to headers
- Response interceptor: Handles 401 errors and token refresh

## 📚 Available Routes

### User Routes
- `/user_features/dashboard` - User dashboard
- `/user_features/projects` - Projects list
- `/user_features/projects/[id]` - Project kanban board
- `/user_features/tasks` - All tasks
- `/user_features/analytics` - Analytics dashboard
- `/user_features/notifications` - Notifications
- `/user_features/profile` - User profile

### Admin Routes
- `/admin_features/dashboard` - Admin dashboard
- `/admin_features/users` - User management
- `/admin_features/projects` - Projects overview
- `/admin_features/activity` - Activity log
- `/admin_features/analytics` - System analytics

### Public Routes
- `/` - Homepage
- `/login` - User login
- `/register` - User registration
- `/admin-login` - Admin login
- `/homepage` - Landing page

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes with meaningful commits
3. Push to your branch: `git push origin feature/your-feature`
4. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 📞 Support

For issues and questions, please create an issue in the repository.

---

**Last Updated**: June 2026
