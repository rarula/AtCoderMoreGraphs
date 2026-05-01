import * as cj from "createjs-module";
import { getColorByRating, RATING_COLOR_MAP, type RatingEntry } from "./rating";
import { getDiff, getOrdinal } from "../utils";

const STATUS_OFFSET_X = 50;
const STATUS_OFFSET_Y = 5;
const STATUS_PADDING_R = 10;
const STATUS_PADDING_B = 5;
const STATUS_STEP_SIZE = 400;

const STAR_MIN_RATING = 3200;
const PARTICLE_MIN = 3;
const PARTICLE_MAX = 20;
const LIFE_MAX = 30;

type Particle = cj.Text & {
    vx: number;
    vy: number;
    rotSpeed: number;
    life: number;
};

function getRatingPer(x: number): number {
    let pre = RATING_COLOR_MAP[RATING_COLOR_MAP.length - 1].rating + STATUS_STEP_SIZE;
    for (let i = RATING_COLOR_MAP.length - 1; i >= 0; i--) {
        if (x >= RATING_COLOR_MAP[i].rating) return (x - RATING_COLOR_MAP[i].rating) / (pre - RATING_COLOR_MAP[i].rating);
        pre = RATING_COLOR_MAP[i].rating;
    }
    return 0;
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
        this.width = rawWidth - STATUS_OFFSET_X - STATUS_PADDING_R;
        this.height = rawHeight - STATUS_OFFSET_Y - STATUS_PADDING_B;

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

    setStatus(data: RatingEntry, particleFlag: boolean): void {
        const date = new Date(data.EndTime * 1000);
        const rating = data.NewRating;
        const oldRating = data.OldRating;

        const color = getColorByRating(rating);
        this.border.graphics.c().s(color.hex).ss(1).rr(STATUS_OFFSET_X, STATUS_OFFSET_Y, this.width, this.height, 2);

        this.ratingText.text = String(rating);
        this.ratingText.color = color.hex;
        this.placeText.text = getOrdinal(data.Place);
        this.diffText.text = getDiff(rating - oldRating);
        this.dateText.text = date.toLocaleDateString();
        this.contestText.text = data.ContestName;

        this.standingsUrl = data.StandingsUrl;

        if (particleFlag) {
            const particleNum = Math.floor(Math.pow(getRatingPer(rating), 2) * (PARTICLE_MAX - PARTICLE_MIN) + PARTICLE_MIN);
            this.setParticles(particleNum, color.hex, color.alpha, rating);
        }

        this.stage.update();
    }

    updateParticles(): void {
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
            p.scaleX = p.life / LIFE_MAX;
            p.scaleY = p.life / LIFE_MAX;
            p.rotation += p.rotSpeed;
        }
    }

    private setParticles(num: number, color: string, alpha: number, rating: number): void {
        for (let i = 0; i < PARTICLE_MAX; i++) {
            if (i < num) {
                this.setParticle(this.particles[i], this.ratingText.x, this.ratingText.y, color, alpha, rating >= STAR_MIN_RATING);
            } else {
                this.particles[i].life = 0;
                this.particles[i].visible = false;
            }
        }
    }

    private setParticle(p: Particle, x: number, y: number, color: string, alpha: number, star: boolean): void {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 4;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.rotSpeed = Math.random() * 20 + 10;
        p.life = LIFE_MAX;
        p.visible = true;
        p.color = color;
        p.text = star ? "★" : "@";
        p.alpha = alpha;
    }
}
