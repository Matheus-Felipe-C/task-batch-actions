import esbuild from "esbuild"

const result = await esbuild.build({
    entryPoints: ['testing.js'],
    bundle: true,
    format: "iife",
    outfile: "lib/testing.js",
    packages: "external",
    platform: "node",
    write: true,
})

console.log("Build result", result)