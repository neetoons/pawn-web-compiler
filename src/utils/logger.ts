// @ts-nocheck
import winston from 'winston';
import chalk from 'chalk';

const consoleFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let emoji = '📝';
    let color = chalk.blue;

    switch (level) {
        case 'error':
            emoji = '❌';
            color = chalk.red;
            break;
        case 'warn':
            emoji = '⚠️';
            color = chalk.yellow;
            break;
        case 'success':
            emoji = '✅';
            color = chalk.green;
            break;
    }

    const meta = Object.keys(metadata).length
        ? `\n${JSON.stringify(metadata, null, 2)}`
        : '';

    const time = new Date(timestamp).toLocaleTimeString();

    return color(`${emoji} ${time} - ${message}${meta}`);
});

export const logger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        success: 2,
        info: 3,
    },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                consoleFormat
            )
        }),
        new winston.transports.File({
            filename: 'logs/compiler.log'
        })
    ]
});