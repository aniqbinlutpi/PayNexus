import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<{
    log: ("error" | "warn" | "info" | "query")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
