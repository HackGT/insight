import * as http from "http";
import * as crypto from "crypto";
import socketio from "socket.io";
import { config } from "./common";
import { User, IParticipant, IVisit } from "./schema";

export class WebSocketServer {
	private readonly sockets: Map<string, socketio.Socket> = new Map();

	constructor(server: http.Server) {
		const io = socketio(server);

		io.on("connection", async socket => {
			let uuid = socket.handshake.query.uuid as string || "";
			let time = parseInt(socket.handshake.query.time);
			let token = socket.handshake.query.token as string || "";
			let correctToken = crypto
				.createHmac("sha256", config.secrets.apiKey + time)
				.update(uuid)
				.digest()
				.toString("hex");
			if (token !== correctToken || (Date.now() - time) > 60000) {
				socket.disconnect();
				return;
			}
			const userExists = await User.exists({ uuid });
			if (!userExists) {
				socket.disconnect();
				return;
			}
			this.sockets.set(uuid, socket);
		});
	}

	public exportUpdate(uuid: string, percentage: number) {
		let socket = this.sockets.get(uuid);
		if (!socket) return;
		socket.emit("export-progress", { percentage });
	}
	public exportComplete(uuid: string, id: string) {
		let socket = this.sockets.get(uuid);
		if (!socket) return;
		socket.emit("export-complete", { id });
	}
	public visitNotification(uuid: string, participant: IParticipant, visit: IVisit) {
		let socket = this.sockets.get(uuid);
		if (!socket) return;
		socket.emit("visit", { participant, visit });
	}
}
