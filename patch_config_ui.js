const fs = require('fs');
let c = fs.readFileSync('app/guest-experience/config/page.tsx', 'utf8');

if (!c.includes('import { DashboardLayout }')) {
  // Add DashboardLayout import
  c = c.replace('import { useState, useEffect } from "react"', 'import { useState, useEffect } from "react"\nimport { DashboardLayout } from "@/components/dashboard-layout"');
  
  // Wrap main div with DashboardLayout
  c = c.replace('<div className="min-h-screen bg-[#F3F0E6]', '<DashboardLayout>\n    <div className="min-h-screen bg-[#F3F0E6]');
  c = c.replace('      </div>\n    </div>\n  )\n}', '      </div>\n    </div>\n    </DashboardLayout>\n  )\n}');
  
  // Update state for slideOverrides and feedbackQuestions
  c = c.replace(
    'kioskLabel: "Reception Lobby",',
    'kioskLabel: "Reception Lobby",\n    slideOverrides: {} as Record<string, {title: string, subtitle: string}>,\n    feedbackQuestions: [] as string[],'
  );
  
  fs.writeFileSync('app/guest-experience/config/page.tsx', c);
  console.log('DashboardLayout applied');
}
