"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageEngine = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const word_extractor_1 = __importDefault(require("word-extractor"));
const storage_1 = require("@google-cloud/storage");
const PDFParser = require("pdf-parse");
const mammoth = require("mammoth");
class S3StorageEngine {
    constructor(options) {
        this.options = {
            ...options,
        };
        this.uploadRoot = this.options.uploadDirectory;
        this.storage = new storage_1.Storage({
            credentials: {
                client_email: this.options.clientEmail,
                private_key: this.options.privateKey,
            },
        });
    }
    async saveFile(currentPath, name) {
        console.log("saveFile", currentPath, name);
        await this.storage.bucket(this.options.bucket).upload(currentPath, {
            destination: name,
        });
    }
    async readFile(name) {
        console.log("readFile", name);
        name = name.replace("uploads/", "");
        if (await this.storage.bucket(this.options.bucket).file(name).exists()) {
            return this.storage.bucket(this.options.bucket).file(name).createReadStream();
        }
        throw Error("File does not exist");
    }
    async deleteFile(name) {
        console.log("deleteFile", name);
        name = name.replace("uploads/", "");
        await this.storage.bucket(this.options.bucket).file(name).delete();
    }
    async getText(name) {
        return new Promise(async (resolve, reject) => {
            console.log("getText", name);
            try {
                const extension = path.extname(name).toLowerCase();
                const SUPPORTED_FILE_TYPES = [".pdf", ".docx", ".doc"];
                if (!SUPPORTED_FILE_TYPES.includes(extension)) {
                    resolve(null);
                    return;
                }
                try {
                    const stream = await this.readFile(name);
                    stream.on("error", err => {
                        console.warn(err);
                        reject();
                    });
                    const tmpName = path.join(os.tmpdir(), crypto.randomBytes(16).toString("hex") + extension);
                    const fileStream = fs.createWriteStream(tmpName);
                    stream.once("finish", async () => {
                        try {
                            let text = "";
                            if (extension === ".pdf") {
                                const buffer = await fs.promises.readFile(tmpName);
                                const data = await PDFParser(buffer);
                                text = data.text;
                            }
                            else if (extension === ".docx") {
                                const data = await mammoth.extractRawText({ path: tmpName });
                                text = data.value;
                            }
                            else if (extension === ".doc") {
                                const extractor = new word_extractor_1.default();
                                const doc = await extractor.extract(tmpName);
                                text = doc.getBody();
                            }
                            await fs.promises.unlink(tmpName);
                            resolve(text);
                        }
                        catch (err) {
                            reject(err);
                        }
                    });
                    stream.pipe(fileStream);
                }
                catch (e) {
                    reject(e);
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.S3StorageEngine = S3StorageEngine;

//# sourceMappingURL=storage.js.map
