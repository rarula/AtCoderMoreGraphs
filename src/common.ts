import type { AxisSpec } from "./types/graph";
import type { RatingEntry } from "./types/rating";

export const buildRatingYAxis = (): AxisSpec<RatingEntry> => ({
    value: (entry) => entry.NewRating,
    range: (data) => {
        const MARGIN_Y = 300;
        const minRaw = Math.min(...data.map(entry => entry.NewRating));
        const maxRaw = Math.max(...data.map(entry => entry.NewRating));
        const min = Math.min(1500, Math.max(0, minRaw - 100));
        const max = maxRaw + MARGIN_Y;
        return [min, max];
    },
    ticks: ([min, max]) => {
        const STEP = 400;
        const out: number[] = [];
        for (let t = Math.ceil(min / STEP) * STEP; t <= max; t += STEP) out.push(t);
        return out;
    },
    tickFormatter: (tick) => tick.toString(),
});

export const buildDateXAxis = (): AxisSpec<RatingEntry> => ({
    value: (entry) => entry.EndTime,
    range: (data) => {
        const ONE_DAY_SECONDS = 60 * 60 * 24;
        const min = Math.min(...data.map(entry => entry.EndTime)) - ONE_DAY_SECONDS * 30;
        const max = Math.max(...data.map(entry => entry.EndTime)) + ONE_DAY_SECONDS * 30;
        return [min, max];
    },
    ticks: () => [],
    tickFormatter: () => "",
});

export const buildCountXAxis = (margin: number): AxisSpec<RatingEntry> => ({
    value: (_entry, index) => index + 1,
    range: (data) => {
        const n = Math.max(1, data.length);
        return [1 - margin, n + margin];
    },
    ticks: ([min, max]) => {
        const minTick = Math.ceil(min);
        const maxTick = Math.floor(max);
        const step = Math.max(1, Math.ceil((maxTick - minTick) / 8));
        const out: number[] = [];
        for (let t = minTick; t <= maxTick; t += step) out.push(t);
        return out;
    },
    tickFormatter: (tick) => tick.toString(),
});
