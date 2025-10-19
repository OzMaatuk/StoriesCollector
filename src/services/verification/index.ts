import { IVerificationProvider } from './IVerificationProvider';
import { NoOpVerificationProvider } from './NoOpVerificationProvider';

// Factory function to get the verification provider
export function getVerificationProvider(): IVerificationProvider {
  // In the future, check env vars and return appropriate provider
  // For now, always return NoOp
  return new NoOpVerificationProvider();
}

export type { IVerificationProvider };