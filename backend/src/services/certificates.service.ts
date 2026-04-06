import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { generateQrCodeBase64 } from "./qrcode.service";
import { getCompany, upsertCompany } from "./companies.service";

const COLLECTION = "certificates";

export interface IssueCertificateInput {
  studentName: string;
  courseName: string;
  courseHours: number;
  issuedBy: string;
  issuedByCnpj: string;
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
  courseHours?: number;
  issuedBy?: string;
  issuedByCnpj?: string;
  issuedAt?: string;
  expiresAt?: string | null;
  logoBase64?: string | null;
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

  // Registra/atualiza a empresa sem sobrescrever logo existente
  await upsertCompany(input.issuedByCnpj, input.issuedBy);

  await db.collection(COLLECTION).doc(uuid).set({
    uuid,
    studentName: input.studentName,
    courseName: input.courseName,
    courseHours: input.courseHours,
    issuedBy: input.issuedBy,
    issuedByCnpj: input.issuedByCnpj,
    // "T12:00:00Z" evita que datas no formato YYYY-MM-DD sejam interpretadas
    // como meia-noite UTC e recuem um dia em fusos negativos (ex: UTC-3)
    issuedAt: Timestamp.fromDate(new Date(input.issuedAt + "T12:00:00Z")),
    expiresAt: input.expiresAt
      ? Timestamp.fromDate(new Date(input.expiresAt + "T12:00:00Z"))
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

  // Busca logo da empresa emissora pelo CNPJ do certificado
  const company = await getCompany(data.issuedByCnpj);
  const logoBase64 = company?.logoBase64 ?? null;

  // 3. expiresAt < hoje?
  if (data.expiresAt !== null && (data.expiresAt as Timestamp).toDate() < new Date()) {
    return {
      status: "expired",
      studentName: data.studentName,
      courseName: data.courseName,
      courseHours: data.courseHours,
      issuedBy: data.issuedBy,
      issuedByCnpj: data.issuedByCnpj,
      issuedAt: (data.issuedAt as Timestamp).toDate().toISOString(),
      expiresAt: (data.expiresAt as Timestamp).toDate().toISOString(),
      logoBase64,
    };
  }

  return {
    status: "valid",
    studentName: data.studentName,
    courseName: data.courseName,
    courseHours: data.courseHours,
    issuedBy: data.issuedBy,
    issuedByCnpj: data.issuedByCnpj,
    issuedAt: (data.issuedAt as Timestamp).toDate().toISOString(),
    expiresAt: data.expiresAt
      ? (data.expiresAt as Timestamp).toDate().toISOString()
      : null,
    logoBase64,
  };
}

export interface CertificateListItem {
  uuid: string;
  studentName: string;
  courseName: string;
  courseHours: number;
  issuedBy: string;
  issuedByCnpj: string;
  issuedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export async function listCertificates(): Promise<CertificateListItem[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection(COLLECTION)
    .orderBy("issuedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      uuid: data.uuid,
      studentName: data.studentName,
      courseName: data.courseName,
      courseHours: data.courseHours,
      issuedBy: data.issuedBy,
      issuedByCnpj: data.issuedByCnpj,
      issuedAt: (data.issuedAt as Timestamp).toDate().toISOString(),
      expiresAt: data.expiresAt
        ? (data.expiresAt as Timestamp).toDate().toISOString()
        : null,
      isActive: data.isActive,
    };
  });
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
