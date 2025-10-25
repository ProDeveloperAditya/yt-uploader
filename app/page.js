'use client';
import { useState } from 'react';

// --- Icon Components ---
// Using inline SVGs for a clean, professional look without external libraries.
// Spinner Icon
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

// Upload/File Icon
function UploadIcon() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-gray-500"
      stroke="currentColor"
      fill="none"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Calendar Icon for the scheduler
function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// --- Message Component ---
// Displays success, error, or loading messages
function Message({ text, type }) {
  if (!text) return null;
  const config = {
    error: 'bg-red-900/50 border-red-700 text-red-200',
    success: 'bg-green-900/50 border-green-700 text-green-200',
    loading: 'bg-blue-900/50 border-blue-700 text-blue-200',
  };
  const icon = {
    error: '❌',
    success: '✅',
    loading: '⏳',
  };
  return (
    <div
      className={`border ${config[type]} mt-6 flex items-center space-x-3 rounded-lg px-4 py-3`}
      role="alert"
    >
      <span className="text-xl">{icon[type]}</span>
      <span className="block sm:inline">{text}</span>
    </div>
  );
}

// --- Main Page Component ---
export default function Home() {
  // State for data
  const [videoFile, setVideoFile] = useState(null);
  const [fileName, setFileName] = useState('No file selected');
  const [videoTopic, setVideoTopic] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  
  // State for scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');

  // State for UI
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isDragging, setIsDragging] = useState(false);

  // --- Event Handlers ---

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setFileName(file.name);
      setMessage({ text: '', type: '' });
    }
  };

  const handleDragDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (type === 'dragover') setIsDragging(true);
    if (type === 'drop') {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        setVideoFile(file);
        setFileName(file.name);
        setMessage({ text: '', type: '' });
      } else {
        setMessage({ text: 'Please drop a valid video file.', type: 'error' });
      }
    }
  };

  // Step 1: Call Gemini API
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
      if (!response.ok) throw new Error('Failed to get details from AI.');

      const data = await response.json();
      setGeneratedTitle(data.title);
      setGeneratedDescription(data.description);
      setMessage({ text: 'Details generated!', type: 'success' });
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    }
    setIsGenerating(false);
  };

  // Step 2 & 3: Get Token and Upload
  const handleUpload = async () => {
    if (!videoFile) {
      setMessage({ text: 'Please select a video file.', type: 'error' });
      return;
    }
    if (!generatedTitle) {
      setMessage({ text: 'Please generate details first.', type: 'error' });
      return;
    }
    if (isScheduled && !scheduleTime) {
      setMessage({ text: 'Please select a date and time to schedule.', type: 'error' });
      return;
    }

    setIsUploading(true);
    setMessage({ text: 'Starting upload...', type: 'loading' });

    try {
      // Step 2: Get Access Token
      setMessage({ text: '🔒 Getting upload token...', type: 'loading' });
      const tokenResponse = await fetch('/api/get-upload-token');
      if (!tokenResponse.ok) throw new Error('Could not get upload token.');
      
      const { accessToken } = await tokenResponse.json();
      if (!accessToken) throw new Error('Received empty access token.');

      // Step 3: Upload to YouTube
      setMessage({ text: '🚀 Uploading video to YouTube...', type: 'loading' });

      // Set privacy status based on scheduling
      const status = { selfDeclaredMadeForKids: false };
      if (isScheduled && scheduleTime) {
        status.privacyStatus = 'private'; // Must be private to schedule
        status.publishAt = new Date(scheduleTime).toISOString();
      } else {
        status.privacyStatus = 'public'; // Upload immediately
      }

      const videoMetadata = {
        snippet: {
          title: generatedTitle,
          description: generatedDescription,
          tags: generatedDescription.match(/#\w+/g)?.map((tag) => tag.substring(1)),
        },
        status: status,
      };

      // 3a. Initiate resumable upload
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
        throw new Error(`YouTube API Error: ${errorData.error.message}`);
      }

      // 3b. Get resumable upload URL
      const resumableUploadUrl = initResponse.headers.get('Location');
      if (!resumableUploadUrl) throw new Error('Could not get resumable upload URL.');

      // 3c. Send video file
      const uploadResponse = await fetch(resumableUploadUrl, {
        method: 'PUT',
        headers: { 'Content-Length': videoFile.size.toString() },
        body: videoFile,
      });
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(`Video file upload failed: ${errorData.error.message}`);
      }
      
      const uploadData = await uploadResponse.json();
      
      const successMessage = isScheduled
        ? `Success! Video scheduled for ${new Date(scheduleTime).toLocaleString()}`
        : `Success! Video uploaded with ID: ${uploadData.id}`;
      setMessage({ text: successMessage, type: 'success' });

      // Reset form
      setVideoFile(null);
      setFileName('No file selected');
      setVideoTopic('');
      setGeneratedTitle('');
      setGeneratedDescription('');
      setScheduleTime('');
      setIsScheduled(false);
      if(document.getElementById('file-input')) {
        document.getElementById('file-input').value = null;
      }
      
    } catch (error) {
      console.error(error);
      setMessage({ text: `Upload failed: ${error.message}`, type: 'error' });
    }
    setIsUploading(false);
  };

  // Gets min date-time for scheduler (10 mins in the future)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 10);
    return now.toISOString().slice(0, 16);
  };
  
  // Helper for conditional class names
  const cn = (...classes) => classes.filter(Boolean).join(' ');

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gray-900 p-4 font-sans text-gray-200">
      <div className="w-full max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-5xl font-bold text-transparent">
            AI YouTube Uploader
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Your automated Shorts publishing assistant.
          </p>
        </header>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
          
          {/* --- Step 1: Upload & Topic --- */}
          <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-6 shadow-xl backdrop-blur-lg">
            <h2 className="mb-5 flex items-center text-2xl font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-gray-900">1</span>
              <span className="ml-3">Upload Video & Set Topic</span>
            </h2>
            
            {/* New Drag & Drop Zone */}
            <label
              htmlFor="file-input"
              className={cn(
                'group relative mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-600 px-6 py-10 transition-colors hover:border-cyan-500',
                isDragging && 'border-cyan-500 bg-gray-700/50'
              )}
              onDragOver={(e) => handleDragDrop(e, 'dragover')}
              onDragLeave={(e) => handleDragDrop(e, 'dragleave')}
              onDrop={(e) => handleDragDrop(e, 'drop')}
            >
              <div className="text-center">
                <UploadIcon />
                <p className="mt-5 text-sm text-gray-400">
                  <span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">MP4, MOV, WEBM, etc.</p>
              </div>
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileName !== 'No file selected' && (
              <p className="mt-3 text-center text-sm font-medium text-green-400">
                Selected: {fileName}
              </p>
            )}

            {/* Video Topic Input */}
            <div className="mt-6">
              <label
                htmlFor="topic"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Video Topic (for AI)
              </label>
              <input
                id="topic"
                type="text"
                value={videoTopic}
                onChange={(e) => setVideoTopic(e.target.value)}
                placeholder="e.g., 'funny cat video' or 'new tech gadget'"
                className="w-full rounded-lg border-gray-600 bg-gray-700 text-white shadow-sm transition-colors placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* --- Step 2: Generate Details --- */}
          <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-6 shadow-xl backdrop-blur-lg">
            <h2 className="mb-5 flex items-center text-2xl font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-gray-900">2</span>
              <span className="ml-3">Generate Details</span>
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
            <div className="mt-6 space-y-4">
              <input
                type="text"
                value={generatedTitle}
                onChange={(e) => setGeneratedTitle(e.target.value)}
                placeholder="AI will generate a title here..."
                className="w-full rounded-lg border-gray-600 bg-gray-700 text-white shadow-sm transition-colors placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <textarea
                rows={4}
                value={generatedDescription}
                onChange={(e) => setGeneratedDescription(e.t.value)}
                placeholder="AI will generate a description and hashtags here..."
                className="w-full rounded-lg border-gray-600 bg-gray-700 text-white shadow-sm transition-colors placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* --- Step 3: Schedule & Upload --- */}
          <div className="rounded-2xl border border-gray-700 bg-gray-800/60 p-6 shadow-xl backdrop-blur-lg">
            <h2 className="mb-5 flex items-center text-2xl font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-gray-900">3</span>
              <span className="ml-3">Schedule & Upload</span>
            </h2>
            
            {/* Toggle Switch */}
            <div className="flex items-center justify-between rounded-lg bg-gray-700/50 p-4">
              <label htmlFor="schedule-toggle" className="font-medium text-gray-300">
                {isScheduled ? 'Schedule for later' : 'Upload immediately'}
              </label>
              <button
                role="switch"
                aria-checked={isScheduled}
                id="schedule-toggle"
                onClick={() => setIsScheduled(!isScheduled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isScheduled ? 'bg-cyan-500' : 'bg-gray-600'
                } focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isScheduled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Improved "Watch" / Date-Time Picker */}
            {isScheduled && (
              <div className="mt-4">
                <label
                  htmlFor="schedule-time"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Publish Date and Time
                </label>
                {/* This is the styled wrapper */}
                <div className="relative flex items-center rounded-lg border border-gray-600 bg-gray-700 shadow-sm transition-colors focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
                  <span className="pl-3">
                    <CalendarIcon />
                  </span>
                  {/* The actual input is transparent and sits on top */}
                  <input
                    type="datetime-local"
                    id="schedule-time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    min={getMinDateTime()}
                    className="w-full border-none bg-transparent p-2.5 text-white placeholder-gray-500 [color-scheme:dark] focus:outline-none focus:ring-0"
                  />
                </div>
              </div>
            )}
            
            {/* Final Upload Button */}
            <div className="mt-8">
              <button
                onClick={handleUpload}
                disabled={
                  isUploading || !videoFile || !generatedTitle || isGenerating ||
                  (isScheduled && !scheduleTime)
                }
                className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r
                 from-pink-500 to-purple-600 px-5 py-3 text-lg font-bold
                 text-white shadow-lg shadow-pink-500/30 transition-all
                 duration-300 hover:from-pink-600 hover:to-purple-700
                 hover:scale-[1.02] disabled:cursor-not-allowed
                 disabled:opacity-50 disabled:scale-100"
              >
                {isUploading ? (
                  <>
                    <Spinner /> 
                    {isScheduled ? 'Scheduling...' : 'Uploading...'}
                  </>
                ) : (
                  isScheduled ? '🚀 Schedule Upload' : '🚀 Upload Now'
                )}
              </button>
            </div>
          </div>
          
          {/* Message Area */}
          <Message text={message.text} type={message.type} />
        </form>
      </div>
    </main>
  );
}

