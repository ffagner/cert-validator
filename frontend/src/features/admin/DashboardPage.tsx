import { useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../app/firebase";
import { IssueCertificateForm } from "./IssueCertificateForm";
import { CertificateList } from "./CertificateList";
import { IssueCertificateResponse } from "../../shared/api/certificates.api";

interface IssuedCertificate {
  uuid: string;
  studentName: string;
  courseName: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface QrResult {
  uuid: string;
  validationUrl: string;
  qrCodeBase64: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<IssuedCertificate[]>([]);
  const [lastQr, setLastQr] = useState<QrResult | null>(null);

  async function handleLogout() {
    await signOut(auth);
    navigate("/login");
  }

  function handleIssued(result: IssueCertificateResponse) {
    setLastQr(result);
    // Adiciona à listagem local — em produção, viria de uma consulta ao Firestore
    setCertificates((prev) => [
      {
        uuid: result.uuid,
        studentName: "",
        courseName: "",
        issuedBy: "",
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        isActive: true,
      },
      ...prev,
    ]);
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
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Sair
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Emitir Certificado
          </h2>
          <IssueCertificateForm onIssued={handleIssued} />
        </section>

        {lastQr && (
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              QR Code Gerado
            </h2>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <img
                src={lastQr.qrCodeBase64}
                alt="QR Code do certificado"
                className="w-40 h-40"
              />
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

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Certificados Emitidos
          </h2>
          <CertificateList certificates={certificates} onRevoked={handleRevoked} />
        </section>
      </main>
    </div>
  );
}
