import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { generateQrCodeBase64 } from "./qrcode.service";

const COLLECTION = "certificates";

export interface IssueCertificateInput {
  studentName: string;
  courseName: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface IssueCertificateResult {
  uuid: string;
  validationUrl: string;
  qrCodeBase64: string;
}

export type CertificateStatus = "valid" | "revoked" | "expired" | "not_found";

export interface CertificateValidationResult {
  status: CertificateStatus;
  message?: string;
  studentName?: string;
  courseName?: string;
  issuedBy?: string;
  issuedAt?: string;
  expiresAt?: string | null;
}

export async function issueCertificate(
  input: IssueCertificateInput
): Promise<IssueCertificateResult> {
  const uuid = uuidv4();
  const validationBaseUrl =
    process.env.VALIDATION_BASE_URL ?? "https://cert-validator-ff.web.app";
  const validationUrl = `${validationBaseUrl}/validar/${uuid}`;

  const qrCodeBase64 = await generateQrCodeBase64(validationUrl);

  const db = getFirestore();
  await db.collection(COLLECTION).doc(uuid).set({
    uuid,
    studentName: input.studentName,
    courseName: input.courseName,
    issuedBy: input.issuedBy,
    issuedAt: Timestamp.fromDate(new Date(input.issuedAt)),
    expiresAt: input.expiresAt
      ? Timestamp.fromDate(new Date(input.expiresAt))
      : null,
    isActive: true,
    templateId: null,
  });

  return { uuid, validationUrl, qrCodeBase64 };
}

export async function validateCertificate(
  uuid: string
): Promise<CertificateValidationResult> {
  const db = getFirestore();
  const doc = await db.collection(COLLECTION).doc(uuid).get();

  // 1. Documento existe?
  if (!doc.exists) {
    return {
      status: "not_found",
      message: "Certificado não encontrado ou inválido.",
    };
  }

  const data = doc.data()!;

  // 2. isActive === false?
  if (data.isActive === false) {
    return {
      status: "revoked",
      message: "Este certificado foi cancelado pela instituição emissora.",
    };
  }

  // 3. expiresAt < hoje?
  if (data.expiresAt !== null && (data.expiresAt as Timestamp).toDate() < new Date()) {
    return {
      status: "expired",
      studentName: data.studentName,
      courseName: data.courseName,
      issuedBy: data.issuedBy,
      issuedAt: (data.issuedAt as Timestamp).toDate().toISOString(),
      expiresAt: (data.expiresAt as Timestamp).toDate().toISOString(),
    };
  }

  return {
    status: "valid",
    studentName: data.studentName,
    courseName: data.courseName,
    issuedBy: data.issuedBy,
    issuedAt: (data.issuedAt as Timestamp).toDate().toISOString(),
    expiresAt: data.expiresAt
      ? (data.expiresAt as Timestamp).toDate().toISOString()
      : null,
  };
}

export async function getCertificateQr(
  uuid: string
): Promise<{ validationUrl: string; qrCodeBase64: string }> {
  const db = getFirestore();
  const doc = await db.collection(COLLECTION).doc(uuid).get();

  if (!doc.exists) {
    const err = new Error("not_found");
    err.name = "not_found";
    throw err;
  }

  const validationBaseUrl =
    process.env.VALIDATION_BASE_URL ?? "https://cert-validator-ff.web.app";
  const validationUrl = `${validationBaseUrl}/validar/${uuid}`;
  const qrCodeBase64 = await generateQrCodeBase64(validationUrl);

  return { validationUrl, qrCodeBase64 };
}

export async function revokeCertificate(uuid: string): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection(COLLECTION).doc(uuid);
  const doc = await docRef.get();

  if (!doc.exists) {
    const err = new Error("not_found");
    err.name = "not_found";
    throw err;
  }

  await docRef.update({ isActive: false });
}
