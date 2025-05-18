module.exports = {
    AUTH: {
        SALT_ROUNDS: 10,
        TOKEN_EXPIRY: '1d',
        REFRESH_TOKEN_EXPIRY: '7d'
    },
    RATE_LIMITS: {
        AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        AUTH_MAX_REQUESTS: 5,
        API_WINDOW_MS: 15 * 60 * 1000,
        API_MAX_REQUESTS: 100
    },
    CORS: {
        ALLOWED_ORIGINS: [
            'http://localhost:5173',
            
        ]
    },
    VALIDATION: {
        PASSWORD_MIN_LENGTH: 6,
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 50
    }
}; 