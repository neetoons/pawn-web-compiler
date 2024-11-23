import path from 'path';

export const CONFIG = {
    PORT: process.env.PORT || 3000,
    PATHS: {
        COMPILER: path.join(__dirname, '..', 'compiler'),
        UPLOADS: path.join(__dirname, '..', 'uploads'),
        OUTPUT: path.join(__dirname, '..', 'output'),
    },
    FILE_LIMITS: {
        MAX_SIZE: 100 * 1024 * 1024, // 100MB
    }
};