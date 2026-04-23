# 📖 Stories Collector

A secure, multilingual, and scalable web application for collecting and displaying guest stories with OTP verification.

## 🌟 Features

- **Story Submission**: Complete form with validation for guest stories
- **Multilingual Support**: English 🇬🇧, Hebrew 🇮🇱 (RTL), French 🇫🇷
- **Stories Listing**: Paginated stories with language filtering
- **OTP Verification**: Email verification via external OTP service
- **JWT Security**: Token-based verification system
- **Responsive Design**: Mobile-first, accessible UI with Tailwind CSS
- **Security**: Input validation, sanitization, rate limiting, CSRF protection
 - **AI-Powered Story Enrichment**: Automatically generates summaries and spiritual lessons for uploaded stories. The enrichment uses language-specific prompts (prompts/story_enrichment_en.txt, prompts/story_enrichment_he.txt, prompts/story_enrichment_fr.txt) and is triggered asynchronously after story creation. Language is taken from the story `language` field (required: `en` | `he` | `fr`).

## 🧰 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16 with Prisma ORM
- **Rate Limiting**: In-memory store (per-instance)
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **CI/CD**: GitHub Actions
- **Containerization**: Docker & Docker Compose

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm
- Docker & Docker Compose (optional, for containerized setup)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/stories-collector.git
   cd stories-collector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Create environment files from example
   cp .env.example .env
   cp .env.example .env.test
   ```
   Edit `.env` for development and `.env.test` for testing with your configuration.

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

### 🐳 Docker Setup

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Application on port 3000
- Prisma Studio on port 5555 (optional, use `docker-compose --profile tools up -d`)


### 🧪 Testing

The project uses a multi-tier testing strategy:

**Local Development (Full Testing):**
```bash
# Run all unit and integration tests
npm test

# Run all tests including OTP E2E (requires external OTP service)
npm run test:all

# Run only E2E tests (excluding OTP integration)
npm run test:e2e:no-otp

# Run only OTP E2E tests (requires external service)
npm run test:e2e:otp-only
```

**CI/CD (No External Dependencies):**
```bash
# What CI runs - self-contained tests only
npm run test:ci
```

**Environment Setup:**
```bash
# Create local environment files from example
cp .env.example .env
cp .env.example .env.test

# Edit files for your local configuration
# .env - for development (npm run dev)
# .env.test - for testing (npm test)
```

**For OTP E2E tests:** Ensure external OTP service is running and configured in `.env.test`

See [Testing Guide](docs/testing.md) for detailed information.

### 📁 Project Structure

```text
stories-collector/
├── src/
│   ├── app/
│   │   ├── [lang]/           # Internationalized routes
│   │   │   ├── stories/      # Stories listing page
│   │   │   └── submit/       # Story submission page
│   │   └── api/
│   │       ├── stories/      # Story CRUD endpoints
│   │       ├── otp/          # OTP send/verify endpoints
│   │       └── phone/        # Phone verification endpoints
│   ├── components/           # React components
│   │   ├── StoryForm.tsx
│   │   ├── StoryList.tsx
│   │   ├── StoryCard.tsx
│   │   └── LanguageSwitcher.tsx
│   ├── lib/                  # Utility functions
│   │   ├── validation.ts     # Zod schemas
│   │   ├── sanitization.ts   # DOMPurify wrapper
│   │   ├── rate-limit.ts     # Rate limiting
│   │   ├── jwt.ts            # JWT utilities
│   │   └── prisma.ts         # Prisma client
│   ├── services/             # Business logic
│   │   └── story.service.ts
│   ├── repositories/         # Data access layer
│   │   └── story.repository.ts
│   ├── types/                # TypeScript types
│   └── locales/              # Translation files (en, he, fr)
├── prisma/                   # Database schema and migrations
├── tests/
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   ├── e2e/                  # E2E tests (no external deps)
│   └── e2e-otp/              # E2E tests with OTP service
├── .devcontainer/            # VS Code dev container config
├── docker-compose.yml        # Docker Compose configuration
└── Dockerfile                # Production Docker image
```

### 🔐 Security Features

- **Input Validation**: Zod schemas for all inputs
- **Sanitization**: DOMPurify for XSS prevention
- **Rate Limiting**: Per-IP request throttling
- **CSRF Protection**: Built into Next.js
- **Phone Verification**: OTP and JWT-based verification system
- **JWT Security**: Secure token-based verification system
- **SQL Injection Prevention**: Prisma parameterized queries
- **Security Headers**: Custom security headers (X-Content-Type-Options, X-Frame-Options, etc.)

### 🔑 JWT & OTP Configuration

The application uses JWT (JSON Web Tokens) for secure verification tokens and OTP (One-Time Passwords) for phone verification.

#### JWT Configuration

Configure JWT in your environment file:

```bash
# Required - at least 32 characters long, keep this secret!
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Optional - defaults to 15m (15 minutes)
JWT_EXPIRES_IN=15m
```

⚠️ **Important Security Notes**:
- Generate a strong JWT secret (at least 32 characters)
- Never commit your JWT secret to version control
- Use different secrets for development and production
- Rotate your JWT secret periodically in production

Generate a secure JWT secret:

```bash
# Using openssl (recommended for production)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### External OTP Service

The application uses an external OTP service for sending verification codes via email:

```bash
# External OTP Service Configuration
OTP_SERVICE_URL=http://localhost:3000
```

**OTP Service Integration:**

The application makes HTTP requests to the external OTP service:

Send OTP:
```bash
curl -X POST "$OTP_SERVICE_URL/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "user@example.com", "channel": "email"}'
```

Verify OTP:
```bash
curl -X POST "$OTP_SERVICE_URL/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"recipient": "+15555550123", "code": "123456"}'
```

#### Quick Development Setup

For local development without setting a production-grade JWT_SECRET:

```bash
# Start dev server with a temporary secure secret
JWT_SECRET=$(openssl rand -base64 32) npm run dev

# Run tests with a deterministic secret
JWT_SECRET=test-jwt-secret-32chars npm test
```

Best practices:
- Add `JWT_SECRET` to your local `.env` file while developing (never commit it)
- Use a secrets manager for production secrets

### 🔄 API Endpoints

#### Stories

- **`POST /api/stories`** - Submit a new story
  - Body: `{ name, phone, email?, city?, country?, tellerBackground?, storyBackground?, title?, content, language, verificationToken? }`
  - Notes:
    - `language` is required and must be one of `en`, `he`, or `fr`. The enrichment service uses this value to choose the prompt language.
    - `verificationToken` is optional. If provided, the server verifies the token (JWT) and sets `verifiedEmail: true` on the created story. If omitted, the story is accepted but `verifiedEmail` will be `false`.
    - LLM enrichment is triggered asynchronously after creation when enabled (see environment variables below). If enrichment fails, the story is still created and a generated content record is stored with status `failed`.
  - Returns: Created story object

- **`GET /api/stories?page=1&pageSize=10&language=en`** - Get paginated stories
  - Query params: `page`, `pageSize`, `language`
  - Returns: Paginated response with stories

- **`GET /api/stories/:id`** - Get story by ID
  - Returns: Story object or 404

#### Enrichment (Generated AI Content)

- **`GET /api/stories/:id/enrichment`** - Get generated content for a story
  - Returns the generated content record (if any): `{ id, storyId, providerName, modelName, generatedText?, status, errorMessage?, createdAt, updatedAt }`.
  - Status codes: `200` (found), `404` (not found), `500` (server error).

- **`POST /api/stories/:id/enrichment`** - Trigger a retry of enrichment for an existing story
  - Purpose: Retry a failed enrichment. The endpoint enforces a maximum retry limit to avoid excessive LLM calls.
  - Behavior:
    - Validates the story exists and that a generated content record exists for the story.
    - If `retryCount` >= configured max retries, returns `429` with details.
    - Otherwise it triggers an asynchronous retry and returns the current enrichment record.
  - Returns: Updated enrichment record and `200` on success, `404` if no record, `429` when retry limit exceeded.

#### Chat / LLM Proxy

- **`POST /api/chat`** - Server-side proxy to call the configured LLM backend
  - Body: Pass-through to the LLM client (e.g., `{ model, messages, max_tokens }`). The server forwards the request to the LLM backend using `LVM_API_KEY`/server-side credentials.
  - Notes: This endpoint is intended for internal use only and never exposes LLM secrets to the browser.
  - Returns: The LLM backend response or `500` for proxy errors.

#### Common behaviors & headers

- Rate limiting headers are included on responses where rate limiting applies:
  - `X-RateLimit-Limit` — configured max requests per window
  - `X-RateLimit-Remaining` — remaining requests in the window
  - `X-RateLimit-Reset` — timestamp when the window resets
- Typical status codes used across APIs: `200`, `201`, `400` (validation), `401` (auth), `404`, `429` (rate limit / retry limits), `500` (server error).


#### OTP Verification

- **`POST /api/otp/send`** - Send OTP code via email
  - Body: `{ recipient, channel: "email" }`
  - Returns: `{ message, recipient, channel, expiresIn }`

- **`POST /api/otp/verify`** - Verify OTP code and get JWT token
  - Body: `{ recipient, code, channel }`
  - Returns: `{ success, token, expiresIn }`

### 🌐 Internationalization

The app supports three languages:

- **English (en)** - Default
- **Hebrew (he)** - RTL support
- **French (fr)**

Language files are in `src/locales/`. The app uses `next-intl` for internationalization with automatic locale detection and routing.

### AI Enrichment (LLM)

- Prompt files live in the `prompts/` folder and are language-specific: `prompts/story_enrichment_en.txt`, `prompts/story_enrichment_he.txt`, `prompts/story_enrichment_fr.txt`.
- Enrichment is triggered asynchronously after a story is created when `ENABLE_LLM_ENRICHMENT` is set to `true`.
- The service selects the prompt by the story `language` field. If a language-specific prompt file is missing, the service falls back to the Hebrew prompt.
- Retry behavior: the LLM client retries on HTTP 502/503/504 responses up to 5 times with a 5 second delay between retries. Failures are recorded in the generated content record (`status: failed`).
- Note: the application currently expects the `language` value to be provided by the client when submitting a story. Automatic language detection is not enabled by default; implementors can add a language-detection step (for example using a small NPM library) before persisting the story if they prefer auto-detection.

### 🚀 Deployment

#### Environment Variables

Required for production:

```bash
DATABASE_URL=your_postgres_connection_string
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your-production-jwt-secret-min-32-chars
OTP_SERVICE_URL=https://your-otp-service.com

# AI / LLM Configuration
ENABLE_LLM_ENRICHMENT=true # Set to 'true' to enable asynchronous enrichment (default: disabled in repo)
LLM_MODEL_NAME=dicta-il/DictaLM-3.0-24B-Thinking-W4A16 # Optional model override
LLM_MAX_TOKENS=2048 # Optional override for max tokens
```

Optional:

```bash
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=10   # Max requests per window
```

#### Build & Deploy

```bash
# Build the application
npm run build

# Start production server
npm start
```

#### Docker Deployment

```bash
# Build Docker image
docker build -t stories-collector:latest .

# Run container
docker run -p 3000:3000 --env-file .env stories-collector:latest
```

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### 📝 Development Workflow

1. Create a feature branch from `develop`
2. Write tests for new features
3. Ensure all tests pass: `npm test && npm run test:e2e`
4. Run linter: `npm run lint`
5. Submit PR to `develop` branch
6. After review, merge to `main` for production deployment

### 📊 Code Quality

- **Type Safety**: Strict TypeScript mode
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier
- **Testing**: 80%+ code coverage target

### 🐛 Troubleshooting

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

#### Prisma Issues

```bash
# Reset Prisma Client
rm -rf node_modules/.prisma
npx prisma generate

# Reset database (development only)
npx prisma migrate reset
```

#### Port Already in Use

```bash
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### 📄 License

This project is licensed under the MIT License.

### 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Tailwind CSS for the utility-first CSS framework

---

For more detailed documentation, see:
- [Testing Guide](docs/testing.md)
- [Database Notes](docs/db_notes.md)
- [Development Plan](docs/plan.md)
