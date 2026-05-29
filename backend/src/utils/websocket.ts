import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import session from 'express-session';
import passport from 'passport';

let io: Server | null = null;

type SessionMiddleware = ReturnType<typeof session>;

export function initWebSocket(
  httpServer: HttpServer,
  sessionMiddleware: SessionMiddleware
): Server {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:4200', 'http://localhost:4201'],
      credentials: true
    }
  });

  const wrap =
    (middleware: any) => (socket: Socket, next: (err?: Error) => void) =>
      middleware(socket.request as any, {} as any, next);

  io.use(wrap(sessionMiddleware));
  io.use(wrap(passport.initialize()));
  io.use(wrap(passport.session()));
  io.use((socket, next) => {
    const user = (socket.request as any).user;
    if (user) {
      socket.join(`user:${user.id}`);
      socket.join(`role:${user.role}`);
      next();
    } else {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket.request as any).user;
    socket.emit('connected', { id: user.id, username: user.username, role: user.role });
  });

  return io;
}

export function broadcastEvent(event: string, payload: unknown): void {
  io?.emit(event, payload);
}

export function notifyUser(userId: number, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}
