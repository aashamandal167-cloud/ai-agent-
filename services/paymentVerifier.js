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
  
