const webpack = require('webpack');
const WorkerUrlPlugin = require('worker-url/plugin');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'STABLE_FEATURE': JSON.stringify(true),
      'EXPERIMENTAL_FEATURE': JSON.stringify(false)
    }),
    new WorkerUrlPlugin()
  ]
};