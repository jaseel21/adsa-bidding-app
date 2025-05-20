import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import dbConnect from './src/utils/dbConnect.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function startServer() {
  try {
    await dbConnect();
    await app.prepare();

    const server = createServer((req, res) => {
      // Let Next.js handle all requests
      handle(req, res);
    });

    const io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    global.io = io;

    io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
      // Add bidding-related events here
      socket.on('placeBid', (data) => {
        console.log('Bid received:', data);
        io.emit('bidUpdate', data); // Broadcast to all clients
      });
    });

    server.listen(3000, () => {
      console.log('> Ready on http://localhost:3000');
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});