#!/usr/bin/env node
const { execFileSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");
const { resolve, basename } = require("path");

const DEFAULT_BUCKET = "ota-charlies-farm";
const DEFAULT_PREFIX = "egg/";
const DEFAULT_REGION = "us-east-2";

const bucket = process.env.OTA_BUCKET ?? DEFAULT_BUCKET;
const prefix = process.env.OTA_PREFIX ?? DEFAULT_PREFIX;
const region = process.env.OTA_REGION ?? DEFAULT_REGION;
const overrideHost = process.env.OTA_BASE_URL;
const overrideVersion = process.env.OTA_VERSION;

const trimSlashes = (value = "") => value.replace(/^\/+|\/+$/g, "");
const ensureTrailingSlash = (value = "") =>
  value.endsWith("/") ? value : `${value}/`;

const normalizedPrefix = ensureTrailingSlash(trimSlashes(prefix));

const runAwsList = () => {
  const args = [
    "s3api",
    "list-objects-v2",
    "--bucket",
    bucket,
    "--prefix",
    normalizedPrefix,
    "--delimiter",
    "/",
    "--region",
    region,
    "--output",
    "json",
  ];

  const result = execFileSync("aws", args, { encoding: "utf8" });
  return JSON.parse(result);
};

const pickLatestPrefix = () => {
  if (overrideVersion) {
    return `${normalizedPrefix}${trimSlashes(overrideVersion)}/`;
  }
  const response = runAwsList();
  const prefixes = (response.CommonPrefixes || [])
    .map((entry) => entry.Prefix)
    .filter(Boolean);
  if (!prefixes.length) {
    throw new Error(`no prefixes found under s3://${bucket}/${normalizedPrefix}`);
  }
  prefixes.sort();
  return prefixes[prefixes.length - 1];
};

const buildBaseUrl = () => {
  const releasePrefix = pickLatestPrefix();
  const host = overrideHost ?? `https://${bucket}.s3.${region}.amazonaws.com`;
  return `${host.replace(/\/$/, "")}/${releasePrefix}`;
};

const manifestPaths = () => {
  const config = JSON.parse(readFileSync("config/eggs.json", "utf8"));
  return config.device.manifests.map((manifest) => manifest.manifest);
};

const rewriteManifestPaths = (baseUrl) => {
  manifestPaths().forEach((manifestPath) => {
    const fullPath = resolve(manifestPath);
    const manifest = JSON.parse(readFileSync(fullPath, "utf8"));
    manifest.builds.forEach((build) => {
      build.parts.forEach((part) => {
        const filename = basename(part.path);
        part.path = `${ensureTrailingSlash(baseUrl)}${filename}`;
      });
    });
    writeFileSync(fullPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  });
};

try {
  const baseUrl = buildBaseUrl();
  console.log(`Using OTA release base: ${baseUrl}`);
  rewriteManifestPaths(baseUrl);
} catch (error) {
  console.error("Failed to update manifests:", error);
  process.exit(1);
}
