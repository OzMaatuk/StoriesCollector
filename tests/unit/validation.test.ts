import { storySchema, verificationRequestSchema, verificationVerifySchema } from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('storySchema', () => {
    it('should validate a complete valid story', () => {
      const validStory = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        city: 'New York',
        country: 'USA',
        tellerBackground: 'A brief background',
        storyBackground: 'Story context',
        title: 'My Story',
        content: 'This is my story content with at least 10 characters.',
        language: 'en',
      };

      const result = storySchema.safeParse(validStory);
      expect(result.success).toBe(true);
    });

    it('should validate a minimal valid story', () => {
      const minimalStory = {
        name: 'John Doe',
        phone: '+1234567890',
        content: 'This is my story.',
        language: 'en',
      };

      const result = storySchema.safeParse(minimalStory);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const invalidStory = {
        name: 'John Doe',
        phone: '123', // Invalid phone
        content: 'This is my story.',
        language: 'en',
      };

      const result = storySchema.safeParse(invalidStory);
      expect(result.success).toBe(false);
    });

    it('should reject short content', () => {
      const invalidStory = {
        name: 'John Doe',
        phone: '+1234567890',
        content: 'Short', // Too short
        language: 'en',
      };

      const result = storySchema.safeParse(invalidStory);
      expect(result.success).toBe(false);
    });

    it('should reject invalid language', () => {
      const invalidStory = {
        name: 'John Doe',
        phone: '+1234567890',
        content: 'This is my story.',
        language: 'invalid',
      };

      const result = storySchema.safeParse(invalidStory);
      expect(result.success).toBe(false);
    });
  });

  describe('verificationRequestSchema', () => {
    it('should validate valid phone number', () => {
      const result = verificationRequestSchema.safeParse({ phone: '+1234567890' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const result = verificationRequestSchema.safeParse({ phone: '123' });
      expect(result.success).toBe(false);
    });
  });

  describe('verificationVerifySchema', () => {
    it('should validate valid verification data', () => {
      const result = verificationVerifySchema.safeParse({
        phone: '+1234567890',
        code: '123456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid code format', () => {
      const result = verificationVerifySchema.safeParse({
        phone: '+1234567890',
        code: '12345', // Only 5 digits
      });
      expect(result.success).toBe(false);
    });
  });
});
