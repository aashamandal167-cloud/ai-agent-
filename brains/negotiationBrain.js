/**
 * ==========================================================
 * negotiationBrain.js
 * ==========================================================
 * Raj AI Negotiation Brain
 * ==========================================================
 */

import pricingKnowledge from "../knowledge/pricingKnowledge.js";

export class NegotiationBrain {

    canHandle(state) {

        return state.stage === "NEGOTIATION";

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        const pack = pricingKnowledge[state.selectedCategory];

        // ==========================================
        // First Price Offer
        // ==========================================

        if (!state.negotiationStep) {

            state.negotiationStep = 1;

            return {

                reply:
`Sir 😊

${pack.name} ka original price ₹${pack.originalPrice.toLocaleString("en-IN")} hai.

Lekin aapke liye pehla discount dekar ₹${pack.negotiation.firstOffer.toLocaleString("en-IN")} me kar dunga.`,

                nextStage: "NEGOTIATION",

                nextBrain: "negotiationBrain"

            };

        }

        // ==========================================
        // Customer says Expensive
        // ==========================================

        if (

            message.includes("mahenga") ||

            message.includes("expensive") ||

            message.includes("jyada") ||

            message.includes("kam karo")

        ) {

            return this.handleDiscount(state, pack);

        }

        // ==========================================
        // Customer gives own Budget
        // ==========================================

        const amount = this.extractAmount(message);

        if (amount) {

            return this.handleBudget(state, pack, amount);

        }

        // ==========================================
        // Customer accepts
        // ==========================================

        if (

            message.includes("thik") ||

            message.includes("deal") ||

            message.includes("ready") ||

            message.includes("banaiye") ||

            message.includes("kar dijiye")

        ) {

            return {

                reply:
`Bahut dhanyawad Sir 😊

Ab sirf half payment karke hum turant aapka project start kar denge.`,

                nextStage: "PAYMENT",

                nextBrain: "paymentBrain"

            };

        }

        return this.fallback(pack);

                             }
      // ==========================================
    // Handle Discount
    // ==========================================

    handleDiscount(state, pack) {

        state.negotiationStep++;

        const offers = pack.negotiation;

        switch (state.negotiationStep) {

            case 2:
                return {
                    reply:
`Sir 😊

Koi baat nahi.

Aapke liye ₹${offers.secondOffer.toLocaleString("en-IN")} me kar deta hoon.

Ye bhi special discount hai sir.`,

                    nextStage: "NEGOTIATION",
                    nextBrain: "negotiationBrain"
                };

            case 3:
                return {
                    reply:
`Sir 😊

Aapne bahut achha package choose kiya hai.

Main aur kam karke ₹${offers.thirdOffer.toLocaleString("en-IN")} me kar deta hoon.`,

                    nextStage: "NEGOTIATION",
                    nextBrain: "negotiationBrain"
                };

            case 4:
                return {
                    reply:
`Sir 😊

Ye mera almost last offer hai.

₹${offers.fourthOffer.toLocaleString("en-IN")} me final kar deta hoon.`,

                    nextStage: "NEGOTIATION",
                    nextBrain: "negotiationBrain"
                };

            default:
                return {
                    reply:
`Sir 😊

Isse niche normal discount possible nahi hai.

Agar aapka koi budget hai to batayiye, main dekh leta hoon ki usme kuch ho sakta hai ya nahi.`,

                    nextStage: "NEGOTIATION",
                    nextBrain: "negotiationBrain"
                };

        }

    }

    // ==========================================
    // Handle Customer Budget
    // ==========================================

    handleBudget(state, pack, amount) {

        if (amount >= pack.negotiation.finalPrice) {

            return {

                reply:
`Sir 😊

Theek hai.

₹${amount.toLocaleString("en-IN")} me deal final kar dete hain.

Bas half payment kar dijiye, uske baad main turant website banana start kar dunga.`,

                nextStage: "PAYMENT",
                nextBrain: "paymentBrain"

            };

        }

        return {

            reply:
`Sir 😊

Itne budget me website banana possible nahi hoga.

Sir is website ko banane me paid software, premium tools aur kaafi mehnat lagti hai.

Main already bahut kam margin me kaam kar raha hoon.

Agar aap ₹${pack.negotiation.finalPrice.toLocaleString("en-IN")} tak aa sakein to main aapke liye website bana dunga.

Isse niche jana mere liye possible nahi hai.`,

            nextStage: "NEGOTIATION",
            nextBrain: "negotiationBrain"

        };

    }

    // ==========================================
    // Extract Amount
    // ==========================================

    extractAmount(message) {

        const match = message.match(/\d+/);

        if (!match) return null;

        let amount = parseInt(match[0]);

        if (message.includes("k")) {
            amount *= 1000;
        }

        return amount;

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback(pack) {

        return {

            reply:
`Sir 😊

Agar price ya budget ko lekar koi doubt hai to bina jhijhak batayiye.

Main aapke budget ke hisaab se best possible solution dene ki poori koshish karunga.`,

            nextStage: "NEGOTIATION",
            nextBrain: "negotiationBrain"

        };

    }

}

export default new NegotiationBrain();
