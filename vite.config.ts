import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

export default defineConfig({
    plugins: [
        monkey({
            entry: "src/index.ts",
            userscript: {
                name: "Count-based Rating Graph",
                version: "1.0.0",
                description: "レーティンググラフの横軸を「年月日」から「参加回数」へ切り替え可能にします",
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
