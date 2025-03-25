import React, { useState } from 'react';
import { MessageSquare, Music, Import, Save, Sparkles } from 'lucide-react';

interface Message {
  type: 'ai' | 'user';
  content: string;
}

interface Playlist {
  id: string;
  name: string;
  songs: string[];
  timestamp: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { type: 'ai', content: 'Hi! I can help you create the perfect playlist. What kind of music are you in the mood for?' }
  ]);
  const [input, setInput] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: '1',
      name: 'Chill Evening Vibes',
      songs: ['Midnight City - M83', 'Starboy - The Weeknd', 'Dreams - Fleetwood Mac'],
      timestamp: '2024-03-15'
    }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { type: 'user', content: input }]);
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        type: 'ai', 
        content: 'Based on your request, here\'s a curated playlist...' 
      }]);
    }, 1000);
    setInput('');
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
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 pt-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the playlist you want..."
              className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200">
              <Import className="w-5 h-5" />
              Import to Spotify
            </button>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200">
              <Save className="w-5 h-5" />
              Save Playlist
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Saved Playlists */}
      <div className="w-96 bg-gray-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Music className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Saved Playlists</h2>
        </div>

        <div className="space-y-4">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors duration-200 cursor-pointer"
            >
              <h3 className="font-semibold text-lg mb-2">{playlist.name}</h3>
              <p className="text-sm text-gray-400">{playlist.songs.length} songs</p>
              <p className="text-xs text-gray-500 mt-2">Created: {playlist.timestamp}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;