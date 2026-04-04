import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware";
import {
  postCertificate,
  getCertificate,
  patchRevokeCertificate,
} from "../controllers/certificates.controller";

export const certificatesRouter = Router();

certificatesRouter.post("/", verifyFirebaseToken, postCertificate);
certificatesRouter.get("/:uuid", getCertificate);
certificatesRouter.patch("/:uuid/revoke", verifyFirebaseToken, patchRevokeCertificate);
