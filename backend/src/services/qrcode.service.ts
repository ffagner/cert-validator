import QRCode from "qrcode";

export async function generateQrCodeBase64(url: string): Promise<string> {
  const buffer = await QRCode.toBuffer(url, { type: "png", width: 300 });
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
