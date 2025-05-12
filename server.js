import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 提供静态文件
app.use(express.static(join(__dirname, 'dist')));

// 存储连接信息
const connections = {};

// 处理Socket.IO连接
io.on('connection', (socket) => {
  console.log('用户已连接:', socket.id);

  // 当设备B创建房间时
  socket.on('create-room', (roomId) => {
    console.log('创建房间:', roomId);
    socket.join(roomId);
    connections[roomId] = {
      host: socket.id,
      resolution: null,
      viewers: []
    };
  });

  // 当设备A加入房间时
  socket.on('join-room', (roomId) => {
    console.log('加入房间:', roomId);
    if (connections[roomId]) {
      socket.join(roomId);
      connections[roomId].viewers.push(socket.id);
      io.to(connections[roomId].host).emit('viewer-joined', socket.id);
    } else {
      socket.emit('error', '房间不存在');
    }
  });

  // 处理WebRTC信令
  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  // 更新分辨率信息
  socket.on('update-resolution', ({ roomId, resolution }) => {
    if (connections[roomId]) {
      connections[roomId].resolution = resolution;
      socket.to(roomId).emit('resolution-updated', resolution);
    }
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('用户已断开连接:', socket.id);
    
    // 查找并清理连接信息
    Object.keys(connections).forEach(roomId => {
      const room = connections[roomId];
      
      // 如果是主机断开连接
      if (room.host === socket.id) {
        io.to(roomId).emit('host-disconnected');
        delete connections[roomId];
      } 
      // 如果是观看者断开连接
      else {
        const index = room.viewers.indexOf(socket.id);
        if (index !== -1) {
          room.viewers.splice(index, 1);
          io.to(room.host).emit('viewer-disconnected', socket.id);
        }
      }
    });
  });
});

// 添加通配符路由，确保SPA路由正常工作
app.get('/*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});