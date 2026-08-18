import { useState, useCallback, useEffect } from 'react';

export interface RiyaSharmaRecord {
  genratetimestamp: string;
  chatdonedatetime: string;
  chatid: string;
  name: string;
  roomnumber: string;
  phone: string;
  email: string;
  conversationid: string;
  conversationchat: string;
  summaryofconversaation: string;
  finaloutcome: string;
  keyemotion: string;
  summary: string;
  type: string;
  category: string;
  subcategory: string;
  issuetype: string;
  department: string;
  urgency: string;
  priority: string;
  urgencytatmin: string;
  suggestedaction: string;
  satisfationscore: string;
  complimentedperson: string;
  uid: string;
  senttowhere: string;
  checkinid: string;
  planneddatetime: string | null;
  actualdatetime: string | null;
  finalreport: string | null;
  assignto: string;
  statusoflead: string;
  isesalated: string;
  isoverdue: string;
  isreopened: string;
  istransfertopreventive: string;
  departmentstaffemailid: string;
  departmentstaffname: string;
  departmentheadname: string;
  departmentheademailid: string;
  chathistorylink: string;
  resolutiontat: string;
  finalreportlink: string;
  // Stage 2 & Beyond Fields
  plannedstaff: string;
  actualstaff: string;
  timedelaystaff: string;
  doerstaff: string;
  departmentstaffactionstatus: string;
  departmentstaffactionpoints: string;
  departmentstaffremarks: string;
  departmentstaffuploadproof: string;
  uploadedproofscreenshotlink: string;
  resolvedby: string;
  htcreatedtodepartmentstaffstatus: string;
  emailalerttodepartmentstaffstatus: string;
  whatsappalertstatus: string;
  plannedhead: string;
  actualhead: string;
  timedelayhead: string;
  doerhead: string;
  departmentheadactionstatus: string;
  departmentheadactionpoints: string;
  departmentheadremarks: string;
  headuploadscreenshot: string;
  uploadprofscreenshotlink: string | null;
  htcreatedbydepartmenthead: string;
  emailsentstatushead: string;
  whatappsentstatushead: string;
  htcreatedtodepartmentheadifescalatedstatus: string;
  htiddepartmenthead: string;
  htreplysolutiondepartmenthead: string;
  plannedgm: string;
  actualgm: string;
  timedalaygm: string;
  doergmactionstatus: string;
  gmremarks: string;
  htcreatedtogmdalaystatus: string;
  emailalerttogmstatus: string;
  whatappalarttogmstatus: string;
  htcreatedtogeneralmanagerifesacalatedstatus: string;
  htidgm: string;
  htreplysolutiongm: string;
  issuetypeview: string;
  suggestedactionview: string;
  finalreportpdflinkview: string;
  plannedmanagement: string;
  actualmanagement: string;
  timedelaymanagement: string;
  doermanagement: string;
  managementactionstatus: string;
  managementaction: string;
  managementremarks: string;
  htcreatedtomanagementiftimedelaystatus: string;
  emailalerttomanagementstatus: string;
  whatsappalerttomanagementstatus: string;
  hscreatedtomanagementifescalatedstatus: string;
  hsidmanagement: string;
  hsreplysolutionmanagement: string;
  whatsapptohr: string;
  whatsapptodepartmentstaff: string;
  whatsapptodepartmenthead: string;
  whatsapptogm: string;
}

export interface StaffM { total: number; resolved: number; pending: number; takenTime: number }
export interface DeptM { total: number; resolved: number; open: number; assigned: number; takenTime: number }
export interface CatM { total: number; resolved: number; open: number; overdue: number; timeTaken: number }
export interface TypeM { total: number; resolved: number; open: number; escalated: number; takenTime: number }
export type FreqT = [string, number, number, number, string, string]
export type KPI = "totalTickets" | "resolvedTickets" | "pendingTickets" | "highPriority" | "positiveFeedback" | null

export interface RC {
  chatId: string; name: string; room: string; issueType: string
  reportLink: string; priority: string; status: string; resolutionTime: string; type: string;
  chatHistoryLink: string; summary: string; category: string; department: string; urgency: string;
  duration: number; date: string; timestamp: number;
  isEscalated: boolean;
  isOverdue: boolean;
  isReopened: boolean;
  phone?: string;
  email?: string;
  suggestedAction?: string;
  finalOutcome?: string;
  keyEmotion?: string;
  subCategory?: string;
  urgencyTAT?: string;
  score?: string;
  staffName?: string;
  generateDate?: string;
  chatDoneDate?: string;
  conversationId?: string;
  uid?: string;
  assignedTo?: string;
  // Stage 2 & Beyond Mapped Fields
  plannedstaff?: string;
  actualstaff?: string;
  timedelaystaff?: string;
  doerstaff?: string;
  departmentstaffactionstatus?: string;
  departmentstaffactionpoints?: string;
  departmentstaffremarks?: string;
  departmentstaffuploadproof?: string;
  uploadedproofscreenshotlink?: string;
  resolvedby?: string;
  htcreatedtodepartmentstaffstatus?: string;
  emailalerttodepartmentstaffstatus?: string;
  whatsappalertstatus?: string;
  plannedhead?: string;
  actualhead?: string;
  timedelayhead?: string;
  doerhead?: string;
  departmentheadactionstatus?: string;
  departmentheadactionpoints?: string;
  departmentheadremarks?: string;
  headuploadscreenshot?: string;
  uploadprofscreenshotlink?: string | null;
  htcreatedbydepartmenthead?: string;
  emailsentstatushead?: string;
  whatappsentstatushead?: string;
  htcreatedtodepartmentheadifescalatedstatus?: string;
  htiddepartmenthead?: string;
  htreplysolutiondepartmenthead?: string;
  plannedgm?: string;
  actualgm?: string;
  timedalaygm?: string;
  doergmactionstatus?: string;
  gmremarks?: string;
  htcreatedtogmdalaystatus?: string;
  emailalerttogmstatus?: string;
  whatappalarttogmstatus?: string;
  htcreatedtogeneralmanagerifesacalatedstatus?: string;
  htidgm?: string;
  htreplysolutiongm?: string;
  issuetypeview?: string;
  suggestedactionview?: string;
  finalreportpdflinkview?: string;
  plannedmanagement?: string;
  actualmanagement?: string;
  timedelaymanagement?: string;
  doermanagement?: string;
  managementactionstatus?: string;
  managementaction?: string;
  managementremarks?: string;
  htcreatedtomanagementiftimedelaystatus?: string;
  emailalerttomanagementstatus?: string;
  whatsappalerttomanagementstatus?: string;
  hscreatedtomanagementifescalatedstatus?: string;
  hsidmanagement?: string;
  hsreplysolutionmanagement?: string;
  whatsapptohr?: string;
  whatsapptodepartmentstaff?: string;
  whatsapptodepartmenthead?: string;
  whatsapptogm?: string;
  staffEmail?: string;
  headName?: string;
  headEmail?: string;
}

export interface DD {
  totalComplaints: number; resolvedComplaints: number; openComplaints: number
  overdueComplaints: number; reopennedComplaints: number; esalatedComplaints: number; trfrToPreventive: number
  recentComplaints: RC[]; freqComplaints: Record<string, FreqT>; dayWiseComplaints: Record<string, number>
  categories: Record<string, CatM>; departments: Record<string, DeptM>; staff: Record<string, StaffM>; types: Record<string, TypeM>
}

const API_URL = 'https://script.google.com/macros/s/AKfycbxkYE09SCf-vvzzPG8QQJyvGlUZbYA_ptCLWwoe_dR-Cg0Q8e4LSsRaz-PW_k3j_zLx/exec';

function fd(sec: number): string {
  if (!sec || isNaN(sec) || sec <= 0) return '-'
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
}

function processRiyaSharmaData(rows: RiyaSharmaRecord[]): DD {
  const d: DD = {
    totalComplaints: 0, resolvedComplaints: 0, openComplaints: 0, overdueComplaints: 0,
    reopennedComplaints: 0, esalatedComplaints: 0, trfrToPreventive: 0,
    recentComplaints: [], freqComplaints: {}, dayWiseComplaints: {}, categories: {}, departments: {}, staff: {}, types: {}
  }

  rows.forEach(row => {
    if (!row.chatid) return

    // Removed filter for 'senttowhere' to show all 660 records from API
    // const stw = row.senttowhere || ''
    // if (stw !== 'CAPA_URGENT' && stw !== 'CAPA') return

    d.totalComplaints++
    const status = row.departmentstaffactionstatus || row.statusoflead || 'Open', category = row.category || 'General'
    const department = row.department || 'General', assignedTo = row.assignto || row.doerstaff || 'Unassigned'
    const priority = row.priority || 'Low', issueType = row.issuetype || row.issuetypeview || 'Others'
    const action = row.suggestedaction || row.suggestedactionview || 'NA', summary = row.summaryofconversaation || 'NA'
    const reportLink = row.finalreportlink || row.finalreport || row.finalreportpdflinkview || '', type = row.type || 'General'

    const dateStr = row.genratetimestamp || row.plannedstaff || row.chatdonedatetime || new Date().toISOString()
    const gd = new Date(dateStr)
    const ad = row.actualdatetime ? new Date(row.actualdatetime) : (row.actualstaff ? new Date(row.actualstaff) : null)

    // Ensure gd is valid
    const validGd = isNaN(gd.getTime()) ? new Date() : gd
    const now = Date.now()
    const isResolved = status === 'Resolved'
    let ds = 0
    if (ad && !isNaN(ad.getTime())) {
      ds = (ad.getTime() - validGd.getTime()) / 1000
    } else if (!isResolved) {
      ds = (now - validGd.getTime()) / 1000
    }
    if (ds < 0) ds = 0

    const isE = row.isesalated === 'Yes', isO = row.isoverdue === 'Yes'
    const isR = row.isreopened === 'Yes', isT = row.istransfertopreventive === 'Yes'

    if (isE) d.esalatedComplaints++; if (isO) d.overdueComplaints++; if (isR) d.reopennedComplaints++; if (isT) d.trfrToPreventive++

    if (issueType in d.freqComplaints) {
      d.freqComplaints[issueType][1]++;
      d.freqComplaints[issueType][3] += ds
    } else {
      d.freqComplaints[issueType] = [issueType, 1, 0, ds, summary, action]
    }

    const dk = fmtDate(validGd);
    d.dayWiseComplaints[dk] = (d.dayWiseComplaints[dk] || 0) + 1

    if (status === 'Resolved') d.resolvedComplaints++; else d.openComplaints++

    if (category !== 'General') {
      if (!d.categories[category]) d.categories[category] = { total: 0, resolved: 0, open: 0, overdue: 0, timeTaken: 0 }
      d.categories[category].total++
      if (status === 'Resolved') { d.categories[category].resolved++; d.categories[category].timeTaken += ds }
      else { d.categories[category].open++; if (isO) d.categories[category].overdue++ }
    }

    if (department !== 'General') {
      if (!d.departments[department]) d.departments[department] = { total: 0, resolved: 0, open: 0, assigned: 0, takenTime: 0 }
      d.departments[department].total++; d.departments[department].assigned++
      if (status === 'Resolved') { d.departments[department].resolved++; d.departments[department].takenTime += ds }
      else d.departments[department].open++
    }

    if (assignedTo !== 'Unassigned' && assignedTo !== '') {
      if (!d.staff[assignedTo]) d.staff[assignedTo] = { total: 0, resolved: 0, pending: 0, takenTime: 0 }
      d.staff[assignedTo].total++
      if (status === 'Resolved') { d.staff[assignedTo].resolved++; d.staff[assignedTo].takenTime += ds }
      else d.staff[assignedTo].pending++
    }

    if (!d.types[issueType]) d.types[issueType] = { total: 0, resolved: 0, open: 0, escalated: 0, takenTime: 0 }
    d.types[issueType].total++
    if (status === 'Resolved') { d.types[issueType].resolved++; d.types[issueType].takenTime += ds }
    else { d.types[issueType].open++; if (isE) d.types[issueType].escalated++ }

    d.recentComplaints.push({
      chatId: row.chatid || '-',
      name: row.name || '-',
      room: row.roomnumber || '-',
      issueType,
      reportLink,
      priority,
      status,
      resolutionTime: isResolved
        ? (row.resolutiontat && row.resolutiontat !== '05:30:00' ? row.resolutiontat : (ds > 0 ? fd(ds) : '-'))
        : '-',
      type,
      chatHistoryLink: row.chathistorylink || (row.chatid ? `https://script.google.com/macros/s/AKfycbwsOWM3jX-mpE9qD8Zakwd4es24Z3NyW-SYly19hiOGTK_HZ_YWeZHndXzuKg6kJ2q5Ng/exec?chatId=${row.chatid}` : ''),
      summary: row.summaryofconversaation || '',
      category: row.category || '',
      department: row.department || '',
      urgency: row.urgency || priority,
      duration: ds,
      date: dk,
      timestamp: validGd.getTime(),
      isEscalated: isE,
      isOverdue: isO,
      isReopened: isR,
      phone: row.phone,
      email: row.email,
      suggestedAction: row.suggestedaction || row.suggestedactionview,
      finalOutcome: row.finaloutcome,
      keyEmotion: row.keyemotion,
      subCategory: row.subcategory,
      urgencyTAT: row.urgencytatmin,
      score: row.satisfationscore,
      generateDate: row.genratetimestamp || row.plannedstaff,
      chatDoneDate: row.chatdonedatetime,
      conversationId: row.conversationid,
      uid: row.uid,
      assignedTo: row.assignto || row.doerstaff,
      plannedstaff: row.plannedstaff,
      actualstaff: row.actualstaff,
      timedelaystaff: row.timedelaystaff,
      doerstaff: row.doerstaff,
      departmentstaffactionstatus: row.departmentstaffactionstatus,
      departmentstaffactionpoints: row.departmentstaffactionpoints,
      departmentstaffremarks: row.departmentstaffremarks,
      departmentstaffuploadproof: row.departmentstaffuploadproof,
      uploadedproofscreenshotlink: row.uploadedproofscreenshotlink,
      resolvedby: row.resolvedby,
      htcreatedtodepartmentstaffstatus: row.htcreatedtodepartmentstaffstatus,
      emailalerttodepartmentstaffstatus: row.emailalerttodepartmentstaffstatus,
      whatsappalertstatus: row.whatsappalertstatus,
      plannedhead: row.plannedhead,
      actualhead: row.actualhead,
      timedelayhead: row.timedelayhead,
      doerhead: row.doerhead,
      departmentheadactionstatus: row.departmentheadactionstatus,
      departmentheadactionpoints: row.departmentheadactionpoints,
      departmentheadremarks: row.departmentheadremarks,
      headuploadscreenshot: row.headuploadscreenshot,
      uploadprofscreenshotlink: row.uploadprofscreenshotlink,
      htcreatedbydepartmenthead: row.htcreatedbydepartmenthead,
      emailsentstatushead: row.emailsentstatushead,
      whatappsentstatushead: row.whatappsentstatushead,
      htcreatedtodepartmentheadifescalatedstatus: row.htcreatedtodepartmentheadifescalatedstatus,
      htiddepartmenthead: row.htiddepartmenthead,
      htreplysolutiondepartmenthead: row.htreplysolutiondepartmenthead,
      plannedgm: row.plannedgm,
      actualgm: row.actualgm,
      timedalaygm: row.timedalaygm,
      doergmactionstatus: row.doergmactionstatus,
      gmremarks: row.gmremarks,
      htcreatedtogmdalaystatus: row.htcreatedtogmdalaystatus,
      emailalerttogmstatus: row.emailalerttogmstatus,
      whatappalarttogmstatus: row.whatappalarttogmstatus,
      htcreatedtogeneralmanagerifesacalatedstatus: row.htcreatedtogeneralmanagerifesacalatedstatus,
      htidgm: row.htidgm,
      htreplysolutiongm: row.htreplysolutiongm,
      issuetypeview: row.issuetypeview,
      suggestedactionview: row.suggestedactionview,
      finalreportpdflinkview: row.finalreportpdflinkview,
      plannedmanagement: row.plannedmanagement,
      actualmanagement: row.actualmanagement,
      timedelaymanagement: row.timedelaymanagement,
      doermanagement: row.doermanagement,
      managementactionstatus: row.managementactionstatus,
      managementaction: row.managementaction,
      managementremarks: row.managementremarks,
      htcreatedtomanagementiftimedelaystatus: row.htcreatedtomanagementiftimedelaystatus,
      emailalerttomanagementstatus: row.emailalerttomanagementstatus,
      whatsappalerttomanagementstatus: row.whatsappalerttomanagementstatus,
      hscreatedtomanagementifescalatedstatus: row.hscreatedtomanagementifescalatedstatus,
      hsidmanagement: row.hsidmanagement,
      hsreplysolutionmanagement: row.hsreplysolutionmanagement,
      whatsapptohr: row.whatsapptohr,
      whatsapptodepartmentstaff: row.whatsapptodepartmentstaff,
      whatsapptodepartmenthead: row.whatsapptodepartmenthead,
      whatsapptogm: row.whatsapptogm,
      staffEmail: row.departmentstaffemailid,
      staffName: row.departmentstaffname || row.assignto || row.doerstaff,
      headName: row.departmentheadname,
      headEmail: row.departmentheademailid,
    })
  })

  d.recentComplaints.sort((a, b) => b.timestamp - a.timestamp)
  d.totalComplaints = d.recentComplaints.length // Use unique count for total
  return d
}

export function useRiyaSharmaData() {
  const [data, setData] = useState<DD | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate && startDate.trim() !== '') params.append('startDate', new Date(startDate).toISOString());
      if (endDate && endDate.trim() !== '') params.append('endDate', new Date(endDate).toISOString());
      const queryString = params.toString();

      // Fetch both table data and stage data in parallel
      const [tableRes, stageRes] = await Promise.all([
        fetch(`${API_URL}?action=gettabledata${queryString ? '&' + queryString : ''}`),
        fetch(`${API_URL}?action=getstagedata${queryString ? '&' + queryString : ''}`)
      ]);

      if (!tableRes.ok || !stageRes.ok) throw new Error(`HTTP error! status: ${tableRes.status} / ${stageRes.status}`);

      const [tableResult, stageResult] = await Promise.all([
        tableRes.json(),
        stageRes.json()
      ]);

      if (tableResult.status === 'success' && stageResult.status === 'success') {
        // Merge records based on chatid
        const tableData: RiyaSharmaRecord[] = tableResult.data;
        const stageData: any[] = stageResult.data;

        const stageMap = new Map();
        stageData.forEach(s => {
          if (s.chatid) stageMap.set(s.chatid, s);
        });

        const mergedData = tableData.map(row => {
          const stageInfo = stageMap.get(row.chatid) || {};
          return { ...row, ...stageInfo };
        });

        const processed = processRiyaSharmaData(mergedData);
        setData(processed);
      } else {
        throw new Error('Failed to fetch one or both data sources');
      }
    } catch (err) {
      console.error('Error fetching Riya Sharma data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStageData = useCallback(async (chatId: string) => {
    setIsLoading(true);
    try {
      const url = `${API_URL}?action=getstagedata&chatId=${chatId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.status === 'success') {
        return result.data[0] || null;
      }
      return null;
    } catch (err) {
      console.error('Error fetching stage data:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchData,
    fetchStageData
  };
}
