import React from 'react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { motion } from 'framer-motion';
import { FiMic, FiSquare } from 'react-icons/fi';

const VoiceInput = ({ onTranscript, onTranscriptionError, disabled, theme }) => {
  const handleStop = async (blobUrl, blob) => {
    const file = new File([blob], 'voice-input.wav', {
      type: 'audio/wav',
      lastModified: Date.now()
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8001/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription API returned an error');
      }

      const data = await response.json();
      if (data.transcription) {
        onTranscript(data.transcription);
      } else {
        onTranscriptionError('No speech was detected.');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      onTranscriptionError('Sorry, I could not understand the audio.');
    }
  };

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl
  } = useReactMediaRecorder({
    audio: true,
    onStop: handleStop,
  });

  const isRecording = status === 'recording';

  return (
    <motion.button
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : theme === 'light'
          ? 'text-gray-600 hover:bg-gray-100'
          : 'text-gray-400 hover:bg-gray-700'
      }`}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      title={isRecording ? "Stop recording" : "Start recording"}
    >
      {isRecording ? <FiSquare className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
    </motion.button>
  );
};

export default VoiceInput;