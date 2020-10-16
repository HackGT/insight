import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { Readable } from "stream";
const PDFParser = require("pdf-parse");
const mammoth = require("mammoth");
import WordExtractor from "word-extractor";
import * as express from "express";
import { authenticateWithRedirect, uploadHandler } from "./middleware";
import { IUser, User, IGCSOptions, Participant } from "./schema";
import { S3_ENGINE, config } from "./common";
import { agenda } from "./tasks";
import { Storage } from "@google-cloud/storage";

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
			...options
		};
		this.uploadRoot = this.options.uploadDirectory;
		this.storage = new Storage({
			credentials: {
				client_email: this.options.clientEmail,
				private_key: this.options.privateKey
			}
		});
	}

	public async saveFile(currentPath: string, name: string): Promise<void> {
		await this.storage.bucket(this.options.bucket).upload(currentPath, {
			destination: name
		});
	}
	public async readFile(name: string): Promise<Readable> {
		name = name.replace('uploads/', '');
		return this.storage.bucket(this.options.bucket).file(name).createReadStream();
	}

	public async deleteFile(name: string): Promise<void> {
		name = name.replace('uploads/', '');
		await this.storage.bucket(this.options.bucket).file(name).delete();
	}

	public async getText(name: string): Promise<string | null> {
		return new Promise(async (resolve, reject) => {
			try {
				let extension = path.extname(name).toLowerCase();
				const SUPPORTED_FILE_TYPES = [".pdf", ".docx", ".doc"];
				if (!SUPPORTED_FILE_TYPES.includes(extension)) {
					// Unsupported format
					resolve(null);
					return;
				}

				let stream = await this.readFile(name);
				const tmpName = path.join(os.tmpdir(), crypto.randomBytes(16).toString("hex") + extension);
				let fileStream = fs.createWriteStream(tmpName);
				stream.once("finish", async () => {
					try {
						let text: string = "";
						if (extension === ".pdf") {
							let buffer = await fs.promises.readFile(tmpName);
							let data = await PDFParser(buffer);
							text = data.text;
						}
						else if (extension === ".docx") {
							let data = await mammoth.extractRawText({ path: tmpName });
							text = data.value;
						}
						else if (extension === ".doc") {
							let extractor = new WordExtractor();
							let doc = await extractor.extract(tmpName);
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
			catch (err) {
				reject(err);
			}
		});
	}
}

export function publicLink(file: string): string {
	file = path.basename(file);
	let time = Date.now();
	let key = crypto
		.createHmac("sha256", config.secrets.apiKey + time)
		.update(file)
		.digest()
		.toString("hex");
	return `${file}?key=${key}&time=${time}`;
}

export let storageRoutes = express.Router();

storageRoutes.route("/:file")
	.get(async (request, response) => {
		response.setHeader("Cache-Control", "no-store");
		let user = request.user as IUser | undefined;

		let key = request.query.key as string || "";
		let time = parseInt(request.query.time as string || "");
		let correctHash = crypto
			.createHmac("sha256", config.secrets.apiKey + time)
			.update(request.params.file)
			.digest()
			.toString("hex");

		// Access:
		// - All employers can GET all resumes
		// - Participants can GET their own resume
		if (!user && key !== correctHash) {
			response.status(401).send();
			return;
		}
		else if (user && user.type !== "employer" && !user.admin) {
			let participant = await Participant.findOne({ uuid: user.uuid });
			if (!participant || !participant.resume?.path || path.basename(participant.resume.path) !== request.params.file) {
				response.status(403).send();
				return;
			}
		}

		if (request.query.public === "true") {
			response.json({
				"success": true,
				"link": publicLink(request.params.file),
			});
			return;
		}
		try {
			let stream = await S3_ENGINE.readFile(request.params.file);
			if (request.query.download === "true") {
				response.attachment(request.params.file);
			}
			stream.pipe(response);
		}
		catch {
			response.status(404).send("The requested file could not be found");
		}
	});

storageRoutes.route("/")
	.post(authenticateWithRedirect, uploadHandler.single("resume"), async (request, response) => {
		let user = await User.findOne({ uuid: (request.user as IUser).uuid });
		let participant = await Participant.findOne({ uuid: user ? user.uuid : "" });
		let resume = request.file;

		// Access:
		// - Only participants can update their resumes
		// - Participants can only update their own resume
		if (!user || !participant || user.type !== "participant") {
			if (resume) {
				await fs.promises.unlink(resume.path);
			}
			response.status(403).send();
			return;
		}
		if (participant.resume?.path) {
			try {
				await S3_ENGINE.deleteFile(participant.resume.path);
			}
			catch (err) {
				console.error("Could not delete existing resume from S3:", err);
			}
		}
		try {
			await S3_ENGINE.saveFile(resume.path, resume.filename);
		} catch(err) {
			console.error("Could not delete existing resume from S3:", err);
			response.status(403).send();
			return;
		}
		
		await fs.promises.unlink(resume.path);
		participant.resume = {
			path: "uploads/" + resume.filename,
			size: resume.size
		};
		await participant.save();
		await agenda.now("parse-resume", { uuid: participant.uuid });

		response.status(201).send();
	});
