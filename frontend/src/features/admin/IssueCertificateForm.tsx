import { useState } from "react";
import type { FormEvent } from "react";
import { issueCertificate } from "../../shared/api/certificates.api";
import type { IssueCertificateResponse, IssueCertificatePayload } from "../../shared/api/certificates.api";

interface IssueCertificateFormProps {
  onIssued: (result: IssueCertificateResponse, payload: IssueCertificatePayload) => void;
}

export function IssueCertificateForm({ onIssued }: IssueCertificateFormProps) {
  const [studentName, setStudentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseHours, setCourseHours] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issuedByCnpj, setIssuedByCnpj] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setStudentName("");
      setCourseName("");
      setCourseHours("");
      setIssuedBy("");
      setIssuedByCnpj("");
      setIssuedAt("");
      setExpiresAt("");
    } catch {
      setError("Erro ao emitir certificado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do aluno *
          </label>
          <input
            type="text"
            required
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do curso *
          </label>
          <input
            type="text"
            required
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Carga horária (horas) *
          </label>
          <input
            type="number"
            required
            min={1}
            step={1}
            value={courseHours}
            onChange={(e) => setCourseHours(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instituição emissora *
          </label>
          <input
            type="text"
            required
            value={issuedBy}
            onChange={(e) => setIssuedBy(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CNPJ da instituição *
          </label>
          <input
            type="text"
            required
            placeholder="XX.XXX.XXX/XXXX-XX"
            maxLength={18}
            value={issuedByCnpj}
            onChange={(e) => setIssuedByCnpj(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de emissão *
          </label>
          <input
            type="date"
            required
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de validade (opcional)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
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
