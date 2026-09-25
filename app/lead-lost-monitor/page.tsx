"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
const LEADGUARD_CSS = `@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
:root{--ink:#12202f;--muted:#6f7f90;--line:#e5ebf0;--bg:#f4f7f9;--navy:#071725;--teal:#0eae91;--teal-dark:#087c6b;--green:#20a773;--red:#e45252;--amber:#eaa52d;--violet:#7f6fe8}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:'DM Sans',sans-serif}.shell{min-height:100vh}.sidebar{position:fixed;inset:0 auto 0 0;width:238px;background:var(--navy);color:#d4dee7;padding:26px 18px 22px;display:flex;flex-direction:column;z-index:20}.brand{display:flex;align-items:center;gap:12px;padding:0 8px 30px}.brand-mark{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(145deg,#20d5b2,#0b957f);color:#052018;font:800 13px 'Manrope';box-shadow:0 8px 24px #00c9a333}.brand strong{display:block;color:#fff;font:800 18px 'Manrope'}.brand small{display:block;color:#718497;font-size:11px;margin-top:2px}.sidebar nav{display:grid;gap:6px}.sidebar nav button{border:0;background:transparent;color:#8fa0ae;border-radius:9px;padding:12px;text-align:left;font:600 13px 'DM Sans';cursor:pointer;display:flex;align-items:center;gap:12px}.sidebar nav button span{font-size:17px;width:18px}.sidebar nav button b{margin-left:auto;background:#e95e5e;color:#fff;border-radius:10px;padding:2px 7px;font-size:10px}.sidebar nav button:hover,.sidebar nav button.active{background:#122b3b;color:#fff}.sidebar nav button.active{box-shadow:inset 3px 0 var(--teal)}.sidebar-card{margin-top:auto;border:1px solid #244051;background:#0d2230;border-radius:12px;padding:15px;color:#b7c5cf;font-size:12px}.sidebar-card strong,.sidebar-card small{display:block;margin-left:16px}.sidebar-card strong{color:#fff;margin-top:8px}.sidebar-card small{color:#718797;margin-top:3px}.pulse-dot{display:inline-block;width:8px;height:8px;background:#24ce9a;border-radius:50%;box-shadow:0 0 0 5px #24ce9a18}.user{border-top:1px solid #1b3343;margin-top:18px;padding:18px 5px 0;display:flex;gap:10px;align-items:center}.user>span{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#284152;color:#fff;font-size:11px}.user strong{font-size:12px;color:#e2ebf1}.user small{display:block;color:#6d8292;font-size:10px;margin-top:2px}main{margin-left:238px;padding:0 30px 42px;min-width:0}.topbar{height:92px;display:flex;align-items:center;justify-content:space-between}.topbar p,.section-title p,.drawer header p{font-size:9px;font-weight:800;letter-spacing:1.5px;color:#7e8d9b;margin:0 0 5px}.topbar h1{font:800 23px 'Manrope';margin:0}.top-actions{display:flex;align-items:center;gap:12px}.mode{border:1px solid var(--line);background:#fff;border-radius:20px;padding:8px 12px;font-size:10px;font-weight:800;letter-spacing:.6px}.mode i{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:7px}.mode.live i{background:#18b77d;box-shadow:0 0 0 4px #18b77d18}.mode.demo i{background:var(--amber)}button{font-family:inherit}.refresh{border:0;background:var(--teal-dark);color:#fff;border-radius:8px;padding:11px 16px;font-weight:700;cursor:pointer}.refresh:disabled{opacity:.65}.alert-strip{background:linear-gradient(90deg,#fff4f3,#fff);border:1px solid #f1d1cd;border-left:4px solid var(--red);border-radius:10px;padding:14px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 3px 12px #21374b08}.alert-icon{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#ffe1de;color:var(--red);font-weight:800}.alert-strip div:nth-child(2){flex:1}.alert-strip strong{font:700 14px 'Manrope'}.alert-strip p{margin:3px 0 0;color:var(--muted);font-size:12px}.alert-strip button{border:0;background:none;color:#bf3939;font-weight:700;cursor:pointer}.filters{display:grid;grid-template-columns:minmax(240px,1.4fr) repeat(4,minmax(120px,.65fr)) auto;gap:9px;margin:16px 0}.filters select,.search{height:42px;border:1px solid #dbe3e9;background:#fff;border-radius:8px;color:#455465;font-size:12px}.filters select{padding:0 12px}.search{display:flex;align-items:center;padding:0 12px;gap:9px}.search span{font-size:19px;color:#7a8996}.search input{border:0;outline:0;width:100%;font:500 12px 'DM Sans'}.clear{border:0;background:transparent;color:#6d7d8b;font-weight:700;cursor:pointer}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px}.kpi{border:1px solid var(--line);background:#fff;min-width:0;border-radius:11px;padding:16px;display:flex;gap:12px;text-align:left;align-items:flex-start;box-shadow:0 3px 12px #17304708}.kpi:is(button){cursor:pointer}.kpi:is(button):hover{border-color:#b9ccc8;transform:translateY(-1px)}.kpi.danger{border-color:#f1c9c6}.kpi-icon{width:31px;height:31px;border-radius:8px;display:grid;place-items:center;flex:0 0 auto;font-weight:800}.kpi-icon.teal{background:#e4f7f3;color:var(--teal)}.kpi-icon.red{background:#fff0ee;color:var(--red)}.kpi-icon.amber{background:#fff5df;color:#d38b0f}.kpi-icon.violet{background:#f0edff;color:var(--violet)}.kpi-icon.green{background:#e9f7f0;color:var(--green)}.kpi small{display:block;color:#82909c;font-size:8px;font-weight:800;letter-spacing:.7px;white-space:nowrap}.kpi strong{display:block;font:800 23px 'Manrope';margin:4px 0 1px}.kpi p{margin:0;color:#8794a0;font-size:9px;white-space:nowrap}.pipeline-card,.table-card{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 4px 14px #1a314507}.pipeline-card{padding:18px 20px;margin-bottom:16px}.section-title{display:flex;justify-content:space-between;align-items:flex-start}.section-title h2{font:750 15px 'Manrope';margin:0}.section-title>span{color:#80909e;font-size:10px}.pipeline{display:flex;align-items:center;justify-content:space-between;padding:20px 3px 14px}.pipeline-wrap{display:flex;align-items:center;flex:1}.stage{border:1px solid #dfe7ec;background:#fbfcfd;border-radius:10px;padding:11px 13px;display:grid;grid-template-columns:auto auto;gap:2px 8px;min-width:102px;text-align:left;cursor:pointer}.stage:hover{border-color:#82c8ba}.stage>span{grid-row:1/3;width:22px;height:22px;border-radius:50%;background:#e6f7f3;color:#0c927d;display:grid;place-items:center;font-size:10px;font-weight:800}.stage small{font-size:9px;color:#7c8995}.stage strong{font:800 17px 'Manrope'}.stage em{grid-column:1/3;font-style:normal;font-size:8px;color:#8795a1;margin-top:2px}.stage.branch{border-color:#eedcba;background:#fffaf0}.stage.branch>span{background:#ffefcd;color:#c67a00}.stage.success{border-color:#bfe6d7;background:#f7fdfa}.connector{font-style:normal;color:#9eabb5;margin:0 auto}.funnel-note{border-top:1px solid #edf1f4;padding-top:12px;color:#657686;font-size:10px}.green-dot{display:inline-block;width:7px;height:7px;background:var(--green);border-radius:50%;margin-right:6px}.funnel-note button{border:0;background:transparent;color:var(--teal-dark);font-weight:700;cursor:pointer;margin-left:4px}.table-card{overflow:hidden}.table-card>.section-title{padding:18px 20px 14px}.table-tools{display:flex;align-items:center;gap:12px;color:#84919c;font-size:10px}.table-tools select{border:1px solid var(--line);border-radius:7px;padding:7px 9px;color:#53616e;font-size:10px;background:white}.table-scroll{overflow:auto}table{width:100%;border-collapse:collapse;min-width:1220px}th{background:#f7f9fb;color:#71818e;text-align:left;font-size:8px;letter-spacing:.6px;padding:10px 12px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);white-space:nowrap}td{padding:13px 12px;border-bottom:1px solid #edf1f3;font-size:11px;vertical-align:middle}td strong{display:block;font-weight:700}td small{display:block;color:#84919e;margin-top:3px;font-size:9px}.problem-row{background:#fffafa}.source-badge{float:left;margin-right:7px;width:25px;height:25px;border-radius:7px;background:#e8f5f4;color:#178b7c;display:grid;place-items:center;font-weight:800}.count-link{border:0;background:none;color:#173348;font-weight:800;text-decoration:underline;text-decoration-color:#c7d5dd;text-underline-offset:3px;cursor:pointer;padding:2px}.count-link.bad{background:#ffebe9;color:#c84242;text-decoration:none;border-radius:5px;min-width:27px;padding:5px}.count-link.warn{color:#c17a0a}.tat{border:0;background:transparent;font-weight:800;color:#3d5262;cursor:pointer}.tat.bad{color:#b64545}.tat small{font-weight:600}.status{display:inline-block;border-radius:14px;padding:5px 8px;font-size:8px;font-weight:800;white-space:nowrap}.status.ok{background:#e8f7f1;color:#16825e}.status.lost{background:#ffecea;color:#c74343}.status.delayed{background:#fff3da;color:#b6750d}.table-foot{display:flex;gap:24px;padding:11px 20px;background:#fbfcfd;color:#7c8c98;font-size:8px}.table-foot span:last-child{margin-left:auto}.dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:4px}.red-dot{background:var(--red)}.amber-dot{background:var(--amber)}.empty{text-align:center!important;color:#83909b;padding:40px!important}.drawer-backdrop{position:fixed;inset:0;background:#07131f88;z-index:50;display:flex;justify-content:flex-end}.drawer{width:min(540px,94vw);height:100%;background:#f5f8fa;box-shadow:-20px 0 50px #0003;overflow:auto;animation:slide .2s ease-out}.drawer header{position:sticky;top:0;background:#fff;padding:22px 24px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;z-index:2}.drawer header h2{font:800 18px 'Manrope';margin:0 0 4px}.drawer header span{font-size:10px;color:#7d8c99}.drawer header button{border:0;background:#eef2f4;border-radius:50%;width:32px;height:32px;font-size:20px;cursor:pointer}.drawer-list{padding:16px}.lead-item{background:#fff;border:1px solid var(--line);border-left:3px solid #92aaae;border-radius:10px;padding:16px;margin-bottom:12px}.lead-item.lost{border-left-color:var(--red)}.lead-item.duplicate,.lead-item.resolved{border-left-color:var(--amber)}.lead-item.delayed{border-left-color:var(--violet)}.lead-head{display:flex;justify-content:space-between;align-items:center}.lead-head>small{color:#7a8995;font-size:9px}.lead-item h3{font:800 15px 'Manrope';margin:12px 0 2px}.lead-id{color:#768694;font-size:10px;margin:0 0 13px}.lead-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f7f9fa;border-radius:8px;padding:11px}.lead-grid span{color:#88959f;font-size:8px}.lead-grid strong{display:block;color:#354858;font-size:10px;margin-top:3px}.reason{margin:12px 0}.reason strong{font-size:9px;color:#495d6d}.reason p{font-size:10px;line-height:1.5;color:#6c7c89;margin:4px 0}.duplicate-proof{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:9px;border:1px solid #ead7ad;background:#fffaf0;border-radius:8px;padding:11px}.duplicate-proof small,.duplicate-proof strong,.duplicate-proof span{display:block}.duplicate-proof small{font-size:7px;color:#a27b36}.duplicate-proof strong{font-size:10px;margin:3px 0}.duplicate-proof span{font-size:8px;color:#8c7956}.duplicate-proof i{font-style:normal;font-size:8px;color:#ba842a}.lead-actions{display:flex;gap:14px;margin-top:12px}.lead-actions a{color:var(--teal-dark);font-size:10px;font-weight:800;text-decoration:none}.empty-drawer{text-align:center;padding:70px 20px;color:#82909b}.empty-drawer span{display:grid;place-items:center;margin:auto;width:45px;height:45px;background:#e6f7f1;color:var(--green);border-radius:50%;font-size:22px}.empty-drawer h3{color:#314555}.toast{position:fixed;right:24px;bottom:24px;background:#102636;color:#fff;border-radius:8px;padding:12px 16px;z-index:80;font-size:12px;box-shadow:0 10px 30px #0003}@keyframes slide{from{transform:translateX(30px);opacity:.5}to{transform:none;opacity:1}}@media(max-width:1100px){.kpis{grid-template-columns:repeat(3,1fr)}.filters{grid-template-columns:1fr 1fr 1fr}.search{grid-column:span 2}.pipeline{overflow:auto;justify-content:flex-start}.pipeline-wrap{flex:0 0 auto}.connector{margin:0 12px}}@media(max-width:760px){.sidebar{position:static;width:auto;height:auto;padding:14px 16px}.brand{padding:0}.sidebar nav,.sidebar-card,.user{display:none}main{margin:0;padding:0 14px 30px}.topbar{height:78px}.topbar p,.mode{display:none}.topbar h1{font-size:19px}.alert-strip button{display:none}.filters{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.kpis{grid-template-columns:1fr 1fr}.kpi:last-child{grid-column:1/-1}.pipeline-card{padding:15px}.table-foot{flex-wrap:wrap}.table-foot span:last-child{margin-left:0}.refresh{padding:10px}.kpi p{white-space:normal}}
.loss-command{background:#fff;border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 4px 14px #1a314507}
.loss-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:14px;margin-top:16px}
.live-master-card{border-radius:14px;background:linear-gradient(135deg,#0a2634,#0b4b4c);color:#fff;padding:20px;display:grid;grid-template-columns:155px 1fr;gap:20px;align-items:center;overflow:hidden}
.radar-visual{position:relative;width:145px;height:145px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#18b89d22 0 18%,transparent 19% 100%),repeating-radial-gradient(circle,#49d5bc33 0 1px,transparent 2px 25px)}
.radar-visual:after{content:"";position:absolute;width:50%;height:50%;left:50%;top:0;background:linear-gradient(135deg,#35e4c144,transparent);transform-origin:left bottom;animation:sweep 4s linear infinite}
.radar-visual span{z-index:1;text-align:center}.radar-visual small,.radar-visual em{display:block;font-size:8px;color:#8bd7cb;font-style:normal}.radar-visual strong{display:block;font:800 30px 'Manrope'}
.master-copy p,.break-map header p{font-size:8px;letter-spacing:1.3px;color:#72b6ae;font-weight:800;margin:0}.master-copy h3{font:800 17px 'Manrope';margin:4px 0 15px}
.master-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px}.master-metrics span{background:#ffffff0c;border:1px solid #ffffff14;padding:9px;border-radius:8px}.master-metrics small,.master-metrics strong{display:block}.master-metrics small{font-size:8px;color:#91b8b5}.master-metrics strong{font:800 16px 'Manrope';margin-top:2px}.master-metrics .danger strong{color:#ff8b82}
.master-copy button{margin-top:13px;border:0;background:#21b99c;color:#052b29;border-radius:7px;padding:9px 12px;font-weight:800;cursor:pointer}
.break-map{border:1px solid var(--line);border-radius:14px;padding:16px}.break-map header{display:flex;justify-content:space-between;align-items:flex-start}.break-map header h3{font:800 15px 'Manrope';margin:4px 0}.break-map header>span{font-size:9px;color:var(--muted)}.break-list{display:grid;margin-top:8px}
.break-list button{display:grid;grid-template-columns:28px 1fr auto;gap:9px;align-items:center;border:0;border-top:1px solid #edf1f3;background:transparent;text-align:left;padding:11px 0;cursor:pointer}.break-rank{color:#9ba9b4;font:800 10px 'Manrope'}.break-copy strong,.break-copy small{display:block}.break-copy strong{font-size:10px}.break-copy small{font-size:8px;color:#82919d;margin-top:2px}.break-copy i{display:block;height:3px;background:#edf1f3;margin-top:7px;border-radius:3px}.break-copy b{display:block;height:100%;background:linear-gradient(90deg,#f1aa35,#e45252);border-radius:3px}
.break-list em{font-style:normal;font:800 15px 'Manrope';color:var(--green);text-align:right}.break-list em.hot{color:var(--red)}.break-list em small{display:block;font:600 7px 'DM Sans'}.health-chip{border-radius:20px;padding:6px 9px;font-size:8px!important;font-weight:800}.health-chip.current{background:#e7f7f0;color:#18845f}.health-chip.stale{background:#ffe8e5;color:#bd3d3d}
.mismatch-row{background:#fff5f4;box-shadow:inset 4px 0 #d63f3f}.date-group-row td,.company-group-row td{position:static!important;box-shadow:none!important}.date-group-row td{padding:12px 18px;background:#102d3d!important;color:#fff;border-top:5px solid #fff;border-bottom:0}.date-group-row div,.company-group-row div{display:flex;align-items:center;gap:12px}.date-group-row span,.company-group-row span{font:800 8px 'Manrope';letter-spacing:1px;padding:5px 7px}.date-group-row span{background:#20b99b;color:#062a27}.date-group-row strong{font:800 14px 'Manrope'}.date-group-row em,.company-group-row em{margin-left:auto;font-style:normal;font-size:9px}.date-group-row em{color:#a9c2cf}.company-group-row td{padding:9px 18px;background:#dff3ef!important;color:#164d47;border-top:2px solid #9ed6cc;border-bottom:1px solid #b9ddd7}.company-group-row span{background:#0f786d;color:#fff}.company-group-row strong{font:800 12px 'Manrope'}.company-group-row em{color:#47756f}.source-data-row td:first-child{box-shadow:inset 4px 0 #b7d7d1}.company-total-row{background:#fff4d9}.company-total-row td{border-top:2px solid #e8bd5b;border-bottom:3px solid #fff;font-weight:700}.company-total-row td:first-child{box-shadow:inset 5px 0 #d69a18}.date-total-row{background:#dcecf2;color:#102d3d}.date-total-row td{border-top:3px solid #52798c;border-bottom:5px solid #fff;font-weight:800}.date-total-row td:first-child{box-shadow:inset 6px 0 #102d3d}.gap-cell{box-shadow:inset 1px 0 #f3d2ce,inset -1px 0 #f3d2ce}.gap-cell.clear-gap{background:#f1faf6}.gap-cell.has-gap{background:#ffe4e1}.company-total-row .gap-cell.clear-gap{background:#e8f5e9}.company-total-row .gap-cell.has-gap{background:#ffd5cf}.date-total-row .gap-cell.clear-gap{background:#d5efe3}.date-total-row .gap-cell.has-gap{background:#ffc9c2}.expected-gap-cell{background:#fff5d9;color:#805700}.late-transfer-cell{background:#f0ebff;color:#553aa1}.table-card th:nth-child(5),.table-card th:nth-child(8),.table-card th:nth-child(12){background:#7f1d1d;color:#fff;border-color:#7f1d1d}.table-card th:nth-child(7){background:#9a6700;color:#fff;border-color:#9a6700}.table-card th:nth-child(11){background:#5b3ca5;color:#fff;border-color:#5b3ca5}.status.mismatch{background:#ffe0dd;color:#b93131}.tracker-stale{border-color:#eaaeaa;background:linear-gradient(90deg,#fff0ef,#fff)}
.table-card table{min-width:2240px}.table-card th{line-height:1.35;vertical-align:middle}.table-card th:nth-child(1),.table-card td:nth-child(1){position:sticky;left:0;z-index:2;background:inherit;min-width:170px}.table-card th:nth-child(2),.table-card td:nth-child(2){position:sticky;left:170px;z-index:2;background:inherit;min-width:135px;box-shadow:8px 0 12px -12px #17304780}.table-card th:nth-child(-n+2){z-index:4;background:#f7f9fb}
.drawer-toolbar{position:sticky;top:103px;z-index:2;display:flex;gap:8px;padding:12px 16px;background:#f5f8fa;border-bottom:1px solid var(--line)}.drawer-toolbar input{flex:1;min-width:0;border:1px solid #d8e1e7;background:#fff;border-radius:8px;padding:10px 12px;font:500 11px 'DM Sans';outline:none}.drawer-toolbar button,.drawer-pagination button{border:0;background:var(--teal-dark);color:#fff;border-radius:8px;padding:9px 13px;font-weight:700;cursor:pointer}.drawer-toolbar button:disabled,.drawer-pagination button:disabled{opacity:.45;cursor:not-allowed}
.drawer-sheet-link{display:block;color:var(--teal-dark);font-size:10px;font-weight:800;text-decoration:none;margin-top:7px}.drawer-pagination{position:sticky;bottom:0;background:#fff;border-top:1px solid var(--line);padding:11px 16px;display:flex;align-items:center;justify-content:space-between;font-size:10px}.drawer-pagination button{background:#e9f3f2;color:var(--teal-dark)}
@keyframes sweep{to{transform:rotate(360deg)}}
@media(max-width:900px){.loss-grid{grid-template-columns:1fr}.live-master-card{grid-template-columns:130px 1fr}.radar-visual{width:120px;height:120px}}
@media(max-width:560px){.live-master-card{grid-template-columns:1fr}.radar-visual{margin:auto}.drawer-toolbar{top:103px;flex-direction:column}}

/* Modernist Gap/Lost lead mapping popup */
.modern-modal-backdrop{--color-accent:#d8342f;--color-accent-100:#fee8e6;--color-accent-800:#9d201d;--color-surface:#f7f5f1;--color-divider:#242424;--color-ink:#171717;--color-muted:#666;--font-heading:'Archivo',sans-serif;--font-body:'Archivo',sans-serif;position:fixed;inset:0;z-index:90;background:#111111b8;display:grid;place-items:center;padding:28px;font-family:var(--font-body)}
.modern-modal{width:min(1180px,96vw);max-height:92vh;overflow:auto;background:#fff;color:var(--color-ink);border:2px solid var(--color-divider);border-radius:0;box-shadow:16px 16px 0 #1117;animation:modern-pop .18s ease-out}
.modern-modal-header{display:flex;align-items:flex-start;justify-content:space-between;padding:24px 28px 18px}.modern-title-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.modern-modal-header h2{font:800 clamp(22px,3vw,36px)/1 var(--font-heading);letter-spacing:-1.2px;margin:0}.modern-modal-header p{margin:9px 0 0;color:var(--color-muted);font:500 12px/1.45 var(--font-body)}
.modern-status-tag{display:inline-block;background:var(--color-accent-100);color:var(--color-accent-800);border:1px solid #f2b8b3;border-radius:0;padding:5px 8px;font:700 10px/1 var(--font-body);letter-spacing:.35px;white-space:nowrap}.modern-close-icon{border:0;background:transparent;color:var(--color-ink);border-radius:0;width:38px;height:38px;font:400 30px/1 var(--font-body);cursor:pointer}.modern-close-icon:hover{background:var(--color-accent-100);color:var(--color-accent-800)}
.modern-subtext{margin:0;padding:0 28px 22px;max-width:980px;color:#434343;font:500 13px/1.6 var(--font-body)}.modern-rule{height:2px;background:var(--color-divider);margin:0 28px}.modern-kicker{margin:0 0 11px;color:var(--color-accent-800);font:800 10px/1.2 var(--font-heading);letter-spacing:1.15px;text-transform:uppercase}
.modern-original{padding:22px 28px}.modern-original-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--color-surface);border-left:2px solid var(--color-accent);border-top:1px solid #dedbd4;border-bottom:1px solid #dedbd4}.modern-original-grid>span{min-height:74px;padding:14px 16px;border-right:1px solid #dedbd4;border-bottom:1px solid #dedbd4;color:var(--color-muted);font:700 9px/1.25 var(--font-body);letter-spacing:.65px;text-transform:uppercase}.modern-original-grid>span:nth-last-child(-n+4){border-bottom:0}.modern-original-grid strong{display:block;margin-top:8px;color:var(--color-ink);font:600 12px/1.35 var(--font-body);letter-spacing:0;text-transform:none;overflow-wrap:anywhere}.modern-original-grid strong.forwarded{color:#15714f}.modern-original-grid strong.under-audit{color:var(--color-accent-800)}
.modern-duplicates{padding:22px 28px 10px}.modern-section-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.modern-section-head>div:first-child>span{color:var(--color-muted);font:500 11px/1.4 var(--font-body)}.modern-section-head>div:last-child{display:flex;gap:8px;align-items:center}.modern-section-head a,.modern-section-head button,.modern-modal-footer button{border:1px solid var(--color-divider);border-radius:0;background:#fff;color:var(--color-ink);padding:9px 12px;text-decoration:none;font:700 10px/1 var(--font-body);cursor:pointer}.modern-section-head button{background:var(--color-ink);color:#fff}.modern-section-head button:disabled,.modern-modal-footer button:disabled{opacity:.4;cursor:not-allowed}
.modern-search{padding:14px 0 10px}.modern-search input{width:100%;border:1px solid #aaa;border-radius:0;background:#fff;padding:11px 12px;outline:none;font:500 12px var(--font-body)}.modern-search input:focus{border:2px solid var(--color-divider);padding:10px 11px}.modern-table-wrap{overflow:auto;border-top:2px solid var(--color-divider);border-bottom:2px solid var(--color-divider)}.modern-table{width:100%;min-width:980px;border-collapse:collapse}.modern-table th{position:static!important;background:var(--color-surface)!important;color:#4c4c4c!important;box-shadow:none!important;padding:11px 12px!important;border:0!important;border-bottom:1px solid #bdb9b1!important;font:800 9px/1.2 var(--font-heading)!important;letter-spacing:.75px;text-transform:uppercase}.modern-table td{position:static!important;background:#fff!important;box-shadow:none!important;padding:13px 12px!important;border:0!important;border-bottom:1px solid #dedbd4!important;font:500 11px/1.4 var(--font-body);vertical-align:middle}.modern-table tbody tr:last-child td{border-bottom:0!important}.modern-table td:first-child strong{font:700 11px var(--font-body);overflow-wrap:anywhere}.modern-empty{text-align:center;padding:34px!important;color:var(--color-muted)!important}
.modern-modal-footer{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:16px 28px 22px}.modern-modal-footer>span{color:var(--color-muted);font:600 10px var(--font-body)}.modern-modal-footer>div{display:flex;gap:8px}.modern-modal-footer .modern-secondary{min-width:88px;background:#fff;color:var(--color-ink)}
@keyframes modern-pop{from{opacity:.3;transform:translateY(10px) scale(.99)}to{opacity:1;transform:none}}
@media(max-width:760px){.modern-modal-backdrop{padding:10px}.modern-modal{width:100%;max-height:96vh;box-shadow:8px 8px 0 #1116}.modern-modal-header,.modern-original,.modern-duplicates{padding-left:16px;padding-right:16px}.modern-subtext{padding-left:16px;padding-right:16px}.modern-rule{margin:0 16px}.modern-original-grid{grid-template-columns:1fr 1fr}.modern-original-grid>span:nth-last-child(-n+4){border-bottom:1px solid #dedbd4}.modern-original-grid>span:nth-last-child(-n+2){border-bottom:0}.modern-section-head{display:block}.modern-section-head>div:last-child{margin-top:12px}.modern-modal-footer{padding:14px 16px 18px}}
.modern-audit-summary{display:flex;gap:0;margin:0 28px 22px;border:2px solid var(--color-divider);width:max-content}.modern-audit-summary span{min-width:118px;padding:10px 14px;border-right:1px solid var(--color-divider)}.modern-audit-summary span:last-child{border-right:0}.modern-audit-summary small,.modern-audit-summary strong{display:block}.modern-audit-summary small{font:800 8px var(--font-heading);letter-spacing:.75px;color:var(--color-muted)}.modern-audit-summary strong{font:800 20px var(--font-heading);margin-top:3px}.modern-audit-summary .duplicate{background:#f1f8f4}.modern-audit-summary .duplicate strong{color:#15714f}.modern-audit-summary .lost{background:var(--color-accent-100)}.modern-audit-summary .lost strong{color:var(--color-accent-800)}
.modern-table tbody tr{cursor:pointer}.modern-table tbody tr:hover td,.modern-table tbody tr.selected td{background:#f6f1e9!important}.modern-table tbody tr.selected td:first-child{box-shadow:inset 3px 0 var(--color-accent)!important}.modern-status-tag.valid-duplicate{background:#e5f4eb;color:#14633f;border-color:#a9d6bb}.modern-status-tag.actual-lost{background:var(--color-accent-100);color:var(--color-accent-800);border-color:#f2b8b3}.modern-status-tag.proof-missing{background:#fff2d9;color:#855708;border-color:#e8c57b}
@media(max-width:760px){.modern-audit-summary{margin-left:16px;margin-right:16px;width:auto}.modern-audit-summary span{min-width:0;flex:1;padding:9px}.modern-audit-summary small{font-size:7px}.modern-audit-summary strong{font-size:17px}}
.lead-audit-list{display:grid;gap:18px;margin-top:16px}.lead-audit-card{border:2px solid var(--color-divider);background:#fff}.lead-audit-card.is-duplicate{border-left:4px solid #1d8059}.lead-audit-card.is-lost{border-left:4px solid var(--color-accent)}.lead-audit-current{display:grid;grid-template-columns:minmax(210px,1.2fr) minmax(260px,1fr) auto;align-items:center;gap:18px;padding:15px 16px;background:#f8f6f1;border-bottom:2px solid var(--color-divider)}.lead-audit-current>div{display:grid;gap:4px}.lead-audit-current>div:nth-child(2){font:600 10px/1.45 var(--font-body);color:var(--color-muted)}.lead-audit-current small{font:800 8px var(--font-heading);letter-spacing:.8px;color:var(--color-accent-800)}.lead-audit-current strong{font:800 13px var(--font-heading);overflow-wrap:anywhere}.lead-audit-current span{font:600 10px/1.35 var(--font-body);overflow-wrap:anywhere}.lead-audit-context-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:13px 16px 9px}.lead-audit-context-head .modern-kicker{margin:0}.lead-audit-context-head>span{color:var(--color-muted);font:600 9px/1.35 var(--font-body);text-align:right}.lead-audit-card .modern-original-grid{margin:0 16px 16px}.lead-audit-card .modern-original-grid.has-proof{border-left-color:#1d8059}.lead-audit-card .modern-original-grid.blank-context strong:not(.under-audit){color:#aaa}.lead-audit-card .modern-original-grid.blank-context{background:#fbfaf8}.lead-audit-card .modern-original-grid.blank-context strong.under-audit{color:var(--color-accent-800)}
.actual-status-alert{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 16px;border-bottom:2px solid var(--color-divider);border-left:6px solid currentColor}.actual-status-alert>div{display:grid;gap:3px}.actual-status-alert small{font:800 8px var(--font-heading);letter-spacing:1px}.actual-status-alert strong{font:900 16px/1.2 var(--font-heading)}.actual-status-alert p{margin:0;font:600 10px/1.45 var(--font-body);color:#343434}.actual-status-alert>span{flex:0 0 auto;border:2px solid currentColor;padding:7px 10px;font:900 9px var(--font-heading);letter-spacing:1px;background:#fff}.actual-status-alert.mobile{color:#12623f;background:#e8f6ee}.actual-status-alert.enquiry{color:#4c35a3;background:#efecff}.actual-status-alert.email{color:#8a5900;background:#fff3d5}.actual-status-alert.lost{color:#a20f08;background:#ffe5e2;animation:high-alert-pulse 1.8s ease-in-out infinite}.actual-status-alert.lost>span{background:#a20f08;color:#fff;border-color:#a20f08}@keyframes high-alert-pulse{0%,100%{background:#ffe5e2}50%{background:#ffcfc9}}
@media(max-width:760px){.lead-audit-current{grid-template-columns:1fr;gap:10px}.actual-status-alert{align-items:flex-start;flex-direction:column;gap:10px}.lead-audit-context-head{display:block}.lead-audit-context-head>span{display:block;margin-top:5px;text-align:left}.lead-audit-card .modern-original-grid{margin:0 10px 10px}}

/* Reference-aligned reconciliation funnel headings */
.table-card table{min-width:1720px}
.table-card th:nth-child(5),.table-card th:nth-child(7),.table-card th:nth-child(8),.table-card th:nth-child(11),.table-card th:nth-child(12){background:#f7f9fb;color:#71818e;border-color:var(--line)}
.table-card th.gap-heading{background:#7f1d1d;color:#fff;border-color:#7f1d1d}
.column-flow{display:block;margin-top:3px;color:inherit;opacity:.72;font-size:7px;letter-spacing:.45px;font-weight:600}
.gap-count-link{border:0;background:transparent;color:#183348;font:800 13px 'Manrope';cursor:pointer;padding:3px 5px;display:inline-flex;align-items:center;gap:6px}
.gap-count-link:hover{background:#ffffffaa}.gap-count-link.has-value{color:#7f1d1d}
.gap-count-link small{display:inline-block;margin:0;border-bottom:2px solid #bd2d2d;color:#a32626;font:800 7px 'DM Sans';letter-spacing:.45px}
.table-scroll{position:relative;isolation:isolate;overflow:auto;overscroll-behavior-inline:contain;scrollbar-gutter:stable}.table-card table{border-collapse:separate;border-spacing:0;table-layout:fixed}.table-card th:nth-child(1),.table-card td:nth-child(1){left:0!important;width:200px;min-width:200px;max-width:200px;z-index:5;background:#fff}.table-card th:nth-child(2),.table-card td:nth-child(2){left:200px!important;width:170px;min-width:170px;max-width:170px;z-index:5;background:#fff;box-shadow:8px 0 12px -12px #17304780,1px 0 #dbe4ea}.table-card th:nth-child(-n+2){z-index:9;background:#f7f9fb!important}.source-data-row td:nth-child(-n+2){background:#fff}.problem-row td:nth-child(-n+2){background:#fffafa}.mismatch-row td:nth-child(-n+2){background:#fff5f4}.company-total-row td:nth-child(-n+2){background:#fff4d9}.date-summary-row{font-weight:800;color:#17324b}.date-summary-row td{height:58px;border-top:2px solid #b7cce1;border-bottom:2px solid #b7cce1;background:#edf5ff}.date-summary-row.expanded td{background:#cfe3fb}.date-summary-row td:nth-child(-n+2){background:#edf5ff}.date-summary-row.expanded td:nth-child(-n+2){background:#cfe3fb}.date-summary-row .gap-cell.clear-gap{background:#dff4e9}.date-summary-row .gap-cell.has-gap{background:#ffd7d2}.date-toggle{width:100%;display:flex;align-items:center;gap:10px;border:0;background:transparent;color:#17324b;padding:0;text-align:left;cursor:pointer}.date-toggle>span{display:grid;place-items:center;width:24px;height:24px;border:1px solid #7ca2c8;background:#fff;color:#1264b8;font:800 17px/1 'Manrope';flex:0 0 auto}.date-toggle div{min-width:0}.date-toggle strong{font:800 12px 'Manrope';white-space:nowrap}.date-toggle small{font:700 7px 'DM Sans';letter-spacing:.7px;color:#5f7891}.date-summary-row>td:nth-child(2) strong{font-size:10px}.date-summary-row>td:nth-child(2) small{font-size:8px}.date-summary-row.collapsed:hover td{filter:brightness(.985)}

/* Lead-gap console popup — adapted from the approved HTML reference */
.gap-console-backdrop{--gc-ink:#12161b;--gc-paper:#fff;--gc-field:#e8eaee;--gc-rule:#d2d7de;--gc-rule-soft:#e4e8ec;--gc-muted:#626e7b;--gc-accent:#3d3a8f;--gc-accent-soft:#ecebf7;--gc-alarm:#b3261e;--gc-alarm-soft:#fbeceb;--gc-warn:#8a5a00;--gc-warn-soft:#fbf2e0;--gc-ok:#1f6b47;--gc-ok-soft:#e9f3ee;position:fixed;inset:0;z-index:100;background:#12161b73;display:grid;place-items:center;padding:24px;color:var(--gc-ink);font-family:'DM Sans',sans-serif}
.gap-console{width:min(1080px,100%);max-height:94vh;overflow:hidden;background:var(--gc-paper);border:1px solid var(--gc-rule);border-radius:5px;box-shadow:0 18px 48px #12161b3d;display:flex;flex-direction:column;animation:gap-console-rise .16s ease-out}
.gap-console-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:15px 18px 13px;border-bottom:1px solid var(--gc-rule)}.gap-console-title-row{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.gap-console-title-row h2{margin:0;font:700 18px 'Manrope';letter-spacing:-.3px}.gap-console-title-row span{color:var(--gc-muted);font:500 11px ui-monospace,'SF Mono',Menlo,monospace}.gap-console-head p{margin:4px 0 0;color:var(--gc-muted);font:500 10px ui-monospace,'SF Mono',Menlo,monospace}.gap-console-head>button{border:1px solid transparent;background:transparent;border-radius:3px;width:35px;height:35px;color:var(--gc-muted);font-size:20px;cursor:pointer}.gap-console-head>button:hover{background:var(--gc-field);color:var(--gc-ink)}
.gap-console-intro{display:flex;align-items:flex-end;gap:18px;padding:13px 18px}.gap-console-intro>div{display:flex;align-items:baseline;gap:9px;flex:0 0 auto}.gap-console-kicker{color:var(--gc-muted);font:700 9px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:1.1px}.gap-console-intro strong{font:700 28px 'Manrope';line-height:1}.gap-console-intro p{margin:0;max-width:680px;color:var(--gc-muted);font-size:11px;line-height:1.45}
.gap-console-ledger{display:grid;grid-template-columns:repeat(3,1fr);margin:0 18px 13px;border:1px solid var(--gc-rule);border-radius:3px;overflow:hidden}.gap-console-ledger>span{padding:9px 12px;border-right:1px solid var(--gc-rule-soft)}.gap-console-ledger>span:last-child{border-right:0}.gap-console-ledger small,.gap-console-ledger strong,.gap-console-ledger em{display:block}.gap-console-ledger small{color:var(--gc-muted);font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:1px}.gap-console-ledger strong{font:700 22px 'Manrope';line-height:1.15;margin-top:2px}.gap-console-ledger em{color:var(--gc-muted);font:500 9px ui-monospace,'SF Mono',Menlo,monospace;font-style:normal}.gap-console-ledger .transient{background:var(--gc-warn-soft)}.gap-console-ledger .transient small,.gap-console-ledger .transient strong{color:var(--gc-warn)}.gap-console-ledger .unexplained{background:var(--gc-alarm-soft)}.gap-console-ledger .unexplained small,.gap-console-ledger .unexplained strong{color:var(--gc-alarm)}
.gap-console-toolbar{display:flex;gap:10px;align-items:center;padding:10px 18px;border-top:1px solid var(--gc-rule);border-bottom:1px solid var(--gc-rule);background:#f8f9fa}.gap-console-toolbar input{flex:1;min-width:0;border:1px solid #bfc6ce;border-radius:3px;background:#fff;padding:8px 10px;outline:none;font:500 11px 'DM Sans'}.gap-console-toolbar input:focus{border-color:var(--gc-accent);box-shadow:0 0 0 2px #3d3a8f16}.gap-console-toolbar>div{display:flex;gap:7px}.gap-console-toolbar a,.gap-console-toolbar button,.gap-console-foot button,.gap-trace-actions a{border:1px solid var(--gc-rule);border-radius:3px;background:#fff;color:var(--gc-ink);padding:7px 10px;text-decoration:none;font:700 10px 'DM Sans';cursor:pointer}.gap-console-toolbar button{background:var(--gc-ink);color:#fff}.gap-console-toolbar button:disabled{opacity:.4;cursor:not-allowed}
.gap-console-body{overflow:auto;flex:1;min-height:180px}.gap-bucket{border-bottom:1px solid var(--gc-rule)}.gap-bucket-head{position:sticky;top:0;z-index:4;width:100%;display:flex;align-items:center;gap:10px;border:0;border-left:4px solid var(--gc-rule);background:#fbfbfc;color:var(--gc-ink);padding:10px 16px;text-align:left;cursor:pointer}.gap-bucket-head:hover{background:#f3f5f7}.gap-bucket-head strong{font-size:12px}.gap-bucket-head em{color:var(--gc-muted);font-size:10px;font-style:normal}.gap-bucket-head b{margin-left:auto;font:700 12px ui-monospace,'SF Mono',Menlo,monospace}.gap-eye{color:var(--gc-muted);font-size:13px}.gap-bucket.unexplained .gap-bucket-head{border-left-color:var(--gc-alarm);background:var(--gc-alarm-soft);color:var(--gc-alarm)}.gap-bucket.unexplained .gap-bucket-head em{color:#8d3a33}.gap-bucket.transient .gap-bucket-head{border-left-color:#e0b45f;background:#fdfaf3}.gap-bucket.explained .gap-bucket-head{border-left-color:#b9bdd6}.gap-bucket-content{border-top:1px solid var(--gc-rule-soft)}.gap-record-scroll{overflow:auto}.gap-record-table{min-width:960px;width:100%;border-collapse:collapse}.gap-record-table th,.gap-record-table td{position:static!important;box-shadow:none!important;white-space:nowrap;text-align:left}.gap-record-table th{padding:7px 9px;background:#fff!important;color:var(--gc-muted)!important;border:0;border-bottom:1px solid var(--gc-rule-soft);font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.7px;text-transform:uppercase}.gap-record-table td{padding:9px;background:#fff!important;border:0;border-bottom:1px solid var(--gc-rule-soft);font-size:10px;vertical-align:top}.gap-record-table td:nth-child(2),.gap-record-table td:nth-child(4),.gap-record-table td:nth-child(6),.gap-record-table td:nth-child(8){font-family:ui-monospace,'SF Mono',Menlo,monospace}.gap-record-table td:nth-child(7){white-space:normal;max-width:220px}.gap-record-table td small{display:block;margin-top:3px;color:var(--gc-muted);font-size:8px;line-height:1.35}.gap-record{cursor:pointer}.gap-record:hover td,.gap-record.selected td{background:#fafbfc!important}.gap-record.selected td:first-child{box-shadow:inset 3px 0 var(--gc-accent)!important}.gap-caret{color:var(--gc-muted)}.gap-reason-chip{display:inline-block;border-radius:2px;padding:2px 6px;font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.35px}.gap-reason-chip.explained{background:var(--gc-accent-soft);color:var(--gc-accent)}.gap-reason-chip.transient{background:var(--gc-warn-soft);color:var(--gc-warn)}.gap-reason-chip.unexplained{background:var(--gc-alarm-soft);color:var(--gc-alarm)}.gap-age-hot{color:var(--gc-alarm)}
.gap-trace-row>td{padding:14px 18px 16px!important;background:#f7f8fa!important;white-space:normal!important}.gap-stage-track{display:flex;align-items:flex-start}.gap-stage-node{flex:1;min-width:130px;position:relative;padding-right:14px}.gap-stage-node i{display:block;position:relative;z-index:2;width:11px;height:11px;border:2px solid var(--gc-rule);border-radius:50%;background:#fff;margin-bottom:7px}.gap-stage-node:not(:last-child):after{content:"";position:absolute;left:11px;right:3px;top:4px;height:2px;background:var(--gc-rule)}.gap-stage-node.done i{background:var(--gc-ok);border-color:var(--gc-ok)}.gap-stage-node.linked:not(:last-child):after{background:var(--gc-ok)}.gap-stage-node.stopped i{background:var(--gc-alarm);border-color:var(--gc-alarm)}.gap-stage-node.pending i{background:var(--gc-warn);border-color:var(--gc-warn)}.gap-stage-node small,.gap-stage-node strong{display:block}.gap-stage-node small{color:var(--gc-muted);font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.7px;text-transform:uppercase}.gap-stage-node strong{margin-top:2px;font:600 9px ui-monospace,'SF Mono',Menlo,monospace;overflow-wrap:anywhere}.gap-evidence{margin-top:13px;border:1px solid var(--gc-rule);border-radius:3px;background:#fff;overflow:hidden}.gap-evidence header{display:flex;align-items:baseline;gap:9px;padding:8px 11px;background:#f4f5f7;border-bottom:1px solid var(--gc-rule)}.gap-evidence header span{color:var(--gc-muted);font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:1px}.gap-evidence header strong{font:700 11px ui-monospace,'SF Mono',Menlo,monospace}.gap-evidence header em{margin-left:auto;color:var(--gc-muted);font-size:9px;font-style:normal}.gap-evidence-table{display:grid;grid-template-columns:22px minmax(150px,1fr) 90px minmax(130px,1fr) minmax(100px,1fr) minmax(150px,1.2fr);align-items:center}.gap-evidence-table>*{min-height:32px;padding:8px;border-bottom:1px solid var(--gc-rule-soft);font-size:9px}.gap-evidence-table .qualified{color:var(--gc-ok);font-weight:800;background:var(--gc-ok-soft)}.gap-evidence-table .current{color:var(--gc-warn);font-weight:800;background:#fdf6e9}.gap-evidence-table b{color:var(--gc-muted);font:700 8px ui-monospace,'SF Mono',Menlo,monospace}.gap-evidence.missing{padding:11px;border-left:3px solid var(--gc-accent)}.gap-evidence.missing p,.gap-loss-warning p,.gap-late-note p{margin:4px 0 0;color:#4f5963;font-size:10px}.gap-loss-warning,.gap-late-note{margin-top:13px;padding:10px 11px;border-left:3px solid var(--gc-alarm);background:var(--gc-alarm-soft);color:var(--gc-alarm)}.gap-late-note{border-left-color:var(--gc-warn);background:var(--gc-warn-soft);color:var(--gc-warn)}.gap-loss-warning strong,.gap-late-note strong{font:800 9px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.65px}.gap-trace-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.gap-trace-actions a:hover{border-color:#aeb6bf;background:#fff}.gap-section-empty,.gap-console-empty{padding:24px 18px;color:var(--gc-muted);font-size:11px}.gap-console-empty{text-align:center;padding:46px 18px}.gap-console-empty strong,.gap-console-empty span{display:block}.gap-console-empty strong{color:var(--gc-ink);font-size:13px;margin-bottom:4px}
.gap-console-foot{display:flex;align-items:center;gap:12px;padding:9px 18px;border-top:1px solid var(--gc-rule);color:var(--gc-muted);font:500 9px ui-monospace,'SF Mono',Menlo,monospace}.gap-console-foot>button{border:0;background:transparent;color:var(--gc-accent);padding:0;text-decoration:underline}.gap-console-foot>div{display:flex;gap:7px;margin-left:auto}.gap-console-foot>div button{padding:6px 9px}.gap-console-foot>div button:disabled{opacity:.4;cursor:not-allowed}@keyframes gap-console-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.gap-console{animation:none}}
.gap-console-ledger .deleted{background:var(--gc-accent-soft)}.gap-console-ledger .deleted small,.gap-console-ledger .deleted strong{color:var(--gc-accent)}
.gap-console-head,.gap-console-intro,.gap-console-ledger,.gap-console-toolbar,.gap-console-foot{flex-shrink:0}
.gap-bucket.deleted .gap-bucket-head{border-left-color:var(--gc-accent);background:#f7f6fc}.gap-reason-chip.deleted{background:var(--gc-accent-soft);color:var(--gc-accent)}
.gap-delete-reasons{display:grid;grid-template-columns:repeat(6,minmax(110px,1fr));border-bottom:1px solid var(--gc-rule);background:#f8f8fb;overflow:auto}.gap-delete-reasons button{display:flex;justify-content:space-between;align-items:center;gap:8px;border:0;border-right:1px solid var(--gc-rule-soft);border-bottom:3px solid transparent;background:transparent;color:var(--gc-muted);padding:10px 12px;text-align:left;cursor:pointer}.gap-delete-reasons button:hover{background:#f0eff8;color:var(--gc-accent)}.gap-delete-reasons button.active{border-bottom-color:var(--gc-accent);background:#fff;color:var(--gc-accent)}.gap-delete-reasons button span{font:700 9px 'DM Sans';white-space:nowrap}.gap-delete-reasons button strong{font:800 11px ui-monospace,'SF Mono',Menlo,monospace}
.gap-contact-detail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin-top:13px;border:1px solid var(--gc-rule);background:var(--gc-rule)}.gap-contact-detail>span{min-width:0;padding:10px 11px;background:#fff}.gap-contact-detail small,.gap-contact-detail strong{display:block}.gap-contact-detail small{color:var(--gc-muted);font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.7px}.gap-contact-detail strong{margin-top:4px;font:700 10px ui-monospace,'SF Mono',Menlo,monospace;overflow-wrap:anywhere}
.gap-reason-total{border:1px solid var(--gc-rule);background:#fff;color:var(--gc-muted);padding:2px 7px;font:700 8px ui-monospace,'SF Mono',Menlo,monospace;letter-spacing:.7px}.gap-delete-reasons{display:block;background:#fff;overflow:visible}.gap-delete-reasons button{width:100%;display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:6px;border:0;border-left:3px solid transparent;border-bottom:1px solid var(--gc-rule);background:#fff;color:var(--gc-ink);padding:9px 17px;text-align:left}.gap-delete-reasons button:hover{background:#fafafd}.gap-delete-reasons button.active{border-left-color:var(--gc-accent);border-bottom-color:var(--gc-rule);background:#f7f6fc;color:var(--gc-ink)}.gap-delete-branch{color:#a4acb6!important;font:700 13px ui-monospace,'SF Mono',Menlo,monospace!important}.gap-delete-copy{display:flex;align-items:baseline;gap:10px;min-width:0;white-space:normal!important}.gap-delete-copy strong{font:700 11px 'DM Sans'!important;white-space:nowrap}.gap-delete-copy em{color:var(--gc-muted);font:500 10px 'DM Sans';font-style:normal}.gap-delete-reasons button>b{font:700 11px ui-monospace,'SF Mono',Menlo,monospace}.gap-evidence-table{grid-template-columns:22px minmax(150px,1fr) minmax(130px,.75fr) minmax(130px,1fr) minmax(100px,1fr) minmax(150px,1.2fr)}.gap-evidence-table b{white-space:normal;line-height:1.25}
@media(max-width:680px){.gap-console-backdrop{padding:0;align-items:end}.gap-console{width:100%;height:100%;max-height:100%;border-radius:0}.gap-console-intro{display:block}.gap-console-intro p{margin-top:8px}.gap-console-ledger{margin-left:12px;margin-right:12px}.gap-console-ledger>span{padding:8px}.gap-console-ledger strong{font-size:18px}.gap-console-toolbar{align-items:stretch;flex-direction:column}.gap-console-toolbar>div{justify-content:flex-end}.gap-bucket-head{padding-left:11px}.gap-bucket-head em{display:none}.gap-delete-reasons{grid-template-columns:repeat(6,minmax(125px,1fr))}.gap-stage-track{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gap-stage-node:not(:last-child):after{display:none}.gap-contact-detail{grid-template-columns:1fr 1fr}.gap-evidence header{display:block}.gap-evidence header em{display:block;margin:4px 0 0}.gap-evidence-table{grid-template-columns:18px minmax(120px,1fr) 75px}.gap-evidence-table>*:nth-child(6n+4),.gap-evidence-table>*:nth-child(6n+5),.gap-evidence-table>*:nth-child(6n+6){display:none}.gap-console-foot>span{display:none}}
.gap-console-loading,.gap-console-error{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:36px 18px;color:var(--gc-muted)}.gap-console-loading i{width:28px;height:28px;border:3px solid var(--gc-rule);border-top-color:var(--gc-accent);border-radius:50%;animation:gap-console-spin .7s linear infinite;margin-bottom:13px}.gap-console-loading strong,.gap-console-error strong{color:var(--gc-ink);font-size:13px}.gap-console-loading span,.gap-console-error span{font-size:10px;margin-top:5px}.gap-console-error{background:var(--gc-alarm-soft)}.gap-console-error strong{color:var(--gc-alarm)}@keyframes gap-console-spin{to{transform:rotate(360deg)}}
.force-refresh {
  border: 1px solid #9c5906;
  border-radius: 8px;
  background: #b76b08;
  color: #fff;
  min-width: 142px;
  padding: 10px 14px;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
}

.force-refresh:hover:not(:disabled) {
  background: #985806;
}

.force-refresh:disabled {
  opacity: .55;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .top-actions {
    gap: 6px;
  }

  .refresh,
  .force-refresh {
    min-width: 0;
    padding: 9px 8px;
    font-size: 10px;
  }
}
.date-total-row {
  background: #eef7f5;
  border-top: 2px solid #b9ddd5;
}
.date-total-row td {
  border-bottom: 2px solid #cfe5e0;
  color: #24483f;
}
.date-total-row td:first-child strong { color: #0b7464; }
.drawer-sheet-link {
  display: block;
  width: max-content;
  margin-top: 9px;
  color: var(--teal-dark);
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
  background: #e7f6f2;
  border-radius: 6px;
  padding: 7px 9px;
}
.sidebar-card.warning{border-color:#7b4d2d;background:#2b211d}.sidebar-card.warning small{color:#e0a776}.pulse-dot{animation:lgPulse 1.8s ease-out infinite}.refresh{background:linear-gradient(135deg,var(--teal-dark),#0fa48d);box-shadow:0 7px 18px #0d8a7330;transition:.2s ease}.refresh:hover{transform:translateY(-1px);box-shadow:0 10px 22px #0d8a7340}.alert-strip.tracker-stale{background:linear-gradient(100deg,#fff1e2,#fffaf3 58%,#fff);border-color:#edc18e;border-left-color:#ed8d2d}.tracker-stale .alert-icon{background:#ffe1bf;color:#c5660e;animation:lgPulse 1.8s ease-out infinite}.alert-strip>a{color:#ad580e;background:#fff2df;padding:9px 11px;border-radius:7px;text-decoration:none;font-size:11px;font-weight:800}.kpi,.stage{transition:.2s ease}.kpi:is(button):hover,.stage:hover{transform:translateY(-3px);box-shadow:0 10px 24px #17304712}.connector{position:relative;width:30px;text-align:center}.connector b{font-weight:400}.connector span{position:absolute;left:2px;top:50%;width:5px;height:5px;background:var(--teal);border-radius:50%;box-shadow:0 0 8px #0eae91;animation:lgFlow 2s linear infinite}
.loss-command{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 4px 14px #1a314507;padding:20px;margin-bottom:16px;overflow:hidden;position:relative}.loss-command:before{content:"";position:absolute;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,#e85c4c12,transparent 68%);right:-90px;top:-110px;pointer-events:none}.health-chip{border-radius:18px;padding:7px 10px!important;font-weight:800}.health-chip.current{background:#e8f7f1;color:#16825e}.health-chip.stale{background:#fff0dd;color:#b76112}.loss-grid{display:grid;grid-template-columns:minmax(420px,.95fr) minmax(460px,1.25fr);gap:15px;margin-top:16px}.live-master-card{border-radius:14px;background:linear-gradient(145deg,#0b1f2e,#102f3e);color:#fff;padding:21px;display:grid;grid-template-columns:160px 1fr;gap:20px;align-items:center;min-height:240px;box-shadow:0 16px 34px #08233528}.radar-visual{width:150px;height:150px;border-radius:50%;position:relative;display:grid;place-items:center;background:radial-gradient(circle,#123e4b 0 24%,transparent 25%),repeating-radial-gradient(circle,#37dab51c 0 1px,transparent 2px 24px);border:1px solid #45d0b534}.radar-visual:before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 75%,#38deb447);animation:lgRadar 3.2s linear infinite}.radar-visual>i{position:absolute;width:7px;height:7px;background:#ff6b61;border-radius:50%;box-shadow:0 0 0 5px #ff6b6120,0 0 12px #ff6b61}.radar-visual>i:nth-child(1){left:27px;top:54px}.radar-visual>i:nth-child(2){right:23px;bottom:47px}.radar-visual>i:nth-child(3){right:42px;top:30px}.radar-visual>span{z-index:2;text-align:center}.radar-visual small,.radar-visual em{display:block;font-style:normal;font-size:7px;letter-spacing:1px;color:#89b7ba}.radar-visual strong{display:block;font:800 30px 'Manrope';color:#ff7a70}.master-copy>p,.break-map header p{font-size:8px;letter-spacing:1.2px;color:#78a2aa;font-weight:800;margin:0}.master-copy h3,.break-map h3{font:800 16px 'Manrope';margin:5px 0 14px}.master-metrics{display:grid;grid-template-columns:1fr 1fr;gap:7px}.master-metrics span{background:#ffffff0d;border:1px solid #ffffff12;border-radius:8px;padding:9px}.master-metrics small{display:block;font-size:8px;color:#88aab2}.master-metrics strong{display:block;font:800 17px 'Manrope';margin-top:2px}.master-metrics .danger strong{color:#ff766d}.master-copy button{border:0;background:#31caa8;color:#05261f;border-radius:8px;padding:9px 11px;font-weight:800;font-size:10px;margin-top:11px;cursor:pointer}.break-map{border:1px solid var(--line);border-radius:14px;padding:17px;background:#fbfcfd}.break-map header{display:flex;justify-content:space-between;align-items:flex-start}.break-map header>span{font-size:8px;color:#83929d}.break-list{display:grid;gap:7px}.break-list>button{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:10px;width:100%;border:1px solid #e7ecef;background:#fff;border-radius:9px;padding:10px;text-align:left;cursor:pointer;transition:.18s ease}.break-list>button:hover{border-color:#dd9790;transform:translateX(3px);box-shadow:0 5px 14px #9b322b0c}.break-rank{font:800 10px 'Manrope';color:#a6b1ba}.break-copy strong{display:block;font-size:10px}.break-copy small{display:block;color:#83909a;font-size:8px;margin-top:2px}.break-copy i{display:block;height:3px;background:#edf1f3;border-radius:5px;margin-top:7px;overflow:hidden}.break-copy i b{display:block;height:100%;background:linear-gradient(90deg,#f49b58,#e45252);border-radius:5px;animation:lgBar .8s ease both}.break-list em{font-style:normal;font:800 17px 'Manrope';text-align:right}.break-list em small{display:block;font:700 7px 'DM Sans';text-transform:uppercase}.break-list em.hot{color:#d84b45}.break-list em.clear{color:#1c9e72}.coverage-warning{display:flex;align-items:center;gap:12px;border:1px solid #f0c493;background:linear-gradient(90deg,#fff6e8,#fff);border-radius:10px;padding:12px 14px;margin-top:13px}.coverage-warning>span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#ffe3bf;color:#bf6817;font-weight:800}.coverage-warning div{flex:1}.coverage-warning strong{font-size:11px}.coverage-warning p{font-size:9px;color:#7b6b5b;margin:3px 0 0}.coverage-warning a{font-size:9px;color:#a5530d;text-decoration:none;font-weight:800}
@keyframes lgFlow{0%{transform:translateX(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateX(22px);opacity:0}}@keyframes lgRadar{to{transform:rotate(360deg)}}@keyframes lgPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}@keyframes lgBar{from{width:0}}@media(max-width:1180px){.loss-grid{grid-template-columns:1fr}}@media(max-width:760px){.alert-strip>a{display:none}.loss-command{padding:15px}.live-master-card{grid-template-columns:1fr;text-align:center}.radar-visual{margin:auto}.master-metrics{text-align:left}.break-list>button{grid-template-columns:22px 1fr auto}.coverage-warning a{display:none}}@media(prefers-reduced-motion:reduce){.pulse-dot,.tracker-stale .alert-icon,.radar-visual:before,.connector span,.break-copy i b{animation:none!important}}`;
function LeadGuardStyle() {
  return <style dangerouslySetInnerHTML={{ __html: LEADGUARD_CSS }} />;
}


type StageKey = "direct" | "medium" | "directMediumGap" | "duplicate" | "expectedDuplicateGap" | "bufferTransfer" | "mediumBufferGap" | "mediumBufferLost" | "gap" | "buffer" | "crm" | "sameDayCrm" | "lateTransfer" | "masterCrmLost" | "bufferCrmGap" | "bufferToCrmGap" | "assigned" | "sales" | "kserve";
type GapKey = "gap1" | "gap2" | "gap3";
type DeletedReasonKey = "all" | "id" | "phone" | "spam";
type LeadRecord = {
  id: string; name: string; phone: string; date: string; company: string; source: string; generatedAt: string; timestamp: string;
  email?: string;
  companyRaw?: string; directConfig?: string;
  transferTimestamp: string; bufferTimestamp: string; currentStatus: string; transferStatus: string; bufferStatus: string; crmStatus: string;
  assignee: string; tatMin: number; tat: string; isDuplicate: boolean; validDuplicate?: boolean; expectedDuplicateGap?: boolean; lateTransfer?: boolean; sameDayCrm?: boolean; mediumBufferLost?: boolean; masterCrmLost?: boolean; mediumBufferState?: string; masterCrmState?: string; inMedium: boolean; toBuffer: boolean; inBuffer: boolean; inCrm: boolean; assigned: boolean;
  stage: string; status: "Lost" | "Duplicate" | "Delayed" | "Resolved"; reason: string; directUrl?: string; destinationUrl?: string; crmUrl?: string;
  original?: { id: string; name?: string; phone?: string; email?: string; company?: string; source: string; generatedAt: string; assignee: string; matchBasis?: string; url?: string };
};
type TrackerRow = {
  id: string; date: string; company: string; source: string; directUrl?: string; finalUrl?: string; stageUrls?: Partial<Record<StageKey, string>>;
  gapRecordsIncluded?: boolean;
  direct: number; medium: number; directMediumGap: number; duplicate: number; expectedDuplicateGap: number; lateTransfer: number; masterCrmTotal?: number; bufferTransfer: number; mediumBufferGap: number; mediumBufferLost: number; unexplainedMediumGap?: number; gap: number; buffer: number; crm: number; sameDayCrm: number; masterCrmLost: number; bufferCrmGap: number; bufferToCrmGap: number; assigned: number; sales: number; kserve: number;
  avgTatMin: number; slaBreaches: number; mismatch: boolean; validationErrors: string[]; records: LeadRecord[]; issues: LeadRecord[];
};
type PipelineHealth = { checklistLastDate: string; masterLatestDate: string; trackingLagDays: number; stageTrackingCurrent: boolean; message: string };
type CurrentSummary = { date: string; crm: number; assigned: number; kserve: number; sales: number; unassigned: number; slaBreaches: number };
type DashboardPayload = { live: boolean; schemaVersion?: number; logicVersion?: string; mode: string; diagnostic?: string; crmMode?: string; scannedAt: string; rows: TrackerRow[]; pipelineHealth?: PipelineHealth; currentSummary?: CurrentSummary; currentIssues?: LeadRecord[]; validation?: { rows: number; mismatches: number; leadIds: number; unmappedCompanies?: number; unmappedLeadIds?: string[] } };

const labels: Record<StageKey, string> = { direct: "Direct API Sheet Count", medium: "Master Medium Sheet", directMediumGap: "Actual Lost Direct API–Medium", duplicate: "Valid Duplicate Proof", expectedDuplicateGap: "Expected Duplicate Gap", bufferTransfer: "Transfer Decision: Buffer", mediumBufferGap: "Actual Lost Medium–Buffer", mediumBufferLost: "Actual Lost Medium–Buffer", gap: "Actual Lost Medium–Buffer", buffer: "Actual Buffer Count", crm: "Actual CRM Count", sameDayCrm: "Same-Day CRM", lateTransfer: "Late Transfer", masterCrmLost: "Actual Lost Master–CRM", bufferCrmGap: "Actual Lost Master–CRM", bufferToCrmGap: "Actual Lost Master–CRM", assigned: "Sales / KServe", sales: "Transfer to Sales Person", kserve: "Transfer to Kserve" };
const pipelineKeys: StageKey[] = ["direct", "medium", "buffer", "crm", "assigned"];
const gapMeta: Record<GapKey, { label: string; flow: string; description: string }> = {
  gap1: { label: "Gap 1", flow: "Direct API → Medium", description: "Direct API leads that did not reach Master Medium." },
  gap2: { label: "Gap 2", flow: "Medium → Buffer", description: "Expected duplicate gaps plus genuinely missing Buffer leads." },
  gap3: { label: "Gap 3", flow: "Buffer → CRM", description: "Late CRM transfers plus leads with no CRM proof." },
};
const gapCount = (row: TrackerRow | ReturnType<typeof totalRows>, key: GapKey) => key === "gap1" ? row.directMediumGap : key === "gap2" ? row.expectedDuplicateGap + row.mediumBufferLost : row.lateTransfer + row.masterCrmLost;
const gapLostCount = (row: TrackerRow | ReturnType<typeof totalRows>, key: GapKey) => key === "gap1" ? row.directMediumGap : key === "gap2" ? row.mediumBufferLost : row.masterCrmLost;
const fmt = (n: number) => Number(n || 0).toLocaleString("en-IN");
const dateLabel = (value: string) => { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const normalizeRow = (row: TrackerRow): TrackerRow => ({
  ...row,
  records: row.records ?? row.issues ?? [],
  issues: row.issues ?? [],
  medium: row.medium ?? row.direct,
  directMediumGap: row.directMediumGap ?? Math.max(0, row.direct - (row.medium ?? row.direct)),
  expectedDuplicateGap: row.expectedDuplicateGap ?? row.duplicate ?? 0,
  mediumBufferLost: row.mediumBufferLost ?? row.mediumBufferGap ?? Math.max(0, (row.medium ?? row.direct) - row.buffer - (row.expectedDuplicateGap ?? row.duplicate ?? 0)),
  mediumBufferGap: row.mediumBufferLost ?? row.mediumBufferGap ?? 0,
  unexplainedMediumGap: row.mediumBufferLost ?? row.unexplainedMediumGap ?? row.mediumBufferGap ?? 0,
  sameDayCrm: row.sameDayCrm ?? Math.max(0, row.crm - (row.lateTransfer ?? 0)),
  lateTransfer: row.lateTransfer ?? 0,
  masterCrmLost: row.masterCrmLost ?? row.bufferToCrmGap ?? 0,
  bufferToCrmGap: row.masterCrmLost ?? row.bufferToCrmGap ?? 0,
  sales: row.sales ?? row.assigned,
  kserve: row.kserve ?? 0,
});
const lostReasonStatus = (lead: LeadRecord) => {
  const basis = lead.original?.matchBasis ?? "";
  if (basis === "Enquiry ID") return { tone: "enquiry", label: "Duplicate by Enquiry ID", flag: "VERIFIED DUPLICATE", detail: "The same Enquiry ID was already forwarded within the 24-hour reconciliation window." };
  if (basis.includes("Mobile Number")) return { tone: "mobile", label: "Duplicate by Mobile Number", flag: "VERIFIED DUPLICATE", detail: basis.includes("Email ID") ? "Mobile Number and Email ID both match an earlier forwarded lead within 24 hours." : "Mobile Number matches an earlier forwarded lead within 24 hours." };
  if (basis === "Email ID") return { tone: "email", label: "Duplicate by Email ID", flag: "VERIFIED DUPLICATE", detail: "Email ID matches an earlier forwarded lead within the 24-hour reconciliation window." };
  return { tone: "lost", label: "No Duplicate — It's Lost", flag: "HIGH ALERT", detail: "No earlier forwarded lead matched by Enquiry ID, Mobile Number or Email ID within 24 hours." };
};
const deletedReason = (lead: LeadRecord): { key: Exclude<DeletedReasonKey, "all">; label: string; detail: string } => {
  const evidence = `${lead.reason ?? ""} ${lead.currentStatus ?? ""} ${lead.transferStatus ?? ""} ${lead.bufferStatus ?? ""}`.toLowerCase();
  const basis = (lead.original?.matchBasis ?? "").toLowerCase();
  if (evidence.includes("spam")) return { key: "spam", label: "Spam", detail: "Deleted because the enquiry was classified as spam." };
  if (basis.includes("enquiry id") || basis === "id" || evidence.includes("duplicate by id") || evidence.includes("duplicate enquiry id")) return { key: "id", label: "Duplicate by ID", detail: "Deleted · ID already exists in CRM." };
  return { key: "phone", label: "Duplicate by phone · 24 hr", detail: "Deleted · phone was already assigned inside the 24-hour window." };
};
const hasDeleteProof = (lead: LeadRecord) => {
  const evidence = `${lead.status ?? ""} ${lead.reason ?? ""} ${lead.currentStatus ?? ""} ${lead.transferStatus ?? ""} ${lead.bufferStatus ?? ""}`.toLowerCase();
  return evidence.includes("spam") || evidence.includes("deleted") || evidence.includes("delete sheet");
};
const stageRecords = (records: LeadRecord[], key: StageKey) => ({
  direct: records,
  medium: records.filter(x => x.inMedium),
  directMediumGap: records.filter(x => !x.inMedium),
  duplicate: records.filter(x => x.validDuplicate ?? Boolean(x.original)),
  expectedDuplicateGap: records.filter(x => x.expectedDuplicateGap),
  bufferTransfer: records.filter(x => x.toBuffer),
  mediumBufferGap: records.filter(x => x.mediumBufferLost),
  mediumBufferLost: records.filter(x => x.mediumBufferLost),
  gap: records.filter(x => x.mediumBufferLost),
  buffer: records.filter(x => x.mediumBufferState === "Reconciled" || (!x.mediumBufferState && x.inBuffer)),
  crm: records.filter(x => x.masterCrmState === "Reconciled" || x.masterCrmState === "Late Transfer" || (!x.masterCrmState && x.inCrm)),
  sameDayCrm: records.filter(x => x.sameDayCrm),
  lateTransfer: records.filter(x => x.lateTransfer),
  masterCrmLost: records.filter(x => x.masterCrmLost),
  bufferCrmGap: records.filter(x => x.masterCrmLost),
  bufferToCrmGap: records.filter(x => x.masterCrmLost),
  assigned: records.filter(x => x.assigned),
  sales: records.filter(x => x.assigned && x.assignee.trim().toLowerCase() !== "kserve"),
  kserve: records.filter(x => x.assigned && x.assignee.trim().toLowerCase() === "kserve"),
}[key]);
const gapRecords = (records: LeadRecord[], key: GapKey) => key === "gap1"
  ? records.filter(x => !x.inMedium)
  : key === "gap2"
    ? records.filter(x => x.expectedDuplicateGap || x.mediumBufferLost)
    : records.filter(x => x.lateTransfer || x.masterCrmLost);
const auditClass = (lead: LeadRecord) => lead.lateTransfer || lead.masterCrmState === "Late Transfer"
  ? "transient"
  : lead.expectedDuplicateGap || lead.validDuplicate || Boolean(lead.original) || hasDeleteProof(lead)
    ? "deleted"
    : "unexplained";
const auditReasonLabel = (lead: LeadRecord) => auditClass(lead) === "transient"
  ? "Late Transfer"
  : auditClass(lead) === "deleted"
    ? deletedReason(lead).label
    : lostReasonStatus(lead).label;

const totalRows = (items: TrackerRow[]) => items.reduce((a, r) => ({
  direct: a.direct + r.direct,
  medium: a.medium + r.medium,
  directMediumGap: a.directMediumGap + r.directMediumGap,
  duplicate: a.duplicate + r.duplicate,
  expectedDuplicateGap: a.expectedDuplicateGap + r.expectedDuplicateGap,
  lateTransfer: a.lateTransfer + r.lateTransfer,
  bufferTransfer: a.bufferTransfer + r.bufferTransfer,
  mediumBufferGap: a.mediumBufferGap + r.mediumBufferGap,
  mediumBufferLost: a.mediumBufferLost + r.mediumBufferLost,
  unexplainedMediumGap: a.unexplainedMediumGap + (r.unexplainedMediumGap ?? 0),
  gap: a.gap + r.gap,
  buffer: a.buffer + r.buffer,
  crm: a.crm + r.crm,
  sameDayCrm: a.sameDayCrm + r.sameDayCrm,
  masterCrmLost: a.masterCrmLost + r.masterCrmLost,
  bufferCrmGap: a.bufferCrmGap + r.bufferCrmGap,
  bufferToCrmGap: a.bufferToCrmGap + r.bufferToCrmGap,
  assigned: a.assigned + r.assigned,
  sales: a.sales + r.sales,
  kserve: a.kserve + r.kserve,
  slaBreaches: a.slaBreaches + r.slaBreaches,
  mismatches: a.mismatches + Number(r.mismatch),
  tatSum: a.tatSum + r.avgTatMin * r.buffer,
  tatWeight: a.tatWeight + r.buffer,
}), { direct: 0, medium: 0, directMediumGap: 0, duplicate: 0, expectedDuplicateGap: 0, lateTransfer: 0, bufferTransfer: 0, mediumBufferGap: 0, mediumBufferLost: 0, unexplainedMediumGap: 0, gap: 0, buffer: 0, crm: 0, sameDayCrm: 0, masterCrmLost: 0, bufferCrmGap: 0, bufferToCrmGap: 0, assigned: 0, sales: 0, kserve: 0, slaBreaches: 0, mismatches: 0, tatSum: 0, tatWeight: 0 });

export default function Home() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("All companies");
  const [source, setSource] = useState("All sources");
  const [date, setDate] = useState("All dates");
  const [health, setHealth] = useState("All status");
  const [sort, setSort] = useState("Highest loss");
  const [selected, setSelected] = useState<{ title: string; leads: LeadRecord[]; sheetUrl?: string; variant?: "drawer" | "lost-map"; gap?: GapKey } | null>(null);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [detailRows, setDetailRows] = useState<TrackerRow[] | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [openAuditSections, setOpenAuditSections] = useState<Set<string>>(new Set(["unexplained"]));
  const [expandedAuditLead, setExpandedAuditLead] = useState<string | null>(null);
  const [deletedReasonFilter, setDeletedReasonFilter] = useState<DeletedReasonKey>("all");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setForceRefreshing(force);
    setDetailRows(null);
    try {
      const response = await fetch(force ? "/api/lead-loss?refresh=1" : "/api/lead-loss", { cache: "no-store" });
      const data = await response.json() as DashboardPayload;
      setPayload(data);
      if (!response.ok || !data.live) throw new Error(data.diagnostic || "Live reconciliation source unavailable");
      if (force) setToast("Cache bypassed. Fresh sheet scan completed.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Dashboard refresh nahi ho saka.");
    } finally {
      setLoading(false);
      setForceRefreshing(false);
    }
  };
  useEffect(() => { let active = true; fetch("/api/lead-loss", { cache: "no-store" }).then(response => response.json()).then(data => { if (active) { setPayload(data); setDetailRows(null); setLoading(false); } }).catch(() => { if (active) { setToast("Dashboard refresh nahi ho saka."); setLoading(false); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!selected) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); }; document.addEventListener("keydown", close); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previous; }; }, [selected]);

  const rows = useMemo(() => (payload?.rows ?? []).map(normalizeRow), [payload]);
  const companies = [...new Set(rows.map(r => r.company))].sort();
  const sources = [...new Set(rows.map(r => r.source))].sort();
  const dates = [...new Set(rows.map(r => r.date))].sort((a, b) => b.localeCompare(a));
  const visible = useMemo(() => rows.filter(row => {
    const rowHealth = row.mismatch ? "Data Mismatch" : row.directMediumGap || row.mediumBufferLost || row.masterCrmLost ? "Lost" : row.slaBreaches ? "TAT breach" : "Reconciled";
    return (company === "All companies" || row.company === company) && (source === "All sources" || row.source === source) && (date === "All dates" || row.date === date) && (health === "All status" || health === rowHealth) && `${row.company} ${row.source} ${row.date}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => b.date.localeCompare(a.date) || a.company.localeCompare(b.company) || (sort === "Highest loss" ? (b.directMediumGap + b.mediumBufferLost + b.masterCrmLost) - (a.directMediumGap + a.mediumBufferLost + a.masterCrmLost) : sort === "Highest TAT" ? b.avgTatMin - a.avgTatMin : a.source.localeCompare(b.source)) || a.source.localeCompare(b.source)), [rows, company, source, date, health, query, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, TrackerRow[]>();
    visible.forEach(row => map.set(row.date, [...(map.get(row.date) ?? []), row]));
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([groupDate, groupRows]) => {
      const companyMap = new Map<string, TrackerRow[]>();
      groupRows.forEach(row => companyMap.set(row.company, [...(companyMap.get(row.company) ?? []), row]));
      const companiesForDate = [...companyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([groupCompany, companyRows]) => ({ company: groupCompany, rows: companyRows, total: totalRows(companyRows) }));
      return { date: groupDate, rows: groupRows, companies: companiesForDate, total: totalRows(groupRows) };
    });
  }, [visible]);
  const activeExpandedDate = expandedDate && groups.some(group => group.date === expandedDate) ? expandedDate : groups[0]?.date ?? null;
  const allRecords = visible.flatMap(r => r.records ?? r.issues ?? []);
  const summary = visible.reduce((a, r) => ({ direct: a.direct + r.direct, medium: a.medium + r.medium, duplicate: a.duplicate + r.duplicate, expectedDuplicateGap: a.expectedDuplicateGap + r.expectedDuplicateGap, toBuffer: a.toBuffer + r.bufferTransfer, buffer: a.buffer + r.buffer, mediumLost: a.mediumLost + r.mediumBufferLost, crm: a.crm + r.crm, sameDayCrm: a.sameDayCrm + r.sameDayCrm, lateTransfer: a.lateTransfer + r.lateTransfer, masterLost: a.masterLost + r.masterCrmLost, assigned: a.assigned + r.assigned, breaches: a.breaches + r.slaBreaches, tatSum: a.tatSum + r.avgTatMin * r.buffer, tatWeight: a.tatWeight + r.buffer, mismatches: a.mismatches + Number(r.mismatch) }), { direct: 0, medium: 0, duplicate: 0, expectedDuplicateGap: 0, toBuffer: 0, buffer: 0, mediumLost: 0, crm: 0, sameDayCrm: 0, lateTransfer: 0, masterLost: 0, assigned: 0, breaches: 0, tatSum: 0, tatWeight: 0, mismatches: 0 });
  const openLoss = visible.reduce((total, row) => total + row.directMediumGap + row.mediumBufferLost + row.masterCrmLost + Math.max(0, row.crm - row.assigned), 0);
  const tatBreachCount = visible.reduce((total, row) => total + (!row.mismatch && !row.directMediumGap && !row.mediumBufferLost && !row.masterCrmLost ? row.slaBreaches : 0), 0);
  const reconciledCount = Math.max(0, summary.direct - openLoss);
  const reconciledPercent = summary.direct ? Math.round(reconciledCount / summary.direct * 1000) / 10 : 0;
  const funnelLeaks = [
    { label: "API to Master Medium", count: Math.max(0, summary.direct - summary.medium), select: (lead: LeadRecord) => !lead.inMedium },
    { label: "Master Medium to Buffer", count: Math.max(0, summary.medium - summary.buffer), select: (lead: LeadRecord) => lead.inMedium && !lead.inBuffer },
    { label: "Buffer to CRM", count: Math.max(0, summary.buffer - summary.crm), select: (lead: LeadRecord) => lead.inBuffer && !lead.inCrm },
    { label: "CRM to Sales / KServe", count: Math.max(0, summary.crm - summary.assigned), select: (lead: LeadRecord) => lead.inCrm && !lead.assigned },
  ];
  const biggestLeak = funnelLeaks.reduce((largest, stage) => stage.count > largest.count ? stage : largest, funnelLeaks[0]);
  // TODO: expose a per-lead CRM-entry timestamp from the source payload before calculating Direct API capture → CRM entry TAT.
  const avgCrmTat = "—";
  const gapKeys: StageKey[] = ["directMediumGap", "mediumBufferLost", "masterCrmLost"];
  const open = (title: string, leads: LeadRecord[], sheetUrl?: string, variant: "drawer" | "lost-map" = "drawer", gap?: GapKey) => { setDetailError(""); setDrawerQuery(""); setPage(1); setExpandedAuditLead(null); setDeletedReasonFilter("all"); setOpenAuditSections(new Set(["unexplained"])); setSelected({ title, leads, sheetUrl, variant, gap }); };
  const getDetailedRows = async (requestedIds: string[]) => {
    const uniqueIds = [...new Set(requestedIds)];
    const cached = new Map((detailRows ?? []).map(row => [row.id, row]));
    const missingIds = uniqueIds.filter(id => !cached.has(id));
    if (!missingIds.length) return uniqueIds.map(id => cached.get(id)).filter(Boolean) as TrackerRow[];
    setDetailError("");
    setDetailsLoading(true);
    setToast("Exact Lead IDs load ho rahe hain…");
    try {
      const batches = Array.from({ length: Math.ceil(missingIds.length / 20) }, (_, index) => missingIds.slice(index * 20, index * 20 + 20));
      const loaded = (await Promise.all(batches.map(async ids => {
        const response = await fetch(`/api/lead-loss?details=1&ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
        const data = await response.json() as DashboardPayload;
        if (!response.ok || !data.live) throw new Error(data.diagnostic ?? "Lead detail source unavailable");
        return (data.rows ?? []).map(normalizeRow);
      }))).flat();
      loaded.forEach(row => cached.set(row.id, row));
      setDetailRows([...cached.values()]);
      setToast("");
      return uniqueIds.map(id => cached.get(id)).filter(Boolean) as TrackerRow[];
    } catch {
      setDetailError("Lead details source timed out. Please close karke count par dobara click karein.");
      setToast("Lead details load nahi ho sake. Please retry.");
      return null;
    } finally { setDetailsLoading(false); }
  };
  const getGapDetailedRows = async (requestedIds: string[]) => {
    const wanted = new Set(requestedIds);
    const embedded = rows.filter(row => wanted.has(row.id));
    if (embedded.length === wanted.size && embedded.every(row => row.gapRecordsIncluded)) return embedded;
    return getDetailedRows(requestedIds);
  };
  const openGapShell = (title: string, sheetUrl: string | undefined, gap?: GapKey) => open(title, [], sheetUrl, "lost-map", gap);
  const fillOpenGap = (title: string, leads: LeadRecord[], sheetUrl?: string) => setSelected(current => current?.variant === "lost-map" && current.title === title ? { ...current, leads, sheetUrl: sheetUrl ?? current.sheetUrl } : current);
  const openDetailed = async (title: string, predicate: (lead: LeadRecord) => boolean, variant: "drawer" | "lost-map" = "drawer") => { const ids = visible.map(row => row.id); if (variant === "lost-map") { openGapShell(title, undefined); const detailed = await getGapDetailedRows(ids); if (!detailed) return; fillOpenGap(title, detailed.flatMap(row => row.records ?? []).filter(predicate)); return; } const detailed = await getDetailedRows(ids); if (!detailed) return; open(title, detailed.flatMap(row => row.records ?? []).filter(predicate), undefined, variant); };
  const openDetailedStage = async (title: string, key: StageKey) => { const ids = visible.map(row => row.id); const detailed = await getDetailedRows(ids); if (!detailed) return; open(title, detailed.flatMap(row => stageRecords(row.records ?? [], key)), undefined, gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openRowDetailed = async (row: TrackerRow, title: string, predicate: (lead: LeadRecord) => boolean) => { const detailed = await getDetailedRows([row.id]); if (!detailed) return; const exactRow = detailed.find(item => item.id === row.id); open(title, (exactRow?.records ?? []).filter(predicate), row.finalUrl); };
  const openStage = async (row: TrackerRow, key: StageKey) => { const detailed = await getDetailedRows([row.id]); if (!detailed) return; const exactRow = detailed.find(item => item.id === row.id); open(`${row.company} · ${row.source} · ${labels[key]}`, stageRecords(exactRow?.records ?? [], key), row.stageUrls?.[key] ?? row.finalUrl, gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openTotal = async (groupDate: string, key: StageKey) => { const ids = visible.filter(row => row.date === groupDate).map(row => row.id); const detailed = await getDetailedRows(ids); if (!detailed) return; open(`${dateLabel(groupDate)} total · ${labels[key]}`, detailed.flatMap(row => stageRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key], gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openCompanyTotal = async (groupDate: string, groupCompany: string, key: StageKey) => { const ids = visible.filter(row => row.date === groupDate && row.company === groupCompany).map(row => row.id); const detailed = await getDetailedRows(ids); if (!detailed) return; open(`${dateLabel(groupDate)} · ${groupCompany} total · ${labels[key]}`, detailed.flatMap(row => stageRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key], gapKeys.includes(key) ? "lost-map" : "drawer"); };
  const openGapRow = async (row: TrackerRow, key: GapKey) => { const title = `${row.company} · ${row.source} · ${dateLabel(row.date)}`; const sheetUrl = row.stageUrls?.[key === "gap1" ? "directMediumGap" : key === "gap2" ? "mediumBufferLost" : "masterCrmLost"] ?? row.finalUrl; openGapShell(title, sheetUrl, key); const detailed = await getGapDetailedRows([row.id]); if (!detailed) return; const exact = detailed.find(item => item.id === row.id); fillOpenGap(title, gapRecords(exact?.records ?? [], key), sheetUrl); };
  const openGapCompany = async (groupDate: string, groupCompany: string, key: GapKey) => { const ids = visible.filter(row => row.date === groupDate && row.company === groupCompany).map(row => row.id); const meta = gapMeta[key]; const title = `${dateLabel(groupDate)} · ${groupCompany} · ${meta.flow}`; openGapShell(title, undefined, key); const detailed = await getGapDetailedRows(ids); if (!detailed) return; fillOpenGap(title, detailed.flatMap(row => gapRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key === "gap1" ? "directMediumGap" : key === "gap2" ? "mediumBufferLost" : "masterCrmLost"]); };
  const openGapDate = async (groupDate: string, key: GapKey) => { const ids = visible.filter(row => row.date === groupDate).map(row => row.id); const meta = gapMeta[key]; const title = `${dateLabel(groupDate)} · All companies · ${meta.flow}`; openGapShell(title, undefined, key); const detailed = await getGapDetailedRows(ids); if (!detailed) return; fillOpenGap(title, detailed.flatMap(row => gapRecords(row.records ?? [], key)), detailed[0]?.stageUrls?.[key === "gap1" ? "directMediumGap" : key === "gap2" ? "mediumBufferLost" : "masterCrmLost"]); };
  const filteredDrawer = useMemo(() => (selected?.leads ?? []).filter(lead => `${lead.id} ${lead.name} ${lead.phone} ${lead.email ?? ""} ${lead.company} ${lead.source} ${lead.currentStatus} ${lead.bufferStatus} ${lead.crmStatus} ${lead.original?.id ?? ""} ${lead.original?.phone ?? ""} ${lead.original?.email ?? ""}`.toLowerCase().includes(drawerQuery.toLowerCase())), [selected, drawerQuery]);
  const pageSize = 20, pageCount = Math.max(1, Math.ceil(filteredDrawer.length / pageSize));
  const auditOrder = { unexplained: 0, transient: 1, deleted: 2 } as const;
  const pagedDrawer = [...filteredDrawer].sort((a, b) => auditOrder[auditClass(a) as keyof typeof auditOrder] - auditOrder[auditClass(b) as keyof typeof auditOrder]).slice((page - 1) * pageSize, page * pageSize);
  const deletedCount = filteredDrawer.filter(lead => auditClass(lead) === "deleted").length;
  const transientCount = filteredDrawer.filter(lead => auditClass(lead) === "transient").length;
  const actualLostCount = filteredDrawer.filter(lead => auditClass(lead) === "unexplained").length;
  const deletedReasonOptions: Array<{ key: Exclude<DeletedReasonKey, "all">; label: string; description: string }> = [
    { key: "id", label: "Duplicate by ID", description: "Deleted · ID already in the CRM" },
    { key: "phone", label: "Duplicate by phone · 24 hr", description: "Deleted · phone assigned inside 24 hr" },
    { key: "spam", label: "Spam", description: "Deleted · junk or test entry" },
  ];
  const deletedReasonCount = (key: DeletedReasonKey) => filteredDrawer.filter(lead => auditClass(lead) === "deleted" && (key === "all" || deletedReason(lead).key === key)).length;
  const auditSections = [
    { key: "unexplained", title: "Actual Lost", description: "No duplicate reason, no later transfer and no destination proof", rows: pagedDrawer.filter(lead => auditClass(lead) === "unexplained") },
    { key: "transient", title: "Late Transfer", description: "Transferred later; retained on the source date and never counted as Lost", rows: pagedDrawer.filter(lead => auditClass(lead) === "transient") },
    { key: "deleted", title: "Deleted", description: "Removed at distribution by a rule", rows: pagedDrawer.filter(lead => auditClass(lead) === "deleted" && deletedReasonFilter !== "all" && deletedReason(lead).key === deletedReasonFilter) },
  ];
  const auditSectionCount = (key: string) => filteredDrawer.filter(lead => auditClass(lead) === key).length;
  const toggleAuditSection = (key: string) => setOpenAuditSections(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const exportCsv = () => {
    const fields: (keyof LeadRecord)[] = ["id", "name", "phone", "email", "date", "company", "source", "currentStatus", "bufferStatus", "crmStatus", "timestamp", "transferStatus", "transferTimestamp", "tat"];
    const csv = [fields.join(","), ...filteredDrawer.map(lead => fields.map(field => `"${String(lead[field] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = `lead-audit-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  const reset = () => { setQuery(""); setCompany("All companies"); setSource("All sources"); setDate("All dates"); setHealth("All status"); };

  const lossStages: Array<{ label: string; count: number; hint: string; select: (lead: LeadRecord) => boolean }> = [
    { label: "Direct API → Master Medium", count: visible.reduce((n, row) => n + row.directMediumGap, 0), hint: "Lead ID did not enter Master Medium", select: x => !x.inMedium },
    { label: "Medium → Buffer", count: summary.mediumLost, hint: "Eligible non-duplicate Lead ID is missing in Buffer", select: x => Boolean(x.mediumBufferLost) },
    { label: "Master → CRM", count: summary.masterLost, hint: "No same-day or later CRM proof found", select: x => Boolean(x.masterCrmLost) },
    { label: "CRM → Sales / KServe", count: Math.max(0, summary.crm - summary.assigned), hint: "CRM lead has no assignee", select: x => x.inCrm && !x.assigned },
  ];
  const largestLoss = Math.max(1, ...lossStages.map(x => x.count));
  const selectedGapMeta = selected?.gap ? gapMeta[selected.gap] : { label: "Gap / Lost Audit", flow: "Pipeline reconciliation", description: "Missing Lead IDs reconciled against every available stage and reason." };
  const auditStages = (lead: LeadRecord) => [
    { label: "Source sheet", reached: true, value: lead.generatedAt || lead.timestamp || dateLabel(lead.date) },
    { label: "Master Medium", reached: lead.inMedium, value: lead.inMedium ? lead.transferTimestamp || "Matched" : "—" },
    { label: "Buffer", reached: lead.inBuffer, value: lead.inBuffer ? lead.bufferTimestamp || "Matched" : "—" },
    { label: "CRM", reached: lead.inCrm || Boolean(lead.lateTransfer), value: lead.inCrm || lead.lateTransfer ? lead.crmStatus || (lead.lateTransfer ? "Late transfer" : "Matched") : "—" },
  ];

  return <div className="shell"><LeadGuardStyle />
    
    <main>
      <header className="topbar"><div><p>OPERATIONS / LEAD CONTROL</p><h1>CRM reconciliation command center</h1></div><div className="topbar-actions" style={{display: "flex", gap: "10px", marginLeft: "auto", marginRight: "20px"}}><button onClick={() => openDetailed("Open incidents", x => x.status !== "Resolved")} style={{padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: "bold"}}>! Incidents {summary.breaches + openLoss}</button><button onClick={() => openDetailed("Duplicate proof", x => x.validDuplicate ?? Boolean(x.original))} style={{padding: "8px 12px", background: "#f1f5f9", borderRadius: "6px", fontSize: "12px", fontWeight: "bold"}}>⌘ Duplicate proof</button></div><div className="top-actions"><span className={`mode ${payload?.live ? "live" : "demo"}`}><i/>{payload?.live ? "LIVE DATA" : payload ? "SOURCE ERROR" : "CONNECTING"}</span><button className="refresh" onClick={() => load(false)} disabled={loading}>{loading && !forceRefreshing ? "Refreshing…" : "↻ Refresh now"}</button><button className="force-refresh" onClick={() => load(true)} disabled={loading}>{forceRefreshing ? "Scanning all sheets…" : "⟳ Force fresh scan"}</button></div></header>
      <section className={`alert-strip ${!payload?.live || summary.mismatches ? "tracker-stale" : ""}`}><div className="alert-icon">!</div><div><strong>{loading && !payload ? "Connecting to live Google Sheets…" : payload && !payload.live ? "Live reconciliation source unavailable" : summary.mismatches ? `${summary.mismatches} Data Mismatch row${summary.mismatches > 1 ? "s" : ""} found` : openLoss ? `${openLoss} lead reconciliation exception${openLoss > 1 ? "s" : ""}` : "All Lead IDs are reconciled"}</strong><p>{loading && !payload ? "Latest Date + Company + Source reconciliation is loading. Counts will appear automatically." : payload && !payload.live ? `${payload.diagnostic ?? "Secure Google Sheets bridge did not return live rows."} No demo counts are shown.` : summary.mismatches ? "Row formulas failed—highlighted rows par click karke exact Lead IDs audit karein." : openLoss ? "Lost radar exact pipeline stage aur records identify karta hai." : "Direct, duplicate, buffer and CRM formulas match."}</p></div><button onClick={() => payload?.live ? openDetailed("Reconciliation exceptions", x => x.status !== "Resolved") : load()} disabled={loading || detailsLoading}>{payload?.live ? detailsLoading ? "Loading Lead IDs…" : "Review leads →" : loading ? "Connecting…" : "Retry live sync →"}</button></section>
      <section className="filters"><label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search company, source or date…"/></label><select value={company} onChange={e => setCompany(e.target.value)}><option>All companies</option>{companies.map(x => <option key={x}>{x}</option>)}</select><select value={source} onChange={e => setSource(e.target.value)}><option>All sources</option>{sources.map(x => <option key={x}>{x}</option>)}</select><select value={date} onChange={e => setDate(e.target.value)}><option>All dates</option>{dates.map(x => <option key={x} value={x}>{dateLabel(x)}</option>)}</select><select value={health} onChange={e => setHealth(e.target.value)}><option>All status</option><option>Data Mismatch</option><option>Lost</option><option>TAT breach</option><option>Reconciled</option></select><button className="clear" onClick={reset}>Clear</button></section>
      <section className="kpis"><button className="kpi" onClick={() => openDetailed("All direct API leads", () => true)}><span className="kpi-icon teal">↓</span><div><small>DIRECT API LEADS</small><strong>{fmt(summary.direct)}</strong><p>Unique Lead IDs</p></div></button><button className="kpi danger" onClick={() => openDetailed("Open lost leads", x => lossStages.some(stage => stage.select(x)), "lost-map")}><span className="kpi-icon red">!</span><div><small>ACTUAL LOST / OPEN GAPS</small><strong>{fmt(openLoss)}</strong><p>Expected duplicates excluded</p></div></button><button className="kpi" onClick={() => openDetailed("Expected duplicate gaps", x => Boolean(x.expectedDuplicateGap))}><span className="kpi-icon amber">⌘</span><div><small>EXPECTED DUPLICATE GAPS</small><strong>{fmt(summary.expectedDuplicateGap)}</strong><p>Mobile + email · within 24h</p></div></button><button className="kpi" onClick={() => openDetailed("Late CRM transfers", x => Boolean(x.lateTransfer))}><span className="kpi-icon violet">◷</span><div><small>LATE TRANSFER</small><strong>{fmt(summary.lateTransfer)}</strong><p>Delayed, never Lost</p></div></button><button className="kpi" onClick={() => openDetailed("Sales / KServe assignments", x => x.assigned)}><span className="kpi-icon green">✓</span><div><small>SALES / KSERVE</small><strong>{fmt(summary.assigned)}</strong><p>{summary.direct ? Math.round(summary.assigned / summary.direct * 1000) / 10 : 0}% of intake</p></div></button></section>
      <section className="kpis"><button className="kpi" onClick={() => setHealth("TAT breach")}><span className="kpi-icon amber">◷</span><div><small>TAT BREACH</small><strong>{fmt(tatBreachCount)}</strong><p>Over SLA, not lost yet</p></div></button><button className="kpi" onClick={() => setHealth("Data Mismatch")}><span className="kpi-icon teal">≠</span><div><small>DATA MISMATCH</small><strong>{fmt(summary.mismatches)}</strong><p>Field conflict across sheets</p></div></button><button className="kpi" onClick={() => setHealth("Reconciled")}><span className="kpi-icon green">✓</span><div><small>RECONCILED</small><strong>{fmt(reconciledCount)}</strong><p>{reconciledPercent}% fully matched</p></div></button><button className="kpi danger" onClick={() => openDetailed(`${biggestLeak.label} gaps`, biggestLeak.select, "lost-map")}><span className="kpi-icon red">!</span><div><small>BIGGEST LEAK STAGE</small><strong>{fmt(biggestLeak.count)}</strong><p>{biggestLeak.label}</p></div></button><button className="kpi" onClick={() => openDetailed("API to CRM entry TAT", x => x.inCrm)}><span className="kpi-icon violet">◴</span><div><small>AVG TAT</small><strong>{avgCrmTat}</strong><p>API to CRM entry</p></div></button></section>
      <section className="pipeline-card"><div className="section-title"><div><p>LIVE ID FUNNEL</p><h2>Lead ID proof through every stage</h2></div><span>{payload?.crmMode ?? "CRM source unavailable"}</span></div><div className="pipeline">{pipelineKeys.map((key, index) => { const count = visible.reduce((n, row) => n + row[key], 0); return <div className="pipeline-wrap" key={key}><button className={`stage ${key === "assigned" ? "success" : ""}`} onClick={() => openDetailedStage(labels[key], key)}><span>{index + 1}</span><small>{labels[key]}</small><strong>{fmt(count)}</strong><em>{summary.direct ? Math.round(count / summary.direct * 100) : 0}%</em></button>{index < pipelineKeys.length - 1 && <i className="connector"><b>→</b></i>}</div>; })}</div><div className="funnel-note"><span className="green-dot"/> Duplicate/Delete is explained—not lost. Every count is deduplicated by Lead ID and grouped by Date + Company + Verified Source.</div></section>
      <section className="loss-command" id="lost-radar"><div className="section-title"><div><p>LOST LEAD RADAR</p><h2>Exactly where reconciliation is breaking</h2></div><span className={`health-chip ${summary.mismatches ? "stale" : "current"}`}>{summary.mismatches ? `⚠ ${summary.mismatches} formula mismatch` : "● Formula validation passed"}</span></div><div className="loss-grid"><article className="live-master-card"><div className="radar-visual"><i/><i/><i/><span><small>OPEN</small><strong>{fmt(openLoss)}</strong><em>exceptions</em></span></div><div className="master-copy"><p>LATEST RECONCILIATION · {payload?.currentSummary?.date ? dateLabel(payload.currentSummary.date) : "—"}</p><h3>Medium → Buffer and Master → CRM</h3><div className="master-metrics"><span><small>Buffer</small><strong>{fmt(summary.buffer)}</strong></span><span><small>Same-day CRM</small><strong>{fmt(summary.sameDayCrm)}</strong></span><span><small>Late transfer</small><strong>{fmt(summary.lateTransfer)}</strong></span><span className="danger"><small>Actual lost</small><strong>{fmt(summary.mediumLost + summary.masterLost)}</strong></span></div><button onClick={() => openDetailed("All open reconciliation exceptions", x => lossStages.some(stage => stage.select(x)), "lost-map")}>Open exact lost leads →</button></div></article><article className="break-map"><header><div><p>LIVE STAGE MAP</p><h3>Date + Company + Source</h3></div><span>Click a stage to audit</span></header><div className="break-list">{lossStages.map((stage, index) => <button key={stage.label} onClick={() => openDetailed(`${stage.label} lost leads`, stage.select, "lost-map")}><span className="break-rank">0{index + 1}</span><span className="break-copy"><strong>{stage.label}</strong><small>{stage.hint}</small><i><b style={{ width: `${Math.max(3, stage.count / largestLoss * 100)}%` }}/></i></span><em className={stage.count ? "hot" : "clear"}>{fmt(stage.count)}<small>{stage.count ? " lost" : " clear"}</small></em></button>)}</div></article></div></section>
      {/* ═══ PREMIUM RECONCILIATION TABLE ═══════════════════════════════════ */}
      <section id="reconciliation" style={{
        background:"#fff",border:"1px solid #e5ebf0",borderRadius:14,
        boxShadow:"0 4px 24px #17304709",overflow:"hidden",marginBottom:20
      }}>
        {/* Table header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"18px 22px 14px",borderBottom:"1px solid #edf2f6",background:"#fafcfd",flexWrap:"wrap",gap:10}}>
          <div>
            <p style={{margin:0,fontSize:9,fontWeight:800,letterSpacing:"1.4px",color:"#7e8d9b",textTransform:"uppercase"}}>DAILY RECONCILIATION · LIVE SQL</p>
            <h2 style={{margin:"4px 0 0",fontSize:17,fontWeight:700,letterSpacing:"-.3px",color:"#12202f"}}>
              Lead Pipeline · Sent → KServe → Lost / Received
            </h2>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{background:"#f0fdf4",color:"#166534",border:"1px solid #bbf7d0",borderRadius:8,padding:"6px 11px",fontSize:10,fontWeight:700}}>
              ● {fmt(visible.reduce((s,r)=>s+r.crm,0))} Received
            </span>
            <span style={{background:"#fff0f0",color:"#991b1b",border:"1px solid #fecaca",borderRadius:8,padding:"6px 11px",fontSize:10,fontWeight:700}}>
              ✕ {fmt(visible.reduce((s,r)=>s+r.masterCrmLost,0))} Lost
            </span>
            <span style={{background:"#fff9f0",color:"#92400e",border:"1px solid #fde68a",borderRadius:8,padding:"6px 11px",fontSize:10,fontWeight:700}}>
              ◷ {fmt(visible.reduce((s,r)=>s+r.mediumBufferLost,0))} Pending
            </span>
            <select value={sort} onChange={e=>setSort(e.target.value)}
              style={{border:"1px solid #dbe3e9",borderRadius:7,padding:"7px 10px",fontSize:11,background:"#fff",color:"#455465"}}>
              <option>Highest loss</option><option>Source A-Z</option>
            </select>
          </div>
        </div>

        {/* Groups by date */}
        {groups.length === 0 && (
          <div style={{textAlign:"center",padding:"48px 20px",color:"#8a9bae"}}>
            <div style={{fontSize:28,marginBottom:10}}>📊</div>
            <strong style={{display:"block",fontSize:14,color:"#334e68",marginBottom:5}}>
              {loading ? "Loading live SQL data..." : "No data for selected filters"}
            </strong>
            <span style={{fontSize:12}}>{loading ? "Fetching from ai_voice_leads_sent + ai_voice_leads_received" : "Try adjusting date or company filters"}</span>
          </div>
        )}

        {groups.map((group, gi) => {
          const isDateOpen = activeExpandedDate === group.date;
          // create date based on group.date for visual badge
          const isToday = group.date === new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
          const totalLost = group.total.masterCrmLost + group.total.mediumBufferLost;
          const lossRate = group.total.direct > 0 ? Math.round(totalLost / group.total.direct * 100) : 0;
          const allClear = totalLost === 0;

          return (
            <div key={group.date} style={{borderBottom: gi < groups.length-1 ? "2px solid #edf2f6" : "none"}}>
              <button
                style={{
                  width:"100%",display:"flex",alignItems:"center",gap:16,
                  padding:"14px 22px",border:0,textAlign:"left",cursor:"pointer",
                  background: isToday ? "linear-gradient(90deg,#eff8f1,#f8fcf9)" : isDateOpen ? "#f4f8fc" : "#fafcfd",
                  borderLeft: isToday ? "4px solid #22c55e" : isDateOpen ? "4px solid #3b82f6" : "4px solid transparent",
                  transition:".15s",
                }}
                onClick={()=>setExpandedDate(isDateOpen?null:group.date)}
              >
                <span style={{
                  width:26,height:26,borderRadius:6,border:"1.5px solid #d1dbe6",
                  display:"grid",placeItems:"center",fontSize:14,fontWeight:800,
                  background:"#fff",color:"#334e68",flexShrink:0
                }}>{isDateOpen?"-":"+"}</span>

                <div style={{minWidth:120}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <strong style={{fontSize:14,fontWeight:800,color:"#12202f",letterSpacing:"-.2px"}}>
                      {dateLabel(group.date)}
                    </strong>
                    {isToday && (
                      <span style={{background:"#22c55e",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:800,letterSpacing:".5px"}}>TODAY</span>
                    )}
                  </div>
                  <small style={{fontSize:10,color:"#7e8d9b"}}>{group.companies.length} companies · {group.rows.length} sources</small>
                </div>

                <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
                  <span style={{background:"#f0f4f8",color:"#334e68",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,minWidth:64,textAlign:"center"}}>
                    <span style={{display:"block",fontSize:8,fontWeight:700,letterSpacing:".8px",color:"#7e8d9b",marginBottom:2}}>SENT</span>
                    {fmt(group.total.direct)}
                  </span>
                  <span style={{background:"#f0fdf4",color:"#166534",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,minWidth:64,textAlign:"center"}}>
                    <span style={{display:"block",fontSize:8,fontWeight:700,letterSpacing:".8px",color:"#16a34a",marginBottom:2}}>RECEIVED</span>
                    {fmt(group.total.crm)}
                  </span>
                  <span style={{background: totalLost>0 ? "#fff0f0" : "#f0fdf4", color: totalLost>0 ? "#991b1b" : "#166534", borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,minWidth:64,textAlign:"center"}}>
                    <span style={{display:"block",fontSize:8,fontWeight:700,letterSpacing:".8px",marginBottom:2,color:"inherit",opacity:.7}}>LOST</span>
                    {fmt(totalLost)}
                  </span>
                  <span style={{background:"#fff9f0",color:"#92400e",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,minWidth:64,textAlign:"center"}}>
                    <span style={{display:"block",fontSize:8,fontWeight:700,letterSpacing:".8px",marginBottom:2,opacity:.7}}>PENDING</span>
                    {fmt(group.total.mediumBufferLost)}
                  </span>
                </div>

                <span style={{
                  padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:800,flexShrink:0,
                  background: allClear?"#dcfce7":lossRate>20?"#fee2e2":lossRate>5?"#fef3c7":"#fef9c3",
                  color: allClear?"#166534":lossRate>20?"#991b1b":lossRate>5?"#92400e":"#713f12",
                  border: `1.5px solid ${allClear?"#86efac":lossRate>20?"#fca5a5":lossRate>5?"#fde68a":"#fde047"}`,
                }}>
                  {allClear ? "✓ All clear" : `${lossRate}% lost`}
                </span>
              </button>

              {isDateOpen && (
                <div style={{borderTop:"1px solid #e8edf2", overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
                    <thead>
                      <tr style={{background:"#f8fafc"}}>
                        {["Source","Sent","Received","Lost","Pending","Loss %","Status"].map(h=>(
                          <th key={h} style={{ padding:"9px 16px",fontSize:9,fontWeight:800, color:"#64748b",textTransform:"uppercase", letterSpacing:".7px",textAlign:"left", borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.companies.map((cg,ci) => (
                        <Fragment key={cg.company}>
                          <tr style={{ background:"linear-gradient(90deg,#e8f4fd,#f4f8fc)", borderBottom:"1px solid #dbeafe" }}>
                            <td colSpan={7} style={{ padding: "0" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:12, padding:"9px 22px" }}>
                                <span style={{ background:"#3b82f6",color:"#fff",borderRadius:5, padding:"3px 8px",fontSize:8,fontWeight:800,letterSpacing:".7px" }}>
                                  CO {String(ci+1).padStart(2,"0")}
                                </span>
                                <strong style={{fontSize:12,color:"#1e3a5f",fontWeight:700}}>{cg.company}</strong>
                                <span style={{fontSize:10,color:"#4b7fb8",marginLeft:"auto"}}>
                                  {fmt(cg.total.direct)} sent · {fmt(cg.total.crm)} received · {fmt(cg.total.masterCrmLost+cg.total.mediumBufferLost)} lost/pending
                                </span>
                              </div>
                            </td>
                          </tr>
                          {cg.rows.map(row=>{
                            const rowLost = row.masterCrmLost+row.mediumBufferLost;
                            const rowRate = row.direct>0?Math.round(rowLost/row.direct*100):0;
                            const rowClear = rowLost===0;
                            return (
                              <tr key={row.id} style={{
                                background: rowLost>0?"#fffafa":"#fff", borderBottom:"1px solid #f1f5f9",
                                borderLeft: rowLost>0?"3px solid #ef4444":row.crm>0?"3px solid #22c55e":"3px solid #e2e8f0"
                              }}>
                                <td style={{padding:"12px 16px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                                    <span style={{ width:28,height:28,borderRadius:8,flexShrink:0, background: rowLost>0?"#fee2e2":"#e8f5f4", color: rowLost>0?"#991b1b":"#178b7c", display:"grid",placeItems:"center", fontWeight:800,fontSize:11 }}>{row.source.slice(0,1)}</span>
                                    <div><strong style={{fontSize:12,color:"#12202f",display:"block"}}>{row.source}</strong><span style={{fontSize:9,color:"#7e8d9b"}}>{row.company}</span></div>
                                  </div>
                                </td>
                                <td style={{padding:"12px 16px"}}><span style={{fontSize:14,fontWeight:800,color:"#334e68"}}>{fmt(row.direct)}</span></td>
                                <td style={{padding:"12px 16px"}}><span style={{fontSize:14,fontWeight:800,color:"#166534",background:"#f0fdf4", borderRadius:8,padding:"4px 10px"}}>{fmt(row.crm)}</span></td>
                                <td style={{padding:"12px 16px"}}>
                                  {row.masterCrmLost>0?(
                                    <button className="count-link bad" onClick={()=>openGapRow(row,"gap3")} style={{fontSize:13,fontWeight:800,color:"#991b1b",background:"#fee2e2", borderRadius:8,padding:"4px 10px",border:"1px solid #fca5a5"}}>{fmt(row.masterCrmLost)}</button>
                                  ):<span style={{color:"#22c55e",fontWeight:700,fontSize:13}}>—</span>}
                                </td>
                                <td style={{padding:"12px 16px"}}>
                                  {row.mediumBufferLost>0?(
                                    <button className="count-link warn" onClick={()=>openGapRow(row,"gap2")} style={{fontSize:13,fontWeight:700,color:"#92400e",background:"#fef3c7", borderRadius:8,padding:"4px 10px"}}>{fmt(row.mediumBufferLost)}</button>
                                  ):<span style={{color:"#64748b",fontSize:13}}>—</span>}
                                </td>
                                <td style={{padding:"12px 16px"}}>
                                  <span style={{ display:"inline-block",padding:"4px 10px",borderRadius:20, fontSize:11,fontWeight:800, background: rowClear?"#dcfce7":rowRate>30?"#fee2e2":rowRate>10?"#fef3c7":"#fff9f0", color: rowClear?"#166534":rowRate>30?"#991b1b":rowRate>10?"#92400e":"#78350f" }}>{rowClear?"✓ 0%":`${rowRate}%`}</span>
                                </td>
                                <td style={{padding:"12px 16px"}}>
                                  <span style={{ display:"inline-flex",alignItems:"center",gap:5, padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:700, background: rowClear?"#f0fdf4":rowLost>0?"#fff0f0":"#fff9f0", color: rowClear?"#166534":rowLost>0?"#991b1b":"#92400e" }}>{rowClear?"✓ Clear":rowLost>0?"✕ Lost":"◷ Pending"}</span>
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{background:"#f8fafc",borderTop:"2px solid #e2e8f0"}}>
                            <td style={{padding:"11px 16px",fontWeight:800,fontSize:11,color:"#334e68"}}>↳ {cg.company} Total</td>
                            <td style={{padding:"11px 16px",fontWeight:800,fontSize:14,color:"#334e68"}}>{fmt(cg.total.direct)}</td>
                            <td style={{padding:"11px 16px",fontWeight:800,fontSize:14,color:"#166534"}}>{fmt(cg.total.crm)}</td>
                            <td style={{padding:"11px 16px",fontWeight:800,fontSize:14,color:cg.total.masterCrmLost>0?"#991b1b":"#22c55e"}}>{fmt(cg.total.masterCrmLost)}</td>
                            <td style={{padding:"11px 16px",fontWeight:800,fontSize:14,color:cg.total.mediumBufferLost>0?"#92400e":"#64748b"}}>{fmt(cg.total.mediumBufferLost)}</td>
                            <td style={{padding:"11px 16px"}}><span style={{fontWeight:800,fontSize:12, color:(cg.total.masterCrmLost+cg.total.mediumBufferLost)>0?"#991b1b":"#166534"}}>{cg.total.direct>0?Math.round((cg.total.masterCrmLost+cg.total.mediumBufferLost)/cg.total.direct*100):0}%</span></td>
                            <td colSpan={1}></td>
                          </tr>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              )}
            </div>
          );
        })}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center", padding:"12px 22px",background:"#f8fafc",borderTop:"1px solid #e8edf2", fontSize:10,color:"#7e8d9b",flexWrap:"wrap",gap:8}}>
          <span>
            <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#ef4444",marginRight:5}}/>Lost = sent to KServe, no return after threshold ·
            <span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:"#f59e0b",margin:"0 5px"}}/>Pending = awaiting return
          </span>
          <span>
            Data: <strong>ai_voice_leads_sent</strong> × <strong>ai_voice_leads_received</strong> · Live SQL · {payload?.scannedAt ? new Date(payload.scannedAt).toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit"})+" IST" : "—"}
          </span>
        </div>
      </section>
    </main>
    {selected?.variant === "lost-map" ? <div className="gap-console-backdrop" onMouseDown={() => setSelected(null)}>
      <section className="gap-console" role="dialog" aria-modal="true" aria-labelledby="gap-console-title" onMouseDown={e => e.stopPropagation()}>
        <header className="gap-console-head"><div><div className="gap-console-title-row"><h2 id="gap-console-title">{selectedGapMeta.label}</h2><span>{selectedGapMeta.flow}</span></div><p>{selected.title}</p></div><button aria-label="Close popup" onClick={() => setSelected(null)}>×</button></header>
        <div className="gap-console-intro"><div><span className="gap-console-kicker">GAP TOTAL</span><strong>{detailsLoading ? "…" : filteredDrawer.length}</strong></div><p>{selectedGapMeta.description} Counts stay anchored to the original source date wherever the lead eventually lands.</p></div>
        <div className="gap-console-ledger"><span className="unexplained"><small>ACTUAL LOST</small><strong>{detailsLoading ? "—" : actualLostCount}</strong><em>needs audit</em></span><span className="transient"><small>LATE TRANSFER</small><strong>{detailsLoading ? "—" : transientCount}</strong><em>not lost</em></span><span className="deleted"><small>DELETED</small><strong>{detailsLoading ? "—" : deletedCount}</strong><em>reason verified</em></span></div>
        <div className="gap-console-toolbar"><input value={drawerQuery} onChange={e => { setDrawerQuery(e.target.value); setPage(1); }} placeholder="Search Lead ID, name, mobile, source or status…"/><div>{selected.sheetUrl && <a href={selected.sheetUrl} target="_blank" rel="noreferrer">Open data sheet ↗</a>}<button onClick={exportCsv} disabled={!filteredDrawer.length}>Export CSV</button></div></div>
        <div className="gap-console-body">{detailsLoading ? <div className="gap-console-loading"><i/><strong>Exact Lead IDs load ho rahe hain</strong><span>Popup open hai—sheet reconciliation background mein complete ho rahi hai.</span></div> : detailError ? <div className="gap-console-error"><strong>Details load nahi ho sake</strong><span>{detailError}</span></div> : filteredDrawer.length ? auditSections.map(section => { const sectionOpen = openAuditSections.has(section.key); return <section className={`gap-bucket ${section.key}`} key={section.key}>
          <button className="gap-bucket-head" aria-expanded={sectionOpen} onClick={() => toggleAuditSection(section.key)}><span className="gap-eye">{sectionOpen ? "◉" : "○"}</span><strong>{section.title}</strong><em>{section.description}</em>{section.key === "deleted" && <span className="gap-reason-total">3 REASONS</span>}<b>{auditSectionCount(section.key)}</b></button>
          {sectionOpen && <div className="gap-bucket-content">{section.key === "deleted" && <div className="gap-delete-reasons">{deletedReasonOptions.map(option => <button className={deletedReasonFilter === option.key ? "active" : ""} aria-expanded={deletedReasonFilter === option.key} key={option.key} onClick={() => { setDeletedReasonFilter(deletedReasonFilter === option.key ? "all" : option.key); setExpandedAuditLead(null); }}><span className="gap-delete-branch">⌁</span><span className="gap-delete-copy"><strong>{option.label}</strong><em>{option.description}</em></span><b>{deletedReasonCount(option.key)}</b></button>)}</div>}{(section.key !== "deleted" || deletedReasonFilter !== "all") && (section.rows.length ? <div className="gap-record-scroll"><table className="gap-record-table"><thead><tr><th></th><th>Lead ID</th><th>Name</th><th>Mobile / Email</th><th>Source</th><th>Enquiry time</th><th>Actual status / reason</th><th>Held</th></tr></thead><tbody>{section.rows.map(lead => { const openLead = expandedAuditLead === lead.id; const status = lostReasonStatus(lead); const original = lead.original; const deleteStatus = deletedReason(lead); return <Fragment key={`${lead.id}-${lead.stage}`}>
            <tr className={`gap-record ${openLead ? "selected" : ""}`} onClick={() => setExpandedAuditLead(openLead ? null : lead.id)}><td><span className="gap-caret">{openLead ? "▾" : "▸"}</span></td><td><strong>{lead.id}</strong></td><td>{lead.name || "Unnamed lead"}</td><td><span>{lead.phone || "—"}</span><small>{lead.email || "—"}</small></td><td>{lead.source}</td><td>{lead.generatedAt || lead.timestamp || dateLabel(lead.date)}</td><td><span className={`gap-reason-chip ${section.key}`}>{auditReasonLabel(lead)}</span><small>{section.key === "unexplained" ? status.detail : section.key === "deleted" ? deleteStatus.detail : lead.reason}</small></td><td><strong className={section.key === "unexplained" ? "gap-age-hot" : ""}>{lead.tat || `${lead.tatMin || 0}m`}</strong></td></tr>
            {openLead && <tr className="gap-trace-row"><td colSpan={8}><div className="gap-stage-track">{auditStages(lead).map((stage, index, stages) => <div className={`gap-stage-node ${stage.reached ? "done" : section.key === "unexplained" ? "stopped" : "pending"} ${stage.reached && stages[index + 1]?.reached ? "linked" : ""}`} key={stage.label}><i/><small>{stage.label}</small><strong>{stage.value}</strong></div>)}</div>
              <div className="gap-contact-detail"><span><small>ACTUAL DUPLICATE MOBILE</small><strong>{lead.phone || "—"}</strong></span><span><small>ACTUAL DUPLICATE EMAIL</small><strong>{lead.email || "—"}</strong></span>{original && <><span><small>PRIMARY LEAD MOBILE</small><strong>{original.phone || "—"}</strong></span><span><small>PRIMARY LEAD EMAIL</small><strong>{original.email || "—"}</strong></span></>}</div>
              {section.key === "deleted" && original ? <div className="gap-evidence"><header><span>PRIMARY TRANSFERRED LEAD ↔ ACTUAL DUPLICATE</span><strong>{deleteStatus.label}</strong><em>Matched by {original.matchBasis || "Mobile / Email / Enquiry ID"} within 24 hours</em></header><div className="gap-evidence-table"><span className="qualified">✓</span><strong>{original.id}</strong><b>PRIMARY · TRANSFERRED</b><span>{original.generatedAt || "—"}</span><span>{original.source}</span><span>Transferred to {original.assignee || "Sales / KServe"}</span><span className="current">×</span><strong>{lead.id}</strong><b>ACTUAL DUPLICATE · DELETED</b><span>{lead.generatedAt || lead.timestamp || "—"}</span><span>{lead.source}</span><span>Deleted · {deleteStatus.label}</span></div></div> : section.key === "deleted" ? <div className="gap-evidence missing"><strong>{deleteStatus.label}</strong><p>{deleteStatus.detail} Primary transferred record is not available in the current payload.</p></div> : section.key === "unexplained" ? <div className="gap-loss-warning"><strong>HIGH ALERT · NO QUALIFIED LEAD</strong><p>No valid duplicate, late transfer or destination record explains this gap. Audit the exact source window and script execution.</p></div> : <div className="gap-late-note"><strong>LATE TRANSFER · NOT LOST</strong><p>This lead reached CRM after its source date and remains anchored to the original intake day.</p></div>}
              <div className="gap-trace-actions">{lead.directUrl && <a href={lead.directUrl} target="_blank" rel="noreferrer">Open source row ↗</a>}{lead.destinationUrl && <a href={lead.destinationUrl} target="_blank" rel="noreferrer">Open Buffer row ↗</a>}{lead.crmUrl && <a href={lead.crmUrl} target="_blank" rel="noreferrer">Open CRM ↗</a>}</div>
            </td></tr>}
          </Fragment>; })}</tbody></table></div> : <div className="gap-section-empty">No {section.title.toLowerCase()} records on this page.</div>)}</div>}
        </section>; }) : <div className="gap-console-empty"><strong>No matching leads</strong><span>Search clear karke dobara dekhein.</span></div>}</div>
        <footer className="gap-console-foot"><span>{detailsLoading ? "Loading exact records…" : `${filteredDrawer.length} rows · Page ${page} of ${pageCount}`}</span><button disabled={detailsLoading} onClick={() => setOpenAuditSections(openAuditSections.size === 3 ? new Set() : new Set(["unexplained", "transient", "deleted"]))}>{openAuditSections.size === 3 ? "Hide all sections" : "Show all sections"}</button><div>{filteredDrawer.length > pageSize && <><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next</button></>}<button onClick={() => setSelected(null)}>Close</button></div></footer>
      </section>
    </div> : selected && <div className="drawer-backdrop" onMouseDown={() => setSelected(null)}><aside className="drawer" onMouseDown={e => e.stopPropagation()}><header><div><p>LEAD DRILL-DOWN</p><h2>{selected.title}</h2><span>{filteredDrawer.length} matching Lead IDs</span>{selected.sheetUrl && <a className="drawer-sheet-link" href={selected.sheetUrl} target="_blank" rel="noreferrer">Open correct data sheet ↗</a>}</div><button onClick={() => setSelected(null)}>×</button></header><div className="drawer-toolbar"><input value={drawerQuery} onChange={e => { setDrawerQuery(e.target.value); setPage(1); }} placeholder="Search Lead ID, company, source, status…"/><button onClick={exportCsv} disabled={!filteredDrawer.length}>Export CSV</button></div><div className="drawer-list">{pagedDrawer.length ? pagedDrawer.map(lead => <article key={`${lead.id}-${lead.stage}`} className={`lead-item ${lead.status.toLowerCase()}`}><div className="lead-head"><span className={`status ${lead.status === "Lost" ? "lost" : lead.status === "Delayed" ? "delayed" : "ok"}`}>● {lead.status}</span><small>{lead.timestamp}</small></div><h3>{lead.name || "Unnamed lead"}</h3><p className="lead-id">Lead ID: {lead.id} · {lead.phone}</p><div className="lead-grid"><span>Date<strong>{dateLabel(lead.date)}</strong></span><span>Company<strong>{lead.company}</strong></span><span>Source<strong>{lead.source}</strong></span><span>Current Status<strong>{lead.currentStatus}</strong></span><span>Buffer Status<strong>{lead.bufferStatus}</strong></span><span>CRM Status<strong>{lead.crmStatus}</strong></span><span>Transfer Status<strong>{lead.transferStatus}</strong></span><span>TAT<strong>{lead.tat}</strong></span></div><div className="reason"><strong>Audit finding</strong><p>{lead.reason}</p></div>{lead.original && <div className="duplicate-proof"><div><small>CURRENT LEAD</small><strong>{lead.source}</strong><span>{lead.generatedAt}</span></div><i>matched within 24h →</i><div><small>ORIGINAL LEAD SENT</small><strong>{lead.original.source}</strong><span>{lead.original.generatedAt} · {lead.original.assignee}</span></div></div>}<div className="lead-actions">{lead.directUrl && <a href={lead.directUrl} target="_blank" rel="noreferrer">Open exact Direct row ↗</a>}{lead.destinationUrl && <a href={lead.destinationUrl} target="_blank" rel="noreferrer">Open exact Buffer row ↗</a>}{lead.crmUrl && <a href={lead.crmUrl} target="_blank" rel="noreferrer">Open CRM ↗</a>}</div></article>) : <div className="empty-drawer"><span>✓</span><h3>No matching leads</h3><p>Search clear karke dobara dekhein.</p></div>}</div>{filteredDrawer.length > pageSize && <footer className="drawer-pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next →</button></footer>}</aside></div>}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
