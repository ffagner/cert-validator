import { Request, Response, NextFunction } from "express";
import {
  issueCertificate,
  validateCertificate,
  revokeCertificate,
  getCertificateQr,
} from "../services/certificates.service";

export async function postCertificate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { studentName, courseName, courseHours, issuedBy, issuedAt, expiresAt } = req.body;

    if (!studentName || !courseName || !issuedBy || !issuedAt || courseHours === undefined) {
      res.status(400).json({ message: "Campos obrigatórios ausentes: studentName, courseName, courseHours, issuedBy, issuedAt." });
      return;
    }

    const parsedHours = Number(courseHours);
    if (!Number.isInteger(parsedHours) || parsedHours <= 0) {
      res.status(400).json({ message: "courseHours deve ser um número inteiro positivo." });
      return;
    }

    const result = await issueCertificate({
      studentName,
      courseName,
      courseHours: parsedHours,
      issuedBy,
      issuedAt,
      expiresAt,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCertificate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { uuid } = req.params;
    const result = await validateCertificate(uuid);

    if (result.status === "not_found") {
      res.status(404).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCertificateQrCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { uuid } = req.params;
    const result = await getCertificateQr(uuid);
    res.status(200).json(result);
  } catch (err) {
    if ((err as Error).name === "not_found") {
      res.status(404).json({ message: "Certificado não encontrado." });
      return;
    }
    next(err);
  }
}

export async function patchRevokeCertificate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { uuid } = req.params;
    await revokeCertificate(uuid);
    res.status(200).json({ message: "Certificado revogado com sucesso." });
  } catch (err) {
    if ((err as Error).name === "not_found") {
      res.status(404).json({ message: "Certificado não encontrado." });
      return;
    }
    next(err);
  }
}
