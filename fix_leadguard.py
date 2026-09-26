import re

with open('app/lead-lost-monitor/page.tsx', 'r') as f:
    content = f.read()

# Find the <aside className="sidebar"> block and remove it
# It looks like: <aside className="sidebar">...<div className="user">...</div></aside>
aside_pattern = r'<aside className="sidebar">.*?</aside>'
content = re.sub(aside_pattern, '', content, flags=re.DOTALL)

# But wait, we need to extract those two buttons:
# <button onClick={() => openDetailed("Open incidents", ...)}>...</button>
# <button onClick={() => openDetailed("Duplicate proof", ...)}>...</button>
# Let's just append them to the topbar.

# Find the topbar: <header className="topbar"><div>...</div>...
topbar_pattern = r'(<header className="topbar"><div>.*?</div>)'
replacement = r'\1<div className="topbar-actions" style={{display: "flex", gap: "10px", marginLeft: "auto", marginRight: "20px"}}><button onClick={() => openDetailed("Open incidents", x => x.status !== "Resolved")} style={{padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: "bold"}}>! Incidents {summary.breaches + openLoss}</button><button onClick={() => openDetailed("Duplicate proof", x => x.validDuplicate ?? Boolean(x.original))} style={{padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: "bold"}}>⌘ Duplicate proof</button></div>'
content = re.sub(topbar_pattern, replacement, content, count=1)

with open('app/lead-lost-monitor/page.tsx', 'w') as f:
    f.write(content)

with open('app/lead-lost-monitor/leadguard-globals.css', 'r') as f:
    css = f.read()
    
# Make sure .shell doesn't constrain
css = css.replace('.shell{display:flex}', '.shell{display:flex;width:100%;}')
css = css.replace('.sidebar{', '.sidebar-hidden{')
css = css.replace('main{flex:1;min-width:0;padding:24px 34px 50px}', 'main{flex:1;min-width:0;padding:0px 10px 50px;}') # Reduce padding since DashboardLayout already has p-6

with open('app/lead-lost-monitor/leadguard-globals.css', 'w') as f:
    f.write(css)

