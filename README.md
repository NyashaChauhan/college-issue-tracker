# College Issue Tracker

A full-stack college issue tracking system that allows students and faculty to raise issues and enables management to monitor, group, and manage them through a centralized dashboard.

## Features

- Role-based authentication for Students, Faculty, and Management
- JWT-based authentication with access and refresh tokens
- Secure password hashing using bcrypt
- Password reset through Gmail SMTP
- Ticket creation and tracking
- Ticket status management
- Category and priority-based organization
- Image attachments using Cloudinary
- AI-based similar issue detection using Google Gemini
- Automatic grouping suggestions for similar open issues
- Management dashboard with issue statistics
- Ticket filtering and pagination
- Excel and PDF ticket exports
- Server-side and client-side validation
- PostgreSQL database
- Protected routes and role-based access control

## Technology Stack

### Frontend
- React
- Tailwind CSS
- Recharts
- Axios

### Backend
- Node.js
- Express.js
- JWT
- bcrypt
- Nodemailer

### Database
- PostgreSQL

### AI
- Google Gemini API
- Gemini Embeddings

### Cloud Services
- Cloudinary for image storage
- Gmail SMTP for password reset emails

## User Roles

### Student
- Register and log in
- Raise tickets
- Attach images
- View own tickets
- Track ticket status
- Receive AI-based similar issue suggestions

### Faculty
- Register and log in
- Raise tickets
- Attach images
- View and track own tickets

### Management
- Access management dashboard
- View all tickets
- Filter tickets
- Update ticket status
- View grouped/similar issues
- Export ticket data

## Project Structure

```text
InternProject/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
|   ├── .env.example
│   └── server.js
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
├── README.md
└── SETUP.md

```
## Getting Started

1. Clone the repository

git clone <your-repository-url>
cd InternProject

2. Configure environment variables

Create a `.env` file inside the `backend` folder using `backend/.env.example` as a reference.
See `backend/.env.example` for the required variables and placeholder values.
Do not commit the real .env file.

3. Set up PostgreSQL

Create a PostgreSQL database named:

college_tickets

Run the database schema provided in:

backend/config/schema.sql

4. Install backend dependencies
cd backend
npm install

5. Start the backend
npm run dev

The backend runs on:

`http://localhost:5000`
6. Install frontend dependencies

Open another terminal:

cd frontend
npm install
7. Start the frontend
npm start

The frontend runs on:

`http://localhost:3000`

## Environment Variables

The project uses environment variables for database credentials, JWT secrets, Gmail SMTP, Cloudinary, and Gemini.

See `backend/.env.example` for the required variables and placeholder values.

Never commit the real `.env` file.

## AI Similar Issue Detection

When a new ticket is submitted, the system uses Gemini embeddings to compare the issue with existing open tickets.

If a sufficiently similar issue is found, the system displays a grouping suggestion instead of immediately creating a duplicate standalone issue.

The user can then confirm or decline the grouping.

## Security
Passwords are hashed using bcrypt
JWT access tokens are short-lived
Refresh tokens are stored and revoked server-side
Refresh tokens are stored in an HTTP-only cookie
Password reset tokens expire and cannot be reused
Password reset invalidates existing refresh tokens
Role-based API authorization
Client-side and server-side input validation
Environment secrets are excluded from Git

## Exports

Management users can export ticket information in:

Excel format
PDF format

## License

This project was developed as an academic project.