import type { DetailedRatingEntry, RatingEntry } from "./types/rating";

export async function fetchDetailedHistory(username: string, history: RatingEntry[]): Promise<DetailedRatingEntry[]> {
    try {
        const url = "https://atcoder.jp/users/" + encodeURIComponent(username) + "/history/json";
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json() as DetailedRatingEntry[];
            const out: DetailedRatingEntry[] = [];
            let historyIndex = 0;
            for (let i = 0; i < data.length; i++) {
                if (data[i].IsRated) {
                    data[i].EndTime = history[historyIndex].EndTime;
                    data[i].StandingsUrl = history[historyIndex].StandingsUrl;
                    if (data[i].Performance < 0) data[historyIndex].Performance = 0;
                    if (data[i].InnerPerformance < 0) data[historyIndex].InnerPerformance = 0;
                    out.push(data[i]);
                    historyIndex++;
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
