const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const mobileNodeModules = path.resolve(projectRoot, "node_modules");
const rootNodeModules = path.resolve(monorepoRoot, "node_modules");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: web hoists react@18 to root; mobile needs react@19 only — pin singletons to apps/mobile.
const singletonPackages = [
  "react",
  "react-native",
  "expo",
  "expo-router",
  "@react-navigation/native",
];

config.resolver.extraNodeModules = {
  ...singletonPackages.reduce((acc, name) => {
    acc[name] = path.join(mobileNodeModules, name);
    return acc;
  }, {}),
  "@intencity/shared": path.resolve(monorepoRoot, "packages/shared"),
};

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [mobileNodeModules, rootNodeModules];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
