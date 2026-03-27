import React, { useState, useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { Edit2, Check, X } from 'lucide-react';
import Editor from 'react-simple-wysiwyg';

interface EditableTextProps {
  contentKey: string;
  defaultText: string;
  className?: string;
  multiline?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({ contentKey, defaultText, className = '', multiline = false }) => {
  const { content, editMode, updateContent } = useContent();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');

  const currentText = content[contentKey] || defaultText;

  useEffect(() => {
    setValue(currentText);
  }, [currentText]);

  const handleSave = async () => {
    await updateContent(contentKey, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(currentText);
    setIsEditing(false);
  };

  if (editMode) {
    if (isEditing) {
      return (
        <span className={`relative inline-block w-full ${className}`}>
          {multiline ? (
            <div className="bg-white text-black p-1 rounded-md border-2 border-red-500">
              <Editor
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-2 border-2 border-red-500 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          )}
          <span className="absolute -top-10 right-0 flex space-x-1 bg-white shadow-md rounded-md p-1 z-10">
            <button onClick={handleSave} className="p-1 text-green-600 hover:bg-green-50 rounded">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={handleCancel} className="p-1 text-red-600 hover:bg-red-50 rounded">
              <X className="w-4 h-4" />
            </button>
          </span>
        </span>
      );
    }

    return (
      <span className={`relative group inline-block ${className}`}>
        <span 
          className="cursor-pointer hover:opacity-80" 
          onClick={() => setIsEditing(true)}
          dangerouslySetInnerHTML={{ __html: currentText }}
        />
        <button
          onClick={() => setIsEditing(true)}
          className="absolute -top-3 -right-3 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: currentText }} />;
};