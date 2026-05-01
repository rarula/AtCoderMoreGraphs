import * as cj from "createjs-module";
import { Graph, type GraphSpec } from "./types/graph";
import { Status } from "./types/status";
import type { RatingEntry } from "./types/ratingEntry";

const SETUP_RETRY_INTERVAL_MS = 50; // セットアップのリトライ間隔（ms）
const COUNT_MARGIN = 2 / 3; // CountグラフのX軸の余白

// HTML要素の作成
const ELEM_DIVIDER = document.createElement("span");
ELEM_DIVIDER.className = "divider";

const ELEM_BUTTON = document.createElement("button");
ELEM_BUTTON.className = "btn btn-primary";
ELEM_BUTTON.type = "button";
ELEM_BUTTON.id = "graphViewSwitcher";
ELEM_BUTTON.style = "margin-left: 3px; width: 120px;";

// グラフの定義
const RATING_Y_AXIS: GraphSpec<RatingEntry>["yAxis"] = {
    value: (entry) => entry.NewRating,
    range: (data) => {
        const minRaw = Math.min(...data.map(entry => entry.NewRating));
        const maxRaw = Math.max(...data.map(entry => entry.NewRating));
        const min = Math.min(1500, Math.max(0, minRaw - 100));
        const max = maxRaw + 300;
        return [min, max];
    },
    ticks: ([min, max]) => {
        const out: number[] = [];
        const step = 400;
        for (let t = Math.ceil(min / step) * step; t <= max; t += step) out.push(t);
        return out;
    },
    tickFormatter: (tick) => tick.toString(),
};

const GRAPH_DATE: GraphSpec<RatingEntry> = {
    id: "date",
    buttonLabel: "Date",
    xAxisMode: "date",
    xAxis: {
        value: (entry) => entry.EndTime,
        range: (data) => {
            const min = Math.min(...data.map(entry => entry.EndTime)) - 86400 * 30;
            const max = Math.max(...data.map(entry => entry.EndTime)) + 86400 * 30;
            return [min, max];
        },
        ticks: () => [],
        tickFormatter: () => "",
    },
    yAxis: RATING_Y_AXIS,
};

const GRAPH_COUNT: GraphSpec<RatingEntry> = {
    id: "count",
    buttonLabel: "Count",
    xAxisMode: "count",
    xAxis: {
        value: (_entry, index) => index + 1,
        range: (data) => {
            const n = Math.max(1, data.length);
            return [1 - COUNT_MARGIN, n + COUNT_MARGIN];
        },
        ticks: ([min, max]) => {
            const minTick = Math.ceil(min);
            const maxTick = Math.floor(max);
            const out: number[] = [];
            const step = Math.max(1, Math.ceil((maxTick - minTick) / 8));
            for (let t = minTick; t <= maxTick; t += step) out.push(t);
            return out;
        },
        tickFormatter: (tick) => tick.toString(),
    },
    yAxis: RATING_Y_AXIS,
};

function cloneCanvas(oldCanvas: HTMLCanvasElement, newId: string): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.id = newId;
    canvas.width = oldCanvas.width;
    canvas.height = oldCanvas.height;
    canvas.className = oldCanvas.className;
    canvas.style.cssText = oldCanvas.style.cssText;
    return canvas;
}

function replaceOriginalRatingGraph(): { graph: HTMLCanvasElement; status: HTMLCanvasElement } | null {
    const oldGraph = document.getElementById("ratingGraph");
    const oldStatus = document.getElementById("ratingStatus");

    if (!(oldGraph instanceof HTMLCanvasElement) || !(oldStatus instanceof HTMLCanvasElement)) return null;

    const newGraph = cloneCanvas(oldGraph, "ratingGraphCustom");
    const newStatus = cloneCanvas(oldStatus, "ratingStatusCustom");

    oldGraph.replaceWith(newGraph);
    oldStatus.replaceWith(newStatus);

    return { graph: newGraph, status: newStatus };
}

function initStage(stage: cj.Stage, canvas: HTMLCanvasElement) {
    const width = canvas.getAttribute("width");
    const height = canvas.getAttribute("height");
    if (width && height && window.devicePixelRatio) {
        canvas.setAttribute("width", String(Math.round(Number(width) * window.devicePixelRatio)));
        canvas.setAttribute("height", String(Math.round(Number(height) * window.devicePixelRatio)));
        stage.scaleX = stage.scaleY = window.devicePixelRatio;
    }
    canvas.style.maxWidth = width + "px";
    canvas.style.maxHeight = height + "px";
    canvas.style.width = canvas.style.height = "100%";
    stage.enableMouseOver();
}

let tickerBound = false;

function setup(): void {
    console.log("Setting up...");

    // グラフの初期化と描画
    const replaced = replaceOriginalRatingGraph();
    if (!replaced) return;

    const stageStatus = new cj.Stage(replaced.status);
    const stageGraph = new cj.Stage(replaced.graph);
    initStage(stageStatus, replaced.status);
    initStage(stageGraph, replaced.graph);

    const statusPanel = new Status(stageStatus, replaced.status);
    let lastEntry = window.rating_history[window.rating_history.length - 1];
    statusPanel.setStatus(lastEntry, false);

    const onHover = (entry: RatingEntry) => {
        lastEntry = entry;
        statusPanel.setStatus(entry, true);
    };

    // onLeave は指定しない
    const specs: GraphSpec<RatingEntry>[] = [
        { ...GRAPH_DATE, onHover },
        { ...GRAPH_COUNT, onHover }
    ];
    let activeGraphIndex = 0;

    const graph = new Graph<RatingEntry>(stageGraph);
    graph.setData(window.rating_history);
    graph.render(specs[0]);

    if (!tickerBound) {
        tickerBound = true;
        cj.Ticker.setFPS(60);
        cj.Ticker.addEventListener("tick", () => {
            statusPanel.updateParticles();
            stageStatus.update();
        });
    }

    // ボタンをページに追加
    const buttonParents = document.getElementsByClassName("btn-text-group");
    const buttonParent = buttonParents[buttonParents.length - 1];
    buttonParent.appendChild(ELEM_DIVIDER);
    buttonParent.appendChild(ELEM_BUTTON);

    ELEM_BUTTON.textContent = "View by " + specs[(activeGraphIndex + 1) % specs.length].buttonLabel;

    // ボタンのクリックイベントを設定
    ELEM_BUTTON.addEventListener("click", () => {
        activeGraphIndex = (activeGraphIndex + 1) % specs.length;
        graph.render(specs[activeGraphIndex]);
        ELEM_BUTTON.textContent = "View by " + specs[(activeGraphIndex + 1) % specs.length].buttonLabel;
        console.log(`Switched to graph: ${specs[activeGraphIndex].id}`);
    });

    console.log("Setup completed.");
}

function wait(): void {
    function trySetup() {
        if (window.rating_history && document.getElementById("ratingGraph") && document.getElementById("ratingStatus")) {
            setup();
        } else {
            setTimeout(trySetup, SETUP_RETRY_INTERVAL_MS);
        }
    }
    trySetup();
}

wait();
