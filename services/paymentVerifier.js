/**
 * ==========================================================
 * paymentVerifier.js
 * ==========================================================
 * Uses Gemini Vision to read a payment screenshot and extract
 * the amount + recipient name shown in it. This does NOT
 * replace real payment gateway verification - it's a
 * best-effort visibility layer so Rahul can quickly cross-
 * check against his own UPI/bank app before starting work.
 * ==========================================================
 */

import ai from "../config/gemini.js";

export async function extractPaymentInfo(imgBuffer, mimeType) {

  try {

    const base64Data = imgBuffer.toString("base64");

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: base64Data
              }
            },
            {
              text: `This is a payment screenshot. Extract ONLY the following as plain text, one per line, nothing else:
Amount: <the rupee amount shown, numbers only, no currency symbol>
RecipientName: <the name of the person/account the money was paid TO>
Status: <"success" if it shows a successful/completed payment, "unclear" otherwise>

If you cannot find a value, write "unknown" for that field.`
            }
          ]
        }
      ]
    });

    const text =
      result.text ||
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "";

    return text.trim();

  } catch (err) {
    console.log("PAYMENT VERIFY EXCEPTION:", err.message);
    return null;
  }

      }
      
