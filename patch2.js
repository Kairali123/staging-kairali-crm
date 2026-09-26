const fs = require('fs');
const file = '/Users/sunaj/Desktop/GPT Codex/Stagingcrm/app/lead-lost-monitor/page.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('{isDateOpen && (') && lines.indexOf(l) > 500);
const endIdx = lines.findIndex((l, i) => l.includes('</div>') && lines[i+1]?.includes(')}') && lines[i+2]?.includes('</div>') && i > startIdx) + 2;

console.log("Start", startIdx, "End", endIdx);

const replacement = `              {isDateOpen && (
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
                                  <span style={{ display:"inline-block",padding:"4px 10px",borderRadius:20, fontSize:11,fontWeight:800, background: rowClear?"#dcfce7":rowRate>30?"#fee2e2":rowRate>10?"#fef3c7":"#fff9f0", color: rowClear?"#166534":rowRate>30?"#991b1b":rowRate>10?"#92400e":"#78350f" }}>{rowClear?"✓ 0%":\`\${rowRate}%\`}</span>
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
              )}`;

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  fs.writeFileSync(file, lines.join('\n'));
  console.log("Patched successfully");
} else {
  console.log("Could not find boundaries");
}
