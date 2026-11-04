/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import { GlobalTargetBar } from './components/Target/GlobalTargetBar';
import { ScannerView } from './components/Scanner/ScannerView';
import { HeaderAuditorView } from './components/Headers/HeaderAuditorView';
import { ControlledLabView } from './components/Lab/ControlledLabView';
import { SecureAuthView } from './components/Auth/SecureAuthView';
import { ProjectReportView } from './components/Report/ProjectReportView';
import { AppDownloadModal } from './components/AppDownload/AppDownloadModal';
import { controlledLab, LabSecurityLevel } from './services/controlledLabServer';
import { Shield, Download } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('scanner');
  const [securityLevel, setSecurityLevel] = useState<LabSecurityLevel>(
    controlledLab.getSecurityLevel()
  );
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const handleToggleSecurityLevel = () => {
    const nextLevel: LabSecurityLevel = securityLevel === 'VULNERABLE' ? 'HARDENED' : 'VULNERABLE';
    controlledLab.setSecurityLevel(nextLevel);
    setSecurityLevel(nextLevel);
  };

  const handleSetSecurityLevel = (level: LabSecurityLevel) => {
    controlledLab.setSecurityLevel(level);
    setSecurityLevel(level);
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Navigation Top Bar conforming to 3-zone contract */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        securityLevel={securityLevel}
        onToggleSecurityLevel={handleToggleSecurityLevel}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Global Target Bar: Change target instantly & easily across all security tools */}
      <GlobalTargetBar
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
      />

      {/* Native Desktop Client Download (Windows, Mac, Linux) & Open in App Modal */}
      <AppDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'scanner' && (
          <ScannerView
            onNavigateToReport={() => setActiveTab('report')}
            securityLevel={securityLevel}
            onSetSecurityLevel={handleSetSecurityLevel}
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          />
        )}

        {activeTab === 'headers' && <HeaderAuditorView />}

        {activeTab === 'auth' && <SecureAuthView />}

        {activeTab === 'lab' && (
          <ControlledLabView
            securityLevel={securityLevel}
            onToggleSecurityLevel={handleToggleSecurityLevel}
          />
        )}

        {activeTab === 'report' && (
          <ProjectReportView
            onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#05070c] py-6 px-6 text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-400">SHIYAS NetLab Platform</span>
            <span>·</span>
            <span>Created by Shiyas Ibrahim</span>
            <span>·</span>
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Download Desktop App (Win/Mac/Linux)</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Controlled Academic Environment</span>
            <span>·</span>
            <span>OWASP Top 10 & NIST SP 800-63B Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
