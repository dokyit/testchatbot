// src/components/VoiceInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMic, FiMicOff, FiSquare } from 'react-icons/fi';

const VoiceInput = ({ onTranscript, disabled, theme }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  if (!isSupported) return null;

  return (
    <motion.button
      onClick={toggleRecording}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : isRecording
          ? 'bg-red-500 text-white'
          : theme === 'light'
          ? 'text-gray-600 hover:bg-gray-100'
          : 'text-gray-400 hover:bg-gray-700'
      }`}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      {isRecording ? <FiSquare className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
    </motion.button>
  );
};

export default VoiceInput;