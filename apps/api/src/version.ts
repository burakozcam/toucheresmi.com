import fs from "node:fs";
import path from "node:path";
const root = fs.existsSync(path.resolve(__dirname, "../package.json")) ? path.resolve(__dirname, "..") : path.resolve(__dirname, "../..");
export const API_VERSION: string = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
