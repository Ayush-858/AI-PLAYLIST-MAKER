import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Music, Import, Save, Sparkles, X, Share2, Download, ArrowRight, MoreHorizontal,ListVideo } from "lucide-react";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Play, PauseCircle, Heart,Trash } from "lucide-react";
import Player from "./components/Player";

function App() {
  const [messages, setMessages] = useState([
    {
      type: "ai",
      content:
        "Hi! I can help you create the perfect playlist. What kind of music are you in the mood for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [playlists, setPlaylists] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [conversationContext, setConversationContext] = useState([]);
  const [isPlaylistRequestMode, setIsPlaylistRequestMode] = useState(false);
  const messagesEndRef = useRef(null);

  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [results, setResults] = useState([]);
  const [audioSrc, setAudioSrc] = useState('');
  const [currentSong, setCurrentSong] = useState('');
  const [currentThumbnail, setCurrentThumbnail] = useState(''); // Default image
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  //forsearching songs
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchError, setSearchError] = useState(null);




  //for managing queue system
  const [queue, setQueue] = useState([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);


// Replace the addToQueue function with this:
const addToQueue = (songName, url, thumbnail) => {
  const newQueueItem = {
    name: songName, 
    url: url,
    thumbnail: thumbnail || '/images/side.gif',
    file: null
  };
  
  setQueue(prev => [...prev, newQueueItem]);
  
  // Show notification
  showQueueNotification(`Added "${songName}" to queue`);
  
  // If this is the first song in queue and nothing is playing, start playing it
  if (queue.length === 0 && currentIndex === -1) {
    playFromQueue(0);
  }
};
  // Add this function to handle playing a song from the queue
  const playFromQueue = (index) => {
    if (index >= 0 && index < queue.length) {
      const queueItem = queue[index];
      play(queueItem.url, queueItem.name, queueItem.file, queueItem.thumbnail);
    }
  };
  
  // Add this function to handle removing a song from the queue
  const removeFromQueue = (index) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };
  
  // Add this function to handle clearing the entire queue
  const clearQueue = () => {
    setQueue([]);
  };




  //////////////////////////////////



  // queue notifications helper function
const showQueueNotification = (message) => {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.className = 'fixed top-24 right-4 bg-pink-600 text-white px-4 py-2 rounded-lg shadow-lg z-[1002] animate-fadeIn';
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('animate-fadeOut');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 2000);
};




  const currentSongDetails = {
    title: currentSong,
    artist: "unknown",
    albumArt: currentThumbnail
  };


 //for seraching using top search bar
 const handleSearchInputChange = (e) => {
  setSearchQuery(e.target.value);
};

const handleSearchSubmit = () => {
  if (searchQuery.length < 2) return;
  
  setIsSearching(true);
  setShowSearchDropdown(true);
  setSearchError(null);
  
  const data = { query_user: searchQuery + " song" };
  
  fetch('http://localhost:4000/run-python', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    setSearchResults(data.output);
    setIsSearching(false);
  })
  .catch(error => {
    console.error('Error:', error);
    setIsSearching(false);
    setSearchError("Failed to connect to the server. Please ensure the backend is running.");
  });
};

const addToPlaylist = (songName, url, thumbnail) => {
  if (!selectedPlaylist) {
    alert("Please select a playlist first!");
    return;
  }
  
  const songParts = songName.split(' - ');
  const newSong = {
    title: songParts[0] || songName,
    artist: songParts[1] || "Unknown Artist"
  };
  
  const updatedPlaylists = playlists.map(playlist => {
    if (playlist.id === selectedPlaylist.id) {
      return {
        ...playlist,
        songs: [...playlist.songs, newSong]
      };
    }
    return playlist;
  });
  
  setPlaylists(updatedPlaylists);
  localStorage.setItem("playlists", JSON.stringify(updatedPlaylists));
  
  if (selectedPlaylist) {
    setSelectedPlaylist({
      ...selectedPlaylist,
      songs: [...selectedPlaylist.songs, newSong]
    });
  }
  
  alert(`Added "${songName}" to playlist "${selectedPlaylist.name}"`);
};



//when user click outside de=ropdown for closing
//when user click outside dropdown for closing
useEffect(() => {
  const handleClickOutside = (event) => {
    if (showSearchDropdown && 
        !event.target.closest(".search-container") &&
        !event.target.closest(".search-results-dropdown")) {
      setShowSearchDropdown(false);
    }
  };
  
  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showSearchDropdown]);

/////////////////////////////////////////////////////////




  
  const search = (songtitle) => {
 
    const data = { query_user: songtitle + " song" };

    fetch('http://localhost:4000/run-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        setResults(data.output);
        play(data.output[0][1], data.output[0][0],null,data.output[0][2]);
    })
    .catch(error => {
        console.error('Error:', error);
    });
};




//temp
useEffect(() => {
  console.log("Results:", currentThumbnail);
  })









//FOR PLAYING ALL SONGS
// Add this function to handle playing all songs in a playlist
const handlePlayAll = () => {
  if (!selectedPlaylist || selectedPlaylist.songs.length === 0) return;
  
  // Start with the first song
  const firstSong = selectedPlaylist.songs[0];
  const searchQuery = `${firstSong.title} ${firstSong.artist}`;
  
  // Set the current index to 0 (first song)
  setCurrentIndex(0);
  
  // Create a new playlist array from the selected playlist songs
  const newPlaylist = selectedPlaylist.songs.map(song => ({
    name: `${song.title} - ${song.artist}`,
    url: '', // This will be populated when the song is searched
    file: null, // This will be populated when the song is downloaded
    thumbnail: ''
  }));
  
  // Update the playlist state
  setPlaylist(newPlaylist);
  
  // Search for the first song and start playing
  search(searchQuery);
  
  // Update UI elements
  setCurrentSong(`${firstSong.title} - ${firstSong.artist}`);
};
////////////////////////////////////////////////////////////////














//for deleting playlist

// First, add a function to handle playlist deletion
const handleDeletePlaylist = (playlistId, event) => {
  // Stop the event from propagating to parent elements
  event.stopPropagation();
  
  // Confirm deletion with the user
  if (window.confirm("Are you sure you want to delete this playlist?")) {
    // Filter out the playlist with the matching ID
    const updatedPlaylists = playlists.filter(playlist => playlist.id !== playlistId);
    
    // Update state
    setPlaylists(updatedPlaylists);
    
    // Save to localStorage
    localStorage.setItem("playlists", JSON.stringify(updatedPlaylists));
    
    // If the selected playlist is being deleted, close the dashboard
    if (selectedPlaylist && selectedPlaylist.id === playlistId) {
      setSelectedPlaylist(null);
    }
  }
};
//////////////////////////////////////////////////////










  ///for handling prev and next song
  const handleNext = () => {
    if (currentIndex < playlist.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextSong = playlist[nextIndex];
        if (nextSong.file) {
            // If file is available, play the song
            setCurrentIndex(nextIndex);
            setCurrentSong(nextSong.name);
            setCurrentThumbnail(nextSong.thumbnail || '/images/side.gif');
            setAudioSrc(`http://localhost:4000/files/${encodeURIComponent(nextSong.file)}`);
        } else {
            // If file is not available, trigger download
            play(nextSong.url, nextSong.name, null, nextSong.thumbnail || '/images/side.gif');
        }
    }
};

// Play previous song in the playlist
const handlePrev = () => {
    if (currentIndex > 0) {
        const prevIndex = currentIndex - 1;
        const prevSong = playlist[prevIndex];
        if (prevSong.file) {
            // If file is available, play the song
            setCurrentIndex(prevIndex);
            setCurrentSong(prevSong.name);
            setCurrentThumbnail(prevSong.thumbnail || '/images/side.gif');
            setAudioSrc(`http://localhost:4000/files/${encodeURIComponent(prevSong.file)}`);
        } else {
            // If file is not available, trigger download
            play(prevSong.url, prevSong.name, null, prevSong.thumbnail || '/images/side.gif');
        }
    }
};
  ///////////////////////////////////









useEffect(() => {
  const savedPlaylist = JSON.parse(localStorage.getItem('playlist')) || [];
  setPlaylist(savedPlaylist);
  if (savedPlaylist.length > 0) {
      setCurrentIndex(savedPlaylist.length - 1);
      setCurrentSong(savedPlaylist[savedPlaylist.length - 1].name);
      setAudioSrc(`http://localhost:4000/files/${encodeURIComponent(savedPlaylist[savedPlaylist.length - 1].file)}`);
      setCurrentThumbnail(savedPlaylist[savedPlaylist.length - 1].thumbnail || '/images/side.gif');  // Set thumbnail
  }
}, []);


    // Save playlist to local storage
    useEffect(() => {
      localStorage.setItem('playlist', JSON.stringify(playlist));
  }, [playlist]);

















    // Play a song
    const play = (url, songName, file = null, thumbnail = '') => {
      const youtubeEmbedUrl = url.includes('youtube.com') ? 
          url.replace('watch?v=', 'embed/') : 
          url;
      
      setVideoUrl(youtubeEmbedUrl);
    
      if (isDownloading) {
          console.log('Download already in progress...');
          return;
      }
    
      if (file) {
          setAudioSrc(`http://localhost:4000/files/${encodeURIComponent(file)}`);
          setCurrentSong(songName);
          setCurrentThumbnail(thumbnail);
          return;
      }
    
      setIsDownloading(true);
    
      const data = { url };
    
      fetch('http://localhost:4000/download-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
      })
      .then(response => response.json())
      .then(data => {
          setIsDownloading(false);
          const newSong = { name: songName, file: data.file, thumbnail };
          
          // Update the queue item if it exists
          setQueue(prevQueue => 
            prevQueue.map(item => 
              item.name === songName ? {...item, file: data.file} : item
            )
          );
    
          // Update playlist as before
          setPlaylist(prevPlaylist => {
              const updatedPlaylist = prevPlaylist.map(song =>
                  song.name === songName ? newSong : song
              );
              if (!updatedPlaylist.find(song => song.name === songName)) {
                  updatedPlaylist.push(newSong);
              }
              return updatedPlaylist;
          });
    
          setCurrentSong(songName);
          setCurrentThumbnail(thumbnail);
          setAudioSrc(`http://localhost:4000/files/${encodeURIComponent(data.file)}`);
      })
      .catch(error => {
          setIsDownloading(false);
          console.error('Error:', error);
      });
    };
    
    // Add this function to handle auto-play of next song in queue
    const handleSongEnd = () => {
      // First check if there's a next song in the queue
      const currentQueueIndex = queue.findIndex(item => item.name === currentSong);
      
      if (currentQueueIndex !== -1 && currentQueueIndex < queue.length - 1) {
        // If there's a next item in queue, play it
        playFromQueue(currentQueueIndex + 1);
      } else if (queue.length > 0 && currentQueueIndex !== -1) {
        // If we've reached the end of the queue, remove all played songs
        setQueue(prev => prev.filter((_, i) => i > currentQueueIndex));
      } else {
        // If no queue or item not in queue, use the original next function
        handleNext();
      }
    };
    
  ////////////////////////////////////////////////




















  // Load playlists from localStorage on initial render
  useEffect(() => {
    const savedPlaylists = localStorage.getItem("playlists");
    if (savedPlaylists) {
      setPlaylists(JSON.parse(savedPlaylists));
    }
  }, []);

  // Save playlists to localStorage whenever they change
  useEffect(() => {
    if (playlists.length > 0) {
      localStorage.setItem("playlists", JSON.stringify(playlists));
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to determine if the user's message is a playlist request
  const analyzeUserIntent = async (userMessage) => {
    const apiKey = "AIzaSyCwIyE-xCxFunqmq65GmhS6VgKmY1Cpkfs";
    if (!apiKey) {
      console.error("❌ Gemini API key is missing!");
      return { isPlaylistRequest: true, response: "I'll create a playlist for you." };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const allContext = [...conversationContext, userMessage].join("\n");
    
    const prompt = `
      Analyze this user message in the context of a music playlist creation app:
      "${userMessage}"
      
      Previous conversation context:
      ${allContext}
      
      Determine if this is:
      1. A request for a music playlist (e.g., "Make me a workout playlist", "I need music for studying")
      2. A question or conversation about music that doesn't explicitly request a playlist
      
      If it's #1, respond with:
      {"isPlaylistRequest": true, "response": "I'll create a playlist based on your request."}
      
      If it's #2, respond with:
      {"isPlaylistRequest": false, "response": "YOUR CONVERSATIONAL RESPONSE THAT EVENTUALLY LEADS TOWARD SUGGESTING A PLAYLIST"}
      
      Return ONLY valid JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      try {
        // Extract the JSON part
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No valid JSON found in response");
        }
        
        const jsonResponse = JSON.parse(jsonMatch[0]);
        return jsonResponse;
      } catch (parseError) {
        console.error("Error parsing intent analysis response:", parseError);
        // Default to playlist creation to ensure functionality
        return { isPlaylistRequest: true, response: "I'll create a playlist for you." };
      }
    } catch (error) {
      console.error("⚠️ Error analyzing user intent:", error);
      // Default to playlist creation as fallback
      return { isPlaylistRequest: true, response: "I'll create a playlist for you." };
    }
  };

  // Function to generate a playlist using Gemini API
  const generatePlaylistWithGemini = async (userQuery) => {
    setIsLoading(true);

    const apiKey = "AIzaSyCwIyE-xCxFunqmq65GmhS6VgKmY1Cpkfs";
    if (!apiKey) {
      console.error("❌ Gemini API key is missing!");
      setIsLoading(false);
      return null;
    }

    // Add all context to make better playlist recommendations
    const allContext = [...conversationContext, userQuery].join("\n");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Create a playlist of 15 songs based on this request and conversation context:
      "${userQuery}"
      
      Previous conversation context:
      ${allContext}
      
      Return ONLY the songs in a structured JSON format with no additional text.
      Format: 
      {
        "playlistName": "A catchy name for this playlist based on the request",
        "songs": [
          {"title": "Song Title 1", "artist": "Artist Name 1"},
          {"title": "Song Title 2", "artist": "Artist Name 2"},
          ...and so on for all 15 songs
        ]
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Parse the JSON response
      try {
        // Extract the JSON part
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No valid JSON found in response");
        }
        
        const jsonResponse = JSON.parse(jsonMatch[0]);
        
        // Create a new playlist object
        const newPlaylist = {
          id: Date.now().toString(),
          name: jsonResponse.playlistName || `Playlist for "${userQuery.slice(0, 20)}${userQuery.length > 20 ? '...' : ''}"`,
          songs: jsonResponse.songs || [],
          timestamp: new Date().toISOString().split('T')[0]
        };
        
        setPlaylists(prev => [newPlaylist, ...prev]);
        setIsLoading(false);
        return newPlaylist;
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        
        // Fallback: Create a default playlist with placeholder songs
        const fallbackPlaylist = {
          id: Date.now().toString(),
          name: `Playlist for "${userQuery.slice(0, 20)}${userQuery.length > 20 ? '...' : ''}"`,
          songs: [
            { title: "Unable to generate songs", artist: "Please try again" }
          ],
          timestamp: new Date().toISOString().split('T')[0]
        };
        
        setPlaylists(prev => [fallbackPlaylist, ...prev]);
        setIsLoading(false);
        return fallbackPlaylist;
      }
    } catch (error) {
      console.error("⚠️ Error generating playlist with Gemini:", error);
      setIsLoading(false);
      return null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { type: "user", content: userMessage }]);
    setInput("");
    
    // Add to conversation context
    setConversationContext(prev => [...prev, userMessage]);
    
    // Show typing indicator
    setIsLoading(true);
    
    if (isPlaylistRequestMode) {
      // We're already in playlist request mode, so generate the playlist
      setMessages(prev => [...prev, { type: "ai", content: "Generating your playlist... This may take a moment." }]);
      
      const playlist = await generatePlaylistWithGemini(userMessage);
      
      if (playlist) {
        // Remove the loading message and add the playlist response
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Remove the loading message
          
          // Format songs for display
          const formattedSongs = playlist.songs.map((song, index) => 
            `${index + 1}. "${song.title}" by ${song.artist}`
          ).join('\n');
          
          const aiResponse = `Based on your request, I've created "${playlist.name}" with ${playlist.songs.length} songs:\n\n${formattedSongs}`;
          
          return [...newMessages, { type: "ai", content: aiResponse }];
        });
        
        // Generate AI summary for the playlist
        generateAiSummary(playlist);
        
        // Reset playlist request mode
        setIsPlaylistRequestMode(false);
      } else {
        // Handle error case
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Remove the loading message
          return [...newMessages, { type: "ai", content: "Sorry, I couldn't generate a playlist at this time. Please try again with a different request." }];
        });
        setIsPlaylistRequestMode(false);
      }
    } else {
      // Analyze if this is a playlist request or general conversation
      const intentAnalysis = await analyzeUserIntent(userMessage);
      
      if (intentAnalysis.isPlaylistRequest) {
        // It's a playlist request, generate right away
        setMessages(prev => [...prev, { type: "ai", content: "Generating your playlist... This may take a moment." }]);
        
        const playlist = await generatePlaylistWithGemini(userMessage);
        
        if (playlist) {
          // Remove the loading message and add the playlist response
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Remove the loading message
            
            // Format songs for display
            const formattedSongs = playlist.songs.map((song, index) => 
              `${index + 1}. "${song.title}" by ${song.artist}`
            ).join('\n');
            
            const aiResponse = `Based on your request, I've created "${playlist.name}" with ${playlist.songs.length} songs:\n\n${formattedSongs}`;
            
            return [...newMessages, { type: "ai", content: aiResponse }];
          });
          
          // Generate AI summary for the playlist
          generateAiSummary(playlist);
        } else {
          // Handle error case
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Remove the loading message
            return [...newMessages, { type: "ai", content: "Sorry, I couldn't generate a playlist at this time. Please try again with a different request." }];
          });
        }
      } else {
        // It's a conversation, respond accordingly
        setMessages(prev => [...prev, { type: "ai", content: intentAnalysis.response }]);
        
        // Check if the response is suggesting to create a playlist
        if (intentAnalysis.response.toLowerCase().includes("playlist")) {
          setIsPlaylistRequestMode(true);
        }
      }
    }
    
    setIsLoading(false);
  };

  // Function to generate AI summary using Gemini API
  const generateAiSummary = async (playlist) => {
    const apiKey = "AIzaSyCwIyE-xCxFunqmq65GmhS6VgKmY1Cpkfs";
    if (!apiKey) {
      console.error("❌ Gemini API key is missing!");
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const songsText = playlist.songs.map(song => `"${song.title}" by ${song.artist}`).join(", ");
    
    const prompt = `
      Provide a brief summary of this playlist, rate its quality on a scale of 1-10, and suggest 2-3 similar songs.
      Playlist name: ${playlist.name}
      Songs: ${songsText}
      
      Keep your response concise (3-4 sentences maximum).
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      setAiSummary(responseText);
    } catch (error) {
      console.error("⚠️ Error generating AI summary:", error);
      setAiSummary("Unable to generate AI summary at this time.");
    }
  };

  const handleSavePlaylist = () => {
    alert("All playlists are automatically saved to your browser.");
  };
  
  const handlePlaylistClick = (playlist) => {
    setSelectedPlaylist(playlist);
    generateAiSummary(playlist);
  };
  
  const closePlaylistDashboard = () => {
    setSelectedPlaylist(null);
  };
  
  // Function to handle playlist export to CSV/text file
  const handleExportPlaylist = () => {
    if (!selectedPlaylist) return;
    
    // Create CSV content
    const csvHeader = "Song Title,Artist\n";
    const csvContent = selectedPlaylist.songs.map(song => `"${song.title}","${song.artist}"`).join("\n");
    const fullCsvContent = csvHeader + csvContent;
    
    // Create a blob and download link
    const blob = new Blob([fullCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedPlaylist.name.replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Function to handle playlist sharing
  const handleSharePlaylist = () => {
    if (!selectedPlaylist) return;
    
    // Create shareable text
    const shareableText = `Check out this playlist: ${selectedPlaylist.name}\n\n` + 
      selectedPlaylist.songs.map((song, index) => `${index + 1}. "${song.title}" by ${song.artist}`).join("\n");
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `Playlist: ${selectedPlaylist.name}`,
        text: shareableText
      }).catch(error => {
        console.error("Error sharing:", error);
        fallbackShare(shareableText);
      });
    } else {
      fallbackShare(shareableText);
    }
  };
  
  // Fallback sharing method using clipboard
  const fallbackShare = (text) => {
    try {
      navigator.clipboard.writeText(text);
      alert("Playlist copied to clipboard! You can now paste and share it.");
    } catch (error) {
      console.error("Clipboard write failed:", error);
      alert("Couldn't copy to clipboard. Please manually copy the playlist from the dashboard.");
    }
  };
  
  // Function to create a playlist from the conversation if in question mode
  const handleCreatePlaylistFromConversation = () => {
    if (!isPlaylistRequestMode) return;
    
    // Combine all context
    const fullContext = conversationContext.join(" ");
    
    // Generate the playlist based on the full conversation context
    setMessages(prev => [...prev, { type: "ai", content: "Generating your playlist based on our conversation..." }]);
    
    generatePlaylistWithGemini(fullContext).then(playlist => {
      if (playlist) {
        // Remove the loading message and add the playlist response
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Remove the loading message
          
          // Format songs for display
          const formattedSongs = playlist.songs.map((song, index) => 
            `${index + 1}. "${song.title}" by ${song.artist}`
          ).join('\n');
          
          const aiResponse = `Based on our conversation, I've created "${playlist.name}" with ${playlist.songs.length} songs:\n\n${formattedSongs}`;
          
          return [...newMessages, { type: "ai", content: aiResponse }];
        });
        
        // Generate AI summary for the playlist
        generateAiSummary(playlist);
        setIsPlaylistRequestMode(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900/30 to-black z-0"></div>
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-pink-600/20 to-transparent z-0"></div>
      
      {/* Animated circles in background */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-pink-600/10 blur-3xl animate-pulse z-0"></div>
      <div className="absolute bottom-1/3 right-1/3 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse z-0" style={{animationDelay: "1s"}}></div>
      



{/* Top navigation bar */}


<div className="relative z-[1000] backdrop-blur-lg bg-black/30 border-b border-white/10 py-4 px-6 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <Sparkles className="w-6 h-6 text-pink-400" />
    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
      Harmony
    </h1>
  </div>
  
  <div className="relative flex-1 max-w-md mx-6 search-container">
    <div className="relative flex">
      <input
        type="text"
        placeholder="Search for songs..."
        value={searchQuery}
        onChange={handleSearchInputChange}
        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
        className="w-full bg-white/10 border border-white/10 rounded-l-full px-5 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder-white/50 text-white"
      />
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <button 
        onClick={handleSearchSubmit}
        className="bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white px-5 py-2 rounded-r-full transition-all duration-300 flex items-center justify-center"
      >
        Search
      </button>
      
      {showSearchDropdown && (
        <div className="absolute top-full mt-2 w-full bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl shadow-lg z-500 overflow-hidden animate-fadeIn" >
          {isSearching ? (
            <div className="flex justify-center items-center p-4" >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          ) : searchError ? (
            <div className="p-4 text-center text-red-400" >
              <p>{searchError}</p>
              <p className="text-sm mt-2 text-white/60">
         
              </p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">

{searchResults.map((result, index) => (
  <div 
    key={index}
    className="flex items-center p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 group"
  >
    <img 
      src={result[2] || "/images/side.gif"} 
      alt={result[0]} 
      className="w-12 h-12 rounded-md object-cover"
      onError={(e) => e.target.src = "/images/side.gif"}
    />
    <div className="ml-3 flex-1">
      <p className="text-white font-medium truncate">{result[0]}</p>
    </div>
    <div className="flex space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
      <button 
        onClick={() => {
          play(result[1], result[0], null, result[2]);
          // Remove the addToQueue call from here
          setShowSearchDropdown(false);
        }}
        className="p-2 rounded-full bg-pink-500 hover:bg-pink-400 transition-colors transform hover:scale-105 active:scale-95"
        style={{ zIndex: 1000 }}
      >
        <Play className="w-4 h-4 text-white" />
      </button>
      {/* Add a new button for queue */}
      <button 
        onClick={() => {
          addToQueue(result[0], result[1], result[2]);
          // Show queue notification is already handled in addToQueue function
        }}
        className="p-2 rounded-full bg-gray-500 hover:bg-pink-400 transition-colors transform hover:scale-105 active:scale-95"
      >
        <ListVideo className="w-4 h-4 text-white" />
      </button>
      <button 
        onClick={() => {
          addToPlaylist(result[0], result[1], result[2]);
        }}
        className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors transform hover:scale-105 active:scale-95"
      >
        <Import className="w-4 h-4 text-white" />
      </button>
    </div>
  </div>
))}
            </div>
          ) : (
            <div className="p-4 text-center text-white/50">
              {searchQuery.length > 0 ? "No results found" : "Type a song name and click search"}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  
  <div className="text-sm text-white/70">AI-Powered Playlist Creation</div>
</div>








      {/* Main content area */}
      <div className="flex flex-1 relative z-10">
        {/* Left Side - Chat Interface */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-4 custom-scrollbar pr-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300 ${
                    message.type === "user" 
                      ? "bg-gradient-to-r from-pink-600 to-pink-500 text-white" 
                      : "bg-white/10 border border-white/10 text-white hover:bg-white/15"
                  }`}
                  style={{
                    animation: `${index === messages.length - 1 ? "fadeIn 0.3s ease-out" : ""}`
                  }}
                >
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isPlaylistRequestMode ? "Describe the playlist you want..." : "Ask about music or request a playlist..."}
                className="flex-1 bg-white/10 text-white rounded-xl px-4 py-3 border border-white/10 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all placeholder-white/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                className={`${
                  isLoading ? "bg-pink-600/50" : "bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400"
                } text-white px-5 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-pink-500/20`}
                disabled={isLoading}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </form>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {isPlaylistRequestMode && (
                <button 
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-pink-500/20"
                  onClick={handleCreatePlaylistFromConversation}
                  disabled={isLoading}
                >
                  <ArrowRight className="w-5 h-5" />
                  Create Playlist Now
                </button>
              )}
            
            </div>
          </div>
        </div>

        {/* Right Side - Saved Playlists or Playlist Dashboard */}
        <div className="w-96 backdrop-blur-md bg-black/40 border-l border-white/10 overflow-hidden flex flex-col">
          {!selectedPlaylist ? (
            // Playlists List View
            <>
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Music className="w-6 h-6 text-pink-400" />
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">Your Playlists</h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {playlists.map((playlist) => (
  <div
    key={playlist.id}
    className="group bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden"
    onClick={() => handlePlaylistClick(playlist)}
  >
    {/* Subtle hover effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-semibold text-lg mb-1">{playlist.name}</h3>
        <p className="text-sm text-white/70">{playlist.songs.length} songs</p>
        <p className="text-xs text-white/50 mt-2">Created: {playlist.timestamp}</p>
      </div>
      <div className="flex items-center space-x-2">
        <div className="bg-white/5 rounded-full p-2 transition-transform group-hover:scale-110">
          <Play className="w-5 h-5 text-pink-400" />
        </div>
        <div 
          className="bg-white/5 rounded-full p-2 transition-transform group-hover:scale-110 cursor-pointer"
          onClick={(e) => handleDeletePlaylist(playlist.id, e)}
        >
          <Trash className="w-5 h-5 text-red-400" />
        </div>
      </div>
    </div>
  </div>
))}
                
                {playlists.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-white/50 text-center p-4">
                    <Music className="w-12 h-12 mb-4 text-pink-500/50" />
                    <p className="text-lg">No playlists yet</p>
                    <p className="text-sm mt-2">Start a conversation to create one!</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            // Playlist Dashboard View
            <>
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-6 h-6 text-pink-400" />
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">Now Playing</h2>
                </div>
                <button 
                  onClick={closePlaylistDashboard}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6">
                  {/* Playlist header with cover art placeholder */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Music className="w-12 h-12 text-white/80" />
                    </div>
                    <div>
                      <h3 className="font-bold text-2xl text-white">{selectedPlaylist.name}</h3>
                      <p className="text-sm text-white/70">Created: {selectedPlaylist.timestamp}</p>
                      <p className="text-sm text-white/70">{selectedPlaylist.songs.length} songs</p>
                    </div>
                  </div>
                  
                  {/* Playlist actions */}
                  <div className="flex gap-3 mb-6">
                  <button 
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white px-5 py-2 rounded-full shadow-lg transition-all duration-300 text-xs"
                    onClick={handlePlayAll}
                  >
                  <Play className="w-4 h-4" />
                    Play All
                  </button>


                  
                    <button 
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all duration-300"
                      onClick={handleSharePlaylist}
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                    <button 
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all duration-300"
                      onClick={handleExportPlaylist}
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                  
                  {/* Song list with hover effects */}
                  <div className="space-y-1">
                    {selectedPlaylist.songs.map((song, index) => (
                      <div 
                        key={index} 
                        className="group bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all duration-200 flex items-center"
                      >
                        <div className="w-8 text-center text-white/50 mr-2">{index + 1}</div>
                        <div className="flex-1">
                          <p className="font-medium text-white truncate">{song.title}</p>
                          <p className="text-sm text-white/70 truncate">{song.artist}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 rounded-full hover:bg-white/20 transition-colors" onClick={() =>{search(song.title);}}>
                            <Play className="w-4 h-4 text-pink-400" />
                          </button>
                          <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
                            <Heart className="w-4 h-4 text-white/70" />
                          </button>
                          <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-white/70" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* AI Generated Summary */}
                {aiSummary && (
                  <div className="p-6 border-t border-white/10">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span className="bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">AI Insights</span>
                    </h3>
                    <p className="text-sm text-white/80 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">{aiSummary}</p>
                  </div>
                )}
              </div>
            </>
          )}

         
        </div>
      </div>
       {/* Mini-player at bottom */}
       <div className="bg-black/60 p-4 border-t border-white/10 ">
       <Player 
  src={audioSrc}
  prev_fnc={handlePrev}
  next_fnc={handleNext}
  check_prev_disable={currentIndex <= 0}
  check_next_disable={currentIndex >= playlist.length - 1}
  onEnded={handleSongEnd}  // Changed from handleNext to our new function
  currentsong={currentSongDetails}
/>
</div>



{/* Queue Button and Dropdown */}
<div className="fixed top-20 right-4 z-[1001]">
  <button 
    onClick={() => setIsQueueOpen(!isQueueOpen)}
    className="flex items-center gap-1 bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded-full text-xs transition-all shadow-md"
  >
    {queue.length > 0 && (
      <span className="inline-flex items-center justify-center bg-white text-pink-600 rounded-full w-5 h-5 text-xs font-bold">
        {queue.length}
      </span>
    )}
    <ListVideo />
  </button>
  
  {isQueueOpen && (
    <div className="absolute right-0 top-full mt-2 w-72 bg-black/90 backdrop-blur-lg border border-white/10 rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Up Next ({queue.length})</h3>
        <div className="flex gap-1">
          <button 
            onClick={clearQueue}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title="Clear queue"
          >
            <Trash className="w-4 h-4 text-white/70" />
          </button>
          <button 
            onClick={() => setIsQueueOpen(false)}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </div>
      
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {queue.length === 0 ? (
          <div className="py-8 text-center text-white/50">
            <p>Your queue is empty</p>
            <p className="text-xs mt-1">Search for songs to add</p>
          </div>
        ) : (
          queue.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center p-2 hover:bg-white/5 border-b border-white/5 last:border-0 group"
            >
              <img 
                src={item.thumbnail} 
                alt={item.name} 
                className="w-10 h-10 rounded object-cover"
                onError={(e) => e.target.src = "/images/side.gif"}
              />
              <div className="ml-2 flex-1 overflow-hidden">
                <p className="text-sm text-white font-medium truncate">{item.name}</p>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => playFromQueue(index)}
                  className="p-1 rounded-full bg-pink-500/80 hover:bg-pink-500 transition-colors"
                >
                  <Play className="w-3 h-3 text-white" />
                </button>
                <button 
                  onClick={() => removeFromQueue(index)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )}
</div>












      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

         @keyframes slideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  .animate-slideIn {
    animation: slideIn 0.3s ease-out forwards;
  }
  
  /* Add hover animations for buttons */
  .search-container button {
    transition: all 0.2s ease;
  }
  
  .search-container button:hover {
    transform: translateY(-2px);
  }
  
  .search-container button:active {
    transform: translateY(0);
  }


@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.animate-fadeOut {
  animation: fadeOut 0.3s ease-out forwards;
}

      `}</style>
    </div>
  );
}

export default App;