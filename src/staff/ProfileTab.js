import React from 'react';
import { motion } from 'framer-motion';
import {
    FiUser, FiMail, FiPhone, FiMapPin, FiCalendar,
    FiBriefcase, FiHash, FiHome, FiFlag, FiLayers,
    FiGlobe, FiCreditCard, FiInfo,
} from 'react-icons/fi';

/* ─── helpers ──────────────────────────────────────────────── */
const val = (v) => (v && String(v).trim() !== '' ? v : null);

const SectionHeader = ({ icon: Icon, title, color = 'indigo' }) => {
    const bg = {
        indigo: 'bg-indigo-50 text-indigo-600',
        purple: 'bg-purple-50 text-purple-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    }[color] ?? 'bg-indigo-50 text-indigo-600';

    return (
        <div className="flex items-center gap-2.5 mb-4">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        </div>
    );
};

const InfoRow = ({ icon: Icon, label, value, iconColor = 'text-gray-400', mono = false }) => {
    if (!val(value)) return null;
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className={`text-sm text-gray-800 font-medium break-words ${mono ? 'font-mono' : ''}`}>
                    {value}
                </p>
            </div>
        </div>
    );
};

const Card = ({ children, className = '' }) => (
    <div className={`bg-white border border-gray-100 rounded-2xl p-5 shadow-sm ${className}`}>
        {children}
    </div>
);

/* ─── main component ────────────────────────────────────────── */
const ProfileTab = ({ staffData, variants }) => {
    const d = staffData || {};
    const addr = d.address || {};

    const addressParts = [
        addr.line1,
        addr.line2,
        addr.city,
        d.village_town,
        addr.district,
        addr.state,
        addr.country,
        addr.pincode,
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

    const initials = (d.fullName || '?')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('');

    return (
        <motion.div
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
        >
            {/* ── Identity banner ─────────────────────────────── */}
            <Card>
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-sm flex-shrink-0 select-none">
                        {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-gray-900 truncate">
                            {val(d.fullName) ?? 'Unknown'}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {val(d.designation) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                                    <FiBriefcase className="w-3 h-3" />
                                    {d.designation}
                                </span>
                            )}
                            {val(d.gender) && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                    <FiUser className="w-3 h-3" />
                                    {d.gender}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status pill */}
                    <div className="flex-shrink-0">
                        {d.is_accepted ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                Accepted
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                Pending
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── Two-column grid ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Personal + Contact Details (merged) */}
                <Card className="lg:col-span-2">
                    <SectionHeader icon={FiInfo} title="Staff Details" color="indigo" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                        <InfoRow icon={FiUser}       label="Full Name"     value={val(d.fullName)}      iconColor="text-indigo-400" />
                        <InfoRow icon={FiBriefcase}  label="Designation"   value={val(d.designation)}   iconColor="text-indigo-400" />
                        <InfoRow icon={FiCalendar}   label="Date of Birth" value={val(d.dateOfBirth)}   iconColor="text-violet-400" />
                        <InfoRow icon={FiUser}       label="Gender"        value={val(d.gender)}        iconColor="text-violet-400" />
                        <InfoRow icon={FiCalendar}   label="Joined On"     value={val(d.joinDate)}      iconColor="text-amber-400" />
                        <InfoRow icon={FiPhone}      label="Mobile"        value={val(d.phone)}         iconColor="text-purple-400" />
                        <InfoRow icon={FiMail}       label="Email"         value={val(d.email)}         iconColor="text-blue-400" />
                        {val(d.pan_number) && (
                            <InfoRow icon={FiCreditCard} label="PAN Number" value={val(d.pan_number)}   iconColor="text-orange-400" mono />
                        )}
                        {val(d.guardian_name) && (
                            <InfoRow icon={FiUser}   label="Guardian Name" value={val(d.guardian_name)} iconColor="text-gray-400" />
                        )}
                        {val(d.care_of) && (
                            <InfoRow icon={FiUser}   label="Care Of"       value={val(d.care_of)}       iconColor="text-gray-400" />
                        )}
                    </div>
                </Card>

                {/* Address */}
                <Card className="lg:col-span-2">
                    <SectionHeader icon={FiMapPin} title="Address" color="emerald" />
                    {fullAddress ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                            <InfoRow icon={FiHome}   label="Address Line 1"  value={val(addr.line1)}      iconColor="text-emerald-400" />
                            <InfoRow icon={FiHome}   label="Address Line 2"  value={val(addr.line2)}      iconColor="text-emerald-400" />
                            {val(d.village_town) && (
                                <InfoRow icon={FiLayers} label="Village / Town" value={val(d.village_town)} iconColor="text-emerald-400" />
                            )}
                            <InfoRow icon={FiMapPin} label="City"            value={val(addr.city)}       iconColor="text-teal-400" />
                            <InfoRow icon={FiFlag}   label="District"        value={val(addr.district)}   iconColor="text-teal-400" />
                            <InfoRow icon={FiGlobe}  label="State"           value={val(addr.state)}      iconColor="text-teal-400" />
                            <InfoRow icon={FiGlobe}  label="Country"         value={val(addr.country)}    iconColor="text-teal-400" />
                            <InfoRow icon={FiHash}   label="Pincode"         value={val(addr.pincode)}    iconColor="text-gray-400" mono />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic py-2">No address information available.</p>
                    )}
                </Card>

            </div>
        </motion.div>
    );
};

export default ProfileTab;
