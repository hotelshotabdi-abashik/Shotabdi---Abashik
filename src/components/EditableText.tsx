import React, { useState, useEffect } from 'react';
import { useContent } from '../context/ContentContext';
import { useLanguage } from '../context/LanguageContext';
import { Edit2, Check, X } from 'lucide-react';
import Editor from 'react-simple-wysiwyg';

interface EditableTextProps {
  contentKey: string;
  defaultText: string;
  className?: string;
  multiline?: boolean;
  onSave?: (values: { en: string; bn: string }) => void;
}

export const EditableText: React.FC<EditableTextProps> = ({ contentKey, defaultText, className = '', multiline = false, onSave }) => {
  const { content, editMode, updateContent } = useContent();
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState({ en: '', bn: '' });

  const currentContent = content[contentKey];
  
  // Parse content if it's a JSON string, otherwise handle as plain string (legacy)
  const getInitialValues = () => {
    if (!currentContent) return { en: defaultText, bn: '' };
    try {
      const parsed = typeof currentContent === 'string' ? JSON.parse(currentContent) : currentContent;
      if (parsed && typeof parsed === 'object' && (parsed.en || parsed.bn)) {
        return { en: parsed.en || defaultText, bn: parsed.bn || '' };
      }
    } catch (e) {
      // Not JSON, treat as English
    }
    return { en: currentContent || defaultText, bn: '' };
  };

  const initialValues = getInitialValues();
  const displayText = language === 'bn' ? (initialValues.bn || initialValues.en) : initialValues.en;

  useEffect(() => {
    setValues(initialValues);
  }, [currentContent, defaultText]);

  const handleSave = async () => {
    await updateContent(contentKey, values);
    if (onSave) {
      onSave(values);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValues(initialValues);
    setIsEditing(false);
  };

  if (editMode) {
    if (isEditing) {
      return (
        <span className={`relative inline-block w-full ${className}`}>
          <div className="space-y-4 p-4 bg-white rounded-xl border-2 border-red-500 shadow-2xl min-w-[300px]">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">English</label>
              {multiline ? (
                <div className="bg-slate-50 text-black p-1 rounded-md border border-slate-200">
                  <Editor
                    value={values.en}
                    onChange={(e) => setValues(prev => ({ ...prev, en: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={values.en}
                  onChange={(e) => setValues(prev => ({ ...prev, en: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="English text"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bangla (Optional)</label>
              {multiline ? (
                <div className="bg-slate-50 text-black p-1 rounded-md border border-slate-200">
                  <Editor
                    value={values.bn}
                    onChange={(e) => setValues(prev => ({ ...prev, bn: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={values.bn}
                  onChange={(e) => setValues(prev => ({ ...prev, bn: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Bangla translation (leave empty for fallback)"
                />
              )}
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button onClick={handleCancel} className="px-3 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-1 text-sm font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors shadow-md">
                Save Changes
              </button>
            </div>
          </div>
        </span>
      );
    }

    return (
      <span className={`relative group inline-block ${className}`}>
        <span 
          className="cursor-pointer hover:opacity-80" 
          onClick={() => setIsEditing(true)}
          dangerouslySetInnerHTML={{ __html: displayText }}
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

  return <span className={className} dangerouslySetInnerHTML={{ __html: displayText }} />;
};
