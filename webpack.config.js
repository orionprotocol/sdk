const path = require("path");

module.exports = (env, argv) => {
  return {
    mode: "production",
    entry: {
      index: path.resolve(__dirname, "./lib/esm/index.js")
    },
    externals: [
      'node:util',
      'node:zlib',
      'node:url',
      'node:stream',
      'node:stream/web',
      'node:process',
      'node:path',
      'node:net',
      'node:http',
      'node:https',
      'node:fs',
      'node:buffer',
      'worker_threads',
      'unfetch'
    ],
    output: {
      path: path.resolve(__dirname, "./lib/umd"), // builds to ./lib/umd/
      filename: "[name].js", // index.js
      library: "orionprotocol", // aka window.myLibrary
      libraryTarget: "umd", // supports commonjs, amd and web browsers
      globalObject: "this"
    },
    module: {
      rules: [{ test: /\.t|js$/, use: "babel-loader" }]
    },
    resolve: {
       extensions: ['.ts', '.js'],
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify"),
        }
    }
  };
};