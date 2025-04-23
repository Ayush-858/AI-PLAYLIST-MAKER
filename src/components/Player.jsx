import React, { useState, useRef, useEffect } from 'react';
import "./Player.css";

export const Player = (props) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (!audioRef.current || !props.src) return;
        
        if (audioRef.current.paused) {
            setIsLoading(true);
            audioRef.current.play()
                .then(() => {
                    setIsPlaying(true);
                    setError(null);
                })
                .catch(error => {
                    console.error("Playback failed:", error);
                    setError("Failed to play audio. Please try again.");
                    setIsPlaying(false);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
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
    };

    const onAudioLoad = () => {
        if (!audioRef.current) return;
        
        const audioDuration = audioRef.current.duration;
        setDuration(isNaN(audioDuration) ? 0 : audioDuration);
        setError(null);
    };

    const onAudioError = (e) => {
        console.error("Audio error:", e);
        setError("Error loading audio. Please try again.");
        setIsPlaying(false);
        setIsLoading(false);
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

            // Create a new Audio element to test the source
            const testAudio = new Audio(props.src);
            
            const canPlayHandler = () => {
                setError(null);
                // Only after we confirm it can play, we set the source to our main audio element
                if (audioRef.current) {
                    audioRef.current.src = props.src;
                    audioRef.current.load();
                    audioRef.current.play()
                        .then(() => {
                            setIsPlaying(true);
                            setIsLoading(false);
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
    }, [props.src]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    return (
        <div className='parent_player'>
            {/* temp removed error giving line */}
            {/* {error && <div className="error-message" style={{color: 'red', textAlign: 'center'}}>{error}</div>} */}
            
            <div className='media_ctrl_btn'>
                <button 
                    onClick={props.prev_fnc} 
                    disabled={props.check_prev_disable || isLoading} 
                    style={{ color: props.check_prev_disable ? "rgba(219, 209, 209, 0.58)" : undefined }}
                >
                    Prev
                </button>
                <button onClick={togglePlay} disabled={isLoading || !props.src}>
                    {isLoading ? '...' : isPlaying ? 'II' : '▶'}
                </button>
                <button 
                    onClick={props.next_fnc} 
                    disabled={props.check_next_disable || isLoading}
                    style={{ color: props.check_next_disable ? "rgba(219, 209, 209, 0.58)" : undefined }}
                >
                    Next
                </button>

            
            </div>

            <audio 
                ref={audioRef} 
                onTimeUpdate={updateProgress} 
                onLoadedMetadata={onAudioLoad}
                onEnded={props.onEnded}
                onError={onAudioError}
            />
            
            <div className="progress-container">
                <span>{formatTime(audioRef.current?.currentTime)}</span>
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={progress || 0}
                    onChange={onProgressChange} 
                    disabled={isLoading}
                />
                <span>{formatTime(duration)}</span>
            </div>
        </div>
    );
};

export default Player;