export interface CompileResponse {
    message: string;
    downloadLink: string;
}

export interface CompileError extends Error {
    statusCode?: number;
}