import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
    plugins: [
        monkey({
            entry: "src/index.ts",
            userscript: {
                name: "AtCoder More Graphs",
                version: "1.0.0",
                description: "参加回数別のレーティンググラフや、パフォーマンスグラフを追加します。",
                author: "rarula",
                include: [
                    "*://atcoder.jp/users*"
                ],
                exclude: [
                    "*://atcoder.jp/users/*?graph=rank",
                    "*://atcoder.jp/users/*?graph=dist",
                    "*://atcoder.jp/users/*/history*"
                ],
                grant: "none",
                "run-at": "document-end"
            },
            build: {
                fileName: "userscript.js"
            }
        })
    ]
});
