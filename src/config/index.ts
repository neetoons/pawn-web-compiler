import path from 'path';

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    PATHS: {
        COMPILER: path.join(process.cwd(), '..', 'compiler'),
        UPLOADS: path.join(process.cwd(), '..', 'uploads'),
        OUTPUT: path.join(process.cwd(), '..', 'output'),
    },
    FILE_LIMITS: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
    }
};