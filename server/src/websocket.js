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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const crypto = __importStar(require("crypto"));
const socket_io_1 = require("socket.io");
const common_1 = require("./common");
const schema_1 = require("./schema");
class WebSocketServer {
    constructor(httpServer) {
        this.sockets = new Map();
        const io = new socket_io_1.Server(httpServer);
        io.on("connection", async (socket) => {
            var _a;
            const uuid = socket.handshake.query.uuid || "";
            const time = parseInt(socket.handshake.query.time);
            const token = socket.handshake.query.token || "";
            const correctToken = crypto
                .createHmac("sha256", common_1.config.secrets.apiKey + time)
                .update(uuid)
                .digest()
                .toString("hex");
            if (token !== correctToken) {
                socket.disconnect();
                return;
            }
            const userExists = await schema_1.User.exists({ uuid });
            if (!userExists) {
                socket.disconnect();
                return;
            }
            const sockets = (_a = this.sockets.get(uuid)) !== null && _a !== void 0 ? _a : [];
            sockets.push(socket);
            this.sockets.set(uuid, sockets);
            socket.on("disconnect", () => {
                let sockets = this.sockets.get(uuid);
                if (!sockets)
                    return;
                sockets = sockets.filter(s => s.id !== socket.id);
                if (sockets.length > 0) {
                    this.sockets.set(uuid, sockets);
                }
                else {
                    this.sockets.delete(uuid);
                }
            });
        });
    }
    exportUpdate(uuid, percentage) {
        const sockets = this.sockets.get(uuid);
        if (!sockets)
            return;
        for (const socket of sockets) {
            socket.volatile.emit("export-progress", { percentage });
        }
    }
    exportComplete(uuid, id, filetype) {
        const sockets = this.sockets.get(uuid);
        if (!sockets)
            return;
        for (const socket of sockets) {
            socket.emit("export-complete", { id, filetype });
        }
    }
    visitNotification(uuid, participant, visit) {
        const sockets = this.sockets.get(uuid);
        if (!sockets)
            return;
        for (const socket of sockets) {
            socket.emit("visit", { participant, visit });
        }
    }
    async reloadParticipant(company, participant, visit) {
        const users = await schema_1.User.find({ "company.name": company, "company.verified": true });
        for (const user of users) {
            const sockets = this.sockets.get(user.uuid);
            if (!sockets)
                continue;
            for (const socket of sockets) {
                socket.emit("reload-participant", { participant, visit });
            }
        }
    }
}
exports.WebSocketServer = WebSocketServer;

//# sourceMappingURL=websocket.js.map
