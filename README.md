# 📖 Stories Collector

A secure, multilingual, and scalable web application for collecting and displaying guest stories.

## 🌟 Features

- **Story Submission**: Complete form with validation for guest stories
- **Multilingual Support**: English 🇬🇧, Hebrew 🇮🇱 (RTL), French 🇫🇷
- **Stories Listing**: Paginated stories with language filtering
- **Phone Verification**: Architecture ready for OTP integration (deferred)
- **Responsive Design**: Mobile-first, accessible UI
- **Security**: Input validation, sanitization, rate limiting, CSRF protection

## 🧰 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **CI/CD**: GitHub Actions
- **Deployment**: Netlify (Frontend/API), Railway (Database)

# TODO: update using new hosting services for dbs.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone [https://github.com/your-org/stories-collector.git](https://github.com/your-org/stories-collector.git)
    cd stories-collector
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` with your database credentials and other configuration.

4.  Run database migrations:
    ```bash
    npx prisma migrate dev
    ```
5.  Generate Prisma Client:
    ```bash
    npx prisma generate
    ```
6.  Start the development server:
    ```bash
    npm run dev
    ```
    Visit http://localhost:3000

### 🐳 Docker Setup

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
````

This will start:

  - PostgreSQL database on port 5432
  - Redis on port 6379
  - Application on port 3000

### 🧪 Testing

Run all tests:

```bash
npm test
```

Run E2E tests:

```bash
npm run test:e2e
```

Run tests in watch mode:

```bash
npm run test:watch
```

### 📁 Project Structure

```text
stories-collector/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── [lang]/       # Internationalized routes
│   │   └── api/          # API routes
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   ├── services/         # Business logic
│   ├── repositories/     # Data access layer
│   ├── types/            # TypeScript types
│   └── locales/          # Translation files
├── prisma/               # Database schema and migrations
├── tests/                # Test files
└── public/               # Static assets
```

### 🔐 Security Features

  - **Input Validation**: Zod schemas for all inputs
  - **Sanitization**: DOMPurify for XSS prevention
  - **Rate Limiting**: Per-IP request throttling
  - **CSRF Protection**: Built into Next.js
  - **Phone Verification**: OTP and JWT-based verification system
  - **JWT Security**: Secure token-based verification system

### 🔑 JWT & OTP Configuration

The application uses JWT (JSON Web Tokens) for secure verification tokens and OTP (One-Time Passwords) for phone verification. Here's how to set it up:

1. Configure JWT in your environment file:
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

2. Configure OTP settings:
   ```bash
   # Optional - defaults to 300 (5 minutes)
   OTP_CODE_TTL_SECONDS=300
   
   # Optional - defaults to 5
   OTP_MAX_ATTEMPTS=5
   ```

3. Generate a secure JWT secret:
   ```bash
   # Using openssl (recommended for production)
   openssl rand -base64 32
   
   # Or using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. Token Security Best Practices:
   - Store tokens securely (e.g., HttpOnly cookies)
   - Use short expiration times (default: 15 minutes)
   - Implement token refresh mechanism for longer sessions
   - Monitor for suspicious activity (multiple failed attempts)

### 📨 Notification Providers

The application supports sending OTP codes via email (SMTP) and SMS (TextBee). Here's how to configure the providers:

#### 📧 Email with Zoho SMTP

1. Install the required package:
   ```bash
   npm install nodemailer
   ```

2. Configure Zoho SMTP in your environment file:
   ```bash
   # Required for SMTP
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=465  # Use 465 for SSL or 587 for TLS
   SMTP_SECURE=true  # true for 465, false for 587
   SMTP_USER=your@yourdomain.com
   SMTP_PASS=your-smtp-password
   EMAIL_FROM="Stories Collector <no-reply@yourdomain.com>"
   ```

   ⚠️ **Important Zoho SMTP Notes**:
   - If your Zoho account has 2FA enabled, generate an app-specific password:
     1. Log in to Zoho Mail
     2. Go to Settings → Mail → Security → Generate App Password
     3. Use this password in `SMTP_PASS`
   - The sending address (`SMTP_USER` and `EMAIL_FROM`) must be authorized in your Zoho account
   - Test the configuration in development before deploying

#### 📱 SMS with TextBee

1. Install the required package:
   ```bash
   npm install axios
   ```

2. Configure TextBee in your environment file:
   ```bash
   # Required for SMS
   TEXTBEE_BASE_URL=https://api.textbee.example
   TEXTBEE_DEVICE_ID=your-device-id
   TEXTBEE_API_KEY=your-api-key
   ```

   ⚠️ **Important TextBee Notes**:
   - Sign up for a TextBee account and get your API credentials
   - The API key should be kept secret and never committed to version control
   - Test with a small number of recipients first
   - Monitor your TextBee dashboard for delivery status

#### 🔄 Provider Fallbacks

The OTP service is designed to gracefully handle missing configurations:

- If email/SMS provider configuration is missing, the service falls back to console logging (safe for development)
- Provider packages (`nodemailer`/`axios`) are optional at runtime - they're only loaded when the corresponding provider is configured
- All provider errors are caught and logged, preventing OTP flow disruption

#### 🧪 Testing Providers

Run the provider-specific tests:
```bash
# Run just the provider tests
npm test tests/unit/otp.providers.test.ts

# Or run all tests (includes providers)
npm test
```

The test suite includes mocked providers to verify:
- Email sending via SMTP when configured
- SMS sending via TextBee when configured
- Fallback to console.log when providers aren't configured
- Error handling for all providers

### ⚡ Quick dev & test (JWT / OTP)

You can run the app and tests in development without setting a production-grade `JWT_SECRET` because the `OtpService` falls back to a default secret for convenience. However, this is insecure for anything beyond local experimentation.

Recommended quick commands (zsh):

- Start dev server with a temporary secure secret:
```bash
JWT_SECRET=$(openssl rand -base64 32) npm run dev
```

- Run tests with a deterministic secret (recommended for CI/local test runs):
```bash
JWT_SECRET=test-jwt-secret-32chars npm test
# or run a single test file:
JWT_SECRET=test-jwt-secret-32chars npx jest tests/unit/otp.service.test.ts --runInBand
```

Best practices:
- Add `JWT_SECRET` to your local `.env.development` while developing (never commit it).
- Use a secrets manager for production secrets.

### 🌐 Internationalization

The app supports three languages:

  - **English (en)** - Default
  - **Hebrew (he)** - RTL support
  - **French (fr)**

Language files are in `src/locales/`.

### 📱 Phone Verification (Future)

The architecture includes an abstracted verification provider interface:

```typescript
interface IVerificationProvider {
  requestCode(phone: string): Promise<void>;
  verifyCode(phone: string, code: string): Promise<boolean>;
}
```

Currently using `NoOpVerificationProvider` as a placeholder. Future implementations can use:

  - TextBee
  - Twilio
  - AWS SNS
  - Or any other SMS gateway

### 🔄 API Endpoints

#### Stories

  - **`POST /api/stories`** - Submit a new story
  - **`GET /api/stories?page=1&pageSize=10&language=en`** - Get paginated stories
  - **`GET /api/stories/:id`** - Get story by ID

#### Phone Verification (Stubbed)

  - **`POST /api/phone/request`** - Request OTP (returns 501)
  - **`POST /api/phone/verify`** - Verify OTP (returns 501)

### 🚀 Deployment

#### Environment Variables

Required for production:

```bash
DATABASE_URL=your_postgres_connection_string
NEXT_PUBLIC_APP_URL=[https://your-domain.com](https://your-domain.com)
```

#### Deploy to Netlify

1.  Connect your GitHub repository to Netlify
2.  Set environment variables in Netlify dashboard
3.  Deploy command: `npm run build`
4.  Publish directory: `.next`

#### Database on Railway

1.  Create a PostgreSQL database on Railway
2.  Copy the connection string
3.  Run migrations: `npx prisma migrate deploy`

### 🤝 Contributing

1.  Fork the repository
2.  Create a feature branch: `git checkout -b feature/amazing-feature`
3.  Commit your changes: `git commit -m 'Add amazing feature'`
4.  Push to the branch: `git push origin feature/amazing-feature`
5.  Open a Pull Request

### 📝 Development Workflow

1.  Create a feature branch from `develop`
2.  Write tests for new features
3.  Ensure all tests pass: `npm test && npm run test:e2e`
4.  Run linter: `npm run lint`
5.  Submit PR to `develop` branch
6.  After review, merge to `main` for production deployment

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
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### 📄 License

This project is licensed under the MIT License.

### 👥 Authors

  - Your Team Name

### 🙏 Acknowledgments

  - Next.js team for the amazing framework
  - Prisma team for the excellent ORM
  - Tailwind CSS for the utility-first CSS framework

### 📞 Support

For support, email support@yourdomain.com or open an issue on GitHub.

-----

### **ARCHITECTURE.md**

````markdown
# Architecture Documentation

## Overview

Stories Collector follows a layered architecture pattern with clear separation of concerns.

## Layers

### 1. Presentation Layer
- **Location**: `src/app/[lang]/**` and `src/components/**`
- **Responsibility**: UI rendering, user interactions, i18n
- **Technologies**: Next.js App Router, React Server Components, Tailwind CSS

### 2. API Layer
- **Location**: `src/app/api/**`
- **Responsibility**: HTTP request handling, validation, response formatting
- **Technologies**: Next.js API Routes, Zod for validation

### 3. Service Layer
- **Location**: `src/services/**`
- **Responsibility**: Business logic, orchestration
- **Pattern**: Service classes with dependency injection

### 4. Repository Layer
- **Location**: `src/repositories/**`
- **Responsibility**: Data access, database operations
- **Pattern**: Repository pattern with Prisma ORM

### 5. Infrastructure Layer
- **Location**: `src/lib/**`
- **Responsibility**: Cross-cutting concerns (validation, sanitization, rate limiting)

## Design Patterns

### Dependency Injection
Used for verification provider abstraction:

```typescript
class StoryService {
  constructor(private verificationProvider: IVerificationProvider) {}
}
````

### Repository Pattern

Abstracts database operations:

```typescript
class StoryRepository {
  async create(data: StoryCreateInput): Promise<Story> { }
  async findById(id: string): Promise<Story | null> { }
}
```

### Adapter Pattern

For future SMS gateway integrations:

```typescript
interface IVerificationProvider {
  requestCode(phone: string): Promise<void>;
  verifyCode(phone: string, code: string): Promise<boolean>;
}
```

### Factory Pattern

Provider instantiation:

```typescript
function getVerificationProvider(): IVerificationProvider {
  // Return appropriate provider based on environment
}
```

### Data Flow

```text
User Request
    ↓
Presentation Layer (React Component)
    ↓
API Route (validation, rate limiting)
    ↓
Service Layer (business logic)
    ↓
Repository Layer (data access)
    ↓
Database (PostgreSQL)
```

### Security Architecture

#### Defense in Depth

  - **Input Validation**: Zod schemas at API layer
  - **Sanitization**: DOMPurify for XSS prevention
  - **Rate Limiting**: IP-based throttling
  - **CSRF Protection**: Next.js built-in
  - **SQL Injection Prevention**: Prisma parameterized queries
  - **Header Security**: Custom security headers

### Phone Verification (Future)

```text
User submits story with phone
    ↓
Story stored with verifiedPhone=false
    ↓
User requests verification code
    ↓
IVerificationProvider.requestCode()
    ↓
Code sent via SMS gateway
    ↓
User enters code
    ↓
IVerificationProvider.verifyCode()
    ↓
Story updated with verifiedPhone=true
```

### Database Schema

#### Stories Table

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100),
  teller_background TEXT,
  story_background TEXT,
  title VARCHAR(500),
  content TEXT NOT NULL,
  language VARCHAR(5) NOT NULL,
  verified_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stories_language ON stories(language);
CREATE INDEX idx_stories_created_at ON stories(created_at);
CREATE INDEX idx_stories_verified_phone ON stories(verified_phone);
```

### Scalability Considerations

  - **Horizontal Scaling**: Stateless API routes enable multiple instances
  - **Database connection pooling** via Prisma
  - **Redis** for session management (future)

#### Caching Strategy

  - Static page generation for public routes
  - ISR (Incremental Static Regeneration) for stories list
  - Client-side caching with SWR (future)

#### Performance Optimizations

  - Database indexes on frequently queried fields
  - Pagination for large datasets
  - Image optimization via Next.js Image component
  - Code splitting and lazy loading

### Monitoring & Observability

#### Logging

  - Structured logging with Winston (future)
  - Error tracking with Sentry (future)
  - Request logging middleware

#### Metrics

  - API response times
  - Database query performance
  - Rate limit hits
  - Story submission success/failure rates

#### Health Checks

  - `/api/health` endpoint (future)
  - Database connection status
  - External service status

### Future Enhancements

#### Short Term

  - Implement real OTP verification with TextBee
  - Add Redis for rate limiting and OTP storage
  - Implement email notifications
  - Add story moderation workflow

#### Long Term

  - Full-text search with Elasticsearch
  - Story analytics dashboard
  - User accounts and authentication
  - Story comments and reactions
  - Export stories to PDF
  - Admin panel for content management

### Testing Strategy

  - **Unit Tests**: Service layer business logic, Validation schemas, Utility functions
  - **Integration Tests**: API routes with database, Repository operations, Service orchestration
  - **E2E Tests**: Complete user flows, Multi-language support, Form validation, Story browsing

### Deployment Architecture

```text
GitHub → GitHub Actions → Build & Test → Deploy
        |
        └→ Docker Image
                  ↓
        ┌─────────┴─────────┐
        ↓                   ↓
    Netlify              Railway
  (Frontend/API)        (PostgreSQL)
```

### Code Organization Principles

  - **Single Responsibility**: Each module has one clear purpose
  - **DRY**: Reusable utilities and components
  - **SOLID**: Especially Interface Segregation and Dependency Inversion
  - **Type Safety**: Strict TypeScript throughout
  - **Testability**: Mockable dependencies, pure functions where possible

<!-- end list -->

````

---

### **17. Migration Script**

### **scripts/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  const stories = [
    {
      name: 'John Smith',
      phone: '+12025551234',
      email: 'john.smith@example.com',
      city: 'New York',
      country: 'USA',
      title: 'My Journey to Success',
      content: 'This is a story about perseverance and determination. It all started when I was young...',
      language: 'en',
      verifiedPhone: true,
    },
    {
      name: 'Sarah Johnson',
      phone: '+14155552345',
      email: 'sarah.j@example.com',
      city: 'San Francisco',
      country: 'USA',
      tellerBackground: 'Software engineer with 10 years experience',
      title: 'Breaking into Tech',
      content: 'My transition from teaching to software engineering was challenging but rewarding...',
      language: 'en',
      verifiedPhone: true,
    },
    {
      name: 'דוד כהן',
      phone: '+972501234567',
      email: 'david.cohen@example.com',
      city: 'תל אביב',
      country: 'ישראל',
      title: 'הסיפור שלי',
      content: 'זהו סיפור על אתגרים והצלחות בחיים. הכל התחיל כאשר...',
      language: 'he',
      verifiedPhone: false,
    },
    {
      name: 'Marie Dupont',
      phone: '+33612345678',
      email: 'marie.dupont@example.com',
      city: 'Paris',
      country: 'France',
      storyBackground: 'Une histoire d\'amour et de courage',
      title: 'Mon Histoire',
      content: 'C\'est une histoire qui parle de courage, d\'amour et de persévérance...',
      language: 'fr',
      verifiedPhone: true,
    },
    {
      name: 'Michael Brown',
      phone: '+442071234567',
      city: 'London',
      country: 'UK',
      content: 'A short story about finding purpose in life through helping others and giving back to the community.',
      language: 'en',
      verifiedPhone: false,
    },
  ];

  for (const story of stories) {
    await prisma.story.create({
      data: story,
    });
    console.log(`Created story: ${story.title || 'Untitled'}`);
}

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
````

Update `package.json` to add seed script:

```json
{
  "scripts": {
    "prisma:seed": "ts-node scripts/seed.ts"
  }
}
```

### Project Structure

```text
stories-collector/
├── .github/
│   └── workflows/
│       └── ci.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── [lang]/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── stories/
│   │   │   │   ├── page.tsx
│ D   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── submit/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── stories/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── route.ts
│   │       └── phone/
│   │           ├── request/
│   │           │   └── route.ts
│ 	│         	└── verify/
│ 	│         	      └── route.ts
│ 	├── components/
│ 	│ 	├── StoryForm.tsx
│ 	│ 	├── StoryList.tsx
│ 	│ 	├── StoryCard.tsx
│ 	│ 	├── LanguageSwitcher.tsx
│ 	│ 	└── Pagination.tsx
│ 	├── lib/
│ 	│ 	├── prisma.ts
│ 	│ 	├── validation.ts
│ 	│ 	├── sanitization.ts
│ 	│ 	├── rate-limit.ts
│ 	│ 	└── i18n.ts
│ 	├── services/
│ 	│ 	├── story.service.ts
│ 	│ 	└── verification/
│ 	│ 		├── IVerificationProvider.ts
│ 	│ 		├── NoOpVerificationProvider.ts
│ 	│ 		└── index.ts
│ 	├── repositories/
│ 	│ 	└── story.repository.ts
│ 	├── types/
│ 	│ 	└── index.ts
│ 	└── locales/
│ 		├── en.json
│ 		├── he.json
│ 		└── fr.json
├── tests/
│ 	├── unit/
│ 	├── integration/
│ 	└── e2e/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```