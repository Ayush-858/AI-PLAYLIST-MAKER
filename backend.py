from flask import Flask, jsonify, request, send_from_directory, after_this_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
import yt_dlp
import os
import random
import re
from youtubesearchpython import VideosSearch
from datetime import datetime


#remeber to add tar file ffmpeg in env variable

# Flask app initialization
app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize Limiter for rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["20 per minute"],
    app=app
)

# Directory to save downloaded content
SAVE_PATH = os.path.join(os.getcwd(), 'saved_content')

# Create the directory if it doesn't exist
if not os.path.exists(SAVE_PATH):
    os.makedirs(SAVE_PATH, exist_ok=True)

# Regex pattern for validating YouTube URLs
YOUTUBE_REGEX = re.compile(
    r'^(https?://)?(www\.)?(youtube\.com|youtu\.?be)/.+$'
)

def is_valid_youtube_url(url):
    return re.match(YOUTUBE_REGEX, url) is not None

@app.route('/download-audio', methods=['POST', 'OPTIONS'])
@limiter.limit("5 per minute")
def download_audio():
    """
    Endpoint to download audio from a YouTube URL with enhanced logging and verification.
    """
    if request.method == 'OPTIONS':
        return app.response_class(response=None, status=200)

    try:
        data = request.get_json()
        url = data.get('url')

        if not url:
            app.logger.error("No URL provided")
            return jsonify({"message": "No URL provided"}), 400

        if not is_valid_youtube_url(url):
            app.logger.error(f"Invalid YouTube URL provided: {url}")
            return jsonify({"message": "Invalid YouTube URL provided"}), 400

        app.logger.info(f"Starting download for URL: {url}")
        
        # Create a unique filename using timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_template = os.path.join(SAVE_PATH, f'%(title)s_{timestamp}.%(ext)s')

        # yt-dlp options with verbose logging
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': output_template,
            'quiet': False,  # Enable logging
            'verbose': True,  # More detailed logging
            'no_warnings': False,  # Show warnings
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'noplaylist': True,
            'progress_hooks': [lambda d: app.logger.info(f"Download progress: {d.get('status', 'unknown')}")],
        }

        app.logger.info("Starting YouTube-DL process")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info first to verify video is accessible
            app.logger.info("Extracting video info...")
            info = ydl.extract_info(url, download=False)
            video_title = info.get('title', 'unknown_title')
            app.logger.info(f"Video title: {video_title}")
            
            # Download the video
            app.logger.info("Starting actual download...")
            result = ydl.extract_info(url, download=True)
            app.logger.info("Download completed")

        # Prepare the MP3 filename
        mp3_file = ydl.prepare_filename(result)
        base, _ = os.path.splitext(mp3_file)
        mp3_file = f"{base}.mp3"

        # Verify file exists and check its size
        if not os.path.exists(mp3_file):
            app.logger.error(f"File not found after download: {mp3_file}")
            return jsonify({"message": "Audio conversion failed."}), 500

        file_size = os.path.getsize(mp3_file)
        app.logger.info(f"File saved successfully: {mp3_file}, Size: {file_size} bytes")

        # Verify file is a valid MP3
        try:
            with open(mp3_file, 'rb') as f:
                # Check for MP3 header (first 3 bytes should be ID3 or have MPEG frame sync)
                header = f.read(3)
                is_valid = header.startswith(b'ID3') or (header[0] == 0xFF and (header[1] & 0xE0) == 0xE0)
                if not is_valid:
                    app.logger.error(f"Invalid MP3 file generated: {mp3_file}")
                    return jsonify({"message": "Invalid MP3 file generated."}), 500
        except Exception as e:
            app.logger.error(f"Error verifying MP3 file: {str(e)}")
            return jsonify({"message": "Error verifying MP3 file."}), 500

        return jsonify({
            "message": "Audio converted and saved",
            "file": os.path.basename(mp3_file),
            "size": file_size,
            "title": video_title
        })

    except Exception as e:
        app.logger.error(f"Error in download_audio: {str(e)}")
        return jsonify({"message": "Failed to process request", "error": str(e)}), 500

@app.route('/run-python', methods=['POST', 'OPTIONS'])
@limiter.limit("10 per minute")
def search_youtube():
    """
    Endpoint to search YouTube videos based on query.
    """
    if request.method == 'OPTIONS':
        response = app.response_class(
            response=None,
            status=200
        )
        return response

    try:
        data = request.get_json()
        query = data.get('query_user', '')
        
        if not query:
            return jsonify({"message": "No search query provided"}), 400

        videos_search = VideosSearch(query, limit=1)
        results = videos_search.result()['result']
        
        formatted_results = [
            [
                video['title'],
                video['link'],
                video.get('thumbnails', [{}])[0].get('url', '/images/side.gif')
            ]
            for video in results
        ]
        
        return jsonify({"output": formatted_results})

    except Exception as e:
        return jsonify({"message": "Failed to process request", "error": str(e)}), 500
     

@app.route('/files/<path:filename>')
def serve_file(filename):
    """
    Serve the requested file and delete it after sending.
    """
    @after_this_request
    def remove_file(response):
        try:
            file_path = os.path.join(SAVE_PATH, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            app.logger.error(f"Error removing file: {e}")
        return response

    # Add proper MIME type for MP3 files
    response = send_from_directory(SAVE_PATH, filename)
    if filename.lower().endswith('.mp3'):
        response.headers['Content-Type'] = 'audio/mpeg'
    response.headers['Accept-Ranges'] = 'bytes'
    return response

@app.after_request
def add_cors_headers(response):
    """
    Add CORS headers to all responses.
    """
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,Range"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS,HEAD"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range,Content-Length"
    return response

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 4000))
    app.run(debug=True, host='0.0.0.0', port=port)
