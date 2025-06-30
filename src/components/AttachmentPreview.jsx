import React from 'react';
import { motion } from 'framer-motion';
import { FiX, FiFile, FiImage, FiFileText, FiEye } from 'react-icons/fi';

const AttachmentPreview = ({ attachments, onRemove, theme }) => {
  const getFileIcon = (type) => {
    if (type && type.startsWith('image/')) return <FiImage className="w-4 h-4" />;
    if (type === 'application/pdf') return <FiFileText className="w-4 h-4" />;
    return <FiFile className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const truncateFileName = (name, maxLength = 20) => {
    if (!name) return 'Unknown file';
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
    if (nameWithoutExt.length === 0) return name;
    const truncated = nameWithoutExt.substring(0, maxLength - ext.length - 4) + '...';
    return `${truncated}.${ext}`;
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg border max-w-sm ${
              theme === 'light'
                ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
            } transition-colors`}
          >
            {/* File Preview */}
            {file.type && file.type.startsWith('image/') ? (
              <div className="flex-shrink-0 relative group">
                <img
                  src={file.previewUrl || file.url}
                  alt={file.name || 'Preview'}
                  className="w-12 h-12 object-cover rounded border cursor-pointer"
                  onClick={() => window.open(file.previewUrl || file.url, '_blank')}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded border items-center justify-center hidden">
                  <FiImage className="w-5 h-5 text-gray-500" />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200 flex items-center justify-center">
                  <FiEye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ) : (
              <div className={`flex-shrink-0 p-3 rounded ${
                theme === 'light' ? 'bg-gray-200' : 'bg-gray-600'
              }`}>
                {getFileIcon(file.type)}
              </div>
            )}
            
            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium truncate ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`} title={file.name || 'Unknown file'}>
                {truncateFileName(file.name)}
              </div>
              <div className={`text-xs ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {formatFileSize(file.size)}
                {file.type && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                    {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {file.type && file.type.startsWith('image/') && (
                <motion.button
                  onClick={() => window.open(file.previewUrl || file.url, '_blank')}
                  className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                    theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'
                  } transition-colors`}
                  title="Preview image"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FiEye className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                onClick={() => onRemove(index)}
                className={`p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 ${
                  theme === 'light' ? 'text-gray-500 hover:text-red-600' : 'text-gray-400 hover:text-red-400'
                } transition-colors`}
                title="Remove file"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiX className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AttachmentPreview;