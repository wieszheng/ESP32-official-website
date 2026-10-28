import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { GitHubStarProvider } from './context/GitHubStarContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { InteractiveClockMatrix } from './components/InteractiveClockMatrix';
import { CapabilitiesBento } from './components/CapabilitiesBento';
import { HardwareDeepDive } from './components/HardwareDeepDive';
import { DeveloperHub } from './components/DeveloperHub';
import { SpecsTable } from './components/SpecsTable';
import { OpenSourceDownloads } from './components/OpenSourceDownloads';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { WebFlasherModal } from './components/WebFlasherModal';

function AppContent() {
  const [isFlasherOpen, setIsFlasherOpen] = useState<boolean>(false);

  const handleOpenFlasher = () => {
    setIsFlasherOpen(true);
  };

  const handleCloseFlasher = () => {
    setIsFlasherOpen(false);
  };

  const handleExploreSimulator = () => {
    const el = document.getElementById('simulator');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D14] text-slate-900 dark:text-[#E2E8F0] flex flex-col font-sans selection:bg-[#E60012]/30 selection:text-white transition-colors duration-200">
      {/* 3-Zone Top Navigation Bar */}
      <Navbar onOpenFlasher={handleOpenFlasher} />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          onOpenFlasher={handleOpenFlasher}
          onExploreSimulator={handleExploreSimulator}
        />

        {/* Real-time Interactive Clock & Pixel Studio Simulator */}
        <InteractiveClockMatrix />

        {/* Core Capabilities Bento Grid */}
        <CapabilitiesBento />

        {/* Hardware Teardown & Interactive Component Inspector */}
        <HardwareDeepDive />

        {/* Developer Hub & Firmware Code Snippets */}
        <DeveloperHub onOpenFlasher={handleOpenFlasher} />

        {/* Detailed Hardware Specifications Table */}
        <SpecsTable />

        {/* 100% Open Source Hardware & CAD Downloads */}
        <OpenSourceDownloads />

        {/* FAQ & Engineering Details */}
        <FAQSection />
      </main>

      {/* Clean Footer */}
      <Footer />

      {/* Interactive WebSerial Browser Flasher Modal */}
      <WebFlasherModal
        isOpen={isFlasherOpen}
        onClose={handleCloseFlasher}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <GitHubStarProvider>
        <AppContent />
      </GitHubStarProvider>
    </ThemeProvider>
  );
}

