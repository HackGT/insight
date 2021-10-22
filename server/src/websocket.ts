import * as http from "http";
import * as crypto from "crypto";
import { Server, Socket } from "socket.io";

import { config, mongoose } from "./common";
import { User, IParticipant, IVisit } from "./schema";

export class WebSocketServer {
  private readonly sockets: Map<string, Socket[]> = new Map();

  constructor(httpServer: http.Server) {
    const io = new Server(httpServer);

    io.on("connection", async socket => {
      const uuid = (socket.handshake.query.uuid as string) || "";
      const time = parseInt(socket.handshake.query.time as string);
      const token = (socket.handshake.query.token as string) || "";
      const correctToken = crypto
        .createHmac("sha256", config.secrets.apiKey + time)
        .update(uuid)
        .digest()
        .toString("hex");
      if (token !== correctToken /* || (Date.now() - time) > 60000 */) {
        socket.disconnect();
        return;
      }
      const userExists = await User.exists({ uuid });
      if (!userExists) {
        socket.disconnect();
        return;
      }
      const sockets = this.sockets.get(uuid) ?? [];
      sockets.push(socket);
      this.sockets.set(uuid, sockets);

      socket.on("disconnect", () => {
        let sockets = this.sockets.get(uuid);
        if (!sockets) return;
        sockets = sockets.filter(s => s.id !== socket.id);
        if (sockets.length > 0) {
          this.sockets.set(uuid, sockets);
        } else {
          this.sockets.delete(uuid);
        }
      });
    });
  }

  public exportUpdate(uuid: string, percentage: number) {
    const sockets = this.sockets.get(uuid);
    if (!sockets) return;
    for (const socket of sockets) {
      socket.volatile.emit("export-progress", { percentage });
    }
  }

  public exportComplete(uuid: string, id: string, filetype: string) {
    const sockets = this.sockets.get(uuid);
    if (!sockets) return;
    for (const socket of sockets) {
      socket.emit("export-complete", { id, filetype });
    }
  }

  public visitNotification(uuid: string, participant: IParticipant, visit: IVisit) {
    const sockets = this.sockets.get(uuid);
    if (!sockets) return;
    for (const socket of sockets) {
      socket.emit("visit", { participant, visit });
    }
  }

  public async reloadParticipant(
    company: mongoose.Types.ObjectId,
    participant: IParticipant,
    visit?: IVisit
  ) {
    // Only send this event to people from the same company
    const users = await User.find({ "company.company": company, "company.verified": true });
    for (const user of users) {
      const sockets = this.sockets.get(user.uuid);
      if (!sockets) continue;
      for (const socket of sockets) {
        socket.emit("reload-participant", { participant, visit });
      }
    }
  }
}
