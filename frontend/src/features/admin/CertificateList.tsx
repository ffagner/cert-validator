import { useState } from "react";
import { revokeCertificate } from "../../shared/api/certificates.api";

interface CertificateItem {
  uuid: string;
  studentName: string;
  courseName: string;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

interface CertificateListProps {
  certificates: CertificateItem[];
  onRevoked: (uuid: string) => void;
}

export function CertificateList({ certificates, onRevoked }: CertificateListProps) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(uuid: string) {
    if (!confirm("Confirma a revogação deste certificado? Esta ação não pode ser desfeita.")) return;
    setRevoking(uuid);
    setError(null);
    try {
      await revokeCertificate(uuid);
      onRevoked(uuid);
    } catch {
      setError("Erro ao revogar certificado.");
    } finally {
      setRevoking(null);
    }
  }

  if (certificates.length === 0) {
    return <p className="text-gray-500 text-sm">Nenhum certificado emitido ainda.</p>;
  }

  return (
    <div>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 pr-4 font-medium text-gray-600">Aluno</th>
              <th className="py-2 pr-4 font-medium text-gray-600">Curso</th>
              <th className="py-2 pr-4 font-medium text-gray-600">Emissão</th>
              <th className="py-2 pr-4 font-medium text-gray-600">Status</th>
              <th className="py-2 font-medium text-gray-600">Ação</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((cert) => (
              <tr key={cert.uuid} className="border-b border-gray-100">
                <td className="py-2 pr-4 text-gray-800">{cert.studentName}</td>
                <td className="py-2 pr-4 text-gray-800">{cert.courseName}</td>
                <td className="py-2 pr-4 text-gray-600">
                  {new Date(cert.issuedAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="py-2 pr-4">
                  {cert.isActive ? (
                    <span className="text-green-600 font-medium">Ativo</span>
                  ) : (
                    <span className="text-red-500 font-medium">Revogado</span>
                  )}
                </td>
                <td className="py-2">
                  {cert.isActive && (
                    <button
                      onClick={() => handleRevoke(cert.uuid)}
                      disabled={revoking === cert.uuid}
                      className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                    >
                      {revoking === cert.uuid ? "Revogando..." : "Revogar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
