import { useState } from "react";
import { revokeCertificate, getCertificateQr } from "../../shared/api/certificates.api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CertificateItem {
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

interface QrData {
  uuid: string;
  validationUrl: string;
  qrCodeBase64: string;
}

interface Props {
  certificates: CertificateItem[];
  onRevoked: (uuid: string) => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CertificateRow({
  cert,
  onRevoked,
}: {
  cert: CertificateItem;
  onRevoked: (uuid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [qr, setQr] = useState<QrData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    if (!confirm("Confirma a revogação deste certificado? Esta ação não pode ser desfeita."))
      return;
    setRevoking(true);
    setError(null);
    try {
      await revokeCertificate(cert.uuid);
      onRevoked(cert.uuid);
    } catch {
      setError("Erro ao revogar.");
    } finally {
      setRevoking(false);
    }
  }

  async function handleToggleQr() {
    if (qr) { setQr(null); return; }
    setLoadingQr(true);
    setError(null);
    try {
      const result = await getCertificateQr(cert.uuid);
      setQr({ uuid: cert.uuid, ...result });
    } catch {
      setError("Erro ao carregar QR.");
    } finally {
      setLoadingQr(false);
    }
  }

  function downloadQr() {
    if (!qr) return;
    const link = document.createElement("a");
    link.href = qr.qrCodeBase64;
    link.download = `qrcode-${cert.uuid}.png`;
    link.click();
  }

  const issuedAtFmt = format(new Date(cert.issuedAt), "dd/MM/yyyy", { locale: ptBR });
  const expiresAtFmt = cert.expiresAt
    ? format(new Date(cert.expiresAt), "dd/MM/yyyy", { locale: ptBR })
    : "Sem validade";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header — linha clicável */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            cert.isActive ? "bg-green-500" : "bg-red-400"
          }`}
        />

        {/* Nome do aluno */}
        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
          {cert.studentName}
        </span>

        {/* Curso */}
        <span className="hidden sm:block flex-1 text-sm text-gray-500 truncate">
          {cert.courseName}
        </span>

        {/* Data */}
        <span className="text-xs text-gray-400 shrink-0">{issuedAtFmt}</span>

        {/* Badge status */}
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            cert.isActive
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {cert.isActive ? "Ativo" : "Revogado"}
        </span>

        <span className="text-gray-400 shrink-0">
          <ChevronIcon open={open} />
        </span>
      </button>

      {/* Accordion body */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
          {error && <p className="text-red-500 text-xs">{error}</p>}

          {/* Detalhes em grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Aluno</p>
              <p className="text-sm font-medium text-gray-800">{cert.studentName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Curso</p>
              <p className="text-sm font-medium text-gray-800">{cert.courseName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Carga horária</p>
              <p className="text-sm font-medium text-gray-800">{cert.courseHours}h</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Emissão</p>
              <p className="text-sm font-medium text-gray-800">{issuedAtFmt}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Validade</p>
              <p className="text-sm font-medium text-gray-800">{expiresAtFmt}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Emissor</p>
              <p className="text-sm font-medium text-gray-800">{cert.issuedBy}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">ID do certificado</p>
              <p className="text-xs font-mono text-gray-600 break-all">{cert.uuid}</p>
            </div>
          </div>

          {/* QR Code */}
          {qr && (
            <div className="flex flex-col sm:flex-row items-start gap-3 pt-2 border-t border-gray-200">
              <img src={qr.qrCodeBase64} alt="QR Code" className="w-24 h-24 rounded" />
              <div className="space-y-1">
                <p className="text-xs text-gray-500 break-all">
                  <span className="font-medium">URL:</span> {qr.validationUrl}
                </p>
                <button
                  onClick={downloadQr}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded font-medium hover:bg-green-700"
                >
                  Baixar PNG
                </button>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleToggleQr}
              disabled={loadingQr}
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded font-medium hover:bg-blue-100 disabled:opacity-50"
            >
              {loadingQr ? "Carregando…" : qr ? "Fechar QR" : "Ver QR Code"}
            </button>

            {cert.isActive && (
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded font-medium hover:bg-red-100 disabled:opacity-50"
              >
                {revoking ? "Revogando…" : "Revogar"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CertificateList({ certificates, onRevoked }: Props) {
  const [companyFilter, setCompanyFilter] = useState("");

  // Extrai empresas únicas da lista
  const companies = Array.from(
    new Map(certificates.map((c) => [c.issuedByCnpj, c.issuedBy])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = companyFilter
    ? certificates.filter((c) => c.issuedByCnpj === companyFilter)
    : certificates;

  if (certificates.length === 0) {
    return <p className="text-gray-500 text-sm">Nenhum certificado emitido ainda.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filtro por empresa */}
      {companies.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 shrink-0">Filtrar por empresa:</label>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas ({certificates.length})</option>
            {companies.map(([cnpj, name]) => (
              <option key={cnpj} value={cnpj}>
                {name} — {cnpj}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lista com accordion */}
      <div className="space-y-2">
        {filtered.map((cert) => (
          <CertificateRow key={cert.uuid} cert={cert} onRevoked={onRevoked} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          Nenhum certificado encontrado para esta empresa.
        </p>
      )}
    </div>
  );
}
