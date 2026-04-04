import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token de autenticação ausente." });
    return;
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    await getAuth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado." });
  }
}
