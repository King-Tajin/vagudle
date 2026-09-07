// @ts-nocheck
import { readdir, readFile, writeFile, stat, rename } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { optimize } from "svgo";
import ffmpegPath from "ffmpeg-static";
import { exiftool } from "exiftool-vendored";

const runFfmpeg = (file, args) => {
  let child;
  const promise = new Promise((resolve, reject) => {
    child = execFile(file, args, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
  return { promise, child };
};

const OPERATION_TIMEOUT_MS = 60000;

const withTimeout = (promise, label, onTimeout) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`timed out after ${OPERATION_TIMEOUT_MS}ms: ${label}`));
    }, OPERATION_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

if (!ffmpegPath) {
  throw new Error(
    "optimize-dist: ffmpeg-static did not return a binary for this platform"
  );
}
const ffmpegBinary = ffmpegPath;

const distDir = path.resolve(process.cwd(), "dist");
const backgroundsDir = path.join(distDir, "backgrounds");
const soundsDir = path.join(distDir, "sounds");

const svgoConfig = {
  multipass: true,
  js2svg: {
    pretty: false,
  },
  plugins: ["preset-default"],
};

const VIDEO_EXTS = new Set([".mp4", ".webm"]);
const IMAGE_METADATA_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png", ".gif"]);
const SOUND_EXTS = new Set([".ogg", ".mp3", ".wav"]);

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
};

const optimizeSvg = async (filePath) => {
  const before = (await stat(filePath)).size;
  const original = (await readFile(filePath)).toString();
  const result = optimize(original, { ...svgoConfig, path: filePath });
  const output = String(result.data);
  await writeFile(filePath, output);
  const after = Buffer.byteLength(output);
  return { before, after };
};

const minifyJson = async (filePath) => {
  const before = (await stat(filePath)).size;
  const original = (await readFile(filePath)).toString();
  const parsed = JSON.parse(original);
  const minified = JSON.stringify(parsed);
  await writeFile(filePath, minified);
  const after = Buffer.byteLength(minified);
  return { before, after };
};

const probeAlphaMode = async (filePath) => {
  const { promise } = runFfmpeg(ffmpegBinary, [
    "-y",
    "-i",
    filePath,
    "-f",
    "null",
    "-",
  ]);
  const { stderr } = await withTimeout(
    promise,
    `probe alpha_mode: ${filePath}`
  );
  return /alpha_mode\s*:\s*1/.test(stderr) ? "1" : "";
};

const stripVideoMetadata = async (filePath) => {
  const before = (await stat(filePath)).size;
  const tempPath = `${filePath}.stripped${path.extname(filePath)}`;

  const ext = path.extname(filePath).toLowerCase();
  const alphaMode = ext === ".webm" ? await probeAlphaMode(filePath) : "";

  const metadataArgs =
    alphaMode === "1"
      ? [
          "-map_metadata",
          "-1",
          "-map_chapters",
          "-1",
          "-metadata:s:v:0",
          "alpha_mode=1",
        ]
      : ["-map_metadata", "-1", "-map_chapters", "-1"];

  const { promise, child } = runFfmpeg(ffmpegBinary, [
    "-y",
    "-i",
    filePath,
    ...metadataArgs,
    "-c",
    "copy",
    "-fflags",
    "+bitexact",
    "-bitexact",
    tempPath,
  ]);
  await withTimeout(promise, filePath, () => child.kill());
  await rename(tempPath, filePath);
  const after = (await stat(filePath)).size;
  return { before, after };
};

const stripSoundMetadata = async (filePath) => {
  const before = (await stat(filePath)).size;
  const tempPath = `${filePath}.stripped${path.extname(filePath)}`;
  const { promise, child } = runFfmpeg(ffmpegBinary, [
    "-y",
    "-i",
    filePath,
    "-map_metadata",
    "-1",
    "-c",
    "copy",
    "-fflags",
    "+bitexact",
    "-bitexact",
    tempPath,
  ]);
  await withTimeout(promise, filePath, () => child.kill());
  await rename(tempPath, filePath);
  const after = (await stat(filePath)).size;
  return { before, after };
};

const stripImageMetadata = async (filePath) => {
  const before = (await stat(filePath)).size;
  await withTimeout(
    exiftool.write(
      filePath,
      {},
      { writeArgs: ["-overwrite_original", "-all="] }
    ),
    filePath
  );
  const after = (await stat(filePath)).size;
  return { before, after };
};

const run = async () => {
  const startedAt = Date.now();

  let files;
  try {
    files = await walk(distDir);
  } catch {
    console.warn(
      `optimize-dist: no dist/ folder found at ${distDir}, skipping.`
    );
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let svgCount = 0;
  let jsonCount = 0;
  let videoCount = 0;
  let imageCount = 0;
  let soundCount = 0;

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".svg") {
      try {
        const { before, after } = await optimizeSvg(filePath);
        totalBefore += before;
        totalAfter += after;
        svgCount += 1;
      } catch (err) {
        console.warn(
          `optimize-dist: failed to optimize ${filePath}:`,
          err.message
        );
      }
      continue;
    }

    if (ext === ".json") {
      try {
        const { before, after } = await minifyJson(filePath);
        totalBefore += before;
        totalAfter += after;
        jsonCount += 1;
      } catch (err) {
        console.warn(
          `optimize-dist: failed to minify ${filePath}:`,
          err.message
        );
      }
      continue;
    }

    const isInBackgrounds = filePath.startsWith(`${backgroundsDir}${path.sep}`);
    const isInSounds = filePath.startsWith(`${soundsDir}${path.sep}`);

    if (isInSounds && SOUND_EXTS.has(ext)) {
      try {
        const { before, after } = await stripSoundMetadata(filePath);
        totalBefore += before;
        totalAfter += after;
        soundCount += 1;
      } catch (err) {
        console.warn(
          `optimize-dist: failed to strip metadata from ${filePath}:`,
          err.message
        );
      }
      continue;
    }

    if (!isInBackgrounds) continue;

    if (VIDEO_EXTS.has(ext)) {
      try {
        const { before, after } = await stripVideoMetadata(filePath);
        totalBefore += before;
        totalAfter += after;
        videoCount += 1;
      } catch (err) {
        console.warn(
          `optimize-dist: failed to strip metadata from ${filePath}:`,
          err.message
        );
      }
      continue;
    }

    if (IMAGE_METADATA_EXTS.has(ext)) {
      try {
        const { before, after } = await stripImageMetadata(filePath);
        totalBefore += before;
        totalAfter += after;
        imageCount += 1;
      } catch (err) {
        console.warn(
          `optimize-dist: failed to strip metadata from ${filePath}:`,
          err.message
        );
      }
    }
  }

  await exiftool.end().catch(() => {});

  const savedKb = ((totalBefore - totalAfter) / 1024).toFixed(1);
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `optimize-dist: optimized ${svgCount} svg + ${jsonCount} json file(s), stripped metadata from ${videoCount} video + ${imageCount} image file(s) in backgrounds/ and ${soundCount} sound file(s) in sounds/, saved ${savedKb} KB in ${elapsedSec}s`
  );
};

await run();
