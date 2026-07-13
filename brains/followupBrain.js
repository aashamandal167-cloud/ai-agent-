/**
 * ==========================================================
 * followupBrain.js
 * ==========================================================
 * Raj AI Follow-up Brain
 * ==========================================================
 */

export class FollowupBrain {

    canHandle(state) {

        return state.stage === "FOLLOWUP";

    }

    process(state, customerMessage = "") {

        const message = customerMessage.toLowerCase().trim();

        // ==========================================
        // First Follow-up
        // ==========================================

        if (!state.followupStarted) {

            return this.startFollowup(state);

        }

        // ==========================================
        // Customer asks Project Status
        // ==========================================

        if (

            message.includes("status") ||

            message.includes("update") ||

            message.includes("website") ||

            message.includes("progress") ||

            message.includes("kab")

        ) {

            return this.projectUpdate();

        }

        // ==========================================
        // Customer Appreciates
        // ==========================================

        if (

            message.includes("thanks") ||

            message.includes("thank you") ||

            message.includes("good") ||

            message.includes("nice")

        ) {

            return this.thankCustomer();

        }

        return this.fallback();

    }

    // ==========================================
    // Start Follow-up
    // ==========================================

    startFollowup(state) {

        state.followupStarted = true;

        return {

            reply:

`Sir 😊

Aapke project par kaam start ho chuka hai.

Main time-time par aapko progress update deta rahunga.

Agar aapko koi bhi change ya suggestion dena ho to kabhi bhi bata sakte hain.`,

            nextStage: "FOLLOWUP",

            nextBrain: "followupBrain"

        };

    }

    // ==========================================
    // Project Update
    // ==========================================

    projectUpdate() {

        return {

            reply:

`Sir 😊

Aapki website par kaam smoothly chal raha hai.

✅ Design Progress
✅ Content Setup
✅ Mobile Optimization

Jaise hi website complete hogi, main sabse pehle aapko Demo Link bhej dunga.`,

            nextStage: "FOLLOWUP",

            nextBrain: "followupBrain"

        };

    }

    // ==========================================
    // Thank Customer
    // ==========================================

    thankCustomer() {

        return {

            reply:

`Thank you so much Sir ❤️

Aapke trust ke liye dil se dhanyawad.

Main poori koshish karunga ki aapko ek professional aur premium website deliver karun.

Agar future me bhi kisi update ya support ki zarurat ho, main hamesha available hoon. 🙏`,

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

`Ji Sir 😊

Agar website, progress ya kisi bhi update ke baare me kuch puchhna ho to bina jhijhak message kijiye.

Main hamesha aapki help ke liye available hoon.`,

            nextStage: "FOLLOWUP",

            nextBrain: "followupBrain"

        };

    }

}

export default new FollowupBrain();
