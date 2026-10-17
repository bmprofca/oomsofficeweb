import React, { useEffect, useState } from "react";
import { Header, Sidebar } from "../../components/header";
import { ComplianceFirmAssignmentBoard } from "./ComplianceFirmAssignmentBoard";

const ComplianceFirmAssignment = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() =>
    JSON.parse(localStorage.getItem("sidebarMinimized") || "false"),
  );

  useEffect(() => {
    localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
  }, [isMinimized]);

  return (
    <div className="app-page">
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
        className={`pt-16 transition-all duration-300 ${isMinimized ? "md:pl-20" : "md:pl-[260px]"}`}
      >
        <div className="mx-3 my-3 sm:mx-5 sm:my-4 lg:mx-8 lg:my-5">
          <ComplianceFirmAssignmentBoard embedded={false} />
        </div>
      </div>
    </div>
  );
};

export default ComplianceFirmAssignment;
