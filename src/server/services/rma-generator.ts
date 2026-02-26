import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

/**
 * RMA Generator Service
 * Creates Rental Management Agreement PDFs matching the official document
 * for ARK-MARINE CONSTRUCTION, INC. (Reef Resort)
 */

export interface RmaData {
  purchaseDate: Date;
  ownerName?: string; // Full name (optional for unsigned template)
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
 * Returns the Y position after drawing (below the last line)
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
 * Format a date for display in the RMA
 */
function formatDate(date: Date): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Context object to track current page and Y position across page breaks
 */
interface DrawContext {
  pdfDoc: PDFDocument;
  currentPage: PDFPage;
  y: number;
  marginX: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  bodyFont: PDFFont;
  boldFont: PDFFont;
  italicFont: PDFFont;
}

/**
 * Ensure enough space on the page, adding a new page if needed
 */
function ensureSpace(ctx: DrawContext, needed: number): void {
  if (ctx.y < needed + 60) {
    ctx.currentPage = ctx.pdfDoc.addPage([ctx.pageWidth, ctx.pageHeight]);
    ctx.y = ctx.pageHeight - 60;
  }
}

/**
 * Draw a section title (bold) with auto page break
 */
function drawSectionTitle(ctx: DrawContext, title: string): void {
  ensureSpace(ctx, 30);
  ctx.y = drawTextWrapped(
    ctx.currentPage,
    title,
    { x: ctx.marginX, y: ctx.y, size: 10, font: ctx.boldFont, maxWidth: ctx.contentWidth },
    ctx.bodyFont,
  );
  ctx.y -= 5;
}

/**
 * Draw a body paragraph with auto page break
 */
function drawParagraph(ctx: DrawContext, text: string, indent = 0): void {
  ensureSpace(ctx, 30);
  ctx.y = drawTextWrapped(
    ctx.currentPage,
    text,
    {
      x: ctx.marginX + indent,
      y: ctx.y,
      size: 9,
      font: ctx.bodyFont,
      maxWidth: ctx.contentWidth - indent,
      lineHeight: 13,
    },
    ctx.bodyFont,
  );
  ctx.y -= 5;
}

/**
 * Draw a bold+body inline paragraph (title on its own line, then body)
 */
function drawClause(ctx: DrawContext, number: string, body: string, indent = 0): void {
  ensureSpace(ctx, 30);
  ctx.y = drawTextWrapped(
    ctx.currentPage,
    number,
    {
      x: ctx.marginX + indent,
      y: ctx.y,
      size: 9,
      font: ctx.boldFont,
      maxWidth: ctx.contentWidth - indent,
      lineHeight: 13,
    },
    ctx.bodyFont,
  );
  ctx.y -= 2;
  drawParagraph(ctx, body, indent);
}

/**
 * Generate an unsigned RMA PDF for preview
 */
export async function generateUnsignedRmaPdf(
  data: RmaData,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Try to embed logo
  let logoImage;
  try {
    const logoPath = path.join(process.cwd(), "public", "Logo.png");
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch {
    // Logo embedding is optional
  }

  // Load manager signature
  let managerSignature;
  try {
    const signaturePath = path.join(process.cwd(), "public", "signature", "mitchell_signature.png");
    const signatureBytes = fs.readFileSync(signaturePath);
    managerSignature = await pdfDoc.embedPng(signatureBytes);
  } catch {
    // Signature embedding is optional
  }

  const marginX = 72;
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - marginX * 2;

  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 60;

  const ctx: DrawContext = {
    pdfDoc,
    currentPage: page1,
    y,
    marginX,
    pageWidth,
    pageHeight,
    contentWidth,
    bodyFont,
    boldFont,
    italicFont,
  };

  // ===== HEADER =====
  if (logoImage) {
    const logoDims = logoImage.scale(0.15);
    ctx.currentPage.drawImage(logoImage, {
      x: (pageWidth - logoDims.width) / 2,
      y: ctx.y - logoDims.height,
      width: logoDims.width,
      height: logoDims.height,
    });
    ctx.y -= logoDims.height + 15;
  }

  // Title
  const title = "RENTAL MANAGEMENT AGREEMENT";
  const titleWidth = boldFont.widthOfTextAtSize(title, 14);
  ctx.currentPage.drawText(title, {
    x: (pageWidth - titleWidth) / 2,
    y: ctx.y,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 25;

  // ===== PREAMBLE =====
  const agreementDate = formatDate(data.purchaseDate);
  drawParagraph(ctx,
    `This Rental Management Agreement ("Agreement") is made and entered into on ${agreementDate}, by and between:`
  );
  ctx.y -= 5;

  // First Party
  drawParagraph(ctx,
    'ARK-MARINE CONSTRUCTION, INC., a corporation duly organized and existing under the laws of the Republic of the Philippines, operating under the business name "REEF RESORT," with principal place of business in Samal Island, Philippines, herein represented by its authorized representative, hereinafter referred to as the "MANAGER";'
  );
  ctx.y -= 3;

  // -and-
  const andText = "-and-";
  const andWidth = bodyFont.widthOfTextAtSize(andText, 9);
  ctx.currentPage.drawText(andText, {
    x: (pageWidth - andWidth) / 2,
    y: ctx.y,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 15;

  // Second Party (Owner) — dynamic
  const ownerDisplay = data.ownerName ?? "______________________________";
  drawParagraph(ctx,
    `${ownerDisplay}, hereinafter referred to as the "OWNER."`
  );
  ctx.y -= 3;

  drawParagraph(ctx,
    '(The MANAGER and OWNER may collectively be referred to as the "Parties.")'
  );
  ctx.y -= 8;

  // WITNESSETH
  ctx.currentPage.drawText("WITNESSETH:", {
    x: marginX,
    y: ctx.y,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 18;

  // WHEREAS clauses
  drawParagraph(ctx,
    "WHEREAS, the OWNER is the legal owner or co-owner of a floating house unit located within the Reef Resort property;"
  );
  ctx.y -= 3;

  drawParagraph(ctx,
    "WHEREAS, the OWNER desires to have the unit leased to third parties for short-term or long-term rental purposes;"
  );
  ctx.y -= 3;

  drawParagraph(ctx,
    "WHEREAS, the MANAGER is engaged in the business of resort operations, property leasing, and management services;"
  );
  ctx.y -= 3;

  drawParagraph(ctx,
    "NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, the Parties agree as follows:"
  );
  ctx.y -= 10;

  // ===== SECTION I =====
  drawSectionTitle(ctx, "I. APPOINTMENT OF MANAGER");
  ctx.y -= 3;

  drawClause(ctx, "1.1",
    'The OWNER hereby appoints ARK-MARINE CONSTRUCTION, INC., operating under the name "Reef Resort," as the exclusive rental manager of the floating house unit.'
  );

  drawClause(ctx, "1.2",
    "The MANAGER is authorized to market, advertise, lease, and manage the unit on behalf of the OWNER, including determining rental rates, occupancy schedules, booking terms, and guest policies."
  );
  ctx.y -= 5;

  // ===== SECTION II =====
  drawSectionTitle(ctx, "II. MANAGEMENT FEE");
  ctx.y -= 3;

  drawClause(ctx, "2.1",
    "In consideration for management services, the MANAGER shall receive EIGHT PERCENT (8%) of the gross rental revenue as a management fee."
  );

  drawClause(ctx, "2.2",
    "The management fee shall be automatically deducted from rental proceeds prior to distribution to the OWNER."
  );
  ctx.y -= 5;

  // ===== SECTION III =====
  drawSectionTitle(ctx, "III. EXPENSES AND DEDUCTIONS");
  ctx.y -= 3;

  drawClause(ctx, "3.1",
    "All operating expenses shall be deducted from gross rental revenues prior to any distribution to the OWNER. These expenses include, but are not limited to:"
  );

  const expenses = [
    "a. Repairs and maintenance;",
    "b. Cleaning and turnover services;",
    "c. Utilities;",
    "d. Insurance;",
    "e. Taxes;",
    "f. Administrative and operational costs;",
    "g. The monthly common areas fee charged by the resort.",
  ];
  for (const expense of expenses) {
    ensureSpace(ctx, 15);
    ctx.y = drawTextWrapped(
      ctx.currentPage,
      expense,
      { x: marginX + 20, y: ctx.y, size: 9, font: bodyFont, maxWidth: contentWidth - 20, lineHeight: 13 },
      bodyFont,
    );
    ctx.y -= 2;
  }
  ctx.y -= 3;

  drawClause(ctx, "3.2",
    "The monthly common areas fee is currently set at Two Thousand Pesos (PHP 2,000.00) per unit and shall be deducted from revenues."
  );

  drawClause(ctx, "3.3",
    "After deduction of all operating expenses described above, and after deduction of the 8% management fee, the remaining balance shall constitute the net distributable income payable to the OWNER."
  );
  ctx.y -= 5;

  // ===== SECTION IV =====
  drawSectionTitle(ctx, "IV. REPAIRS, MAINTENANCE, AND UPGRADES");
  ctx.y -= 3;

  drawClause(ctx, "4.1",
    "The MANAGER shall have sole discretion to determine when the unit requires repairs, maintenance, replacement of equipment, or upgrades necessary to maintain safety, habitability, marketability, and resort standards."
  );

  drawClause(ctx, "4.2",
    "The MANAGER is authorized to arrange and contract for such repairs, maintenance, or upgrades without prior approval from the OWNER when deemed necessary for operational continuity or safety."
  );

  drawClause(ctx, "4.3",
    "The MANAGER may withhold funds that would otherwise be disbursed to the OWNER in order to cover the cost of repairs, maintenance, replacements, or upgrades."
  );

  drawClause(ctx, "4.4",
    "If rental income is insufficient to cover required expenses, the OWNER agrees to remit additional funds upon written notice from the MANAGER."
  );
  ctx.y -= 5;

  // ===== SECTION V =====
  drawSectionTitle(ctx, "V. ACCOUNTING AND DISTRIBUTION");
  ctx.y -= 3;

  drawClause(ctx, "5.1",
    "The MANAGER shall provide periodic accounting statements detailing:"
  );

  const accountingItems = [
    "a. Gross rental revenue;",
    "b. Management fee deductions;",
    "c. Operating expense deductions;",
    "d. Common area fee deductions;",
    "e. Net amount payable to the OWNER.",
  ];
  for (const item of accountingItems) {
    ensureSpace(ctx, 15);
    ctx.y = drawTextWrapped(
      ctx.currentPage,
      item,
      { x: marginX + 20, y: ctx.y, size: 9, font: bodyFont, maxWidth: contentWidth - 20, lineHeight: 13 },
      bodyFont,
    );
    ctx.y -= 2;
  }
  ctx.y -= 3;

  drawClause(ctx, "5.2",
    "Distributions of net income shall be made after all deductions described in this Agreement."
  );
  ctx.y -= 5;

  // ===== SECTION VI =====
  drawSectionTitle(ctx, "VI. TERM AND TERMINATION");
  ctx.y -= 3;

  drawClause(ctx, "6.1",
    "This Agreement shall remain in effect unless terminated by mutual written consent of the Parties."
  );

  drawClause(ctx, "6.2",
    "In the event of termination, outstanding expenses and fees shall be settled prior to final disbursement of funds."
  );
  ctx.y -= 5;

  // ===== SECTION VII =====
  drawSectionTitle(ctx, "VII. GOVERNING LAW");
  ctx.y -= 3;

  drawClause(ctx, "7.1",
    "This Agreement shall be governed by and construed in accordance with the laws of the Republic of the Philippines."
  );
  ctx.y -= 5;

  // ===== SECTION VIII =====
  drawSectionTitle(ctx, "VIII. ENTIRE AGREEMENT");
  ctx.y -= 3;

  drawClause(ctx, "8.1",
    "This Agreement constitutes the entire agreement between the Parties concerning rental management and supersedes all prior understandings relating thereto."
  );
  ctx.y -= 10;

  // ===== SIGNATURE PAGE =====
  // Always start signatures on a new page for clean layout
  const signPage = pdfDoc.addPage([pageWidth, pageHeight]);
  ctx.currentPage = signPage;
  ctx.y = pageHeight - 80;

  ctx.y = drawTextWrapped(
    signPage,
    "IN WITNESS WHEREOF, the Parties have hereunto affixed their signatures on the date first above written.",
    { x: marginX, y: ctx.y, size: 10, font: bodyFont, maxWidth: contentWidth },
    bodyFont,
  );
  ctx.y -= 40;

  // --- Manager (left side) ---
  signPage.drawText("ARK-MARINE CONSTRUCTION, INC.", {
    x: marginX,
    y: ctx.y,
    size: 9,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 13;

  signPage.drawText('Operating as REEF RESORT', {
    x: marginX,
    y: ctx.y,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 25;

  // Manager signature image
  if (managerSignature) {
    const sigDims = managerSignature.scale(0.2);
    signPage.drawImage(managerSignature, {
      x: marginX,
      y: ctx.y - sigDims.height,
      width: sigDims.width,
      height: sigDims.height,
    });
  }

  // "By:" label
  signPage.drawText("By: ___________________________", {
    x: marginX,
    y: ctx.y - 5,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 20;

  signPage.drawText("Name: _________________________", {
    x: marginX,
    y: ctx.y,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });
  ctx.y -= 15;

  signPage.drawText("Title: _________________________", {
    x: marginX,
    y: ctx.y,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  // --- Owner (right side) ---
  const rightX = marginX + 280;
  const sigBlockStartY = pageHeight - 80 - 50; // after the witness text

  signPage.drawText("OWNER", {
    x: rightX,
    y: sigBlockStartY,
    size: 10,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  signPage.drawText("Signature: _______________________", {
    x: rightX,
    y: sigBlockStartY - 50,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  const ownerNameLine = data.ownerName
    ? `Name: ${data.ownerName}`
    : "Name: ____________________________";
  signPage.drawText(ownerNameLine, {
    x: rightX,
    y: sigBlockStartY - 70,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  const signDateStr = data.signDate
    ? `Date: ${formatDate(data.signDate)}`
    : "Date: ___________________________";
  signPage.drawText(signDateStr, {
    x: rightX,
    y: sigBlockStartY - 90,
    size: 9,
    font: bodyFont,
    color: rgb(0, 0, 0),
  });

  return await pdfDoc.save();
}

/**
 * Generate a signed RMA PDF with signature embedded
 */
export async function generateSignedRmaPdf(
  data: RmaData & Required<Pick<RmaData, "ownerName" | "signatureDataUrl" | "signDate">>,
): Promise<Uint8Array> {
  // Generate the base document with the owner name filled in
  const basePdfBuffer = await generateUnsignedRmaPdf(data);

  // Load the generated PDF and add signature
  const pdfDoc = await PDFDocument.load(basePdfBuffer);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1]!;

  const marginX = 72;
  const rightX = marginX + 280;
  const pageHeight = 792;
  const sigBlockStartY = pageHeight - 80 - 50;

  // Embed signature image
  try {
    const base64Data = data.signatureDataUrl.split(",")[1]!;

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

    // Draw signature image above the "Signature:" line
    const signatureDims = signatureImage.scale(0.25);
    lastPage.drawImage(signatureImage, {
      x: rightX,
      y: sigBlockStartY - 45,
      width: signatureDims.width,
      height: signatureDims.height,
    });

    // Overlay the owner name on the "Name:" line
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    lastPage.drawText(data.ownerName.toUpperCase(), {
      x: rightX + 45,
      y: sigBlockStartY - 70,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
  } catch (error) {
    console.error("Error embedding RMA signature:", error);
  }

  return await pdfDoc.save();
}

/**
 * Helper function to convert PDF buffer to base64 for client preview
 */
export function rmaPdfBufferToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString("base64");
}
