/**
 * ==========================================================
 * paymentBrain.js
 * ==========================================================
 * Raj AI Payment Brain
 * ==========================================================
 */

export class PaymentBrain {

    canHandle(state) {

        return state.stage === "PAYMENT";

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        // ==========================================
        // First Time Payment Request
        // ==========================================

        if (!state.paymentRequested) {

            return this.requestPayment(state);

        }

        // ==========================================
        // Customer says Payment Done
        // ==========================================

        if (

            message.includes("paid") ||

            message.includes("payment") ||

            message.includes("done") ||

            message.includes("transfer") ||

            message.includes("upi") ||

            message.includes("sent") ||

            message.includes("screenshot") ||

            message.includes("successful")

        ) {

            return this.confirmPayment(state);

        }

        // ==========================================
        // Customer asks Payment Method
        // ==========================================

        if (

            message.includes("upi") ||

            message.includes("qr") ||

            message.includes("account") ||

            message.includes("payment")

        ) {

            return this.sendPaymentDetails(state);

        }

        return this.fallback();

    }

    // ==========================================
    // Request Payment
    // ==========================================

    requestPayment(state) {

        state.paymentRequested = true;

        return {

            reply:

`Sir 😊

Project start karne ke liye sirf 50% advance payment dena hoga.

Payment milte hi main turant aapki website par kaam start kar dunga.

Agar aap ready hain to main UPI / QR Code bhej deta hoon.`,

            nextStage: "PAYMENT",

            nextBrain: "paymentBrain"

        };

        }


    // ==========================================
    // Send Payment Details
    // ==========================================

    sendPaymentDetails(state) {

        return {

            reply:

`Sir 😊

Payment karne ke liye details ye hain.

💳 UPI ID:
your-upi@okaxis

Ya

📷 QR Code scan karke payment kar sakte hain.

Payment hone ke baad screenshot bhej dijiye.

Main turant project start kar dunga. 🙂`,

            nextStage: "PAYMENT",

            nextBrain: "paymentBrain"

        };

    }

    // ==========================================
    // Confirm Payment
    // ==========================================

    confirmPayment(state) {

        state.paymentReceived = true;

        return {

            reply:

`Bahut bahut dhanyawad Sir ❤️

Aapka payment receive ho gaya.

Ab main turant aapki website banana start kar raha hoon.

Main time-time par aapko progress update bhi deta rahunga.

Dhanyawad, aapne Raj AI Web Services par trust kiya. 🙏`,

            nextStage: "FOLLOWUP",

            nextBrain: "followupBrain"

        };

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback() {

        return {

            reply:

`Ji Sir 🙂

Agar payment ya UPI se related koi bhi question ho to poochh sakte hain.

Main aapki poori help karunga.`,

            nextStage: "PAYMENT",

            nextBrain: "paymentBrain"

        };

    }

}

export default new PaymentBrain();
