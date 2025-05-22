import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import "../styles/ViewScreen.css";

const ViewScreen = () => {
  const { roomId } = useParams();
  const [socketConnected, setSocketConnected] = useState(false);
  const [screenResolution, setScreenResolution] = useState(null);
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString(),
  );
  const [showInfo, setShowInfo] = useState(true);
  const [hostDisconnected, setHostDisconnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("等待连接");
  const [streamReceived, setStreamReceived] = useState(false);

  const socketRef = useRef();
  const peerRef = useRef();
  const videoRef = useRef();

  useEffect(() => {
    // 更新当前时间
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // 连接Socket.IO服务器
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("已连接到Socket.IO服务器");
      setSocketConnected(true);
      setConnectionStatus("已连接到服务器，等待主机信号");

      // 加入房间
      socket.emit("join-room", roomId);
      console.log("已加入房间:", roomId);
    });

    socket.on("signal", ({ from, signal }) => {
      console.log("收到信号:", signal);

      if (!peerRef.current) {
        console.log("创建新的对等连接");
        // 创建对等连接
        const peer = new Peer({
          initiator: false,
          trickle: false,
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
          },
        });

        console.log("对等连接已创建，等待信号交换...");

        peerRef.current = peer;

        peer.on("signal", (signal) => {
          console.log("发送应答信号");
          socket.emit("signal", { to: from, signal });
        });

        peer.on("stream", (stream) => {
          console.log("接收到流媒体:", stream.id);
          setStreamReceived(true);
          setConnectionStatus("已接收到视频流");

          if (videoRef.current) {
            console.log("设置视频源");
            videoRef.current.srcObject = stream;

            // 尝试播放视频
            videoRef.current.play().catch((err) => {
              console.error("视频播放失败:", err);
              setConnectionStatus("视频播放失败: " + err.message);
            });
          }
        });

        peer.on("connect", () => {
          console.log("对等连接已建立");
        });

        peer.on("error", (err) => {
          console.error("Peer连接错误:", err);
        });

        peer.on("close", () => {
          console.log("对等连接已关闭");
        });
      }

      try {
        // 接收信号
        console.log("处理接收到的信号");
        peerRef.current.signal(signal);
      } catch (err) {
        console.error("处理信号时出错:", err);
      }
    });

    socket.on("resolution-updated", (resolution) => {
      console.log("分辨率已更新:", resolution);
      setScreenResolution(resolution);
    });

    socket.on("host-disconnected", () => {
      console.log("主机已断开连接");
      setHostDisconnected(true);
      setSocketConnected(false);
    });

    socket.on("error", (message) => {
      console.error("错误:", message);
    });

    socket.on("disconnect", () => {
      console.log("与Socket.IO服务器断开连接");
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
          <div className="video-container">
            {!streamReceived && (
              <div className="loading-indicator">
                <p>正在等待连接主机...</p>
                <p className="status-text">{connectionStatus}</p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls
              className="shared-screen"
              onLoadedMetadata={() => {
                console.log("视频元数据已加载");
                setConnectionStatus("视频元数据已加载，准备播放");
              }}
              onPlay={() => {
                console.log("视频开始播放");
                setConnectionStatus("视频正在播放");
              }}
              onError={(e) => {
                console.error("视频加载错误:", e);
                setConnectionStatus("视频加载错误");
              }}
            />
          </div>

          <button className="info-toggle-btn" onClick={toggleInfo}>
            信息
          </button>

          {showInfo && (
            <div className="info-panel">
              <h3>分享信息</h3>
              <p>房间ID: {roomId}</p>
              <p>连接状态: {socketConnected ? "已连接" : "未连接"}</p>
              <p>连接进度: {connectionStatus}</p>
              <p>视频流: {streamReceived ? "已接收" : "未接收"}</p>
              {screenResolution && (
                <p>
                  分辨率: {screenResolution.width} x {screenResolution.height}
                </p>
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
