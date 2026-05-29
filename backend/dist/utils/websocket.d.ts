import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
type SessionMiddleware = ReturnType<typeof session>;
export declare function initWebSocket(httpServer: HttpServer, sessionMiddleware: SessionMiddleware): Server;
export declare function broadcastEvent(event: string, payload: unknown): void;
export declare function notifyUser(userId: number, event: string, payload: unknown): void;
export {};
//# sourceMappingURL=websocket.d.ts.map