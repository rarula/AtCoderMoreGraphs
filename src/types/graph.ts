import * as cj from "createjs-module";

const OFFSET_X = 50;
const OFFSET_Y = 5;
const PANEL_RIGHT_PAD = 10;
const PANEL_BOTTOM_PAD = 30;
const LABEL_FONT = "12px Lato";
const START_YEAR = 2010;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEAR_SEC = 86400 * 365;
const STEP_SIZE = 400;
const COLORS: Array<[number, string, number]> = [
    [0,    "#808080", 0.15],
    [400,  "#804000", 0.15],
    [800,  "#008000", 0.15],
    [1200, "#00C0C0", 0.2],
    [1600, "#0000FF", 0.1],
    [2000, "#C0C000", 0.25],
    [2400, "#FF8000", 0.2],
    [2800, "#FF0000", 0.1]
];
const HIGHEST_WIDTH = 80;
const HIGHEST_HEIGHT = 20;

function getPer(x: number, l: number, r: number): number {
    return (x - l) / (r - l);
}

function getColor(x: number): [number, string, number] {
    for (let i = COLORS.length - 1; i >= 0; i--) {
        if (x >= COLORS[i][0]) return COLORS[i];
    }
    return [-1, "#000000", 0.1];
}


export type AxisSpec<T> = {
    value: (entry: T, index: number) => number;
    range: (data: T[]) => [number, number];
    ticks: (range: [number, number]) => number[];
    tickFormatter: (tick: number) => string;
}

type PlotArea = {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
};

export type GraphContext<T> = {
    data: T[];
    xRange: [number, number];
    yRange: [number, number];
    plot: PlotArea;
    stage: cj.Stage;
    layer: {
        background: cj.Container;
        overlay: cj.Container;
        plot: cj.Container;
    };
}

export type GraphSpec<T> = {
    id: string;
    buttonLabel: string;
    xAxis: AxisSpec<T>;
    yAxis: AxisSpec<T>;
    xAxisMode: "date" | "count";
    onHover?: (entry: T, index: number) => void;
    onLeave?: () => void;
}

export class Graph<T> {
    private stage: cj.Stage;
    private data: T[] = [];
    private currentSpec: GraphSpec<T> | null = null;

    private root = new cj.Container();
    private background = new cj.Container();
    private overlay = new cj.Container();
    private plot = new cj.Container();

    private vertices: cj.Shape[] = [];
    private highestShape: cj.Shape | null = null;

    constructor(stage: cj.Stage) {
        this.stage = stage;
        this.root.addChild(this.background, this.plot, this.overlay);
        this.stage.addChild(this.root);
    }

    setData(data: T[]) {
        this.data = data;
    }

    render(spec: GraphSpec<T>) {
        this.clear();
        this.currentSpec = spec;

        const plot = this.getPlotRect();
        const ctx: GraphContext<T> = {
            data: this.data,
            xRange: spec.xAxis.range(this.data),
            yRange: spec.yAxis.range(this.data),
            plot,
            stage: this.stage,
            layer: {
                background: this.background,
                overlay: this.overlay,
                plot: this.plot,
            }
        };

        this.drawBackground(ctx, spec);
        this.drawSeries(ctx, spec);
        this.bindHover();

        this.stage.update();
    }

    clear() {
        this.unbindHover();
        this.background.removeAllChildren();
        this.plot.removeAllChildren();
        this.overlay.removeAllChildren();
        this.vertices = [];
        this.highestShape = null;
    }

    destroy() {
        this.clear();
        this.stage.removeChild(this.root);
    }

    private drawBackground(ctx: GraphContext<T>, spec: GraphSpec<T>) {
        if (!ctx.data.length) return;

        const rect = ctx.plot;
        const yMin = ctx.yRange[0];
        const yMax = ctx.yRange[1];

        const panel = new cj.Shape();
        panel.x = rect.left;
        panel.y = rect.top;
        panel.alpha = 0.3;

        const border = new cj.Shape();
        border.x = rect.left;
        border.y = rect.top;

        // Color bands
        let y1 = 0;
        for (let i = COLORS.length - 1; i >= 0; i--) {
            const y2 = rect.height - rect.height * getPer(COLORS[i][0], yMin, yMax);
            if (y2 > 0 && y1 < rect.height) {
                const top = Math.max(y1, 0);
                const bottom = Math.min(y2, rect.height);
                if (bottom > top) {
                    panel.graphics.f(COLORS[i][1]).r(0, top, rect.width, bottom - top);
                }
            }
            y1 = y2;
        }

        // Y grid + labels
        for (let v = 0; v <= yMax; v += STEP_SIZE) {
            if (v >= yMin) {
                const y = rect.height - rect.height * getPer(v, yMin, yMax);
                const label = new cj.Text(String(v), LABEL_FONT, "#000");
                label.textAlign = "right";
                label.textBaseline = "middle";
                label.x = rect.left - 10;
                label.y = rect.top + y;
                ctx.layer.background.addChild(label);

                border.graphics.s(v === 2000 ? "#000" : "#FFF").ss(0.5);
                border.graphics.mt(0, y).lt(rect.width, y);
            }
        }

        // X grid + labels
        if (spec.xAxisMode === "date") {
            let monthStep = 6;
            for (let i = 3; i >= 1; i--) {
                if (ctx.xRange[1] - ctx.xRange[0] <= YEAR_SEC * i + 86400 * 30 * 2) monthStep = i;
            }
            let firstFlag = true;
            for (let year = START_YEAR; year < 3000; year++) {
                let breakFlag = false;
                for (let j = 0; j < 12; j += monthStep) {
                    const month = ("00" + (j + 1)).slice(-2);
                    const unix = Date.parse(String(year) + "-" + month + "-01T00:00:00") / 1000;
                    if (ctx.xRange[0] < unix && unix < ctx.xRange[1]) {
                        const x = rect.width * getPer(unix, ctx.xRange[0], ctx.xRange[1]);
                        const label1 = new cj.Text(MONTH_NAMES[j], LABEL_FONT, "#000");
                        label1.textAlign = "center";
                        label1.textBaseline = "top";
                        label1.x = rect.left + x;
                        label1.y = rect.bottom + 2;
                        ctx.layer.background.addChild(label1);

                        if (j === 0 || firstFlag) {
                            const label2 = new cj.Text(String(year), LABEL_FONT, "#000");
                            label2.textAlign = "center";
                            label2.textBaseline = "top";
                            label2.x = rect.left + x;
                            label2.y = rect.bottom + 15;
                            ctx.layer.background.addChild(label2);
                            firstFlag = false;
                        }
                        border.graphics.mt(x, 0).lt(x, rect.height);
                    }
                    if (unix > ctx.xRange[1]) { breakFlag = true; break; }
                }
                if (breakFlag) break;
            }
        } else {
            const xTicks = spec.xAxis.ticks(ctx.xRange);
            xTicks.forEach((tick) => {
                const x = rect.width * getPer(tick, ctx.xRange[0], ctx.xRange[1]);
                const label = new cj.Text(spec.xAxis.tickFormatter(tick), LABEL_FONT, "#000");
                label.textAlign = "center";
                label.textBaseline = "top";
                label.x = rect.left + x;
                label.y = rect.bottom + 2;
                ctx.layer.background.addChild(label);

                border.graphics.mt(x, 0).lt(x, rect.height);
            });
        }

        border.graphics.s("#888").ss(1.5).rr(0, 0, rect.width, rect.height, 2);

        ctx.layer.background.addChild(panel, border);
    }

    private drawSeries(ctx: GraphContext<T>, spec: GraphSpec<T>) {
        if (!ctx.data.length) return;

        const rect = ctx.plot;

        const points = ctx.data
            .map((entry, index) => ({
                x: spec.xAxis.value(entry, index),
                y: spec.yAxis.value(entry, index),
                index,
            }))
            .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

        if (!points.length) return;

        this.plot.shadow = new cj.Shadow("rgba(0,0,0,0.3)", 1, 2, 3);

        const line = new cj.Shape();
        for (let j = 0; j < 2; j++) {
            line.graphics.s(j === 0 ? "#AAA" : "#FFF").ss(j === 0 ? 2 : 0.5);
            line.graphics.mt(
                rect.left + rect.width * getPer(points[0].x, ctx.xRange[0], ctx.xRange[1]),
                rect.top + rect.height - rect.height * getPer(points[0].y, ctx.yRange[0], ctx.yRange[1])
            );
            for (let i = 0; i < points.length; i++) {
                const x = rect.left + rect.width * getPer(points[i].x, ctx.xRange[0], ctx.xRange[1]);
                const y = rect.top + rect.height - rect.height * getPer(points[i].y, ctx.yRange[0], ctx.yRange[1]);
                line.graphics.lt(x, y);
            }
        }
        this.plot.addChild(line);

        let highestIndex = 0;
        for (let i = 1; i < points.length; i++) {
            if (points[i].y > points[highestIndex].y) highestIndex = i;
        }

        this.vertices = [];
        this.highestShape = null;

        for (let i = 0; i < points.length; i++) {
            const x = rect.left + rect.width * getPer(points[i].x, ctx.xRange[0], ctx.xRange[1]);
            const y = rect.top + rect.height - rect.height * getPer(points[i].y, ctx.yRange[0], ctx.yRange[1]);
            const color = getColor(points[i].y)[1];

            const dot = new cj.Shape() as cj.Shape & { i?: number };
            dot.graphics.s(i === highestIndex ? "#000" : "#FFF");
            dot.graphics.ss(0.5).f(color).dc(0, 0, 3.5);
            dot.x = x;
            dot.y = y;
            dot.i = points[i].index;

            const hitArea = new cj.Shape();
            hitArea.graphics.f("#000").dc(1.5, 1.5, 6);
            dot.hitArea = hitArea;

            this.plot.addChild(dot);
            this.vertices.push(dot);
        }

        // Highest label (line behind, box on top)
        {
            const highestPoint = points[highestIndex];
            const highestX = rect.left + rect.width * getPer(highestPoint.x, ctx.xRange[0], ctx.xRange[1]);
            const highestY = rect.top + rect.height - rect.height * getPer(highestPoint.y, ctx.yRange[0], ctx.yRange[1]);

            let dx = 80;
            if (highestX + HIGHEST_WIDTH / 2 + dx > rect.right) dx = -80;
            if (highestX - HIGHEST_WIDTH / 2 + dx < rect.left) dx = 80;

            let x = highestX + dx;
            let y = highestY - 16;

            if (y - HIGHEST_HEIGHT / 2 < rect.top) y = highestY + 16;

            x = Math.min(rect.right - HIGHEST_WIDTH / 2, Math.max(rect.left + HIGHEST_WIDTH / 2, x));
            y = Math.min(rect.bottom - HIGHEST_HEIGHT / 2, Math.max(rect.top + HIGHEST_HEIGHT / 2, y));

            // Line (behind vertices)
            const highestLine = new cj.Shape();
            highestLine.graphics.s("#FFF").mt(highestX, highestY).lt(x, y);
            highestLine.shadow = new cj.Shadow("rgba(0,0,0,0.3)", 1, 2, 3);
            highestLine.mouseEnabled = false;
            this.plot.addChildAt(highestLine, 1);

            // Box (on top)
            const highestShape = new cj.Shape() as cj.Shape & { i?: number };
            const hit = new cj.Shape();
            hit.graphics.f("#000").rr(x - HIGHEST_WIDTH / 2, y - HIGHEST_HEIGHT / 2, HIGHEST_WIDTH, HIGHEST_HEIGHT, 2);
            highestShape.hitArea = hit;
            highestShape.shadow = new cj.Shadow("rgba(0,0,0,0.3)", 1, 2, 3);
            highestShape.graphics.s("#888").f("#FFF").rr(x - HIGHEST_WIDTH / 2, y - HIGHEST_HEIGHT / 2, HIGHEST_WIDTH, HIGHEST_HEIGHT, 2);
            highestShape.i = points[highestIndex].index;
            this.highestShape = highestShape;
            this.overlay.addChild(highestShape);

            const label = new cj.Text("Highest: " + points[highestIndex].y, "12px Lato", "#000");
            label.textAlign = "center";
            label.textBaseline = "middle";
            label.x = x;
            label.y = y;
            label.mouseEnabled = false;
            this.overlay.addChild(label);
        }
    }

    private getPlotRect(): PlotArea {
        const canvas = this.stage.canvas as HTMLCanvasElement;
        const scale = this.stage.scaleX || 1;
        const width = canvas.width / scale;
        const height = canvas.height / scale;

        const left = OFFSET_X;
        const top = OFFSET_Y;
        const right = width - PANEL_RIGHT_PAD;
        const bottom = height - PANEL_BOTTOM_PAD;

        return {
            left,
            right,
            top,
            bottom,
            width: right - left,
            height: bottom - top,
        };
    }

    private scaleX(value: number, range: [number, number], rect: PlotArea): number {
        const span = range[1] - range[0] || 1;
        return rect.left + ((value - range[0]) / span) * rect.width;
    }

    private scaleY(value: number, range: [number, number], rect: PlotArea): number {
        const span = range[1] - range[0] || 1;
        return rect.bottom - ((value - range[0]) / span) * rect.height;
    }

    private bindHover() {
        if (!this.currentSpec) return;

        const setVertexScale = (index: number, scale: number) => {
            const v = this.vertices[index];
            if (!v) return;
            v.scaleX = v.scaleY = scale;
        };

        const onOver = (eventObj: Object) => {
            const e = eventObj as cj.Event;
            const target = e.target as cj.Shape & { i?: number };
            if (typeof target.i !== "number") return;
            setVertexScale(target.i, 1.2);
            this.stage.update();
            this.currentSpec?.onHover?.(this.data[target.i], target.i);
        };

        const onOut = (eventObj: Object) => {
            const e = eventObj as cj.Event;
            const target = e.target as cj.Shape & { i?: number };
            if (typeof target.i !== "number") return;
            setVertexScale(target.i, 1);
            this.stage.update();
            this.currentSpec?.onLeave?.();
        };

        this.vertices.forEach((v) => {
            v.addEventListener("mouseover", onOver);
            v.addEventListener("mouseout", onOut);
        });
        if (this.highestShape) {
            this.highestShape.addEventListener("mouseover", onOver);
            this.highestShape.addEventListener("mouseout", onOut);
        }
    }

    private unbindHover() {
        this.vertices.forEach((v) => v.removeAllEventListeners());
        if (this.highestShape) this.highestShape.removeAllEventListeners();
    }
}
