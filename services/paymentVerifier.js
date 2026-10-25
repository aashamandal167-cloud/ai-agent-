// services/paymentVerifier.js
// Customer ka bheja hua image dekhkar bata'ta hai ki image kya hai aur agar payment
// screenshot hai to uski details. Kai AI providers try karta hai (llmClient.js).
import { callLLM, hasBackupProvider } from "./llmClient.js";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function extractPaymentInfo(imageBuffer, mimeType) {

  if (!imageBuffer || !imageBuffer.length) {
    return "Image khali ya kharab thi, padh nahi paya.";
  }

  if (!hasBackupProvider()) {
    return "AI key set nahi hai (ANTHROPIC_API_KEY / LLM_API_KEY / GEMINI_API_KEY), image padh nahi paya. Screenshot khud dekhein.";
  }

  let mime = String(mimeType || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) mime = "image/jpeg";

  const expectedUpi = process.env.RAJ_UPI_ID || "rr9566735-1@okaxis";
  const expectedHolder = process.env.RAJ_ACCOUNT_HOLDER || "";

  const system = `
Tum ek payment screenshot checker ho. Tumhe ek image di jayegi. Sirf wahi likho jo image mein saaf dikhta hai - andaza ya kalpana mat karo. Jo cheez na dikhe uske liye "nahi dikha" likho.

Jawab is format mein, plain text (markdown nahi), Hinglish mein, chhota:

IMAGE KYA HAI: (UPI payment screenshot / bank transfer receipt / kuch aur - ek line mein batao ki image mein kya hai)
STATUS: (Success / Failed / Pending / nahi dikha)
AMOUNT: (rupaye)
KISKO PAID: (naam ya UPI ID)
KISNE PAID: (naam / UPI ID / app)
DATE-TIME: 
TRANSACTION/UTR ID: 
MATCH CHECK: hamari UPI ID "${expectedUpi}"${expectedHolder ? ` aur account holder "${expectedHolder}"` : ""} se receiver match karta hai? (Haan / Nahi / Pata nahi)
SHAK: agar screenshot edited, kata-chhata, dhundhla ya fake lage to likho, warna "Koi shak nahi dikha".

Agar image payment screenshot nahi hai to sirf IMAGE KYA HAI mein batao ki usme kya hai, baaki "lagu nahi" likho.
`.trim();

  try {
    const { text, provider } = await callLLM({
      system,
      messages: [{ role: "user", content: "Is image ko dekho aur format mein batao." }],
      image: { base64: imageBuffer.toString("base64"), mime },
      maxTokens: 500,
      timeoutMs: 12000
    });

    console.log(`PAYMENT IMAGE READ via ${provider}`);
    return text;

  } catch (err) {
    console.log("PAYMENT IMAGE READ FAILED:", err.message);
    return "AI services abhi busy hain, image padh nahi paya. Screenshot khud dekhkar confirm karein.";
  }
}

// ---------------------------------------------------------------------------
// analyzeCustomerImage: image dekhkar batao ki wo KYA hai (payment screenshot /
// website reference / business photo / kuch aur) + payment ki details.
// Return object: { type, status, amount, date, summaryText, suspicious, unavailable }
// ---------------------------------------------------------------------------
export async function analyzeCustomerImage(imageBuffer, mimeType, { expectedAmount = null } = {}) {

  const fallback = { type: "unknown", status: "unknown", amount: null, date: null, summaryText: "", suspicious: "", unavailable: true };

  if (!imageBuffer || !imageBuffer.length || !hasBackupProvider()) {
    return { ...fallback, summaryText: "AI image padh nahi paya (key set nahi ya image khali). Screenshot khud dekhein." };
  }

  let mime = String(mimeType || "image/jpeg").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME.includes(mime)) mime = "image/jpeg";

  const expectedUpi = process.env.RAJ_UPI_ID || "rr9566735-1@okaxis";

  const system = `
You inspect ONE image sent by a customer on WhatsApp to a website-development seller. Reply with ONLY a JSON object (no markdown, no extra text):
{
 "type": "payment_screenshot" | "website_reference" | "business_photo" | "other",
 "summary": "ek ya do chhoti Hinglish lines: image mein kya dikh raha hai",
 "status": "success" | "failed" | "pending" | "unknown",
 "amount": number or null,
 "date": "YYYY-MM-DD" or null,
 "paid_to": "naam ya UPI ID ya null",
 "paid_by": "naam ya app ya null",
 "txn_id": "UTR/transaction id ya null",
 "receiver_matches_expected": "yes" | "no" | "unknown",
 "suspicious": "chhota reason agar edited/fake/kata hua lage, warna empty string"
}
Meaning of "type":
- payment_screenshot = UPI/GPay/PhonePe/Paytm/bank transfer receipt or screenshot of a money transfer.
- website_reference = screenshot/photo of ANOTHER website or app design the customer wants to copy.
- business_photo = photo of the customer's shop, products, staff, board, interior etc.
- other = anything else (selfie, random photo, document, unreadable).
Only write what is clearly visible. Never guess amounts or dates. Expected receiver UPI ID: "${expectedUpi}". Expected advance amount (if known): ${expectedAmount || "unknown"}.
`.trim();

  try {
    const { text, provider } = await callLLM({
      system,
      messages: [{ role: "user", content: "Is image ko dekho aur sirf JSON do." }],
      image: { base64: imageBuffer.toString("base64"), mime },
      maxTokens: 500,
      timeoutMs: 12000
    });

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const data = JSON.parse(text.slice(start, end + 1));

    const types = ["payment_screenshot", "website_reference", "business_photo", "other"];
    const type = types.includes(data.type) ? data.type : "other";
    const amount = typeof data.amount === "number" && isFinite(data.amount) ? data.amount : null;

    const lines = [
      `IMAGE KYA HAI: ${data.summary || type}`,
      type === "payment_screenshot" ? `STATUS: ${data.status || "nahi dikha"}` : null,
      type === "payment_screenshot" ? `AMOUNT: ${amount != null ? amount : "nahi dikha"}` : null,
      type === "payment_screenshot" ? `KISKO PAID: ${data.paid_to || "nahi dikha"}` : null,
      type === "payment_screenshot" ? `KISNE PAID: ${data.paid_by || "nahi dikha"}` : null,
      type === "payment_screenshot" ? `DATE: ${data.date || "nahi dikha"}` : null,
      type === "payment_screenshot" ? `TXN/UTR ID: ${data.txn_id || "nahi dikha"}` : null,
      type === "payment_screenshot" ? `RECEIVER MATCH: ${data.receiver_matches_expected || "unknown"}` : null,
      `SHAK: ${data.suspicious || "Koi shak nahi dikha"}`
    ].filter(Boolean);

    console.log(`IMAGE ANALYZED via ${provider}: ${type}`);

    return {
      type,
      status: ["success", "failed", "pending"].includes(data.status) ? data.status : "unknown",
      amount,
      date: typeof data.date === "string" ? data.date : null,
      summaryText: lines.join("\n"),
      suspicious: data.suspicious || "",
      unavailable: false
    };

  } catch (err) {
    console.log("IMAGE ANALYSIS FAILED:", err.message);
    return { ...fallback, summaryText: "AI services abhi busy hain, image padh nahi paya. Screenshot khud dekhkar confirm karein." };
  }
    }
        
