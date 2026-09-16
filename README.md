# College Issue Tracker

A full-stack college issue tracking system that allows students and faculty to raise issues and enables management to monitor, manage, group, and resolve them efficiently.

The system also uses Google's Gemini embedding model to detect semantically similar issues and suggest grouping of duplicate or related tickets.

---

## Features

- User registration and login
- Role-based access for:
  - Student
  - Faculty
  - Management
- JWT-based authentication with access and refresh tokens
- Secure password reset through Gmail
- Raise and track college issues
- Ticket categories and priorities
- Ticket status workflow:
  - Open
  - In Progress
  - Resolved
  - Closed
- Image attachments using Cloudinary
- AI-powered similar issue detection using Gemini embeddings
- Suggestion-based grouping of similar tickets
- Management dashboard with ticket statistics
- Ticket filtering and pagination
- Excel export
- PDF export
- Server-side and client-side validation
- PostgreSQL database

---

## Technology Stack

### Frontend

- React
- Tailwind CSS
- Recharts

### Backend

- Node.js
- Express.js
- JWT
- Nodemailer
- Multer
- Cloudinary

### Database

- PostgreSQL

### AI

- Google Gemini API
- `gemini-embedding-001`

---

## User Roles

### Student / Faculty

- Register and log in
- Raise tickets
- Add descriptions and images
- Select category and priority
- View submitted tickets
- Track ticket status
- View similar issue suggestions

### Management

- View dashboard statistics
- View all tickets
- Filter tickets
- Update ticket status
- View ticket details and attachments
- View grouped/similar issues
- Export ticket data as Excel or PDF

---

## AI Similar Issue Detection

The system uses Google's Gemini embedding model to convert ticket titles and descriptions into numerical embeddings.

When a new ticket is submitted:

1. The ticket title and description are converted into an embedding.
2. The embedding is compared with embeddings of existing open tickets.
3. Cosine similarity is used to measure semantic similarity.
4. If the similarity exceeds the configured threshold, the system suggests grouping the new ticket with the existing issue.
5. The user can choose whether to group the ticket or submit it as a separate issue.

This helps management identify multiple reports describing the same underlying college issue.

---

## Image Uploads

Ticket attachments are uploaded to Cloudinary.

Supported image formats:

- JPG / JPEG
- PNG
- WebP

Limits:

- Maximum 3 images per ticket
- Maximum 5 MB per image

---

## Authentication & Security

The application includes:

- JWT access tokens
- JWT refresh tokens
- HTTP-only refresh-token cookie
- Password hashing using bcrypt
- Strong password validation
- Email normalization
- Role-based authorization
- Server-side input validation
- Client-side live validation
- Password reset tokens with expiry
- One-time password reset links
- Refresh-token invalidation after password reset
- Database constraints and indexes
- Environment variables for sensitive configuration

Sensitive environment files are excluded from Git using `.gitignore`.

---

## Data Exports

Management users can export ticket information in:

- Excel format
- PDF format

---

## Project Structure

```text
InternProject/
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── schema.sql
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── exportController.js
│   │   └── ticketController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── Ticket.js
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── exportRoutes.js
│   │   └── ticketRoutes.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── emailService.js
│   │   └── exportService.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── utils/
│   ├── package.json
│   └── tailwind.config.js
├── .gitignore
├── README.md
└── SETUP.md
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/NyashaChauhan/college-issue-tracker.git
cd college-issue-tracker
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder using `.env.example` as a template.

```bash
copy .env.example .env
```

Add the required PostgreSQL, JWT, Gmail, Cloudinary, Gemini, and application configuration values to `.env`.

### 3. Set up PostgreSQL

Create the database:

```text
college_tickets
```

Then run the schema:

```bash
psql -U postgres -d college_tickets -f config/schema.sql
```

### 4. Start the backend

From the `backend` folder:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### 5. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

The frontend runs on:

```text
http://localhost:3000
```

---

## Environment Variables

The backend requires environment variables for:

- PostgreSQL
- JWT authentication
- Gmail SMTP
- Cloudinary
- Gemini API
- Application configuration

A template is provided at:

```text
backend/.env.example
```

Never commit the actual `.env` file or API credentials to GitHub.

---

## Database

The application uses PostgreSQL with tables for:

- Users
- Tickets
- Ticket images
- Refresh tokens
- Password reset tokens

The database also includes constraints, indexes, and automatic `updated_at` timestamp handling.

---

## Repository

GitHub:

https://github.com/NyashaChauhan/college-issue-tracker

---

## License

This project is developed as an academic/project implementation.
