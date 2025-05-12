import { useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

// 导入组件
const Home = () => (
  <div className="home-container">
    <h1>屏幕分享工具</h1>
    <div className="buttons">
      <a href={`/share/${Date.now()}`} className="btn share-btn">创建分享(B)</a>
    </div>
  </div>
);

// 懒加载其他组件
const ShareScreen = lazy(() => import('./components/ShareScreen'));
const ViewScreen = lazy(() => import('./components/ViewScreen'));

function App() {
  return (
    <Router>
      <div className="app-container">
        <Suspense fallback={<div>加载中...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/share/:roomId" element={<ShareScreen />} />
            <Route path="/view/:roomId" element={<ViewScreen />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  )
}

export default App
