"use client"

import React, { useState, useMemo, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  Search,
  ArrowUpDown,
  Volume2,
  Stethoscope,
  ChevronDown,
  Eye,
  BarChart3,
  TrendingUp,
  Coins,
  UserCheck,
  FileText,
  Trash2,
  PauseCircle,
  Phone,
} from "lucide-react"

// Types matching the 45 Google Sheet columns
interface MRFMSLead {
  timestamp: string
  verifiedDate: string
  id: string
  clientName: string
  mobileNumber: string
  email: string
  address: string
  pincode: string
  state: string
  city: string
  area: string
  clientType: string
  speciality: string
  clientCategory: string
  dataSource: string
  notes: string
  recordingUrl: string
  verifiedArea: string
  verifiedPincode: string
  leadOutcome: string
  remarks: string
  mrNameAsPerPincode: string
  existingNewAsPerMRData: string
  altMobileNumber: string
  callingSalesPersonName: string
  planned: string
  actual: string
  col28: string
  status: string
  assignToMROrASM: string
  remarksOps: string
  assignToTPDate: string
  partyType: string
  verifiedAreaTP: string
  helpTicketStatusToAssignPerson: string
  transferToApiSheetStatus: string
  directTransferToTpSheet: string
  col38: string
  altMobileNumberTP: string
  exceptions: string
  htStatusFromHtRecordSheet: string
  responseOfAddInApp: string
  responseOfTPUpdate: string
  transferToDeleteSheet: string
  transferToBufferStatusIfNoMRExist: string
}

// 16 Static Leads provided by the user
// const STATIC_LEADS: MRFMSLead[] = [
//   {
//     timestamp: "7/11/2024 12:50:13",
//     verifiedDate: "7/6/2024",
//     id: "3231_July-2024",
//     clientName: "DR TARUN SINGH",
//     mobileNumber: "9425344432",
//     email: "",
//     address: "Sector 13, Dwarka, Delhi, 110075",
//     pincode: "110075",
//     state: "Delhi",
//     city: "New Delhi",
//     area: "Dwarka",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Thu Apr 18 2024 12:41:37 GMT 0530 (India Standard Time), Last Order Value - 18341.7668",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240711-123422_9425344432_2032_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "call\nno requirement mr rakesh client",
//     mrNameAsPerPincode: "VINAYAK PANDURANGA AMBIG",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Dr Taniya Singh",
//     planned: "7/11/2024 14:50:13",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2563:08:08",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "Pradeep Gond",
//     assignToTPDate: "ex",
//     partyType: "6/27/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "Sahdol",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "here are some exceptions in columns",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/16/2024 17:50:05",
//     verifiedDate: "7/5/2024",
//     id: "1541_July-2024-7413516",
//     clientName: "Bhatt Ji Ayurvedic Store",
//     mobileNumber: "9414072852",
//     email: "",
//     address: "Johirpuri Delhi",
//     pincode: "110094",
//     state: "Delhi",
//     city: "New Delhi",
//     area: "Johirpuri",
//     clientType: "Retailer",
//     speciality: "",
//     clientCategory: "B2D-R",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Retailer, Last Purchase Date - Thu Apr 04 2024 12:05:36 GMT 0530 (India Standard Time), Last Order Value - 2054.722222222222",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240716-173945_9414072852_2033_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "ask for call abck after 2 days\nLocation jaipur pratap nagar \nNO MR visit \nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240716-173945_9414072852_2033_2636490-all.mp3",
//     mrNameAsPerPincode: "Girish Chaturvedi",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Sana Albi",
//     planned: "7/16/2024 19:50:05",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2523:58:21",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "Vikram Sain",
//     assignToTPDate: "ex",
//     partyType: "6/28/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "sehnga",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "here are some exceptions in columns | AH",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/16/2024 18:05:48",
//     verifiedDate: "7/16/2024",
//     id: "3156_July-2024-8209418",
//     clientName: "Anushka medical",
//     mobileNumber: "8104148449",
//     email: "",
//     address: "-mansur Alwar Rajasthan",
//     pincode: "301001",
//     state: "Rajasthan",
//     city: "alwar",
//     area: "mansur",
//     clientType: "B2B",
//     speciality: "",
//     clientCategory: "B2B",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Retailer, Last Purchase Date - Tue May 14 2024 14:35:35 GMT 0530 (India Standard Time), Last Order Value - 1689.5",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240716-175255_8104148449_2033_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "Location :-mansur Alwar Rajasthan \nShop is closed from last 1 month , currently having stock and last visit of MR before 10 days \nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240716-175255_8104148449_2033_2636490-all.mp3",
//     mrNameAsPerPincode: "Rajesh Arora",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Sana Albi",
//     planned: "7/16/2024 20:05:48",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2523:58:21",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "Chandraprakash Parashar",
//     assignToTPDate: "ex",
//     partyType: "7/2/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "Bansur",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "Transfer to TP - 24/06/2025 13:07:25",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "24-06-2025 \"{\\\"status\\\":9000,\\\"code\\\":9000,\\\"message\\\":\\\"TP updated.\\\",\\\"generatedId\\\":0}\"",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/17/2024 16:35:04",
//     verifiedDate: "7/6/2024",
//     id: "DROP-0354-7395417",
//     clientName: "Universal Ayurvedic Pharmacy & Patanjali Store",
//     mobileNumber: "9650038343",
//     email: "",
//     address: "Shop No.AG-97, ground floor, ARCADIA MARKET, South City II, Sector 49, Gurugram, Fatehpur, Haryana 1",
//     pincode: "122001",
//     state: "Haryana",
//     city: "Gurugram",
//     area: "Shop No.AG-97, ground floor, ARCADIA MARKET, South City II, Sector 49, Gurugram, Fatehpur, Haryana 1",
//     clientType: "Patanjali Store",
//     speciality: "",
//     clientCategory: "B2D-R",
//     dataSource: "Patanjali Store Gurgaon",
//     notes: "Shop No.AG-97, ground floor, ARCADIA MARKET, South City II, Sector 49, Gurugram, Fatehpur, Haryana 122018",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240717-161725_9650038343_2031_5360814-all.mp3",
//     verifiedArea: "Shop No.AG-97, ground floor, ARCADIA MARKET, South City II, Sector 49, Gurugram, Fatehpur, Haryana 1",
//     verifiedPincode: "",
//     leadOutcome: "Cold",
//     remarks: "Shop No.AG-97, ground floor, ARCADIA MARKET, South City II, Sector 49, Gurugram, Fatehpur, Haryana 122018\nclient need MR\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240717-161725_9650038343_2031_5360814-all.mp3",
//     mrNameAsPerPincode: "No MR",
//     existingNewAsPerMRData: "NEW",
//     altMobileNumber: "",
//     callingSalesPersonName: "Vidisha Bahukhandi",
//     planned: "7/17/2024 18:35:04",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2514:58:21",
//     assignToMROrASM: "Cold",
//     remarksOps: "",
//     assignToTPDate: "closed",
//     partyType: "",
//     verifiedAreaTP: "",
//     helpTicketStatusToAssignPerson: "",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/20/2024 12:35:12",
//     verifiedDate: "4/19/2024",
//     id: "2076_April-2024-1026863",
//     clientName: "Dr.Amandeep singh",
//     mobileNumber: "7009023410",
//     email: "",
//     address: "New Delhi 110017",
//     pincode: "110017",
//     state: "Delhi",
//     city: "New Delhi",
//     area: "New Delhi",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Sat Dec 30 2023 12:35:19 GMT 0530 (India Standard Time), Last Order Value - 380",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240720-122550_7009023410_2033_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Cold",
//     remarks: "Not answered\n ganga nagr  not required at a time \nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240720-122550_7009023410_2033_2636490-all.mp3",
//     mrNameAsPerPincode: "K Rajesh",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Sana Albi",
//     planned: "7/20/2024 14:35:12",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2491:23:09",
//     assignToMROrASM: "Cold",
//     remarksOps: "",
//     assignToTPDate: "closed",
//     partyType: "",
//     verifiedAreaTP: "",
//     helpTicketStatusToAssignPerson: "",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/22/2024 13:20:03",
//     verifiedDate: "7/18/2024",
//     id: "3126_July-2024-8775875",
//     clientName: "DR P K MITRA",
//     mobileNumber: "8577978211",
//     email: "",
//     address: "UMARI CHOURAHA NEAR PANKAJ MEDICAL STORE UMARI  GONDA. 271402",
//     pincode: "271402",
//     state: "UP",
//     city: "Gonda",
//     area: "UMARI CHOURAHA NEAR PANKAJ MEDICAL STORE UMARI  GONDA. 271402",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Tue May 14 2024 16:05:46 GMT 0530 (India Standard Time), Last Order Value - 263",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240722-131118_8577978211_2032_2636490-all.mp3",
//     verifiedArea: "UMARI CHOURAHA NEAR PANKAJ MEDICAL STORE UMARI  GONDA. 271402",
//     verifiedPincode: "",
//     leadOutcome: "No MR",
//     remarks: "CALL LATER\nsend mr\n\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240722-131118_8577978211_2032_2636490-all.mp3",
//     mrNameAsPerPincode: "Avnish Kumar Dubey",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Dr Taniya Singh",
//     planned: "7/22/2024 15:20:03",
//     actual: "6/30/2025 14:46:51",
//     col28: "",
//     status: "2528:26:47",
//     assignToMROrASM: "No MR",
//     remarksOps: "",
//     assignToTPDate: "no mr",
//     partyType: "",
//     verifiedAreaTP: "",
//     helpTicketStatusToAssignPerson: "",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "Transfer to Vidisha Bahukhandi's Sheet - 24/06/2025",
//   },
//   {
//     timestamp: "7/27/2024 13:49:58",
//     verifiedDate: "7/26/2024",
//     id: "3416_July-2024-9439293",
//     clientName: "Dr. Aanand",
//     mobileNumber: "9928807542",
//     email: "",
//     address: "Paschim Vihar, Delhi, 110063\n",
//     pincode: "110063",
//     state: "Delhi",
//     city: "New Delhi",
//     area: "Paschim Vihar",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Wed May 08 2024 12:05:45 GMT 0530 (India Standard Time), Last Order Value - 1345.50079999999",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240727-134009_9928807542_2032_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "MR VIKRAM CLIENT\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240727-134009_9928807542_2032_2636490-all.mp3",
//     mrNameAsPerPincode: "Vijay kumar",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Dr Taniya Singh",
//     planned: "7/27/2024 15:49:58",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2436:08:23",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "Vikram Sain",
//     assignToTPDate: "ex",
//     partyType: "7/10/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "bassisti",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "here are some exceptions in columns | AH",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/30/2024 15:35:33",
//     verifiedDate: "4/19/2024",
//     id: "2698_April-2024-1088476",
//     clientName: "Valley Healthcare",
//     mobileNumber: "9140064609",
//     email: "",
//     address: "Tarapur, Silchar - 788003\n",
//     pincode: "788003",
//     state: "Assam",
//     city: "Tarapur",
//     area: "Tarapur",
//     clientType: "B2B",
//     speciality: "",
//     clientCategory: "B2B",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Retailer, Last Purchase Date - Thu Jan 25 2024 13:05:13 GMT 0530 (India Standard Time), Last Order Value - 4461",
//     recordingUrl: "http://dialer.elisiontec.com/RECORDINGS/MP3/20240507-122247_9140064609_2032_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "No MR",
//     remarks: "mr dilip client\nCall Recording : http://dialer.elisiontec.com/RECORDINGS/MP3/20240507-122247_9140064609_2032_2636490-all.mp3",
//     mrNameAsPerPincode: "Vinod Kumar K V",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Dr Taniya Singh",
//     planned: "7/30/2024 17:35:33",
//     actual: "6/30/2025 14:46:55",
//     col28: "",
//     status: "2463:11:21",
//     assignToMROrASM: "No MR",
//     remarksOps: "",
//     assignToTPDate: "no mr",
//     partyType: "",
//     verifiedAreaTP: "",
//     helpTicketStatusToAssignPerson: "",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "Transfer to Vidisha Bahukhandi's Sheet - 24/06/2025",
//   },
//   {
//     timestamp: "7/30/2024 16:21:33",
//     verifiedDate: "5/23/2024",
//     id: "1245_May-2024-2240667",
//     clientName: "Ayush ayurvedic store",
//     mobileNumber: "9680568736",
//     email: "",
//     address: "bengali colony chhawani kota",
//     pincode: "324007",
//     state: "Rajasthan",
//     city: "Kota",
//     area: "chhawani",
//     clientType: "b2c",
//     speciality: "",
//     clientCategory: "b2c",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Retailer, Last Purchase Date - Fri Apr 12 2024 17:37:36 GMT 0530 (India Standard Time), Last Order Value - 1360.6279069767443",
//     recordingUrl: "http://dialer.elisiontec.com/RECORDINGS/MP3/20240524-142334_9680568736_2032_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "CALL\nMR RAJENENDERA JI CLIENT\nCall Recording : http://dialer.elisiontec.com/RECORDINGS/MP3/20240524-142334_9680568736_2032_2636490-all.mp3",
//     mrNameAsPerPincode: "NO MR",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Dr Taniya Singh",
//     planned: "7/30/2024 18:21:33",
//     actual: "6/26/2025 17:12:47",
//     col28: "",
//     status: "2438:12:47",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "Rajendra Kumar",
//     assignToTPDate: "ex",
//     partyType: "6/26/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "kota",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "here are some exceptions in columns | AH",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "7/30/2024 17:07:23",
//     verifiedDate: "",
//     id: "ARI5124-2477414",
//     clientName: "New Shri Bhavreshwar Aushadhalaya",
//     mobileNumber: "8881121126",
//     email: "",
//     address: "Lucknow, Uttar Pradesh 226025\n",
//     pincode: "226025",
//     state: "UP",
//     city: "lucknow",
//     area: "Sarpotganj",
//     clientType: "Patanjali Store",
//     speciality: "",
//     clientCategory: "B2D-R",
//     dataSource: "Patanjali Store Lucknow",
//     notes: "Raebareli Road Telibagh - 221002",
//     recordingUrl: "http://dialer.elisiontec.com/RECORDINGS/MP3/20240528-165756_8881121126_2031_5360814-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "No MR",
//     remarks: "client already dealing with MR manish in Lucknow\nCall Recording : http://dialer.elisiontec.com/RECORDINGS/MP3/20240528-165756_8881121126_2031_5360814-all.mp3",
//     mrNameAsPerPincode: "Kiran Dinkar Jadkar",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Vidisha Bahukhandi",
//     planned: "7/30/2024 19:07:23",
//     actual: "6/30/2025 14:55:07",
//     col28: "",
//     status: "2462:55:07",
//     assignToMROrASM: "No MR",
//     remarksOps: "No mr",
//     assignToTPDate: "",
//     partyType: "",
//     verifiedAreaTP: "",
//     helpTicketStatusToAssignPerson: "",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "Transfer to Vidisha Bahukhandi's Sheet - 30/06/2025",
//   },
//   {
//     timestamp: "7/31/2024 11:50:18",
//     verifiedDate: "7/21/2024",
//     id: "1787_July-2024-9067910",
//     clientName: "Dr. Manoj Yadav",
//     mobileNumber: "9235594531",
//     email: "",
//     address: "near telephone colony  betiyahata gorakhpur ",
//     pincode: "273001",
//     state: "UP",
//     city: "Gorakhpur",
//     area: "near telephone colony  betiyahata gorakhpur ",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Fri Feb 23 2024 23:38:37 GMT 0530 (India Standard Time), Last Order Value - 683.6666666666666",
//     recordingUrl: "http://dialer1.elisiontec.com/RECORDINGS/MP3/20240726-130757_9235594531_2032_2636490-all.mp3",
//     verifiedArea: "near telephone colony  betiyahata gorakhpur ",
//     verifiedPincode: "273001",
//     leadOutcome: "No MR",
//     remarks: "mr is visiting him\nCall Recording : http://dialer1.elisiontec.com/RECORDINGS/MP3/20240726-130757_9235594531_2032_2636490-all.mp3",
//     mrNameAsPerPincode: "Nirbhay Singh",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Dr Taniya Singh",
//     planned: "7/31/2024 13:50:18",
//     actual: "6/30/2025 15:08:18",
//     col28: "",
//     status: "2458:17:59",
//     assignToMROrASM: "No MR",
//     remarksOps: "No mr",
//     assignToTPDate: "",
//     partyType: "",
//     verifiedAreaTP: "",
//     helpTicketStatusToAssignPerson: "",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "",
//     transferToBufferStatusIfNoMRExist: "Transfer to Vidisha Bahukhandi's Sheet - 30/06/2025",
//   },
//   {
//     timestamp: "8/9/2024 15:50:00",
//     verifiedDate: "2024-07-31T18:30:00.000Z",
//     id: "-LDU4G28N1-10145851",
//     clientName: "Vd Sandeep Verma",
//     mobileNumber: "9161518204",
//     email: "drsandeep9161@gmail.com",
//     address: "Delhi",
//     pincode: "110015",
//     state: "Delhi",
//     city: "New Delhi",
//     area: "Ramesh Nagar",
//     clientType: "Doctor",
//     speciality: "Ayurvedic Doctor_Panchakarma Center",
//     clientCategory: "Doctor",
//     dataSource: "SqvNotes -  Looking for products, SqvAdditionalNotes -  NA, originalNotes  Are you an Ayurvedic Doctor or physician?: Yes",
//     notes: "",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240809-154153_9161518204_2031_3188322-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "said call me after 3 to 5 pm\nnot responding\nCLIENT already dealing with MR in lakhimpur khiri 262701\n\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240809-154153_9161518204_2031_3188322-all.mp3",
//     mrNameAsPerPincode: "Rakesh Vaheliya",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "7408576092",
//     callingSalesPersonName: "Vidisha Bahukhandi",
//     planned: "8/9/2024 17:50:00",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2344:08:21",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "Rahul Kumar Gupta",
//     assignToTPDate: "ex",
//     partyType: "6/27/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "Lakhimpur",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "Transfer to TP - 24/06/2025 13:07:25",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "24-06-2025 \"{\\\"status\\\":9000,\\\"code\\\":9000,\\\"message\\\":\\\"TP updated.\\\",\\\"generatedId\\\":0}\"",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "8/16/2024 12:20:14",
//     verifiedDate: "7/10/2024",
//     id: "DROP-0405-7591482",
//     clientName: "Dr Satendra Katiyar",
//     mobileNumber: "9451022185",
//     email: "",
//     address: "primary pathshala, Kanpur, Uttar Pradesh 209112",
//     pincode: "209112",
//     state: "UP",
//     city: "Kanpur",
//     area: "Pathshala",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Mon Apr 22 2024 15:30:45 GMT 0530 (India Standard Time), Last Order Value - 1126.5",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240816-121602_9451022185_2033_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "disconnect the call kanpur  \nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240816-121602_9451022185_2033_2636490-all.mp3",
//     mrNameAsPerPincode: "Tikam Chand Ashrani",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Sana Albi",
//     planned: "8/16/2024 14:20:14",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2302:38:07",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "SATISH CHANDRA GANGWAR SELF",
//     assignToTPDate: "ex",
//     partyType: "6/24/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "KANPUR",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "Transfer to TP - 24/06/2025 13:07:25",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "24-06-2025 \"{\\\"status\\\":9000,\\\"code\\\":9000,\\\"message\\\":\\\"TP updated.\\\",\\\"generatedId\\\":0}\"",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "8/21/2024 16:35:14",
//     verifiedDate: "7/5/2024",
//     id: "3056_July-2024-7403784",
//     clientName: "DR. SRIYANSH DUBEY",
//     mobileNumber: "9696477016",
//     email: "",
//     address: "Gurugram, Haryana 122018",
//     pincode: "122018",
//     state: "Haryana",
//     city: "Gurugram",
//     area: "Gurugram",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Tue Apr 30 2024 12:36:20 GMT 0530 (India Standard Time), Last Order Value - 10046",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240821-162043_9696477016_2031_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "client disconnected the call\nclient already dealing with MR shelesh in Lucknow \n\n\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240821-162043_9696477016_2031_2636490-all.mp3",
//     mrNameAsPerPincode: "RAVINDRAN B",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Vidisha Bahukhandi",
//     planned: "8/21/2024 18:35:14",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2271:58:21",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "SAILESH KUMAR VERMA",
//     assignToTPDate: "ex",
//     partyType: "6/24/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "GOMTI NAGAR",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "Transfer to TP - 24/06/2025 13:07:25",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "24-06-2025 \"{\\\"status\\\":9008,\\\"code\\\":9008,\\\"message\\\":\\\"No TP found of selected month\\\",\\\"generatedId\\\":0}\"",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "8/21/2024 17:35:19",
//     verifiedDate: "8/12/2024",
//     id: "1011_August-2024-11052421",
//     clientName: "Dr.S.C.Gupta",
//     mobileNumber: "9811285150",
//     email: "",
//     address: "Lajpat Nagar 4, Shalimar Bagh, Delhi, 110088",
//     pincode: "110088",
//     state: "Delhi",
//     city: "New Delhi",
//     area: "Lajpat Nagar",
//     clientType: "M",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Wed Nov 29 2023 16:36:00 GMT 0530 (India Standard Time), Last Order Value - 1283",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240821-171311_9811285150_2031_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Assign To MR",
//     remarks: "client already dealing with SK thakur MR\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240821-171311_9811285150_2031_2636490-all.mp3",
//     mrNameAsPerPincode: "Nand kishor Verma",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Vidisha Bahukhandi",
//     planned: "8/21/2024 19:35:19",
//     actual: "6/30/2025 15:05:49",
//     col28: "",
//     status: "2319:05:49",
//     assignToMROrASM: "Assign To MR",
//     remarksOps: "S K THAKUR SELF",
//     assignToTPDate: "ex",
//     partyType: "7/8/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "ASHRAM",
//     transferToApiSheetStatus: "NA",
//     directTransferToTpSheet: "Transfer to TP - 30/06/2025 15:35:18",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "30-06-2025 \"{\\\"status\\\":9000,\\\"code\\\":9000,\\\"message\\\":\\\"TP updated.\\\",\\\"generatedId\\\":0}\"",
//     transferToDeleteSheet: "Sent to delete - 30/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
//   {
//     timestamp: "8/21/2024 17:50:30",
//     verifiedDate: "8/12/2024",
//     id: "3551_August-2024-11052431",
//     clientName: "DR. PUNEET",
//     mobileNumber: "9628037555",
//     email: "",
//     address: "Neelgiri Chauraha 226016  Lucknow State: Uttar Pradesh",
//     pincode: "226016",
//     state: "UP",
//     city: "Lucknow",
//     area: "Neelgiri Chauraha",
//     clientType: "Doctor",
//     speciality: "",
//     clientCategory: "Doctor",
//     dataSource: "Enquiry From - POB- Lost Clients Tracker (Escalated)",
//     notes: "Client Type - Doctor, Last Purchase Date - Sat May 25 2024 16:05:35 GMT 0530 (India Standard Time), Last Order Value - 2200.779",
//     recordingUrl: "https://dialer1.elisiontec.com/RECORDINGS/MP3/20240821-174208_9628037555_2031_2636490-all.mp3",
//     verifiedArea: "",
//     verifiedPincode: "",
//     leadOutcome: "Cold",
//     remarks: "client already dealing with MR shelesh in Lucknow\nCall Recording : https://dialer1.elisiontec.com/RECORDINGS/MP3/20240821-174208_9628037555_2031_2636490-all.mp3",
//     mrNameAsPerPincode: "Vishal Sharma",
//     existingNewAsPerMRData: "Existing",
//     altMobileNumber: "",
//     callingSalesPersonName: "Vidisha Bahukhandi",
//     planned: "8/21/2024 19:50:30",
//     actual: "6/24/2025 12:58:21",
//     col28: "",
//     status: "2271:58:21",
//     assignToMROrASM: "Cold",
//     remarksOps: "SAILESH KUMAR VERMA",
//     assignToTPDate: "cloesd",
//     partyType: "2/26/2025",
//     verifiedAreaTP: "Doctor",
//     helpTicketStatusToAssignPerson: "lakhnau",
//     transferToApiSheetStatus: "",
//     directTransferToTpSheet: "",
//     col38: "",
//     altMobileNumberTP: "",
//     exceptions: "",
//     htStatusFromHtRecordSheet: "",
//     responseOfAddInApp: "",
//     responseOfTPUpdate: "",
//     transferToDeleteSheet: "Sent to delete - 24/06/2025",
//     transferToBufferStatusIfNoMRExist: "",
//   },
// ]

import { useMRFMSLeads } from "@/hooks/Usemrfmsleads"
import MRDataCheck from "@/components/Mrdatacheck"

export default function MRFMSDashboard() {
  const { leads, isLoading, fetchError, lastUpdatedTime } = useMRFMSLeads()
  const [searchInput, setSearchInput] = useState("")
  const [stateFilter, setStateFilter] = useState("all")
  const [clientTypeFilter, setClientTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [mrNameFilter, setMrNameFilter] = useState("all")
  const [leadOutcomeFilter, setLeadOutcomeFilter] = useState("all")
  const [statusCategoryFilter, setStatusCategoryFilter] = useState("all") // KPI card clicks ke liye
  const [activeSection, setActiveSection] = useState<string>("identity");
  // Pagination states matching the Lead Assign page style
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [goToPageInput, setGoToPageInput] = useState("")

  const [selectedLead, setSelectedLead] = useState<MRFMSLead | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isMRCheckOpen, setIsMRCheckOpen] = useState(false)
  const [mrCheckLead, setMrCheckLead] = useState<MRFMSLead | null>(null)

  // Extra states for table interactions
  const [sortField, setSortField] = useState<keyof MRFMSLead>("timestamp")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Simple sort toggle
  const handleSort = (field: keyof MRFMSLead) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Derived filter options
  const uniqueStates = useMemo(() => {
    const states = new Set(leads.map((l) => l.state).filter(Boolean))
    return Array.from(states)
  }, [leads])

  const uniqueClientTypes = useMemo(() => {
    const types = new Set(leads.map((l) => l.clientType).filter(Boolean))
    return Array.from(types)
  }, [leads])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(leads.map((l) => l.status).filter(Boolean))
    return Array.from(statuses)
  }, [leads])

  const uniqueMRNames = useMemo(() => {
    const names = new Set(leads.map((l) => l.mrNameAsPerPincode).filter(Boolean))
    return Array.from(names)
  }, [leads])

  const uniqueOutcomes = useMemo(() => {
    const outcomes = new Set(leads.map((l) => l.leadOutcome).filter(Boolean))
    return Array.from(outcomes)
  }, [leads])

  // Filtered and sorted leads list
  const processedLeads = useMemo(() => {
    let result = [...leads]

    // Apply Search
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase()
      result = result.filter(
        (l) =>
          l.clientName.toLowerCase().includes(q) ||
          l.mobileNumber.includes(q) ||
          l.id.toLowerCase().includes(q) ||
          l.mrNameAsPerPincode.toLowerCase().includes(q)
      )
    }

    // Apply State Filter
    if (stateFilter !== "all") {
      result = result.filter((l) => l.state === stateFilter)
    }

    // Apply Client Type Filter
    if (clientTypeFilter !== "all") {
      result = result.filter((l) => l.clientType === clientTypeFilter)
    }

    // Apply Status Filter
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter)
    }

    // Apply MR Name Filter
    if (mrNameFilter !== "all") {
      result = result.filter((l) => l.mrNameAsPerPincode === mrNameFilter)
    }

    // Apply Lead Outcome Filter
    if (leadOutcomeFilter !== "all") {
      result = result.filter((l) => l.leadOutcome === leadOutcomeFilter)
    }

    // Apply KPI card status category filter (status column se)
    if (statusCategoryFilter !== "all") {
      const cat = statusCategoryFilter.toLowerCase()
      result = result.filter((l) => {
        const s = (l.status || "").toLowerCase()
        return s.includes(cat)
      })
    }

    // Sort — timestamp ko Date parse karke compare karo, baaki string comparison
    result.sort((a, b) => {
      let diff = 0
      if (sortField === "timestamp") {
        const toMs = (v: string) => {
          const d = new Date(v)
          return isNaN(d.getTime()) ? 0 : d.getTime()
        }
        diff = toMs(a.timestamp) - toMs(b.timestamp)
      } else {
        const valA = (a[sortField] || "").toString().toLowerCase()
        const valB = (b[sortField] || "").toString().toLowerCase()
        diff = valA < valB ? -1 : valA > valB ? 1 : 0
      }
      return sortDirection === "asc" ? diff : -diff
    })

    return result
  }, [leads, searchInput, stateFilter, clientTypeFilter, statusFilter, mrNameFilter, leadOutcomeFilter, statusCategoryFilter, sortField, sortDirection])

  // KPI Calculations dynamically computed based on current state & filters
  const {
    totalLeadsCount,
    assignToMRCount,
    coldCount,
    noMRCount,
    holdCount,
    callingSheetCount,
    option1Count,
    transferToTPCount,
    transferToDeleteCount,
  } = useMemo(() => {
    let total = processedLeads.length
    let assignToMR = 0
    let cold = 0
    let noMR = 0
    let hold = 0
    let callingSheet = 0
    let option1 = 0
    let transferToTP = 0
    let transferToDelete = 0

    processedLeads.forEach((l) => {
      // status column se assignment value aati hai
      const statusVal = (l.status || "").toLowerCase()
      if (statusVal.includes("assign to mr")) {
        assignToMR++
      } else if (statusVal.includes("cold")) {
        cold++
      } else if (statusVal.includes("no mr")) {
        noMR++
      } else if (statusVal.includes("hold")) {
        hold++
      } else if (statusVal.includes("calling sheet") || statusVal.includes("assign to calling")) {
        callingSheet++
      } else if (statusVal === "option 1" || statusVal.includes("option 1")) {
        option1++
      }

      const tpStatus = (l.directTransferToTpSheet || "").toLowerCase()
      if (tpStatus.includes("transfer")) {
        transferToTP++
      }

      const deleteStatus = (l.transferToDeleteSheet || "").toLowerCase()
      if (deleteStatus.includes("delete")) {
        transferToDelete++
      }
    })

    return {
      totalLeadsCount: total,
      assignToMRCount: assignToMR,
      coldCount: cold,
      noMRCount: noMR,
      holdCount: hold,
      callingSheetCount: callingSheet,
      option1Count: option1,
      transferToTPCount: transferToTP,
      transferToDeleteCount: transferToDelete,
    }
  }, [processedLeads])

  // Pagination calculation
  const totalPages = Math.ceil(totalLeadsCount / itemsPerPage) || 1

  // Adjust page number if it exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const tableStartIndex = (currentPage - 1) * itemsPerPage
  const tableEndIndex = Math.min(tableStartIndex + itemsPerPage, totalLeadsCount)

  const currentPaginatedLeads = useMemo(() => {
    return processedLeads.slice(tableStartIndex, tableEndIndex)
  }, [processedLeads, tableStartIndex, tableEndIndex])

  const openDetails = (lead: MRFMSLead) => {
    setSelectedLead(lead)
    setIsDetailOpen(true)
  }

  // Helper render method for sort arrows
  const renderSortIcon = (field: keyof MRFMSLead) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    return <ArrowUpDown className="h-3 w-3 text-white font-bold" />
  }

  // Full-page GIF loader — jab tak data load nahi hota tab tak dikhega
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/grouploader.gif"
              alt="Loading..."
              className="w-[220px] h-[220px] object-contain"
            />
            <p className="text-sm font-medium text-slate-500 tracking-wide">Loading data…</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section matching screenshot (Rich Blue Gradient Banner) */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] rounded-2xl overflow-hidden">
          <div className="w-full px-6 py-6">
            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              &larr; Back
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Left Side: Stethoscope Icon, Title & Subtitles */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                    MR FMS Hub
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                    Lost Clients Recovery &middot; MR Assignment &middot; Call Tracking
                  </p>
                </div>
              </div>

              {/* Right Section: Glowing Total Leads Card */}
              <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                    Total Leads
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                    {leads.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error banner ── */}
        {fetchError && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            <span className="mt-0.5 text-lg">⚠️</span>
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-0.5 text-xs text-amber-700 font-mono">{fetchError}</p>
            </div>
          </div>
        )}

        {/* Filters Card with updated header matching KTAHV / Villa Raag style */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
          {/* Filters Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                  Filters & Search
                </h3>
                <p className="text-xs text-slate-500">
                  Refine your lead feed using smart parameters
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput("")
                setStateFilter("all")
                setClientTypeFilter("all")
                setStatusFilter("all")
                setMrNameFilter("all")
                setLeadOutcomeFilter("all")
                setStatusCategoryFilter("all")
                setCurrentPage(1)
              }}
              className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
            >
              Clear Filters
            </Button>
          </div>

          {/* Filter Inputs Grid Row */}
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* 1. SEARCH LEADS */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Search Leads
              </label>
              <Input
                placeholder="Search by client, ID, mobile..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 rounded-lg border-slate-200 text-sm text-slate-700 w-full placeholder:text-slate-400 bg-white focus:border-blue-400"
              />
            </div>

            {/* 2. STATE */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                State
              </label>
              <Select
                value={stateFilter}
                onValueChange={(val) => {
                  setStateFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:border-blue-400">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {uniqueStates.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. CLIENT TYPE */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Client Type
              </label>
              <Select
                value={clientTypeFilter}
                onValueChange={(val) => {
                  setClientTypeFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:border-blue-400">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueClientTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. STATUS */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:border-blue-400">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {uniqueStatuses.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 5. MR NAME */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                MR Name
              </label>
              <Select
                value={mrNameFilter}
                onValueChange={(val) => {
                  setMrNameFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:border-blue-400">
                  <SelectValue placeholder="All MRs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All MRs</SelectItem>
                  {uniqueMRNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 6. LEAD OUTCOME */}
            <div className="flex flex-col w-full">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                Lead Outcome
              </label>
              <Select
                value={leadOutcomeFilter}
                onValueChange={(val) => {
                  setLeadOutcomeFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 w-full rounded-lg border-slate-200 bg-white text-sm text-slate-700 focus:border-blue-400">
                  <SelectValue placeholder="All Outcomes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  {uniqueOutcomes.map((out) => (
                    <SelectItem key={out} value={out}>
                      {out}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPI Section matching Lead Assignment Hub layout exactly */}
        <div className="relative">
          <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight break-words">
                    Key Performance Indicators
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Overview of lead statuses & performance metrics
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards Content */}
            <div className="p-5 space-y-5">
              {/* Row 1 - Lead Distribution / Status Metrics */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Lead Status Metrics
                  </h4>
                  {/* <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-full">
                    ✓ Live Feed Synced
                  </span> */}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                  {/* Total Leads */}
                  <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight mb-2">
                      Total Leads Received
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {totalLeadsCount}
                    </p>
                    <span className="text-[9px] text-blue-500 font-medium">Filtered count</span>
                  </div>

                  {/* Assign to MR */}
                  <div
                    className={`bg-emerald-50/70 border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-emerald-100/80 active:scale-95 ${statusCategoryFilter === "assign to mr" ? "border-emerald-600 ring-2 ring-emerald-400 ring-offset-1" : "border-emerald-300"}`}
                    onClick={() => { setStatusCategoryFilter(statusCategoryFilter === "assign to mr" ? "all" : "assign to mr"); setCurrentPage(1); }}
                    title="Click to filter Assign To MR leads"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 leading-tight">
                        Assign to MR
                      </p>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {assignToMRCount}
                    </p>
                    <span className="text-[9px] text-emerald-600 font-medium">
                      {totalLeadsCount > 0 ? `${((assignToMRCount / totalLeadsCount) * 100).toFixed(0)}% of total` : "0%"}
                    </span>
                  </div>

                  {/* Cold */}
                  <div
                    className={`bg-slate-50/70 border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-slate-100/80 active:scale-95 ${statusCategoryFilter === "cold" ? "border-slate-600 ring-2 ring-slate-400 ring-offset-1" : "border-slate-300"}`}
                    onClick={() => { setStatusCategoryFilter(statusCategoryFilter === "cold" ? "all" : "cold"); setCurrentPage(1); }}
                    title="Click to filter Cold leads"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 leading-tight mb-2">
                      Cold Leads
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {coldCount}
                    </p>
                    <span className="text-[9px] text-slate-500 font-medium">No requirement</span>
                  </div>

                  {/* No MR */}
                  <div
                    className={`bg-amber-50/70 border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-amber-100/80 active:scale-95 ${statusCategoryFilter === "no mr" ? "border-amber-600 ring-2 ring-amber-400 ring-offset-1" : "border-amber-300"}`}
                    onClick={() => { setStatusCategoryFilter(statusCategoryFilter === "no mr" ? "all" : "no mr"); setCurrentPage(1); }}
                    title="Click to filter No MR leads"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight mb-2">
                      No MR Pincodes
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {noMRCount}
                    </p>
                    <span className="text-[9px] text-amber-600 font-medium">Pending allocation</span>
                  </div>

                  {/* Hold */}
                  <div
                    className={`bg-orange-50/70 border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-orange-100/80 active:scale-95 ${statusCategoryFilter === "hold" ? "border-orange-600 ring-2 ring-orange-400 ring-offset-1" : "border-orange-300"}`}
                    onClick={() => { setStatusCategoryFilter(statusCategoryFilter === "hold" ? "all" : "hold"); setCurrentPage(1); }}
                    title="Click to filter Hold leads"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 leading-tight">
                        Hold
                      </p>
                      <PauseCircle className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {holdCount}
                    </p>
                    <span className="text-[9px] text-orange-600 font-medium">Temporarily paused</span>
                  </div>

                  {/* Assign To Calling Sheet */}
                  <div
                    className={`bg-purple-50/70 border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-purple-100/80 active:scale-95 ${statusCategoryFilter === "calling sheet" ? "border-purple-600 ring-2 ring-purple-400 ring-offset-1" : "border-purple-300"}`}
                    onClick={() => { setStatusCategoryFilter(statusCategoryFilter === "calling sheet" ? "all" : "calling sheet"); setCurrentPage(1); }}
                    title="Click to filter Assign To Calling Sheet leads"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 leading-tight">
                        Calling Sheet
                      </p>
                      <Phone className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {callingSheetCount}
                    </p>
                    <span className="text-[9px] text-purple-600 font-medium">Assigned to call</span>
                  </div>

                  {/* Option 1 */}
                  <div
                    className={`bg-teal-50/70 border-2 rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-teal-100/80 active:scale-95 ${statusCategoryFilter === "option 1" ? "border-teal-600 ring-2 ring-teal-400 ring-offset-1" : "border-teal-300"}`}
                    onClick={() => { setStatusCategoryFilter(statusCategoryFilter === "option 1" ? "all" : "option 1"); setCurrentPage(1); }}
                    title="Click to filter Option 1 leads"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700 leading-tight mb-2">
                      Option 1
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {option1Count}
                    </p>
                    <span className="text-[9px] text-teal-600 font-medium">Option 1 leads</span>
                  </div>

                  {/* Transfer to TP */}
                  <div className="bg-indigo-50/70 border-2 border-indigo-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 leading-tight">
                        Transfer to TP
                      </p>
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {transferToTPCount}
                    </p>
                    <span className="text-[9px] text-indigo-600 font-medium">Tour plan sheets</span>
                  </div>

                  {/* Transfer to Delete */}
                  {/* <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight">
                        Deleted Leads
                      </p>
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-1">
                      {transferToDeleteCount}
                    </p>
                    <span className="text-[9px] text-red-600 font-medium">Sent to delete</span>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consistent & Professional Table Wrapper matching Lead Assign */}
        <div className="border-2 border-slate-200 rounded-xl shadow-xl bg-white overflow-hidden relative">
          {/* Table Header Section with Gradient Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                  MR FMS Records Requiring Actions
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200 text-xs font-semibold text-blue-700">
                Matches: {totalLeadsCount}
              </span>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200" style={{ fontSize: "var(--text-sm)" }}>
              {/* Sticky Header */}
              <thead className="sticky top-0 z-10 border-b-2 border-slate-400 shadow" style={{ backgroundColor: "#1e3a5f" }}>
                <tr className="border-b-2 border-slate-400">
                  <th
                    scope="col"
                    onClick={() => handleSort("timestamp")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f", position: "sticky", left: 0, zIndex: 20 }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Timestamp
                      {renderSortIcon("timestamp")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("verifiedDate")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f", position: "sticky", left: 160, zIndex: 20 }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Verified Date
                      {renderSortIcon("verifiedDate")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("id")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f", position: "sticky", left: 300, zIndex: 20 }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      ID
                      {renderSortIcon("id")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("clientName")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f", position: "sticky", left: 480, zIndex: 20, boxShadow: "4px 0 6px -2px rgba(0,0,0,0.3)" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Client Details
                      {renderSortIcon("clientName")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("address")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Address
                      {renderSortIcon("address")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("state")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      State / City
                      {renderSortIcon("state")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("area")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Area
                      {renderSortIcon("area")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("clientType")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Client Type
                      {renderSortIcon("clientType")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("speciality")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Speciality
                      {renderSortIcon("speciality")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("clientCategory")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Client Category
                      {renderSortIcon("clientCategory")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("dataSource")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Data Source
                      {renderSortIcon("dataSource")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("notes")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Notes
                      {renderSortIcon("notes")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    Recording URL
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("verifiedArea")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Verified Area
                      {renderSortIcon("verifiedArea")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("verifiedPincode")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Verified Pincode
                      {renderSortIcon("verifiedPincode")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("leadOutcome")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Lead Outcome
                      {renderSortIcon("leadOutcome")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("remarks")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Remarks
                      {renderSortIcon("remarks")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("mrNameAsPerPincode")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      MR Name as Per Pincode
                      {renderSortIcon("mrNameAsPerPincode")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("existingNewAsPerMRData")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Existing/New as per MR Data
                      {renderSortIcon("existingNewAsPerMRData")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("assignToMROrASM")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Assign to MR / ASM
                      {renderSortIcon("assignToMROrASM")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    onClick={() => handleSort("status")}
                    className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-colors border-r border-slate-400 whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Status
                      {renderSortIcon("status")}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-slate-200">
                {currentPaginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={23} className="px-6 py-12 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  currentPaginatedLeads.map((lead, idx) => (
                    <tr
                      key={lead.id || idx}
                      className="group bg-white hover:bg-[#BFDBFF] transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 font-medium text-slate-900 bg-white group-hover:bg-[#BFDBFF] transition-colors"
                        style={{ position: "sticky", left: 0, zIndex: 10 }}>
                        {lead.timestamp}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700 bg-white group-hover:bg-[#BFDBFF] transition-colors"
                        style={{ position: "sticky", left: 160, zIndex: 10 }}>
                        {lead.verifiedDate || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 font-mono text-xs font-semibold select-all bg-white group-hover:bg-[#BFDBFF] transition-colors"
                        style={{ position: "sticky", left: 300, zIndex: 10 }}>
                        {lead.id}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 bg-white group-hover:bg-[#BFDBFF] transition-colors"
                        style={{ position: "sticky", left: 480, zIndex: 10, minWidth: "180px", boxShadow: "4px 0 6px -2px rgba(0,0,0,0.08)" }}>
                        <p className="font-bold text-slate-900 text-[13px] leading-tight" title={lead.clientName}>{lead.clientName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{lead.mobileNumber || "—"}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate" title={lead.email}>{lead.email || "—"}</p>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100" style={{ minWidth: "180px", maxWidth: "220px" }}>
                        <p className="text-[12px] text-slate-700 leading-snug" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.address}>{lead.address || "—"}</p>
                        {lead.pincode && <p className="text-[11px] text-slate-400 font-mono mt-0.5">{lead.pincode}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                        <p className="text-[12px] font-medium text-slate-800">{lead.state || "—"}</p>
                        {lead.city && <p className="text-[11px] text-slate-400 mt-0.5">{lead.city}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700" style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.area}>
                        {lead.area || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700">
                        {lead.clientType || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700" style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.speciality}>
                        {lead.speciality || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700">
                        {lead.clientCategory || "—"}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-700" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.dataSource}>
                        {lead.dataSource || "—"}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-700" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.notes}>
                        {lead.notes || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-center">
                        {lead.recordingUrl ? (
                          <a
                            href={lead.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 hover:underline text-xs font-medium"
                          >
                            ▶ Play
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700" style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.verifiedArea}>
                        {lead.verifiedArea || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-center">
                        {lead.verifiedPincode || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${lead.leadOutcome?.toLowerCase().includes("assign to mr")
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : lead.leadOutcome?.toLowerCase().includes("cold")
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : lead.leadOutcome?.toLowerCase().includes("no mr")
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}>
                          {lead.leadOutcome || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-700" style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.remarks}>
                        {lead.remarks || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 font-medium text-slate-800" style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lead.mrNameAsPerPincode}>
                        {lead.mrNameAsPerPincode || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-slate-700">
                        {lead.existingNewAsPerMRData || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${lead.assignToMROrASM?.toLowerCase().includes("assign to mr")
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : lead.assignToMROrASM?.toLowerCase().includes("cold")
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : lead.assignToMROrASM?.toLowerCase().includes("no mr")
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          }`}>
                          {lead.assignToMROrASM || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 text-center font-mono text-xs text-slate-600">
                        {lead.status || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetails(lead)}
                            className="h-8 px-3 text-xs font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMrCheckLead(lead)
                              setIsMRCheckOpen(true)
                            }}
                            className="h-8 px-3 text-xs font-medium border border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Verify
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Section Matching Lead Assign styling */}
          {totalLeadsCount > 0 && (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50">
              {/* Left Side: Showing info */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Showing</span>
                <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {tableStartIndex + 1}–{tableEndIndex}
                </span>
                <span>of</span>
                <span className="font-bold text-blue-700">{totalLeadsCount}</span>
                <span>leads</span>
              </div>

              {/* Center Page Selection */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0 text-xs bg-white"
                >
                  &laquo;
                </Button>

                {/* Previous */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs bg-white"
                >
                  &lsaquo; Prev
                </Button>

                {/* Page Numbers */}
                {(() => {
                  const pages = []
                  let startPage = Math.max(1, currentPage - 2)
                  let endPage = Math.min(totalPages, currentPage + 2)

                  if (currentPage <= 3) endPage = Math.min(5, totalPages)
                  if (currentPage >= totalPages - 2) startPage = Math.max(1, totalPages - 4)

                  if (startPage > 1) {
                    pages.push(<span key="start-ellipsis" className="px-1 text-slate-400">…</span>)
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`h-8 w-8 rounded-md text-xs font-semibold transition-all ${i === currentPage
                          ? "bg-blue-600 text-white shadow-md border border-blue-700"
                          : "bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-300"
                          }`}
                      >
                        {i}
                      </button>
                    )
                  }

                  if (endPage < totalPages) {
                    pages.push(<span key="end-ellipsis" className="px-1 text-slate-400">…</span>)
                  }

                  return pages
                })()}

                {/* Next */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 px-3 text-xs bg-white"
                >
                  Next &rsaquo;
                </Button>

                {/* Last Page */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 w-8 p-0 text-xs bg-white"
                >
                  &raquo;
                </Button>
              </div>

              {/* Right Side: Rows Per Page & Go To Page */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Rows per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Rows/page</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Go to page input */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Go to</span>
                  <Input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const targetPage = Number(goToPageInput)
                        if (targetPage >= 1 && targetPage <= totalPages) {
                          setCurrentPage(targetPage)
                        }
                      }
                    }}
                    className="h-8 w-12 rounded-md border-slate-300 px-1 text-center text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Dialog  */}
        <Dialog open={isDetailOpen} onOpenChange={(open) => { setIsDetailOpen(open); if (!open) setActiveSection("identity"); }}>
          <DialogContent
            showCloseButton={false}
            className="!max-w-none gap-0 p-0 rounded-xl overflow-hidden border-0 shadow-2xl flex flex-col"
            style={{ width: "min(98vw, 1200px)", maxHeight: "min(96vh, 860px)" }}
          >
            {selectedLead && (
              <>
                {/* ── HEADER ── */}
                <div
                  className="px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #3730a3 0%, #4f46e5 60%, #6366f1 100%)" }}
                >
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-2">
                      {selectedLead.clientName}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                      Full lead record for {selectedLead.clientName}
                    </DialogDescription>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center bg-white/10 border border-white/20 text-white/90 text-[11px] font-mono px-2 py-0.5 rounded-full">
                        {selectedLead.id}
                      </span>
                      {selectedLead.clientType && (
                        <span className="bg-white/10 border border-white/20 text-white/85 text-[11px] font-medium px-2 py-0.5 rounded-full">
                          {selectedLead.clientType}
                        </span>
                      )}
                      {selectedLead.assignToMROrASM && (
                        <span className={`hidden sm:inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${getAssignBadgeClass(selectedLead.assignToMROrASM)}`}>
                          {selectedLead.assignToMROrASM}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors mt-0.5 text-lg leading-none"
                    aria-label="Close"
                  >
                    &times;
                  </button>
                </div>

                {/* ── MOBILE: Horizontal scrollable section tabs ── */}
                <div className="md:hidden flex-shrink-0 border-b border-slate-100 bg-white overflow-x-auto">
                  <div className="flex gap-0 px-2 min-w-max">
                    {[
                      { id: "identity", label: "Identity" },
                      { id: "profile", label: "Profile" },
                      { id: "call", label: "Call" },
                      { id: "recording", label: "Recording" },
                      { id: "sync", label: "Sync" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex-shrink-0 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-all whitespace-nowrap
                          ${activeSection === s.id
                            ? "border-indigo-500 text-indigo-700 bg-indigo-50/50"
                            : "border-transparent text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
                          }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── BODY: Sidebar + Content ── */}
                <div className="flex flex-1 overflow-hidden min-h-0">

                  {/* Sidebar — desktop only */}
                  <aside className="hidden md:flex flex-col w-44 lg:w-52 flex-shrink-0 border-r border-slate-100 bg-slate-50 py-3 overflow-y-auto">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-4 mb-2">
                      Sections
                    </p>
                    {[
                      { id: "identity", label: "Identity & Location" },
                      { id: "profile", label: "Client Profile" },
                      { id: "call", label: "Call & Assignment" },
                      { id: "recording", label: "Voice Recording" },
                      { id: "sync", label: "Third-Party Sync" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-left text-[12px] font-medium transition-all border-l-2 w-full
                  ${activeSection === s.id
                            ? "bg-white text-indigo-700 border-indigo-500 font-semibold"
                            : "border-transparent text-slate-500 hover:bg-white hover:text-indigo-700 hover:border-indigo-400"
                          }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </aside>

                  {/* Content — sirf active section dikhega */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/60 px-3 sm:px-5 py-4">

                    {/* SECTION 1: Identity & Location */}
                    {activeSection === "identity" && (
                      <section>
                        <ModalSectionHeading title="① Identity & Location" accentColor="#4f46e5" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          <FieldCard label="Timestamp" value={selectedLead.timestamp} />
                          <FieldCard label="Verified Date" value={selectedLead.verifiedDate} />
                          <FieldCard label="Lead ID" value={selectedLead.id} mono highlight />
                          <FieldCard label="Client Name" value={selectedLead.clientName} highlight className="sm:col-span-2" />
                          <FieldCard label="Mobile Number" value={selectedLead.mobileNumber} />
                          <FieldCard label="Alt Mobile No." value={selectedLead.altMobileNumber} />
                          <FieldCard label="Email" value={selectedLead.email} />
                          <FieldCard label="Pincode" value={selectedLead.pincode} />
                          <FieldCard label="City" value={selectedLead.city} />
                          <FieldCard label="State" value={selectedLead.state} />
                          <FieldCard label="Area" value={selectedLead.area} />
                          <FieldCard label="Address" value={selectedLead.address} multiline className="sm:col-span-2 lg:col-span-3" />
                        </div>
                      </section>
                    )}

                    {/* SECTION 2: Client Profile */}
                    {activeSection === "profile" && (
                      <section>
                        <ModalSectionHeading title="② Client Profile & Lead Context" accentColor="#7c3aed" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          <FieldCard label="Client Type" value={selectedLead.clientType} />
                          <FieldCard label="Speciality" value={selectedLead.speciality} />
                          <FieldCard label="Client Category" value={selectedLead.clientCategory} />
                          <FieldCard label="Data Source" value={selectedLead.dataSource} multiline className="sm:col-span-2 lg:col-span-3" />
                          <FieldCard label="Notes" value={selectedLead.notes} multiline className="sm:col-span-2 lg:col-span-3" />
                        </div>
                      </section>
                    )}

                    {/* SECTION 3: Call & Assignment */}
                    {activeSection === "call" && (
                      <section>
                        <ModalSectionHeading title="③ Call & Assignment Information" accentColor="#059669" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          <FieldCard label="Calling Sales Person" value={selectedLead.callingSalesPersonName} />
                          <FieldCard label="MR Name (as per Pincode)" value={selectedLead.mrNameAsPerPincode} highlight />
                          <FieldCard label="Existing / New (MR Data)" value={selectedLead.existingNewAsPerMRData} />
                          <FieldCard label="Lead Outcome" value={selectedLead.leadOutcome} pill pillClass={getOutcomePillClass(selectedLead.leadOutcome)} />
                          <FieldCard label="Assign to MR or ASM" value={selectedLead.assignToMROrASM} pill pillClass={getAssignBadgeClass(selectedLead.assignToMROrASM)} highlight />
                          <FieldCard label="Status" value={selectedLead.status} />
                          <FieldCard label="Planned Visit" value={selectedLead.planned} />
                          <FieldCard label="Actual Visit" value={selectedLead.actual} />
                          <FieldCard label="Exceptions" value={selectedLead.exceptions} />
                          <FieldCard label="Remarks (Ops)" value={selectedLead.remarksOps} className="sm:col-span-2 lg:col-span-3" />
                          <FieldCard label="Remarks" value={selectedLead.remarks} multiline className="sm:col-span-2 lg:col-span-3" />
                        </div>
                      </section>
                    )}

                    {/* SECTION 4: Voice Recording */}
                    {activeSection === "recording" && (
                      <section>
                        <ModalSectionHeading title="④ Voice Call Recording" accentColor="#7c3aed" />
                        {selectedLead.recordingUrl ? (
                          <div className="bg-white border border-slate-100 rounded-lg p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-3">
                              Recording URL
                            </p>
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
                                  <Volume2 className="w-4 h-4 text-violet-600" />
                                </div>
                                <a
                                  href={selectedLead.recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 hover:underline text-[12px] break-all flex-1 font-mono leading-relaxed mt-1"
                                >
                                  {selectedLead.recordingUrl}
                                </a>
                              </div>
                              <Button
                                asChild
                                size="sm"
                                className="w-full sm:w-auto self-start h-9 px-4 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0 gap-1.5"
                              >
                                <a href={selectedLead.recordingUrl} target="_blank" rel="noopener noreferrer">
                                  ▶ Play Recording
                                </a>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white border border-slate-100 rounded-lg p-6 text-center text-slate-400 text-sm">
                            No recording available for this lead.
                          </div>
                        )}
                      </section>
                    )}

                    {/* SECTION 5: Third-Party Sync */}
                    {activeSection === "sync" && (
                      <section>
                        <ModalSectionHeading title="⑤ Third-Party & Technical Sync" accentColor="#b45309" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          <FieldCard label="Assign to TP Date" value={selectedLead.assignToTPDate} />
                          <FieldCard label="Party Type" value={selectedLead.partyType} />
                          <FieldCard label="Verified Area (TP)" value={selectedLead.verifiedAreaTP} />
                          <FieldCard label="Alt Mobile No. (TP)" value={selectedLead.altMobileNumberTP} />
                          <FieldCard label="Help Ticket Status" value={selectedLead.helpTicketStatusToAssignPerson} />
                          <FieldCard label="HT Status (Record Sheet)" value={selectedLead.htStatusFromHtRecordSheet} />
                          <FieldCard label="API Sheet Status" value={selectedLead.transferToApiSheetStatus} />
                          <FieldCard label="Response of Add in App" value={selectedLead.responseOfAddInApp} />
                          {/* <FieldCard label="Transfer to Delete Sheet" value={selectedLead.transferToDeleteSheet} /> */}
                          <FieldCard label="Direct Transfer to TP Sheet" value={selectedLead.directTransferToTpSheet} className="sm:col-span-2 lg:col-span-3" />
                          <FieldCard label="Response of TP Update" value={selectedLead.responseOfTPUpdate} multiline className="sm:col-span-2 lg:col-span-3" />
                          {/* <FieldCard label="Transfer to Buffer (No MR)" value={selectedLead.transferToBufferStatusIfNoMRExist} className="sm:col-span-2 lg:col-span-3" /> */}
                        </div>
                      </section>
                    )}

                  </div>
                </div>

                {/* ── FOOTER ── */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-100 bg-white flex-shrink-0">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {totalLeadsCount} total leads in feed
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDetailOpen(false)}
                    className="h-8 px-5 text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-600"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* MRDataCheck Modal */}
      {mrCheckLead && (
        <MRDataCheck
          isOpen={isMRCheckOpen}
          onClose={() => {
            setIsMRCheckOpen(false)
            setMrCheckLead(null)
          }}
          onSubmit={() => {
            // TODO: yahan apna API call lagao
          }}
          planned={mrCheckLead.planned}
          actual={mrCheckLead.actual}
          timeDelay={mrCheckLead.col28}
        />
      )}

    </DashboardLayout >
  )
}

// ── Assignment badge colour ──
function getAssignBadgeClass(value: string): string {
  const v = (value || "").toLowerCase()
  if (v.includes("assign to mr")) return "bg-emerald-50 text-emerald-700 border border-emerald-200"
  if (v.includes("cold")) return "bg-slate-100  text-slate-600  border border-slate-200"
  if (v.includes("no mr")) return "bg-amber-50   text-amber-700  border border-amber-200"
  return "bg-indigo-50 text-indigo-700 border border-indigo-200"
}

// ── Lead outcome pill colour ──
function getOutcomePillClass(value: string): string {
  const v = (value || "").toLowerCase()
  if (v.includes("assign to mr")) return "bg-emerald-50 text-emerald-700 border border-emerald-200"
  if (v.includes("cold")) return "bg-slate-100  text-slate-500  border border-slate-200"
  if (v.includes("no mr")) return "bg-amber-50   text-amber-700  border border-amber-200"
  return "bg-indigo-50 text-indigo-700 border border-indigo-200"
}

// ── Section heading with coloured left accent ──
function ModalSectionHeading({ title, accentColor }: { title: string; accentColor: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 mt-1">
      <div className="w-2 h-5 rounded-sm flex-shrink-0" style={{ background: accentColor }} />
      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

// ── Individual field card ──
function FieldCard({
  label,
  value,
  highlight = false,
  mono = false,
  multiline = false,
  pill = false,
  pillClass = "",
  className = "",
}: {
  label: string
  value?: string | null
  highlight?: boolean
  mono?: boolean
  multiline?: boolean
  pill?: boolean
  pillClass?: string
  className?: string
}) {
  const hasValue = !!(value && value.trim())
  return (
    <div className={`bg-white border border-slate-100 rounded-lg px-3.5 py-3 min-h-[60px] ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-1.5 leading-none">
        {label}
      </p>
      {hasValue ? (
        pill ? (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillClass}`}>
            {value}
          </span>
        ) : (
          <p className={[
            "text-[13px] leading-snug break-words",
            highlight ? "font-semibold text-slate-900" : "font-normal text-slate-700",
            mono ? "font-mono text-[12px]" : "",
            multiline ? "whitespace-pre-wrap" : "",
          ].join(" ")}>
            {value}
          </p>
        )
      ) : (
        <p className="text-[13px] text-slate-300 italic">—</p>
      )}
    </div>
  )
}
