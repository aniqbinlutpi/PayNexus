import { Request, Response, NextFunction } from 'express';
export interface SecurityRequest extends Request {
    deviceFingerprint?: string;
    riskScore?: number;
    geoLocation?: {
        country: string;
        region: string;
        city: string;
    };
}
export declare const deviceFingerprintMiddleware: (req: SecurityRequest, res: Response, next: NextFunction) => void;
export declare const riskAssessmentMiddleware: (req: SecurityRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const amlComplianceMiddleware: (req: SecurityRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const transactionEncryptionMiddleware: (req: SecurityRequest, res: Response, next: NextFunction) => void;
