 # AgoraX Backend

<div align="center">
  <h3>Real-time Video Conferencing & Collaboration Platform</h3>
  <p>A robust Node.js backend with TypeScript, Firebase, and Socket.IO for seamless video meetings</p>
</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [API Documentation](#-api-documentation)
  - [Authentication Routes](#authentication-routes)
  - [Meeting Routes](#meeting-routes)
  - [User Routes](#user-routes)
- [Real-time Features](#-real-time-features)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Authors](#-authors)
- [License](#-license)

---

## 🎯 Overview

**AgoraX Backend** is a comprehensive server application that powers a modern video conferencing platform. Built with Node.js and TypeScript, it provides authentication, meeting management, real-time communication via WebSockets, and integrates with Firebase for authentication and Firestore for data persistence.

This backend supports:
- User registration and authentication (local and Firebase-based)
- Meeting creation and management
- Real-time participant tracking
- Password reset functionality
- Email notifications
- WebSocket-based real-time communication

---

## ✨ Features

### 🔐 Authentication & Authorization
- **Dual authentication system**: Local credentials (email/password) and Firebase Auth integration
- **JWT-based sessions** for secure API access
- **Password reset flow** with email notifications using Resend
- **Token-based authentication** with configurable expiration

### 📹 Meeting Management
- Create and manage virtual meeting rooms
- Generate unique room IDs for each meeting
- Track meeting participants and their emails
- Support for active/inactive meeting states
- Meeting metadata storage

### 👥 User Management
- User registration with profile information
- Email uniqueness validation
- Profile management (name, age, photo URL)
- Firebase UID integration for cross-platform authentication

### 🔄 Real-time Communication
- Socket.IO integration for real-time features
- WebSocket support for live chat and meeting updates
- Participant join/leave notifications

### 📧 Email Services
- Password reset emails with secure tokens
- Customizable email templates
- Integration with Resend API

---

## 🛠 Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js |
| **Language** | TypeScript |
| **Framework** | Express.js |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Admin SDK, JWT, bcrypt |
| **Real-time** | Socket.IO |
| **Email** | Resend API |
| **Dev Tools** | ts-node-dev, nodemon |

---

## 🏗 Architecture

The application follows a layered architecture pattern:

```
┌─────────────────────────────────────┐
│         Routes Layer                │  ← HTTP endpoints (auth, meetings, users)
├─────────────────────────────────────┤
│       Controllers Layer             │  ← Business logic orchestration
├─────────────────────────────────────┤
│         DAO Layer                   │  ← Data access abstraction (GlobalDAO)
├─────────────────────────────────────┤
│       Firebase/Firestore            │  ← Data persistence & authentication
└─────────────────────────────────────┘
```

**Key Design Patterns:**
- **DAO Pattern**: Generic data access object (`GlobalDAO`) for CRUD operations
- **Controller Pattern**: Centralized request handling (`GlobalController`)
- **Repository Pattern**: Specialized DAOs for specific entities (users, meetings)
- **Middleware Pattern**: Authentication and request processing

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Firebase project** with Firestore and Authentication enabled
- **Resend API key** for email functionality

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/michaelRS2002/agoraX_back.git
   cd agoraX_back
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase credentials**
   - Download your Firebase service account JSON from the Firebase Console
   - Place it in a secure location or prepare to use environment variables

4. **Configure environment variables** (see next section)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_change_this
JWT_EXPIRES=1h

# Firebase Configuration (choose one method)
# Method 1: File path
FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/serviceAccount.json
FIREBASE_AUTH_SERVICE_ACCOUNT_PATH=./path/to/authServiceAccount.json

# Method 2: Base64 encoded JSON
FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=your_base64_encoded_service_account
FIREBASE_AUTH_SERVICE_ACCOUNT_JSON_BASE64=your_base64_encoded_auth_service_account

# Method 3: Direct JSON string
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
FIREBASE_AUTH_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Email Configuration
RESEND_API_KEY=your_resend_api_key

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:5173
```

**Firebase Configuration Options:**
The application supports three methods for providing Firebase credentials (in order of priority):
1. File path (`FIREBASE_SERVICE_ACCOUNT_PATH`)
2. Base64-encoded JSON (`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`)
3. Direct JSON string (`FIREBASE_SERVICE_ACCOUNT_JSON`)

You can use separate service accounts for authentication and database operations.

---

## 📚 API Documentation

Base URL: `http://localhost:3000/api`

### Authentication Routes

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 25,
  "password": "securePassword123",
  "firebaseUid": "optional-firebase-uid",
  "photoURL": "https://example.com/photo.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "age": 25,
    "photoURL": "https://example.com/photo.jpg"
  }
}
```

#### Login (Email/Password)
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login (Firebase Token)
```http
POST /api/auth/login
Content-Type: application/json

{
  "idToken": "firebase-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Request Password Reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "newPassword": "newSecurePassword123"
}
```

### Meeting Routes

#### Create Meeting
```http
POST /api/meetings/create
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "hostId": "user123",
  "title": "Team Standup",
  "participants": ["user456", "user789"]
}
```

**Response:**
```json
{
  "success": true,
  "meeting": {
    "id": "meeting123",
    "hostId": "user123",
    "title": "Team Standup",
    "roomId": "abc123xyz",
    "createdAt": "2025-12-09T10:00:00.000Z",
    "participants": ["user456", "user789"],
    "isActive": true
  }
}
```

#### Get Meeting by Room ID
```http
GET /api/meetings/:roomId
Authorization: Bearer <jwt-token>
```

#### Add Participant to Meeting
```http
POST /api/meetings/:roomId/participants
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "email": "participant@example.com",
  "userId": "user999",
  "name": "Participant Name"
}
```

### User Routes

#### Get All Users
```http
GET /api/users
Authorization: Bearer <jwt-token>
```

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <jwt-token>
```

#### Update User
```http
PUT /api/users/:id
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "Updated Name",
  "age": 26
}
```

#### Delete User
```http
DELETE /api/users/:id
Authorization: Bearer <jwt-token>
```

---

## 🔌 Real-time Features

AgoraX uses Socket.IO for real-time communication. WebSocket connections enable:

- **Live chat** during meetings
- **Participant presence** tracking
- **Meeting state updates**
- **Real-time notifications**

Socket event handlers are located in `src/sockets/`:
- `chatSocket.js` - Chat message handling
- `meetingSocker.js` - Meeting events
- `sockerManager.js` - Socket connection management

---

## 📁 Project Structure

```
agoraX_back/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # Database adapter/compatibility layer
│   │   └── firebase.ts   # Firebase initialization
│   ├── controller/       # Request handlers
│   │   └── globalController.ts
│   ├── dao/              # Data Access Objects
│   │   ├── globalDAO.ts  # Generic Firestore DAO
│   │   ├── userDAO.ts    # User-specific operations
│   │   └── firestoreUserDAO.ts
│   ├── middlewares/      # Express middlewares
│   │   └── auth.ts       # Authentication middleware
│   ├── models/           # TypeScript interfaces
│   │   ├── users.ts      # User model
│   │   └── meeting.ts    # Meeting model
│   ├── routes/           # API route definitions
│   │   ├── auth.ts       # Authentication routes
│   │   ├── meetings.ts   # Meeting routes
│   │   ├── users.ts      # User routes
│   │   └── routes.ts     # Main router
│   ├── services/         # Business logic services
│   │   └── service.ts
│   ├── sockets/          # WebSocket handlers
│   │   ├── chatSocket.js
│   │   ├── meetingSocker.js
│   │   └── sockerManager.js
│   ├── utils/            # Utility functions
│   │   └── mailer.ts     # Email service
│   └── index.ts          # Application entry point
├── .env                  # Environment variables (not in repo)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

---

## 💻 Development

### Available Scripts

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode
npm start

# Run tests (to be implemented)
npm test
```

### Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```
   The server will start at `http://localhost:3000` with auto-reload enabled.

2. **Make changes** to TypeScript files in `src/`

3. **Test endpoints** using tools like Postman, cURL, or your frontend application

4. **Build for production**
   ```bash
   npm run build
   ```
   Compiled JavaScript will be output to `dist/`

### Code Style & Best Practices

- **TypeScript strict mode** enabled
- **ESLint** for code quality (configure as needed)
- **Async/await** for asynchronous operations
- **Error handling** with try-catch blocks
- **TSDoc comments** for documentation

---

## 🚢 Deployment

### Building for Production

```bash
npm run build
```

### Running in Production

```bash
npm start
```

### Deployment Checklist

- [ ] Set strong `JWT_SECRET` in production environment
- [ ] Configure proper CORS origins (update in `src/index.ts`)
- [ ] Set `NODE_ENV=production`
- [ ] Use secure HTTPS connections
- [ ] Set up proper Firebase security rules
- [ ] Configure environment variables on hosting platform
- [ ] Enable logging and monitoring
- [ ] Set up SSL certificates
- [ ] Configure rate limiting for APIs
- [ ] Review and restrict API access

### Recommended Hosting Platforms

- **Railway** - Easy Node.js deployment
- **Heroku** - Simple git-based deployment
- **Google Cloud Run** - Containerized deployment
- **AWS Elastic Beanstalk** - Scalable Node.js hosting
- **DigitalOcean App Platform** - Managed Node.js hosting

---

## 👥 Authors

**Equipo AgoraX**
- GitHub: [@michaelRS2002](https://github.com/michaelRS2002)
- Github: [@AirWa1l](https://github.com/AirWa1l)
- Github: [@Mausterl26](https://github.com/Mausterl26)
- Github: [@LjuandalZPH](https://github.com/LjuandalZPH)
- Github: [@vilhood](https://github.com/vilhood)

---

## 📄 License

ISC

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

For support, please open an issue in the GitHub repository or contact the team members.

---

<div align="center">
  <p>Made with ❤️ by Team AgoraX</p>
  <p>⭐ Star us on GitHub — it helps!</p>
</div>
