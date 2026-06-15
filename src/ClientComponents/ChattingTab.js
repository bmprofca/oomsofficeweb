import React from 'react';
import { FiPhone } from 'react-icons/fi';
import OneChattingLiveChat from '../pages/broadcast/whatsapp/OneChattingLiveChat';
import { buildWhatsAppNumber } from '../pages/broadcast/whatsapp/oneChattingSendUtils';

const ChattingTab = ({ clientData, loading = false }) => {
  const clientNumber = buildWhatsAppNumber(
    clientData?.country_code,
    clientData?.mobile,
  );

  if (loading) {
    return (
      <div className="h-[600px] rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden animate-pulse">
        <div className="h-14 bg-gray-200" />
        <div className="p-4 space-y-4">
          <div className="h-12 bg-gray-100 rounded-2xl w-[55%]" />
          <div className="h-12 bg-gray-100 rounded-2xl w-[45%] ml-auto" />
          <div className="h-12 bg-gray-100 rounded-2xl w-[50%]" />
        </div>
      </div>
    );
  }

  if (!clientNumber) {
    return (
      <div className="h-[600px] rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <FiPhone className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 m-0">
          No mobile number on file
        </h3>
        <p className="text-sm text-gray-500 mt-2 max-w-sm m-0">
          Add the client&apos;s mobile number in Basic Details to start WhatsApp
          chat from this profile.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <OneChattingLiveChat
        embedded
        clientNumber={clientNumber}
        clientName={clientData?.name || ''}
      />
    </div>
  );
};

export default ChattingTab;
