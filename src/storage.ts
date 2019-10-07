import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { Readable } from "stream";
import * as AWS from "aws-sdk";
const PDFParser = require("pdf-parse");
const mammoth = require("mammoth");
import WordExtractor from "word-extractor";
import * as express from "express";
import { authenticateWithRedirect, uploadHandler } from "./middleware";
import { IUser, User, IS3Options, Participant } from "./schema";
import { S3_ENGINE } from "./common";
import { agenda } from "./tasks";

interface IStorageEngine {
	saveFile(currentPath: string, name: string): Promise<void>;
	readFile(name: string): Promise<Readable>;
}

export class S3StorageEngine implements IStorageEngine {
	private readonly options: IS3Options;

	constructor(options: IS3Options) {
		// Values copied via spread operator instead of being passed by reference
		this.options = {
			...options
		};
	}

	public saveFile(currentPath: string, name: string): Promise<void> {
		AWS.config.update({
			region: this.options.region,
			credentials: new AWS.Credentials({
				accessKeyId: this.options.accessKey,
				secretAccessKey: this.options.secretKey
			})
		});
		let s3 = new AWS.S3();
		return new Promise<void>((resolve, reject) => {
			let readStream = fs.createReadStream(currentPath);
			readStream.on("error", reject);
			s3.putObject({
				Body: readStream,
				Bucket: this.options.bucket,
				Key: name
			}).promise().then(output => {
				resolve();
			}).catch(reject);
		});
	}
	public async readFile(name: string): Promise<Readable> {
		AWS.config.update({
			region: this.options.region,
			credentials: new AWS.Credentials({
				accessKeyId: this.options.accessKey,
				secretAccessKey: this.options.secretKey
			})
		});
		let s3 = new AWS.S3();
		const object = {
			Bucket: this.options.bucket,
			Key: name
		};
		// Will throw if the object does not exist
		await s3.headObject(object).promise();
		return s3.getObject(object).createReadStream();
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

export let storageRoutes = express.Router();

storageRoutes.route("/:file")
	.get(async (request, response) => {
		let user = request.user as IUser | undefined;

		// Access:
		// - All employers can GET all resumes
		// - Participants can GET their own resume
		if (!user) {
			response.status(401).send();
			return;
		}
		else if (user.type !== "employer") {
			let participant = await Participant.findOne({ uuid: user.uuid });
			if (!participant || !participant.resume || participant.resume.path !== request.params.file) {
				response.status(403).send();
				return;
			}
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
	})
	.post(authenticateWithRedirect, uploadHandler.single("resume"), async (request, response) => {
		let user = await User.findOne({ uuid: (request.user as IUser).uuid });
		let participant = await Participant.findOne({ uuid: user ? user.uuid : "" });
		let resume = request.file;

		// Access:
		// - Only participants can update their resumes
		// - Participants can only update their own resume
		if (!user || !participant || user.type !== "participant" || !participant.resume || participant.resume.path !== request.params.file) {
			if (resume) {
				await fs.promises.unlink(resume.path);
			}
			response.status(403).send();
			return;
		}
		await S3_ENGINE.saveFile(resume.path, resume.filename);
		await fs.promises.unlink(resume.path);
		participant.resume.path = resume.filename;
		participant.resume.size = resume.size;
		await participant.save();
		await agenda.now("parse-resume", { uuid: participant.uuid });

		response.status(201).send();
	});
