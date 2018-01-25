import {Request, Response, NextFunction} from 'express'
import {Unauthorized, BadRequest} from '@itinari/lib-http-status'

declare module 'express' {
  interface RequestContext {
    authorizedRequest: boolean
    authorizationToken: string
    authorizationPayload: any
  }

  interface Request {
    ctx: RequestContext
  }
}

export interface VerifyFunction {
  (token: string): void | boolean | object | Promise<void | boolean | object>
}

export interface ParseHeaderFunction {
  (header: string, value: string): string | Promise<string>
}

export interface Options {
  header: string
  parser?: ParseHeaderFunction
  verify: VerifyFunction
}

export function defaultParser(_header: string, value: string): string {
  return value
}

export function bearerParser(header: string, value: string): string {
  if (typeof value !== 'string' || value.length <= 0) {
    throw new BadRequest(`${header}: String or non-empty value expected.`)
  }

  const parts = value.split(' ')
  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== 'bearer' ||
    parts[1].length <= 0
  ) {
    throw new BadRequest(`${header}: "Bearer [token]" format expected.`)
  }

  return parts[1]
}

export function isAuthorizedRequest(options: Options) {
  options.parser = options.parser || defaultParser

  return async function(req: Request, _res: Response, next: NextFunction) {
    try {
      req.ctx = Object.assign(
        {
          authorizedRequest: false,
          authorizationToken: null,
          authorizationPayload: null,
        },
        req.ctx
      )

      const headerValue = req.header(options.header)
      if (!headerValue) {
        return next()
      }

      const token = await options.parser(options.header, headerValue)
      if (!token) {
        return next()
      }

      const payload = await options.verify(token)
      const isAuthorized = !!payload || false
      req.ctx.authorizedRequest = isAuthorized

      if (isAuthorized) {
        req.ctx.authorizationToken = token
        if (typeof payload === 'object') {
          req.ctx.authorizationPayload = payload
        }
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export function requireAuthorizedRequest(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.ctx.authorizedRequest === false) {
    return next(new Unauthorized('Authorization required.'))
  }
  return next()
}
