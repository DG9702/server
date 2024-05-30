import { Request, Response, NextFunction } from "express";
import ErrorHandler from '../utils/ErrorHandler'

export const ErrorMiddleware = (err:any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal server error';

    //wrong mongodb id error
    if (err.name === 'CastError') {
        const message = `Resource not found, Invalid: ${err.path}`;

        err = new ErrorHandler(message, 400);
    }

    //Duplicate key error
    if (err.code === 11000) {
        const message = `Duplicte ${Object.keys(err.keyValue)} entered`;

        err = new ErrorHandler(message, 400);
    }

    //wrong jwt error
    if (err.name === 'JsonWebTokenError') {
        const message = 'JsonWebToken is Invalid, try again';
        err = new ErrorHandler(message, 400);
    }

    //JWT expired error
    if (err.name === 'TokenExpiredError') {
        const message = 'JsonWebToken is expired, try again';
        err = new ErrorHandler(message, 400);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })

}