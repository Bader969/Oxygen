import QRCode from 'qrcode';

/**
 * Converts a QR Hash (UUID) into a scannable QR code Data URL (base64 image).
 * The frontend can use this to render an <img src={qrDataUrl} />
 */
export const generateQrCodeDataUrl = async (qrHash: string): Promise<string> => {
  try {
    // You can optionally encode a full tracking URL here
    // e.g. const url = `https://your-crm.com/track/${qrHash}`;
    const qrDataUrl = await QRCode.toDataURL(qrHash, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
};
