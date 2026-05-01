import * as cj from "createjs-module";
import type { RatingEntry } from "./ratingEntry";

const STATUS_OFFSET_X = 50;
const STATUS_OFFSET_Y = 5;
const STATUS_RIGHT_PAD = 10;
const STATUS_BOTTOM_PAD = 5;

const STAR_MIN = 3200;
const PARTICLE_MIN = 3;
const PARTICLE_MAX = 20;
const LIFE_MAX = 30;

const STATUS_COLORS: Array<[number, string, number]> = [
    [0,    "#808080", 0.15],
    [400,  "#804000", 0.15],
    [800,  "#008000", 0.15],
    [1200, "#00C0C0", 0.2],
    [1600, "#0000FF", 0.1],
    [2000, "#C0C000", 0.25],
    [2400, "#FF8000", 0.2],
    [2800, "#FF0000", 0.1]
];
const STATUS_STEP_SIZE = 400;

type Particle = cj.Text & {
    vx: number;
    vy: number;
    rot_speed: number;
    life: number;
};

function getStatusColor(x: number): [number, string, number] {
    for (let i = STATUS_COLORS.length - 1; i >= 0; i--) {
        if (x >= STATUS_COLORS[i][0]) return STATUS_COLORS[i];
    }
    return [-1, "#000000", 0.1];
}

function getRatingPer(x: number): number {
    let pre = STATUS_COLORS[STATUS_COLORS.length - 1][0] + STATUS_STEP_SIZE;
    for (let i = STATUS_COLORS.length - 1; i >= 0; i--) {
        if (x >= STATUS_COLORS[i][0]) return (x - STATUS_COLORS[i][0]) / (pre - STATUS_COLORS[i][0]);
        pre = STATUS_COLORS[i][0];
    }
    return 0;
}

function getOrdinal(x: number): string {
    const s = ["th", "st", "nd", "rd"], v = x % 100;
    return x + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getDiff(x: number): string {
    const sign = x === 0 ? "±" : (x < 0 ? "-" : "+");
    return sign + Math.abs(x);
}

export class Status {
    private stage: cj.Stage;
    private width: number;
    private height: number;

    private border: cj.Shape;
    private ratingText: cj.Text;
    private placeText: cj.Text;
    private diffText: cj.Text;
    private dateText: cj.Text;
    private contestText: cj.Text;
    private particles: Particle[] = [];
    private standingsUrl: string | undefined;

    constructor(stage: cj.Stage, canvas: HTMLCanvasElement) {
        this.stage = stage;
        const rawWidth = Number(canvas.getAttribute("width") || canvas.width);
        const rawHeight = Number(canvas.getAttribute("height") || canvas.height);
        this.width = rawWidth - STATUS_OFFSET_X - STATUS_RIGHT_PAD;
        this.height = rawHeight - STATUS_OFFSET_Y - STATUS_BOTTOM_PAD;

        this.border = new cj.Shape();
        this.stage.addChild(this.border);

        this.ratingText = this.newText(STATUS_OFFSET_X + 75, STATUS_OFFSET_Y + this.height / 2, "48px 'Squada One'");
        this.placeText = this.newText(STATUS_OFFSET_X + 160, STATUS_OFFSET_Y + this.height / 2.7, "16px Lato");
        this.diffText = this.newText(STATUS_OFFSET_X + 160, STATUS_OFFSET_Y + this.height / 1.5, "11px Lato");
        this.diffText.color = "#888";

        this.dateText = this.newText(STATUS_OFFSET_X + 200, STATUS_OFFSET_Y + this.height / 4, "14px Lato");
        this.contestText = this.newText(STATUS_OFFSET_X + 200, STATUS_OFFSET_Y + this.height / 1.6, "20px Lato");
        this.dateText.textAlign = this.contestText.textAlign = "left";
        this.contestText.maxWidth = this.width - 200 - 10;

        const hit = new cj.Shape();
        hit.graphics.f("#000").r(0, -12, this.contestText.maxWidth, 24);
        this.contestText.hitArea = hit;
        this.contestText.cursor = "pointer";
        this.contestText.addEventListener("click", () => {
            if (this.standingsUrl) location.href = this.standingsUrl;
        });

        for (let i = 0; i < PARTICLE_MAX; i++) {
            const p = this.newText(0, 0, "64px Lato") as Particle;
            p.visible = false;
            p.life = 0;
            this.particles.push(p);
        }
    }

    private newText(x: number, y: number, font: string): cj.Text {
        const t = new cj.Text("", font, "#000");
        t.x = x;
        t.y = y;
        t.textAlign = "center";
        t.textBaseline = "middle";
        this.stage.addChild(t);
        return t;
    }

    setStatus(data: RatingEntry, particleFlag: boolean) {
        const date = new Date(data.EndTime * 1000);
        const rating = data.NewRating;
        const oldRating = data.OldRating;

        const [, color, alpha] = getStatusColor(rating);
        this.border.graphics.c().s(color).ss(1).rr(STATUS_OFFSET_X, STATUS_OFFSET_Y, this.width, this.height, 2);

        this.ratingText.text = String(rating);
        this.ratingText.color = color;
        this.placeText.text = getOrdinal(data.Place);
        this.diffText.text = getDiff(rating - oldRating);
        this.dateText.text = date.toLocaleDateString();
        this.contestText.text = data.ContestName;

        this.standingsUrl = data.StandingsUrl;

        if (particleFlag) {
            const particleNum = Math.floor(Math.pow(getRatingPer(rating), 2) * (PARTICLE_MAX - PARTICLE_MIN) + PARTICLE_MIN);
            this.setParticles(particleNum, color, alpha, rating);
        }

        this.stage.update();
    }

    private setParticles(num: number, color: string, alpha: number, rating: number) {
        for (let i = 0; i < PARTICLE_MAX; i++) {
            if (i < num) {
                this.setParticle(this.particles[i], this.ratingText.x, this.ratingText.y, color, alpha, rating >= STAR_MIN);
            } else {
                this.particles[i].life = 0;
                this.particles[i].visible = false;
            }
        }
    }

    private setParticle(p: Particle, x: number, y: number, color: string, alpha: number, star: boolean) {
        p.x = x;
        p.y = y;
        const ang = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 4;
        p.vx = Math.cos(ang) * speed;
        p.vy = Math.sin(ang) * speed;
        p.rot_speed = Math.random() * 20 + 10;
        p.life = LIFE_MAX;
        p.visible = true;
        p.color = color;
        p.text = star ? "★" : "@";
        p.alpha = alpha;
    }

    updateParticles() {
        for (let i = 0; i < PARTICLE_MAX; i++) {
            const p = this.particles[i];
            if (p.life <= 0) {
                p.visible = false;
                continue;
            }
            p.x += p.vx;
            p.vx *= 0.9;
            p.y += p.vy;
            p.vy *= 0.9;
            p.life--;
            p.scaleX = p.scaleY = p.life / LIFE_MAX;
            p.rotation += p.rot_speed;
        }
    }
}
