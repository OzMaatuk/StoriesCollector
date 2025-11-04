const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function base64UrlDecode(str: string): ArrayBuffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const buffer = Buffer.from(str, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function verifySignature(token: string, secret: string): Promise<boolean> {
  const [headerB64, payloadB64, signatureB64] = token.split('.');
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return crypto.subtle.verify('HMAC', key, signature, data);
}

export async function verifyToken(
  token: string
): Promise<{ recipient: string; channel: string } | null> {
  try {
    const [, payloadB64] = token.split('.');
    const isValid = await verifySignature(token, JWT_SECRET);
    if (!isValid) return null;

    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

    return {
      recipient: decodedPayload.recipient,
      channel: decodedPayload.channel,
    };
  } catch {
    return null;
  }
}
