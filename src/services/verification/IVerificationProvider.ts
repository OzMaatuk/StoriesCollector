export interface IVerificationProvider {
  /**
   * Request a verification code for the given phone number
   * @param phone E.164 formatted phone number
   * @returns Promise that resolves when code is sent
   */
  requestCode(phone: string): Promise<void>;

  /**
   * Verify the code for the given phone number
   * @param phone E.164 formatted phone number
   * @param code Verification code
   * @returns Promise that resolves to true if verification succeeds
   */
  verifyCode(phone: string, code: string): Promise<boolean>;
}