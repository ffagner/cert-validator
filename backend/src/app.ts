import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as admin from "firebase-admin";
import { certificatesRouter } from "./routes/certificates.routes";

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use("/api/certificates", certificatesRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor." });
});

export { app };
