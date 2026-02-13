type LogLevel = 'info' | 'warn' | 'error';

// Only log info messages if explicitly enabled
const DEBUG_MODE = import.meta.env.VITE_ENABLE_LOGS === 'true';

const formatMessage = (level: LogLevel, message: string, data?: unknown) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return { prefix, message, data };
};

export const logger = {
    info: (message: string, data?: unknown) => {
        // Silenced by default to keep console clean
        if (!DEBUG_MODE) return;

        const { prefix } = formatMessage('info', message, data);
        if (data) console.log(prefix, message, data);
        else console.log(prefix, message);
    },
    warn: (message: string, data?: unknown) => {
        const { prefix } = formatMessage('warn', message, data);
        if (data) console.warn(prefix, message, data);
        else console.warn(prefix, message);
    },
    error: (message: string, error?: unknown) => {
        // We still log errors, but you can comment this out too if you want total silence
        const { prefix } = formatMessage('error', message, error);
        if (error) console.error(prefix, message, error);
        else console.error(prefix, message);
    },
};