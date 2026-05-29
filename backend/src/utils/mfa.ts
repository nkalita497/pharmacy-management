import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

export function generateMfaSecret(username: string): { secret: string; otpauthUrl: string } {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: 'PharmaCore',
    label: username,
    secret
  });
  return { secret, otpauthUrl };
}

export async function qrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const result = await verify({ secret, token: String(token).replace(/\s/g, '') });
  return result.valid;
}
