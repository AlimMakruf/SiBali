# 🌴 SIBALI — Sistem Rekomendasi Pariwisata Bali

**SIBALI** (Sistem Rekomendasi Pariwisata Bali) is a RESTful API that provides AI-powered tourism recommendations for Bali. It uses **Google Gemini AI** to generate personalized place recommendations and trending tourist spots, with **Supabase** as the database backend and **JWT** for user authentication.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Code Overview](#-code-overview)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Supabase Database Setup](#-supabase-database-setup)
- [API Endpoints](#-api-endpoints)
- [How to Use](#-how-to-use)
- [Deploy to Vercel](#-deploy-to-vercel)
- [Error Handling](#-error-handling)

---

## ✨ Features

- **User Authentication** — Register, login, refresh token, and logout with dual JWT token management
- **Token Management** — Short-lived access tokens (15m) + long-lived refresh tokens (7d) for secure sessions
- **Check User** — Verify if JWT is active and retrieve authenticated user data
- **Token Blacklisting** — Secure logout by invalidating tokens before expiry
- **Trending Places** — Get AI-generated trending/viral tourist places in Bali
- **Smart Search** — Search for tourism recommendations by keyword, category, and budget
- **Response Caching** — 30-minute TTL cache to avoid redundant AI calls
- **Search History** — Per-user search history tracking
- **Input Validation** — Request body validation with `express-validator`
- **Security** — Helmet headers, CORS, bcrypt password hashing

---

## 🛠 Tech Stack

| Technology                 | Purpose                          |
| -------------------------- | -------------------------------- |
| **Express.js 5**           | Web framework / API server       |
| **Supabase (PostgreSQL)**  | Database (users, cache, history) |
| **Google Gemini AI**       | AI-powered recommendations      |
| **JSON Web Token (JWT)**   | Authentication                   |
| **bcryptjs**               | Password hashing                 |
| **express-validator**      | Input validation                 |
| **Helmet**                 | Security headers                 |
| **Morgan**                 | HTTP request logging             |
| **dotenv**                 | Environment variable management  |

---

## 📁 Project Structure

```
SiBali/
├── server.js                        # Entry point — starts Express server
├── package.json                     # Dependencies & scripts
├── .env                             # Environment variables (not committed)
├── .env.example                     # Template for .env
└── src/
    ├── config/
    │   ├── config.js                # Centralized config from env vars
    │   └── supabase.js              # Supabase client initialization
    ├── controllers/
    │   ├── authController.js        # Handles register, login, refresh, me, logout
    │   └── recommendationController.js  # Handles trending & search requests
    ├── middlewares/
    │   ├── authMiddleware.js        # JWT verification + blacklist check middleware
    │   ├── errorHandler.js          # Global error handler
    │   └── validator.js             # Input validation rules
    ├── models/
    │   ├── userModel.js             # User table operations (CRUD)
    │   ├── tokenBlacklistModel.js   # Token blacklist table operations
    │   ├── searchCacheModel.js      # Search cache table operations
    │   ├── searchHistoryModel.js    # Search history table operations
    │   └── trendingPlaceModel.js    # Trending places table operations
    ├── routes/
    │   ├── authRoutes.js            # Auth route definitions
    │   └── recommendationRoutes.js  # Recommendation route definitions (protected)
    └── services/
        ├── authService.js           # Auth business logic (hash, token, refresh, logout)
        └── geminiService.js         # Gemini AI integration + caching logic
```

---

## 🔍 Code Overview

The project follows the **Route → Controller → Service → Model** pattern:

### `server.js` — Entry Point
Sets up Express with global middleware (Helmet, CORS, Morgan, JSON parser), mounts route modules under `/api/auth` and `/api/recommendations`, and starts the server.

### Config (`src/config/`)
- **`config.js`** — Loads environment variables via `dotenv` and exports a single config object with settings for `port`, `jwt`, `supabase`, `gemini`, and `cache` (30-min TTL).
- **`supabase.js`** — Initializes the Supabase client using the URL and service key from config. Warns if credentials are missing.

### Routes (`src/routes/`)
- **`authRoutes.js`** — Maps `POST /register`, `POST /login`, `POST /refresh-token`, `GET /me`, and `POST /logout` to the auth controller. Protected routes use `authMiddleware`.
- **`recommendationRoutes.js`** — All routes require JWT authentication (`authMiddleware`). Maps `GET /trending` and `POST /search` to the recommendation controller.

### Controllers (`src/controllers/`)
- **`authController.js`** — Receives validated request data, calls `authService`, and returns JSON responses for register (201), login (200), refresh token (200), check user (200), and logout (200).
- **`recommendationController.js`** — Calls `geminiService` for trending places and search recommendations. Includes the `source` field (`database`/`gemini`/`cache`) in responses.

### Services (`src/services/`)
- **`authService.js`** — Handles password hashing with bcrypt (10 salt rounds), user creation via `UserModel`, password verification on login, dual JWT generation (access + refresh tokens), token refresh, token blacklisting on logout, and user check.
- **`geminiService.js`** — Core AI integration:
  - `getTrendingPlaces()` — Checks `trending_places` table first; if empty, queries Gemini for 10 trending Bali spots, saves them, and returns the results.
  - `searchRecommendations()` — Checks `search_caches` by keyword; if valid cache exists (< 30 min), uses it; otherwise queries Gemini with keyword/category/budget, caches the response, and records search history.

### Models (`src/models/`)
Each model wraps Supabase queries for a specific table:
- **`userModel.js`** — `create`, `findByEmail`, `findById` on the `users` table. Handles duplicate email detection (SQL error code `23505`).
- **`tokenBlacklistModel.js`** — `add`, `isBlacklisted`, `cleanupExpired` on the `token_blacklist` table. Used for logout token invalidation.
- **`searchCacheModel.js`** — `findByKeyword` (with TTL check), `upsert` on the `search_caches` table.
- **`searchHistoryModel.js`** — `create`, `findByUserId` on the `search_histories` table.
- **`trendingPlaceModel.js`** — `getActive`, `bulkUpsert` (deactivates old records, inserts new batch) on the `trending_places` table.

### Middlewares (`src/middlewares/`)
- **`authMiddleware.js`** — Extracts JWT from `Authorization: Bearer <token>`, verifies it, checks the token blacklist, fetches the user from Supabase, and sets `req.user` and `req.tokenPayload` (includes `jti`, `exp`). Handles expired/invalid/revoked tokens.
- **`validator.js`** — Defines validation rule sets (`registerRules`, `loginRules`, `searchRules`, `refreshTokenRules`) using `express-validator`. Returns structured 400 errors on validation failure.
- **`errorHandler.js`** — Catches all errors and returns a consistent JSON response. In `development` mode, includes the error stack trace.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- A **Supabase** account with a project — [supabase.com](https://supabase.com)
- A **Google Gemini API key** — [ai.google.dev](https://ai.google.dev)

### Installation

```bash
# 1. Clone the repository
git clone <repository-url>
cd SiBali

# 2. Install dependencies
npm install

# 3. Create .env from the template
cp .env.example .env

# 4. Fill in your credentials in .env (see section below)

# 5. Start the development server (auto-reload on file changes)
npm run dev

# Or start in production mode
npm start
```

The server will start at `http://localhost:5000` (or the port you set in `.env`).

---

## 🔐 Environment Variables

Create a `.env` file in the project root (use `.env.example` as a template):

```env
# Server
PORT=5000
NODE_ENV=development

# JWT — Access Token (short-lived)
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=15m

# JWT — Refresh Token (long-lived)
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d

# Google Gemini API — powers AI recommendations
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase — database backend
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here
```

| Variable                 | Description                                                     |
| ------------------------ | --------------------------------------------------------------- |
| `PORT`                   | Server port (default `5000`)                                    |
| `NODE_ENV`               | `development` or `production`                                   |
| `JWT_SECRET`             | Secret key for signing access tokens — use a strong random string |
| `JWT_EXPIRES_IN`         | Access token expiry duration (default `15m`)                    |
| `JWT_REFRESH_SECRET`     | Secret key for signing refresh tokens — must differ from `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry duration (default `7d`)                    |
| `GEMINI_API_KEY`         | Your Google Gemini API key                                      |
| `SUPABASE_URL`           | Your Supabase project URL                                       |
| `SUPABASE_SERVICE_KEY`   | Your Supabase service role key (found in Project Settings → API)  |

---

## 🗄 Supabase Database Setup

Create the following tables in your Supabase project (SQL Editor):

```sql
-- 1. Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trending places table
CREATE TABLE trending_places (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100),
    gmaps_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Search caches table
CREATE TABLE search_caches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword VARCHAR(255) UNIQUE NOT NULL,
    ai_response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Search histories table
CREATE TABLE search_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    keyword_searched VARCHAR(255) NOT NULL,
    cache_id UUID REFERENCES search_caches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Token blacklist table (for logout invalidation)
CREATE TABLE token_blacklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup during auth middleware check
CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);
```

---

## 📡 API Endpoints

### Health Check

| Method | Endpoint | Auth | Description          |
| ------ | -------- | ---- | -------------------- |
| GET    | `/`      | No   | API info & endpoints |

### Authentication

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| POST   | `/api/auth/register`           | No   | Register new user                     |
| POST   | `/api/auth/login`              | No   | Login user                            |
| POST   | `/api/auth/refresh-token`      | No*  | Refresh access token                  |
| GET    | `/api/auth/me`                 | Yes  | Check JWT & get user data             |
| POST   | `/api/auth/logout`             | Yes  | Invalidate tokens (logout)            |

> \* Refresh token is sent in the request body, not via Authorization header.

### Discovery & Recommendations (Protected — requires JWT)

| Method | Endpoint                              | Auth | Description                        |
| ------ | ------------------------------------- | ---- | ---------------------------------- |
| GET    | `/api/recommendations/trending`       | Yes  | Get trending tourist places        |
| POST   | `/api/recommendations/search`         | Yes  | Search recommendations by keyword  |
| POST   | `/api/discovery/generate-itinerary`   | Yes  | Generate AI-powered itinerary      |

---

## 📖 How to Use

Below are step-by-step examples using **cURL**. You can also use Postman or any HTTP client.

### 1. Register a New User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "secret123"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2026-03-14T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secret123"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

> **Save both tokens** — `accessToken` is used in the `Authorization` header for protected endpoints. `refreshToken` is used to get a new access token when it expires.

### 3. Refresh Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4. Check User (Me)

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (200):**
```json
{
  "success": true,
  "message": "User is authenticated",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2026-03-14T..."
    }
  }
}
```

### 5. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

> After logout, both the access token and refresh token will be invalidated. Any subsequent requests using these tokens will return `401`.

### 6. Get Trending Places

```bash
curl http://localhost:5000/api/recommendations/trending \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trending places retrieved successfully",
  "source": "gemini",
  "data": [
    {
      "name": "Kelingking Beach",
      "description": "Iconic cliff viewpoint on Nusa Penida...",
      "category": "Beach",
      "gmaps_url": "https://maps.google.com/..."
    }
  ]
}
```

> The `source` field will be `"database"` on subsequent calls (cached), or `"gemini"` on first call.

### 7. Search Recommendations

```bash
curl -X POST http://localhost:5000/api/recommendations/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "keyword": "hidden waterfall",
    "category": "Alam",
    "budget": "IDR 100,000"
  }'
```

| Field      | Type   | Required | Description                                                      |
| ---------- | ------ | -------- | ---------------------------------------------------------------- |
| `keyword`  | string | Yes      | Search term (2–200 characters)                                   |
| `category` | string | No       | One of: `Pantai`, `Pura`, `Alam`, `Budaya`, `Kuliner`, `Adventure` |
| `budget`   | string | No       | Budget range, e.g. `"IDR 50,000 - IDR 100,000"`                  |

**Response (200):**
```json
{
  "success": true,
  "message": "Recommendations for \"hidden waterfall\" retrieved successfully",
  "source": "gemini",
  "data": [
    {
      "name": "Tukad Cepung Waterfall",
      "location": "Bangli",
      "category": "Nature",
      "description": "A stunning waterfall hidden inside a cave...",
      "rating": 4.7,
      "estimatedBudget": "IDR 30,000 - IDR 50,000",
      "tips": "Visit early morning for the best light rays",
      "gmaps_url": "https://maps.google.com/..."
    }
  ]
}
```

> The `source` field will be `"cache"` if the same keyword was searched within the last 30 minutes.

### 8. Generate AI Itinerary

```bash
curl -X POST http://localhost:5000/api/discovery/generate-itinerary \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "durationDays": 3,
    "durationNights": 2,
    "interests": ["Beach", "Culture", "Culinary"],
    "budgetRange": "Moderate",
    "adults": 2,
    "children": 0,
    "area": "Ubud",
    "specialRequests": "Vegetarian food"
  }'
```

| Field               | Type     | Required | Description                                                    |
| ------------------- | -------- | -------- | -------------------------------------------------------------- |
| `durationDays`      | integer  | Yes      | Number of days (1-14)                                          |
| `durationNights`    | integer  | No       | Number of nights                                               |
| `interests`         | array    | Yes      | Array of interest categories (e.g. `Beach`, `Culture`)         |
| `budgetRange`       | string   | Yes      | One of: `Budget`, `Moderate`, `Luxury`                         |
| `adults`            | integer  | Yes      | Number of adults (min 1)                                       |
| `children`          | integer  | No       | Number of children                                             |
| `area`              | string   | No       | Specific area in Bali (e.g. `Ubud`, `Canggu`)                  |
| `specialRequests`   | string   | No       | Special requests (e.g. `Wheelchair accessible`)                |
| `customPreferences` | string   | No       | Any other custom preferences                                   |

**Response (201):**
```json
{
  "status": "success",
  "message": "Itinerary generated successfully",
  "data": {
    "id": "uuid-here",
    "title": "3 Days in Ubud",
    "status": "published",
    "duration_days": 3,
    "duration_nights": 2,
    "itinerary_destinations": [
      {
        "day_number": 1,
        "time_slot": "Morning",
        "destination": {
          "name": "Sacred Monkey Forest Sanctuary"
        }
      }
    ]
  }
}
```

---

## 🚀 Deploy to Vercel

This project is pre-configured for **Vercel** serverless deployment.

### How It Works

| File            | Purpose                                                        |
| --------------- | -------------------------------------------------------------- |
| `vercel.json`   | Routes all requests to the Express serverless function         |
| `api/index.js`  | Vercel entry point — re-exports the Express app from server.js |
| `server.js`     | `app.listen` is skipped on Vercel (detected via `VERCEL` env)  |

### Option A: Deploy via Vercel CLI

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Login to your Vercel account
vercel login

# 3. Deploy (follow the prompts)
vercel

# 4. Deploy to production
vercel --prod
```

### Option B: Deploy via Vercel Dashboard

1. Push this project to a **GitHub** repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will auto-detect the `vercel.json` configuration
5. Add your **Environment Variables** (see below) before deploying
6. Click **Deploy**

### Setting Environment Variables on Vercel

In your Vercel project dashboard, go to **Settings → Environment Variables** and add:

| Variable                 | Value                                    |
| ------------------------ | ---------------------------------------- |
| `JWT_SECRET`             | Your strong secret key                   |
| `JWT_EXPIRES_IN`         | `15m`                                    |
| `JWT_REFRESH_SECRET`     | Your strong refresh secret key           |
| `JWT_REFRESH_EXPIRES_IN` | `7d`                                     |
| `GEMINI_API_KEY`         | Your Google Gemini API key               |
| `SUPABASE_URL`           | `https://your-project.supabase.co`       |
| `SUPABASE_SERVICE_KEY`   | Your Supabase service role key           |
| `NODE_ENV`               | `production`                             |

> **Note:** `PORT` is not needed on Vercel — the platform manages it automatically.

After deploying, your API will be live at `https://your-project.vercel.app`.

---

## ⚠️ Error Handling

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "message": "Error description here"
}
```

| Status Code | Meaning                                         |
| ----------- | ----------------------------------------------- |
| `400`       | Validation error (missing/invalid fields)       |
| `401`       | Unauthorized (missing/invalid/expired token)    |
| `404`       | Endpoint not found                              |
| `409`       | Conflict (e.g. email already registered)        |
| `503`       | Service unavailable (Gemini API key not set)    |
| `500`       | Internal server error                           |

In `development` mode, error responses also include the `stack` trace for debugging.

---

## 📄 License

ISC
