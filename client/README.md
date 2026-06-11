# SmartTask AI Frontend

This repository contains the frontend for the SmartTask AI project — a task and project management dashboard built with Next.js and React.

## Overview

- Modern Next.js 14 application using the App Router
- Admin and user portals with separate dashboard experiences
- Kanban task boards, real-time socket updates, analytics, notifications, and file attachments
- Authentication using JWT tokens and refresh logic

## Frontend Technologies

- React 18
- Next.js
- Tailwind CSS
- Redux Toolkit
- Axios
- Recharts
- Lucide icons

## Local Setup

1. Install dependencies:

```bash
cd client
npm install
```

2. Create a `.env.local` file with your frontend environment values.

3. Run the development server:

```bash
npm run dev
```

4. Open http://localhost:3000 in your browser.

## Notes

- This repository contains frontend-only files.
- The backend server is expected to run separately in the `server` folder.
- Environment variables and backend API URLs are configured in `.env.local`.

## Git History

This repo was created as a frontend-only Git repository with a full commit history for the client app.
