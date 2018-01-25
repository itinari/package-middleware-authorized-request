import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import {expect} from 'chai'

chai.use(chaiAsPromised)

import {Unauthorized, BadRequest} from '@itinari/lib-http-status'
import {
  isAuthorizedRequest,
  requireAuthorizedRequest,
  defaultParser,
  bearerParser,
} from '.'

describe('Authorized Request', () => {
  describe('DefaultParser', () => {
    it('should return input as output', () => {
      expect(defaultParser('header', 'value')).equals('value')
    })
  })

  describe('BearerParser', () => {
    it('should return token', () => {
      expect(bearerParser('Authorization', 'Bearer test-token')).equals(
        'test-token'
      )
    })

    it('should be case insensitive', () => {
      expect(bearerParser('Authorization', 'bearer test-token')).equals(
        'test-token'
      )
    })

    it('should throw BadRequest -- empty value', () => {
      expect(() => bearerParser('Authorization', '')).throws(
        BadRequest,
        'Authorization: String or non-empty value expected.'
      )
    })

    it('should throw BadRequest -- malformed value - giberrish', () => {
      expect(() => bearerParser('Authorization', 'non-valid-value')).throws(
        BadRequest,
        'Authorization: "Bearer [token]" format expected.'
      )
    })

    it('should throw BadRequest -- malformed value - wrong key', () => {
      expect(() => bearerParser('Authorization', 'NonBearer token')).throws(
        BadRequest,
        'Authorization: "Bearer [token]" format expected.'
      )
    })

    it('should throw BadRequest -- malformed value - missing token', () => {
      expect(() => bearerParser('Authorization', 'Bearer')).throws(
        BadRequest,
        'Authorization: "Bearer [token]" format expected.'
      )
    })

    it('should throw BadRequest -- malformed value - empty token', () => {
      expect(() => bearerParser('Authorization', 'Bearer ')).throws(
        BadRequest,
        'Authorization: "Bearer [token]" format expected.'
      )
    })
  })

  describe('isAuthorizedRequest', () => {
    it('should be a middleware factory', () => {
      const options = {
        header: 'X-Test',
        verify: () => true,
      }

      expect(isAuthorizedRequest).a('function')
      expect(isAuthorizedRequest.length).equals(1)
      expect(isAuthorizedRequest(options)).a('function')
      expect(isAuthorizedRequest(options).length).equals(3)
    })

    it('should set req.ctx.authorizedRequest to false -- no header set', () => {
      const options = {
        header: 'X-Test',
        verify: () => true,
      }

      const req: any = {
        header: () => {
          return undefined
        },
      }

      return new Promise((resolve, reject) => {
        isAuthorizedRequest(options)(req, null, (error) => {
          if (error) {
            return reject(error)
          }

          expect(req).haveOwnProperty('ctx')
          expect(req.ctx.authorizedRequest).equals(false)
          expect(req.ctx.authorizationToken).equals(null)
          expect(req.ctx.authorizationPayload).equals(null)
          resolve()
        })
      })
    })

    it('should set req.ctx.authorizedRequest to false -- parser returns falsy value', () => {
      const options = {
        header: 'X-Test',
        parser: () => '',
        verify: () => true,
      }

      const req: any = {
        header: () => {
          return 'test-token'
        },
      }

      return new Promise((resolve, reject) => {
        isAuthorizedRequest(options)(req, null, (error) => {
          if (error) {
            return reject(error)
          }

          expect(req).haveOwnProperty('ctx')
          expect(req.ctx.authorizedRequest).equals(false)
          expect(req.ctx.authorizationToken).equals(null)
          expect(req.ctx.authorizationPayload).equals(null)
          resolve()
        })
      })
    })

    it('should set req.ctx.authorizedRequest to false -- not verified', () => {
      const options = {
        header: 'X-Test',
        verify: () => false,
      }

      const req: any = {
        header: () => {
          return 'test'
        },
      }

      return new Promise((resolve, reject) => {
        isAuthorizedRequest(options)(req, null, (error) => {
          if (error) {
            return reject(error)
          }

          expect(req).haveOwnProperty('ctx')
          expect(req.ctx.authorizedRequest).equals(false)
          expect(req.ctx.authorizationToken).equals(null)
          expect(req.ctx.authorizationPayload).equals(null)
          resolve()
        })
      })
    })

    it('should set req.ctx.authorizedRequest to true -- verified', () => {
      const options = {
        header: 'X-Test',
        verify: () => true,
      }

      const req: any = {
        header: () => {
          return 'test'
        },
      }

      return new Promise((resolve, reject) => {
        isAuthorizedRequest(options)(req, null, (error) => {
          if (error) {
            return reject(error)
          }

          expect(req).haveOwnProperty('ctx')
          expect(req.ctx.authorizedRequest).equals(true)
          expect(req.ctx.authorizationToken).equals('test')
          expect(req.ctx.authorizationPayload).equals(null)
          resolve()
        })
      })
    })

    it('should set req.ctx.authorizedRequest to true with payload -- verified', () => {
      const options = {
        header: 'X-Test',
        verify: () => ({foo: 'bar'}),
      }

      const req: any = {
        header: () => {
          return 'test'
        },
      }

      return new Promise((resolve, reject) => {
        isAuthorizedRequest(options)(req, null, (error) => {
          if (error) {
            return reject(error)
          }

          expect(req).haveOwnProperty('ctx')
          expect(req.ctx.authorizedRequest).equals(true)
          expect(req.ctx.authorizationToken).equals('test')
          expect(req.ctx.authorizationPayload).deep.equals({foo: 'bar'})
          resolve()
        })
      })
    })

    it('should call next with verify thrown error', () => {
      const options = {
        header: 'X-Test',
        verify: () => {
          throw new Error('verify-throw')
        },
      }

      const req: any = {
        header: () => {
          return 'test-token-throw'
        },
      }

      const promise = new Promise((resolve, reject) => {
        isAuthorizedRequest(options)(req, null, (error) => {
          if (error) {
            return reject(error)
          }
          resolve()
        })
      })

      return expect(promise).rejectedWith(Error, 'verify-throw')
    })
  })

  describe('requireAuthorizedRequest', () => {
    it('should call next with error Unauthorized -- req.ctx.authorizedRequest = false', () => {
      const req: any = {
        ctx: {
          authorizedRequest: false,
        },
      }

      const promise = new Promise((resolve, reject) => {
        requireAuthorizedRequest(req, null, (error) => {
          if (error) {
            return reject(error)
          }
          return resolve()
        })
      })

      return expect(promise).rejectedWith(Unauthorized)
    })

    it('should call next without error -- req.ctx.authorizedRequest = true', () => {
      const req: any = {
        ctx: {
          authorizedRequest: true,
        },
      }

      const promise = new Promise((resolve, reject) => {
        requireAuthorizedRequest(req, null, (error) => {
          if (error) {
            return reject(error)
          }
          return resolve()
        })
      })

      return expect(promise).fulfilled
    })
  })
})
