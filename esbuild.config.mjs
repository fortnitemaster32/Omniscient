import esbuild from "esbuild";
import process from "node:process";
import { builtinModules } from "node:module";

const banner = `/* Omniscient - quiz-and-recall study sessions for Obsidian */`;

const prod = process.argv[2] === "production";
const test = process.argv[2] === "test";

const context = await esbuild.context({
    banner: { js: banner },
    entryPoints: test ? ["tests/parser.test.ts"] : ["src/main.ts"],
    bundle: true,
    external: test ? [] : ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    treeShaking: true,
    outfile: test ? ".test-build/parser.test.cjs" : "main.js",
    platform: test ? "node" : "browser",
    define: prod
        ? { "process.env.NODE_ENV": JSON.stringify("production") }
        : {},
});

if (prod) {
    await context.rebuild();
    process.exit(0);
} else if (test) {
    await context.rebuild();
    await context.dispose();
    process.exit(0);
} else {
    await context.watch();
}
