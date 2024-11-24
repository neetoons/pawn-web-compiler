export interface CompileResponse {
    message: string;
    downloadLink: string;
}

export class CompileError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'CompileError';
        this.statusCode = statusCode;
        // Esto es necesario en TypeScript cuando se extiende una clase built-in
        Object.setPrototypeOf(this, CompileError.prototype);
    }
}