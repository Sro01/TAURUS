import { useAudioVisualizer } from '../../hooks';
import './HomePage.css';

export default function HomePage() {
  const { canvasRef, audioRef, isPlaying, togglePlayback, audioProgress, isLoading } = useAudioVisualizer();

  return (
    <div className="music-reactive-hero">
      <canvas ref={canvasRef} className="visualization-canvas" />
      
      <div className="hero-content">
        <p className="hero-tagline">free souls dwelling within the music</p>
        <h1 className="hero-title">
          <span className="title-line">WE ARE</span>
          <span className="title-line">TAURUS</span>
        </h1>
        <p className="hero-subtitle">Jeonbuk National University Band Club</p>
        <p className="hero-credit">Since 1987</p>
      </div>
      
      <button 
        className={`play-button ${(!isPlaying && !isLoading) ? 'pulse-animation' : ''}`}
        onClick={togglePlayback}
        disabled={isLoading}
      >
        {isLoading ? 'LOADING...' : (isPlaying ? 'STOP' : 'PLAY')}
      </button>
      
      <div className="audio-progress">
        <div 
          className="progress-bar" 
          style={{ width: `${audioProgress}%` }}
        />
      </div>
      
      {/* <div className="corner-info">
        <span className="fps-counter">FPS {fps}</span>
      </div> */}
      
      <div className="bottom-info">
        <img src="/images/fucking-taurus.png" alt="Album Cover" className="album-img" />
        <div className="song-details">
          <span className="song-info">TAURUS - TAURUS</span>

          <span className="artists">BY 김영훈, 정기훈, 김두태, 김성민, 하경덕, 김도윤</span>
        </div>
      </div>
      
      <audio 
        ref={audioRef}
        src="/audio/TAURUS-TAURUS.mp3"
        crossOrigin="anonymous"
        preload="auto"
      />
    </div>
  );
}
