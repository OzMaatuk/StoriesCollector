# Testing Guide

This document explains the testing strategy and how to run different types of tests.

## Test Environment Strategy

### Environment Files

- **`.env`** - Development environment (not in git)
- **`.env.test`** - Local testing environment (not in git, create from .env.example)  
- **`.env.example`** - Example configuration (in git)

### Test Types

1. **Unit Tests** - Mock external services, fast execution
2. **Integration Tests** - Test with real database, mocked external services
3. **E2E Tests (Core)** - Test UI flows without external OTP service
4. **E2E Tests (OTP)** - Test with real external OTP service (local only)

## Running Tests

### Local Development

```bash
# Run all unit and integration tests
npm test

# Run all tests including OTP E2E (requires external OTP service)
npm run test:all

# Run only unit tests with coverage
npm run test:coverage

# Run only E2E tests (excluding OTP)
npm run test:e2e:no-otp

# Run only OTP E2E tests (requires external service)
npm run test:e2e:otp-only

# Run E2E tests with UI
npm run test:e2e:ui
```

### CI/CD Pipeline

```bash
# What CI runs (no external dependencies)
npm run test:ci
```

This runs:
1. Unit tests (mocked external services)
2. Integration tests (real database, mocked external services)
3. E2E tests (excluding OTP integration tests)

## OTP E2E Testing

### Local Setup

1. **Create .env.test file**:
   ```bash
   # Copy the testing section from .env.example to .env.test
   cp .env.example .env.test
   # Then edit .env.test with your test configuration
   ```

2. **Start External OTP Service**:
   ```bash
   # Your external OTP service should be running on the configured URL
   # Default: http://localhost:3000
   ```

3. **Configure .env.test**:
   ```bash
   DATABASE_URL="postgresql://test_user:test_pass@localhost:5432/test_db?schema=public"
   OTP_SERVICE_URL=http://localhost:3000
   RUN_OTP_E2E=true
   TEST_OTP_CODE=123456  # If your service supports test codes
   JWT_SECRET=test-jwt-secret-32chars-for-testing-only
   ```

3. **Run OTP Tests**:
   ```bash
   npm run test:e2e:otp-only
   ```

### CI Behavior

- **OTP E2E tests are automatically skipped in CI** unless `RUN_OTP_E2E=true` is set
- This prevents CI failures when external OTP service is not available
- CI focuses on testing application logic with mocked external services

## Test Configuration

### Unit Tests (Jest)

- **Location**: `tests/unit/`
- **Mocks**: `fetch` is globally mocked
- **Environment**: Uses `.env.test` values
- **External Services**: All mocked, no real HTTP calls

### Integration Tests (Jest)

- **Location**: `tests/integration/`
- **Database**: Real PostgreSQL connection
- **External Services**: Mocked
- **Environment**: Uses test database from `.env.test`

### E2E Tests (Playwright)

#### Core E2E Tests
- **Location**: `tests/e2e/` (excluding `otp-integration.spec.ts`)
- **Scope**: UI flows, form validation, language switching
- **External Services**: Not used

#### OTP E2E Tests
- **Location**: `tests/e2e/otp-integration.spec.ts`
- **Scope**: Real OTP service integration
- **Requirements**: External OTP service must be running
- **Local Only**: Skipped in CI by default

## Environment Variables

### Setup Instructions
1. **Create environment files**:
   ```bash
   # Copy example to create your local files
   cp .env.example .env
   cp .env.example .env.test
   
   # Edit each file for your specific environment
   ```

### Required for All Tests (.env.test)
```bash
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/test_db
JWT_SECRET=test-jwt-secret-32chars-for-testing-only
```

### Required for OTP E2E Tests (.env.test)
```bash
OTP_SERVICE_URL=http://localhost:3000
RUN_OTP_E2E=true
TEST_OTP_CODE=123456  # Optional, for services with test mode
```

### CI Environment
```bash
CI=true  # Automatically skips OTP E2E tests
NODE_ENV=test
```

## Best Practices

1. **Unit Tests**: Mock all external dependencies
2. **Integration Tests**: Use real database, mock external services
3. **E2E Tests**: Test real user flows
4. **OTP E2E Tests**: Only run when external service is available
5. **CI Tests**: Must be self-contained and fast

## Troubleshooting

### OTP E2E Tests Failing Locally
1. Ensure external OTP service is running
2. Check `OTP_SERVICE_URL` in `.env.test`
3. Verify service responds to `/otp/send` and `/otp/verify`

### CI Tests Failing
1. Check that no tests depend on external services
2. Verify all `fetch` calls are properly mocked
3. Ensure database migrations run successfully

### Environment Issues
1. **Create local environment files**:
   ```bash
   cp .env.example .env
   cp .env.example .env.test
   ```
2. Update values for your local setup
3. **Never commit `.env` or `.env.test` files** - they are in `.gitignore`
4. Only commit changes to `.env.example` when adding new configuration options