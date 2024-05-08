import esbuild from "esbuild"

const result = await esbuild.build({
    entryPoints: ['plugin.js'],
    bundle: true,
    format: "iife",
    outfile: "lib/compiledTest.js",
    packages: "external",
    platform: "node",
    write: true,
})

console.log("Build result", result)