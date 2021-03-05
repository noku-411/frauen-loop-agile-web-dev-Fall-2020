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
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const request = require("request");
const os = require("os");
const path = require("path");
const child_process = require("child_process");
const site_1 = require("./site");
let sitePromise = null;
let diagnosticCollection = null;
function getCachedSite() {
    return __awaiter(this, void 0, void 0, function* () {
        if (sitePromise) {
            return yield sitePromise;
        }
        sitePromise = site_1.getSite();
        return yield sitePromise;
    });
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('markdown', {
        provideCompletionItems: (document, position, token, context) => __awaiter(this, void 0, void 0, function* () {
            const mdContext = getContext(document, position);
            const textUntilPosition = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
            const isFirstColumn = position.character === 0;
            const suggestions = [];
            if (mdContext.isInFrontMatter) {
                if (/^Id:\s*$/i.test(textUntilPosition)) {
                    const range = new vscode.Range(position.line, position.character, position.line, getEndOfLineCharacter(document, position.line));
                    suggestions.push({
                        label: 'New id',
                        insertText: CreateUUID(),
                        kind: vscode.CompletionItemKind.Value,
                        range: range
                    });
                }
                if (/^PublishDate:\s*$/i.test(textUntilPosition)) {
                    const range = new vscode.Range(position.line, position.character, position.line, getEndOfLineCharacter(document, position.line));
                    suggestions.push({
                        label: 'Next Monday',
                        insertText: formatDate(getNextMonday()),
                        kind: vscode.CompletionItemKind.Value,
                        range: range
                    });
                    suggestions.push({
                        label: 'Tomorrow',
                        insertText: formatDate(getTomorrow()),
                        kind: vscode.CompletionItemKind.Value,
                        range: range
                    });
                    suggestions.push({
                        label: 'Today',
                        insertText: formatDate(getToday()),
                        kind: vscode.CompletionItemKind.Value,
                        range: range
                    });
                }
                if (/^Description:\s*(")?$/i.test(textUntilPosition)) {
                    const range = new vscode.Range(position.line, position.character, position.line, position.character);
                    suggestions.push({
                        label: 'Sample description',
                        insertText: 'In this post, I describe how .',
                        kind: vscode.CompletionItemKind.Value,
                        range: range
                    });
                }
                if (/^\s*-\s*$/i.test(textUntilPosition) || isFirstColumn) {
                    let terms = [];
                    if (mdContext.lastPropertyBeforeCurrentPosition === "Categories") {
                        terms = (yield getCachedSite()).categories;
                    }
                    else if (mdContext.lastPropertyBeforeCurrentPosition === "Tags") {
                        terms = (yield getCachedSite()).tags;
                    }
                    else if (mdContext.lastPropertyBeforeCurrentPosition === "Series") {
                        terms = (yield getCachedSite()).series;
                    }
                    for (let term of terms) {
                        suggestions.push({
                            label: term,
                            insertText: isFirstColumn ? "- " + term : term,
                            kind: vscode.CompletionItemKind.Value,
                        });
                    }
                }
                if (isFirstColumn) {
                    for (let missingProperty of mdContext.missingProperties) {
                        suggestions.push({
                            label: missingProperty,
                            insertText: missingProperty + ": ",
                            kind: vscode.CompletionItemKind.Property,
                        });
                    }
                }
            }
            else {
                // Suggest files from the current directory for images `![]()`
                const assetMatch = textUntilPosition.match(/(?<=!\[.*\]\()[^)]*$/);
                if (assetMatch) {
                    const matchPosition = assetMatch.index;
                    const line = document.lineAt(position.line);
                    const endOfBlock = line.text.indexOf(")", matchPosition);
                    const range = new vscode.Range(position.line, matchPosition, position.line, endOfBlock ? endOfBlock + 1 : matchPosition);
                    const files = yield fs.promises.readdir(path.dirname(document.fileName));
                    for (const file of files) {
                        if (file === path.basename(document.fileName)) {
                            continue;
                        }
                        suggestions.push({
                            label: file,
                            insertText: file + ")",
                            kind: vscode.CompletionItemKind.File,
                            range: range
                        });
                    }
                }
                // Suggest post from the site for links `[]()`
                const linkMatch = textUntilPosition.match(/(?<=(?<!!)\[.*\]\()[^)]*$/);
                if (linkMatch) {
                    const matchPosition = linkMatch.index;
                    const line = document.lineAt(position.line);
                    const endOfBlock = line.text.indexOf(")", matchPosition);
                    const range = new vscode.Range(position.line, matchPosition, position.line, endOfBlock ? endOfBlock + 1 : matchPosition);
                    const site = yield getCachedSite();
                    for (const post of site.posts) {
                        suggestions.push({
                            label: post.title,
                            insertText: post.id + ")",
                            kind: vscode.CompletionItemKind.EnumMember,
                            range: range
                        });
                    }
                }
                if (/^\s*`{3,}$/.test(textUntilPosition)) {
                    const languages = ["bash", "bnf", "crontab", "csharp", "css", "html", "ini", "javascript", "json", "less", "nginx", "php", "powershell", "razor", "reg", "sass", "sql", "text", "typescript", "xaml", "xml", "yaml"];
                    for (const language of languages) {
                        suggestions.push({
                            label: "Language " + language,
                            insertText: language,
                            kind: vscode.CompletionItemKind.Value,
                        });
                    }
                }
                if (isFirstColumn) {
                    const languages = ["csharp", "html", "javascript", "typescript"];
                    for (const language of languages) {
                        suggestions.push({
                            label: language + ' code section',
                            insertText: '```' + language + '\n\n```\n',
                            kind: vscode.CompletionItemKind.Snippet,
                        });
                    }
                    suggestions.push({
                        label: 'Figure',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '^^^\n\n^^^Legend\n'
                    });
                    suggestions.push({
                        label: 'warning section',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '> warning: '
                    });
                    suggestions.push({
                        label: 'tip section',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '> tip: '
                    });
                    suggestions.push({
                        label: 'note section',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '> note: '
                    });
                    suggestions.push({
                        label: 'video without sound',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '![](){autoplay controls muted loop}'
                    });
                    suggestions.push({
                        label: 'quote with cite',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '> \n>\n> ""author""'
                    });
                    suggestions.push({
                        label: 'Table of content',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '[TOC]\n\n'
                    });
                    suggestions.push({
                        label: 'Google Ads',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '[GOOGLE_ADS]\n\n'
                    });
                    suggestions.push({
                        label: 'Google Ads (Post list)',
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: '[GOOGLE_ADS_POST_LIST]\n\n'
                    });
                }
                for (const emoji of ['👇', '👈', '👉', '👆']) {
                    suggestions.push({
                        label: 'Emoji: ' + emoji,
                        kind: vscode.CompletionItemKind.Snippet,
                        insertText: emoji
                    });
                }
            }
            return suggestions;
        }),
    }));
    context.subscriptions.push(vscode.languages.registerHoverProvider('markdown', {
        provideHover: (document, position) => __awaiter(this, void 0, void 0, function* () {
            const textUntilPosition = document.lineAt(position.line).text;
            const linkRegex = /(?<=(?<!!)\[.*\]\()[^)]*(?=\))/g;
            let match = null;
            do {
                match = linkRegex.exec(textUntilPosition);
                if (match && match.index <= position.character && position.character <= match.index + match[0].length) {
                    const site = yield getCachedSite();
                    const post = site.posts.find(p => p.id === match[0]);
                    if (post) {
                        const hover = new vscode.MarkdownString();
                        hover.appendText(post.title + " ");
                        hover.appendMarkdown(`[${vscode.workspace.asRelativePath(post.filePath)}](${vscode.Uri.file(post.filePath).toString()})`);
                        try {
                            return {
                                contents: [
                                    hover
                                ],
                            };
                        }
                        catch (ex) {
                            console.log(ex);
                        }
                    }
                }
            } while (match);
            return {
                contents: [],
            };
        })
    }));
    diagnosticCollection = vscode.languages.createDiagnosticCollection('markdown');
    context.subscriptions.push(diagnosticCollection, vscode.workspace.onDidOpenTextDocument(onDidOpenTextDocument), vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument), vscode.workspace.onDidCloseTextDocument(onDidCloseTextDocument));
    context.subscriptions.push(vscode.commands.registerCommand("mez-editor.new-post", () => __awaiter(this, void 0, void 0, function* () {
        // Create file with default content
        let dataFolder = site_1.getDataFolder();
        if (!dataFolder) {
            vscode.window.showErrorMessage("Open the data folder");
            return;
        }
        let newFolderPath = path.join(dataFolder, "blog", "9999", "99991231_new");
        if (fs.existsSync(newFolderPath)) {
            let i = 1;
            while (fs.existsSync(newFolderPath + i)) {
                i++;
            }
            newFolderPath = newFolderPath + i;
        }
        const newFilePath = path.join(newFolderPath, "99991231_new.md");
        const content = `---
Id: ${CreateUUID()}
Title: ""
Description: ""
PublishDate: 9999-12-31T12:00:00Z
Language: en
Categories:
-
---

`;
        yield fs.promises.mkdir(newFolderPath);
        yield fs.promises.writeFile(newFilePath, content, { encoding: "utf8" });
        var openPath = vscode.Uri.file(newFilePath);
        const textDocument = yield vscode.workspace.openTextDocument(openPath);
        const textEditor = yield vscode.window.showTextDocument(textDocument);
        textEditor.selection = new vscode.Selection(textEditor.document.lineCount, 1, textEditor.document.lineCount, 1);
    })));
    context.subscriptions.push(vscode.commands.registerCommand("mez-editor.preview-site", () => __awaiter(this, void 0, void 0, function* () {
        const tasks = yield vscode.tasks.fetchTasks();
        const previewTask = tasks.find(t => t.name === "Preview website");
        if (previewTask) {
            vscode.tasks.executeTask(previewTask);
        }
        const buildTask = tasks.find(t => t.name === "Build data (fast)");
        if (buildTask) {
            vscode.tasks.executeTask(buildTask);
        }
    })));
    context.subscriptions.push(vscode.commands.registerCommand("mez-editor.publish-site", () => __awaiter(this, void 0, void 0, function* () {
        const tasks = yield vscode.tasks.fetchTasks();
        const task = tasks.find(t => t.name === "Publish");
        if (task) {
            vscode.tasks.executeTask(task);
        }
    })));
    context.subscriptions.push(vscode.commands.registerCommand("mez-editor.video-optimize-for-web", (file) => __awaiter(this, void 0, void 0, function* () {
        try {
            vscode.window.showInformationMessage("Optimizing video");
            yield executeFfmpegCommand(file.fsPath, ["-movflags", "faststart", "-acodec", "copy", "-vcodec", "copy"]);
            vscode.window.showInformationMessage("Video optimized");
        }
        catch (ex) {
            vscode.window.showErrorMessage("Error: " + ex);
        }
    })));
    context.subscriptions.push(vscode.commands.registerCommand("mez-editor.video-remove-audio", (file) => __awaiter(this, void 0, void 0, function* () {
        try {
            vscode.window.showInformationMessage("Removing audio");
            yield executeFfmpegCommand(file.fsPath, ["-movflags", "faststart", "-an", "-vcodec", "copy"]);
            vscode.window.showInformationMessage("Audio tracks removed & video optimized for web");
        }
        catch (ex) {
            vscode.window.showErrorMessage("Error: " + ex);
        }
    })));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
function onDidOpenTextDocument(e) {
    lint(e);
}
function onDidCloseTextDocument(e) {
    diagnosticCollection === null || diagnosticCollection === void 0 ? void 0 : diagnosticCollection.clear();
}
function onDidChangeTextDocument(e) {
    lint(e.document);
}
function lint(document) {
    if (!diagnosticCollection || document.languageId !== "markdown") {
        return;
    }
    const diagnostics = [];
    let isFrontMatter = false;
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;
        if (text === "---") {
            if (isFrontMatter) {
                break; // End of parsing
            }
            else if (i === 0) {
                isFrontMatter = true;
            }
            else {
                break; // no front matter
            }
        }
        if (text.startsWith("Title:")) {
            const titleValue = text.substring("Title:".length).trim();
            const length = titleValue.startsWith("\"") ? titleValue.length - 2 : titleValue.length;
            if (length < 40 || length > 65) {
                const range = new vscode.Range(i, 0, i, getEndOfLineCharacter(document, i));
                diagnostics.push(new vscode.Diagnostic(range, `Title should be between 40 and 60 characters. Actual length: ${length}.`, vscode.DiagnosticSeverity.Warning));
            }
        }
        if (text.startsWith("Description:")) {
            const descriptionValue = text.substring("Description:".length).trim();
            const length = descriptionValue.startsWith("\"") ? descriptionValue.length - 2 : descriptionValue.length;
            if (length < 120 || length > 158) {
                const range = new vscode.Range(i, 0, i, getEndOfLineCharacter(document, i));
                diagnostics.push(new vscode.Diagnostic(range, `Description should be between 120 and 158 characters. Actual length: ${length}.`, vscode.DiagnosticSeverity.Warning));
            }
        }
    }
    diagnosticCollection.clear();
    diagnosticCollection.set(document.uri, diagnostics);
}
function getEndOfLineCharacter(document, line) {
    return document.lineAt(line).range.end.character;
}
function formatDate(date) {
    return toString(date.getUTCFullYear(), 4) + "-" + toString(date.getUTCMonth() + 1, 2) + "-" + toString(date.getUTCDate(), 2) + "T" + toString(date.getUTCHours(), 2) + ":" + toString(date.getUTCMinutes(), 2) + ":00.0000000Z";
    function toString(value, length) {
        return String(value).padStart(length, "0");
    }
}
function getToday() {
    var d = new Date();
    d.setUTCFullYear(new Date().getFullYear());
    d.setUTCMonth(new Date().getMonth());
    d.setUTCDate(new Date().getDate());
    d.setUTCHours(12, 0, 0, 0);
    return d;
}
function getTomorrow() {
    return new Date(getToday().getTime() + 24 * 60 * 60 * 1000);
}
function getNextMonday() {
    var d = getToday();
    var daysToAdd = (1 + 7 - d.getDay()) % 7;
    if (daysToAdd === 0) {
        daysToAdd = 7;
    }
    d.setUTCDate(d.getDate() + daysToAdd);
    d.setUTCHours(12, 0, 0, 0);
    return d;
}
function CreateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function getContext(document, position) {
    let allProperties = [
        "Id",
        "Layout",
        "Title",
        "Description",
        "PublishDate",
        "ShowAds",
        "Urls",
        "Excerpt",
        "Language",
        "Categories",
        "Series",
        "CoverImage",
        "CoverImageTitle",
        "CoverImageCategory",
        "ShowInFeed",
        "StatusCode",
    ];
    const hasFrontMatter = document.lineAt(0).text === "---";
    if (hasFrontMatter) {
        let lastFrontMatterLine = -1;
        let lastProperty = "";
        for (let i = 1; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (line.text === "---") {
                lastFrontMatterLine = i;
                break;
            }
            const propertyNameSeparatorPosition = line.text.indexOf(":");
            if (propertyNameSeparatorPosition > 0) {
                const propertyName = line.text.substring(0, propertyNameSeparatorPosition);
                if (line.lineNumber <= position.line) {
                    lastProperty = propertyName;
                }
                allProperties = allProperties.filter(item => item !== propertyName);
            }
        }
        return {
            isInFrontMatter: lastFrontMatterLine < 0 || lastFrontMatterLine > position.line,
            missingProperties: allProperties,
            lastPropertyBeforeCurrentPosition: lastProperty
        };
    }
    return {
        isInFrontMatter: false,
        missingProperties: [],
        lastPropertyBeforeCurrentPosition: ""
    };
}
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const sendReq = request.get(url);
        // verify response code
        sendReq.on('response', (response) => {
            if (response.statusCode !== 200) {
                return reject('Response status was ' + response.statusCode);
            }
            sendReq.pipe(file);
        });
        file.on('finish', () => {
            file.close();
            resolve();
        });
        sendReq.on('error', (err) => __awaiter(this, void 0, void 0, function* () {
            yield fs.promises.unlink(dest);
            return reject(err.message);
        }));
        file.on('error', (err) => __awaiter(this, void 0, void 0, function* () {
            yield fs.promises.unlink(dest);
            return reject(err.message);
        }));
    });
}
function extractFile(zipArchive, file, destinationFile) {
    return new Promise((resolve, reject) => {
        const StreamZip = require('node-stream-zip');
        const zip = new StreamZip({
            file: zipArchive,
            storeEntries: true
        });
        zip.on('error', (err) => reject(err));
        zip.on('ready', () => {
            zip.extract(file, destinationFile, (err) => {
                zip.close();
                reject(err);
            });
        });
    });
}
function executeFfmpegCommand(file, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const ffmpeg = path.join(os.tmpdir(), "ffmpeg.exe");
        if (!fs.existsSync(ffmpeg)) {
            vscode.window.showInformationMessage("Downloading ffmpeg");
            const zipfile = ffmpeg + ".zip";
            if (!fs.existsSync(zipfile)) {
                yield downloadFile("https://ffmpeg.zeranoe.com/builds/win64/static/ffmpeg-4.2.1-win64-static.zip", zipfile);
            }
            yield extractFile(zipfile, "ffmpeg-4.2.1-win64-static/bin/ffmpeg.exe", ffmpeg);
        }
        // Execute ffmpeg command
        const tmpFile = file + ".tmp" + path.extname(file);
        yield new Promise((resolve, reject) => {
            vscode.window.showInformationMessage("Executing ffmpeg command");
            const process = child_process.spawn(ffmpeg, ["-y", "-i", file, ...args, tmpFile], {
                detached: false
            });
            process.stdout.setEncoding("utf8");
            process.stderr.setEncoding("utf8");
            process.stdout.on('data', (data) => {
                console.log(`child stdout:\n${data}`);
            });
            process.stderr.on('data', (data) => {
                console.error(`child stderr:\n${data}`);
            });
            process.on("exit", () => resolve());
            process.on("error", () => reject());
        });
        if (fs.existsSync(tmpFile)) {
            yield fs.promises.unlink(file);
            yield fs.promises.rename(tmpFile, file);
        }
    });
}
//# sourceMappingURL=extension.js.map