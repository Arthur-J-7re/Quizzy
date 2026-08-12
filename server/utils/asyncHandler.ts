import type { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 ne rattrape pas les rejets de handlers async : sans ce wrapper, une
// exception dans une route laisse la requête pendante jusqu'au timeout client.
// À retirer le jour où on passera à Express 5, qui le fait nativement.
export default function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
