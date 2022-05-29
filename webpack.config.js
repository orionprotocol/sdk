const path = require("path");

module.exports = (env, argv) => {
  return {
    mode: "production",
    entry: {
      index: path.resolve(__dirname, "./lib/esm/index.js")
    },
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
        fallback: {
            "crypto": require.resolve("crypto-browserify"),
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify"),
        }
    }
  };
};