/**
 * Validation Middleware using Zod
 * 
 * Provides request validation for Express routes with:
 * - Type-safe validation
 * - Automatic 400 responses for invalid input
 * - Clear error messages
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { formatZodError, isZodError } from './validationSchemas';
import { ApiResponse } from '../types';

/**
 * Validates request body against a Zod schema
 * Returns 400 with validation errors if validation fails
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and parse the request body
      const validated = schema.parse(req.body);
      
      // Replace req.body with validated data (ensures type safety)
      req.body = validated;
      
      next();
    } catch (error) {
      if (isZodError(error)) {
        const errorMessage = formatZodError(error);
        console.log('Validation error:', errorMessage);
        
        const response: ApiResponse = {
          success: false,
          error: errorMessage
        };
        
        res.status(400).json(response);
        return;
      }
      
      // Unexpected error
      console.error('Unexpected validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed'
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Validates request query parameters against a Zod schema
 * Returns 400 with validation errors if validation fails
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and parse the query parameters
      const validated = schema.parse(req.query);
      
      // Replace req.query with validated data
      req.query = validated as any;
      
      next();
    } catch (error) {
      if (isZodError(error)) {
        const errorMessage = formatZodError(error);
        console.log('Query validation error:', errorMessage);
        
        const response: ApiResponse = {
          success: false,
          error: errorMessage
        };
        
        res.status(400).json(response);
        return;
      }
      
      // Unexpected error
      console.error('Unexpected query validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed'
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Validates request parameters against a Zod schema
 * Returns 400 with validation errors if validation fails
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate and parse the route parameters
      const validated = schema.parse(req.params);
      
      // Replace req.params with validated data
      req.params = validated as any;
      
      next();
    } catch (error) {
      if (isZodError(error)) {
        const errorMessage = formatZodError(error);
        console.log('Params validation error:', errorMessage);
        
        const response: ApiResponse = {
          success: false,
          error: errorMessage
        };
        
        res.status(400).json(response);
        return;
      }
      
      // Unexpected error
      console.error('Unexpected params validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed'
      };
      res.status(500).json(response);
    }
  };
}

/**
 * Combines body and query validation
 * Useful for endpoints that use both
 * 
 * @param bodySchema - Schema for request body
 * @param querySchema - Schema for query parameters
 * @returns Express middleware function
 */
export function validateBodyAndQuery<B extends z.ZodType, Q extends z.ZodType>(
  bodySchema: B,
  querySchema: Q
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      const validatedBody = bodySchema.parse(req.body);
      req.body = validatedBody;
      
      // Validate query
      const validatedQuery = querySchema.parse(req.query);
      req.query = validatedQuery as any;
      
      next();
    } catch (error) {
      if (isZodError(error)) {
        const errorMessage = formatZodError(error);
        console.log('Combined validation error:', errorMessage);
        
        const response: ApiResponse = {
          success: false,
          error: errorMessage
        };
        
        res.status(400).json(response);
        return;
      }
      
      // Unexpected error
      console.error('Unexpected combined validation error:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed'
      };
      res.status(500).json(response);
    }
  };
}
