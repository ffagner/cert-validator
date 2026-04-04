import axios from "axios";
import { auth } from "../../app/firebase";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export interface IssueCertificatePayload {
  studentName: string;
  courseName: string;
  issuedBy: string;
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
  issuedBy?: string;
  issuedAt?: string;
  expiresAt?: string | null;
}

async function getAuthHeader(): Promise<{ Authorization: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
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

export async function revokeCertificate(uuid: string): Promise<void> {
  const headers = await getAuthHeader();
  await axios.patch(`${API_BASE}/certificates/${uuid}/revoke`, {}, { headers });
}
