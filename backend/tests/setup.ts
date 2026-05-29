jest.mock('../src/utils/mfa', () => ({
  generateMfaSecret: jest.fn(() => ({ secret: 'TESTSECRET', otpauthUrl: 'otpauth://test' })),
  qrDataUrl: jest.fn(async () => 'data:image/png;base64,xx'),
  verifyTotp: jest.fn(async () => true)
}));
