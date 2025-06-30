// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiPaperclip, FiX, FiFile, FiImage } from 'react-icons/fi';
import { supabase } from '../lib/supabase';

const FileUpload = ({ onFileSelect, disabled, theme }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const acceptedTypes = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md', '.csv'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  };

  const handleFiles = async (files) => {
    if (!files.length || uploading) return;
    
    setUploading(true);
    const uploadedFiles = [];

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chat-files/${fileName}`;

        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (error) throw error;

        uploadedFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          path: data.path,
          url: supabase.storage.from('chat-attachments').getPublicUrl(data.path).data.publicUrl
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    if (uploadedFiles.length > 0) {
      onFileSelect(uploadedFiles);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className={`p-2 rounded-lg transition-colors ${
          disabled || uploading
            ? 'text-gray-400 cursor-not-allowed'
            : theme === 'light'
            ? 'text-gray-600 hover:bg-gray-100'
            : 'text-gray-400 hover:bg-gray-700'
        }`}
        whileHover={!disabled && !uploading ? { scale: 1.05 } : {}}
        whileTap={!disabled && !uploading ? { scale: 0.95 } : {}}
      >
        <FiPaperclip className="w-5 h-5" />
      </motion.button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.keys(acceptedTypes).join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {uploading && (
        <div className="absolute -top-8 left-0 text-xs text-blue-500">
          Uploading...
        </div>
      )}
    </div>
  );
};

export default FileUpload;