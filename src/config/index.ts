import path from 'path';

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    PATHS: {
        COMPILER: path.join('src/compiler'),
        UPLOADS: path.join('src/uploads'),
        OUTPUT: path.join('src/output'),
    },
    FILE_LIMITS: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
    }
};