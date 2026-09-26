const fs = require('fs');

const file = 'app/guest-experience/config/page.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. We'll change `const Section = ` to just `function Section({ ... })` OUTSIDE the component
// Wait, actually, let's just use it as a simple function not a React Component (e.g. rename to renderSection)
// Or pass the state down.
// Since we only have a few places, let's just make it a valid component outside and pass props.

// First, remove Section and Field from inside.
// Then insert them outside.
// Let's replace the inner definitions.
const innerSectionRegex = /  const Section = \(\{ id, title, icon: Icon, children \}: any\) => \([\s\S]*?  \)\n\n  const Field = \(\{ label, children \}: any\) => \([\s\S]*?  \)\n/g;

c = c.replace(innerSectionRegex, '');

const outerComponents = `
function Section({ id, title, icon: Icon, children, openSection, setOpenSection }: any) {
  return (
    <div className="border border-[#E0D8C3] rounded-2xl overflow-hidden mb-4 shadow-sm bg-white">
      <button
        onClick={() => setOpenSection(openSection === id ? null : id)}
        className="w-full flex items-center justify-between px-5 py-4 bg-[#FDFBF7] hover:bg-[#F5F0E8] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-[#C74B26]" />
          <span className="font-semibold text-[#132A13]">{title}</span>
        </div>
        {openSection === id ? <ChevronUp className="w-4 h-4 text-[#4A5D4E]" /> : <ChevronDown className="w-4 h-4 text-[#4A5D4E]" />}
      </button>
      {openSection === id && (
        <div className="px-5 py-5 border-t border-[#E0D8C3] space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#4A5D4E] uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  )
}
`;

// Insert after imports
c = c.replace('const LANG_LABELS: Record<string, string> = {', outerComponents + '\nconst LANG_LABELS: Record<string, string> = {');

// Update all <Section to <Section openSection={openSection} setOpenSection={setOpenSection}
c = c.replace(/<Section /g, '<Section openSection={openSection} setOpenSection={setOpenSection} ');

fs.writeFileSync(file, c);
console.log('Fixed ESLint in config/page.tsx');
