const fs = require('fs');
let code = fs.readFileSync('components/dashboard-layout.tsx', 'utf8');

// Add Email Marketing to main navigation
const newNavItems = `    { name: "Email Marketing", icon: Mail, permission: "email_marketing.view" },
    { name: "Guest Experience", icon: Star, permission: "guest_experience.view" },`;

code = code.replace(
  '{ name: "Marketing Reports", icon: TrendingUp, permission: "marketing.view" },',
  `{ name: "Marketing Reports", icon: TrendingUp, permission: "marketing.view" },\n${newNavItems}`
);

// Add submenus
const subMenus = `
  const emailMarketingSubMenu = [
    { name: "Email Campaigns", href: "/email-marketing/campaigns", icon: Mail, permission: "email_marketing.view" },
    { name: "Create Campaign", href: "/email-marketing/campaigns/create", icon: PlusCircle, permission: "email_marketing.view" },
    { name: "Email Configuration", href: "/admin/email-configuration", icon: Settings, permission: "email_marketing.view" },
  ]
  const guestExperienceSubMenu = [
    { name: "Guest Experience (Dark)", href: "/guest-experience", icon: Moon, permission: "guest_experience.view" },
    { name: "Guest Experience (Light)", href: "/guest-experience-light", icon: Sun, permission: "guest_experience.view" },
    { name: "Guest Feedback", href: "/guest-experience/feedback", icon: MessageSquare, permission: "guest_experience.view" },
    { name: "Guest Explore", href: "/guest-experience/explore", icon: Map, permission: "guest_experience.view" },
  ]
`;

code = code.replace(
  'const marketingSubMenu = [',
  `${subMenus}\n  const marketingSubMenu = [`
);

// Add to imports
code = code.replace(
  'import { LayoutDashboard, Users, UserCheck, Stethoscope, PhoneCall, TrendingUp, Shuffle, UserCog, Settings, LogOut, ChevronDown, Bell, Search, Database, FileText, Upload, RefreshCw, Smartphone, Phone, CheckCircle, TicketIcon, Bot, Link, Check, ArrowRight, Play, Pause, Save, LayoutGrid, AlertTriangle, MessageCircle, MoreVertical, Key, Webhook, Fingerprint, Calendar as CalendarIcon, Sparkles, X, Menu, IndianRupee, MapPin, SearchSlash, Receipt, Building2, StickyNote, Download, Mail, Zap, Target, Edit } from "lucide-react"',
  'import { LayoutDashboard, Users, UserCheck, Stethoscope, PhoneCall, TrendingUp, Shuffle, UserCog, Settings, LogOut, ChevronDown, Bell, Search, Database, FileText, Upload, RefreshCw, Smartphone, Phone, CheckCircle, TicketIcon, Bot, Link, Check, ArrowRight, Play, Pause, Save, LayoutGrid, AlertTriangle, MessageCircle, MoreVertical, Key, Webhook, Fingerprint, Calendar as CalendarIcon, Sparkles, X, Menu, IndianRupee, MapPin, SearchSlash, Receipt, Building2, StickyNote, Download, Mail, Zap, Target, Edit, Moon, Sun, MessageSquare, Map, PlusCircle, Star } from "lucide-react"'
);

// Add logic to toggle submenus
code = code.replace(
  'const [isMarketingOpen, setIsMarketingOpen] = useState(false)',
  `const [isMarketingOpen, setIsMarketingOpen] = useState(false)
  const [isEmailMarketingOpen, setIsEmailMarketingOpen] = useState(false)
  const [isGuestExperienceOpen, setIsGuestExperienceOpen] = useState(false)`
);

// Find renderNavigationItem logic
code = code.replace(
  'if (item.name === "KAPPL New Order") setIsKapplNewOrderOpen(!isKapplNewOrderOpen)',
  `if (item.name === "KAPPL New Order") setIsKapplNewOrderOpen(!isKapplNewOrderOpen)
      if (item.name === "Email Marketing") setIsEmailMarketingOpen(!isEmailMarketingOpen)
      if (item.name === "Guest Experience") setIsGuestExperienceOpen(!isGuestExperienceOpen)`
);

// Submenu rendering logic
const submenuRender = `
        {item.name === "Email Marketing" && isEmailMarketingOpen && (
          <div className="ml-8 mt-2 space-y-1">
            {emailMarketingSubMenu.map((subItem) => (
              <Link
                key={subItem.name}
                href={subItem.href}
                className={\`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors \${
                  pathname === subItem.href
                    ? "bg-amber-100 text-amber-900 font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }\`}
                onClick={() => { if (isMobile) setIsMobileMenuOpen(false) }}
              >
                <subItem.icon className="w-4 h-4" />
                <span>{subItem.name}</span>
              </Link>
            ))}
          </div>
        )}
        {item.name === "Guest Experience" && isGuestExperienceOpen && (
          <div className="ml-8 mt-2 space-y-1">
            {guestExperienceSubMenu.map((subItem) => (
              <Link
                key={subItem.name}
                href={subItem.href}
                className={\`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors \${
                  pathname === subItem.href
                    ? "bg-amber-100 text-amber-900 font-medium"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }\`}
                onClick={() => { if (isMobile) setIsMobileMenuOpen(false) }}
              >
                <subItem.icon className="w-4 h-4" />
                <span>{subItem.name}</span>
              </Link>
            ))}
          </div>
        )}
`;

code = code.replace(
  '{item.name === "KAPPL New Order" && isKapplNewOrderOpen && (',
  `${submenuRender}
        {item.name === "KAPPL New Order" && isKapplNewOrderOpen && (`
);

// Searchable items
code = code.replace(
  'crrFmsSubMenu.forEach((item) => { if (item.href) searchableItems.push({ name: item.name, href: item.href, description: item.name, icon: item.icon }) })',
  `crrFmsSubMenu.forEach((item) => { if (item.href) searchableItems.push({ name: item.name, href: item.href, description: item.name, icon: item.icon }) })
  emailMarketingSubMenu.forEach((item) => { if (item.href) searchableItems.push({ name: item.name, href: item.href, description: item.name, icon: item.icon }) })
  guestExperienceSubMenu.forEach((item) => { if (item.href) searchableItems.push({ name: item.name, href: item.href, description: item.name, icon: item.icon }) })`
);

fs.writeFileSync('components/dashboard-layout.tsx', code);
