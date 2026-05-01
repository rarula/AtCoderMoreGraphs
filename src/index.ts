import * as cj from "createjs-module";
import { Graph, type GraphSpec } from "./types/graph";
import { Status } from "./types/status";
import type { DetailedRatingEntry } from "./types/rating";
import { buildCountXAxis, buildDateXAxis, buildPerformanceYAxis, buildRatingYAxis } from "./common";
import { fetchDetailedHistory } from "./fetch";

const SETUP_RETRY_INTERVAL_MS = 50; // セットアップのリトライ間隔 (ミリ秒)
const COUNT_GRAPH_MARGIN_X = 2 / 3; // 参加回数グラフのX軸の余白サイズ

const GRAPH_RATING_DATE: GraphSpec<DetailedRatingEntry> = {
    id: "date_rating",
    buttonLabel: "Date (Rating)",
    xAxisMode: "date",
    xAxis: buildDateXAxis(),
    yAxis: buildRatingYAxis(),
};

const GRAPH_RATING_COUNT: GraphSpec<DetailedRatingEntry> = {
    id: "count_rating",
    buttonLabel: "Count (Rating)",
    xAxisMode: "count",
    xAxis: buildCountXAxis(COUNT_GRAPH_MARGIN_X),
    yAxis: buildRatingYAxis(),
};

const GRAPH_PERFORMANCE_DATE: GraphSpec<DetailedRatingEntry> = {
    id: "date_performance",
    buttonLabel: "Date (Performance)",
    xAxisMode: "date",
    xAxis: buildDateXAxis(),
    yAxis: buildPerformanceYAxis(),
};

const GRAPH_PERFORMANCE_COUNT: GraphSpec<DetailedRatingEntry> = {
    id: "count_performance",
    buttonLabel: "Count (Performance)",
    xAxisMode: "count",
    xAxis: buildCountXAxis(COUNT_GRAPH_MARGIN_X),
    yAxis: buildPerformanceYAxis(),
};

function replaceOriginalRatingGraph(): { graph: HTMLCanvasElement; status: HTMLCanvasElement } | null {
    const oldGraph = document.getElementById("ratingGraph");
    const oldStatus = document.getElementById("ratingStatus");
    if (!(oldGraph instanceof HTMLCanvasElement) || !(oldStatus instanceof HTMLCanvasElement)) return null;

    const cloneCanvas = (old: HTMLCanvasElement, newId: string): HTMLCanvasElement => {
        const canvas = document.createElement("canvas");
        canvas.id = newId;
        canvas.width = old.width;
        canvas.height = old.height;
        canvas.className = old.className;
        canvas.style.cssText = old.style.cssText;
        return canvas;
    }

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
        stage.scaleX = window.devicePixelRatio;
        stage.scaleY = window.devicePixelRatio;
    }
    canvas.style.maxWidth = width + "px";
    canvas.style.maxHeight = height + "px";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    stage.enableMouseOver();
}

async function setup(): Promise<void> {
    const replaced = replaceOriginalRatingGraph();
    if (!replaced) {
        console.error("AtCoderMoreGraphs: Failed to replace original rating graph/status elements.");
        return;
    }
    if (window.rating_history.length === 0) {
        console.warn("AtCoderMoreGraphs: No rating history data found.");
        return;
    }

    const username = document.querySelector(".username")?.textContent?.trim();
    if (!username) {
        console.error("AtCoderMoreGraphs: Failed to determine username.");
        return;
    }

    const history = await fetchDetailedHistory(username, window.rating_history);
    let lastEntry = history[history.length - 1];
    let tickerBound = false;
    let activeGraphIndex = 0;

    const stageStatus = new cj.Stage(replaced.status);
    const stageGraph = new cj.Stage(replaced.graph);
    initStage(stageStatus, replaced.status);
    initStage(stageGraph, replaced.graph);

    const statusPanel = new Status(stageStatus, replaced.status);
    statusPanel.setStatus(lastEntry, false);

    const onHover = (entry: DetailedRatingEntry) => {
        lastEntry = entry;
        statusPanel.setStatus(entry, true);
    };

    const specs: GraphSpec<DetailedRatingEntry>[] = [
        { ...GRAPH_RATING_DATE, onHover },
        { ...GRAPH_RATING_COUNT, onHover },
        { ...GRAPH_PERFORMANCE_DATE, onHover },
        { ...GRAPH_PERFORMANCE_COUNT, onHover }
    ];

    const graph = new Graph<DetailedRatingEntry>(stageGraph);
    graph.setData(history);

    if (!tickerBound) {
        tickerBound = true;
        cj.Ticker.setFPS(60);
        cj.Ticker.addEventListener("tick", () => {
            statusPanel.updateParticles();
            stageStatus.update();
        });
    }

    const divider = document.createElement("span");
    divider.className = "divider";

    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.type = "button";
    btn.id = "graphViewSwitcher";
    btn.style = "margin-left: 3px; width: 120px;";

    const buttonParents = document.getElementsByClassName("btn-text-group");
    const buttonParent = buttonParents[buttonParents.length - 1];
    buttonParent.appendChild(divider);
    buttonParent.appendChild(btn);

    const updateRender = () => {
        btn.textContent = "View by " + specs[(activeGraphIndex + 1) % specs.length].buttonLabel;
        graph.render(specs[activeGraphIndex]);
    };

    btn.addEventListener("click", () => {
        activeGraphIndex = (activeGraphIndex + 1) % specs.length;
        updateRender();
    });

    updateRender();
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

window.addEventListener("load", wait);
