module.exports = {
  presets: [
    // modules: false conserve les imports/exports : Jest exécute les tests en ESM.
    ["@babel/preset-env", { targets: { node: "current" }, modules: false }],
    "@babel/preset-typescript",
  ],
};