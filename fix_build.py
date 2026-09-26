import re

with open('components/dashboard-layout.tsx', 'r') as f:
    code = f.read()

# Add missing state variables
state_pattern = r'const \[marketingExpanded, setMarketingExpanded\] = useState\(false\)'
state_replacement = r'const [marketingExpanded, setMarketingExpanded] = useState(false)\n  const [isEmailMarketingOpen, setIsEmailMarketingOpen] = useState(false)\n  const [isGuestExperienceOpen, setIsGuestExperienceOpen] = useState(false)'
code = re.sub(state_pattern, state_replacement, code)

# Fix TS errors on description by casting item to any
code = code.replace(
    'if (hasPermission("email_marketing.view") || isSuperAdmin) emailMarketingSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))',
    'if (hasPermission("email_marketing.view") || isSuperAdmin) emailMarketingSubMenu.forEach((item: any) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))'
)

code = code.replace(
    'if (hasPermission("guest_experience.view") || isSuperAdmin) guestExperienceSubMenu.forEach((item) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))',
    'if (hasPermission("guest_experience.view") || isSuperAdmin) guestExperienceSubMenu.forEach((item: any) => searchableItems.push({ name: item.name, href: item.href, description: item.description || item.name, icon: item.icon }))'
)

with open('components/dashboard-layout.tsx', 'w') as f:
    f.write(code)
