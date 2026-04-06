import { getFirestore } from "firebase-admin/firestore";

const COLLECTION = "companies";
const MAX_BASE64_LENGTH = 409600; // ~300KB de imagem

export function cnpjToKey(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export interface Company {
  cnpj: string;
  name: string;
  logoBase64: string | null;
}

export async function getCompany(cnpj: string): Promise<Company | null> {
  const db = getFirestore();
  const doc = await db.collection(COLLECTION).doc(cnpjToKey(cnpj)).get();
  if (!doc.exists) return null;
  const d = doc.data()!;
  return { cnpj: d.cnpj, name: d.name, logoBase64: d.logoBase64 ?? null };
}

export async function listCompanies(): Promise<Company[]> {
  const db = getFirestore();
  const snapshot = await db.collection(COLLECTION).orderBy("name").get();
  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return { cnpj: d.cnpj, name: d.name, logoBase64: d.logoBase64 ?? null };
  });
}

// Cria ou atualiza nome/CNPJ sem sobrescrever a logo existente
export async function upsertCompany(cnpj: string, name: string): Promise<void> {
  const db = getFirestore();
  await db
    .collection(COLLECTION)
    .doc(cnpjToKey(cnpj))
    .set({ cnpj, name }, { merge: true });
}

export async function updateCompanyLogo(
  cnpj: string,
  logoBase64: string
): Promise<void> {
  if (!logoBase64.match(/^data:image\/(png|jpeg);base64,/)) {
    const err = new Error("Formato inválido. Envie PNG ou JPEG em base64.");
    err.name = "validation_error";
    throw err;
  }
  if (logoBase64.length > MAX_BASE64_LENGTH) {
    const err = new Error("Imagem muito grande. Máximo: 300KB.");
    err.name = "validation_error";
    throw err;
  }

  const db = getFirestore();
  const key = cnpjToKey(cnpj);
  const docRef = db.collection(COLLECTION).doc(key);

  // Empresa deve existir antes de atualizar logo
  const doc = await docRef.get();
  if (!doc.exists) {
    const err = new Error("Empresa não encontrada.");
    err.name = "not_found";
    throw err;
  }

  await docRef.update({ logoBase64 });
}
