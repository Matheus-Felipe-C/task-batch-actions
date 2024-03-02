import dotenv from "dotenv"
import esbuild from "esbuild"

dotenv.config();

const result = await esbuild.build({
    entryPoints: [`plugin.js`],
    bundle: true,
    format: "iife",
    outfile: "build/compiled.js",
    packages: "external",
    platform: "node",
    write: true,
});
console.log("Build result", result)