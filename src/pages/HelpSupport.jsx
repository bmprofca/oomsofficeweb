import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronDown,
  FiClock,
  FiCopy,
  FiExternalLink,
  FiHelpCircle,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiRefreshCw,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Header, Sidebar } from '../components/header';
import getHeaders from '../utils/get-headers';
import API_BASE_URL from '../utils/api-controller';

const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

const ContactCard = ({ icon: Icon, label, value, href, copyable }) => {
  if (!value) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3.5 py-3 shadow-sm">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        {href ? (
          <a
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noreferrer' : undefined}
            className="mt-0.5 block truncate text-sm font-semibold text-indigo-700 no-underline hover:text-indigo-800"
          >
            {value}
          </a>
        ) : (
          <p className="mt-0.5 break-words text-sm font-semibold text-gray-800">
            {value}
          </p>
        )}
      </div>
      {copyable ? (
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-indigo-600"
          title={`Copy ${label}`}
        >
          <FiCopy className="h-4 w-4" />
        </button>
      ) : null}
      {href?.startsWith('http') ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-md p-1.5 text-gray-400 no-underline transition hover:bg-gray-100 hover:text-indigo-600"
          title="Open"
        >
          <FiExternalLink className="h-4 w-4" />
        </a>
      ) : null}
    </div>
  );
};

const FaqItem = ({ faq, open, onToggle }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-gray-50"
      aria-expanded={open}
    >
      <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">
        {faq.question}
      </span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="shrink-0 text-gray-400"
      >
        <FiChevronDown className="h-4 w-4" />
      </motion.span>
    </button>
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="border-t border-gray-100 px-3.5 py-3 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
            {faq.answer}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  </div>
);

const HelpSupport = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('sidebarMinimized');
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [openFaqId, setOpenFaqId] = useState(null);

  useEffect(() => {
    localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
  }, [isMinimized]);

  const fetchHelp = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      if (!headers) {
        throw new Error('Authentication required');
      }
      const res = await fetch(`${API_BASE_URL}/help-support`, { headers });
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to load help details');
      }
      setData(result.data || null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to load help & support');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHelp();
  }, [fetchHelp]);

  const whatsappHref = data?.support_whatsapp
    ? `https://wa.me/${String(data.support_whatsapp).replace(/\D/g, '')}`
    : null;
  const phoneHref = data?.support_phone
    ? `tel:${String(data.support_phone).replace(/\s/g, '')}`
    : null;
  const emailHref = data?.support_email ? `mailto:${data.support_email}` : null;
  const faqs = Array.isArray(data?.faqs) ? data.faqs : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      <div
        className={`min-h-screen pt-16 transition-all duration-300 ease-in-out ${
          isMinimized ? 'md:pl-20' : 'md:pl-[260px]'
        }`}
      >
        <div className="mx-2 my-3 space-y-3 sm:mx-4 md:mx-8 md:my-4">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                    <FiHelpCircle className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold leading-tight text-gray-800 md:text-lg">
                      {loading
                        ? 'Help & Support'
                        : data?.page_title || 'Help & Support'}
                    </h1>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchHelp}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <FiRefreshCw
                    className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="p-3 md:p-4">
              {loading ? (
                <div className="space-y-3">
                  <SkeletonPulse className="h-4 w-3/4 max-w-xl" />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonPulse key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {data?.intro_text ? (
                    <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
                      {data.intro_text}
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed text-gray-600">
                      Reach our team using the contact options below.
                    </p>
                  )}

                  {!data?.configured ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Support contact details are not configured yet. Please try
                      again later.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <ContactCard
                        icon={FiMail}
                        label="Email"
                        value={data.support_email}
                        href={emailHref}
                        copyable
                      />
                      <ContactCard
                        icon={FiPhone}
                        label="Phone"
                        value={data.support_phone}
                        href={phoneHref}
                        copyable
                      />
                      <ContactCard
                        icon={FiMessageCircle}
                        label="WhatsApp"
                        value={data.support_whatsapp}
                        href={whatsappHref}
                        copyable
                      />
                      <ContactCard
                        icon={FiClock}
                        label="Support hours"
                        value={data.support_hours}
                      />
                      <ContactCard
                        icon={FiMapPin}
                        label="Address"
                        value={data.support_address}
                        copyable
                      />
                      <ContactCard
                        icon={FiExternalLink}
                        label="Website"
                        value={data.website_url}
                        href={data.website_url || null}
                        copyable
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {!loading && faqs.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-3 md:px-4">
                <h2 className="text-sm font-bold text-gray-800 md:text-base">
                  Frequently asked questions
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  Quick answers to common questions about OOMS.
                </p>
              </div>
              <div className="space-y-2 p-3 md:p-4">
                {faqs.map((faq) => (
                  <FaqItem
                    key={faq.faq_id}
                    faq={faq}
                    open={openFaqId === faq.faq_id}
                    onToggle={() =>
                      setOpenFaqId((id) =>
                        id === faq.faq_id ? null : faq.faq_id
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm md:p-4">
              <SkeletonPulse className="h-4 w-40" />
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonPulse key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
