const fs = require('fs');
let code = fs.readFileSync('components/dashboard-layout.tsx', 'utf8');

const injection = `
    if (item.name === "Email Marketing") {
      const isEmailActive = pathname.startsWith("/email-marketing") || pathname.startsWith("/admin/email-configuration")
      return (
        <div key={item.name}>
          <button onClick={() => setIsEmailMarketingOpen(!isEmailMarketingOpen)} className={\`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 \${isEmailActive ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}\`}>
            <item.icon className={\`mr-3 h-5 w-5 \${isEmailActive ? "text-white" : "text-red-500"}\`} />
            {item.name}
            {isEmailMarketingOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {isEmailMarketingOpen && (
            <div className="ml-6 mt-2 space-y-1">
              {emailMarketingSubMenu.map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={\`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 \${pathname === subItem.href ? "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-l-4 border-red-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}\`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={\`mr-3 h-4 w-4 \${pathname === subItem.href ? "text-red-600" : "text-gray-500"}\`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (item.name === "Guest Experience") {
      const isGuestActive = pathname.startsWith("/guest-experience")
      return (
        <div key={item.name}>
          <button onClick={() => setIsGuestExperienceOpen(!isGuestExperienceOpen)} className={\`group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 \${isGuestActive ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md" : "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}\`}>
            <item.icon className={\`mr-3 h-5 w-5 \${isGuestActive ? "text-white" : "text-amber-500"}\`} />
            {item.name}
            {isGuestExperienceOpen ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {isGuestExperienceOpen && (
            <div className="ml-6 mt-2 space-y-1">
              {guestExperienceSubMenu.map((subItem) => (
                <Link key={subItem.name} href={subItem.href} className={\`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 \${pathname === subItem.href ? "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border-l-4 border-amber-500 shadow-sm" : "text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900"}\`} onClick={() => isMobile && setSidebarOpen(false)}>
                  <subItem.icon className={\`mr-3 h-4 w-4 \${pathname === subItem.href ? "text-amber-600" : "text-gray-500"}\`} />
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link key={item.name} href={item.href}`;

code = code.replace(
  '    return (\n      <Link key={item.name} href={item.href}',
  injection
);

// We also need to add searchableItems injection!
const searchableInjection = \`
  if (hasPermission("email_marketing.view") || isSuperAdmin) emailMarketingSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
  if (hasPermission("guest_experience.view") || isSuperAdmin) guestExperienceSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))
\`;

code = code.replace(
  '  if (hasPermission("marketing.view") || isSuperAdmin)',
  \`\${searchableInjection}\n  if (hasPermission("marketing.view") || isSuperAdmin)\`
);

fs.writeFileSync('components/dashboard-layout.tsx', code);
