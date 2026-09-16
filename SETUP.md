# College Issue Tracker — Setup Guide

## Prerequisites

- **Node.js** v18+  →  https://nodejs.org/
- **PostgreSQL** 14+  →  https://www.postgresql.org/download/
- A **Cloudinary** account (free tier is fine)  →  https://cloudinary.com/
- An **Gemini** API key (for AI grouping)  → https://aistudio.google.com/
- A **Gmail** account with an [App Password](https://myaccount.google.com/apppasswords) (for Nodemailer)

---

## Step-by-Step Setup

### 1. Install Node.js and PostgreSQL

Follow the installers for your OS from the links above.

---

### 2. Create the database

```bash
createdb college_tickets
```

Or using `psql`:
```sql
CREATE DATABASE college_tickets;
```

---

### 3. Apply the schema

```bash
psql -U postgres -d college_tickets -f backend/config/schema.sql
```

---

### 4. Configure the backend environment

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in every value:

| Variable | Description |
|---|---|
| `PORT` | Backend port (default 5000) |
| `DB_HOST` | PostgreSQL host (usually `localhost`) |
| `DB_PORT` | PostgreSQL port (usually `5432`) |
| `DB_NAME` | `college_tickets` |
| `DB_USER` | Your PostgreSQL username |
| `DB_PASSWORD` | Your PostgreSQL password |
| `JWT_ACCESS_SECRET` | Random 64-char string (run `openssl rand -hex 64`) |
| `JWT_REFRESH_SECRET` | Different random 64-char string |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `BCRYPT_SALT_ROUNDS` | `10` |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Your Gmail App Password |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `GEMINI_API_KEY` | From Gemini dashboard |
| `COLLEGE_DOMAIN` | `http://localhost:3000` |

---

### 5. Install backend dependencies and start

```bash
cd backend
npm install
npm run dev
```

The API will be running at `http://localhost:5000`.

---

### 6. Install frontend dependencies and start

In a separate terminal:

```bash
cd frontend
npm install
npm start
```

The React app will open at `http://localhost:3000`.

---

### 7. Create the first management account

Management accounts **cannot** self-register — they must be inserted directly via SQL:

```sql
-- Replace the placeholders with real values.
-- Generate a bcrypt hash first:
--   node -e "const b=require('bcrypt'); b.hash('YourPassword123', 10).then(console.log)"

INSERT INTO users (name, email, password, role, department)
VALUES (
  'Admin Name',
  'admin@college.edu',
  '$2b$10$<your_bcrypt_hash_here>',
  'management',
  'Administration'
);
```

Log in at `http://localhost:3000/login` with those credentials.
Management users are redirected to `/dashboard` after login.

---

## Project Structure

```
InternProject/
├── backend/
│   ├── config/          → db.js, schema.sql
│   ├── controllers/     → authController, ticketController, exportController
│   ├── middleware/      → authMiddleware, uploadMiddleware
│   ├── models/          → User.js, Ticket.js
│   ├── routes/          → authRoutes, ticketRoutes, exportRoutes
│   ├── services/        → emailService, aiService, exportService
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── public/
    └── src/
        ├── components/  → shared/Navbar, ticket/RaiseTicketForm, dashboard/Dashboard
        ├── context/     → AuthContext.jsx
        ├── pages/       → Login, Register, ForgotPassword, ResetPassword, Tickets
        ├── styles/      → index.css
        ├── utils/       → api.js, validators.js
        ├── App.jsx
        └── index.js
```

---

## Security Notes

- **Access tokens** are stored in `window.__accessToken` (memory), not `localStorage`
- **Refresh tokens** are in `httpOnly` cookies — JavaScript cannot read them
- **Management** accounts are SQL-only — the registration form rejects `role=management`
- **Same error** for wrong email and wrong password — prevents user enumeration
- **Reset tokens** are single-use and expire after 1 hour
- **AI grouping** is non-fatal — if Gemini fails, tickets still get created

---

## Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register student/faculty |
| POST | `/api/auth/login` | Public | Login, returns accessToken |
| POST | `/api/auth/refresh` | Cookie | Get new accessToken |
| POST | `/api/auth/logout` | Cookie | Revoke refresh token |
| POST | `/api/auth/forgot-password` | Public | Send reset email |
| POST | `/api/auth/reset-password` | Public | Apply new password |
| GET | `/api/auth/me` | Bearer | Get current user |
| GET | `/api/tickets` | Bearer | List tickets |
| POST | `/api/tickets` | Bearer | Create ticket (with AI check) |
| GET | `/api/tickets/stats` | Management | Dashboard stats |
| GET | `/api/tickets/:id` | Bearer | Single ticket detail |
| PATCH | `/api/tickets/:id` | Management | Update status/assignee |
| GET | `/api/export/xlsx` | Management | Download XLSX report |
| GET | `/api/export/pdf` | Management | Download PDF report |
