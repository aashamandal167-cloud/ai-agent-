/**
 * ==========================================================
 * knowledgeManager.js
 * ==========================================================
 * Raj AI Knowledge Manager
 * Central Knowledge Access Layer
 * ==========================================================
 */

import INDUSTRIES from "../knowledge/industries.js";
import BUSINESS_PROBLEMS from "../knowledge/businessProblems.js";
import SUCCESS_STORIES from "../knowledge/successStories.js";
import WEBSITE_BENEFITS from "../knowledge/websiteBenefits.js";
import PRICING_KNOWLEDGE from "../knowledge/pricingKnowledge.js";
import OBJECTIONS from "../knowledge/objections.js";

class KnowledgeManager {

    constructor() {

        this.industries = INDUSTRIES;
        this.businessProblems = BUSINESS_PROBLEMS;
        this.successStories = SUCCESS_STORIES;
        this.websiteBenefits = WEBSITE_BENEFITS;
        this.pricing = PRICING_KNOWLEDGE;
        this.objections = OBJECTIONS;

    }

    // ===========================================
    // Industry Detection
    // ===========================================

    getIndustry(categoryName = "") {

        const keyword = categoryName.toLowerCase().trim();

        for (const industry of this.industries) {

            if (industry.displayName.toLowerCase() === keyword) {
                return industry;
            }

            const matched = industry.keywords.find(item =>
                item.toLowerCase() === keyword
            );

            if (matched) {
                return industry;
            }

        }

        return null;

    }

    // ===========================================
    // Get Industry By ID
    // ===========================================

    getIndustryById(industryId) {

        return this.industries.find(
            industry => industry.id === industryId
        ) || null;

    }

    // ===========================================
    // Business Problems
    // ===========================================

    getBusinessProblems(industryId) {

        return this.businessProblems[industryId] || {};

    }

    // ===========================================
    // Success Stories
    // ===========================================

    getSuccessStories(industryId) {

        return this.successStories[industryId] || [];

    }

    // ===========================================
    // Website Benefits
    // ===========================================

    getWebsiteBenefits(industryId) {

        return {

            common: this.websiteBenefits.common || [],

            category:
                this.websiteBenefits[industryId] || []

        };

    }

    // ===========================================
    // Pricing
    // ===========================================

    getPricing(packageName) {

        return this.pricing[packageName] || null;

    }

    // ===========================================
    // All Pricing
    // ===========================================

    getAllPricing() {

        return this.pricing;

    }

    // ===========================================
    // Objection
    // ===========================================

    getObjection(objectionName) {

        return this.objections[objectionName] || null;

    }

    // ===========================================
    // All Objections
    // ===========================================

    getAllObjections() {

        return this.objections;

    }

    // ===========================================
    // Complete Business Knowledge
    // ===========================================

    getCompleteBusinessKnowledge(industryId) {

        return {

            industry: this.getIndustryById(industryId),

            problems: this.getBusinessProblems(industryId),

            stories: this.getSuccessStories(industryId),

            benefits: this.getWebsiteBenefits(industryId)

        };

    }

    // ===========================================
    // Check Industry Exists
    // ===========================================

    hasIndustry(industryId) {

        return this.industries.some(
            industry => industry.id === industryId
        );

    }

    // ===========================================
    // Search Industry
    // ===========================================

    searchIndustry(keyword = "") {

        keyword = keyword.toLowerCase().trim();

        return this.industries.filter(industry => {

            if (
                industry.displayName.toLowerCase().includes(keyword)
            ) {
                return true;
            }

            return industry.keywords.some(item =>
                item.toLowerCase().includes(keyword)
            );

        });

    }

    // ===========================================
    // Health Check
    // ===========================================

    healthCheck() {

        return {

            industries: this.industries.length,

            businessProblems: Object.keys(this.businessProblems).length,

            successStories: Object.keys(this.successStories).length,

            websiteBenefits: Object.keys(this.websiteBenefits).length,

            pricingPackages: Object.keys(this.pricing).length,

            objections: Object.keys(this.objections).length,

            status: "OK"

        };

    }

    // ===========================================
    // Validate Knowledge Base
    // ===========================================

    validateKnowledgeBase() {

        const errors = [];

        if (!this.industries.length)
            errors.push("Industries data missing.");

        if (!Object.keys(this.businessProblems).length)
            errors.push("Business Problems missing.");

        if (!Object.keys(this.successStories).length)
            errors.push("Success Stories missing.");

        if (!Object.keys(this.websiteBenefits).length)
            errors.push("Website Benefits missing.");

        if (!Object.keys(this.pricing).length)
            errors.push("Pricing Knowledge missing.");

        if (!Object.keys(this.objections).length)
            errors.push("Objections missing.");

        return {

            valid: errors.length === 0,

            errors

        };

    }

    // ===========================================
    // Safe Getter
    // ===========================================

    safeGet(callback, defaultValue = null) {

        try {

            return callback();

        } catch (error) {

            console.error("KnowledgeManager:", error.message);

            return defaultValue;

        }

    }

    // ===========================================
    // Reset Knowledge
    // ===========================================

    reset() {

        this.industries = INDUSTRIES;
        this.businessProblems = BUSINESS_PROBLEMS;
        this.successStories = SUCCESS_STORIES;
        this.websiteBenefits = WEBSITE_BENEFITS;
        this.pricing = PRICING_KNOWLEDGE;
        this.objections = OBJECTIONS;

        return true;

    }

}

export default new KnowledgeManager();
                
