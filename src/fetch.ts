import type { DetailedRatingEntry, RatingEntry } from "./types/rating";

export async function fetchDetailedHistory(username: string, history: RatingEntry[]): Promise<DetailedRatingEntry[]> {
    try {
        const url = "https://atcoder.jp/users/" + encodeURIComponent(username) + "/history/json";
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json() as DetailedRatingEntry[];
            const out: DetailedRatingEntry[] = [];
            for (let i = 0; i < history.length; i++) {
                if (data[i].IsRated) {
                    data[i].EndTime = history[i].EndTime;
                    data[i].StandingsUrl = history[i].StandingsUrl;
                    if (data[i].Performance < 0) data[i].Performance = 0;
                    if (data[i].InnerPerformance < 0) data[i].InnerPerformance = 0;
                    out.push(data[i]);
                }
            }
            return out;
        }
        else {
            throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        }
    }
    catch (e) {
        console.error("Failed to fetch detailed rating history:", e);
        return Promise.reject(e);
    }
}
