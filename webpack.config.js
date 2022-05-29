const path = require("path");

module.exports = (env, argv) => {
  return {
    mode: "production",
    entry: './src/index.ts',
    // devtool: 'inline-source-map',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [{
            loader: 'ts-loader',
            options: { allowTsInNodeModules: true }
          }]
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, "lib"), // builds to ./lib
      filename: "[name].js", // index.js
      library: {
        name: 'orionprotocol', // aka window.myLibrary
        type: 'umd', // supports commonjs, amd and web browsers
      },
      globalObject: "this"
    },
    resolve: {
       extensions: ['.ts', '.js'],
        // fallback: {
        //     "crypto": require.resolve("crypto-browserify"),
        //     "buffer": require.resolve("buffer/"),
        //     "stream": require.resolve("stream-browserify"),
        // }
    }
  };
};