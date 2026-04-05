import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware";
import {
  getCertificates,
  postCertificate,
  getCertificate,
  getCertificateQrCode,
  patchRevokeCertificate,
} from "../controllers/certificates.controller";

export const certificatesRouter = Router();

certificatesRouter.get("/", verifyFirebaseToken, getCertificates);
certificatesRouter.post("/", verifyFirebaseToken, postCertificate);
certificatesRouter.get("/:uuid", getCertificate);
certificatesRouter.get("/:uuid/qr", verifyFirebaseToken, getCertificateQrCode);
certificatesRouter.patch("/:uuid/revoke", verifyFirebaseToken, patchRevokeCertificate);
