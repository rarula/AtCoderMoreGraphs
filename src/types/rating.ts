import { Color } from "../utils";

export type RatingEntry = {
    EndTime: number;
    NewRating: number;
    OldRating: number;
    Place: number;
    ContestName: string;
    StandingsUrl?: string;
}

export type DetailedRatingEntry = {
    IsRated: boolean;
    Place: number;
    OldRating: number;
    NewRating: number;
    Performance: number;
    InnerPerformance: number;
    ContestScreenName: string;
    ContestName: string;
    ContestNameEn: string;
    EndTime: number;
    StandingsUrl?: string;
}

export type RatingColor = {
    rating: number;
    color: Color;
}

export const RATING_COLOR_MAP: RatingColor[] = [
    { rating: 0,    color: new Color("#808080", 0.15) },
    { rating: 400,  color: new Color("#804000", 0.15) },
    { rating: 800,  color: new Color("#008000", 0.15) },
    { rating: 1200, color: new Color("#00C0C0", 0.20) },
    { rating: 1600, color: new Color("#0000FF", 0.10) },
    { rating: 2000, color: new Color("#C0C000", 0.25) },
    { rating: 2400, color: new Color("#FF8000", 0.20) },
    { rating: 2800, color: new Color("#FF0000", 0.10) }
];

export function getColorByRating(rating: number): Color {
    for (let i = RATING_COLOR_MAP.length - 1; i >= 0; i--) {
        if (rating >= RATING_COLOR_MAP[i].rating) return RATING_COLOR_MAP[i].color;
    }
    return new Color("#000000", 0.1);
}
