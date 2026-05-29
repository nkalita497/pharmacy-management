"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.broadcastEvent = broadcastEvent;
exports.notifyUser = notifyUser;
const socket_io_1 = require("socket.io");
const passport_1 = __importDefault(require("passport"));
let io = null;
function initWebSocket(httpServer, sessionMiddleware) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: ['http://localhost:4200', 'http://localhost:4201'],
            credentials: true
        }
    });
    const wrap = (middleware) => (socket, next) => middleware(socket.request, {}, next);
    io.use(wrap(sessionMiddleware));
    io.use(wrap(passport_1.default.initialize()));
    io.use(wrap(passport_1.default.session()));
    io.use((socket, next) => {
        const user = socket.request.user;
        if (user) {
            socket.join(`user:${user.id}`);
            socket.join(`role:${user.role}`);
            next();
        }
        else {
            next(new Error('Unauthorized'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.request.user;
        socket.emit('connected', { username: user.username, role: user.role });
    });
    return io;
}
function broadcastEvent(event, payload) {
    io?.emit(event, payload);
}
function notifyUser(userId, event, payload) {
    io?.to(`user:${userId}`).emit(event, payload);
}
//# sourceMappingURL=websocket.js.map