import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import '../styles/ShareScreen.css';

const ShareScreen = () => {
  const { roomId } = useParams();
  const [socketConnected, setSocketConnected] = useState(false);
  const [screenResolution, setScreenResolution] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [isSharing, setIsSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const socketRef = useRef();
  const peersRef = useRef({});
  const streamRef = useRef();

  // 获取当前URL的完整地址（不包含路径部分）
  const baseUrl = window.location.origin;
  const viewUrl = `${baseUrl}/view/${roomId}`;

  // 开始分享屏幕的函数
  const startSharing = async () => {
    try {
      // 获取屏幕媒体流
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true
      });
      streamRef.current = stream;
      
      // 获取屏幕分辨率
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      const resolution = {
        width: settings.width,
        height: settings.height
      };
      setScreenResolution(resolution);
      
      // 更新分辨率信息
      socketRef.current.emit('update-resolution', { roomId, resolution });
      
      // 监听媒体流结束事件
      videoTrack.addEventListener('ended', () => {
        stopSharing();
      });
      
      setIsSharing(true);
    } catch (err) {
      console.error('获取屏幕流失败:', err);
    }
  };
  
  // 停止分享屏幕的函数
  const stopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 断开所有对等连接
    Object.values(peersRef.current).forEach(peer => peer.destroy());
    peersRef.current = {};
    
    setIsSharing(false);
    setScreenResolution(null);
  };

  useEffect(() => {
    // 更新当前时间
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // 连接Socket.IO服务器
    const socket = io('http://localhost:3000');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('已连接到Socket.IO服务器');
      setSocketConnected(true);
      
      // 创建房间
      socket.emit('create-room', roomId);
    });

    socket.on('viewer-joined', (viewerId) => {
      console.log('观看者已加入:', viewerId);
      setViewerCount(prev => prev + 1);
      
      // 如果已经在分享屏幕，则为新加入的观看者创建对等连接
      if (isSharing && streamRef.current) {
        // 创建对等连接
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: streamRef.current
        });
        
        peersRef.current[viewerId] = peer;
        
        peer.on('signal', (signal) => {
          socket.emit('signal', { to: viewerId, signal });
        });
        
        peer.on('error', (err) => {
          console.error('Peer连接错误:', err);
        });
      }
    });
    
    socket.on('signal', ({ from, signal }) => {
      const peer = peersRef.current[from];
      if (peer) {
        peer.signal(signal);
      }
    });
    
    socket.on('viewer-disconnected', (viewerId) => {
      console.log('观看者已断开连接:', viewerId);
      if (peersRef.current[viewerId]) {
        peersRef.current[viewerId].destroy();
        delete peersRef.current[viewerId];
      }
      setViewerCount(prev => Math.max(0, prev - 1));
    });
    
    socket.on('disconnect', () => {
      console.log('与Socket.IO服务器断开连接');
      setSocketConnected(false);
    });

    // 清理函数
    return () => {
      clearInterval(timeInterval);
      
      // 停止所有对等连接
      Object.values(peersRef.current).forEach(peer => peer.destroy());
      
      // 停止屏幕共享
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // 断开Socket连接
      socket.disconnect();
    };
  }, [roomId]);

  return (
    <div className="share-screen-container">
      <h1>屏幕分享 (B)</h1>
      
      <div className="share-controls">
        {!isSharing ? (
          <button 
            className="share-button" 
            onClick={startSharing} 
            disabled={!socketConnected}
          >
            开始分享
          </button>
        ) : (
          <button 
            className="stop-button" 
            onClick={stopSharing}
          >
            停止分享
          </button>
        )}
      </div>
      
      <div className="qr-container">
        <h2>扫描二维码查看分享</h2>
        <QRCodeSVG value={viewUrl} size={256} />
      </div>
      
      <div className="info-container">
        <p>房间ID: {roomId}</p>
        <p>Socket连接状态: {socketConnected ? '已连接' : '未连接'}</p>
        <p>分享状态: {isSharing ? '正在分享' : '未分享'}</p>
        <p>观看人数: {viewerCount}</p>
        {screenResolution && (
          <p>屏幕分辨率: {screenResolution.width} x {screenResolution.height}</p>
        )}
        <p>当前时间: {currentTime}</p>
      </div>
      
      <div className="url-container">
        <p>分享链接: <a href={viewUrl} target="_blank" rel="noopener noreferrer">{viewUrl}</a></p>
      </div>
    </div>
  );
};

export default ShareScreen;