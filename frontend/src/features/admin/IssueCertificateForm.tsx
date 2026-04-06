import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  issueCertificate,
  listCompanies,
  getCompanyByCnpj,
} from "../../shared/api/certificates.api";
import type {
  IssueCertificateResponse,
  IssueCertificatePayload,
  Company,
} from "../../shared/api/certificates.api";

interface Props {
  onIssued: (result: IssueCertificateResponse, payload: IssueCertificatePayload) => void;
  // Chamado quando uma nova empresa é registrada via emissão, para atualizar a lista
  onCompanyRegistered?: (company: Omit<Company, "logoBase64">) => void;
}

// Formata o CNPJ 
function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
}

export function IssueCertificateForm({ onIssued, onCompanyRegistered }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyLogo, setSelectedCompanyLogo] = useState<string | null>(null);
  const [cnpjLookupStatus, setCnpjLookupStatus] = useState<"idle" | "found" | "new">("idle");

  const [studentName, setStudentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseHours, setCourseHours] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issuedByCnpj, setIssuedByCnpj] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCompanies().then(setCompanies).catch(() => {});
  }, []);

  function handleSelectCompany(e: React.ChangeEvent<HTMLSelectElement>) {
    const cnpj = e.target.value;
    if (!cnpj) {
      setIssuedByCnpj("");
      setIssuedBy("");
      setSelectedCompanyLogo(null);
      setCnpjLookupStatus("idle");
      return;
    }
    const company = companies.find((c) => c.cnpj === cnpj);
    if (company) {
      setIssuedByCnpj(company.cnpj);
      setIssuedBy(company.name);
      setSelectedCompanyLogo(company.logoBase64);
      setCnpjLookupStatus("found");
    }
  }

  async function handleCnpjBlur() {
    const digits = issuedByCnpj.replace(/\D/g, "");
    if (digits.length !== 14) return;

    const company = await getCompanyByCnpj(digits);
    if (company) {
      setIssuedBy(company.name);
      setSelectedCompanyLogo(company.logoBase64);
      setCnpjLookupStatus("found");
      // Atualiza a lista local se a empresa ainda não estava lá
      setCompanies((prev) =>
        prev.some((c) => c.cnpj === company.cnpj) ? prev : [...prev, company]
      );
    } else {
      setSelectedCompanyLogo(null);
      setCnpjLookupStatus("new");
    }
  }

  function handleCnpjChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIssuedByCnpj(formatCnpj(e.target.value));
    setCnpjLookupStatus("idle");
    setSelectedCompanyLogo(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: IssueCertificatePayload = {
        studentName,
        courseName,
        courseHours: Number(courseHours),
        issuedBy,
        issuedByCnpj,
        issuedAt,
        expiresAt: expiresAt || undefined,
      };
      const result = await issueCertificate(payload);
      onIssued(result, payload);

      // Notifica o dashboard para atualizar a lista de empresas
      if (cnpjLookupStatus === "new" && onCompanyRegistered) {
        onCompanyRegistered({ cnpj: issuedByCnpj, name: issuedBy });
      }

      setStudentName("");
      setCourseName("");
      setCourseHours("");
      setIssuedBy("");
      setIssuedByCnpj("");
      setIssuedAt("");
      setExpiresAt("");
      setSelectedCompanyLogo(null);
      setCnpjLookupStatus("idle");
    } catch {
      setError("Erro ao emitir certificado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Seletor de empresa cadastrada */}
      {companies.length > 0 && (
        <div>
          <label className={labelCls}>Selecionar empresa cadastrada</label>
          <select
            className={inputCls}
            defaultValue=""
            onChange={handleSelectCompany}
          >
            <option value="">— Nova empresa ou preencher manualmente —</option>
            {companies.map((c) => (
              <option key={c.cnpj} value={c.cnpj}>
                {c.name} — {c.cnpj}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Nome do aluno *</label>
          <input
            type="text"
            required
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Nome do curso *</label>
          <input
            type="text"
            required
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Carga horária (horas) *</label>
          <input
            type="number"
            required
            min={1}
            step={1}
            value={courseHours}
            onChange={(e) => setCourseHours(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>CNPJ da instituição *</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              placeholder="XX.XXX.XXX/XXXX-XX"
              maxLength={18}
              value={issuedByCnpj}
              onChange={handleCnpjChange}
              onBlur={handleCnpjBlur}
              className={inputCls}
            />
            {/* Badge de status do CNPJ */}
            {cnpjLookupStatus === "found" && (
              <span className="shrink-0 text-xs bg-green-100 text-green-700 font-medium px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1">
                {selectedCompanyLogo ? "✓ Com logo" : "✓ Cadastrada"}
              </span>
            )}
            {cnpjLookupStatus === "new" && (
              <span className="shrink-0 text-xs bg-yellow-100 text-yellow-700 font-medium px-2 py-1 rounded-full whitespace-nowrap">
                Nova
              </span>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Instituição emissora *</label>
          <input
            type="text"
            required
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Data de emissão *</label>
          <input
            type="date"
            required
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Data de validade (opcional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Preview da logo da empresa selecionada */}
      {selectedCompanyLogo && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <img
            src={selectedCompanyLogo}
            alt="Logo da empresa"
            className="h-10 w-10 object-contain rounded"
          />
          <span className="text-xs text-gray-500">
            Logo cadastrada para esta empresa — será exibida no certificado.
          </span>
        </div>
      )}

      {cnpjLookupStatus === "new" && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          Empresa nova — será registrada automaticamente. Você pode adicionar a logo depois na seção <strong>Empresas</strong>.
        </p>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Emitindo..." : "Emitir Certificado"}
      </button>
    </form>
  );
}
