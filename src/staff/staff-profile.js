// import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useNavigate, useParams } from 'react-router-dom';
// import { Sidebar, Header } from '../components/header';
// import {
//     FiUser,
//     FiClock,
//     FiDollarSign,
//     FiAward,
//     FiBriefcase,
//     FiBookOpen,
//     FiTrendingUp,
//     FiFileText,
//     FiCalendar,
//     FiMail,
//     FiPhone,
//     FiMapPin,
//     FiEdit2,
//     FiLock,
//     FiLogOut
// } from 'react-icons/fi';

// // Import tab components
// import ProfileTab from '../StaffComponent/ProfileTab';
// import AttendanceTab from '../StaffComponent/AttendanceTab';
// import ExpenseTab from '../StaffComponent/ExpenseTab';
// import BonusFineTab from '../StaffComponent/BonusFineTab';
// import SalaryTab from '../StaffComponent/SalaryTab';
// import LedgerTab from '../StaffComponent/LedgerTab';
// import LoanTab from '../StaffComponent/LoanTab';
// import PerformanceTab from '../StaffComponent/PerformanceTab';
// import EntryReportTab from '../StaffComponent/EntryReportTab';

// const StaffProfile = () => {
//     const navigate = useNavigate();
//     const { tab } = useParams();
    
//     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//     const [isMinimized, setIsMinimized] = useState(() => {
//         const saved = localStorage.getItem('sidebarMinimized');
//         return saved ? JSON.parse(saved) : false;
//     });
//     const [activeTab, setActiveTab] = useState(tab || 'profile');
//     const [showSettings, setShowSettings] = useState(false);
    
//     // Update active tab when URL changes
//     useEffect(() => {
//         if (tab) {
//             setActiveTab(tab);
//         }
//     }, [tab]);

//     // Staff data
//     const [staffData, setStaffData] = useState({
//         firstName: "Amarnath",
//         lastName: "Kalam",
//         fullName: "Amarnath Kalam",
//         email: "kpt@gmail.com",
//         phone: "+91 9876543210",
//         joinDate: "18/06/2025",
//         balance: "0.00",
//         designation: "MANAGER",
//         dateOfBirth: "18/06/2025",
//         gender: "Male",
//         address: {
//             state: "Andhra Pradesh",
//             district: "Anantapur",
//             city: "ead",
//             line1: "123 Main Street",
//             line2: "Near City Center"
//         }
//     });

//     // Sample data for tabs
//     const [attendance, setAttendance] = useState({
//         month: "Mar-2026",
//         summary: {
//             totalDays: 1,
//             notMarked: 1,
//             present: 0,
//             absent: 0,
//             halfDay: 0,
//             overTime: "00 H : 00 M",
//             fineHours: "00 H : 00 M",
//             paidLeave: 0
//         },
//         calendar: generateCalendarData()
//     });

//     const [expenses, setExpenses] = useState([
//         { id: 1, date: "2026-03-01", description: "Travel expenses", amount: "500.00", status: "Approved" },
//         { id: 2, date: "2026-02-28", description: "Stationery", amount: "250.00", status: "Pending" }
//     ]);

//     const [bonusFine, setBonusFine] = useState([
//         { id: 1, createDate: "2026-03-01", amount: "1000.00", type: "Bonus", description: "Performance bonus", status: "Paid" },
//         { id: 2, createDate: "2026-02-15", amount: "500.00", type: "Fine", description: "Late arrival", status: "Deducted" }
//     ]);

//     const [salary, setSalary] = useState({
//         list: [
//             { 
//                 id: 1,
//                 amount: "0.00",
//                 applyOT: "No",
//                 applyFine: "No",
//                 officeTime: "10:00 AM",
//                 workingHour: "8 Hours : 0 Minutes",
//                 graceTime: "0 Minutes",
//                 effectiveFrom: "Jun-2025",
//                 paidLeave: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
//             }
//         ]
//     });

//     const [ledger, setLedger] = useState({
//         period: "01/03/2026 - 31/03/2026",
//         entries: [],
//         openingBalance: "0.00",
//         totalDebit: "0.00",
//         totalCredit: "0.00",
//         closingBalance: "0.00"
//     });

//     const [loan, setLoan] = useState({
//         period: "19/06/2025 - 31/12/2050",
//         entries: [],
//         openingBalance: "0.00",
//         totalDebit: "0.00",
//         totalCredit: "0.00",
//         closingBalance: "0.00"
//     });

//     const [performance, setPerformance] = useState({
//         period: "19/06/2025 - 31/12/2050",
//         services: [],
//         tasks: generateTaskData()
//     });

//     const [entryReport, setEntryReport] = useState({
//         month: "Mar-2026",
//         entries: [
//             { id: 1, officeTime: "10:00 AM", entryTime: "09:55 AM", date: "01/03/2026", status: "On Time" },
//             { id: 2, officeTime: "10:00 AM", entryTime: "10:15 AM", date: "02/03/2026", status: "Late" }
//         ]
//     });

//     // Helper function to generate calendar data
//     function generateCalendarData() {
//         const days = [];
//         const daysInMonth = 31;
//         for (let i = 1; i <= daysInMonth; i++) {
//             days.push({
//                 date: i,
//                 day: new Date(2026, 2, i).toLocaleDateString('en-US', { weekday: 'short' }),
//                 status: i === 1 ? "Not Marked" : null
//             });
//         }
//         return days;
//     }

//     // Helper function to generate task data
//     function generateTaskData() {
//         return [
//             {
//                 id: 1,
//                 createDate: "10-02-2026",
//                 dueDate: "20-02-2026",
//                 targetDate: "20-02-2026",
//                 task: "Income Tax Return",
//                 fees: "2000.00",
//                 client: "RONIT ROY",
//                 assignor: "CHANDAN ROY",
//                 pan: "xxxxx3169A",
//                 mobile: "8900700707",
//                 status: "ASSIGNED"
//             },
//             {
//                 id: 2,
//                 createDate: "10-02-2026",
//                 dueDate: "20-02-2026",
//                 targetDate: "20-02-2026",
//                 task: "Income Tax Return",
//                 fees: "2000.00",
//                 client: "ABBAS ALI",
//                 assignor: "ABDUL AZIZ",
//                 pan: "ALUPA7087Q",
//                 mobile: "8638501062",
//                 status: "ASSIGNED"
//             }
//             // Add more tasks as needed
//         ];
//     }

//     // Profile tabs with paths
//     const profileTabs = [
//         { id: 'profile', name: 'Profile', icon: FiUser, path: '/staff/profile/profile' },
//         { id: 'attendance', name: 'Attendance', icon: FiClock, path: '/staff/profile/attendance' },
//         { id: 'expense', name: 'Expense', icon: FiDollarSign, path: '/staff/profile/expense' },
//         { id: 'bonus-fine', name: 'Bonus/Fine', icon: FiAward, path: '/staff/profile/bonus-fine' },
//         { id: 'salary', name: 'Salary', icon: FiBriefcase, path: '/staff/profile/salary' },
//         { id: 'ledger', name: 'Ledger', icon: FiBookOpen, path: '/staff/profile/ledger' },
//         { id: 'loan', name: 'Loan', icon: FiDollarSign, path: '/staff/profile/loan' },
//         { id: 'performance', name: 'Performance', icon: FiTrendingUp, path: '/staff/profile/performance' },
//         { id: 'entry-report', name: 'Entry Report', icon: FiFileText, path: '/staff/profile/entry-report' }
//     ];

//     // Handle tab change with navigation
//     const handleTabChange = (tabId) => {
//         setActiveTab(tabId);
//         navigate(`/staff/profile/${tabId}`);
//         setShowSettings(false);
//     };

//     // Handle edit profile
//     const handleEditProfile = () => {
//         // Implement edit profile functionality
//         console.log("Edit profile clicked");
//     };

//     // Handle change password
//     const handleChangePassword = () => {
//         // Implement change password functionality
//         console.log("Change password clicked");
//     };

//     // Handle force logout
//     const handleForceLogout = () => {
//         // Implement force logout functionality
//         console.log("Force logout clicked");
//         // Navigate to login or clear session
//     };

//     // Animation variants
//     const tabContentVariants = {
//         initial: { opacity: 0, y: 20 },
//         animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
//         exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
//     };

//     // Render content based on active tab
//     const renderTabContent = () => {
//         const props = {
//             variants: tabContentVariants,
//             staffData
//         };

//         switch (activeTab) {
//             case 'profile':
//                 return <ProfileTab key="profile" staffData={staffData} setStaffData={setStaffData} {...props} />;
//             case 'attendance':
//                 return <AttendanceTab key="attendance" attendance={attendance} setAttendance={setAttendance} {...props} />;
//             case 'expense':
//                 return <ExpenseTab key="expense" expenses={expenses} setExpenses={setExpenses} {...props} />;
//             case 'bonus-fine':
//                 return <BonusFineTab key="bonus-fine" bonusFine={bonusFine} setBonusFine={setBonusFine} {...props} />;
//             case 'salary':
//                 return <SalaryTab key="salary" salary={salary} setSalary={setSalary} {...props} />;
//             case 'ledger':
//                 return <LedgerTab key="ledger" ledger={ledger} setLedger={setLedger} {...props} />;
//             case 'loan':
//                 return <LoanTab key="loan" loan={loan} setLoan={setLoan} {...props} />;
//             case 'performance':
//                 return <PerformanceTab key="performance" performance={performance} setPerformance={setPerformance} {...props} />;
//             case 'entry-report':
//                 return <EntryReportTab key="entry-report" entryReport={entryReport} setEntryReport={setEntryReport} {...props} />;
//             default:
//                 return null;
//         }
//     };

//     return (
//         <div className="min-h-screen bg-gray-50">
//             <Header
//                 mobileMenuOpen={mobileMenuOpen}
//                 setMobileMenuOpen={setMobileMenuOpen}
//                 isMinimized={isMinimized}
//                 setIsMinimized={setIsMinimized}
//             />
//             <Sidebar
//                 mobileMenuOpen={mobileMenuOpen}
//                 setMobileMenuOpen={setMobileMenuOpen}
//                 isMinimized={isMinimized}
//                 setIsMinimized={setIsMinimized}
//             />

//             {/* Main content */}
//             <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
//                     {/* Staff Header Card */}
//                     <motion.div 
//                         className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 relative"
//                         initial={{ opacity: 0, y: -20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4 }}
//                     >
//                         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
//                             <div className="flex items-center gap-4">
//                                 <motion.div 
//                                     className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl"
//                                     whileHover={{ scale: 1.05, rotate: 5 }}
//                                 >
//                                     {staffData.firstName.charAt(0)}{staffData.lastName.charAt(0)}
//                                 </motion.div>
//                                 <div>
//                                     <h1 className="text-2xl font-bold text-gray-900">{staffData.fullName}</h1>
//                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-2 text-sm text-gray-600">
//                                         <div className="flex items-center gap-2">
//                                             <FiMail className="w-4 h-4 text-gray-400" />
//                                             {staffData.email}
//                                         </div>
//                                         <div className="flex items-center gap-2">
//                                             <FiPhone className="w-4 h-4 text-gray-400" />
//                                             {staffData.phone}
//                                         </div>
//                                         <div className="flex items-center gap-2">
//                                             <FiCalendar className="w-4 h-4 text-gray-400" />
//                                             Joined: {staffData.joinDate}
//                                         </div>
//                                         <div className="flex items-center gap-2">
//                                             <FiBriefcase className="w-4 h-4 text-gray-400" />
//                                             {staffData.designation}
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="flex items-center gap-3">
//                                 <motion.button
//                                     onClick={() => setShowSettings(!showSettings)}
//                                     className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
//                                     whileHover={{ scale: 1.05 }}
//                                     whileTap={{ scale: 0.95 }}
//                                 >
//                                     <FiUser className="w-5 h-5" />
//                                 </motion.button>
//                                 <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
//                                     Balance: ₹{staffData.balance}
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Settings Dropdown */}
//                         <AnimatePresence>
//                             {showSettings && (
//                                 <motion.div
//                                     initial={{ opacity: 0, y: -10 }}
//                                     animate={{ opacity: 1, y: 0 }}
//                                     exit={{ opacity: 0, y: -10 }}
//                                     className="absolute right-6 top-20 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
//                                 >
//                                     <button
//                                         onClick={handleEditProfile}
//                                         className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
//                                     >
//                                         <FiEdit2 className="w-4 h-4" />
//                                         Edit Profile
//                                     </button>
//                                     <button
//                                         onClick={handleChangePassword}
//                                         className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
//                                     >
//                                         <FiLock className="w-4 h-4" />
//                                         Change Password
//                                     </button>
//                                     <button
//                                         onClick={handleForceLogout}
//                                         className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
//                                     >
//                                         <FiLogOut className="w-4 h-4" />
//                                         Force Logout
//                                     </button>
//                                 </motion.div>
//                             )}
//                         </AnimatePresence>
//                     </motion.div>

//                     {/* Profile Tabs */}
//                     <motion.div 
//                         className="bg-white rounded-lg border border-gray-200 p-1 mb-6 overflow-x-auto"
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         transition={{ delay: 0.2 }}
//                     >
//                         <div className="flex min-w-max">
//                             {profileTabs.map((tab) => {
//                                 const Icon = tab.icon;
//                                 const isActive = activeTab === tab.id;
                                
//                                 return (
//                                     <motion.button
//                                         key={tab.id}
//                                         onClick={() => handleTabChange(tab.id)}
//                                         className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
//                                             isActive 
//                                                 ? 'bg-blue-100 text-blue-700' 
//                                                 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
//                                         }`}
//                                         whileHover={{ scale: 1.02 }}
//                                         whileTap={{ scale: 0.98 }}
//                                     >
//                                         <Icon className="w-4 h-4" />
//                                         {tab.name}
//                                     </motion.button>
//                                 );
//                             })}
//                         </div>
//                     </motion.div>

//                     {/* Tab Content */}
//                     <AnimatePresence mode="wait">
//                         {renderTabContent()}
//                     </AnimatePresence>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default StaffProfile;