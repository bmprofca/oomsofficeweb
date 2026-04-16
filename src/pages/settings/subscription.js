import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header, Sidebar } from '../../components/header';
import { FiCreditCard, FiCheck, FiStar, FiZap, FiCalendar } from 'react-icons/fi';

const Subscription = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(() => {
        const saved = localStorage.getItem('sidebarMinimized');
        return saved ? JSON.parse(saved) : false;
    });
    const [loading, setLoading] = useState(false);
    const [activePlans, setActivePlans] = useState([]);

    // Persist sidebar minimized state
    useEffect(() => {
        localStorage.setItem('sidebarMinimized', JSON.stringify(isMinimized));
    }, [isMinimized]);

    // Lock body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [mobileMenuOpen]);

    // Mock data - replace with actual API calls
    const mockActivePlans = [
        {
            plan_name: 'starter',
            total_client: '500',
            total_staff: '2',
            total_task: '1000',
            total_bank: 'unlimited',
            expire_date: '2024-12-31',
            status: 'active'
        },
        {
            plan_name: 'silver',
            total_client: 'unlimited',
            total_staff: 'unlimited',
            total_task: 'unlimited',
            total_bank: 'unlimited',
            expire_date: '2024-06-30',
            status: 'expired'
        }
    ];

    const subscriptionPlans = [
        {
            id: 'starter',
            name: 'Starter',
            originalPrice: 299,
            discountedPrice: 199,
            duration: 'month',
            features: [
                '500 client create',
                '2 staff create',
                '1,000 task create',
                'Broadcast access',
                'Document Management',
                'Gateway access'
            ],
            icon: FiStar,
            color: 'blue'
        },
        {
            id: 'standard',
            name: 'Standard',
            originalPrice: 2999,
            discountedPrice: 1999,
            duration: 'year',
            features: [
                '1000 client create',
                '3 staff create',
                '5,000 task create',
                'Broadcast access',
                'Document Management',
                'Gateway access'
            ],
            icon: FiZap,
            color: 'green'
        },
        {
            id: 'silver',
            name: 'Silver',
            originalPrice: 999,
            discountedPrice: 499,
            duration: 'month',
            features: [
                'Unlimited client create',
                'Unlimited staff create',
                'Unlimited task create',
                'Broadcast access',
                'Document Management',
                'Gateway access'
            ],
            icon: FiStar,
            color: 'gray'
        },
        {
            id: 'gold',
            name: 'Gold',
            originalPrice: 2799,
            discountedPrice: 1399,
            duration: '3 months',
            features: [
                'Unlimited client create',
                'Unlimited staff create',
                'Unlimited task create',
                'Broadcast access',
                'Document Management',
                'Gateway access'
            ],
            icon: FiZap,
            color: 'yellow'
        },
        {
            id: 'platinum',
            name: 'Platinum',
            originalPrice: 5399,
            discountedPrice: 2599,
            duration: '6 months',
            features: [
                'Unlimited client create',
                'Unlimited staff create',
                'Unlimited task create',
                'Broadcast access',
                'Document Management',
                'Gateway access'
            ],
            icon: FiZap,
            color: 'purple'
        },
        {
            id: 'diamond',
            name: 'Diamond',
            originalPrice: 9999,
            discountedPrice: 4999,
            duration: 'year',
            features: [
                'Unlimited client create',
                'Unlimited staff create',
                'Unlimited task create',
                'Broadcast access',
                'Document Management',
                'Gateway access'
            ],
            icon: FiZap,
            color: 'pink'
        }
    ];

    // Load initial data
    useEffect(() => {
        fetchActivePlans();
    }, []);

    const fetchActivePlans = async () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setActivePlans(mockActivePlans);
            setLoading(false);
        }, 1000);
    };

    const calculateGSTPrice = (price) => {
        return (price * 1.18).toFixed(2); // 18% GST
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    };

    const getStatusBadge = (status) => {
        return status === 'active' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                Active
            </span>
        ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                Expired
            </span>
        );
    };

    const handleBuyPlan = async (planId) => {
        setLoading(true);
        
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            // In real implementation, this would redirect to payment gateway
            alert(`Redirecting to payment for ${planId} plan...`);
            // window.location.href = response.payment_link
        }, 1000);
    };

    const getColorClasses = (color) => {
        const colorMap = {
            blue: 'border-blue-500 text-blue-600 bg-blue-50',
            green: 'border-green-500 text-green-600 bg-green-50',
            gray: 'border-gray-500 text-gray-600 bg-gray-50',
            yellow: 'border-yellow-500 text-yellow-600 bg-yellow-50',
            purple: 'border-purple-500 text-purple-600 bg-purple-50',
            pink: 'border-pink-500 text-pink-600 bg-pink-50'
        };
        return colorMap[color] || colorMap.blue;
    };

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

            {/* Main content */}
            <div className={`pt-16 transition-all duration-300 ease-in-out ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
                <div className="max-w-full mx-auto px-4 sm:px-6 md:px-8 py-6">
                    <div className="h-full flex flex-col">
                        {/* Active Plans Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                            <div className="border-b border-gray-200 px-6 py-4">
                                <h5 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FiCreditCard className="w-5 h-5" />
                                    Your Active Plans
                                </h5>
                                <p className="text-gray-500 text-xs mt-1">
                                    View and manage your active subscription plans
                                </p>
                            </div>
                            <div className="p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">#</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Plan</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Total Client</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Total Staff</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Total Task</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Total Bank</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Expire Date</th>
                                                <th className="text-left p-4 font-semibold text-gray-700 text-sm">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan="8" className="p-8 text-center">
                                                        <div className="flex justify-center items-center">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : activePlans.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="p-8 text-center text-gray-500">
                                                        No active plans found
                                                    </td>
                                                </tr>
                                            ) : (
                                                activePlans.map((plan, index) => (
                                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-4 text-sm text-gray-600 font-medium">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="font-semibold text-gray-800 capitalize">
                                                                {plan.plan_name}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            {plan.total_client === 'unlimited' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                    Unlimited
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-700">
                                                                    {parseInt(plan.total_client).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {plan.total_staff === 'unlimited' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                    Unlimited
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-700">
                                                                    {parseInt(plan.total_staff).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {plan.total_task === 'unlimited' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                    Unlimited
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-700">
                                                                    {parseInt(plan.total_task).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {plan.total_bank === 'unlimited' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                    Unlimited
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-700">
                                                                    {parseInt(plan.total_bank).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-gray-700 font-medium">
                                                            {formatDate(plan.expire_date)}
                                                        </td>
                                                        <td className="p-4">
                                                            {getStatusBadge(plan.status)}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Subscription Plans Section */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            <div className="border-b border-gray-200 px-6 py-4">
                                <h5 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <FiCreditCard className="w-5 h-5" />
                                    Available Subscription Plans
                                </h5>
                                <p className="text-gray-500 text-xs mt-1">
                                    Choose the perfect plan for your business needs
                                </p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {subscriptionPlans.map((plan) => {
                                        const IconComponent = plan.icon;
                                        const gstPrice = calculateGSTPrice(plan.discountedPrice);
                                        
                                        return (
                                            <motion.div 
                                                key={plan.id} 
                                                className={`border-2 rounded-lg shadow-sm transition-all hover:shadow-md ${getColorClasses(plan.color)}`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="p-6">
                                                    {/* Plan Header */}
                                                    <div className="text-center mb-4">
                                                        <div className="flex justify-center mb-3">
                                                            <div className={`p-3 rounded-full ${getColorClasses(plan.color)}`}>
                                                                <IconComponent className="w-6 h-6" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-semibold text-gray-800 capitalize mb-1">
                                                            {plan.name}
                                                        </h3>
                                                        <div className="text-red-500 text-sm line-through font-medium">
                                                            ₹{plan.originalPrice}/{plan.duration}
                                                        </div>
                                                    </div>

                                                    {/* Pricing */}
                                                    <div className="text-center mb-6">
                                                        <div className="flex justify-center items-baseline">
                                                            <span className="text-gray-600 text-lg mr-1">₹</span>
                                                            <span className="text-3xl font-bold text-gray-800">
                                                                {plan.discountedPrice}
                                                            </span>
                                                            <span className="text-gray-600 text-lg ml-1">
                                                                /{plan.duration}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Features */}
                                                    <ul className="space-y-3 mb-6">
                                                        {plan.features.map((feature, index) => (
                                                            <li key={index} className="flex items-center gap-3 text-gray-700">
                                                                <FiCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                                <span className="text-sm">{feature}</span>
                                                            </li>
                                                        ))}
                                                    </ul>

                                                    {/* Buy Button */}
                                                    <motion.button
                                                        onClick={() => handleBuyPlan(plan.id)}
                                                        disabled={loading}
                                                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                        title={`18% GST included - Total: ₹${gstPrice}`}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <FiCreditCard className="w-4 h-4" />
                                                        {loading ? 'Processing...' : `Buy @ ₹${gstPrice}`}
                                                    </motion.button>

                                                    {/* GST Note */}
                                                    <div className="text-xs text-gray-500 text-center mt-2">
                                                        *18% GST included
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;