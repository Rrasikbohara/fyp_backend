const helmet = require('helmet');

const securityHeaders = [
    helmet(),
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.khalti.com"], // Add other API domains
            frameSrc: ["'self'"],
            objectSrc: ["'none'"]
        }
    }),
    helmet.referrerPolicy({ policy: 'same-origin' })
];

module.exports = securityHeaders; 