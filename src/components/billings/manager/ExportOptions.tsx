import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Download, FileText, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchRevenueDataForOwner } from "@/lib/utils";
import { useAuth } from "@/context/AuthProvider";
import TaxReportCard from "./TaxReportCard";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import jsPDF from "jspdf";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import JSZip from "jszip";

function convertToCSV(data) {
  if (!data.length) return '';
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  return [header, ...rows].join('\r\n');
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const ExportOptions = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportHistory, setExportHistory] = useState([]);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleExport = async (format) => {
    if (!user) {
      toast({ title: 'Not logged in', description: 'Please log in to export data.' });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: 'Select Date Range', description: 'Please select a start and end date.' });
      return;
    }
    toast({
      title: `Exporting as ${format}`,
      description: `Your data is being exported as ${format}. It will be ready for download shortly.`,
    });
    const data = await fetchRevenueDataForOwner(user.uid);
    let fileName = '';
    if (format === 'CSV') {
      const csv = convertToCSV(data);
      fileName = `revenue-data-${startDate}-to-${endDate}.csv`;
      downloadFile(fileName, csv, 'text/csv');
    } else if (format === 'JSON') {
      fileName = `revenue-data-${startDate}-to-${endDate}.json`;
      downloadFile(fileName, JSON.stringify(data, null, 2), 'application/json');
    } else if (format === 'Excel') {
      toast({ title: 'Excel export not implemented', description: 'Please install xlsx library.' });
      return;
    } else if (format === 'PDF') {
      if (!data.length) {
        toast({ title: 'No data to export', description: 'No data available for the selected date range.' });
        return;
      }
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Revenue Data Export', 10, 15);
      doc.setFontSize(10);
      doc.text(`Date Range: ${startDate} to ${endDate}`, 10, 22);
      // Prepare table headers and rows
      const headers = Object.keys(data[0]);
      let y = 30;
      doc.setFont(undefined, 'bold');
      headers.forEach((header, i) => {
        doc.text(header, 10 + i * 40, y);
      });
      doc.setFont(undefined, 'normal');
      y += 7;
      data.forEach(row => {
        headers.forEach((header, i) => {
          let value = row[header] !== undefined ? String(row[header]) : '';
          doc.text(value, 10 + i * 40, y);
        });
        y += 7;
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
      });
      fileName = `revenue-data-${startDate}-to-${endDate}.pdf`;
      doc.save(fileName);
    }
    setExportHistory(prev => [{ format, fileName, date: new Date().toLocaleString() }, ...prev.slice(0, 4)]);
  };

  // Fetch all payments for manager's gyms when modal opens
  useEffect(() => {
    if (!receiptModalOpen || !user) return;
    const fetchReceipts = async () => {
      // 1. Fetch gyms for owner
      const gymsRef = collection(db, "gyms");
      const gymsQuery = query(gymsRef, where("ownerId", "==", user.uid));
      const gymsSnapshot = await getDocs(gymsQuery);
      const gymIds = gymsSnapshot.docs.map(doc => doc.id);
      if (gymIds.length === 0) {
        setReceipts([]);
        return;
      }
      // 2. Fetch payments for these gyms
      const paymentsRef = collection(db, "payments");
      const allPayments = [];
      for (let i = 0; i < gymIds.length; i += 10) {
        const batch = gymIds.slice(i, i + 10);
        const paymentsQuery = query(paymentsRef, where("gymId", "in", batch));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        allPayments.push(...paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setReceipts(allPayments);
    };
    fetchReceipts();
  }, [receiptModalOpen, user]);

  const handleSelectReceipt = (id: string) => {
    setSelectedReceipts(prev => prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]);
  };
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedReceipts([]);
      setSelectAll(false);
    } else {
      setSelectedReceipts(receipts.map(r => r.id));
      setSelectAll(true);
    }
  };
  const handleSendSelected = () => {
    if (selectedReceipts.length === 0) return;
    selectedReceipts.forEach(id => {
      const receipt = receipts.find(r => r.id === id);
      toast({ title: "Send Receipt (Simulated)", description: `Would send receipt to ${receipt?.userEmail || receipt?.memberName || id}` });
    });
  };

  return (
    <Card>
      <CardHeader className="bg-muted/50">
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5" />
          Export & Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <TooltipProvider>
          <div className="space-y-4">
            <div className="bg-white p-4 border rounded-md hover:bg-muted/10 transition-colors">
              <h3 className="font-medium mb-2">Export Revenue Data</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Export revenue data for your records or accounting purposes
              </p>
              <div className="flex gap-2 mb-3">
                <div>
                  <label className="text-xs">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1 ml-1" />
                </div>
                <div>
                  <label className="text-xs">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1 ml-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => handleExport("CSV")}
                      className="flex items-center justify-center gap-1 p-2 border rounded bg-white hover:bg-muted/20 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">CSV</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Download as CSV (for spreadsheets)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => handleExport("Excel")}
                      className="flex items-center justify-center gap-1 p-2 border rounded bg-white hover:bg-muted/20 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">Excel</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Download as Excel (for Microsoft Excel)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => handleExport("PDF")}
                      className="flex items-center justify-center gap-1 p-2 border rounded bg-white hover:bg-muted/20 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">PDF</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Download as PDF (for printing)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => handleExport("JSON")}
                      className="flex items-center justify-center gap-1 p-2 border rounded bg-white hover:bg-muted/20 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span className="text-sm">JSON</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Download as JSON (for developers)</TooltipContent>
                </Tooltip>
              </div>
              {exportHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-xs mb-1">Recent Exports</h4>
                  <ul className="text-xs">
                    {exportHistory.map((exp, idx) => (
                      <li key={idx} className="mb-1 flex items-center gap-2">
                        <span>{exp.date}:</span>
                        <span className="font-mono">{exp.fileName}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{exp.format}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white p-4 border rounded-md hover:bg-muted/10 transition-colors">
              <h3 className="font-medium mb-2">Bulk Receipt Management</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Generate and send receipts in bulk
              </p>
              <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
                <DialogTrigger asChild>
                  <button className="w-full py-2 text-white bg-[#0B294B] hover:bg-[#0a2544] rounded-md transition-colors flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Manage Receipts</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Receipt Management</DialogTitle>
                    <DialogDescription>Select receipts to send in bulk.</DialogDescription>
                  </DialogHeader>
                  <div className="mb-4 flex gap-2">
                    <button onClick={handleSendSelected} className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50" disabled={selectedReceipts.length === 0}>Send Selected</button>
                  </div>
                  <div className="overflow-x-auto max-h-80">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr>
                          <th><input type="checkbox" checked={selectAll} onChange={handleSelectAll} /></th>
                          <th>Date</th>
                          <th>Member</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map(r => (
                          <tr key={r.id}>
                            <td><input type="checkbox" checked={selectedReceipts.includes(r.id)} onChange={() => handleSelectReceipt(r.id)} /></td>
                            <td>{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                            <td>{r.userEmail || r.memberName || "-"}</td>
                            <td>{r.amount ? `$${r.amount}` : "-"}</td>
                            <td>{r.status}</td>
                            <td>{r.receiptUrl ? <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a> : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <button className="mt-4 px-4 py-2 bg-gray-300 rounded">Close</button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <TaxReportCard />
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default ExportOptions;
