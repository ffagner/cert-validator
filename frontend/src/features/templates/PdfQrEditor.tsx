import { useState, useRef, useEffect } from "react";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

interface Props {
  qrCodeBase64: string;
  validationUrl: string;
  certificateUuid: string;
  onClose: () => void;
}

async function renderPage(
  bytes: ArrayBuffer,
  canvas: HTMLCanvasElement,
  pageNumber: number,
  targetWidth: number
): Promise<{ width: number; height: number; totalPages: number }> {
  // Clone buffer so pdfjs doesn't detach the original (needed later by pdf-lib)
  const data = new Uint8Array(bytes.slice(0));
  const pdf = await pdfjs.getDocument({ data }).promise;
  const page = await pdf.getPage(pageNumber);
  const natural = page.getViewport({ scale: 1 });
  const scale = targetWidth / natural.width;
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  // pdfjs-dist v5 uses `canvas` directly instead of `canvasContext`
  await page.render({ canvas, viewport }).promise;
  return { width: viewport.width, height: viewport.height, totalPages: pdf.numPages };
}

function dataUriToUint8Array(dataUri: string): Uint8Array {
  const base64 = dataUri.split(",")[1];
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function PdfQrEditor({
  qrCodeBase64,
  validationUrl,
  certificateUuid,
  onClose,
}: Props) {
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [qrPos, setQrPos] = useState({ x: 0, y: 0 });
  const [qrSize, setQrSize] = useState(80);
  const [showUrl, setShowUrl] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Render whenever bytes load or user changes page
  useEffect(() => {
    if (!pdfBytes || !canvasRef.current) return;
    setLoadingPdf(true);
    renderPage(pdfBytes, canvasRef.current, currentPage, 620)
      .then(({ width, height, totalPages: total }) => {
        setTotalPages(total);
        setCanvasSize({ w: width, h: height });
        // Center QR only on first load (when canvasSize is still zero)
        setQrPos((prev) =>
          prev.x === 0 && prev.y === 0
            ? { x: Math.round((width - 80) / 2), y: Math.round((height - 80) / 2) }
            : prev
        );
      })
      .catch(() => setError("Erro ao renderizar o PDF. Verifique se o arquivo é válido."))
      .finally(() => setLoadingPdf(false));
  }, [pdfBytes, currentPage]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Selecione um arquivo PDF válido.");
      return;
    }
    setError(null);
    try {
      setPdfBytes(await file.arrayBuffer());
    } catch {
      setError("Erro ao ler o arquivo.");
    }
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - qrPos.x;
    const offsetY = e.clientY - rect.top - qrPos.y;

    function onMove(ev: PointerEvent) {
      setQrPos({
        x: Math.max(0, Math.min(canvasSize.w - qrSize, ev.clientX - rect.left - offsetX)),
        y: Math.max(0, Math.min(canvasSize.h - qrSize, ev.clientY - rect.top - offsetY)),
      });
    }
    function onUp() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  async function handleGenerate() {
    const bytes = pdfBytes;
    if (!bytes || canvasSize.w === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.load(bytes);
      const page = doc.getPages()[currentPage - 1];
      const { width: pageW, height: pageH } = page.getSize();

      // Convert canvas-pixel coordinates to PDF points (PDF origin is bottom-left)
      const scaleX = pageW / canvasSize.w;
      const scaleY = pageH / canvasSize.h;
      const pdfX = qrPos.x * scaleX;
      const pdfY = pageH - (qrPos.y + qrSize) * scaleY;
      const pdfW = qrSize * scaleX;
      const pdfH = qrSize * scaleY;

      const qrImg = await doc.embedPng(dataUriToUint8Array(qrCodeBase64));
      page.drawImage(qrImg, { x: pdfX, y: pdfY, width: pdfW, height: pdfH });

      if (showUrl) {
        const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
        const regularFont = await doc.embedFont(StandardFonts.Helvetica);
        const gap = pdfW * 0.1;
        const textX = pdfX + pdfW + gap;
        const textMaxWidth = Math.max(40, pageW - textX - 10);
        const labelSize = 8;
        const urlSize = 7;
        // Align text block to top of QR (PDF Y axis is bottom-up)
        const labelY = pdfY + pdfH - labelSize;
        if (labelY > 0 && textX < pageW) {
          page.drawText("Para validar o certificado, acesse:", {
            x: textX,
            y: labelY,
            size: labelSize,
            font: boldFont,
            color: rgb(0.1, 0.1, 0.1),
            maxWidth: textMaxWidth,
          });
          const urlY = labelY - urlSize - 3;
          if (urlY > 0) {
            page.drawText(validationUrl, {
              x: textX,
              y: urlY,
              size: urlSize,
              font: regularFont,
              color: rgb(0.2, 0.2, 0.2),
              maxWidth: textMaxWidth,
            });
          }
        }
      }

      const saved = await doc.save();
      // Copy into a plain ArrayBuffer to satisfy Blob's strict type (pdf-lib returns Uint8Array<ArrayBufferLike>)
      const buffer = new ArrayBuffer(saved.byteLength);
      new Uint8Array(buffer).set(saved);
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificado-${certificateUuid}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Erro ao gerar o PDF. O arquivo pode estar protegido ou corrompido.");
    } finally {
      setGenerating(false);
    }
  }

  function resetPdf() {
    setPdfBytes(null);
    setTotalPages(0);
    setCurrentPage(1);
    setCanvasSize({ w: 0, h: 0 });
    setQrPos({ x: 0, y: 0 });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">
            Inserir QR Code no Certificado PDF
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Upload step */}
          {!pdfBytes && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-12 text-center">
              <svg
                className="w-10 h-10 text-gray-300 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Selecione o template do certificado
              </p>
              <p className="text-xs text-gray-400 mb-5">
                PDF — somente a primeira página será utilizada
              </p>
              <label className="cursor-pointer bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
                Escolher arquivo PDF
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
          )}

          {/* Editor step */}
          {pdfBytes && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* PDF preview with draggable QR */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 select-none">
                    Arraste o QR Code para posicioná-lo no certificado
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loadingPdf}
                        className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm"
                      >
                        ‹
                      </button>
                      <span className="text-xs text-gray-600 select-none whitespace-nowrap">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loadingPdf}
                        className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <div
                    ref={containerRef}
                    className="relative inline-block border border-gray-200 rounded-lg select-none"
                    style={{ lineHeight: 0 }}
                  >
                    {loadingPdf && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                        <span className="text-sm text-gray-500">Carregando PDF...</span>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="block rounded-lg" />

                    {canvasSize.w > 0 && !loadingPdf && (
                      <div
                        onPointerDown={startDrag}
                        className="absolute cursor-grab active:cursor-grabbing flex items-start"
                        style={{
                          left: qrPos.x,
                          top: qrPos.y,
                          gap: Math.max(4, qrSize * 0.1),
                          touchAction: "none",
                          userSelect: "none",
                        }}
                      >
                        <img
                          src={qrCodeBase64}
                          alt="QR Code"
                          width={qrSize}
                          height={qrSize}
                          draggable={false}
                          className="block shrink-0"
                        />
                        {showUrl && (
                          <div style={{ maxWidth: qrSize * 1.8, paddingTop: 2 }}>
                            <p
                              className="text-gray-900 leading-snug"
                              style={{ fontSize: Math.max(7, qrSize * 0.11), fontWeight: 700 }}
                            >
                              Para validar o certificado, acesse:
                            </p>
                            <p
                              className="text-gray-600 break-all leading-tight"
                              style={{ fontSize: Math.max(6, qrSize * 0.09), marginTop: 2 }}
                            >
                              {validationUrl}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="lg:w-60 shrink-0 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Tamanho do QR Code
                  </label>
                  <input
                    type="range"
                    min={40}
                    max={200}
                    step={5}
                    value={qrSize}
                    disabled={loadingPdf}
                    onChange={(e) => {
                      const size = Number(e.target.value);
                      setQrSize(size);
                      setQrPos((prev) => ({
                        x: Math.min(prev.x, Math.max(0, canvasSize.w - size)),
                        y: Math.min(prev.y, Math.max(0, canvasSize.h - size)),
                      }));
                    }}
                    className="w-full accent-blue-600"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">{qrSize}px na tela</p>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="show-url"
                    checked={showUrl}
                    onChange={(e) => setShowUrl(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-blue-600 cursor-pointer"
                  />
                  <label
                    htmlFor="show-url"
                    className="text-sm text-gray-700 leading-snug cursor-pointer"
                  >
                    Incluir texto de validação ao lado do QR
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || loadingPdf}
                    className="w-full bg-green-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {generating ? "Gerando..." : "Gerar e Baixar PDF"}
                  </button>
                  <button
                    onClick={resetPdf}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                  >
                    Trocar PDF
                  </button>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
