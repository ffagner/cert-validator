import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import * as admin from "firebase-admin";
import { certificatesRouter } from "./routes/certificates.routes";
import { companiesRouter } from "./routes/companies.routes";

if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

app.use(cors({ origin: true }));
// Limite de 500KB para suportar upload de logo em base64
app.use(express.json({ limit: "500kb" }));

// Firebase Functions strips the function name from the path.
// Emulator: /us-central1/api/certificates → Express sees /certificates
// Production via Hosting rewrite (/api/** → function "api"): same behavior
app.use("/certificates", certificatesRouter);
app.use("/companies", companiesRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor." });
});

export { app };
