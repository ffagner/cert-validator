import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../app/firebase";
import { IssueCertificateForm } from "./IssueCertificateForm";
import { CertificateList } from "./CertificateList";
import {
  listCertificates,
  listCompanies,
  updateCompanyLogo,
} from "../../shared/api/certificates.api";
import type {
  IssueCertificateResponse,
  IssueCertificatePayload,
  Company,
} from "../../shared/api/certificates.api";
import type { CertificateItem } from "./CertificateList";

const MAX_FILE_SIZE = 300 * 1024; // 300KB

interface QrResult {
  uuid: string;
  validationUrl: string;
  qrCodeBase64: string;
}

// --- Componente de linha de empresa ---
function CompanyRow({ company, onLogoUpdated }: {
  company: Company;
  onLogoUpdated: (cnpj: string, logoBase64: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSaved(false);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Use PNG ou JPEG.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Máx. 300KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!preview) return;
    setSaving(true);
    setError(null);
    try {
      await updateCompanyLogo(company.cnpj, preview);
      onLogoUpdated(company.cnpj, preview);
      setSaved(true);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setError("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const displayLogo = preview ?? company.logoBase64;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      {/* Logo atual / preview */}
      <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
        {displayLogo ? (
          <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-1" />
        ) : (
          <span className="text-xs text-gray-400 text-center leading-tight px-1">Sem logo</span>
        )}
      </div>

      {/* Dados */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{company.name}</p>
        <p className="text-xs text-gray-500">{company.cnpj}</p>
        {saved && !preview && (
          <p className="text-xs text-green-600 mt-1">Logo salva.</p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Upload */}
      <div className="flex items-center gap-2 shrink-0">
        {preview ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded font-medium hover:bg-gray-200"
            >
              Cancelar
            </button>
          </>
        ) : (
          <label className="cursor-pointer text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded font-medium hover:bg-gray-200">
            {company.logoBase64 ? "Alterar logo" : "Adicionar logo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// --- Dashboard principal ---
export function DashboardPage() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [lastQr, setLastQr] = useState<QrResult | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    listCertificates()
      .then((list) => setCertificates(list.map((c) => ({ ...c, issuedByCnpj: c.issuedByCnpj ?? "" }))))
      .catch(() => {})
      .finally(() => setLoadingCerts(false));

    listCompanies()
      .then(setCompanies)
      .catch(() => {})
      .finally(() => setLoadingCompanies(false));
  }, []);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  function handleIssued(result: IssueCertificateResponse, payload: IssueCertificatePayload) {
    setLastQr(result);
    setCertificates((prev) => [
      {
        uuid: result.uuid,
        studentName: payload.studentName,
        courseName: payload.courseName,
        courseHours: payload.courseHours,
        issuedBy: payload.issuedBy,
        issuedByCnpj: payload.issuedByCnpj,
        issuedAt: new Date(payload.issuedAt).toISOString(),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt).toISOString() : null,
        isActive: true,
      },
      ...prev,
    ]);
  }

  function handleCompanyRegistered(company: Omit<Company, "logoBase64">) {
    setCompanies((prev) =>
      prev.some((c) => c.cnpj === company.cnpj)
        ? prev
        : [...prev, { ...company, logoBase64: null }]
    );
  }

  function handleLogoUpdated(cnpj: string, logoBase64: string) {
    setCompanies((prev) =>
      prev.map((c) => (c.cnpj === cnpj ? { ...c, logoBase64 } : c))
    );
  }

  function handleRevoked(uuid: string) {
    setCertificates((prev) =>
      prev.map((c) => (c.uuid === uuid ? { ...c, isActive: false } : c))
    );
  }

  function downloadQr() {
    if (!lastQr) return;
    const link = document.createElement("a");
    link.href = lastQr.qrCodeBase64;
    link.download = `qrcode-${lastQr.uuid}.png`;
    link.click();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Cert Validator — Painel Admin</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* Emitir Certificado */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Emitir Certificado</h2>
          <IssueCertificateForm
            onIssued={handleIssued}
            onCompanyRegistered={handleCompanyRegistered}
          />
        </section>

        {/* QR Code gerado */}
        {lastQr && (
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">QR Code Gerado</h2>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <img src={lastQr.qrCodeBase64} alt="QR Code" className="w-40 h-40" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600 break-all">
                  <span className="font-medium">URL:</span> {lastQr.validationUrl}
                </p>
                <button
                  onClick={downloadQr}
                  className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700"
                >
                  Baixar QR Code (PNG)
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Empresas */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-800">Empresas</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Gerencie as logos das empresas emissoras. PNG ou JPEG, máx. 300KB, recomendado 400×400px.
            </p>
          </div>

          {loadingCompanies ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              Nenhuma empresa cadastrada. Emita um certificado para registrar a primeira.
            </p>
          ) : (
            <div>
              {companies.map((company) => (
                <CompanyRow
                  key={company.cnpj}
                  company={company}
                  onLogoUpdated={handleLogoUpdated}
                />
              ))}
            </div>
          )}
        </section>

        {/* Certificados emitidos */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Certificados Emitidos</h2>
          {loadingCerts ? (
            <p className="text-gray-500 text-sm">Carregando...</p>
          ) : (
            <CertificateList certificates={certificates} onRevoked={handleRevoked} />
          )}
        </section>

      </main>
    </div>
  );
}
