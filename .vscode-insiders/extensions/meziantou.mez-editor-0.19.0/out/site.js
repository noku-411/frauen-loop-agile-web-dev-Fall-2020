"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSite = exports.getDataFolder = exports.getSiteYmlFilePath = void 0;
const vscode_1 = require("vscode");
const path = require("path");
const fs = require("fs");
const jsyaml = require("js-yaml");
const frontMatter = require("front-matter");
function getSiteYmlFilePath() {
    if (!vscode_1.workspace.workspaceFolders || vscode_1.workspace.workspaceFolders.length === 0) {
        return null;
    }
    const rootFolder = vscode_1.workspace.workspaceFolders[0].uri.fsPath;
    let siteFilePath = path.join(rootFolder, "_site.yml");
    if (fs.existsSync(siteFilePath)) {
        return siteFilePath;
    }
    siteFilePath = path.join(rootFolder, "data", "_site.yml");
    if (fs.existsSync(siteFilePath)) {
        return siteFilePath;
    }
    return null;
}
exports.getSiteYmlFilePath = getSiteYmlFilePath;
function getDataFolder() {
    const site = getSiteYmlFilePath();
    if (!site) {
        return null;
    }
    return path.dirname(site);
}
exports.getDataFolder = getDataFolder;
function getSite() {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const result = empty();
        const root = getDataFolder();
        if (!root) {
            return result;
        }
        const sitePath = path.join(root, "_site.yml");
        const siteContent = yield fs.promises.readFile(sitePath, "utf-8");
        try {
            const yaml = jsyaml.safeLoad(siteContent);
            result.categories = ((_a = yaml.Taxonomies.find(t => t.Name === "Categories")) === null || _a === void 0 ? void 0 : _a.Terms.map(t => t.Name)) || [];
            result.tags = ((_b = yaml.Taxonomies.find(t => t.Name === "Tags")) === null || _b === void 0 ? void 0 : _b.Terms.map(t => t.Name)) || [];
            result.series = ((_c = yaml.Taxonomies.find(t => t.Name === "Series")) === null || _c === void 0 ? void 0 : _c.Terms.map(t => t.Name)) || [];
        }
        catch (_d) {
        }
        // load all posts
        const files = yield scan(root);
        for (const file of files.filter(f => /\.md$/i.test(f))) {
            const fileContent = yield fs.promises.readFile(file, "utf-8");
            const fm = frontMatter(fileContent);
            const attributes = fm.attributes;
            // Filter out comments
            if (attributes.ParentItem) {
                continue;
            }
            const id = attributes.Id;
            const title = attributes.Title;
            if (id && title) {
                result.posts.push({
                    id: id,
                    title: title,
                    filePath: file
                });
            }
        }
        return result;
    });
}
exports.getSite = getSite;
function empty() {
    return {
        posts: [],
        series: [],
        categories: [],
        tags: [],
    };
}
function scan(directoryName) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = [];
        yield scanImpl(directoryName, result);
        return result;
        function scanImpl(directoryName, results) {
            return __awaiter(this, void 0, void 0, function* () {
                let files = yield fs.promises.readdir(directoryName, { withFileTypes: true });
                for (let f of files) {
                    let fullPath = path.join(directoryName, f.name);
                    if (f.isDirectory()) {
                        yield scanImpl(fullPath, results);
                    }
                    else {
                        results.push(fullPath);
                    }
                }
                return results;
            });
        }
    });
}
//# sourceMappingURL=site.js.map