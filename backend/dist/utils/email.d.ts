export declare function sendNotificationEmail(to: string, subject: string, html: string): Promise<{
    sent: boolean;
    previewUrl?: string;
    error?: string;
}>;
export declare function buildAlertEmail(type: string, details: string): string;
//# sourceMappingURL=email.d.ts.map