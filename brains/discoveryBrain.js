/**
 * ==========================================================
 * discoveryBrain.js
 * ==========================================================
 * Raj AI Discovery Brain
 * ==========================================================
 */

import knowledgeManager from "../services/knowledgeManager.js";

export class DiscoveryBrain {

    canHandle(state) {

        return (
            state.stage === "DISCOVERY" ||
            !state.stage
        );

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        // ==========================================
        // First Message
        // ==========================================

        if (!state.firstMessageSent) {

            state.firstMessageSent = true;

            return this.sendFirstMessage(state);

        }

        // ==========================================
        // No Reply Follow-up
        // ==========================================

        if (!state.replied && state.followupCount < 2) {

            return this.sendFollowup(state);

        }

        // ==========================================
        // Greeting
        // ==========================================

        if (
            message.includes("hi") ||
            message.includes("hello") ||
            message.includes("haan") ||
            message.includes("ha") ||
            message.includes("ji") ||
            message.includes("yes")
        ) {

            return this.greetCustomer(state);

        }

        // ==========================================
        // Permission
        // ==========================================

        if (
            message.includes("bolo") ||
            message.includes("batao") ||
            message.includes("kahiye") ||
            message.includes("continue")
        ) {

            return this.askPermission(state);

        }

        // ==========================================
        // Business Discussion
        // ==========================================

        if (!state.problem) {

            return this.askBusinessProblem(state);

        }

        // ==========================================
        // Story Permission
        // ==========================================

        return this.askStoryPermission(state);

    }

    // ==========================================
    // First WhatsApp Message
    // ==========================================

    sendFirstMessage(state) {

        return {

            reply:

`Hello Sir 😊

Mera naam Raj Chandravanshi hai.

Main businesses ke liye professional websites banata hoon.

Maine Google Maps par aapka business dekha.

Business:
${state.business || "Your Business"}

City:
${state.city || "Your City"}

Sir, main website bechne ke liye force nahi kar raha.

Bas 2 minute denge to ek chhoti si baat share karna chahta hoon 🙂`,

            nextStage: "DISCOVERY",

            nextBrain: "discoveryBrain"

        };

    }

    // ==========================================
    // Follow-up Message
    // ==========================================

    sendFollowup(state) {

        state.followupCount++;

        return {

            reply:

`Sir 😊

Bas ek baar reply kar dijiye.

Main ye nahi keh raha ki website zarur banwaiye.

Sirf 2 minute baat kar lijiye.

Uske baad decision poora aapka hoga. 🙏`,

            nextStage: "DISCOVERY",

            nextBrain: "discoveryBrain"

        };

          }

    // ==========================================
    // Greeting
    // ==========================================

    greetCustomer(state) {

        return {

            reply:
`Thank you sir 😊

Sabse pehle aapka bahut dhanyawad reply dene ke liye.

Sir kya aap mujhe sirf 5 minute de sakte hain?

Main sirf aapke business ke baare me baat karna chahta hoon.`,

            nextStage: "DISCOVERY",

            nextBrain: "discoveryBrain"

        };

    }

    // ==========================================
    // Ask Permission
    // ==========================================

    askPermission(state) {

        return {

            reply:
`Sir ek chhota sa question tha.

Kya aap apne business ke baare me thoda bata sakte hain?

Jaise customer lane me ya sales badhane me koi problem aa rahi hai?`,

            nextStage: "DISCOVERY",

            nextBrain: "discoveryBrain"

        };

    }

    // ==========================================
    // Ask Business Problem
    // ==========================================

    askBusinessProblem(state) {

        const industry = knowledgeManager.getIndustryById(state.industryId);

        return {

            reply:
`Sir ${industry ? industry.displayName : "business"} me aajkal sabse badi problem kya chal rahi hai?

• Customer kam aa rahe hain?

• Customer price compare karta hai?

• Google se customer nahi milte?

• Competitor zyada sale kar raha hai?

Aap apna experience share kijiye sir.`,

            nextStage: "DISCOVERY",

            nextBrain: "discoveryBrain"

        };

    }

    // ==========================================
    // Detect Industry
    // ==========================================

    detectIndustry(categoryName) {

        return knowledgeManager.getIndustry(categoryName);

    }

    // ==========================================
    // Ask Story Permission
    // ==========================================

    askStoryPermission(state) {

        return {

            reply:
`Sir 😊

Aapne jo problem batayi hai, bilkul isi tarah ki problem ek aur ${state.business || "business owner"} ko bhi thi.

Agar aap permission dein to main unki ek chhoti si real success story share kar sakta hoon.

Ho sakta hai usme aapko bhi kuch useful idea mil jaye.`,

            nextStage: "STORY",

            nextBrain: "storyBrain"

        };

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback() {

        return {

            reply:
`Ji sir 😊

Main samajh gaya.

Bas business ke baare me thoda sa bata dijiye, fir main usi hisaab se baat karunga.`,

            nextStage: "DISCOVERY",

            nextBrain: "discoveryBrain"

        };

    }

}

export default new DiscoveryBrain();
