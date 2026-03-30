import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  Clock, 
  Target, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Plus,
  Table as TableIcon,
  Upload,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import Papa from 'papaparse';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MetricEntry } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const safeFormatDate = (dateStr: string | undefined, formatStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

export default function App() {
  const [data, setData] = useState<MetricEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof MetricEntry; direction: 'asc' | 'desc' } | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<MetricEntry>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    leadsInflow: 0,
    activeCallers: 0,
    minutesSpoken: 0,
    uniqueLeadsDialed: 0,
    connectedLeads: 0,
    speakerDeliveryConfirmed: 0,
    processCompleted: 0,
    cancelSpeakerDelivery: 0,
    winningOutcome: 0,
    speakerAlreadyDelivered: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/metrics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data.map((row: any) => {
          const activeCallers = parseInt(row['Active Caller Total'] || row['activeCallers']) || 0;
          const minutesSpoken = parseInt(row['Minutes Spoken'] || row['minutesSpoken']) || 0;
          const uniqueLeadsDialed = parseInt(row['Unique Leads Dialed'] || row['uniqueLeadsDialed']) || 0;
          const connectedLeads = parseInt(row['Connected Leads'] || row['connectedLeads']) || 0;

          const rawDate = row['Date'] || row['date'];
          let parsedDate = rawDate ? parseISO(rawDate) : new Date();
          if (isNaN(parsedDate.getTime())) {
            // Try standard Date constructor as fallback if parseISO fails
            parsedDate = new Date(rawDate || Date.now());
            if (isNaN(parsedDate.getTime())) parsedDate = new Date();
          }

          return {
            date: format(parsedDate, 'yyyy-MM-dd'),
            leadsInflow: parseInt(row['Leads Inflow'] || row['leadsInflow']) || 0,
            activeCallers,
            minutesSpoken,
            timePerCaller: activeCallers > 0 ? Math.round(minutesSpoken / activeCallers) : 0,
            uniqueLeadsDialed,
            connectedLeads,
            speakerDeliveryConfirmed: parseInt(row['Speaker Delivery Confirmed'] || row['speakerDeliveryConfirmed']) || 0,
            processCompleted: parseInt(row['Process Already Completed'] || row['processCompleted']) || 0,
            cancelSpeakerDelivery: parseInt(row['Cancel Speaker Delivery'] || row['cancelSpeakerDelivery']) || 0,
            winningOutcome: parseInt(row['Winning outcome'] || row['winningOutcome']) || 0,
            connectivityPercent: uniqueLeadsDialed > 0 ? Number((connectedLeads / uniqueLeadsDialed * 100).toFixed(2)) : 0,
            speakerAlreadyDelivered: parseInt(row['Speaker Already Delivered'] || row['speakerAlreadyDelivered']) || 0
          };
        });

        try {
          const res = await fetch('/api/metrics/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedData)
          });
          if (res.ok) {
            fetchMetrics();
            alert(`Successfully uploaded ${parsedData.length} entries.`);
          }
        } catch (err) {
          console.error('Bulk upload failed:', err);
          alert('Failed to upload data. Please check the file format.');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate derived fields
    const timePerCaller = newEntry.activeCallers && newEntry.activeCallers > 0 
      ? Math.round((newEntry.minutesSpoken || 0) / newEntry.activeCallers) 
      : 0;
    
    const connectivityPercent = newEntry.uniqueLeadsDialed && newEntry.uniqueLeadsDialed > 0
      ? Number(((newEntry.connectedLeads || 0) / newEntry.uniqueLeadsDialed * 100).toFixed(2))
      : 0;

    const entryToSubmit = {
      ...newEntry,
      timePerCaller,
      connectivityPercent
    };

    try {
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryToSubmit)
      });
      if (res.ok) {
        fetchMetrics();
        setShowForm(false);
        // Reset form
        setNewEntry({
          date: format(new Date(), 'yyyy-MM-dd'),
          leadsInflow: 0,
          activeCallers: 0,
          minutesSpoken: 0,
          uniqueLeadsDialed: 0,
          connectedLeads: 0,
          speakerDeliveryConfirmed: 0,
          processCompleted: 0,
          cancelSpeakerDelivery: 0,
          winningOutcome: 0,
          speakerAlreadyDelivered: 0
        });
      }
    } catch (err) {
      console.error('Failed to save metric:', err);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={cn("p-3 rounded-lg", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

  const filteredData = useMemo(() => {
    return data.filter(entry => {
      if (!startDate && !endDate) return true;
      const entryDate = entry.date;
      if (startDate && entryDate < startDate) return false;
      if (endDate && entryDate > endDate) return false;
      return true;
    });
  }, [data, startDate, endDate]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default to reverse chronological if no sort is selected
      sortableItems.reverse();
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const latest = useMemo(() => filteredData[filteredData.length - 1] || {} as MetricEntry, [filteredData]);

  const handleSort = (key: keyof MetricEntry) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold tracking-tight">OpsMetrics Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-200">
              <Upload className="w-4 h-4" />
              Upload CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-600">From:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-600">To:</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filters
            </button>
          )}
          <div className="ml-auto text-sm text-slate-500 font-medium">
            Showing {filteredData.length} of {data.length} entries
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Leads Inflow" 
            value={latest.leadsInflow?.toLocaleString() || 0} 
            icon={TrendingUp} 
            color="bg-blue-500" 
          />
          <StatCard 
            title="Active Callers" 
            value={latest.activeCallers || 0} 
            icon={Users} 
            color="bg-indigo-500" 
          />
          <StatCard 
            title="Minutes Spoken" 
            value={latest.minutesSpoken?.toLocaleString() || 0} 
            icon={Clock} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Connectivity %" 
            value={`${latest.connectivityPercent || 0}%`} 
            icon={Target} 
            color="bg-orange-500" 
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trend Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Performance Trends
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(str) => safeFormatDate(str, 'MMM d')}
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Line type="monotone" dataKey="leadsInflow" name="Leads Inflow" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="connectedLeads" name="Connected Leads" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="winningOutcome" name="Winning Outcome" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delivery Status Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Delivery Outcomes (Latest)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[
                    { name: 'Confirmed', value: latest.speakerDeliveryConfirmed || 0, color: '#10b981' },
                    { name: 'Completed', value: latest.processCompleted || 0, color: '#3b82f6' },
                    { name: 'Already Deliv.', value: latest.speakerAlreadyDelivered || 0, color: '#6366f1' },
                    { name: 'Cancelled', value: latest.cancelSpeakerDelivery || 0, color: '#ef4444' },
                  ]}
                  margin={{ left: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                    {
                      [0,1,2,3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#6366f1', '#ef4444'][index]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Form Overlay */}
        {showForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Add Daily Entry</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Date</label>
                  <input 
                    type="date" 
                    required
                    value={newEntry.date}
                    onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Leads Inflow</label>
                  <input 
                    type="number" 
                    value={newEntry.leadsInflow}
                    onChange={e => setNewEntry({...newEntry, leadsInflow: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Active Callers</label>
                  <input 
                    type="number" 
                    value={newEntry.activeCallers}
                    onChange={e => setNewEntry({...newEntry, activeCallers: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Minutes Spoken</label>
                  <input 
                    type="number" 
                    value={newEntry.minutesSpoken}
                    onChange={e => setNewEntry({...newEntry, minutesSpoken: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Unique Leads Dialed</label>
                  <input 
                    type="number" 
                    value={newEntry.uniqueLeadsDialed}
                    onChange={e => setNewEntry({...newEntry, uniqueLeadsDialed: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Connected Leads</label>
                  <input 
                    type="number" 
                    value={newEntry.connectedLeads}
                    onChange={e => setNewEntry({...newEntry, connectedLeads: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Delivery Confirmed</label>
                  <input 
                    type="number" 
                    value={newEntry.speakerDeliveryConfirmed}
                    onChange={e => setNewEntry({...newEntry, speakerDeliveryConfirmed: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Winning Outcome</label>
                  <input 
                    type="number" 
                    value={newEntry.winningOutcome}
                    onChange={e => setNewEntry({...newEntry, winningOutcome: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-slate-500" />
              Detailed Operations Log
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      Date
                      {sortConfig?.key === 'date' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('leadsInflow')}
                  >
                    <div className="flex items-center gap-1">
                      Leads In
                      {sortConfig?.key === 'leadsInflow' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('activeCallers')}
                  >
                    <div className="flex items-center gap-1">
                      Callers
                      {sortConfig?.key === 'activeCallers' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('minutesSpoken')}
                  >
                    <div className="flex items-center gap-1">
                      Mins
                      {sortConfig?.key === 'minutesSpoken' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">T/Caller</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dialed</th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('connectedLeads')}
                  >
                    <div className="flex items-center gap-1">
                      Connected
                      {sortConfig?.key === 'connectedLeads' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Confirmed</th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('winningOutcome')}
                  >
                    <div className="flex items-center gap-1">
                      Winning
                      {sortConfig?.key === 'winningOutcome' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Conn %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {safeFormatDate(row.date, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.leadsInflow.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.activeCallers}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.minutesSpoken.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{row.timePerCaller}m</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.uniqueLeadsDialed.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{row.connectedLeads.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 font-semibold">{row.speakerDeliveryConfirmed}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{row.winningOutcome}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        row.connectivityPercent > 55 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {row.connectivityPercent}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
