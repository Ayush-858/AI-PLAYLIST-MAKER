import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Music, Import, Save, Sparkles, X, Share2, Download, ArrowRight } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Play } from "lucide-react";
import Player from "./components/Player";

//connection of backend for playing song pending

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
  }, [playlists]);

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
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Left Side - Chat Interface */}
      <div className="flex-1 flex flex-col p-6 border-r border-gray-700">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            AI Playlist Maker
          </h1>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.type === "user" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-100"
                }`}
              >
                <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-lg bg-gray-800 text-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 pt-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isPlaylistRequestMode ? "Describe the playlist you want..." : "Ask about music or request a playlist..."}
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`${
                isLoading ? "bg-gray-600" : "bg-purple-600 hover:bg-purple-700"
              } text-white px-4 py-2 rounded-lg transition-colors duration-200`}
              disabled={isLoading}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {isPlaylistRequestMode && (
              <button 
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                onClick={handleCreatePlaylistFromConversation}
                disabled={isLoading}
              >
                <ArrowRight className="w-5 h-5" />
                Create Playlist Now
              </button>
            )}
            <button 
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              disabled={isLoading}
            >
              <Import className="w-5 h-5" />
              Import to Spotify
            </button>
            <button 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              onClick={handleSavePlaylist}
              disabled={isLoading}
            >
              <Save className="w-5 h-5" />
              Save Playlist
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Saved Playlists or Playlist Dashboard */}
      <div className="w-96 bg-gray-800 p-6">
        {!selectedPlaylist ? (
          // Playlists List View
          <>
            <div className="flex items-center gap-2 mb-6">
              <Music className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold">Saved Playlists</h2>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
                  onClick={() => handlePlaylistClick(playlist)}
                >
                  <h3 className="font-semibold text-lg mb-2">{playlist.name}</h3>
                  <p className="text-sm text-gray-400">{playlist.songs.length} songs</p>
                  <p className="text-xs text-gray-500 mt-2">Created: {playlist.timestamp}</p>
                </div>
              ))}
              
              {playlists.length === 0 && (
                <div className="text-gray-500 text-center p-4">
                  No playlists yet. Start a conversation to create one!
                </div>
              )}
            </div>
          </>
        ) : (
          // Playlist Dashboard View
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Music className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-semibold">Playlist Dashboard</h2>
              </div>
              <button 
                onClick={closePlaylistDashboard}
                className="p-1 rounded-full hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-gray-800 rounded-2xl p-6 mb-6 shadow-lg">
              <h3 className="font-bold text-2xl mb-2 text-purple-300">{selectedPlaylist.name}</h3>
              <p className="text-sm text-gray-400 mb-4">Created: {selectedPlaylist.timestamp}</p>
              
              <div className="bg-gray-900 rounded-xl p-4 mb-6">
                <h4 className="text-base font-semibold text-gray-300 mb-3">🎵 Song List</h4>
                <div className="max-h-64 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {selectedPlaylist.songs.map((song, index) => (
                    <div key={index} className="bg-gray-800 p-3 rounded-xl shadow-sm hover:bg-gray-700 transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-white">{song.title}</p>
                          <p className="text-sm text-gray-400">{song.artist}</p>
                          <p className="text-xs text-gray-500">#{index + 1}</p>
                        </div>
                        
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full shadow text-sm transition-all">
                          <Play className="w-4 h-4" />
                          Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
                  onClick={handleExportPlaylist}
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button 
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
                  onClick={handleSharePlaylist}
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </>
        )}

        {/* AI Generated Summary (always visible) */}
        {aiSummary && (
          <div className="mt-6 p-4 bg-gray-700 rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
            <h3 className="font-semibold text-lg mb-2">AI Summary</h3>
            <p className="text-sm text-gray-300">{aiSummary}</p>
          </div>
        )}
      </div>


      <Player/>
    </div>
  );
}

export default App;