/**
 * ==========================================================
 * demoBrain.js
 * ==========================================================
 * Raj AI Demo Brain
 * ==========================================================
 */

import knowledgeManager from "../services/knowledgeManager.js";

export class DemoBrain {

    canHandle(state) {

        return state.stage === "DEMO";

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        // ==========================================
        // Send Demo
        // ==========================================

        if (!state.demoShown) {

            return this.sendDemo(state);

        }

        // ==========================================
        // Customer likes Demo
        // ==========================================

        if (

            message.includes("achha") ||

            message.includes("accha") ||

            message.includes("good") ||

            message.includes("nice") ||

            message.includes("mast") ||

            message.includes("pasand") ||

            message.includes("beautiful") ||

            message.includes("professional")

        ) {

            return this.showCategories(state);

        }

        // ==========================================
        // Customer asks price
        // ==========================================

        if (

            message.includes("price") ||

            message.includes("kitna") ||

            message.includes("cost")

        ) {

            return this.showCategories(state);

        }

        // ==========================================
        // Fallback
        // ==========================================

        return this.fallback();

    }

    // ==========================================
    // Send Demo
    // ==========================================

    sendDemo(state) {

        state.demoShown = true;

        return {

            reply:

`Sir 😊

Ye maine specially aapke business ke liye ek Demo Website tayyar ki hai.

🖼 Demo Image
🔗 Demo Link

Sir ek baar dekh lijiye.

Agar achha lage to main aapko website ke 3 categories bhi dikha dunga.`,

            nextStage: "DEMO",

            nextBrain: "demoBrain"

        };

    }

      // ==========================================
    // Show Website Categories
    // ==========================================

    showCategories(state) {

        state.categoryShown = true;

        return {

            reply:

`Sir 😊

Mujhe khushi hui ki aapko Demo Website pasand aayi.

Main 3 category ki websites banata hoon.

1️⃣ Template Website

• Professional Design
• Mobile Friendly
• WhatsApp Button
• Google Map
• Contact Form
• Business Information

----------------------------

2️⃣ 3D Premium Website

• Premium UI Design
• 3D Effects
• Smooth Animation
• Modern Branding
• Premium Look

----------------------------

3️⃣ Animated Premium Website

• Luxury Design
• Advanced Animation
• High-End Branding
• Premium User Experience
• Fully Animated Website

Sir inme se aapko kaunsi category sabse achhi lagi? 🙂`,

            nextStage: "CATEGORY",

            nextBrain: "dealBrain"

        };

    }

    // ==========================================
    // Fallback
    // ==========================================

    fallback() {

        return {

            reply:

`Ji Sir 😊

Aap aaram se Demo dekh lijiye.

Uske baad batayiye ki in 3 categories me se kaunsi website aapko pasand aayi.`,

            nextStage: "DEMO",

            nextBrain: "demoBrain"

        };

    }

}

export default new DemoBrain();
