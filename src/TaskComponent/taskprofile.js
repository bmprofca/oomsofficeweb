// import React, { useState } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { Sidebar, Header } from '../components/header';
// import {
//     FiClipboard,
//     FiMessageSquare,
//     FiUsers,
//     FiClock,
//     FiCheckSquare,
//     FiFile,
//     FiDollarSign,
//     FiCalendar,
//     FiUser,
//     FiEdit,
//     FiPlus,
//     FiTrash2,
//     FiEye,
//     FiDownload,
//     FiShare2,
//     FiX,
//     FiChevronDown,
//     FiUpload,
//     FiSearch,
//     FiCheck
// } from 'react-icons/fi';

// // Separate Modal Components to prevent re-rendering issues
// const EditModal = ({ isOpen, onClose, field, value, onSave }) => {
//     const [inputValue, setInputValue] = useState(value);

//     const handleSave = () => {
//         onSave(inputValue);
//         onClose();
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Edit {field.replace(/([A-Z])/g, ' $1').trim()}</h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-blue-200 transition-colors duration-200 p-1 rounded-lg hover:bg-blue-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     <div className="mb-6">
//                         <label className="block text-sm font-medium text-slate-700 mb-2">
//                             {field.replace(/([A-Z])/g, ' $1').trim()}
//                         </label>
//                         <input
//                             type="text"
//                             value={inputValue}
//                             onChange={(e) => setInputValue(e.target.value)}
//                             className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
//                             placeholder={`Enter ${field}`}
//                         />
//                     </div>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleSave}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 hover:shadow-md shadow-sm flex items-center gap-2"
//                     >
//                         <FiEdit className="w-4 h-4" />
//                         Save Changes
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const NoteModal = ({ isOpen, onClose, onAdd }) => {
//     const [noteContent, setNoteContent] = useState('');

//     const handleAdd = () => {
//         if (noteContent.trim()) {
//             onAdd(noteContent);
//             setNoteContent('');
//             onClose();
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Add New Note</h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-green-200 transition-colors duration-200 p-1 rounded-lg hover:bg-green-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     <div className="mb-6">
//                         <label className="block text-sm font-medium text-slate-700 mb-2">
//                             Note Content
//                         </label>
//                         <textarea
//                             value={noteContent}
//                             onChange={(e) => setNoteContent(e.target.value)}
//                             placeholder="Enter your note here..."
//                             rows="4"
//                             className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
//                         />
//                     </div>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleAdd}
//                         disabled={!noteContent.trim()}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
//                     >
//                         <FiPlus className="w-4 h-4" />
//                         Add Note
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const StaffModal = ({ isOpen, onClose, onAdd, availableStaff, currentStaff }) => {
//     const [selectedStaff, setSelectedStaff] = useState(new Set(currentStaff.map(staff => staff.id)));
//     const [searchTerm, setSearchTerm] = useState('');

//     const filteredStaff = availableStaff.filter(staff =>
//         staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         staff.role.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     const toggleStaff = (staffId) => {
//         const newSelected = new Set(selectedStaff);
//         if (newSelected.has(staffId)) {
//             newSelected.delete(staffId);
//         } else {
//             newSelected.add(staffId);
//         }
//         setSelectedStaff(newSelected);
//     };

//     const selectAll = () => {
//         setSelectedStaff(new Set(availableStaff.map(staff => staff.id)));
//     };

//     const deselectAll = () => {
//         setSelectedStaff(new Set());
//     };

//     const handleAdd = () => {
//         const staffToAdd = availableStaff.filter(staff => selectedStaff.has(staff.id));
//         onAdd(staffToAdd);
//         onClose();
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Assign Staff Members</h2>
//                         <p className="text-purple-100 text-sm mt-1">
//                             {selectedStaff.size} staff member{selectedStaff.size !== 1 ? 's' : ''} selected
//                         </p>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-purple-200 transition-colors duration-200 p-1 rounded-lg hover:bg-purple-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     {/* Search and Bulk Actions */}
//                     <div className="flex flex-col sm:flex-row gap-4 mb-6">
//                         <div className="relative flex-1">
//                             <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
//                             <input
//                                 type="text"
//                                 placeholder="Search staff by name or role..."
//                                 value={searchTerm}
//                                 onChange={(e) => setSearchTerm(e.target.value)}
//                                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
//                             />
//                         </div>
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={selectAll}
//                                 className="px-4 py-2 text-sm font-medium border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-200"
//                             >
//                                 Select All
//                             </button>
//                             <button
//                                 onClick={deselectAll}
//                                 className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all duration-200"
//                             >
//                                 Deselect All
//                             </button>
//                         </div>
//                     </div>

//                     {/* Staff List */}
//                     <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
//                         {filteredStaff.length === 0 ? (
//                             <div className="text-center py-8 text-slate-500">
//                                 No staff members found
//                             </div>
//                         ) : (
//                             filteredStaff.map((staff) => {
//                                 const isSelected = selectedStaff.has(staff.id);
//                                 return (
//                                     <div
//                                         key={staff.id}
//                                         onClick={() => toggleStaff(staff.id)}
//                                         className={`flex items-center p-4 border-b border-slate-100 last:border-b-0 cursor-pointer transition-all duration-200 ${
//                                             isSelected
//                                                 ? 'bg-green-50 border-green-200'
//                                                 : 'hover:bg-slate-50'
//                                         }`}
//                                     >
//                                         <div className={`w-5 h-5 border-2 rounded flex items-center justify-center mr-3 ${
//                                             isSelected
//                                                 ? 'bg-green-500 border-green-500 text-white'
//                                                 : 'border-slate-300'
//                                         }`}>
//                                             {isSelected && <FiCheck className="w-3 h-3" />}
//                                         </div>
//                                         <div className="flex-1">
//                                             <div className="font-semibold text-slate-800">{staff.name}</div>
//                                             <div className="text-sm text-slate-600">{staff.role}</div>
//                                         </div>
//                                         {isSelected && (
//                                             <div className="text-green-600 text-sm font-medium">
//                                                 Selected
//                                             </div>
//                                         )}
//                                     </div>
//                                 );
//                             })
//                         )}
//                     </div>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleAdd}
//                         disabled={selectedStaff.size === 0}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
//                     >
//                         <FiUsers className="w-4 h-4" />
//                         Assign Staff ({selectedStaff.size})
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const TimelogModal = ({ isOpen, onClose, onAdd }) => {
//     const [startTime, setStartTime] = useState('');
//     const [endTime, setEndTime] = useState('');

//     const handleAdd = () => {
//         if (startTime && endTime) {
//             onAdd({ startTime, endTime });
//             setStartTime('');
//             setEndTime('');
//             onClose();
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Add Time Log</h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-orange-200 transition-colors duration-200 p-1 rounded-lg hover:bg-orange-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     <div className="grid grid-cols-1 gap-4 mb-6">
//                         <div>
//                             <label className="block text-sm font-medium text-slate-700 mb-2">
//                                 Start Time (hours)
//                             </label>
//                             <input
//                                 type="datetime-local"
//                                 value={startTime}
//                                 onChange={(e) => setStartTime(e.target.value)}
//                                 placeholder="0"
//                                 min="0"
//                                 max="24"
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium text-slate-700 mb-2">
//                                 End Time (hours)
//                             </label>
//                             <input
//                                 type="datetime-local"
//                                 value={endTime}
//                                 onChange={(e) => setEndTime(e.target.value)}
//                                 placeholder="0"
//                                 min="0"
//                                 max="24"
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
//                             />
//                         </div>
//                     </div>
                    
//                     {startTime && endTime && (
//                         <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
//                             <div className="text-sm font-medium text-orange-800 text-center">
//                                 Time Period: {endTime - startTime} hours
//                             </div>
//                         </div>
//                     )}
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleAdd}
//                         disabled={!startTime || !endTime}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
//                     >
//                         <FiPlus className="w-4 h-4" />
//                         Add Time Log
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const SubtaskModal = ({ isOpen, onClose, onAdd, availableStaff, services }) => {
//     const [subtaskType, setSubtaskType] = useState('service'); // 'service' or 'custom'
//     const [selectedService, setSelectedService] = useState('');
//     const [customName, setCustomName] = useState('');
//     const [assignedTo, setAssignedTo] = useState('');
//     const [searchTerm, setSearchTerm] = useState('');

//     const filteredServices = services.filter(service =>
//         service.name.toLowerCase().includes(searchTerm.toLowerCase())
//     );

//     const handleAdd = () => {
//         let name = '';
//         if (subtaskType === 'service') {
//             const service = services.find(s => s.id === selectedService);
//             name = service ? service.name : '';
//         } else {
//             name = customName;
//         }

//         if (name.trim()) {
//             onAdd({ name, assignedTo });
//             setSelectedService('');
//             setCustomName('');
//             setAssignedTo('');
//             setSearchTerm('');
//             onClose();
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Add Subtask</h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     {/* Subtask Type Selection */}
//                     <div className="mb-6">
//                         <label className="block text-sm font-medium text-slate-700 mb-3">
//                             Subtask Type
//                         </label>
//                         <div className="grid grid-cols-2 gap-3">
//                             <button
//                                 type="button"
//                                 onClick={() => setSubtaskType('service')}
//                                 className={`p-3 border rounded-lg text-center transition-all duration-200 ${
//                                     subtaskType === 'service'
//                                         ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
//                                         : 'border-slate-300 text-slate-600 hover:border-slate-400'
//                                 }`}
//                             >
//                                 <div className="font-medium">From Services</div>
//                                 <div className="text-xs mt-1">Pre-defined services</div>
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={() => setSubtaskType('custom')}
//                                 className={`p-3 border rounded-lg text-center transition-all duration-200 ${
//                                     subtaskType === 'custom'
//                                         ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
//                                         : 'border-slate-300 text-slate-600 hover:border-slate-400'
//                                 }`}
//                             >
//                                 <div className="font-medium">Custom</div>
//                                 <div className="text-xs mt-1">Manual entry</div>
//                             </button>
//                         </div>
//                     </div>

//                     {/* Service Selection */}
//                     {subtaskType === 'service' && (
//                         <div className="mb-4">
//                             <label className="block text-sm font-medium text-slate-700 mb-2">
//                                 Select Service
//                             </label>
//                             <div className="relative mb-2">
//                                 <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
//                                 <input
//                                     type="text"
//                                     placeholder="Search services..."
//                                     value={searchTerm}
//                                     onChange={(e) => setSearchTerm(e.target.value)}
//                                     className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
//                                 />
//                             </div>
//                             <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
//                                 {filteredServices.map(service => (
//                                     <div
//                                         key={service.id}
//                                         onClick={() => setSelectedService(service.id)}
//                                         className={`p-3 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${
//                                             selectedService === service.id
//                                                 ? 'bg-indigo-50 border-indigo-200'
//                                                 : 'hover:bg-slate-50'
//                                         }`}
//                                     >
//                                         <div className="font-medium text-slate-800">{service.name}</div>
//                                         <div className="text-sm text-slate-600">{service.category}</div>
//                                     </div>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {/* Custom Name Input */}
//                     {subtaskType === 'custom' && (
//                         <div className="mb-4">
//                             <label className="block text-sm font-medium text-slate-700 mb-2">
//                                 Subtask Name
//                             </label>
//                             <input
//                                 type="text"
//                                 value={customName}
//                                 onChange={(e) => setCustomName(e.target.value)}
//                                 placeholder="Enter custom subtask name"
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
//                             />
//                         </div>
//                     )}
                    
//                     {/* Assign To */}
//                     <div className="mb-6">
//                         <label className="block text-sm font-medium text-slate-700 mb-2">
//                             Assign To
//                         </label>
//                         <div className="relative">
//                             <select
//                                 value={assignedTo}
//                                 onChange={(e) => setAssignedTo(e.target.value)}
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
//                             >
//                                 <option value="">Choose staff member</option>
//                                 {availableStaff.map(staff => (
//                                     <option key={staff.id} value={staff.id}>
//                                         {staff.name} - {staff.role}
//                                     </option>
//                                 ))}
//                             </select>
//                             <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
//                         </div>
//                     </div>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleAdd}
//                         disabled={(subtaskType === 'service' && !selectedService) || (subtaskType === 'custom' && !customName.trim())}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
//                     >
//                         <FiPlus className="w-4 h-4" />
//                         Add Subtask
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const EditSubtaskModal = ({ isOpen, onClose, subtask, onUpdate, availableStaff }) => {
//     const [name, setName] = useState(subtask?.name || '');
//     const [status, setStatus] = useState(subtask?.status || 'Pending');
//     const [assignedTo, setAssignedTo] = useState(subtask?.assignedTo || '');

//     const handleUpdate = () => {
//         onUpdate({
//             ...subtask,
//             name,
//             status,
//             assignedTo
//         });
//         onClose();
//     };

//     if (!isOpen || !subtask) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Edit Subtask</h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-indigo-200 transition-colors duration-200 p-1 rounded-lg hover:bg-indigo-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     <div className="mb-4">
//                         <label className="block text-sm font-medium text-slate-700 mb-2">
//                             Subtask Name
//                         </label>
//                         <input
//                             type="text"
//                             value={name}
//                             onChange={(e) => setName(e.target.value)}
//                             className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
//                         />
//                     </div>
                    
//                     <div className="mb-4">
//                         <label className="block text-sm font-medium text-slate-700 mb-2">
//                             Status
//                         </label>
//                         <select
//                             value={status}
//                             onChange={(e) => setStatus(e.target.value)}
//                             className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
//                         >
//                             <option value="Pending">Pending</option>
//                             <option value="In Progress">In Progress</option>
//                             <option value="Completed">Completed</option>
//                             <option value="On Hold">On Hold</option>
//                         </select>
//                     </div>
                    
//                     <div className="mb-6">
//                         <label className="block text-sm font-medium text-slate-700 mb-2">
//                             Assign To
//                         </label>
//                         <div className="relative">
//                             <select
//                                 value={assignedTo}
//                                 onChange={(e) => setAssignedTo(e.target.value)}
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
//                             >
//                                 <option value="">Choose staff member</option>
//                                 {availableStaff.map(staff => (
//                                     <option key={staff.id} value={staff.id}>
//                                         {staff.name} - {staff.role}
//                                     </option>
//                                 ))}
//                             </select>
//                             <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
//                         </div>
//                     </div>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleUpdate}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 hover:shadow-md shadow-sm flex items-center gap-2"
//                     >
//                         <FiEdit className="w-4 h-4" />
//                         Update Subtask
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const DocumentModal = ({ isOpen, onClose, onAdd }) => {
//     const [documents, setDocuments] = useState([
//         { id: 1, name: '', remark: '', file: null }
//     ]);

//     const addDocumentField = () => {
//         setDocuments(prev => [
//             ...prev,
//             { id: prev.length + 1, name: '', remark: '', file: null }
//         ]);
//     };

//     const removeDocumentField = (id) => {
//         if (documents.length > 1) {
//             setDocuments(prev => prev.filter(doc => doc.id !== id));
//         }
//     };

//     const updateDocument = (id, field, value) => {
//         setDocuments(prev => prev.map(doc => 
//             doc.id === id ? { ...doc, [field]: value } : doc
//         ));
//     };

//     const handleFileUpload = (id, file) => {
//         updateDocument(id, 'file', file);
//         // Auto-fill name if empty
//         if (!documents.find(doc => doc.id === id)?.name) {
//             updateDocument(id, 'name', file.name.split('.')[0]);
//         }
//     };

//     const handleAdd = () => {
//         const validDocuments = documents.filter(doc => 
//             doc.name.trim() && doc.file
//         );
        
//         if (validDocuments.length > 0) {
//             onAdd(validDocuments);
//             setDocuments([{ id: 1, name: '', remark: '', file: null }]);
//             onClose();
//         }
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Upload Documents</h2>
//                         <p className="text-cyan-100 text-sm mt-1">
//                             {documents.filter(doc => doc.file).length} file(s) selected
//                         </p>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-cyan-200 transition-colors duration-200 p-1 rounded-lg hover:bg-cyan-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6 max-h-96 overflow-y-auto">
//                     {documents.map((doc, index) => (
//                         <motion.div
//                             key={doc.id}
//                             initial={{ opacity: 0, y: 20 }}
//                             animate={{ opacity: 1, y: 0 }}
//                             transition={{ delay: index * 0.1 }}
//                             className="border border-slate-200 rounded-lg p-4 mb-4 last:mb-0"
//                         >
//                             <div className="flex justify-between items-center mb-4">
//                                 <h3 className="font-semibold text-slate-800">Document #{index + 1}</h3>
//                                 {documents.length > 1 && (
//                                     <button
//                                         onClick={() => removeDocumentField(doc.id)}
//                                         className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
//                                     >
//                                         <FiX className="w-4 h-4" />
//                                     </button>
//                                 )}
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                 <div>
//                                     <label className="block text-sm font-medium text-slate-700 mb-2">
//                                         Document Name
//                                     </label>
//                                     <input
//                                         type="text"
//                                         value={doc.name}
//                                         onChange={(e) => updateDocument(doc.id, 'name', e.target.value)}
//                                         placeholder="Enter document name"
//                                         className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
//                                     />
//                                 </div>
                                
//                                 <div>
//                                     <label className="block text-sm font-medium text-slate-700 mb-2">
//                                         File Upload
//                                     </label>
//                                     <div className="relative">
//                                         <input
//                                             type="file"
//                                             onChange={(e) => handleFileUpload(doc.id, e.target.files[0])}
//                                             className="w-full opacity-0 absolute inset-0 cursor-pointer"
//                                             accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
//                                         />
//                                         <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
//                                             doc.file 
//                                                 ? 'border-green-500 bg-green-50' 
//                                                 : 'border-slate-300 hover:border-cyan-400'
//                                         }`}>
//                                             {doc.file ? (
//                                                 <div className="text-green-700">
//                                                     <FiCheck className="w-5 h-5 mx-auto mb-1" />
//                                                     <div className="text-sm font-medium">{doc.file.name}</div>
//                                                     <div className="text-xs text-green-600">
//                                                         {(doc.file.size / 1024 / 1024).toFixed(2)} MB
//                                                     </div>
//                                                 </div>
//                                             ) : (
//                                                 <div className="text-slate-600">
//                                                     <FiUpload className="w-5 h-5 mx-auto mb-1" />
//                                                     <div className="text-sm">Click to upload file</div>
//                                                     <div className="text-xs">PDF, DOC, XLS, JPG, PNG</div>
//                                                 </div>
//                                             )}
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="mt-4">
//                                 <label className="block text-sm font-medium text-slate-700 mb-2">
//                                     Remarks
//                                 </label>
//                                 <textarea
//                                     value={doc.remark}
//                                     onChange={(e) => updateDocument(doc.id, 'remark', e.target.value)}
//                                     placeholder="Enter remarks for this document"
//                                     rows="2"
//                                     className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none"
//                                 />
//                             </div>
//                         </motion.div>
//                     ))}

//                     <motion.button
//                         onClick={addDocumentField}
//                         className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-slate-600 hover:text-slate-800 hover:border-slate-400 transition-colors duration-200 flex items-center justify-center gap-2"
//                         whileHover={{ scale: 1.02 }}
//                         whileTap={{ scale: 0.98 }}
//                     >
//                         <FiPlus className="w-5 h-5" />
//                         Add Another Document
//                     </motion.button>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleAdd}
//                         disabled={documents.filter(doc => doc.name.trim() && doc.file).length === 0}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition-all duration-200 hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
//                     >
//                         <FiUpload className="w-4 h-4" />
//                         Upload {documents.filter(doc => doc.name.trim() && doc.file).length} Document(s)
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// const DateRangeModal = ({ isOpen, onClose, onUpdate, currentRange }) => {
//     const [startDate, setStartDate] = useState(currentRange.startDate);
//     const [endDate, setEndDate] = useState(currentRange.endDate);

//     const handleUpdate = () => {
//         onUpdate({ startDate, endDate });
//         onClose();
//     };

//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300">
//             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-fade-in">
//                 <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-4 flex justify-between items-center rounded-t-xl">
//                     <div>
//                         <h2 className="text-xl font-bold">Change Date Range</h2>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         className="text-white hover:text-teal-200 transition-colors duration-200 p-1 rounded-lg hover:bg-teal-500"
//                     >
//                         <FiX className="w-6 h-6" />
//                     </button>
//                 </div>

//                 <div className="p-6">
//                     <div className="grid grid-cols-2 gap-4 mb-6">
//                         <div>
//                             <label className="block text-sm font-medium text-slate-700 mb-2">
//                                 Start Date
//                             </label>
//                             <input
//                                 type="text"
//                                 value={startDate}
//                                 onChange={(e) => setStartDate(e.target.value)}
//                                 placeholder="DD/MM/YYYY"
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium text-slate-700 mb-2">
//                                 End Date
//                             </label>
//                             <input
//                                 type="text"
//                                 value={endDate}
//                                 onChange={(e) => setEndDate(e.target.value)}
//                                 placeholder="DD/MM/YYYY"
//                                 className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-medium transition-all duration-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
//                             />
//                         </div>
//                     </div>
//                 </div>

//                 <div className="border-t px-6 py-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
//                     <button
//                         onClick={onClose}
//                         className="px-6 py-3 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-200 transition-all duration-200 hover:shadow-sm text-slate-700"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         onClick={handleUpdate}
//                         className="px-6 py-3 text-sm font-medium bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 hover:shadow-md shadow-sm flex items-center gap-2"
//                     >
//                         <FiCalendar className="w-4 h-4" />
//                         Update Range
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };


// // Main Component
// const TaskProfile = () => {
//     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//     const [isMinimized, setIsMinimized] = useState(() => {
//         const saved = localStorage.getItem('sidebarMinimized');
//         return saved ? JSON.parse(saved) : false;
//     });
//     const [activeTab, setActiveTab] = useState('details');
    
//     // Modal states
//     const [openModal, setOpenModal] = useState(null);
//     const [editModalData, setEditModalData] = useState({ field: '', value: '' });
//     const [editingSubtask, setEditingSubtask] = useState(null);

//     // Task data with editable fields
//     const [taskData, setTaskData] = useState({
//         title: "Income Tax Return",
//         firm: "RONIT ROY [Individual]",
//         pan: "xxxxx3169A",
//         gst: "",
//         status: "ASSIGNED",
//         fees: "2000.00",
//         createDate: "10/11/2025 | 12:30:04 AM",
//         createBy: "RECURRING",
//         assignedCA: "",
//         mentor: "",
//         dueDate: "20/11/2025"
//     });

//     // Sample data
//     const [notes, setNotes] = useState([
//         { id: 1, content: "Client needs to submit Form 16", author: "Admin", date: "2025-11-15", time: "10:30 AM" },
//         { id: 2, content: "Documents verified and processed", author: "CA Rajesh", date: "2025-11-16", time: "02:15 PM" }
//     ]);

//     const [staff, setStaff] = useState([
//         { id: 1, name: "Rajesh Kumar", role: "Senior CA", email: "rajesh@firm.com" },
//         { id: 2, name: "Priya Sharma", role: "Tax Specialist", email: "priya@firm.com" }
//     ]);

//     const availableStaff = [
//         { id: 1, name: "Rajesh Kumar", role: "Senior CA" },
//         { id: 2, name: "Priya Sharma", role: "Tax Specialist" },
//         { id: 3, name: "Amit Patel", role: "Junior CA" },
//         { id: 4, name: "Sneha Reddy", role: "Audit Assistant" }
//     ];

//     const services = [
//         { id: 1, name: "Income Tax Return Filing", category: "Tax" },
//         { id: 2, name: "GST Return Filing", category: "Tax" },
//         { id: 3, name: "Financial Statement Preparation", category: "Accounting" },
//         { id: 4, name: "Tax Audit", category: "Audit" },
//         { id: 5, name: "Bookkeeping", category: "Accounting" },
//         { id: 6, name: "Tax Consultation", category: "Advisory" }
//     ];

//     const [timelogs, setTimelogs] = useState([
//         { id: 1, createDate: "15/11/2025", name: "Document Review", user: "Rajesh", timestamp: "10:30 AM", spent: "2 hours" },
//         { id: 2, createDate: "16/11/2025", name: "Tax Calculation", user: "Priya", timestamp: "02:15 PM", spent: "1.5 hours" }
//     ]);

//     const [subtasks, setSubtasks] = useState([
//         { id: 1, name: "Collect Form 16", status: "Completed", assignedTo: "1", completedBy: "Rajesh" },
//         { id: 2, name: "Verify Investments", status: "In Progress", assignedTo: "2", completedBy: "" },
//         { id: 3, name: "File Return", status: "Pending", assignedTo: "", completedBy: "" }
//     ]);

//     const [documents, setDocuments] = useState([
//         { id: 1, name: "Form16.pdf", remark: "Client submitted", type: "PDF", size: "2.3 MB" },
//         { id: 2, name: "InvestmentProofs.pdf", remark: "Verified", type: "PDF", size: "1.8 MB" }
//     ]);

//     const [ledger, setLedger] = useState({
//         period: "01/11/2025 - 26/11/2025",
//         entries: [
//             { id: 1, date: "14/11/2025", particular: "0 - CASH - 0 [CASH]", voucherType: "RECEIVED", voucherNo: "RCV/3", debit: "0.00", credit: "500.00", balance: "5,998.00" }
//         ],
//         openingBalance: "6,498.00",
//         totalDebit: "6,498.00",
//         totalCredit: "500.00",
//         closingBalance: "5,998.00"
//     });

//     // Profile tabs data
//     const profileTabs = [
//         { id: 'details', name: 'Details', icon: FiClipboard },
//         { id: 'notes', name: 'Notes', icon: FiMessageSquare },
//         { id: 'staff', name: 'Staff', icon: FiUsers },
//         { id: 'timelog', name: 'Timelog', icon: FiClock },
//         { id: 'subtask', name: 'Subtask', icon: FiCheckSquare },
//         { id: 'documents', name: 'Documents', icon: FiFile },
//         { id: 'ledger', name: 'Ledger', icon: FiDollarSign }
//     ];

//     // Animation variants
//     const tabContentVariants = {
//         initial: { opacity: 0, y: 20, scale: 0.98 },
//         animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
//         exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
//     };

//     // Handler functions
//     const handleEditField = (field, value) => {
//         setEditModalData({ field, value });
//         setOpenModal('edit');
//     };

//     const saveEdit = (newValue) => {
//         setTaskData(prev => ({
//             ...prev,
//             [editModalData.field]: newValue
//         }));
//     };

//     const addNote = (noteContent) => {
//         const newNoteObj = {
//             id: notes.length + 1,
//             content: noteContent,
//             author: "Current User",
//             date: new Date().toLocaleDateString('en-GB'),
//             time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
//         };
//         setNotes([...notes, newNoteObj]);
//     };

//     const addStaffMember = (staffToAdd) => {
//         const newStaff = staffToAdd.map(staff => ({
//             ...staff,
//             email: `${staff.name.toLowerCase().replace(' ', '.')}@firm.com`
//         }));
//         setStaff(newStaff);
//     };

//     const removeStaff = (id) => {
//         setStaff(staff.filter(member => member.id !== id));
//     };

//     const addTimelog = (timelogData) => {
//         const newTimelog = {
//             id: timelogs.length + 1,
//             createDate: new Date().toLocaleDateString('en-GB'),
//             name: "Time Entry",
//             user: "Current User",
//             timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
//             spent: `${timelogData.endTime - timelogData.startTime} hours`
//         };
//         setTimelogs([...timelogs, newTimelog]);
//     };

//     const addNewSubtask = (subtaskData) => {
//         const assignedStaff = availableStaff.find(s => s.id === parseInt(subtaskData.assignedTo));
//         const newSubtask = {
//             id: subtasks.length + 1,
//             name: subtaskData.name,
//             status: "Pending",
//             assignedTo: subtaskData.assignedTo,
//             completedBy: assignedStaff ? assignedStaff.name : ""
//         };
//         setSubtasks([...subtasks, newSubtask]);
//     };

//     const updateSubtask = (updatedSubtask) => {
//         setSubtasks(prev => prev.map(task => 
//             task.id === updatedSubtask.id ? updatedSubtask : task
//         ));
//     };

//     const addNewDocument = (documentsData) => {
//         const newDocs = documentsData.map((doc, index) => ({
//             id: documents.length + index + 1,
//             name: doc.name,
//             remark: doc.remark,
//             type: doc.file?.name.split('.').pop().toUpperCase() || "PDF",
//             size: doc.file ? `${(doc.file.size / 1024 / 1024).toFixed(1)} MB` : "2.5 MB"
//         }));
//         setDocuments([...documents, ...newDocs]);
//     };

//     const updateDateRange = (dateRange) => {
//         setLedger(prev => ({
//             ...prev,
//             period: `${dateRange.startDate} - ${dateRange.endDate}`
//         }));
//     };

//     const closeModal = () => {
//         setOpenModal(null);
//         setEditingSubtask(null);
//     };

//     const openEditSubtask = (subtask) => {
//         setEditingSubtask(subtask);
//         setOpenModal('editSubtask');
//     };

//     // Helper Components
//     const DetailRow = ({ label, value }) => (
//         <div className="flex justify-between items-center py-3 border-b border-gray-100">
//             <span className="font-medium text-gray-700 text-sm">{label}</span>
//             <span className="text-gray-900 font-medium">{value}</span>
//         </div>
//     );

//     const EditableField = ({ label, value, onEdit }) => (
//         <div className="flex justify-between items-center py-3 border-b border-gray-100">
//             <span className="font-medium text-gray-700 text-sm">{label}</span>
//             <div className="flex items-center gap-2">
//                 <span className="text-gray-900 font-medium">{value}</span>
//                 <motion.button
//                     onClick={onEdit}
//                     className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
//                     whileHover={{ scale: 1.1 }}
//                     whileTap={{ scale: 0.9 }}
//                 >
//                     <FiEdit className="w-4 h-4" />
//                 </motion.button>
//             </div>
//         </div>
//     );

//     // Render content based on active tab
//     const renderTabContent = () => {
//         switch (activeTab) {
//             case 'details':
//                 return (
//                     <motion.div
//                         key="details"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                             {/* Left Column */}
//                             <div className="space-y-2">
//                                 <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Task Information</h3>
//                                 <DetailRow label="FIRM" value={taskData.firm} />
//                                 <DetailRow label="PAN" value={taskData.pan} />
//                                 <DetailRow label="GST" value={taskData.gst || "N/A"} />
//                                 <EditableField label="STATUS" value={taskData.status} onEdit={() => handleEditField('status', taskData.status)} />
//                                 <EditableField label="FEES" value={`₹${taskData.fees}`} onEdit={() => handleEditField('fees', taskData.fees)} />
//                             </div>

//                             {/* Right Column */}
//                             <div className="space-y-2">
//                                 <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Assignment Details</h3>
//                                 <DetailRow label="CREATE DATE" value={taskData.createDate} />
//                                 <DetailRow label="CREATE BY" value={taskData.createBy} />
//                                 <EditableField label="ASSIGNED CA" value={taskData.assignedCA || "Not Assigned"} onEdit={() => handleEditField('assignedCA', taskData.assignedCA)} />
//                                 <EditableField label="MENTOR" value={taskData.mentor || "Not Assigned"} onEdit={() => handleEditField('mentor', taskData.mentor)} />
//                                 <EditableField label="DUE DATE" value={taskData.dueDate} onEdit={() => handleEditField('dueDate', taskData.dueDate)} />
//                             </div>
//                         </div>
//                     </motion.div>
//                 );

//             case 'notes':
//                 return (
//                     <motion.div
//                         key="notes"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="flex justify-between items-center mb-6">
//                             <h3 className="text-lg font-semibold text-gray-900">Task Notes</h3>
//                             <motion.button
//                                 onClick={() => setOpenModal('note')}
//                                 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                                 whileHover={{ scale: 1.05 }}
//                                 whileTap={{ scale: 0.95 }}
//                             >
//                                 <FiPlus className="w-4 h-4" />
//                                 Add Note
//                             </motion.button>
//                         </div>

//                         <div className="space-y-4">
//                             {notes.map((note, index) => (
//                                 <motion.div
//                                     key={note.id}
//                                     initial={{ opacity: 0, x: -20 }}
//                                     animate={{ opacity: 1, x: 0 }}
//                                     transition={{ delay: index * 0.1 }}
//                                     className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
//                                 >
//                                     <p className="text-gray-800 mb-2">{note.content}</p>
//                                     <div className="flex justify-between text-sm text-gray-600">
//                                         <span>By {note.author}</span>
//                                         <span>{note.date} | {note.time}</span>
//                                     </div>
//                                 </motion.div>
//                             ))}
//                         </div>
//                     </motion.div>
//                 );

//             case 'staff':
//                 return (
//                     <motion.div
//                         key="staff"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="flex justify-between items-center mb-6">
//                             <h3 className="text-lg font-semibold text-gray-900">Assigned Staff</h3>
//                             <motion.button
//                                 onClick={() => setOpenModal('staff')}
//                                 className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
//                                 whileHover={{ scale: 1.05 }}
//                                 whileTap={{ scale: 0.95 }}
//                             >
//                                 <FiPlus className="w-4 h-4" />
//                                 Assign Staff
//                             </motion.button>
//                         </div>

//                         <div className="space-y-3">
//                             {staff.map((member, index) => (
//                                 <motion.div
//                                     key={member.id}
//                                     initial={{ opacity: 0, x: -20 }}
//                                     animate={{ opacity: 1, x: 0 }}
//                                     transition={{ delay: index * 0.1 }}
//                                     className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
//                                 >
//                                     <div className="flex-1">
//                                         <div className="font-semibold text-gray-900">{member.name}</div>
//                                         <div className="text-sm text-gray-600">{member.role} • {member.email}</div>
//                                     </div>
//                                     <motion.button
//                                         onClick={() => removeStaff(member.id)}
//                                         className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                                         whileHover={{ scale: 1.1 }}
//                                         whileTap={{ scale: 0.9 }}
//                                     >
//                                         <FiTrash2 className="w-4 h-4" />
//                                     </motion.button>
//                                 </motion.div>
//                             ))}
//                         </div>
//                     </motion.div>
//                 );

//             case 'timelog':
//                 return (
//                     <motion.div
//                         key="timelog"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="flex justify-between items-center mb-6">
//                             <div>
//                                 <h3 className="text-lg font-semibold text-gray-900 mb-2">Time Logs</h3>
//                                 <p className="text-sm text-gray-600">Total Time Spent: <span className="font-semibold">0 Days, 0 Hours, 0 Minutes</span></p>
//                             </div>
//                             <motion.button
//                                 onClick={() => setOpenModal('timelog')}
//                                 className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
//                                 whileHover={{ scale: 1.05 }}
//                                 whileTap={{ scale: 0.95 }}
//                             >
//                                 <FiPlus className="w-4 h-4" />
//                                 Add Time Log
//                             </motion.button>
//                         </div>

//                         <div className="overflow-x-auto">
//                             <table className="w-full text-sm text-left text-gray-700">
//                                 <thead className="bg-gray-50 text-gray-900">
//                                     <tr>
//                                         <th className="px-4 py-3 font-semibold">#</th>
//                                         <th className="px-4 py-3 font-semibold">CREATE</th>
//                                         <th className="px-4 py-3 font-semibold">NAME</th>
//                                         <th className="px-4 py-3 font-semibold">USER</th>
//                                         <th className="px-4 py-3 font-semibold">TIMESTAMP</th>
//                                         <th className="px-4 py-3 font-semibold">SPENT</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {timelogs.map((log, index) => (
//                                         <motion.tr
//                                             key={log.id}
//                                             initial={{ opacity: 0 }}
//                                             animate={{ opacity: 1 }}
//                                             transition={{ delay: index * 0.1 }}
//                                             className="border-b border-gray-200 hover:bg-gray-50"
//                                         >
//                                             <td className="px-4 py-3">{index + 1}</td>
//                                             <td className="px-4 py-3">{log.createDate}</td>
//                                             <td className="px-4 py-3 font-medium">{log.name}</td>
//                                             <td className="px-4 py-3">{log.user}</td>
//                                             <td className="px-4 py-3">{log.timestamp}</td>
//                                             <td className="px-4 py-3">{log.spent}</td>
//                                         </motion.tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </motion.div>
//                 );

//             case 'subtask':
//                 return (
//                     <motion.div
//                         key="subtask"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="flex justify-between items-center mb-6">
//                             <h3 className="text-lg font-semibold text-gray-900">Sub Tasks</h3>
//                             <motion.button
//                                 onClick={() => setOpenModal('subtask')}
//                                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
//                                 whileHover={{ scale: 1.05 }}
//                                 whileTap={{ scale: 0.95 }}
//                             >
//                                 <FiPlus className="w-4 h-4" />
//                                 Add Subtask
//                             </motion.button>
//                         </div>

//                         <div className="overflow-x-auto">
//                             <table className="w-full text-sm text-left text-gray-700">
//                                 <thead className="bg-gray-50 text-gray-900">
//                                     <tr>
//                                         <th className="px-4 py-3 font-semibold">#</th>
//                                         <th className="px-4 py-3 font-semibold">NAME</th>
//                                         <th className="px-4 py-3 font-semibold">STATUS</th>
//                                         <th className="px-4 py-3 font-semibold">ASSIGNED TO</th>
//                                         <th className="px-4 py-3 font-semibold">ACTIONS</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {subtasks.map((task, index) => (
//                                         <motion.tr
//                                             key={task.id}
//                                             initial={{ opacity: 0 }}
//                                             animate={{ opacity: 1 }}
//                                             transition={{ delay: index * 0.1 }}
//                                             className="border-b border-gray-200 hover:bg-gray-50"
//                                         >
//                                             <td className="px-4 py-3">{index + 1}</td>
//                                             <td className="px-4 py-3 font-medium">{task.name}</td>
//                                             <td className="px-4 py-3">
//                                                 <span className={`px-2 py-1 rounded text-xs font-medium ${
//                                                     task.status === 'Completed' ? 'bg-green-100 text-green-800' :
//                                                     task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
//                                                     task.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
//                                                     'bg-gray-100 text-gray-800'
//                                                 }`}>
//                                                     {task.status}
//                                                 </span>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 {task.assignedTo ? 
//                                                     availableStaff.find(s => s.id === parseInt(task.assignedTo))?.name || 'Unknown' 
//                                                     : '-'
//                                                 }
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <motion.button
//                                                     onClick={() => openEditSubtask(task)}
//                                                     className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
//                                                     whileHover={{ scale: 1.1 }}
//                                                     whileTap={{ scale: 0.9 }}
//                                                 >
//                                                     <FiEdit className="w-4 h-4" />
//                                                 </motion.button>
//                                             </td>
//                                         </motion.tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </motion.div>
//                 );

//             case 'documents':
//                 return (
//                     <motion.div
//                         key="documents"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="flex justify-between items-center mb-6">
//                             <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
//                             <motion.button
//                                 onClick={() => setOpenModal('document')}
//                                 className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
//                                 whileHover={{ scale: 1.05 }}
//                                 whileTap={{ scale: 0.95 }}
//                             >
//                                 <FiPlus className="w-4 h-4" />
//                                 Upload Documents
//                             </motion.button>
//                         </div>

//                         <div className="overflow-x-auto">
//                             <table className="w-full text-sm text-left text-gray-700">
//                                 <thead className="bg-gray-50 text-gray-900">
//                                     <tr>
//                                         <th className="px-4 py-3 font-semibold">#</th>
//                                         <th className="px-4 py-3 font-semibold">Name</th>
//                                         <th className="px-4 py-3 font-semibold">Remark</th>
//                                         <th className="px-4 py-3 font-semibold">Type</th>
//                                         <th className="px-4 py-3 font-semibold">Size</th>
//                                         <th className="px-4 py-3 font-semibold">View</th>
//                                         <th className="px-4 py-3 font-semibold">SELECT</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     {documents.map((doc, index) => (
//                                         <motion.tr
//                                             key={doc.id}
//                                             initial={{ opacity: 0 }}
//                                             animate={{ opacity: 1 }}
//                                             transition={{ delay: index * 0.1 }}
//                                             className="border-b border-gray-200 hover:bg-gray-50"
//                                         >
//                                             <td className="px-4 py-3">{index + 1}</td>
//                                             <td className="px-4 py-3 font-medium">{doc.name}</td>
//                                             <td className="px-4 py-3">{doc.remark}</td>
//                                             <td className="px-4 py-3">
//                                                 <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
//                                                     {doc.type}
//                                                 </span>
//                                             </td>
//                                             <td className="px-4 py-3 text-gray-600">{doc.size}</td>
//                                             <td className="px-4 py-3">
//                                                 <motion.button
//                                                     className="p-1 text-blue-600 hover:bg-blue-50 rounded"
//                                                     whileHover={{ scale: 1.1 }}
//                                                     whileTap={{ scale: 0.9 }}
//                                                 >
//                                                     <FiEye className="w-4 h-4" />
//                                                 </motion.button>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <input type="checkbox" className="rounded text-blue-600" />
//                                             </td>
//                                         </motion.tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </motion.div>
//                 );

//             case 'ledger':
//                 return (
//                     <motion.div
//                         key="ledger"
//                         variants={tabContentVariants}
//                         initial="initial"
//                         animate="animate"
//                         exit="exit"
//                         className="bg-white rounded-lg border border-gray-200 p-6"
//                     >
//                         <div className="flex justify-between items-center mb-6">
//                             <div>
//                                 <h3 className="text-lg font-semibold text-gray-900">Ledger Report</h3>
//                                 <div className="flex items-center gap-2 mt-1">
//                                     <span className="text-sm text-gray-600">Period: {ledger.period}</span>
//                                     <motion.button
//                                         onClick={() => setOpenModal('dateRange')}
//                                         className="p-1 text-teal-600 hover:bg-teal-50 rounded"
//                                         whileHover={{ scale: 1.1 }}
//                                         whileTap={{ scale: 0.9 }}
//                                     >
//                                         <FiEdit className="w-3 h-3" />
//                                     </motion.button>
//                                 </div>
//                             </div>
//                             <div className="flex gap-2">
//                                 <motion.button
//                                     className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                                     whileHover={{ scale: 1.05 }}
//                                     whileTap={{ scale: 0.95 }}
//                                 >
//                                     <FiDownload className="w-4 h-4" />
//                                     Export
//                                 </motion.button>
//                                 <motion.button
//                                     className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                                     whileHover={{ scale: 1.05 }}
//                                     whileTap={{ scale: 0.95 }}
//                                 >
//                                     <FiShare2 className="w-4 h-4" />
//                                     Share
//                                 </motion.button>
//                             </div>
//                         </div>

//                         <div className="overflow-x-auto">
//                             <table className="w-full text-sm text-left text-gray-700">
//                                 <thead className="bg-gray-50 text-gray-900">
//                                     <tr>
//                                         <th className="px-4 py-3 font-semibold">Sl</th>
//                                         <th className="px-4 py-3 font-semibold">Date</th>
//                                         <th className="px-4 py-3 font-semibold">Purticulars</th>
//                                         <th className="px-4 py-3 font-semibold">Voucher Type</th>
//                                         <th className="px-4 py-3 font-semibold">Voucher No</th>
//                                         <th className="px-4 py-3 font-semibold">Debit</th>
//                                         <th className="px-4 py-3 font-semibold">Credit</th>
//                                         <th className="px-4 py-3 font-semibold">Balance</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody>
//                                     <tr className="bg-gray-50 font-semibold">
//                                         <td className="px-4 py-3" colSpan="5">Opening Balance</td>
//                                         <td className="px-4 py-3">{ledger.openingBalance}</td>
//                                         <td className="px-4 py-3">0.00</td>
//                                         <td className="px-4 py-3">{ledger.openingBalance}</td>
//                                     </tr>
//                                     {ledger.entries.map((entry, index) => (
//                                         <motion.tr
//                                             key={entry.id}
//                                             initial={{ opacity: 0 }}
//                                             animate={{ opacity: 1 }}
//                                             transition={{ delay: index * 0.1 }}
//                                             className="border-b border-gray-200 hover:bg-gray-50"
//                                         >
//                                             <td className="px-4 py-3">{index + 1}</td>
//                                             <td className="px-4 py-3">{entry.date}</td>
//                                             <td className="px-4 py-3">{entry.particular}</td>
//                                             <td className="px-4 py-3">{entry.voucherType}</td>
//                                             <td className="px-4 py-3">{entry.voucherNo}</td>
//                                             <td className="px-4 py-3">{entry.debit}</td>
//                                             <td className="px-4 py-3">{entry.credit}</td>
//                                             <td className="px-4 py-3">{entry.balance}</td>
//                                         </motion.tr>
//                                     ))}
//                                     <tr className="bg-gray-50 font-semibold">
//                                         <td className="px-4 py-3" colSpan="5">Total</td>
//                                         <td className="px-4 py-3">{ledger.totalDebit}</td>
//                                         <td className="px-4 py-3">{ledger.totalCredit}</td>
//                                         <td className="px-4 py-3">{ledger.closingBalance}</td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>
//                     </motion.div>
//                 );

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
//                     <div className="mb-6">
//                         <h1 className="text-2xl font-bold text-gray-800">Task Profile</h1>
//                     </div>

//                     {/* Header Card */}
//                     <motion.div 
//                         className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
//                         initial={{ opacity: 0, y: -20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4 }}
//                     >
//                         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
//                             <div className="flex items-center gap-4">
//                                 <motion.div 
//                                     className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
//                                     whileHover={{ scale: 1.05, rotate: 5 }}
//                                     transition={{ type: "spring", stiffness: 300 }}
//                                 >
//                                     <FiClipboard className="w-6 h-6 text-blue-600" />
//                                 </motion.div>
//                                 <div>
//                                     <h1 className="text-xl font-bold text-gray-900">{taskData.title}</h1>
//                                     <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
//                                         <div className="flex items-center gap-1">
//                                             <FiUser className="w-3 h-3" />
//                                             {taskData.firm}
//                                         </div>
//                                         <div className="flex items-center gap-1">
//                                             <FiCalendar className="w-3 h-3" />
//                                             Due: {taskData.dueDate}
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-semibold text-sm">
//                                 Fees: ₹{taskData.fees}
//                             </div>
//                         </div>
//                     </motion.div>

//                     {/* Profile Tabs */}
//                     <motion.div 
//                         className="bg-white rounded-lg border border-gray-200 p-1 mb-6"
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         transition={{ delay: 0.2 }}
//                     >
//                         <div className="flex overflow-x-auto">
//                             {profileTabs.map((tab) => {
//                                 const Icon = tab.icon;
//                                 const isActive = activeTab === tab.id;
                                
//                                 return (
//                                     <motion.button
//                                         key={tab.id}
//                                         onClick={() => setActiveTab(tab.id)}
//                                         className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
//                                             isActive 
//                                                 ? 'bg-blue-100 text-blue-700' 
//                                                 : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
//                                         }`}
//                                         whileHover={{ scale: 1.02 }}
//                                         whileTap={{ scale: 0.98 }}
//                                         transition={{ type: "spring", stiffness: 400 }}
//                                     >
//                                         <motion.div
//                                             animate={{ rotate: isActive ? 360 : 0 }}
//                                             transition={{ duration: 0.3 }}
//                                         >
//                                             <Icon className="w-4 h-4" />
//                                         </motion.div>
//                                         {tab.name}
//                                     </motion.button>
//                                 );
//                             })}
//                         </div>
//                     </motion.div>

//                     {/* Tab Content with AnimatePresence */}
//                     <AnimatePresence mode="wait">
//                         {renderTabContent()}
//                     </AnimatePresence>
//                 </div>
//             </div>

//             {/* Modals */}
//             <EditModal
//                 isOpen={openModal === 'edit'}
//                 onClose={closeModal}
//                 field={editModalData.field}
//                 value={editModalData.value}
//                 onSave={saveEdit}
//             />
            
//             <NoteModal
//                 isOpen={openModal === 'note'}
//                 onClose={closeModal}
//                 onAdd={addNote}
//             />
            
//             <StaffModal
//                 isOpen={openModal === 'staff'}
//                 onClose={closeModal}
//                 onAdd={addStaffMember}
//                 availableStaff={availableStaff}
//                 currentStaff={staff}
//             />
            
//             <TimelogModal
//                 isOpen={openModal === 'timelog'}
//                 onClose={closeModal}
//                 onAdd={addTimelog}
//             />
            
//             <SubtaskModal
//                 isOpen={openModal === 'subtask'}
//                 onClose={closeModal}
//                 onAdd={addNewSubtask}
//                 availableStaff={availableStaff}
//                 services={services}
//             />
            
//             <EditSubtaskModal
//                 isOpen={openModal === 'editSubtask'}
//                 onClose={closeModal}
//                 subtask={editingSubtask}
//                 onUpdate={updateSubtask}
//                 availableStaff={availableStaff}
//             />
            
//             <DocumentModal
//                 isOpen={openModal === 'document'}
//                 onClose={closeModal}
//                 onAdd={addNewDocument}
//             />
            
//             <DateRangeModal
//                 isOpen={openModal === 'dateRange'}
//                 onClose={closeModal}
//                 onUpdate={updateDateRange}
//                 currentRange={{ startDate: "01/11/2025", endDate: "26/11/2025" }}
//             />
//         </div>
//     );
// };

// export default TaskProfile;

// import React, { useState, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { useNavigate, useParams } from 'react-router-dom';
// import { Sidebar, Header } from '../components/header';
// import {
//     FiClipboard,
//     FiMessageSquare,
//     FiUsers,
//     FiClock,
//     FiCheckSquare,
//     FiFile,
//     FiDollarSign,
//     FiCalendar,
//     FiUser
// } from 'react-icons/fi';

// // Import tab components only
// import DetailsTab from '../TaskComponent/DetailsTab';
// import NotesTab from '../TaskComponent/NotesTab';
// import StaffTab from '../TaskComponent/StaffTab';
// import TimelogTab from '../TaskComponent/TimelogTab';
// import SubtaskTab from '../TaskComponent/SubTaskTab';
// import DocumentsTab from '../TaskComponent/DocumentTab';
// import LedgerTab from '../TaskComponent/LedgerTab';

// const TaskProfile = () => {
//     const navigate = useNavigate();
//     const { tab } = useParams();
    
//     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
//     const [isMinimized, setIsMinimized] = useState(() => {
//         const saved = localStorage.getItem('sidebarMinimized');
//         return saved ? JSON.parse(saved) : false;
//     });
//     const [activeTab, setActiveTab] = useState(tab || 'details');
    
//     // Update active tab when URL changes
//     useEffect(() => {
//         if (tab) {
//             setActiveTab(tab);
//         }
//     }, [tab]);
    
//     // Task data
//     const [taskData, setTaskData] = useState({
//         title: "Income Tax Return",
//         firm: "RONIT ROY [Individual]",
//         pan: "xxxxx3169A",
//         gst: "",
//         status: "ASSIGNED",
//         fees: "2000.00",
//         createDate: "10/11/2025 | 12:30:04 AM",
//         createBy: "RECURRING",
//         assignedCA: "",
//         mentor: "",
//         dueDate: "20/11/2025"
//     });

//     // Sample data for tabs
//     const [notes, setNotes] = useState([
//         { id: 1, content: "Client needs to submit Form 16", author: "Admin", date: "15/11/2025", time: "10:30 AM" },
//         { id: 2, content: "Documents verified and processed", author: "CA Rajesh", date: "16/11/2025", time: "02:15 PM" }
//     ]);

//     const [staff, setStaff] = useState([
//         { id: 1, name: "Rajesh Kumar", role: "Senior CA", email: "rajesh@firm.com" },
//         { id: 2, name: "Priya Sharma", role: "Tax Specialist", email: "priya@firm.com" }
//     ]);

//     const availableStaff = [
//         { id: 1, name: "Rajesh Kumar", role: "Senior CA" },
//         { id: 2, name: "Priya Sharma", role: "Tax Specialist" },
//         { id: 3, name: "Amit Patel", role: "Junior CA" },
//         { id: 4, name: "Sneha Reddy", role: "Audit Assistant" }
//     ];

//     const [timelogs, setTimelogs] = useState([
//         { id: 1, createDate: "15/11/2025", name: "Document Review", user: "Rajesh", timestamp: "10:30 AM", spent: "2" },
//         { id: 2, createDate: "16/11/2025", name: "Tax Calculation", user: "Priya", timestamp: "02:15 PM", spent: "1.5" }
//     ]);

//     const [subtasks, setSubtasks] = useState([
//         { id: 1, name: "Collect Form 16", status: "Completed", assignedTo: "1", completedBy: "Rajesh" },
//         { id: 2, name: "Verify Investments", status: "In Progress", assignedTo: "2", completedBy: "" },
//         { id: 3, name: "File Return", status: "Pending", assignedTo: "", completedBy: "" }
//     ]);

//     const [documents, setDocuments] = useState([
//         { id: 1, name: "Form16.pdf", remark: "Client submitted", type: "PDF", size: "2.3 MB" },
//         { id: 2, name: "InvestmentProofs.pdf", remark: "Verified", type: "PDF", size: "1.8 MB" }
//     ]);

//     const [ledger, setLedger] = useState({
//         period: "01/11/2025 - 26/11/2025",
//         entries: [
//             { id: 1, date: "14/11/2025", particular: "0 - CASH - 0 [CASH]", voucherType: "RECEIVED", voucherNo: "RCV/3", debit: "0.00", credit: "500.00", balance: "5,998.00" }
//         ],
//         openingBalance: "6,498.00",
//         totalDebit: "6,498.00",
//         totalCredit: "500.00",
//         closingBalance: "5,998.00"
//     });

//     // Profile tabs with paths
//     const profileTabs = [
//         { id: 'details', name: 'Details', icon: FiClipboard, path: '/task/profile/details' },
//         { id: 'notes', name: 'Notes', icon: FiMessageSquare, path: '/task/profile/notes' },
//         { id: 'staff', name: 'Staff', icon: FiUsers, path: '/task/profile/staff' },
//         { id: 'timelog', name: 'Timelog', icon: FiClock, path: '/task/profile/timelog' },
//         { id: 'subtask', name: 'Subtask', icon: FiCheckSquare, path: '/task/profile/subtask' },
//         { id: 'documents', name: 'Documents', icon: FiFile, path: '/task/profile/documents' },
//         { id: 'ledger', name: 'Ledger', icon: FiDollarSign, path: '/task/profile/ledger' }
//     ];

//     // Handle tab change with navigation
//     const handleTabChange = (tabId) => {
//         setActiveTab(tabId);
//         navigate(`/task/profile/${tabId}`);
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
//             availableStaff
//         };

//         switch (activeTab) {
//             case 'details':
//                 return <DetailsTab key="details" taskData={taskData} {...props} />;
//             case 'notes':
//                 return <NotesTab key="notes" notes={notes} setNotes={setNotes} {...props} />;
//             case 'staff':
//                 return <StaffTab key="staff" staff={staff} setStaff={setStaff} availableStaff={availableStaff} {...props} />;
//             case 'timelog':
//                 return <TimelogTab key="timelog" timelogs={timelogs} setTimelogs={setTimelogs} {...props} />;
//             case 'subtask':
//                 return <SubtaskTab key="subtask" subtasks={subtasks} setSubtasks={setSubtasks} availableStaff={availableStaff} {...props} />;
//             case 'documents':
//                 return <DocumentsTab key="documents" documents={documents} setDocuments={setDocuments} {...props} />;
//             case 'ledger':
//                 return <LedgerTab key="ledger" ledger={ledger} setLedger={setLedger} {...props} />;
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
//                     {/* Header Card */}
//                     <motion.div 
//                         className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
//                         initial={{ opacity: 0, y: -20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4 }}
//                     >
//                         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
//                             <div className="flex items-center gap-4">
//                                 <motion.div 
//                                     className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"
//                                     whileHover={{ scale: 1.05, rotate: 5 }}
//                                 >
//                                     <FiClipboard className="w-6 h-6 text-blue-600" />
//                                 </motion.div>
//                                 <div>
//                                     <h1 className="text-xl font-bold text-gray-900">{taskData.title}</h1>
//                                     <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
//                                         <div className="flex items-center gap-1">
//                                             <FiUser className="w-3 h-3" />
//                                             {taskData.firm}
//                                         </div>
//                                         <div className="flex items-center gap-1">
//                                             <FiCalendar className="w-3 h-3" />
//                                             Due: {taskData.dueDate}
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-semibold text-sm">
//                                 Fees: ₹{taskData.fees}
//                             </div>
//                         </div>
//                     </motion.div>

//                     {/* Profile Tabs */}
//                     <motion.div 
//                         className="bg-white rounded-lg border border-gray-200 p-1 mb-6"
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         transition={{ delay: 0.2 }}
//                     >
//                         <div className="flex overflow-x-auto">
//                             {profileTabs.map((tab) => {
//                                 const Icon = tab.icon;
//                                 const isActive = activeTab === tab.id;
                                
//                                 return (
//                                     <motion.button
//                                         key={tab.id}
//                                         onClick={() => handleTabChange(tab.id)}
//                                         className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
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

// export default TaskProfile;