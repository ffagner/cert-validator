import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.middleware";
import {
  getCompanies,
  getCompanyByCnpj,
  putCompanyLogo,
} from "../controllers/companies.controller";

export const companiesRouter = Router();

companiesRouter.get("/", verifyFirebaseToken, getCompanies);
companiesRouter.get("/:cnpj", verifyFirebaseToken, getCompanyByCnpj);
companiesRouter.put("/:cnpj/logo", verifyFirebaseToken, putCompanyLogo);
