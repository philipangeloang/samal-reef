import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import { siteConfig } from "@/site.config";

/**
 * Certificate of Ownership Generator Service
 * Creates professional Certificate of Ownership PDFs for Prospera Reef
 * Generated AFTER MOA is signed
 */

export interface CertificateData {
  // Client details (from MOA signing)
  clientName: string; // Full legal name from signerName field

  // Ownership details
  collectionName: string; // Property collection name
  unitName: string; // Property unit name (e.g., "B1")
  percentageOwned: number; // In basis points (100 = 1%, 300 = 3%, etc.)
  purchaseDate: Date; // When the ownership was purchased

  // Property location details (from collection)
  location: string; // Legacy location field
  address?: string; // Street address
  city?: string; // City name
  country?: string; // Country name

  // Business entity details (from collection)
  manager?: string; // Property manager name
  managerPosition?: string; // Manager's position/title
}

/**
 * Helper function to format percentage as display string
 */
function formatPercentage(basisPoints: number): string {
  const percentage = basisPoints / 100;
  return percentage % 1 === 0 ? `${percentage}%` : `${percentage.toFixed(1)}%`;
}

/**
 * Helper function to format date as readable string
 */
function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `[${month}/${day}/${year}]`;
}

/**
 * Sanitize text to remove WinAnsi-incompatible characters
 * WinAnsi encoding cannot handle newlines (\n), carriage returns (\r), tabs (\t), etc.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/[\r\n\t]/g, " ") // Replace control characters with spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces into one
    .trim(); // Remove leading/trailing whitespace
}

/**
 * Construct location string from dynamic fields with fallback
 */
function constructLocation(data: CertificateData): string {
  if (data.address && data.city && data.country) {
    const address = sanitizeText(data.address);
    const city = sanitizeText(data.city);
    const country = sanitizeText(data.country);
    return `${address}, ${city}, ${country}`;
  }
  return sanitizeText(data.location);
}

/**
 * Get manager name with fallback to default
 */
function getManagerName(data: CertificateData): string {
  const manager = data.manager ?? siteConfig.company.defaultManager;
  return sanitizeText(manager);
}

/**
 * Get manager position with fallback to default
 */
function getManagerPosition(data: CertificateData): string {
  const position = data.managerPosition ?? "FOUNDER";
  return sanitizeText(position);
}

/**
 * Generate Certificate of Ownership PDF
 */
export async function generateCertificatePdf(
  data: CertificateData,
): Promise<Uint8Array> {
  // Create new PDF document
  const pdfDoc = await PDFDocument.create();

  // Load fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold); // Serif font for elegant titles
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Load Logo
  let logoImage = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "Logo.png");
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch (error) {
    console.error("Failed to load logo:", error);
  }

  // Load Mitchell's signature
  let managerSignature = null;
  try {
    const signaturePath = path.join(
      process.cwd(),
      "public",
      "signature",
      "mitchell_signature.png",
    );
    const signatureBytes = fs.readFileSync(signaturePath);
    managerSignature = await pdfDoc.embedPng(signatureBytes);
  } catch (error) {
    console.error("Failed to load manager signature:", error);
  }

  // LANDSCAPE layout (11" x 8.5")
  const page = pdfDoc.addPage([792, 612]);
  const { width, height } = page.getSize();
  const centerX = width / 2;

  // Colors
  const oceanBlue = rgb(0.25, 0.35, 0.55); // Ocean blue for text
  const lightBlue = rgb(0.4, 0.6, 0.75); // Light blue for accents
  const textColor = rgb(0.1, 0.1, 0.1); // Dark text

  let currentY = height - 60;

  // ========== LOGO AT TOP ==========
  if (logoImage) {
    const logoScale = 0.15; // Adjust as needed
    const logoDims = logoImage.scale(logoScale);
    page.drawImage(logoImage, {
      x: centerX - logoDims.width / 2,
      y: currentY - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    currentY -= logoDims.height + 25;
  } else {
    currentY -= 10;
  }

  // ========== TITLE: CERTIFICATE ==========
  const certificateText = "CERTIFICATE";
  const certificateSize = 52;
  page.drawText(certificateText, {
    x:
      centerX -
      titleFont.widthOfTextAtSize(certificateText, certificateSize) / 2,
    y: currentY,
    size: certificateSize,
    font: titleFont,
    color: oceanBlue,
  });

  currentY -= 55;

  // ========== SUBTITLE: OF OWNERSHIP ==========
  const ownershipText = "OF OWNERSHIP";
  const ownershipSize = 32;
  page.drawText(ownershipText, {
    x: centerX - titleFont.widthOfTextAtSize(ownershipText, ownershipSize) / 2,
    y: currentY,
    size: ownershipSize,
    font: titleFont,
    color: oceanBlue,
  });

  currentY -= 45;

  // ========== PRESENTED TO TEXT ==========
  const presentedText = "THIS CERTIFICATE OF OWNERSHIP IS HEREBY PRESENTED TO:";
  const presentedSize = 10;
  page.drawText(presentedText, {
    x: centerX - bodyFont.widthOfTextAtSize(presentedText, presentedSize) / 2,
    y: currentY,
    size: presentedSize,
    font: bodyFont,
    color: lightBlue,
  });

  currentY -= 50;

  // ========== CLIENT NAME (Script-style with italics) ==========
  const nameSize = data.clientName.length > 25 ? 32 : 38;
  page.drawText(data.clientName, {
    x: centerX - italicFont.widthOfTextAtSize(data.clientName, nameSize) / 2,
    y: currentY,
    size: nameSize,
    font: italicFont,
    color: textColor,
  });

  // Underline for name
  const nameWidth = italicFont.widthOfTextAtSize(data.clientName, nameSize);
  page.drawLine({
    start: { x: centerX - nameWidth / 2 - 20, y: currentY - 8 },
    end: { x: centerX + nameWidth / 2 + 20, y: currentY - 8 },
    thickness: 1,
    color: textColor,
  });

  currentY -= 50;

  // ========== UNIT NAME ==========
  const unitText = `${data.collectionName.toUpperCase()} - ${data.unitName}`;
  const unitSize = 16;
  page.drawText(unitText, {
    x: centerX - boldFont.widthOfTextAtSize(unitText, unitSize) / 2,
    y: currentY,
    size: unitSize,
    font: boldFont,
    color: textColor,
  });

  currentY -= 22;

  // ========== PERCENTAGE ==========
  const percentageText = formatPercentage(data.percentageOwned);
  const percentageSize = 12;
  page.drawText(percentageText, {
    x: centerX - bodyFont.widthOfTextAtSize(percentageText, percentageSize) / 2,
    y: currentY,
    size: percentageSize,
    font: bodyFont,
    color: textColor,
  });

  currentY -= 20;

  // ========== LOCATION TEXT - using dynamic value ==========
  const locationText = constructLocation(data);
  const locationSize = 9;
  page.drawText(locationText, {
    x: centerX - bodyFont.widthOfTextAtSize(locationText, locationSize) / 2,
    y: currentY,
    size: locationSize,
    font: bodyFont,
    color: textColor,
  });

  currentY -= 35;

  // ========== OWNERSHIP RIGHTS TEXT (3 lines, centered) ==========
  const rightsLine1 =
    "This certificate confirms that the above-named individual is the legal and rightful owner of the aforementioned Floating Studio Unit,";
  const rightsLine2 =
    "including all fixtures, and furnishings, unless otherwise specified in the terms of sale or agreement.";
  const rightsLine3 =
    "Ownership rights include, but are not limited to, the right to proportional income of the leased unit, the right a limited free stay in the resort,";
  const rightsLine4 =
    "and an exclusive discount applicable within the restaurant in the resort.";
  const rightsLine5 =
    "This certificate also confirms the right of the holder to sell their ownership to any additional party.";

  const rightsSize = 8;

  [rightsLine1, rightsLine2, rightsLine3, rightsLine4, rightsLine5].forEach(
    (line) => {
      page.drawText(line, {
        x: centerX - bodyFont.widthOfTextAtSize(line, rightsSize) / 2,
        y: currentY,
        size: rightsSize,
        font: bodyFont,
        color: textColor,
      });
      currentY -= 12;
    },
  );

  currentY -= 20;

  // ========== BOTTOM SECTION ==========
  const bottomY = 80;

  // LEFT SIDE: Manager Signature
  const signatureX = 100;

  if (managerSignature) {
    const sigScale = 0.3;
    const sigDims = managerSignature.scale(sigScale);
    page.drawImage(managerSignature, {
      x: signatureX,
      y: bottomY + 20,
      width: sigDims.width,
      height: sigDims.height,
    });
  }

  // Signature line
  page.drawLine({
    start: { x: signatureX, y: bottomY + 15 },
    end: { x: signatureX + 180, y: bottomY + 15 },
    thickness: 1,
    color: textColor,
  });

  // Manager name - using dynamic value
  page.drawText(getManagerName(data), {
    x: signatureX,
    y: bottomY,
    size: 11,
    font: boldFont,
    color: textColor,
  });

  // Manager position - using dynamic value
  page.drawText(getManagerPosition(data), {
    x: signatureX,
    y: bottomY - 15,
    size: 9,
    font: bodyFont,
    color: textColor,
  });

  // RIGHT SIDE: Granted On Date
  const grantedText = "THIS OWNERSHIP IS GRANTED ON";
  const grantedTextSize = 10;
  const grantedTextWidth = bodyFont.widthOfTextAtSize(
    grantedText,
    grantedTextSize,
  );

  // Position the entire section from the right edge
  const rightSectionX = width - 320;

  // Center the "THIS OWNERSHIP IS GRANTED ON" text
  const grantedTextX = rightSectionX + (200 - grantedTextWidth) / 2;
  page.drawText(grantedText, {
    x: grantedTextX,
    y: bottomY + 25,
    size: grantedTextSize,
    font: bodyFont,
    color: textColor,
  });

  // Date line (centered under the section)
  const lineWidth = 180;
  const dateLineStart = rightSectionX + (200 - lineWidth) / 2;
  page.drawLine({
    start: { x: dateLineStart, y: bottomY },
    end: { x: dateLineStart + lineWidth, y: bottomY },
    thickness: 1,
    color: textColor,
  });

  // Date (centered on the line)
  const formattedDate = formatDate(data.purchaseDate);
  const dateWidth = bodyFont.widthOfTextAtSize(formattedDate, 11);
  const dateCenter = dateLineStart + lineWidth / 2;
  page.drawText(formattedDate, {
    x: dateCenter - dateWidth / 2,
    y: bottomY - 15,
    size: 11,
    font: bodyFont,
    color: textColor,
  });

  // Serialize PDF to bytes
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
