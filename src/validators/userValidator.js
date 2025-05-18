const Joi = require('joi');

const userValidationSchema = {
    signup: Joi.object({
        name: Joi.string().required().min(2).max(50),
        email: Joi.string().email().required(),
        phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).required(),
        password: Joi.string().min(6).required()
    }),

    signin: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    })
};

module.exports = userValidationSchema; 