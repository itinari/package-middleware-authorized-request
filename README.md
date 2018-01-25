# middleware-authorized-request

Authorized request express middlewares

These middlewares are used to validate and authorize requests for users.

## Usage

```typescript
import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import {isAuthorizedRequest, requireAuthorizedRequest, bearerParser} from '@itinari/middleware-authorized-request'

const app = express()

app.use(
  isAuthorizedRequest({
    header: 'X-My-Custom-Header-Token',
    parser: bearerParser,
    verify: (token: string) {
      if (token !== 'FOOBAR') {
        return false
      }
      return true
    }
  })
)

app.get('/', requireAuthorizedRequest, (req: Request, res: Response, next: NextFunction) => {
  res.status(200).end()
})
```
