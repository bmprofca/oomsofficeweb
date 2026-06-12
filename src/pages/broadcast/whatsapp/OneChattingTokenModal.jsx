import React, { useEffect, useState } from 'react';
import { FiX, FiKey, FiLoader } from 'react-icons/fi';

const OneChattingTokenModal = ({ isOpen, onClose, row, onSubmit, saving }) => {
  const [developerToken, setDeveloperToken] = useState('');

  useEffect(() => {
    if (isOpen && row) {
      setDeveloperToken(row.developer_token || '');
    }
  }, [isOpen, row]);

  if (!isOpen || !row) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      map_id: row.map_id,
      enabled: true,
      developer_token: developerToken.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiKey className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-800">Enable OneChatting</h3>
              <p className="text-xs text-gray-500">{row.profile?.name || row.username}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="developer_token" className="block text-sm font-medium text-gray-700 mb-1">
              Developer Token <span className="text-red-500">*</span>
            </label>
            <input
              id="developer_token"
              type="text"
              value={developerToken}
              onChange={(e) => setDeveloperToken(e.target.value)}
              placeholder="Enter OneChatting developer token"
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm disabled:opacity-60"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Required to enable OneChatting for this user on the current branch.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !developerToken.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {saving && <FiLoader className="w-4 h-4 animate-spin" />}
              Save & Enable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OneChattingTokenModal;
