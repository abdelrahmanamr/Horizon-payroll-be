import { Request, Response, NextFunction } from "express";

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ error: "API key missing" });
  }

  if (apiKey !== process.env.PAYROLL_API_KEY) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};
