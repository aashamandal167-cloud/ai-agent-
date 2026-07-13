/**
 * ==========================================================
 * dealBrain.js
 * ==========================================================
 * Raj AI Deal Brain
 * ==========================================================
 */

import pricingKnowledge from "../knowledge/pricingKnowledge.js";

export class DealBrain {

    canHandle(state) {

        return (
            state.stage === "CATEGORY" ||
            state.stage === "DEAL"
        );

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        // ==========================================
        // Category Selection
        // ==========================================

        if (!state.selectedCategory) {

            return this.detectCategory(state, message);

        }

        // ==========================================
        // Customer asks Price
        // ==========================================

        if (

            message.includes("price") ||

            message.includes("kitna") ||

            message.includes("kitne") ||

            message.includes("cost") ||

            message.includes("charge") ||

            message.includes("rate")

        ) {

            return this.showPrice(state);

        }

        // ==========================================
        // Fallback
        // ==========================================

        return this.fallback(state);

    }

    // ==========================================
    // Detect Category
    // ==========================================

    detectCategory(state, message) {

        if (message.includes("template")) {

            state.selectedCategory = "templateWebsite";

        }

        else if (message.includes("3d")) {

            state.selectedCategory = "premium3D";

        }

        else if (message.includes("animated")) {

            state.selectedCategory = "animatedPremium";

        }

        else {

            return this.fallback(state);

        }

        const pack = pricingKnowledge[state.selectedCategory];

        return {

            reply:

`Sir 😊

Bahut badhiya choice.

Aapne "${pack.name}" choose kiya hai.

${pack.appreciation}

Agar aap is package ki price ya aur details jana chahte hain to zarur batayiye.`,

            nextStage: "DEAL",

            nextBrain: "dealBrain"

        };

    }

      // ==========================================
    // Show Price
    // ==========================================

    showPrice(state) {

        const pack = pricingKnowledge[state.selectedCategory];

        return {

            reply:

`Sir 😊

${pack.name} ka price matra ₹${pack.originalPrice.toLocaleString("en-IN")} hai.

Is package me ye sab include rahega:

${pack.features.map(feature => `✅ ${feature}`).join("\n")}

Agar aapko price ya payment ke baare me baat karni hai to main zarur help karunga.`,

            nextStage: "NEGOTIATION",

            nextBrain: "negotiationBrain"

        };

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback(state) {

        if (!state.selectedCategory) {

            return {

                reply:

`Sir 😊

Inme se kaunsi website category aapko pasand aayi?

1️⃣ Template Website

2️⃣ 3D Premium Website

3️⃣ Animated Premium Website`,

                nextStage: "CATEGORY",

                nextBrain: "dealBrain"

            };

        }

        return {

            reply:

`Sir 😊

Agar aap is package ka price ya koi aur detail jana chahte hain to bina jhijhak puchhiye.`,

            nextStage: "DEAL",

            nextBrain: "dealBrain"

        };

    }

}

export default new DealBrain();
