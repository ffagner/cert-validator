import axios from "axios";
import { auth } from "../../app/firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

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

async function getAuthHeader(): Promise<{ Authorization: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
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
  const headers = await getAuthHeader();
  const { data } = await axios.get<CertificateListItem[]>(
    `${API_BASE}/certificates`,
    { headers }
  );
  return data;
}

export async function issueCertificate(
  payload: IssueCertificatePayload
): Promise<IssueCertificateResponse> {
  const headers = await getAuthHeader();
  const { data } = await axios.post<IssueCertificateResponse>(
    `${API_BASE}/certificates`,
    payload,
    { headers }
  );
  return data;
}

export async function getCertificate(
  uuid: string
): Promise<CertificateValidationResponse> {
  const { data } = await axios.get<CertificateValidationResponse>(
    `${API_BASE}/certificates/${uuid}`
  );
  return data;
}

export async function getCertificateQr(
  uuid: string
): Promise<{ validationUrl: string; qrCodeBase64: string }> {
  const headers = await getAuthHeader();
  const { data } = await axios.get<{ validationUrl: string; qrCodeBase64: string }>(
    `${API_BASE}/certificates/${uuid}/qr`,
    { headers }
  );
  return data;
}

export async function revokeCertificate(uuid: string): Promise<void> {
  const headers = await getAuthHeader();
  await axios.patch(`${API_BASE}/certificates/${uuid}/revoke`, {}, { headers });
}

export interface Company {
  cnpj: string;
  name: string;
  logoBase64: string | null;
}

export async function listCompanies(): Promise<Company[]> {
  const headers = await getAuthHeader();
  const { data } = await axios.get<Company[]>(`${API_BASE}/companies`, { headers });
  return data;
}

export async function getCompanyByCnpj(cnpj: string): Promise<Company | null> {
  const headers = await getAuthHeader();
  try {
    const key = cnpj.replace(/\D/g, "");
    const { data } = await axios.get<Company>(`${API_BASE}/companies/${key}`, { headers });
    return data;
  } catch {
    return null;
  }
}

export async function updateCompanyLogo(cnpj: string, logoBase64: string): Promise<void> {
  const headers = await getAuthHeader();
  const key = cnpj.replace(/\D/g, "");
  await axios.put(`${API_BASE}/companies/${key}/logo`, { logoBase64 }, { headers });
}
