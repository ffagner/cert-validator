import { Request, Response, NextFunction } from "express";
import {
  listCompanies,
  getCompany,
  updateCompanyLogo,
} from "../services/companies.service";

export async function getCompanies(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companies = await listCompanies();
    res.status(200).json(companies);
  } catch (err) {
    next(err);
  }
}

export async function getCompanyByCnpj(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const company = await getCompany(req.params.cnpj);
    if (!company) {
      res.status(404).json({ message: "Empresa não encontrada." });
      return;
    }
    res.status(200).json(company);
  } catch (err) {
    next(err);
  }
}

export async function putCompanyLogo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { logoBase64 } = req.body;
    if (!logoBase64 || typeof logoBase64 !== "string") {
      res.status(400).json({ message: "Campo logoBase64 é obrigatório." });
      return;
    }
    await updateCompanyLogo(req.params.cnpj, logoBase64);
    res.status(200).json({ message: "Logo atualizada com sucesso." });
  } catch (err) {
    if ((err as Error).name === "validation_error") {
      res.status(400).json({ message: (err as Error).message });
      return;
    }
    if ((err as Error).name === "not_found") {
      res.status(404).json({ message: (err as Error).message });
      return;
    }
    next(err);
  }
}
