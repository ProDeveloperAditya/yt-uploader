'use client';
import { useState } from 'react';

// A simple loading spinner component
function Spinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

// A simple component for displaying messages
function Message({ text, type }) {
  if (!text) return null;
  // Updated styles for dark mode
  const config = {
    error: {
      style: 'bg-red-900/50 border-red-700 text-red-200',
      icon: '❌',
    },
    success: {
      style: 'bg-green-900/50 border-green-700 text-green-200',
      icon: '✅',
    },
    loading: {
      style: 'bg-blue-900/50 border-blue-700 text-blue-200',
      icon: '⏳',
    },
  };
  return (
    <div
      className={`border ${config[type].style} px-4 py-3 rounded-lg relative mt-4 flex items-center space-x-3`}
      role="alert"
    >
      <span className="text-xl">{config[type].icon}</span>
      <span className="block sm:inline">{text}</span>
    </div>
  );
}

export default function Home() {
  // State for all our data
  const [videoFile, setVideoFile] = useState(null);
  const [fileName, setFileName] = useState('No file selected');
  const [videoTopic, setVideoTopic] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');

  // State for UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setFileName(file.name);
      setMessage({ text: '', type: '' });
    } else {
      setVideoFile(null);
      setFileName('No file selected');
    }
  };

  // --- Step 1: Call Gemini API ---
  const handleGenerateDetails = async () => {
    if (!videoTopic) {
      setMessage({ text: 'Please enter a video topic first.', type: 'error' });
      return;
    }
    setIsGenerating(true);
    setMessage({ text: '🤖 Generating title and description...', type: 'loading' });

    try {
      const response = await fetch('/api/generate-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: videoTopic }),
      });

      if (!response.ok) {
        throw new Error('Failed to get details from AI.');
      }

      const data = await response.json();
      setGeneratedTitle(data.title);
      setGeneratedDescription(data.description);
      setMessage({ text: 'Details generated!', type: 'success' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
    setIsGenerating(false);
  };

  // --- Step 2 & 3: Get Token and Upload ---
  const handleUpload = async () => {
    if (!videoFile) {
      setMessage({ text: 'Please select a video file.', type: 'error' });
      return;
    }
    if (!generatedTitle) {
      setMessage({ text: 'Please generate details first.', type: 'error' });
      return;
    }

    setIsUploading(true);
    setMessage({ text: 'Starting upload...', type: 'loading' });

    try {
      // --- Step 2: Get the temporary Access Token ---
      setMessage({ text: '🔒 Getting upload token...', type: 'loading' });
      const tokenResponse = await fetch('/api/get-upload-token');
      if (!tokenResponse.ok) {
        throw new Error('Could not get upload token.');
      }
      const { accessToken } = await tokenResponse.json();

      if (!accessToken) {
        throw new Error('Received empty access token.');
      }

      // --- Step 3: Upload the video directly to YouTube ---
      setMessage({ text: '🚀 Uploading video to YouTube...', type: 'loading' });

      // 3a. Create the video metadata
      const videoMetadata = {
        snippet: {
          title: generatedTitle,
          description: generatedDescription,
          tags: generatedDescription
            .match(/#\w+/g)
            ?.map((tag) => tag.substring(1)), // Extract hashtags for tags
        },
        status: {
          privacyStatus: 'public', // <-- CHANGED FROM 'private'
          selfDeclaredMadeForKids: false,
        },
      };

      // 3b. Initiate the resumable upload
      const initResponse = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=resumable',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
          },
          body: JSON.stringify(videoMetadata),
        }
      );

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        console.error('YouTube Init Error:', errorData);
        throw new Error(`YouTube API Error: ${errorData.error.message}`);
      }

      // Get the resumable upload URL from the 'Location' header
      const resumableUploadUrl = initResponse.headers.get('Location');

      if (!resumableUploadUrl) {
        throw new Error('Could not get resumable upload URL.');
      }

      // 3c. Send the actual video file
      const uploadResponse = await fetch(resumableUploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': videoFile.size.toString(),
        },
        body: videoFile,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('YouTube Upload Error:', errorData);
        throw new Error(
          `Video file upload failed: ${errorData.error.message}`
        );
      }

      const uploadData = await uploadResponse.json();
      setMessage({
        text: `Success! Video uploaded with ID: ${uploadData.id}`,
        type: 'success',
      });

      // Reset form
      setVideoFile(null);
      setFileName('No file selected');
      setVideoTopic('');
      setGeneratedTitle('');
      setGeneratedDescription('');
      document.getElementById('file-input').value = null;
    } catch (error) {
      console.error(error);
      setMessage({
        text: `Upload failed: ${error.message}`,
        type: 'error',
      });
    }
    setIsUploading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 font-sans text-gray-200">
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-gray-800/60 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-lg">
        <h1 className="mb-6 bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-center text-4xl font-bold text-transparent">
          AI YouTube Uploader
        </h1>

        <div className="space-y-6">
          {/* Step 1: File and Topic */}
          <div className="rounded-xl bg-gray-900/50 p-6 shadow-md transition-all duration-300 hover:shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-cyan-300">
              Step 1: Select Video & Topic
            </h2>
            <label
              htmlFor="file-input"
              className="mb-2 block text-sm font-medium text-gray-300"
            >
              Video File
            </label>
            <label className="flex w-full cursor-pointer items-center rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm text-gray-300 shadow-sm transition-colors hover:bg-gray-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-5 w-5 text-cyan-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="truncate">{fileName}</span>
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <label
              htmlFor="topic"
              className="mt-4 mb-2 block text-sm font-medium text-gray-300"
            >
              Video Topic (for AI)
            </label>
            <input
              id="topic"
              type="text"
              value={videoTopic}
              onChange={(e) => setVideoTopic(e.target.value)} // <-- BUG FIX
              placeholder="e.g., 'funny cat video' or 'new tech gadget'"
              className="w-full rounded-lg border-gray-600 bg-gray-700 text-white shadow-sm transition-colors placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* Step 2: Generate Details */}
          <div className="rounded-xl bg-gray-900/50 p-6 shadow-md transition-all duration-300 hover:shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-cyan-300">
              Step 2: Generate Details with AI
            </h2>
            <button
              onClick={handleGenerateDetails}
              disabled={isGenerating || !videoTopic}
              className="flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4
               py-2.5 font-semibold text-white shadow-md shadow-cyan-500/20
               transition-all duration-300 hover:bg-cyan-700
               disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Spinner /> Generating...
                </>
              ) : (
                '✨ Generate Title & Description'
              )}
            </button>
            <label
              htmlFor="title"
              className="mt-4 mb-2 block text-sm font-medium text-gray-300"
            >
              Generated Title
            </label>
            <input
              id="title"
              type="text"
              value={generatedTitle}
              onChange={(e) => setGeneratedTitle(e.target.value)} // <-- BUG FIX
              placeholder="AI will generate a title here..."
              className="w-full rounded-lg border-gray-600 bg-gray-700 text-white shadow-sm transition-colors placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
            />
            <label
              htmlFor="description"
              className="mt-4 mb-2 block text-sm font-medium text-gray-300"
            >
              Generated Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={generatedDescription}
              onChange={(e) => setGeneratedDescription(e.target.value)} // <-- BUG FIX
              placeholder="AI will generate a description and hashtags here..."
              className="w-full rounded-lg border-gray-600 bg-gray-700 text-white shadow-sm transition-colors placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* Step 3: Upload */}
          <div className="mt-6">
            <button
              onClick={handleUpload}
              disabled={
                isUploading ||
                !videoFile ||
                !generatedTitle ||
                isGenerating
              }
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r
               from-pink-500 to-purple-600 px-5 py-3 text-lg font-bold
               text-white shadow-lg shadow-pink-500/30 transition-all
               duration-300 hover:from-pink-600 hover:to-purple-700
               hover:scale-105 disabled:cursor-not-allowed
               disabled:opacity-50 disabled:scale-100"
            >
              {isUploading ? (
                <>
                  <Spinner /> Uploading...
                </>
              ) : (
                '🚀 Upload to YouTube'
              )}
            </button>
          </div>

          {/* Message Area */}
          <Message text={message.text} type={message.type} />
        </div>
      </div>
    </main>
  );
}

