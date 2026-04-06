import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCertificate } from "../../shared/api/certificates.api";
import type { CertificateValidationResponse } from "../../shared/api/certificates.api";

// Brand colors from the design system
const C = {
  primary: "#001a45",
  primaryContainer: "#002e6e",
  onPrimaryContainer: "#7998de",
  surface: "#f7f9fb",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  onSurface: "#191c1e",
  onSurfaceVariant: "#434750",
  outlineVariant: "#c4c6d2",
  tertiaryFixed: "#6ffbbe",
  tertiaryFixedDim: "#4edea3",
  tertiaryContainer: "#003925",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  onError: "#ffffff",
};

// --- Icons ---

const VerifiedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
  </svg>
);

const SecurityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);

const BusinessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
  </svg>
);

const QrCodeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/>
    <rect width="5" height="5" x="3" y="16" rx="1"/>
    <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/>
    <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
    <path d="M3 12h.01"/><path d="M12 3h.01"/>
    <path d="M12 16v.01"/><path d="M16 12h1"/>
    <path d="M21 12v.01"/><path d="M12 21v-1"/>
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

// --- Sub-components ---

function HeroSection({ result, uuid }: { result: CertificateValidationResponse; uuid: string }) {
  const isValid = result.status === "valid";
  const isRevoked = result.status === "revoked";
  const isExpired = result.status === "expired";
  const isNotFound = result.status === "not_found";

  const title = isValid
    ? "Certificado Válido"
    : isExpired
    ? "Certificado Expirado"
    : isRevoked
    ? "Certificado Revogado"
    : "Não Encontrado";

  const subtitle = isValid
    ? "Este certificado foi emitido e verificado com sucesso pelo sistema editorial da FL Assessoria Pedagógica."
    : isExpired
    ? "Este certificado foi emitido mas seu prazo de validade já expirou."
    : isRevoked
    ? "Este certificado foi revogado pelo emissor e não possui mais validade."
    : "Nenhum certificado foi encontrado para o código informado.";

  const badgeText = isValid
    ? "Documento Autenticado"
    : isExpired
    ? "Certificado Expirado"
    : isRevoked
    ? "Certificado Revogado"
    : "Não Encontrado";

  // Hero gradient: valid = dark navy, error states = dark red/neutral
  const heroGradient =
    isValid
      ? `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryContainer} 100%)`
      : isExpired || isRevoked
      ? "linear-gradient(135deg, #3b1111 0%, #5a1a1a 100%)"
      : "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)";

  const shortCode = uuid.split("-")[0].toUpperCase();

  return (
    <section
      className="relative overflow-hidden rounded-xl mb-12 p-8 md:p-16"
      style={{ background: heroGradient, color: "#ffffff" }}
    >
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="max-w-2xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ color: isValid ? C.tertiaryFixed : "#ffa0a0" }}>
              <VerifiedIcon />
            </span>
            <span className="text-xs font-bold tracking-widest uppercase">
              {badgeText}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg md:text-xl font-medium opacity-90"
            style={{ color: isValid ? C.onPrimaryContainer : "rgba(255,255,255,0.75)" }}
          >
            {subtitle}
          </p>

          {/* Error state: show message */}
          {(isRevoked || isNotFound) && result.message && (
            <p className="mt-4 text-sm opacity-70">{result.message}</p>
          )}
        </div>

        {/* Logo Stamp (only for valid/expired certificates) */}
        {(isValid || isExpired) && (
          <div
            className="p-6 rounded-xl flex flex-col items-center justify-center shadow-2xl shrink-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div className="w-28 h-28 bg-white p-2 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
              {result.logoBase64 ? (
                <img
                  src={result.logoBase64}
                  alt="Logo da empresa emissora"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full" style={{ color: "#aaa" }}>
                  <QrCodeIcon />
                </div>
              )}
            </div>
            <span
              className="text-xs font-mono tracking-widest opacity-60"
              style={{ fontSize: "10px" }}
            >
              ID: {shortCode}...
            </span>
          </div>
        )}

        {/* Error icon for invalid states */}
        {(isRevoked || isNotFound) && (
          <div
            className="p-6 rounded-xl flex flex-col items-center justify-center shadow-2xl shrink-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="w-28 h-28 flex items-center justify-center">
              <span style={{ color: "#ffa0a0", opacity: 0.7 }}>
                <WarningIcon />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Decorative blurs */}
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "rgba(0,57,37,0.3)" }}
      />
      <div
        className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: "rgba(0,46,110,0.4)" }}
      />
    </section>
  );
}

function DetailsGrid({ result, uuid }: { result: CertificateValidationResponse; uuid: string }) {
  const issuedAtFormatted = result.issuedAt
    ? format(parseISO(result.issuedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "—";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      {/* Main info */}
      <div className="md:col-span-8 space-y-8">
        {/* Name + Course card */}
        <div
          className="p-8 md:p-12 rounded-xl shadow-sm"
          style={{
            backgroundColor: C.surfaceContainerLowest,
            border: `1px solid ${C.outlineVariant}26`,
          }}
        >
          <div className="grid grid-cols-1 gap-12">
            <div className="flex flex-col gap-2">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
              >
                Aluno
              </span>
              <h2
                className="text-3xl md:text-5xl font-black leading-tight"
                style={{ color: C.primary, fontFamily: "Manrope, sans-serif" }}
              >
                {result.studentName}
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
              >
                Curso / Evento
              </span>
              <h3
                className="text-2xl font-bold"
                style={{ color: C.onSurface, fontFamily: "Manrope, sans-serif" }}
              >
                {result.courseName}
              </h3>
            </div>
          </div>
        </div>

        {/* Hours + Date cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <div
            className="p-6 rounded-xl flex flex-col gap-1"
            style={{ backgroundColor: C.surfaceContainer }}
          >
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
            >
              Carga Horária
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: C.primary }}
            >
              {result.courseHours ? `${result.courseHours} Horas` : "—"}
            </span>
          </div>

          <div
            className="p-6 rounded-xl flex flex-col gap-1"
            style={{ backgroundColor: C.surfaceContainer }}
          >
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
            >
              Data de Emissão
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: C.primary }}
            >
              {issuedAtFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="md:col-span-4 space-y-8">
        {/* Issuer card */}
        <div
          className="p-8 rounded-xl"
          style={{
            backgroundColor: C.surfaceContainerLow,
            border: `1px solid ${C.outlineVariant}26`,
          }}
        >
          <h4
            className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2"
            style={{ color: C.primary }}
          >
            <BusinessIcon />
            Dados do Emissor
          </h4>

          <div className="space-y-8">
            <div className="flex flex-col gap-1">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
              >
                Emitido por
              </span>
              <p className="font-bold" style={{ color: C.onSurface }}>
                {result.issuedBy?.toUpperCase()}
              </p>
            </div>

            {result.issuedByCnpj && (
              <div className="flex flex-col gap-1">
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
                >
                  CNPJ
                </span>
                <p className="text-sm font-medium" style={{ color: C.onSurface }}>
                  {result.issuedByCnpj}
                </p>
              </div>
            )}

            <div
              className="pt-6"
              style={{ borderTop: `1px solid ${C.outlineVariant}33` }}
            >
              <div className="flex flex-col gap-3">
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
                >
                  Assinatura Digital
                </span>

                {/* Logo da empresa emissora */}
                <div
                  className="w-full flex items-center justify-center rounded overflow-hidden"
                  style={{
                    height: "64px",
                    border: `2px dashed ${C.outlineVariant}`,
                    backgroundColor: result.logoBase64 ? "#fff" : "transparent",
                  }}
                >
                  {result.logoBase64 ? (
                    <img
                      src={result.logoBase64}
                      alt="Logo da instituição emissora"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-xs italic" style={{ color: C.onSurface, opacity: 0.4 }}>
                      Documento assinado digitalmente
                    </span>
                  )}
                </div>

                {/* Fingerprint: UUID truncado */}
                <div className="flex flex-col gap-1">
                  <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: C.onSurfaceVariant, letterSpacing: "0.2em" }}
                  >
                    Impressão Digital
                  </span>
                  <span
                    className="font-mono text-xs break-all"
                    style={{ color: C.onSurfaceVariant }}
                  >
                    {uuid.slice(0, 8).toUpperCase()}…{uuid.slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrity badge */}
        <div
          className="p-6 rounded-full flex items-center justify-between px-8"
          style={{
            backgroundColor: C.tertiaryContainer,
            border: `1px solid ${C.tertiaryFixedDim}33`,
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: C.tertiaryFixed }}
            />
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: C.tertiaryFixed }}
            >
              Integridade Verificada
            </span>
          </div>
          <span style={{ color: C.tertiaryFixed }}>
            <SecurityIcon />
          </span>
        </div>
      </aside>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="rounded-xl h-64" style={{ backgroundColor: "#d0d5dd" }} />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-8">
          <div className="rounded-xl h-64" style={{ backgroundColor: "#e8eaed" }} />
          <div className="grid grid-cols-2 gap-8">
            <div className="rounded-xl h-24" style={{ backgroundColor: "#eceef0" }} />
            <div className="rounded-xl h-24" style={{ backgroundColor: "#eceef0" }} />
          </div>
        </div>
        <div className="md:col-span-4 space-y-8">
          <div className="rounded-xl h-64" style={{ backgroundColor: "#e8eaed" }} />
          <div className="rounded-full h-16" style={{ backgroundColor: "#eceef0" }} />
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export function ValidationPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const [result, setResult] = useState<CertificateValidationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uuid) return;
    getCertificate(uuid)
      .then(setResult)
      .catch(() =>
        setResult({
          status: "not_found",
          message: "Certificado não encontrado na base de dados.",
        })
      )
      .finally(() => setLoading(false));
  }, [uuid]);

  const showDetails =
    result && (result.status === "valid" || result.status === "expired");

  return (
    <div
      className="min-h-screen pb-24 md:pb-0"
      style={{ backgroundColor: C.surface, color: C.onSurface, fontFamily: "Inter, sans-serif" }}
    >
      {/* Header — public only, no admin links */}
      <header className="w-full top-0 sticky z-40 bg-slate-50">
        <div className="flex items-center px-6 py-4 max-w-7xl mx-auto">
          <div
            className="text-xl font-black tracking-tight"
            style={{ color: C.primary, fontFamily: "Manrope, sans-serif" }}
          >
            Verificador Oficial
          </div>
        </div>
        <div className="h-px w-full bg-slate-200" />
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {loading ? (
          <LoadingSkeleton />
        ) : result ? (
          <>
            <HeroSection result={result} uuid={uuid!} />
            {showDetails && <DetailsGrid result={result} uuid={uuid!} />}
            <div className="mt-16 flex flex-col items-center text-center gap-6">
              <p className="text-xs max-w-md" style={{ color: C.onSurfaceVariant }}>
                Esta página é o registro oficial de verificação. A integridade deste
                documento pode ser confirmada a qualquer momento através do código de
                autenticação único.
              </p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
