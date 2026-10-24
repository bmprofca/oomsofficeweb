import React, { useState } from "react";
import { Header, Sidebar } from "../../components/header";
import AppointmentManager from "../../ClientComponents/AppointmentManager";

const AppointmentsPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved ? JSON.parse(saved) : false;
  });

  return (
    <div className="app-page">
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
      <main className={`min-h-screen pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}>
        <div className="mx-3 my-3 sm:mx-5 sm:my-4 lg:mx-8 lg:my-5">
          <AppointmentManager />
        </div>
      </main>
    </div>
  );
};

export default AppointmentsPage;
