import type { RatingEntry } from "./rating";

declare global {
    interface Window {
        rating_history: RatingEntry[];
    }
}

export {};
