const upstreamTransformer = require(
  'expo/node_modules/@expo/metro-config/build/babel-transformer.js'
);

const clerkEnvModule = /[\\/]@clerk[\\/]shared[\\/]dist[\\/]getEnvVariable\.mjs$/;
const importMetaEnvFallback =
  /if\s*\(typeof import\.meta !== "undefined" && import\.meta\.env && typeof import\.meta\.env\[name\] === "string"\)\s*return import\.meta\.env\[name\];?/;

module.exports.transform = (args) => {
  const src = clerkEnvModule.test(args.filename)
    ? args.src.replace(importMetaEnvFallback, '')
    : args.src;

  return upstreamTransformer.transform({
    ...args,
    src,
  });
};
