import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { Readable } from "stream";
import WordExtractor from "word-extractor";
import { Storage } from "@google-cloud/storage";

import { IGCSOptions } from "./schema";
import { config } from "./common";

const PDFParser = require("pdf-parse");
const mammoth = require("mammoth");

interface IStorageEngine {
  saveFile(currentPath: string, name: string): Promise<void>;
  readFile(name: string): Promise<Readable>;
  deleteFile(name: string): Promise<void>;
}

export class S3StorageEngine implements IStorageEngine {
  public readonly uploadRoot: string;
  private readonly options: IGCSOptions;
  private readonly storage: Storage;
  constructor(options: IGCSOptions) {
    // Values copied via spread operator instead of being passed by reference
    this.options = {
      ...options,
    };
    this.uploadRoot = this.options.uploadDirectory;
    this.storage = new Storage({
      credentials: {
        client_email: this.options.clientEmail,
        private_key: this.options.privateKey,
      },
    });
  }

  public async saveFile(currentPath: string, name: string): Promise<void> {
    console.log("saveFile", currentPath, name);
    await this.storage.bucket(this.options.bucket).upload(currentPath, {
      destination: name,
    });
  }

  public async readFile(name: string): Promise<Readable> {
    console.log("readFile", name);
    name = name.replace("uploads/", "");
    if (await this.storage.bucket(this.options.bucket).file(name).exists()) {
      return this.storage.bucket(this.options.bucket).file(name).createReadStream();
    }
    throw Error("File does not exist");
  }

  public async deleteFile(name: string): Promise<void> {
    console.log("deleteFile", name);
    name = name.replace("uploads/", "");
    await this.storage.bucket(this.options.bucket).file(name).delete();
  }

  public async getText(name: string): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      console.log("getText", name);
      try {
        const extension = path.extname(name).toLowerCase();
        const SUPPORTED_FILE_TYPES = [".pdf", ".docx", ".doc"];
        if (!SUPPORTED_FILE_TYPES.includes(extension)) {
          // Unsupported format
          resolve(null);
          return;
        }
        try {
          const stream = await this.readFile(name);
          stream.on("error", err => {
            console.warn(err);
            reject();
          });
          const tmpName = path.join(
            os.tmpdir(),
            crypto.randomBytes(16).toString("hex") + extension
          );
          const fileStream = fs.createWriteStream(tmpName);
          stream.once("finish", async () => {
            try {
              let text = "";
              if (extension === ".pdf") {
                const buffer = await fs.promises.readFile(tmpName);
                const data = await PDFParser(buffer);
                text = data.text;
              } else if (extension === ".docx") {
                const data = await mammoth.extractRawText({ path: tmpName });
                text = data.value;
              } else if (extension === ".doc") {
                const extractor = new WordExtractor();
                const doc = await extractor.extract(tmpName);
                text = doc.getBody();
              }
              await fs.promises.unlink(tmpName);
              resolve(text);
            } catch (err) {
              reject(err);
            }
          });
          stream.pipe(fileStream);
        } catch (e) {
          reject(e);
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}
