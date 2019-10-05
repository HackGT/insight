import * as fs from "fs";
import * as crypto from "crypto";
import { Readable } from "stream";
import * as AWS from "aws-sdk";
import * as express from "express";
import { authenticateWithRedirect, uploadHandler } from "./middleware";
import { IUser, User, IS3Options } from "./schema";
import { config, S3_ENGINE } from "./common";

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
}

export let storageRoutes = express.Router();

storageRoutes.route("/:file")
	.get(async (request, response) => {
		let user = request.user as IUser | undefined;

		// Access:
		// - All employers can GET all resumes
		// - Participants can GET their own resume
		if (!user) {
			let time = parseInt(request.query.time || "");
			let hash = request.query.key || "";
			let correctHash = crypto.createHmac("sha256", config.secrets.apiKey + time).update("/uploads/" + request.params.file).digest().toString("hex");
			console.log(correctHash, hash, (Date.now() - time));
			if (correctHash !== hash || (Date.now() - time) > 60000) {
				response.status(403).send();
				return;
			}
		}
		else if (user.type !== "employer" && (!user.resume || user.resume.path !== request.params.file)) {
			response.status(403).send();
			return;
		}

		try {
			let stream = await S3_ENGINE.readFile(request.params.file);
			if (request.query.preview !== "true" && !request.query.key) {
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
		let resume = request.file;

		// Access:
		// - Only participants can update their resumes
		// - Participants can only update their own resume
		if (!user || user.type !== "participant" || !user.resume || user.resume.path !== request.params.file) {
			if (resume) {
				await fs.promises.unlink(resume.path);
			}
			response.status(403).send();
			return;
		}
		await S3_ENGINE.saveFile(resume.path, resume.filename);
		await fs.promises.unlink(resume.path);
		user.resume.path = resume.filename;
		user.resume.size = resume.size;
		await user.save();

		response.status(201).send();
	});
