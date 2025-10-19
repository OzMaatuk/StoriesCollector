import { IVerificationProvider } from './IVerificationProvider';

export class NoOpVerificationProvider implements IVerificationProvider {
  async requestCode(phone: string): Promise<void> {
    console.log(`[NoOp] Verification code request for ${phone} (not implemented)`);
    // In dev mode, we can simulate success
    if (process.env.NODE_ENV === 'development') {
      console.log('[NoOp] Dev mode: simulating successful code send');
      return Promise.resolve();
    }
    throw new Error('Phone verification not implemented yet');
  }

  async verifyCode(phone: string, code: string): Promise<boolean> {
    console.log(`[NoOp] Verification attempt for ${phone} with code ${code} (not implemented)`);
    // In dev mode, accept code "123456" for testing
    if (process.env.NODE_ENV === 'development' && code === '123456') {
      console.log('[NoOp] Dev mode: accepting test code');
      return true;
    }
    throw new Error('Phone verification not implemented yet');
  }
}