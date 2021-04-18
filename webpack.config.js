const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { VueLoaderPlugin } = require("vue-loader");

const mode = process.env.NODE_ENV || "production";

const webConfig = {
    mode,
    entry: "./src/app/renderer.ts",
    module: {
        rules: [
            {
                test: /\.vue$/,
                use: "vue-loader",
            },
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({ template: "./src/index.html" }),
        new VueLoaderPlugin(),
        new CopyPlugin({
            patterns: [{ from: "src/app", to: "app" }],
        }),
    ],
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".vue"],
    },
    output: {
        filename: "renderer.js",
        path: path.resolve(__dirname, "dist"),
    },
};

const electronMainConfig = {
    mode,
    target: "electron-main",
    entry: "./src/electron/main.ts",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
    },
};

const electronPreloadConfig = {
    mode,
    target: "electron-preload",
    entry: "./src/electron/preload.ts",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        filename: "preload.js",
        path: path.resolve(__dirname, "dist"),
    },
};

module.exports = [webConfig, electronMainConfig, electronPreloadConfig];
