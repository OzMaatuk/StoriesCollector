# 📖 Stories Collector

A simple, secure, and multilingual web application for collecting and displaying guest stories.

## 🌟 Features
- 📝 **Story submission form**  
  - Required: `name`, `phone`  
  - Optional: `email`, `city`, `country`, `teller background`, `story background`, `title`, `content`  
- 🌐 **Multi-language UI** (English 🇬🇧, Hebrew 🇮🇱 with RTL, French 🇫🇷)  
- 📱 **Phone verification** using **TextBee** SMS gateway (external service)  
- 🧾 **Scrollable stories page** with a clean, responsive UI  
- 🧰 **Secure, stable, maintainable** architecture (validation, sanitization, rate limiting, CSRF/XSS protection)

## 🏗️ Tech Stack
- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS  
- **Backend/API:** Next.js API Routes or Express/NestJS  
- **Database:** Postgres (Railway or other) + Prisma ORM  
- **OTP / SMS Service:** TextBee (via its REST API) + Redis (for temporary OTP state)  
- **Testing:** Playwright (E2E, UI)  
- **CI/CD:** GitHub Actions  
- **Deployment:** Netlify (frontend/API) + Railway (DB & optional backend)  

## 🔐 Security & Quality
- E.164 phone validation and OTP with short TTL  
- Sanitized story content (XSS-safe)  
- CSRF protection, input validation, rate limiting  
- Prisma migrations, structured logging, error monitoring  
- Automated tests (unit, integration, E2E)

## 🧾 API Overview
- `POST /api/phone/request` – Request OTP via TextBee  
- `POST /api/phone/verify` – Verify OTP and issue short-lived server-side token or mark phone verified  
- `POST /api/stories` – Submit story (phone must already be verified)  
- `GET /api/stories` – List stories (load more)  
- `GET /api/stories/:id` – Get story detail

## 🗃️ Database Schema (Prisma)
```prisma
model Story {
  id               String   @id @default(uuid())
  name             String
  phone            String
  email            String?
  city             String?
  country          String?
  tellerBackground String?
  storyBackground  String?
  title            String?
  content          String
  language         String
  verifiedPhone    Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
````

## 🚀 Local Development

```bash
# Clone repo
git clone https://github.com/your-org/stories-collector.git
cd stories-collector

# Install dependencies
npm install

# Run dev servers
npm run dev       # frontend + backend
npm run dev:otp   # if OTP logic is in separate module

# Run tests
npm test
```

## ⚙️ Environment Variables

```env
# Database connection
DATABASE_URL="postgres://user:password@host:5432/dbname"

# Public base URL (frontend)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# TextBee API configuration
TEXTBEE_API_KEY=your_textbee_api_key
TEXTBEE_BASE_URL=https://api.textbee.dev/api/v1
TEXTBEE_DEVICE_ID=your_textbee_device_id  # the Android device ID registered in TextBee

# OTP / verification
OTP_CODE_TTL_SECONDS=300     # e.g. 300 seconds (5 min)
OTP_MAX_ATTEMPTS=5           # optional: max tries per request

# Redis (for OTP state, if using Redis)
REDIS_URL=redis://localhost:6379
```

### 🔑 Notes on TextBee

* TextBee is an open-source SMS gateway that lets you turn an Android device into an SMS sending gateway via a REST API. ([TextBee][1])
* To send SMS, make a REST call like:

  ```js
  await axios.post(
    `${TEXTBEE_BASE_URL}/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
    {
      recipients: ["+1234567890"],
      message: "Your OTP is 123456"
    },
    {
      headers: {
        "x-api-key": TEXTBEE_API_KEY
      }
    }
  );
  ```
* You’ll need to register a device (your Android phone) in your TextBee dashboard, get its `device_id` and your `api_key`.([TextBee][1])

## 🪄 Keywords / Hotwords

`i18n`, `RTL`, `OTP`, `E164`, `rate_limit`, `sanitization`, `XSS`, `CSRF`, `short_lived_token`,
`prisma_migration`, `docker_compose`, `CI_CD`, `e2e_tests`, `accessibility`, `ssr`, `paginated_cursor`

## 📜 License

MIT License