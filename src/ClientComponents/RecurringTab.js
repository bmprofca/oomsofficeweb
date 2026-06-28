import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClipboard, FiLayers } from 'react-icons/fi';
import { ComplianceTaskBoard } from '../pages/office-assistance/compliance';
import { ComplianceFirmAssignmentBoard } from '../pages/office-assistance/ComplianceFirmAssignmentBoard';

const SUB_TABS = [
  { id: 'compliance', label: 'Compliance', icon: FiClipboard },
  { id: 'firm-assigning', label: 'Firm Assigning', icon: FiLayers },
];

const RecurringTab = ({ clientUsername = '', firmId = '' }) => {
  const username = String(clientUsername || '').trim();
  const [activeTab, setActiveTab] = useState('compliance');

  if (!username) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center"
      >
        <p className="text-sm text-gray-500 m-0">Client username is required to load compliance data.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full space-y-4"
    >
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200 w-full sm:w-fit">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'compliance' ? (
          <motion.div
            key="compliance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <ComplianceTaskBoard
              username={username}
              firmId={firmId}
              embedded
            />
          </motion.div>
        ) : (
          <motion.div
            key="firm-assigning"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <ComplianceFirmAssignmentBoard
              username={username}
              embedded
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RecurringTab;
