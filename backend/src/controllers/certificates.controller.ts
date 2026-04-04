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
    const { studentName, courseName, courseHours, issuedBy, issuedByCnpj, issuedAt, expiresAt } = req.body;

    if (!studentName || !courseName || !issuedBy || !issuedByCnpj || !issuedAt || courseHours === undefined) {
      res.status(400).json({ message: "Campos obrigatórios ausentes: studentName, courseName, courseHours, issuedBy, issuedByCnpj, issuedAt." });
      return;
    }

    const parsedHours = Number(courseHours);
    if (!Number.isInteger(parsedHours) || parsedHours <= 0) {
      res.status(400).json({ message: "courseHours deve ser um número inteiro positivo." });
      return;
    }

    // Aceita CNPJ com ou sem formatação (XX.XXX.XXX/XXXX-XX ou 14 dígitos)
    const cnpjDigits = String(issuedByCnpj).replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      res.status(400).json({ message: "issuedByCnpj deve conter 14 dígitos." });
      return;
    }
    const formattedCnpj = cnpjDigits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );

    const result = await issueCertificate({
      studentName,
      courseName,
      courseHours: parsedHours,
      issuedBy,
      issuedByCnpj: formattedCnpj,
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
