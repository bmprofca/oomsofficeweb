import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Broadcast from './Broadcast';

// Import all the nested components
import TextMessageSend from './text-message/SendMessage';
import TextMessageStaticTemplates from './text-message/StaticTemplates';
import TextMessageDynamicTemplates from './text-message/DynamicTemplates';
import TextMessageConfiguration from './text-message/Configuration';
import TextMessageReports from './text-message/Reports';

import WhatsAppSend from './whatsapp/SendMessage';
import WhatsAppStaticTemplates from './whatsapp/StaticTemplates';
import WhatsAppDynamicTemplates from './whatsapp/DynamicTemplates';
import WhatsAppConfiguration from './whatsapp/Configuration';

import PushSend from './push/SendNotification';
import PushStaticTemplates from './push/StaticTemplates';
import PushDynamicTemplates from './push/DynamicTemplates';
import PushConfiguration from './push/Configuration';

import EmailSMTPConfigs from './email/SMTPConfigs';
import EmailTemplates from './email/Templates';
import EmailBroadcasts from './email/Broadcasts';
import EmailCreate from './email/CreateBroadcast';

import Reports from './reports/Reports';

const BroadcastRoutes = () => {
    return (
        <Routes>
            {/* Main Broadcast Route with type parameter */}
            <Route path=":type?" element={<Broadcast />}>
                {/* Nested routes for Text Message */}
                <Route path="text-message/send" element={<TextMessageSend />} />
                <Route path="text-message/static-templates" element={<TextMessageStaticTemplates />} />
                <Route path="text-message/dynamic-templates" element={<TextMessageDynamicTemplates />} />
                <Route path="text-message/configuration" element={<TextMessageConfiguration />} />
                
                {/* Nested routes for WhatsApp */}
                <Route path="whatsapp/send/:channel" element={<WhatsAppSend />} />
                <Route path="whatsapp/static-templates/:channel" element={<WhatsAppStaticTemplates />} />
                <Route path="whatsapp/dynamic-templates/:channel" element={<WhatsAppDynamicTemplates />} />
                <Route path="whatsapp/configuration/:channel" element={<WhatsAppConfiguration />} />
                
                {/* Nested routes for Push Notification */}
                <Route path="push/send" element={<PushSend />} />
                <Route path="push/static-templates" element={<PushStaticTemplates />} />
                <Route path="push/dynamic-templates" element={<PushDynamicTemplates />} />
                <Route path="push/configuration" element={<PushConfiguration />} />
                
                {/* Nested routes for Email */}
                <Route path="email/smtp-configs" element={<EmailSMTPConfigs />} />
                <Route path="email/templates" element={<EmailTemplates />} />
                <Route path="email/broadcasts" element={<EmailBroadcasts />} />
                <Route path="email/create" element={<EmailCreate />} />
                
                {/* Reports Route */}
                <Route path="reports/:type" element={<Reports />} />
            </Route>
        </Routes>
    );
};

export default BroadcastRoutes;