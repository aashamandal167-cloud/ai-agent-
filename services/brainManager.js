/**
 * ==========================================================
 * brainManager.js
 * ==========================================================
 * Raj AI Advanced Brain Manager
 * ==========================================================
 */

import discoveryBrain from "../brains/discoveryBrain.js";
import storyBrain from "../brains/storyBrain.js";
import demoBrain from "../brains/demoBrain.js";
import dealBrain from "../brains/dealBrain.js";
import negotiationBrain from "../brains/negotiationBrain.js";
import paymentBrain from "../brains/paymentBrain.js";
import followupBrain from "../brains/followupBrain.js";

const BRAINS = {

    DISCOVERY: discoveryBrain,

    STORY: storyBrain,

    DEMO: demoBrain,

    CATEGORY: dealBrain,

    DEAL: dealBrain,

    NEGOTIATION: negotiationBrain,

    PAYMENT: paymentBrain,

    FOLLOWUP: followupBrain

};

class BrainManager {

    constructor() {

        this.defaultStage = "DISCOVERY";

    }

    // ==========================================
    // Get Current Brain
    // ==========================================

    getCurrentBrain(state) {

        return BRAINS[state.stage] || discoveryBrain;

    }

    // ==========================================
    // Validate Stage
    // ==========================================

    validateStage(state) {

        if (!state.stage) {

            state.stage = this.defaultStage;

        }

        if (!BRAINS[state.stage]) {

            state.stage = this.defaultStage;

        }

    }

    // ==========================================
    // Main Process
    // ==========================================

    process(state, customerMessage) {

        try {

            this.validateStage(state);

            const brain = this.getCurrentBrain(state);

            if (!brain.canHandle(state)) {

                return this.fallback(state);

            }

            const result = brain.process(

                state,

                customerMessage

            );

            this.updateState(state, result);

            this.saveHistory(state);

            return result;

        }

        catch (error) {

            console.error(

                "BrainManager Error:",

                error

            );

            return this.errorHandler(state);

        }

    }

    // ==========================================
    // Update State
    // ==========================================

    updateState(state, result) {

        if (!result) return;

        if (result.nextStage) {

            state.previousStage = state.stage;
            state.stage = result.nextStage;

        }

        if (result.nextBrain) {

            state.currentBrain = result.nextBrain;

        }

        state.lastReply = result.reply || "";

        state.lastUpdated = Date.now();

    }

    // ==========================================
    // Save History
    // ==========================================

    saveHistory(state) {

        if (!state.history) {

            state.history = [];

        }

        state.history.push({

            stage: state.stage,

            brain: state.currentBrain,

            time: new Date().toISOString()

        });

        // Keep only last 50 records

        if (state.history.length > 50) {

            state.history.shift();

        }

    }

    // ==========================================
    // Reset Conversation
    // ==========================================

    resetConversation(state) {

        state.stage = this.defaultStage;
        state.currentBrain = "discoveryBrain";
        state.previousStage = null;
        state.history = [];

    }

    // ==========================================
    // Conversation Complete
    // ==========================================

    completeConversation(state) {

        state.completed = true;

        return {

            reply:
`Sir 😊

Aapse baat karke bahut achha laga.

Future me website, update ya support ki zarurat ho to kabhi bhi message kijiye.

Dhanyawad. 🙏`,

            nextStage: "FOLLOWUP",
            nextBrain: "followupBrain"

        };

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback(state) {

        return {

            reply:
`Sir 😊

Main aapki baat poori tarah samajh nahi paaya.

Kya aap thoda aur clearly bata sakte hain?`,

            nextStage: state.stage,
            nextBrain: state.currentBrain || "discoveryBrain"

        };

    }

    // ==========================================
    // Error Handler
    // ==========================================

    errorHandler(state) {

        return {

            reply:
`Sir 🙏

Technical problem ki wajah se reply dene me dikkat aa rahi hai.

Kripya ek baar phir message bhejiye.`,

            nextStage: state.stage || this.defaultStage,
            nextBrain: state.currentBrain || "discoveryBrain"

        };

    }

}

export default new BrainManager();
