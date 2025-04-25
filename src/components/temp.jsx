import React, { useState, useRef, useEffect, useCallback } from 'react';
import "./Player.css";
import { 
  Maximize2, Minimize2, SkipBack, SkipForward, Play, Pause, 
  Heart, Volume2, Upload, Music, Moon, Sun, MinusCircle, Eye,
  FastForward, Rewind, BarChart2, Activity, Disc, Sliders
} from 'lucide-react';

export const Player = (props) => {
    // Main player states
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    
    // UI states
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMiniPlayer, setIsMiniPlayer] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [bgColor, setBgColor] = useState('18, 18, 18');
    const [visualizerType, setVisualizerType] = useState('bars'); // 'bars', 'wave', 'circle'
    
    // Audio control states
    const [volume, setVolume] = useState(100);
    const [speed, setSpeed] = useState(1.0);
    const [bassLevel, setBassLevel] = useState(0);
    const [trebleLevel, setTrebleLevel] = useState(0);
    
    // A-B Loop states
    const [loopStart, setLoopStart] = useState(null);
    const [loopEnd, setLoopEnd] = useState(null);
    const [isLooping, setIsLooping] = useState(false);
    
    // Refs
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const bassFilterRef = useRef(null);
    const trebleFilterRef = useRef(null);
    const animationRef = useRef(null);
    const colorExtractTimeoutRef = useRef(null);

    // Current song info (should ideally come from props)
    const currentSong = props.currentSong || {
        title: props.title || "Unknown Track",
        artist: props.artist || "Unknown Artist",
        albumArt: props.albumArt || "/api/placeholder/200/200"
    };

    // Setup Audio Context and nodes
    const setupAudioContext = useCallback(() => {
        if (!audioRef.current) return;
        
        try {
            // Create audio context if not exists
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();
            }
            
            // Disconnect old nodes if they exist
            if (sourceNodeRef.current) {
                sourceNodeRef.current.disconnect();
            }
            
            // Create analyzer for visualizer
            if (!analyserRef.current) {
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;
                analyserRef.current.smoothingTimeConstant = 0.8;
            }
            
            // Create filters for bass and treble
            if (!bassFilterRef.current) {
                bassFilterRef.current = audioContextRef.current.createBiquadFilter();
                bassFilterRef.current.type = 'lowshelf';
                bassFilterRef.current.frequency.value = 200;
            }
            
            if (!trebleFilterRef.current) {
                trebleFilterRef.current = audioContextRef.current.createBiquadFilter();
                trebleFilterRef.current.type = 'highshelf';
                trebleFilterRef.current.frequency.value = 2000;
            }
            
            // Create source from audio element
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            
            // Connect nodes: source -> bass -> treble -> analyser -> destination
            sourceNodeRef.current.connect(bassFilterRef.current);
            bassFilterRef.current.connect(trebleFilterRef.current);
            trebleFilterRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
            
            // Apply current settings
            updateBassLevel(bassLevel);
            updateTrebleLevel(trebleLevel);
            
            // Start visualizer
            if (isPlaying) {
                startVisualizer();
            }
        } catch (err) {
            console.error("Error setting up audio context:", err);
            setError("Could not initialize audio effects.");
        }
    }, [bassLevel, trebleLevel, isPlaying]);

    // Apply audio settings
    const updateBassLevel = (value) => {
        if (bassFilterRef.current) {
            bassFilterRef.current.gain.value = value;
        }
        setBassLevel(value);
    };
    
    const updateTrebleLevel = (value) => {
        if (trebleFilterRef.current) {
            trebleFilterRef.current.gain.value = value;
        }
        setTrebleLevel(value);
    };
    
    const updatePlaybackSpeed = (value) => {
        if (audioRef.current) {
            audioRef.current.playbackRate = value;
        }
        setSpeed(value);
    };
    
    const updateVolume = (value) => {
        if (audioRef.current) {
            audioRef.current.volume = value / 100;
        }
        setVolume(value);
    };

    // Audio visualizer
    const startVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const renderFrame = () => {
            if (!isPlaying) return;
            
            animationRef.current = requestAnimationFrame(renderFrame);
            analyser.getByteFrequencyData(dataArray);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (visualizerType === 'bars') {
                renderBars(ctx, canvas, dataArray, bufferLength);
            } else if (visualizerType === 'wave') {
                renderWave(ctx, canvas, dataArray, bufferLength);
            } else if (visualizerType === 'circle') {
                renderCircle(ctx, canvas, dataArray, bufferLength);
            }
        };
        
        renderFrame();
    };
    
    const renderBars = (ctx, canvas, dataArray, bufferLength) => {
        const barWidth = canvas.width / bufferLength * 2;
        let x = 0;
        
        ctx.fillStyle = isDarkMode ? 'rgba(255, 60, 120, 0.8)' : 'rgba(255, 60, 120, 0.9)';
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }
    };
    
    const renderWave = (ctx, canvas, dataArray, bufferLength) => {
        ctx.lineWidth = 2;
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 60, 120, 0.8)' : 'rgba(255, 60, 120, 0.9)';
        ctx.beginPath();
        
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
    };
    
    const renderCircle = (ctx, canvas, dataArray, bufferLength) => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
        ctx.stroke();
        
        for (let i = 0; i < bufferLength; i++) {
            const amplitude = dataArray[i] / 256;
            const angle = (i / bufferLength) * 2 * Math.PI;
            const pointRadius = radius * (1 + amplitude * 0.5);
            
            ctx.beginPath();
            ctx.arc(
                centerX + Math.cos(angle) * pointRadius,
                centerY + Math.sin(angle) * pointRadius,
                3,
                0,
                2 * Math.PI
            );
            
            ctx.fillStyle = isDarkMode 
                ? `rgba(255, ${60 + amplitude * 100}, ${120 + amplitude * 100}, 0.8)`
                : `rgba(255, ${60 + amplitude * 100}, ${120 + amplitude * 100}, 0.9)`;
            ctx.fill();
        }
    };
    
    const stopVisualizer = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
    };

    // A-B Loop functionality
    const setLoopPoints = (point) => {
        if (!audioRef.current) return;
        
        const currentTime = audioRef.current.currentTime;
        
        if (loopStart === null || (loopStart !== null && loopEnd !== null)) {
            // Set A point (or reset both)
            setLoopStart(currentTime);
            setLoopEnd(null);
        } else if (loopStart !== null && loopEnd === null && currentTime > loopStart) {
            // Set B point
            setLoopEnd(currentTime);
            setIsLooping(true);
        }
    };
    
    const clearLoopPoints = () => {
        setLoopStart(null);
        setLoopEnd(null);
        setIsLooping(false);
    };
    
    const checkLoopBoundary = () => {
        if (!audioRef.current || !isLooping || loopStart === null || loopEnd === null) return;
        
        const currentTime = audioRef.current.currentTime;
        if (currentTime >= loopEnd) {
            audioRef.current.currentTime = loopStart;
        }
    };

    // Extract dominant color from album art
    const extractColorFromAlbumArt = () => {
        if (colorExtractTimeoutRef.current) {
            clearTimeout(colorExtractTimeoutRef.current);
        }
        
        colorExtractTimeoutRef.current = setTimeout(() => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = currentSong.albumArt;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                try {
                    // Simple color extraction by sampling the center of the image
                    const imageData = ctx.getImageData(img.width/2, img.height/2, 1, 1).data;
                    const r = imageData[0];
                    const g = imageData[1];
                    const b = imageData[2];
                    
                    // Check if the color is too dark, if so, lighten it
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    const colorStr = brightness < 50 
                        ? `${Math.min(r + 50, 255)}, ${Math.min(g + 50, 255)}, ${Math.min(b + 50, 255)}`
                        : `${r}, ${g}, ${b}`;
                    
                    setBgColor(colorStr);
                } catch (err) {
                    console.error("Error extracting color:", err);
                    // Default color if extraction fails
                    setBgColor('18, 18, 18');
                }
            };
            
            img.onerror = () => {
                console.error("Error loading album art for color extraction");
                setBgColor('18, 18, 18');
            };
        }, 300);
    };

    // Player control functions
    const togglePlay = () => {
        if (!audioRef.current || !props.src) return;
        
        if (audioRef.current.paused) {
            setIsLoading(true);
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setError(null);
                    
                    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                        audioContextRef.current.resume();
                    }
                    
                    startVisualizer();
                })
                .catch(error => {
                    console.error("Playback failed:", error);
                    setError("Failed to play audio. Please try again.");
                    setIsPlaying(false);
                    stopVisualizer();
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
            stopVisualizer();
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        setIsMiniPlayer(false);
    };
    
    const toggleMiniPlayer = () => {
        setIsMiniPlayer(!isMiniPlayer);
        if (!isMiniPlayer) {
            setIsExpanded(false);
        }
    };
    
    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
        if (props.onFavoriteToggle) {
            props.onFavoriteToggle(!isFavorite);
        }
    };
    
    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };
    
    const cycleVisualizerType = () => {
        if (visualizerType === 'bars') {
            setVisualizerType('wave');
        } else if (visualizerType === 'wave') {
            setVisualizerType('circle');
        } else {
            setVisualizerType('bars');
        }
    };

    const updateProgress = () => {
        if (!audioRef.current) return;
        
        const currentTime = audioRef.current.currentTime;
        const audioDuration = audioRef.current.duration;
        
        if (isNaN(currentTime) || isNaN(audioDuration) || audioDuration === 0) {
            setProgress(0);
        } else {
            const progressPercent = (currentTime / audioDuration) * 100;
            setProgress(isNaN(progressPercent) ? 0 : progressPercent);
        }
        
        checkLoopBoundary();
    };

    const onAudioLoad = () => {
        if (!audioRef.current) return;
        
        const audioDuration = audioRef.current.duration;
        setDuration(isNaN(audioDuration) ? 0 : audioDuration);
        setError(null);
        
        // Apply settings to the audio element
        audioRef.current.playbackRate = speed;
        audioRef.current.volume = volume / 100;
    };

    const onAudioError = (e) => {
        console.error("Audio error:", e);
        setError("Error loading audio. Please try again.");
        setIsPlaying(false);
        setIsLoading(false);
        stopVisualizer();
    };

    const onProgressChange = (e) => {
        if (!audioRef.current) return;
        
        const newValue = parseFloat(e.target.value);
        if (isNaN(newValue)) return;
        
        const newTime = (newValue / 100) * audioRef.current.duration;
        if (!isNaN(newTime)) {
            audioRef.current.currentTime = newTime;
            setProgress(newValue);
        }
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds === undefined) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Effect to handle src changes
    useEffect(() => {
        if (props.src) {
            setIsLoading(true);
            setError(null);
            setProgress(0);
            setDuration(0);
            setIsPlaying(false);
            stopVisualizer();
            
            // Stop any current audio processing
            if (sourceNodeRef.current) {
                sourceNodeRef.current.disconnect();
                sourceNodeRef.current = null;
            }

            // Create a new Audio element to test the source
            const testAudio = new Audio(props.src);
            
            const canPlayHandler = () => {
                setError(null);
                // Only after we confirm it can play, we set the source to our main audio element
                if (audioRef.current) {
                    audioRef.current.src = props.src;
                    audioRef.current.load();
                    
                    // Extract color from album art
                    extractColorFromAlbumArt();
                    
                    // Setup audio processing after source is loaded
                    setupAudioContext();
                    
                    audioRef.current.play()
                        .then(() => {
                            setIsPlaying(true);
                            setIsLoading(false);
                            startVisualizer();
                        })
                        .catch(error => {
                            console.error("Failed to play audio:", error);
                            setError("Failed to play audio. Please try again.");
                            setIsPlaying(false);
                            setIsLoading(false);
                        });
                }
            };

            const errorHandler = () => {
                setError("Failed to load audio source");
                setIsLoading(false);
            };

            testAudio.addEventListener('canplaythrough', canPlayHandler);
            testAudio.addEventListener('error', errorHandler);

            // Cleanup
            return () => {
                testAudio.removeEventListener('canplaythrough', canPlayHandler);
                testAudio.removeEventListener('error', errorHandler);
                testAudio.src = '';
            };
        }
    }, [props.src, setupAudioContext]);

    // Effect for album art color extraction
    useEffect(() => {
        if (currentSong.albumArt && isExpanded) {
            extractColorFromAlbumArt();
        }
        
        return () => {
            if (colorExtractTimeoutRef.current) {
                clearTimeout(colorExtractTimeoutRef.current);
            }
        };
    }, [currentSong.albumArt, isExpanded]);

    // Effect to clean up audio context when component unmounts
    useEffect(() => {
        return () => {
            stopVisualizer();
            
            if (sourceNodeRef.current) {
                sourceNodeRef.current.disconnect();
            }
            
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(err => {
                    console.error("Error closing audio context:", err);
                });
            }
            
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            
            if (colorExtractTimeoutRef.current) {
                clearTimeout(colorExtractTimeoutRef.current);
            }
        };
    }, []);

    // Dynamically set styles based on states
    const playerStyles = {
        background: isDarkMode 
            ? `linear-gradient(to bottom, rgba(${bgColor}, 0.85), rgba(18, 18, 18, 0.95))` 
            : `linear-gradient(to bottom, rgba(${bgColor}, 0.5), rgba(255, 255, 255, 0.9))`,
        color: isDarkMode ? 'var(--primary-white)' : 'var(--primary-black)',
    };

    // Class names based on player state
    const playerClassNames = `
        parent_player 
        ${isExpanded ? 'expanded' : ''} 
        ${isMiniPlayer ? 'mini-player' : ''} 
        ${isDarkMode ? 'dark-mode' : 'light-mode'}
    `.trim();

    return (
        <div className={playerClassNames} style={playerStyles}>
            {error && <div className="error-message">{error}</div>}
            
            {/* Mini player mode */}
            {isMiniPlayer && (
                <div className="mini-player-content" onClick={toggleMiniPlayer}>
                    <img 
                        src={currentSong.albumArt} 
                        alt={`${currentSong.title} album art`}
                        className="mini-album-art"
                    />
                    <div className="mini-controls">
                        <button 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="mini-play-btn"
                        >
                            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Expanded view with visualizer and controls */}
            {isExpanded && !isMiniPlayer && (
                <div className="expanded-view">
                    <div className="expanded-header">
                        <button className="control-button" onClick={toggleDarkMode}>
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                        <button className="control-button" onClick={cycleVisualizerType}>
                            {visualizerType === 'bars' ? <BarChart2 size={16} /> : 
                             visualizerType === 'wave' ? <Activity size={16} /> : <Disc size={16} />}
                        </button>
                        <button className="control-button" onClick={toggleMiniPlayer}>
                            <MinusCircle size={16} />
                        </button>
                    </div>
                    
                    <div className="visualizer-container">
                        <canvas ref={canvasRef} className="visualizer-canvas"></canvas>
                    </div>
                    
                    <div className="album-container">
                        <div className="album-art-container">
                            <img 
                                src={currentSong.albumArt} 
                                alt={`${currentSong.title} album art`}
                                className={`album-art ${isPlaying ? 'rotating' : ''}`}
                            />
                            <button 
                                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                                onClick={toggleFavorite}
                            >
                                <Heart className={isFavorite ? "filled" : ""} size={16} />
                            </button>
                        </div>
                        
                        <div className="song-info">
                            <h3 className="song-title">{currentSong.title}</h3>
                            <p className="song-artist">{currentSong.artist}</p>
                        </div>
                    </div>
                    
                    {/* Audio controls section */}
                    <div className="audio-controls">
                        <div className="control-row">
                            <label>Bass</label>
                            <input 
                                type="range" 
                                min="-10" 
                                max="10" 
                                value={bassLevel} 
                                onChange={(e) => updateBassLevel(Number(e.target.value))}
                                className="slider-control"
                            />
                            <span className="control-value">{bassLevel > 0 ? `+${bassLevel}` : bassLevel}</span>
                        </div>
                        
                        <div className="control-row">
                            <label>Treble</label>
                            <input 
                                type="range" 
                                min="-10" 
                                max="10" 
                                value={trebleLevel} 
                                onChange={(e) => updateTrebleLevel(Number(e.target.value))}
                                className="slider-control"
                            />
                            <span className="control-value">{trebleLevel > 0 ? `+${trebleLevel}` : trebleLevel}</span>
                        </div>
                        
                        <div className="control-row">
                            <label>Speed</label>
                            <input 
                                type="range" 
                                min="0.5" 
                                max="2" 
                                step="0.1"
                                value={speed} 
                                onChange={(e) => updatePlaybackSpeed(Number(e.target.value))}
                                className="slider-control"
                            />
                            <span className="control-value">{speed}x</span>
                        </div>
                        
                        <div className="control-row">
                            <label>Volume</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={volume} 
                                onChange={(e) => updateVolume(Number(e.target.value))}
                                className="slider-control"
                            />
                            <span className="control-value">{volume}%</span>
                        </div>
                    </div>
                    
                    {/* A-B Loop controls */}
                    <div className="ab-loop-controls">
                        <button 
                            className={`loop-btn ${loopStart !== null ? 'active' : ''}`}
                            onClick={setLoopPoints}
                        >
                            {loopStart === null ? 'Set A' : 
                             loopEnd === null ? 'Set B' : 'Loop A-B'}
                        </button>
                        
                        {(loopStart !== null || loopEnd !== null) && (
                            <button className="loop-clear-btn" onClick={clearLoopPoints}>
                                Clear
                            </button>
                        )}
                        
                        {loopStart !== null && (
                            <span className="loop-time">
                                A: {formatTime(loopStart)}
                                {loopEnd !== null && ` - B: ${formatTime(loopEnd)}`}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Main player controls (always visible unless in mini mode) */}
            {!isMiniPlayer && (
                <>
                    <div className="media_ctrl_btn relative flex justify-between items-center">
                        {/* Left section */}
                        <div className="left-controls">
                            {!isExpanded && (
                                <div className="mini-song-info">
                                    <span className="mini-song-title">{currentSong.title}</span>
                                    <span className="mini-song-artist">{currentSong.artist}</span>
                                </div>
                            )}
                        </div>

                        {/* Center section - media controls */}
                        <div className="media_ctrl_group flex gap-4 items-center">
                            <button 
                                onClick={props.prev_fnc} 
                                disabled={props.check_prev_disable || isLoading} 
                                className={`control-btn ${props.check_prev_disable ? "disabled" : ""}`}
                            >
                                <SkipBack size={20} />
                            </button>
                            <button 
                                onClick={togglePlay} 
                                disabled={isLoading || !props.src}
                                className="play-btn"
                            >
                                {isLoading ? (
                                    <span className="loading-spinner"></span>
                                ) : isPlaying ? (
                                    <Pause size={24} />
                                ) : (
                                    <Play size={24} />
                                )}
                            </button>
                            <button 
                                onClick={props.next_fnc} 
                                disabled={props.check_next_disable || isLoading}
                                className={`control-btn ${props.check_next_disable ? "disabled" : ""}`}
                            >
                                <SkipForward size={20} />
                            </button>
                        </div>

                        {/* Right section - expand/collapse button */}
                        <div className="right-controls">
                            {!isExpanded ? (
                                <button onClick={toggleExpand} className="expand-btn">
                                    <Maximize2 size={20} />
                                </button>
                            ) : (
                                <button onClick={toggleExpand} className="expand-btn">
                                    <Minimize2 size={20} />
                                </button>
                            )}
                            
                            {isExpanded && (
                                <button onClick={toggleMiniPlayer} className="mini-btn">
                                    <MinusCircle size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    <audio 
                        ref={audioRef} 
                        onTimeUpdate={updateProgress} 
                        onLoadedMetadata={onAudioLoad}
                        onEnded={props.onEnded}
                        onError={onAudioError}
                    />
                    
                    <div className="progress-container">
                        <span className="time-display">{formatTime(audioRef.current?.currentTime)}</span>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={progress || 0}
                            onChange={onProgressChange} 
                            disabled={isLoading}
                            className="progress-slider"
                        />
                        <span className="time-display">{formatTime(duration)}</span>
                    </div>
                </>
            )}
        </div>
    );
};

export default Player;