import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import '../styles/ViewScreen.css';

const ViewScreen = () => {
  const { roomId } = useParams();
  const [socketConnected, setSocketConnected] = useState(false);
  const [screenResolution, setScreenResolution] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [showInfo, setShowInfo] = useState(false);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  
  const socketRef = useRef();
  const peerRef = useRef();
  const videoRef = useRef();

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
      
      // 加入房间
      socket.emit('join-room', roomId);
    });

    socket.on('signal', ({ from, signal }) => {
      if (!peerRef.current) {
        // 创建对等连接
        const peer = new Peer({
          initiator: false,
          trickle: false
        });
        
        peerRef.current = peer;
        
        peer.on('signal', (signal) => {
          socket.emit('signal', { to: from, signal });
        });
        
        peer.on('stream', (stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        });
        
        peer.on('error', (err) => {
          console.error('Peer连接错误:', err);
        });
      }
      
      // 接收信号
      peerRef.current.signal(signal);
    });
    
    socket.on('resolution-updated', (resolution) => {
      console.log('分辨率已更新:', resolution);
      setScreenResolution(resolution);
    });
    
    socket.on('host-disconnected', () => {
      console.log('主机已断开连接');
      setHostDisconnected(true);
      setSocketConnected(false);
    });
    
    socket.on('error', (message) => {
      console.error('错误:', message);
    });
    
    socket.on('disconnect', () => {
      console.log('与Socket.IO服务器断开连接');
      setSocketConnected(false);
    });

    // 清理函数
    return () => {
      clearInterval(timeInterval);
      
      // 停止对等连接
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      
      // 断开Socket连接
      socket.disconnect();
    };
  }, [roomId]);

  const toggleInfo = () => {
    setShowInfo(!showInfo);
  };

  return (
    <div className="view-screen-container">
      {hostDisconnected ? (
        <div className="disconnected-message">
          <h2>主机已断开连接</h2>
          <p>分享已结束</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline className="shared-screen" />
          
          <button className="info-toggle-btn" onClick={toggleInfo}>
            信息
          </button>
          
          {showInfo && (
            <div className="info-panel">
              <h3>分享信息</h3>
              <p>房间ID: {roomId}</p>
              <p>连接状态: {socketConnected ? '已连接' : '未连接'}</p>
              {screenResolution && (
                <p>分辨率: {screenResolution.width} x {screenResolution.height}</p>
              )}
              <p>当前时间: {currentTime}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ViewScreen;