import type { RatingEntry } from "./ratingEntry";

declare global {
    interface Window {
        rating_history: RatingEntry[];
    }
}

export {};
