/**
 * ==========================================================
 * storyBrain.js
 * ==========================================================
 * Raj AI Story Brain
 * ==========================================================
 */

import knowledgeManager from "../services/knowledgeManager.js";

export class StoryBrain {

    canHandle(state) {

        return state.stage === "STORY";

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        // ==========================================
        // Story not shown yet
        // ==========================================

        if (!state.storyShown) {

            return this.tellStory(state);

        }

        // ==========================================
        // Customer wants demo
        // ==========================================

        if (
            message.includes("ha") ||
            message.includes("haan") ||
            message.includes("yes") ||
            message.includes("ok") ||
            message.includes("batao") ||
            message.includes("dikhao") ||
            message.includes("demo") ||
            message.includes("website")
        ) {

            return this.askDemoPermission(state);

        }

        // ==========================================
        // Fallback
        // ==========================================

        return this.fallback();

    }

    // ==========================================
    // Tell Story
    // ==========================================

    tellStory(state) {

        state.storyShown = true;

        const story =
            knowledgeManager.getStory(state.industryId);

        return {

            reply:

`Sir 😊

Main aapko ek chhota sa example batata hoon.

${story.problem}

Phir unhone professional website banwayi.

${story.solution}

Aur uske baad...

${story.result}

Sir isi wajah se main aapse website banwane ke liye force nahi kar raha.

Bas digital presence ki importance share kar raha hoon.`,

            nextStage: "STORY",

            nextBrain: "storyBrain"

        };

}

    // ==========================================
    // Ask Demo Permission
    // ==========================================

    askDemoPermission(state) {

        state.demoPermission = true;

        return {

            reply:
`Sir 😊

Agar aap chahein to maine aapke business ke liye ek demo website bhi tayyar ki hai.

Kya main uska Demo Image aur Demo Link bhej sakta hoon?

Sirf dekh lijiye, uske baad decision poori tarah aapka hoga. 🙂`,

            nextStage: "DEMO",

            nextBrain: "demoBrain"

        };

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback() {

        return {

            reply:
`Ji sir 😊

Main sirf ek chhoti si story share karna chahta tha.

Agar aap chahein to main aapke business ka demo website bhi dikha sakta hoon.`,

            nextStage: "STORY",

            nextBrain: "storyBrain"

        };

    }

}

export default new StoryBrain();
