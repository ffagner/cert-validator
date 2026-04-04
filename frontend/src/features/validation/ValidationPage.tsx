import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCertificate } from "../../shared/api/certificates.api";
import type { CertificateValidationResponse } from "../../shared/api/certificates.api";

export function ValidationPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [result, setResult] = useState<CertificateValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uuid) return;
    getCertificate(uuid)
      .then(setResult)
      .catch(() => setResult({ status: "not_found", message: "Certificado não encontrado ou inválido." }))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Verificando certificado...</p>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8">
        {result.status === "valid" && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-green-500 text-2xl">✓</span>
              <h1 className="text-xl font-semibold text-green-700">Certificado Válido</h1>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Aluno</dt>
                <dd className="text-gray-800 font-medium">{result.studentName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Curso</dt>
                <dd className="text-gray-800 font-medium">{result.courseName}</dd>
              </div>
              {result.courseHours && (
                <div>
                  <dt className="text-gray-500">Carga horária</dt>
                  <dd className="text-gray-800 font-medium">{result.courseHours}h</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Emitido por</dt>
                <dd className="text-gray-800 font-medium">{result.issuedBy}</dd>
              </div>
              {result.issuedByCnpj && (
                <div>
                  <dt className="text-gray-500">CNPJ</dt>
                  <dd className="text-gray-800 font-medium">{result.issuedByCnpj}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Data de emissão</dt>
                <dd className="text-gray-800 font-medium">
                  {result.issuedAt
                    ? new Date(result.issuedAt).toLocaleDateString("pt-BR")
                    : "—"}
                </dd>
              </div>
              {result.expiresAt && (
                <div>
                  <dt className="text-gray-500">Válido até</dt>
                  <dd className="text-gray-800 font-medium">
                    {new Date(result.expiresAt).toLocaleDateString("pt-BR")}
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}

        {result.status === "expired" && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-yellow-500 text-2xl">⚠</span>
              <h1 className="text-xl font-semibold text-yellow-700">Certificado Expirado</h1>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Aluno</dt>
                <dd className="text-gray-800 font-medium">{result.studentName}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Curso</dt>
                <dd className="text-gray-800 font-medium">{result.courseName}</dd>
              </div>
              {result.courseHours && (
                <div>
                  <dt className="text-gray-500">Carga horária</dt>
                  <dd className="text-gray-800 font-medium">{result.courseHours}h</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Emitido por</dt>
                <dd className="text-gray-800 font-medium">{result.issuedBy}</dd>
              </div>
              {result.issuedByCnpj && (
                <div>
                  <dt className="text-gray-500">CNPJ</dt>
                  <dd className="text-gray-800 font-medium">{result.issuedByCnpj}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Expirou em</dt>
                <dd className="text-yellow-600 font-medium">
                  {result.expiresAt
                    ? new Date(result.expiresAt).toLocaleDateString("pt-BR")
                    : "—"}
                </dd>
              </div>
            </dl>
          </>
        )}

        {result.status === "revoked" && (
          <div className="text-center">
            <span className="text-red-500 text-4xl block mb-4">✕</span>
            <h1 className="text-xl font-semibold text-red-700 mb-2">Certificado Cancelado</h1>
            <p className="text-gray-600 text-sm">{result.message}</p>
          </div>
        )}

        {result.status === "not_found" && (
          <div className="text-center">
            <span className="text-gray-400 text-4xl block mb-4">?</span>
            <h1 className="text-xl font-semibold text-gray-700 mb-2">Certificado não encontrado</h1>
            <p className="text-gray-500 text-sm">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
