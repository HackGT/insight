import * as http from "http";
import { Server, Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import passport from "passport";

import { User, IParticipant, IVisit } from "./schema";
import { sessionMiddleware } from "./auth/auth";

export class WebSocketServer {
  private readonly sockets: Map<string, Socket[]> = new Map();

  constructor(httpServer: http.Server) {
    const io = new Server(httpServer, {
      path: "/socket",
    });

    const wrap =
      (middleware: any) => (socket: Socket, next: (err?: ExtendedError | undefined) => void) =>
        middleware(socket.request, {}, next);

    io.use(wrap(sessionMiddleware));
    io.use(wrap(passport.initialize()));
    io.use(wrap(passport.session()));

    io.use((socket, next) => {
      if ((socket.request as any).user) {
        next();
      } else {
        next(new Error("Unauthorized"));
      }
    });

    io.on("connection", async socket => {
      const { uuid } = (socket.request as any).user;
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

  public async reloadParticipant(company: string, participant: IParticipant, visit?: IVisit) {
    // Only send this event to people from the same company
    const users = await User.find({ "company.name": company, "company.verified": true });
    for (const user of users) {
      const sockets = this.sockets.get(user.uuid);
      if (!sockets) continue;
      for (const socket of sockets) {
        socket.emit("reload-participant", { participant, visit });
      }
    }
  }
}
