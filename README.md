# 🌴 SIBALI — Sistem Rekomendasi Pariwisata Bali

**SIBALI** (Sistem Rekomendasi Pariwisata Bali) is a RESTful API that provides AI-powered tourism recommendations for Bali. It uses **Google Gemini AI** (via OpenRouter) to generate personalized place recommendations, trending tourist spots, and custom itineraries, with **Supabase** as the database backend and **JWT** for user authentication.

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
- **Token Blacklisting** — Secure logout by invalidating tokens before expiry
- **User Profiles** — Profile management, interests, stats, saved & visited destinations
- **Destinations** — Browse, search, and view destination details with full metadata (coordinates, amenities, etc.)
- **Nearby Destinations** — Find nearby tourist places based on user's current GPS location (15km radius), with auto-provisioning from Google Places API
- **Reviews** — Create, view, and delete destination reviews
- **Trending Places** — AI-generated trending destinations with auto-refresh scheduler (every 2 days)
- **Smart Search** — Search for tourism recommendations by keyword, category, and budget
- **AI Itinerary Generation** — Generate personalized multi-day itineraries from discovery inputs
- **Image Backfill** — Automatically fetches missing destination photos from Google Places during itinerary generation
- **Trending Scheduler** — Automated `node-cron` job that refreshes trending destinations every 2 days
- **Response Caching** — 30-minute TTL cache to avoid redundant AI calls
- **Search History** — Per-user search history tracking
- **Input Validation** — Request body validation with `express-validator`
- **Security** — Helmet headers, CORS, bcrypt password hashing

---

## 🛠 Tech Stack

| Technology                 | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| **Express.js 5**           | Web framework / API server                 |
| **Supabase (PostgreSQL)**  | Database (destinations, users, itineraries)|
| **Google Gemini AI**       | AI-powered recommendations (via OpenRouter)|
| **OpenRouter API**         | AI model gateway for Gemini access         |
| **Google Places API (New)**| Real destination photos via Text Search    |
| **node-cron**              | Scheduled tasks (trending refresh)         |
| **JSON Web Token (JWT)**   | Authentication                             |
| **bcryptjs**               | Password hashing                           |
| **express-validator**      | Input validation                           |
| **Helmet**                 | Security headers                           |
| **Morgan**                 | HTTP request logging                       |
| **dotenv**                 | Environment variable management            |

---

## 📁 Project Structure

```
SiBali/
├── server.js                        # Entry point — starts Express server + scheduler
├── package.json                     # Dependencies & scripts
├── .env                             # Environment variables (not committed)
├── .env.example                     # Template for .env
├── api/
│   └── index.js                     # Vercel serverless entry point
├── scripts/
│   └── backfillTrendingImages.js    # One-off script: backfill missing destination photos
└── src/
    ├── config/
    │   ├── config.js                # Centralized config from env vars
    │   └── supabase.js              # Supabase client initialization
    ├── controllers/
    │   ├── authController.js        # Auth: register, login, refresh, me, logout
    │   ├── categoryController.js    # Category listing
    │   ├── destinationController.js # Destination CRUD + trending + nearby
    │   ├── discoveryController.js   # AI itinerary generation
    │   ├── interestController.js    # Interest listing
    │   ├── itineraryController.js   # Itinerary CRUD + days/items
    │   ├── recommendationController.js  # Trending & search
    │   ├── reviewController.js      # Destination reviews
    │   └── userProfileController.js # Profile, interests, saved, visited
    ├── middlewares/
    │   ├── authMiddleware.js        # JWT verification + blacklist check
    │   ├── errorHandler.js          # Global error handler
    │   └── validator.js             # Input validation rules
    ├── models/
    │   ├── categoryModel.js         # Categories table
    │   ├── destinationModel.js      # Destinations table (with bulkUpsert, update, findNearby)
    │   ├── interestModel.js         # Interests table
    │   ├── itineraryModel.js        # Itineraries table
    │   ├── itineraryDayModel.js     # Itinerary days table
    │   ├── itineraryItemModel.js    # Itinerary items table
    │   ├── reviewModel.js           # Reviews table
    │   ├── savedDestinationModel.js # Saved destinations table
    │   ├── searchCacheModel.js      # Search cache table
    │   ├── searchHistoryModel.js    # Search history table
    │   ├── tokenBlacklistModel.js   # Token blacklist table
    │   ├── userInterestModel.js     # User-interest mapping table
    │   ├── userModel.js             # Users table
    │   └── visitedDestinationModel.js # Visited destinations table
    ├── routes/
    │   ├── authRoutes.js            # /api/auth
    │   ├── categoryRoutes.js        # /api/categories
    │   ├── destinationRoutes.js     # /api/destinations (+ /nearby)
    │   ├── discoveryRoutes.js       # /api/discovery
    │   ├── interestRoutes.js        # /api/interests
    │   ├── itineraryRoutes.js       # /api/itineraries
    │   ├── recommendationRoutes.js  # /api/recommendations
    │   └── userRoutes.js            # /api/users
    ├── scheduler/
    │   └── trendingScheduler.js     # Cron job: refresh trending every 2 days
    └── services/
        ├── authService.js           # Auth business logic
        ├── destinationService.js    # Destination business logic + nearby
        ├── geminiService.js         # Gemini AI integration + caching
        ├── googlePlacesService.js   # Google Places API — photos + nearby search
        ├── itineraryService.js      # Itinerary generation + CRUD + image backfill
        ├── reviewService.js         # Review business logic
        └── userProfileService.js    # Profile, interests, saved, visited
```

---

## 🔍 Code Overview

The project follows the **Route → Controller → Service → Model** pattern:

### `server.js` — Entry Point
Sets up Express with global middleware (Helmet, CORS, Morgan, JSON parser), mounts all route modules, and starts the trending destination scheduler on boot.

### Config (`src/config/`)
- **`config.js`** — Loads environment variables via `dotenv` and exports a single config object with settings for `port`, `jwt`, `supabase`, `gemini`, `openrouter`, and `cache` (30-min TTL).
- **`supabase.js`** — Initializes the Supabase client using the URL and service key from config.

### Scheduler (`src/scheduler/`)
- **`trendingScheduler.js`** — Uses `node-cron` to run a job every 2 days at midnight (WITA/Bali timezone). Calls `geminiService.refreshTrending()` to fetch fresh trending destinations from Gemini AI and save them to the database.

### Routes (`src/routes/`)
- **`authRoutes.js`** — Authentication endpoints (register, login, refresh, me, logout)
- **`categoryRoutes.js`** — Public category listing
- **`interestRoutes.js`** — Public interest listing
- **`destinationRoutes.js`** — Destination CRUD, nearby, reviews, save/unsave, visited (mixed public/protected)
- **`userRoutes.js`** — User profile, interests, stats, saved, visited, reviews (protected)
- **`itineraryRoutes.js`** — Itinerary CRUD with days and items (protected)
- **`discoveryRoutes.js`** — AI itinerary generation (protected)
- **`recommendationRoutes.js`** — Trending places and search (protected)

### Controllers (`src/controllers/`)
- **`authController.js`** — Register (201), login (200), refresh (200), me (200), logout (200)
- **`destinationController.js`** — List, trending, nearby, and detail endpoints
- **`discoveryController.js`** — AI itinerary generation from discovery inputs
- **`itineraryController.js`** — Full CRUD for itineraries, days, and items
- **`reviewController.js`** — Create and delete reviews
- **`userProfileController.js`** — Profile, interests, stats, saved/visited destinations
- **`recommendationController.js`** — Trending places and search via Gemini AI

### Services (`src/services/`)
- **`authService.js`** — Password hashing, JWT generation (access + refresh), token refresh, blacklisting
- **`geminiService.js`** — Core AI integration via OpenRouter:
  - `getTrendingPlaces()` — Returns trending destinations from DB; checks 2-day staleness — triggers background `refreshTrending()` if data is stale, or calls it synchronously if no data exists
  - `refreshTrending()` — Force-fetches 10 trending destinations from Gemini and persists all fields (coordinates, amenities, contact info, etc.) via `DestinationModel.bulkUpsert()`. Returns `{ source, count, data }`
  - `searchRecommendations()` — Keyword search with 30-min cache TTL
  - `generateItineraryFromDiscovery()` — Generates multi-day itineraries from user preferences
- **`itineraryService.js`** — Itinerary CRUD + AI generation orchestration. Auto-provisions destinations from Gemini data with full field mapping, automatic category resolution via `CategoryModel.findOrCreate()`, and real photo fetching via Google Places API. **Includes image backfill** — automatically fetches photos for existing destinations that have empty images during itinerary generation
- **`googlePlacesService.js`** — Google Places API (New) integration for destination photos and nearby search:
  - `searchPlace(name, area?)` — Text Search to find a place and get its `photos[]` array
  - `getPhotoUrl(photoName)` — Resolves a photo resource name to a stable CDN URL via `skipHttpRedirect=true`
  - `fetchPhotosForDestination(name, area?, maxPhotos?)` — Orchestrator: search → resolve → return array of photo URLs. Fails gracefully (returns `[]`)
  - `searchNearby(lat, lng, radiusMeters?, maxResults?, excludeNames?)` — Text Search with `locationBias` circle to find tourist attractions near a coordinate
  - `searchNearbyWithPhotos(lat, lng, radiusMeters?, maxResults?, excludeNames?)` — Orchestrates nearby search + photo resolution, returns structured objects ready for DB insertion
- **`destinationService.js`** — Destination listing, search, and **nearby destinations**:
  - `getNearby(lat, lng, radiusKm?, limit?)` — Finds nearby destinations from user's current location. Checks DB first (bounding box + Haversine), then fetches remaining from Google Places API and auto-provisions them into the DB with photos and category
- **`reviewService.js`** — Review creation, listing, and deletion
- **`userProfileService.js`** — Profile updates, interests, saved/visited tracking, stats

### Models (`src/models/`)
Each model wraps Supabase queries for a specific table:
- **`userModel.js`** — Users table with duplicate email detection
- **`tokenBlacklistModel.js`** — Token blacklist for secure logout
- **`destinationModel.js`** — Destinations table with enriched `bulkUpsert` that maps 14+ Gemini fields (name, category_id, description, ai_description, about, address, area, latitude, longitude, gmaps_url, phone, website, amenities, images, rating_avg). Key methods:
  - `findByName(name)` — Case-insensitive lookup, returns `id, name, images, area` for backfill checks
  - `update(id, fields)` — Partial update (e.g. backfill images)
  - `findNearby(lat, lng, radiusKm?, limit?, excludeId?)` — Bounding-box query + Haversine distance filtering for precise nearby search, returns results sorted by distance
  - `bulkUpsert(places)` — Batch insert with Google Places photo fetching and category cache
- **`categoryModel.js`** — Categories with `findByNameFuzzy()` (case-insensitive ILIKE), `create()` (auto-log), and `findOrCreate()` (fuzzy-match-or-create pattern for Gemini category strings)
- **`interestModel.js`** — Interests lookup
- **`itineraryModel.js`** / **`itineraryDayModel.js`** / **`itineraryItemModel.js`** — Itinerary structure. All destination joins now use `destinations(*)` to return full destination data including all enriched fields
- **`reviewModel.js`** — Destination reviews with rating aggregation
- **`savedDestinationModel.js`** / **`visitedDestinationModel.js`** — User-destination tracking
- **`searchCacheModel.js`** / **`searchHistoryModel.js`** — Search caching and history

### Middlewares (`src/middlewares/`)
- **`authMiddleware.js`** — JWT extraction, verification, blacklist check, and user hydration
- **`validator.js`** — Validation rules for all endpoints (register, login, search, reviews, discovery, itinerary, profile, interests)
- **`errorHandler.js`** — Consistent JSON error responses with stack traces in development mode

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- A **Supabase** account with a project — [supabase.com](https://supabase.com)
- A **Google Gemini API key** — [ai.google.dev](https://ai.google.dev)
- A **Google Cloud API key** with **Places API (New)** enabled — [console.cloud.google.com](https://console.cloud.google.com) (optional, for destination photos)

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

# Google Gemini API / OpenRouter — powers AI recommendations
GEMINI_API_KEY=your_gemini_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Places API (New) — destination photos
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

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
| `GEMINI_API_KEY`         | Your Google Gemini API key (fallback for OpenRouter)            |
| `OPENROUTER_API_KEY`     | Your OpenRouter API key — used for AI requests                  |
| `GOOGLE_PLACES_API_KEY`  | Your Google Places API key — used for fetching destination photos (optional, graceful fallback) |
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
    avatar_url TEXT,
    bio TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Interests table
CREATE TABLE interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Destinations table (replaces old trending_places)
CREATE TABLE destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT DEFAULT '',
    ai_description TEXT,
    about TEXT,
    address TEXT,
    area VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    gmaps_url TEXT,
    phone VARCHAR(50),
    website TEXT,
    amenities JSONB DEFAULT '[]',
    images JSONB DEFAULT '[]',
    rating_avg NUMERIC(2,1),
    review_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reviews table
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Saved destinations table
CREATE TABLE saved_destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, destination_id)
);

-- 7. Visited destinations table
CREATE TABLE visited_destinations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, destination_id)
);

-- 8. User interests table
CREATE TABLE user_interests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, interest_id)
);

-- 9. Itineraries table
CREATE TABLE itineraries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    duration_days INTEGER,
    duration_nights INTEGER,
    budget_range VARCHAR(100),
    area VARCHAR(255),
    discovery_inputs JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Itinerary days table
CREATE TABLE itinerary_days (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Itinerary items table
CREATE TABLE itinerary_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    itinerary_day_id UUID REFERENCES itinerary_days(id) ON DELETE CASCADE,
    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,
    visit_time VARCHAR(50),
    order_in_day INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Search caches table
CREATE TABLE search_caches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword VARCHAR(255) UNIQUE NOT NULL,
    ai_response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Search histories table
CREATE TABLE search_histories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    keyword_searched VARCHAR(255) NOT NULL,
    cache_id UUID REFERENCES search_caches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Token blacklist table (for logout invalidation)
CREATE TABLE token_blacklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX idx_destinations_trending ON destinations(is_trending) WHERE is_active = true;
CREATE INDEX idx_destinations_category ON destinations(category_id);
CREATE INDEX idx_reviews_destination ON reviews(destination_id);
CREATE INDEX idx_itinerary_items_day ON itinerary_items(itinerary_day_id);
```

---

## 📡 API Endpoints

### Health Check

| Method | Endpoint | Auth | Description          |
| ------ | -------- | ---- | -------------------- |
| GET    | `/`      | No   | API info & endpoints |

### Authentication (`/api/auth`)

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| POST   | `/register`                    | No   | Register new user                     |
| POST   | `/login`                       | No   | Login user                            |
| POST   | `/refresh-token`               | No*  | Refresh access token                  |
| GET    | `/me`                          | Yes  | Check JWT & get user data             |
| POST   | `/logout`                      | Yes  | Invalidate tokens (logout)            |

> \* Refresh token is sent in the request body, not via Authorization header.

### Categories & Interests (Public)

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| GET    | `/api/categories`              | No   | List all active categories            |
| GET    | `/api/interests`               | No   | List all active interests             |

### Destinations (`/api/destinations`)

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| GET    | `/`                            | No   | List all destinations                 |
| GET    | `/trending`                    | No   | List trending destinations            |
| GET    | `/nearby?lat=&lng=`            | No   | Find nearby destinations by user location |
| GET    | `/:id`                         | No   | Get destination by ID                 |
| POST   | `/:id/view`                    | No   | Track a page view for a destination   |
| GET    | `/:id/reviews`                 | No   | Get reviews for a destination         |
| POST   | `/:id/reviews`                 | Yes  | Add a review for a destination        |
| POST   | `/:id/save`                    | Yes  | Save destination                      |
| DELETE | `/:id/save`                    | Yes  | Unsave destination                    |
| POST   | `/:id/visited`                 | Yes  | Mark destination as visited           |
| DELETE | `/:id/visited`                 | Yes  | Unmark destination as visited         |

### User Profile (`/api/users`) - Protected

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| GET    | `/me/profile`                  | Yes  | Get user profile                      |
| PUT    | `/me/profile`                  | Yes  | Update user profile                   |
| POST   | `/me/interests`                | Yes  | Set user interests                    |
| GET    | `/me/interests`                | Yes  | Get user interests                    |
| GET    | `/me/stats`                    | Yes  | Get user stats                        |
| GET    | `/me/saved`                    | Yes  | Get saved destinations                |
| GET    | `/me/visited`                  | Yes  | Get visited destinations              |
| GET    | `/me/reviews`                  | Yes  | Get user's reviews                    |
| DELETE | `/reviews/:id`                 | Yes  | Delete a review                       |

### Itineraries (`/api/itineraries`) - Protected

| Method | Endpoint                       | Auth | Description                           |
| ------ | ------------------------------ | ---- | ------------------------------------- |
| POST   | `/`                            | Yes  | Create a new itinerary                |
| GET    | `/`                            | Yes  | Get all itineraries for user          |
| GET    | `/:id`                         | Yes  | Get itinerary details by ID           |
| PUT    | `/:id`                         | Yes  | Update an itinerary                   |
| DELETE | `/:id`                         | Yes  | Delete an itinerary                   |
| POST   | `/:id/days`                    | Yes  | Add a day to an itinerary             |
| GET    | `/:id/days`                    | Yes  | Get days for an itinerary             |
| DELETE | `/days/:dayId`                 | Yes  | Delete a day                          |
| POST   | `/days/:dayId/items`           | Yes  | Add an item to a day                  |
| PUT    | `/items/:itemId`               | Yes  | Update an item                        |
| DELETE | `/items/:itemId`               | Yes  | Delete an item                        |

### Discovery & Recommendations - Protected

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
    "budgetRange": "IDR 5,000,000",
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
| `budgetRange`       | string   | Yes      | Free-text budget — any format accepted (e.g. `IDR 500,000`, `$1000`, `Budget`, `Moderate`) |
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

### 9. Get Nearby Destinations

Find tourist destinations near the user's current GPS location.

```bash
curl "http://localhost:5000/api/destinations/nearby?lat=-8.5069&lng=115.2625&radius=15&limit=5"
```

| Query Param | Type   | Required | Default | Description                  |
| ----------- | ------ | -------- | ------- | ---------------------------- |
| `lat`       | number | Yes      | —       | User's current latitude      |
| `lng`       | number | Yes      | —       | User's current longitude     |
| `radius`    | number | No       | `15`    | Search radius in km          |
| `limit`     | number | No       | `5`     | Max number of results        |

**Response (200):**
```json
{
  "success": true,
  "message": "Found 5 nearby destination(s)",
  "data": [
    {
      "id": "uuid-here",
      "name": "Ubud Monkey Forest",
      "latitude": -8.5185,
      "longitude": 115.2587,
      "rating_avg": 4.5,
      "images": ["https://lh3.googleusercontent.com/..."],
      "_distance_km": 1.42,
      "categories": { "id": "uuid", "name": "Attraction", "icon_url": null }
    }
  ]
}
```

> **How it works:** The API first checks the database for existing destinations within the radius (using bounding-box + Haversine distance). If fewer than `limit` results are found, it automatically fetches additional places from the Google Places API, saves them to the database (with photos), and returns the combined results. Subsequent requests to the same area will hit the database — no extra API calls needed.

### 10. Backfill Missing Destination Images

Run this one-off script to fetch Google Places photos for all destinations that have empty images:

```bash
node scripts/backfillTrendingImages.js
```

The script will:
1. Query all active destinations with empty/null images
2. Fetch a photo for each from Google Places API (with 300ms delay between requests)
3. Update the database with the fetched photo URLs
4. Skip destinations that already have images

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
| `OPENROUTER_API_KEY`     | Your OpenRouter API key                  |
| `GOOGLE_PLACES_API_KEY`  | Your Google Places API key               |
| `SUPABASE_URL`           | `https://your-project.supabase.co`       |
| `SUPABASE_SERVICE_KEY`   | Your Supabase service role key           |
| `NODE_ENV`               | `production`                             |

> **Note:** `PORT` is not needed on Vercel — the platform manages it automatically.

> **Note:** The trending destination scheduler (`node-cron`) does not run on Vercel since it is a serverless environment. Use an external cron service (e.g. Vercel Cron Jobs, GitHub Actions, or cron-job.org) to call the refresh endpoint periodically if needed.

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
