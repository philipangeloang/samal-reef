import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
import { siteConfig } from "@/site.config";

/**
 * MOA Generator Service
 * Creates Memorandum of Agreement PDFs matching the official template
 * for ${siteConfig.company.legalName} (${siteConfig.company.dba})
 */

export interface MoaData {
  // Ownership details
  ownershipPercentage: number; // In basis points (100 = 1%)
  purchasePrice: string; // PDF-safe formatted amount (e.g., "PHP 1,500.00")
  unitName: string; // Property unit name (e.g., "B1")
  purchaseDate: Date;

  // Property location details (from collection)
  location: string; // Legacy location field
  address?: string; // Street address
  city?: string; // City name
  country?: string; // Country name

  // Business entity details (from collection)
  construction?: string; // Construction company name
  manager?: string; // Property manager name
  managerPosition?: string; // Manager's position/title
  monthlyFee?: string; // Monthly common facility fee

  // Investor details (for signing)
  investorName?: string; // Full name (optional for unsigned template)
  signatureDataUrl?: string; // Base64 signature image (optional for unsigned)
  signDate?: Date; // Date of signature (optional for unsigned)
}

interface TextOptions {
  x: number;
  y: number;
  size: number;
  font?: PDFFont;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  lineHeight?: number;
}

/**
 * Helper function to draw text with word wrapping
 */
function drawTextWrapped(
  page: PDFPage,
  text: string,
  options: TextOptions,
  bodyFont: PDFFont,
): number {
  const {
    x,
    y,
    size,
    font = bodyFont,
    maxWidth = 500,
    align = "left",
    lineHeight = size + 4,
  } = options;

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  let currentY = y;
  for (const line of lines) {
    let xPos = x;
    if (align === "center") {
      const width = font.widthOfTextAtSize(line, size);
      xPos = x + (maxWidth - width) / 2;
    } else if (align === "right") {
      const width = font.widthOfTextAtSize(line, size);
      xPos = x + maxWidth - width;
    }

    page.drawText(line, {
      x: xPos,
      y: currentY,
      size,
      font,
      color: rgb(0, 0, 0),
    });

    currentY -= lineHeight;
  }

  return currentY;
}

/**
 * Helper to format percentage from basis points (e.g. 75 → "0.75", 300 → "3")
 */
function formatPercentage(basisPoints: number): string {
  const pct = basisPoints / 100;
  return pct % 1 === 0 ? pct.toFixed(0) : pct.toString();
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
function constructLocation(data: MoaData): string {
  if (data.address && data.city && data.country) {
    const address = sanitizeText(data.address);
    const city = sanitizeText(data.city);
    const country = sanitizeText(data.country);
    return `${address}, ${city}, ${country}`;
  }
  return sanitizeText(data.location);
}

/**
 * Get construction company name with fallback to default
 */
function getConstructionCompany(data: MoaData): string {
  const company = data.construction ??
    `${siteConfig.company.legalName} (doing business under the name and style of ${siteConfig.company.dba})`;
  return sanitizeText(company);
}

/**
 * Get manager name with fallback to default
 */
function getManagerName(data: MoaData): string {
  const manager = data.manager ?? siteConfig.company.defaultManager;
  return sanitizeText(manager);
}

/**
 * Get manager position with fallback to default
 */
function getManagerPosition(data: MoaData): string {
  const position = data.managerPosition ?? "General Manager";
  return sanitizeText(position);
}

/**
 * Get monthly fee with fallback to default
 */
function getMonthlyFee(data: MoaData): string {
  const fee = data.monthlyFee ?? "2,000 pesos or $40 per month, per unit";
  return sanitizeText(fee);
}

/**
 * Generates an unsigned MOA template PDF matching the official template
 */
export async function generateUnsignedMoaPdf(
  data: MoaData,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Load fonts
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Load Mitchell's signature
  let mitchellSignature;
  try {
    const signaturePath = path.join(
      process.cwd(),
      "public",
      "signature",
      "mitchell_signature.png",
    );
    const signatureBytes = fs.readFileSync(signaturePath);
    mitchellSignature = await pdfDoc.embedPng(signatureBytes);
  } catch (error) {
    console.error("Failed to load Mitchell's signature:", error);
  }

  // Define page dimensions and margins
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 72; // 1 inch
  const marginY = 72;
  const contentWidth = pageWidth - 2 * marginX;

  // ===== PAGE 1 =====
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginY;

  // Title (centered)
  const titleText = "MEMORANDUM OF AGREEMENT";
  const titleWidth = titleFont.widthOfTextAtSize(titleText, 14);
  page1.drawText(titleText, {
    x: (pageWidth - titleWidth) / 2,
    y: y,
    size: 14,
    font: titleFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Subtitle (centered)
  const subtitleText =
    `Shared Ownership of a Floating House in the ${siteConfig.location.country}`;
  const subtitleWidth = bodyFont.widthOfTextAtSize(subtitleText, 11);
  page1.drawText(subtitleText, {
    x: (pageWidth - subtitleWidth) / 2,
    y: y,
    size: 11,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Opening paragraph with bold date
  const agreementDate = data.signDate
    ? data.signDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "___________________";

  page1.drawText(
    'This Memorandum of Agreement ("Agreement") is made and entered into on ',
    {
      x: marginX,
      y: y,
      size: 10,
      font: bodyFont,
      color: rgb(0, 0, 0),
    },
  );

  const introWidth = bodyFont.widthOfTextAtSize(
    'This Memorandum of Agreement ("Agreement") is made and entered into on ',
    10,
  );

  page1.drawText(agreementDate, {
    x: marginX + introWidth,
    y: y,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  page1.drawText("by and between:", {
    x: marginX,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  // First Party - using dynamic values with sanitization
  const companyName = getConstructionCompany(data);
  const location = constructLocation(data);
  const managerName = getManagerName(data);
  const managerPosition = getManagerPosition(data);

  y = drawTextWrapped(
    page1,
    `${companyName} a corporation duly organized and existing under the laws of the ${siteConfig.location.country} with principal place of business situated in ${location}, herein represented by its ${managerPosition}, ${managerName}, and hereinafter referred to as the FIRST PARTY;`,
    { x: marginX, y, size: 10, maxWidth: contentWidth, font: boldFont },
    bodyFont,
  );
  y -= 20;

  // -and-
  page1.drawText("-and-", {
    x: pageWidth / 2 - 20,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // Second Party - bold investor name
  if (data.investorName) {
    page1.drawText(data.investorName, {
      x: marginX,
      y: y,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    const nameWidth = boldFont.widthOfTextAtSize(data.investorName, 11);
    page1.drawText(", hereinafter referred to as the SECOND PARTY.", {
      x: marginX + nameWidth,
      y: y,
      size: 10,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    y -= 14;
  } else {
    page1.drawText(
      "___________________________________, hereinafter referred to",
      {
        x: marginX,
        y: y,
        size: 10,
        font: bodyFont,
        color: rgb(0, 0, 0),
      },
    );
    y -= 14;
    page1.drawText("as the SECOND PARTY.", {
      x: marginX,
      y: y,
      size: 10,
      font: bodyFont,
      color: rgb(0, 0, 0),
    });
    y -= 14;
  }
  y -= 10;

  // Collectively referred to
  y = drawTextWrapped(
    page1,
    '(Hereinafter collectively referred to as the "Parties" and individually as a "Party").',
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // WITNESSETH
  page1.drawText("WITNESSETH:", {
    x: pageWidth / 2 - 50,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // WHEREAS clauses (before percentage clause)
  const whereasClauses1 = [
    "WHEREAS, the FIRST PARTY, is engaged in the business of construction and selling floating houses, among others, and the management of resorts.",
    "WHEREAS, the FIRST PARTY is in the process of construction of a new unit located within one of its resorts.",
  ];

  for (const clause of whereasClauses1) {
    y = drawTextWrapped(
      page1,
      clause,
      { x: marginX, y, size: 10, maxWidth: contentWidth },
      bodyFont,
    );
    y -= 15;
  }

  // WHEREAS clause with percentages (bold the purchased percentage)
  const purchasedPercent = formatPercentage(data.ownershipPercentage);
  const percentages = ["0.75", "1.5", "3", "6", "12.5", "25", "50", "100"];

  // First line
  page1.drawText(
    "WHEREAS, the FIRST PARTY offers for sale to interested individuals the ownership of these",
    {
      x: marginX,
      y: y,
      size: 10,
      font: bodyFont,
      color: rgb(0, 0, 0),
    },
  );
  y -= 14;

  // Second line - split into two lines to avoid overflow
  page1.drawText(
    "floating houses at the following percentages based on prevailing market value: ",
    {
      x: marginX,
      y: y,
      size: 10,
      font: bodyFont,
      color: rgb(0, 0, 0),
    },
  );
  y -= 14;

  // Third line - draw percentages on new line
  let currentX = marginX;

  // Draw each percentage, bolding the purchased one
  for (let i = 0; i < percentages.length; i++) {
    const percent = percentages[i]!;
    const isBold = percent === purchasedPercent;
    const font = isBold ? boldFont : bodyFont;
    const size = isBold ? 11 : 10;

    // Determine separator
    let separator = ", ";
    if (i === percentages.length - 1) {
      separator = ".";
    } else if (i === percentages.length - 2) {
      separator = " and ";
    }

    const text = `${percent}%${separator}`;

    page1.drawText(text, {
      x: currentX,
      y: y,
      size: size,
      font: font,
      color: rgb(0, 0, 0),
    });

    currentX += font.widthOfTextAtSize(text, size);
  }
  y -= 15;

  // Final WHEREAS clause
  y = drawTextWrapped(
    page1,
    "WHEREAS, the SECOND PARTY has accepted the offer of the FIRST PARTY.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // NOW THEREFORE
  y = drawTextWrapped(
    page1,
    "NOW, THEREFORE, in consideration of the mutual covenants and promises herein contained, the Parties hereby agree as follows:",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // I. OWNERSHIP
  page1.drawText("I. OWNERSHIP", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // I.1 - with bold/larger dynamic values
  const percentageOwned = formatPercentage(data.ownershipPercentage);

  page1.drawText(
    "I.1 The SECOND PARTY hereby confirms that they have already made a payment to the",
    {
      x: marginX,
      y: y,
      size: 10,
      font: bodyFont,
      color: rgb(0, 0, 0),
    },
  );
  y -= 14;

  page1.drawText("FIRST PARTY which is equivalent to ", {
    x: marginX,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  const equivalentTextWidth = bodyFont.widthOfTextAtSize(
    "FIRST PARTY which is equivalent to ",
    10,
  );

  // Bold purchase price
  page1.drawText(data.purchasePrice, {
    x: marginX + equivalentTextWidth,
    y: y,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  const priceWidth = boldFont.widthOfTextAtSize(data.purchasePrice, 11);

  page1.drawText(" (", {
    x: marginX + equivalentTextWidth + priceWidth,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  const parenWidth = bodyFont.widthOfTextAtSize(" (", 10);

  // Bold percentage
  page1.drawText(`${percentageOwned}%`, {
    x: marginX + equivalentTextWidth + priceWidth + parenWidth,
    y: y,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  const percentWidth = boldFont.widthOfTextAtSize(`${percentageOwned}%`, 11);

  page1.drawText(") of the available", {
    x: marginX + equivalentTextWidth + priceWidth + parenWidth + percentWidth,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  page1.drawText("Floating House.", {
    x: marginX,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  // ===== PAGE 2 =====
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - marginY;

  // I.2
  y = drawTextWrapped(
    page2,
    "I.2. Upon payment of the agreed selling price, the SECOND PARTY shall acquire ownership, either exclusively or jointly depending on the percentage of ownership purchased. In case the SECOND PARTY is a joint owner of the floating house, his or her name shall be included in the Roster of Owners.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // I.3
  y = drawTextWrapped(
    page2,
    "1.3. The FIRST PARTY shall make available to the SECOND PARTY the Roster of Owners online, which shall be accessible 24/7 through the FIRST PARTY's official website.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // II. MANAGEMENT
  page2.drawText("II. MANAGEMENT", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // II.1
  y = drawTextWrapped(
    page2,
    "II.1 The manager of the Floating House shall be determined in a separate written management agreement, which shall outline the rights, duties, compensation, and operational authority of the appointed manager.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // II.2
  y = drawTextWrapped(
    page2,
    "II.2 In the event that a Floating House unit is co-owned by two or more owners, no individual co-owner shall directly manage the unit. Management must be entrusted to a duly appointed manager pursuant to a separate management agreement.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // II.3
  y = drawTextWrapped(
    page2,
    "II.3 Any rental management company appointed by an owner or group of owners must be subject to the prior written agreement and approval of the Reef Resort management.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // II.4
  y = drawTextWrapped(
    page2,
    "II.4 A fixed monthly fee of Two Thousand Pesos (PHP 2,000.00) shall be applied to each unit within the resort for access to common areas, facilities, walkways, mooring systems, and related shared infrastructure, proportional to ownership percentage.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // III. EXPENSES AND MAINTENANCE
  page2.drawText("III. EXPENSES AND MAINTENANCE", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // III.1
  y = drawTextWrapped(
    page2,
    "III.1 All expenses related to the maintenance, repair, and operation of the Floating House shall be shared equally by the owners, unless otherwise agreed in writing.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // III.2
  y = drawTextWrapped(
    page2,
    "III.2 Common expenses shall include, but are not limited to, the following: repairs and maintenance, utilities, insurance, and taxes.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // III.3
  y = drawTextWrapped(
    page2,
    "III.3 The Resort Management will withhold funds from the owners' rental revenues or other income distributions to cover expenses such as repairs and maintenance, ensuring that all owners pay proportionally for relevant expenses.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 15;

  // III.4 - using dynamic monthly fee
  const monthlyFee = getMonthlyFee(data);
  y = drawTextWrapped(
    page2,
    `III.4 In reference to common facilities, including access to the walkways of the ${siteConfig.brand.name}, mooring system, and legal permits to occupy the waterspace, a monthly fee will be charged to unit owners in accordance with their ownership percentage, initially totalling ${monthlyFee}.`,
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // IV. DECISION MAKING
  page2.drawText("IV. DECISION MAKING", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // IV.1
  y = drawTextWrapped(
    page2,
    "IV.1 The SECOND PARTY may sell or transfer his/her interest in the Floating House to any third party of their choosing, without requiring approval from the other owners.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );

  // ===== PAGE 3 =====
  const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - marginY;

  // V. DISPUTE RESOLUTION
  page3.drawText("V. DISPUTE RESOLUTION", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // V.1
  y = drawTextWrapped(
    page3,
    `V.1. Disputes arising out of or in connection with this Agreement shall be resolved through amicable negotiations between the owners. If the dispute cannot be resolved through negotiations within 6 months, the FIRST PARTY shall act as the mediator. If no solution is found within an additional 6 months of mediation by the FIRST PARTY, the dispute shall then be submitted to the regular court proceedings in accordance with the laws of the ${siteConfig.location.country} and the exclusive venue thereof shall be in the ${siteConfig.location.jurisdiction}.`,
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // VI. SEPARABILITY CLAUSE
  page3.drawText("VI. SEPARABILITY CLAUSE", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // VI.1
  y = drawTextWrapped(
    page3,
    "VI.1 Should any of the above provisions be found contrary to laws the rest of the agreement shall remain valid and binding between the parties.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // VII. AMENDMENTS
  page3.drawText("VII. AMENDMENTS", {
    x: marginX,
    y: y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 20;

  // VII.1
  y = drawTextWrapped(
    page3,
    "VII.1 Any amendments to this Agreement must be made in writing and signed by both parties.",
    { x: marginX, y, size: 10, maxWidth: contentWidth },
    bodyFont,
  );
  y -= 25;

  // IN WITNESS WHEREOF with bold date
  const witnessDate = data.signDate
    ? data.signDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "___________________";

  page3.drawText("IN WITNESS WHEREOF, the parties affixed their hands this ", {
    x: marginX,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  const witnessTextWidth = bodyFont.widthOfTextAtSize(
    "IN WITNESS WHEREOF, the parties affixed their hands this ",
    10,
  );

  page3.drawText(` ${witnessDate}`, {
    x: marginX + witnessTextWidth,
    y: y,
    size: 11,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 14;

  page3.drawText(`in ${siteConfig.location.city}, ${siteConfig.location.country}.`, {
    x: marginX,
    y: y,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  y -= 50;

  // Signature section
  const signatureY = y;

  // Left side: First Party
  page3.drawText(siteConfig.company.legalName, {
    x: marginX,
    y: signatureY,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  page3.drawText("First Party", {
    x: marginX,
    y: signatureY - 15,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  page3.drawText("Represented by:", {
    x: marginX,
    y: signatureY - 45,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  // Add Mitchell's signature image if available
  if (mitchellSignature) {
    const sigDims = mitchellSignature.scale(0.15);
    page3.drawImage(mitchellSignature, {
      x: marginX,
      y: signatureY - 85,
      width: sigDims.width,
      height: sigDims.height,
    });
  }

  // Bold manager's name - using dynamic value
  page3.drawText(getManagerName(data), {
    x: marginX,
    y: signatureY - 95,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  // Manager position - using dynamic value
  page3.drawText(getManagerPosition(data), {
    x: marginX,
    y: signatureY - 110,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  // Right side: Second Party (placeholder for unsigned)
  const rightX = marginX + 280;

  page3.drawText("__________________________", {
    x: rightX,
    y: signatureY,
    size: 10,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  page3.drawText("Second Party", {
    x: rightX,
    y: signatureY - 15,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  return await pdfDoc.save();
}

/**
 * Generates a signed MOA PDF with signature embedded
 */
export async function generateSignedMoaPdf(
  data: MoaData & Required<Pick<MoaData, 'investorName' | 'signatureDataUrl' | 'signDate'>>,
): Promise<Uint8Array> {
  // First generate the unsigned template with investor name and date filled in
  const unsignedPdf = await generateUnsignedMoaPdf({
    ...data,
    signDate: data.signDate,
    investorName: data.investorName,
  });

  // Load the unsigned PDF
  const pdfDoc = await PDFDocument.load(unsignedPdf);
  const pages = pdfDoc.getPages();
  const page3 = pages[2]!; // Third page has signatures

  // Embed the signature image
  try {
    // Convert base64 data URL to raw base64
    const base64Data = data.signatureDataUrl.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid signature data URL");
    }

    // Determine image type and embed
    let signatureImage;
    if (data.signatureDataUrl.startsWith("data:image/png")) {
      signatureImage = await pdfDoc.embedPng(base64Data);
    } else if (
      data.signatureDataUrl.startsWith("data:image/jpeg") ||
      data.signatureDataUrl.startsWith("data:image/jpg")
    ) {
      signatureImage = await pdfDoc.embedJpg(base64Data);
    } else {
      throw new Error("Unsupported signature image format");
    }

    // Calculate signature position (right side, above "Second Party")
    const marginX = 72;
    const rightX = marginX + 280;
    const signatureY = 450;

    // Draw signature image
    const signatureDims = signatureImage.scale(0.25);
    page3.drawImage(signatureImage, {
      x: rightX,
      y: signatureY - 80,
      width: signatureDims.width,
      height: signatureDims.height,
    });

    // Add investor name below signature (bold, ALL CAPS)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    page3.drawText(data.investorName.toUpperCase(), {
      x: rightX,
      y: signatureY - 95,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  } catch (error) {
    console.error("Error embedding signature:", error);
  }

  return await pdfDoc.save();
}

/**
 * Helper function to convert PDF buffer to base64 for client preview
 */
export function pdfBufferToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString("base64");
}
