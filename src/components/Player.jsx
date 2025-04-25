import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, Minimize2, SkipBack, SkipForward, Play, Pause, 
  Heart, Music, Volume2, Volume1, VolumeX, Sliders, X, MinusCircle 
} from 'lucide-react';
import "./Player.css";

export const Player = (props) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState({ x: 20, y: 20 });
    const [showEffects, setShowEffects] = useState(false);
    const [audioEffects, setAudioEffects] = useState({
        bass: 0,
        treble: 0,
        reverb: 0,
        volume: 80
    });
    const [isMuted, setIsMuted] = useState(false);
    
    const audioRef = useRef(null);
    const audioInitializedRef = useRef(false);
    const bassFilterRef = useRef(null);
    const trebleFilterRef = useRef(null);
    const reverbRef = useRef(null);
    const miniPlayerRef = useRef(null);
    const audioContextRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const gainNodeRef = useRef(null);
    const convolverRef = useRef(null);
    const processingSetupRef = useRef(false); // Track if Web Audio is set up

    // Current song info (should ideally come from props)
    const currentSong = props.currentsong || {
        title: props.title || "Unknown Track",
        artist: props.artist || "Unknown Artist",
        albumArt: props.albumArt || "/api/placeholder/200/200"
    };

    // Initialize Web Audio API only once and only when user interacts
    const initAudioProcessing = () => {
        // Only initialize once
        if (processingSetupRef.current) return;
        
        if (typeof window !== 'undefined' && window.AudioContext) {
            try {
                // Create audio context
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create filter nodes
                bassFilterRef.current = audioContextRef.current.createBiquadFilter();
                bassFilterRef.current.type = 'lowshelf';
                bassFilterRef.current.frequency.value = 200;
                
                trebleFilterRef.current = audioContextRef.current.createBiquadFilter();
                trebleFilterRef.current.type = 'highshelf';
                trebleFilterRef.current.frequency.value = 3000;
                
                // Create gain node for volume control
                gainNodeRef.current = audioContextRef.current.createGain();
                gainNodeRef.current.gain.value = audioEffects.volume / 100;

                // Create convolver for reverb effect
                convolverRef.current = audioContextRef.current.createConvolver();
                
                // Generate impulse response for reverb
                generateImpulseResponse();
                
                // Mark as initialized
                processingSetupRef.current = true;
                
                // Setup initial connections without the audio source
                // Connections will complete when audio element is ready
                bassFilterRef.current.connect(trebleFilterRef.current);
                trebleFilterRef.current.connect(gainNodeRef.current);
                gainNodeRef.current.connect(audioContextRef.current.destination);
                
                console.log("Audio processing initialized successfully");
            } catch (err) {
                console.error("Failed to initialize Web Audio API:", err);
                setError("Audio effects unavailable. Basic playback only.");
            }
        }
    };

    // Generate impulse response for reverb effect
    const generateImpulseResponse = () => {
        if (!audioContextRef.current || !convolverRef.current) return;
        
        try {
            const sampleRate = audioContextRef.current.sampleRate;
            const length = sampleRate * 2; // 2 seconds
            const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
            const leftChannel = impulse.getChannelData(0);
            const rightChannel = impulse.getChannelData(1);
            
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                leftChannel[i] = (Math.random() * 2 - 1) * decay;
                rightChannel[i] = (Math.random() * 2 - 1) * decay;
            }
            
            convolverRef.current.buffer = impulse;
        } catch (err) {
            console.error("Failed to generate impulse response:", err);
            // Fallback - disable reverb
            setAudioEffects(prev => ({...prev, reverb: 0}));
        }
    };

    // Update audio effects when they change
    useEffect(() => {
        if (!processingSetupRef.current || !bassFilterRef.current || !trebleFilterRef.current || !gainNodeRef.current) return;
        
        try {
            // Apply effects to the audio nodes
            bassFilterRef.current.gain.value = audioEffects.bass;
            trebleFilterRef.current.gain.value = audioEffects.treble;
            
            // Set volume
            const volumeValue = isMuted ? 0 : audioEffects.volume / 100;
            if (gainNodeRef.current.gain.value !== volumeValue) {
                // Use gradual transition for volume changes to avoid clicks
                gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioContextRef.current.currentTime);
                gainNodeRef.current.gain.linearRampToValueAtTime(
                    volumeValue, 
                    audioContextRef.current.currentTime + 0.05
                );
            }
            
            // Handle reverb effect
            if (audioEffects.reverb > 0 && convolverRef.current && convolverRef.current.buffer) {
                // Only reconnect if needed
                try {
                    trebleFilterRef.current.disconnect(gainNodeRef.current);
                } catch (e) {
                    // Might not be connected, ignore
                }
                
                try {
                    trebleFilterRef.current.connect(convolverRef.current);
                    convolverRef.current.connect(gainNodeRef.current);
                } catch (e) {
                    console.error("Failed to connect reverb:", e);
                    // Fallback to direct connection
                    trebleFilterRef.current.connect(gainNodeRef.current);
                }
            } else {
                // Bypass reverb
                try {
                    trebleFilterRef.current.disconnect();
                    if (convolverRef.current) convolverRef.current.disconnect();
                } catch (e) {
                    // Might not be connected, ignore
                }
                
                try {
                    trebleFilterRef.current.connect(gainNodeRef.current);
                } catch (e) {
                    console.error("Failed to reconnect after removing reverb:", e);
                }
            }
        } catch (err) {
            console.error("Error applying audio effects:", err);
        }
    }, [audioEffects, isMuted]);

    // Connect audio element to Web Audio API (called only once per audio element)
    const connectAudioElement = () => {
        // Skip if already connected or no audio context
        if (audioInitializedRef.current || !processingSetupRef.current || !audioContextRef.current || !audioRef.current) {
            return;
        }
        
        try {
            // Resume context if suspended
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
            
            // Create media element source only once
            sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceNodeRef.current.connect(bassFilterRef.current);
            audioInitializedRef.current = true;
            console.log("Audio element connected to Web Audio API successfully");
        } catch (err) {
            console.error("Failed to connect audio element:", err);
            
            // If we get the "already connected" error, mark as initialized anyway
            if (err.name === 'InvalidStateError' && err.message.includes('already connected')) {
                audioInitializedRef.current = true;
                console.log("Audio already connected, marked as initialized");
            } else {
                setError("Audio processing failed. Using basic playback.");
            }
        }
    };

    // Handle click on any button - initialize audio processing on first interaction
    const handleInteraction = () => {
        if (!processingSetupRef.current) {
            initAudioProcessing();
        }
        
        // Also try to resume audio context if it exists and is suspended
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(err => {
                console.error("Failed to resume audio context:", err);
            });
        }
    };

    // Toggle play/pause
    const togglePlay = () => {
        handleInteraction(); // Initialize on first interaction
        
        if (!audioRef.current || !props.src) {
            console.log("Cannot play - no audio element or source");
            return;
        }
        
        try {
            // Connect to Web Audio API if not already connected
            if (processingSetupRef.current && !audioInitializedRef.current) {
                connectAudioElement();
            }
            
            if (audioRef.current.paused) {
                setIsLoading(true);
                
                // Only attempt play() when we have a valid src
                if (audioRef.current.src) {
                    audioRef.current.play()
                        .then(() => {
                            setIsPlaying(true);
                            setError(null);
                            setIsLoading(false);
                        })
                        .catch(error => {
                            console.error("Playback failed:", error);
                            
                            // Handle autoplay policy restriction specifically
                            if (error.name === 'NotAllowedError') {
                                setError("Playback requires user interaction first. Please try again.");
                            } else {
                                setError(`Playback failed: ${error.message || "Unknown error"}`);
                            }
                            
                            setIsPlaying(false);
                            setIsLoading(false);
                        });
                } else {
                    console.error("No audio source available");
                    setError("No audio source available");
                    setIsLoading(false);
                }
            } else {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        } catch (err) {
            console.error("Error toggling playback:", err);
            setError("Playback error occurred. Please try again.");
            setIsPlaying(false);
            setIsLoading(false);
        }
    };

    const toggleExpand = () => {
        handleInteraction();
        setIsExpanded(!isExpanded);
        if (isMinimized) setIsMinimized(false);
    };

    const toggleFavorite = () => {
        handleInteraction();
        setIsFavorite(!isFavorite);
        if (props.onFavoriteToggle) {
            props.onFavoriteToggle(!isFavorite);
        }
    };

    const toggleMinimize = () => {
        handleInteraction();
        setIsMinimized(!isMinimized);
        if (isExpanded) setIsExpanded(false);
    };

    const toggleMute = () => {
        handleInteraction();
        setIsMuted(!isMuted);
    };

    const toggleEffects = () => {
        handleInteraction();
        setShowEffects(!showEffects);
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
    };

    const onAudioLoad = () => {
        if (!audioRef.current) return;
        
        const audioDuration = audioRef.current.duration;
        setDuration(isNaN(audioDuration) ? 0 : audioDuration);
        setError(null);
        
        // Connect to Web Audio API if needed - but only if the user has interacted first
        if (processingSetupRef.current && !audioInitializedRef.current) {
            connectAudioElement();
        }
    };

    // Improved error handling
    const onAudioError = (e) => {
        let errorMessage = "Error loading audio.";
        
        // Check for specific error codes
        if (audioRef.current && audioRef.current.error) {
            const errorCode = audioRef.current.error.code;
            switch (errorCode) {
                case 1:
                    errorMessage = "Audio loading aborted.";
                    break;
                case 2:
                    errorMessage = "Network error occurred loading audio.";
                    break;
                case 3:
                    errorMessage = "Audio decoding failed. Format may be unsupported.";
                    break;
                case 4:
                    errorMessage = "Audio source not found or access denied.";
                    break;
                default:
                    errorMessage = `Error loading audio: ${audioRef.current.error.message || "Unknown error"}`;
            }
        }
        
        console.error("Audio error:", e, errorMessage);
        setError(errorMessage);
        setIsPlaying(false);
        setIsLoading(false);
    };

    const onProgressChange = (e) => {
        handleInteraction();
        
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

    // Handle source changes
    useEffect(() => {
        if (props.src) {
            setIsLoading(true);
            setError(null);
            setProgress(0);
            setDuration(0);
            
            // Set the source directly on the audio element
            // Do NOT re-initialize audio processing - keep the existing connection
            if (audioRef.current) {
                audioRef.current.pause();
                
                // Set the source
                audioRef.current.src = props.src;
                audioRef.current.load();
                
                setIsPlaying(false);
                
                // We'll handle playback in the canplaythrough event
                const canPlayHandler = () => {
                    setIsLoading(false);
                    
                    // Don't autoplay - wait for user interaction
                    // This prevents the "NotAllowedError" from autoplay policy
                    
                    // Clean up this one-time handler
                    audioRef.current.removeEventListener('canplaythrough', canPlayHandler);
                };
                
                audioRef.current.addEventListener('canplaythrough', canPlayHandler);
                
                // Set timeout to handle cases where canplaythrough doesn't fire
                const timeoutId = setTimeout(() => {
                    if (isLoading) {
                        setIsLoading(false);
                        setError("Audio loading timeout. Please check your connection.");
                    }
                }, 15000); // 15 second timeout
                
                return () => {
                    clearTimeout(timeoutId);
                    if (audioRef.current) {
                        audioRef.current.removeEventListener('canplaythrough', canPlayHandler);
                    }
                };
            }
        }
    }, [props.src]);

    // Enhanced cleanup effect
    useEffect(() => {
        return () => {
            // Clean up audio element
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current.load();
            }
            
            // Clean up Web Audio API
            if (processingSetupRef.current) {
                try {
                    // Disconnect all nodes
                    if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
                    if (bassFilterRef.current) bassFilterRef.current.disconnect();
                    if (trebleFilterRef.current) trebleFilterRef.current.disconnect();
                    if (convolverRef.current) convolverRef.current.disconnect();
                    if (gainNodeRef.current) gainNodeRef.current.disconnect();
                    
                    // Close the audio context
                    if (audioContextRef.current) audioContextRef.current.close();
                } catch (err) {
                    console.error("Error during audio cleanup:", err);
                }
            }
        };
    }, []);

    // Handle audio effect changes
    const handleEffectChange = (effect, value) => {
        handleInteraction();
        setAudioEffects(prev => ({
            ...prev,
            [effect]: parseFloat(value)
        }));
    };

    // Drag functionality for the mini player
    const handleMouseDown = (e) => {
        handleInteraction();
        
        if (isMinimized && miniPlayerRef.current) {
            setIsDragging(true);
            // Calculate the offset from the mouse position to the div corner
            const rect = miniPlayerRef.current.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            
            // Store the offsets in component state instead of on the event
            miniPlayerRef.current.offsetX = offsetX;
            miniPlayerRef.current.offsetY = offsetY;
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && isMinimized && miniPlayerRef.current) {
            // Use the stored offsets
            const offsetX = miniPlayerRef.current.offsetX || 0;
            const offsetY = miniPlayerRef.current.offsetY || 0;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Constrain to window bounds
            const maxX = window.innerWidth - miniPlayerRef.current.offsetWidth;
            const maxY = window.innerHeight - miniPlayerRef.current.offsetHeight;
            
            setDragPosition({
                x: Math.max(0, Math.min(x, maxX)),
                y: Math.max(0, Math.min(y, maxY))
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add event listeners for drag functionality
    useEffect(() => {
        if (isMinimized) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isMinimized, isDragging]);

    

    // Render the mini player
    
    return(
        <>
    {/* Shared audio element */}
    <audio 
        ref={audioRef} 
        src={props.src}
        onTimeUpdate={updateProgress} 
        onLoadedMetadata={onAudioLoad}
        onEnded={props.onEnded}
        onError={onAudioError}
        preload="auto"
        crossOrigin="anonymous"
    />

    {isMinimized ? (
        <div 
            ref={miniPlayerRef}
            className="mini-player"
            style={{ 
                position: 'fixed',
                left: `${dragPosition.x}px`,
                top: `${dragPosition.y}px`
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            <div className="mini-player-content">
                <img 
                    src={currentSong.albumArt} 
                    alt={`${currentSong.title} album art`}
                    className={`mini-album-art ${isPlaying ? 'rotating' : ''}`}
                />
                <div className="mini-song-info">
                    <span className="mini-song-title">{currentSong.title}</span>
                </div>
                <div className="mini-controls">
                    <button 
                        onClick={togglePlay} 
                        className="mini-play-btn"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isLoading ? (
                            <span className="loading-spinner"></span>
                        ) : isPlaying ? (
                            <Pause size={14} />
                        ) : (
                            <Play size={14} />
                        )}
                    </button>
                    <button 
                        onClick={toggleMinimize}
                        className="mini-restore-btn"
                        aria-label="Restore player"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    ) : (
        <div className={`parent_player ${isExpanded ? 'expanded' : ''}`}>
            {error && <div className="error-message">{error}</div>}

            {isExpanded && (
                <div className="expanded-view">
                    <div className="expanded-header">
                        <button 
                            onClick={toggleEffects}
                            className={`control-button ${showEffects ? 'active' : ''}`}
                            aria-label="Audio effects"
                        >
                            <Sliders size={18} />
                        </button>
                        <button 
                            onClick={toggleMinimize}
                            className="control-button"
                            aria-label="Minimize player"
                        >
                            <MinusCircle size={18} />
                        </button>
                    </div>

                    <div className="album-art-container">
                        <img 
                            src={currentSong.albumArt} 
                            alt={`${currentSong.title} album art`}
                            className={`album-art ${isPlaying ? 'rotating' : ''}`}
                        />
                        <button 
                            className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                            onClick={toggleFavorite}
                            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Heart className={isFavorite ? "filled" : ""} />
                        </button>
                    </div>

                    <div className="song-info">
                        <h3 className="song-title">{currentSong.title}</h3>
                        <p className="song-artist">{currentSong.artist}</p>
                    </div>

                    {showEffects && (
                        <div className="audio-effects">
                            <div className="effect-header">
                                <h4>Audio Effects</h4>
                                <button 
                                    onClick={toggleEffects} 
                                    className="close-effects-btn"
                                    aria-label="Close effects"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {['bass', 'treble', 'reverb'].map((effect) => (
                                <div className="control-row" key={effect}>
                                    <label htmlFor={`${effect}-control`}>
                                        {effect.charAt(0).toUpperCase() + effect.slice(1)}
                                    </label>
                                    <input 
                                        id={`${effect}-control`}
                                        type="range"
                                        min={effect === 'reverb' ? '0' : '-10'}
                                        max="10"
                                        step="0.5"
                                        value={audioEffects[effect]}
                                        onChange={(e) => handleEffectChange(effect, e.target.value)}
                                        className="slider-control"
                                    />
                                    <span className="control-value">{audioEffects[effect]}</span>
                                </div>
                            ))}

                            <div className="control-row">
                                <button 
                                    onClick={toggleMute}
                                    className="volume-btn"
                                    aria-label={isMuted ? "Unmute" : "Mute"}
                                >
                                    {isMuted ? (
                                        <VolumeX size={16} />
                                    ) : audioEffects.volume > 50 ? (
                                        <Volume2 size={16} />
                                    ) : (
                                        <Volume1 size={16} />
                                    )}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={audioEffects.volume}
                                    onChange={(e) => handleEffectChange('volume', e.target.value)} 
                                    className="slider-control"
                                />
                                <span className="control-value">{audioEffects.volume}%</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="media_ctrl_btn relative flex justify-between items-center">
                <div className="left-controls">
                    {!isExpanded && (
                        <div className="mini-song-info">
                            <span className="mini-song-title">{currentSong.title}</span>
                            <span className="mini-song-artist">{currentSong.artist}</span>
                        </div>
                    )}
                </div>

                <div className="media_ctrl_group flex gap-4 items-center">
                    <button 
                        onClick={(e) => {
                            handleInteraction();
                            if (props.prev_fnc) props.prev_fnc(e);
                        }} 
                        disabled={props.check_prev_disable || isLoading} 
                        className={`control-btn ${props.check_prev_disable ? "disabled" : ""}`}
                        aria-label="Previous track"
                    >
                        <SkipBack size={20} />
                    </button>
                    <button 
                        onClick={togglePlay} 
                        disabled={isLoading || !props.src}
                        className="play-btn"
                        aria-label={isPlaying ? "Pause" : "Play"}
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
                        onClick={(e) => {
                            handleInteraction();
                            if (props.next_fnc) props.next_fnc(e);
                        }}
                        disabled={props.check_next_disable || isLoading}
                        className={`control-btn ${props.check_next_disable ? "disabled" : ""}`}
                        aria-label="Next track"
                    >
                        <SkipForward size={20} />
                    </button>
                </div>

                <div className="right-controls">
                    {!isExpanded && (
                        <button 
                            onClick={toggleMinimize}
                            className="mini-btn"
                            aria-label="Minimize player"
                        >
                            <MinusCircle size={20} />
                        </button>
                    )}
                    <button 
                        onClick={toggleExpand}
                        className="expand-btn"
                        aria-label={isExpanded ? "Collapse player" : "Expand player"}
                    >
                        {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

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
                    aria-label="Audio progress"
                />
                <span className="time-display">{formatTime(duration)}</span>
            </div>
        </div>
    )}
</>

    )
};

export default Player;