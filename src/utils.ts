export class Color {
    readonly hex: string;
    readonly alpha: number;

    constructor(hex: string, alpha: number) {
        this.hex = hex;
        this.alpha = alpha;
    }
}

export function getOrdinal(x: number): string {
    const s = ["th", "st", "nd", "rd"], v = x % 100;
    return x + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function getDiff(x: number): string {
    const sign = x === 0 ? "±" : (x < 0 ? "-" : "+");
    return sign + Math.abs(x);
}

export function getPer(x: number, l: number, r: number): number {
    return (x - l) / (r - l);
}
