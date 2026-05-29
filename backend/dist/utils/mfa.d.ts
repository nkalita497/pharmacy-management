export declare function generateMfaSecret(username: string): {
    secret: string;
    otpauthUrl: string;
};
export declare function qrDataUrl(otpauthUrl: string): Promise<string>;
export declare function verifyTotp(secret: string, token: string): Promise<boolean>;
//# sourceMappingURL=mfa.d.ts.map