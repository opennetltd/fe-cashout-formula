const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlInlineScriptPlugin = require('html-inline-script-webpack-plugin');

const outputPath = isProd => isProd ? './../fe-web-mvc/src/modules/main/mobile/cash-out-formula' : './dist';

const exportFtlConfig = (env, argv) => {
  const isProd = argv.mode === 'production';
  return {
    mode: 'development',
    entry: ['./src/index.ts'],
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      modules: ['node_modules'],
    },
    output: {
      path: path.resolve(__dirname, outputPath(isProd)),
      library: {
        name: 'cashoutFormula',
        type: 'var',
      },
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [/node_modules|vendor/],
          use: [
            {
              loader: 'babel-loader',
              options: { cacheDirectory: true },
            },
          ],
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: 'fe-cashout-formula',
        filename: isProd ? 'index.ftl' : 'index.html',
      }),
      new HtmlInlineScriptPlugin({
        htmlMatchPattern: [/index.html$/, /index.ftl$/],
      }),
    ],
  };
};

//

const exportJSConfig = (env, argv) => {
  const isProd = argv.mode === 'production';
  return {
    mode: 'development',
    entry: ['./src/index.ts'],
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      modules: ['node_modules'],
    },
    output: {
      path: path.resolve(__dirname, outputPath(isProd)),
      library: {
        // name: 'cashoutFormula',
        type: 'umd',
      },
      filename: 'formula.js',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [/node_modules|vendor/],
          use: [
            {
              loader: 'babel-loader',
              options: { cacheDirectory: true },
            },
          ],
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
  };
};

module.exports = [exportFtlConfig, exportJSConfig];
