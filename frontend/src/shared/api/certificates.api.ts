import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import QRCode from "qrcode";
import { db, auth } from "../../app/firebase";

export interface IssueCertificatePayload {
  studentName: string;
  courseName: string;
  courseHours: number;
  issuedBy: string;
  issuedByCnpj: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface IssueCertificateResponse {
  uuid: string;
  validationUrl: string;
  qrCodeBase64: string;
}

export interface CertificateValidationResponse {
  status: "valid" | "revoked" | "expired" | "not_found";
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

export interface Company {
  cnpj: string;
  name: string;
  logoBase64: string | null;
}

const CERTIFICATES_COLLECTION = "certificates";
const COMPANIES_COLLECTION = "companies";

function requireAuth(): void {
  if (!auth.currentUser) {
    throw new Error("Usuário não autenticado.");
  }
}

function cnpjToKey(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

function formatCnpj(cnpj: string): string {
  const digits = cnpjToKey(cnpj);
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }
  return null;
}

export async function listCertificates(): Promise<CertificateListItem[]> {
  requireAuth();
  const q = query(
    collection(db, CERTIFICATES_COLLECTION),
    orderBy("issuedAt", "desc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      uuid: data.uuid ?? docSnap.id,
      studentName: data.studentName,
      courseName: data.courseName,
      courseHours: data.courseHours,
      issuedBy: data.issuedBy,
      issuedByCnpj: data.issuedByCnpj,
      issuedAt: timestampToIso(data.issuedAt) ?? "",
      expiresAt: timestampToIso(data.expiresAt),
      isActive: data.isActive ?? true,
    };
  });
}

export async function issueCertificate(
  payload: IssueCertificatePayload
): Promise<IssueCertificateResponse> {
  requireAuth();

  const uuid = crypto.randomUUID();
  const validationBaseUrl = window.location.origin;
  const validationUrl = `${validationBaseUrl}/validar/${uuid}`;
  const qrCodeBase64 = await QRCode.toDataURL(validationUrl, {
    errorCorrectionLevel: "M",
    width: 400,
    margin: 2,
  });

  const formattedCnpj = formatCnpj(payload.issuedByCnpj);
  const companyKey = cnpjToKey(payload.issuedByCnpj);

  // Registra ou atualiza empresa sem sobrescrever logo existente
  if (companyKey) {
    await setDoc(
      doc(db, COMPANIES_COLLECTION, companyKey),
      { cnpj: formattedCnpj, name: payload.issuedBy },
      { merge: true }
    );
  }

  // Grava certificado
  await setDoc(doc(db, CERTIFICATES_COLLECTION, uuid), {
    uuid,
    studentName: payload.studentName,
    courseName: payload.courseName,
    courseHours: Number(payload.courseHours),
    issuedBy: payload.issuedBy,
    issuedByCnpj: formattedCnpj,
    issuedAt: Timestamp.fromDate(new Date(payload.issuedAt + "T12:00:00Z")),
    expiresAt: payload.expiresAt
      ? Timestamp.fromDate(new Date(payload.expiresAt + "T12:00:00Z"))
      : null,
    isActive: true,
    templateId: null,
  });

  return { uuid, validationUrl, qrCodeBase64 };
}

export async function getCertificate(
  uuid: string
): Promise<CertificateValidationResponse> {
  // Acesso público para validação
  const docRef = doc(db, CERTIFICATES_COLLECTION, uuid);
  const docSnap = await getDoc(docRef);

  // 1. Documento existe?
  if (!docSnap.exists()) {
    return {
      status: "not_found",
      message: "Certificado não encontrado ou inválido.",
    };
  }

  const data = docSnap.data();

  // 2. isActive === false?
  if (data.isActive === false) {
    return {
      status: "revoked",
      message: "Este certificado foi cancelado pela instituição emissora.",
    };
  }

  // Busca logo da empresa
  let logoBase64: string | null = null;
  if (data.issuedByCnpj) {
    const compKey = cnpjToKey(data.issuedByCnpj);
    const compSnap = await getDoc(doc(db, COMPANIES_COLLECTION, compKey));
    if (compSnap.exists()) {
      logoBase64 = compSnap.data().logoBase64 ?? null;
    }
  }

  const issuedAtIso = timestampToIso(data.issuedAt);
  const expiresAtIso = timestampToIso(data.expiresAt);

  // 3. expiresAt < hoje?
  if (data.expiresAt) {
    const expDate =
      data.expiresAt instanceof Timestamp
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt);
    if (expDate < new Date()) {
      return {
        status: "expired",
        studentName: data.studentName,
        courseName: data.courseName,
        courseHours: data.courseHours,
        issuedBy: data.issuedBy,
        issuedByCnpj: data.issuedByCnpj,
        issuedAt: issuedAtIso ?? undefined,
        expiresAt: expiresAtIso,
        logoBase64,
      };
    }
  }

  return {
    status: "valid",
    studentName: data.studentName,
    courseName: data.courseName,
    courseHours: data.courseHours,
    issuedBy: data.issuedBy,
    issuedByCnpj: data.issuedByCnpj,
    issuedAt: issuedAtIso ?? undefined,
    expiresAt: expiresAtIso,
    logoBase64,
  };
}

export async function getCertificateQr(
  uuid: string
): Promise<{ validationUrl: string; qrCodeBase64: string }> {
  requireAuth();
  const docRef = doc(db, CERTIFICATES_COLLECTION, uuid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Certificado não encontrado.");
  }

  const validationBaseUrl = window.location.origin;
  const validationUrl = `${validationBaseUrl}/validar/${uuid}`;
  const qrCodeBase64 = await QRCode.toDataURL(validationUrl, {
    errorCorrectionLevel: "M",
    width: 400,
    margin: 2,
  });

  return { validationUrl, qrCodeBase64 };
}

export async function revokeCertificate(uuid: string): Promise<void> {
  requireAuth();
  const docRef = doc(db, CERTIFICATES_COLLECTION, uuid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Certificado não encontrado.");
  }

  await updateDoc(docRef, { isActive: false });
}

export async function listCompanies(): Promise<Company[]> {
  requireAuth();
  const q = query(collection(db, COMPANIES_COLLECTION), orderBy("name"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      cnpj: data.cnpj,
      name: data.name,
      logoBase64: data.logoBase64 ?? null,
    };
  });
}

export async function getCompanyByCnpj(cnpj: string): Promise<Company | null> {
  requireAuth();
  const key = cnpjToKey(cnpj);
  const docSnap = await getDoc(doc(db, COMPANIES_COLLECTION, key));
  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    cnpj: data.cnpj,
    name: data.name,
    logoBase64: data.logoBase64 ?? null,
  };
}

export async function updateCompanyLogo(
  cnpj: string,
  logoBase64: string
): Promise<void> {
  requireAuth();
  if (!logoBase64.match(/^data:image\/(png|jpeg);base64,/)) {
    throw new Error("Formato inválido. Envie PNG ou JPEG em base64.");
  }
  if (logoBase64.length > 409600) {
    throw new Error("Imagem muito grande. Máximo: 300KB.");
  }

  const key = cnpjToKey(cnpj);
  const docRef = doc(db, COMPANIES_COLLECTION, key);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Empresa não encontrada.");
  }

  await updateDoc(docRef, { logoBase64 });
}
