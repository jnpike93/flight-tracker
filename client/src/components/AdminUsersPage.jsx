import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plane,
  Key,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Eye,
  Trash2,
  Plus,
  X,
  ChevronRight,
  Download,
  AlertCircle,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import {
  fetchAdminUsers,
  fetchAdminUserFlights,
  updateAdminUserRole,
  updateAdminUserStatus,
  addAdminUser,
  removeAdminUser,
  deleteAdminUserFlights
} from '../api';

export default function AdminUsersPage({ currentUser, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'auth_and_data' | 'auth_only' | 'data_only' | 'admins' | 'pending'
  const [sortBy, setSortBy] = useState('flights_desc'); // 'flights_desc' | 'miles_desc' | 'last_login' | 'added_at' | 'name_asc'

  // Add User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [addingUser, setAddingUser] = useState(false);
  const [addError, setAddError] = useState(null);

  // User Flight Inspector Modal
  const [inspectingUser, setInspectingUser] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState(null);
  const [inspectFlightSearch, setInspectFlightSearch] = useState('');

  const loadAdminData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await fetchAdminUsers();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load user administration data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Open Flight Inspector for a specific user
  const handleInspectUser = async (user) => {
    setInspectingUser(user);
    setInspectData(null);
    setInspectLoading(true);
    setInspectError(null);
    setInspectFlightSearch('');
    try {
      const details = await fetchAdminUserFlights(user.email);
      setInspectData(details);
    } catch (err) {
      setInspectError(err.message || 'Failed to load flights for this user');
    } finally {
      setInspectLoading(false);
    }
  };

  // Close Flight Inspector
  const handleCloseInspector = () => {
    setInspectingUser(null);
    setInspectData(null);
    setInspectError(null);
  };

  // Add New User to Allowlist
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setAddError('Please enter a valid Google email address');
      return;
    }

    setAddingUser(true);
    setAddError(null);
    try {
      await addAdminUser(newEmail.trim(), newName.trim(), newRole);
      setSuccessMessage(`Successfully granted access to ${newEmail.trim()}`);
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      setIsAddUserOpen(false);
      await loadAdminData(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setAddError(err.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  // Toggle or Update User Role
  const handleRoleToggle = async (user) => {
    if (user.isPrimaryAdmin) {
      alert('The primary system administrator role cannot be modified.');
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin'
      ? `Promote "${user.email}" to Administrator? They will be able to manage users and access permissions.`
      : `Demote "${user.email}" to standard User?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateAdminUserRole(user.email, newRole);
      setSuccessMessage(`Updated role for ${user.email} to ${newRole.toUpperCase()}`);
      await loadAdminData(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert('Failed to update role: ' + err.message);
    }
  };

  // Approve User Access
  const handleApproveUser = async (user) => {
    try {
      await updateAdminUserStatus(user.email, 'approved');
      setSuccessMessage(`Approved access for ${user.email}. They can now sign in.`);
      await loadAdminData(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert('Failed to approve user: ' + err.message);
    }
  };

  // Reject / Decline User Access
  const handleRejectUser = async (user) => {
    if (user.isPrimaryAdmin) {
      alert('The primary system administrator cannot be declined.');
      return;
    }
    if (!window.confirm(`Decline access request for "${user.email}"?`)) return;

    try {
      await updateAdminUserStatus(user.email, 'rejected');
      setSuccessMessage(`Declined access request for ${user.email}`);
      await loadAdminData(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert('Failed to decline user: ' + err.message);
    }
  };

  // Revoke User Access (Delete from database)
  const handleRevokeUser = async (user) => {
    if (user.isPrimaryAdmin) {
      alert('The primary system administrator cannot be revoked.');
      return;
    }
    if (user.email.toLowerCase() === currentUser?.email?.toLowerCase()) {
      alert('You cannot revoke your own account access.');
      return;
    }

    if (!window.confirm(`Revoke and remove "${user.email}" from user records?`)) {
      return;
    }

    try {
      await removeAdminUser(user.email);
      setSuccessMessage(`Removed user record for ${user.email}`);
      await loadAdminData(true);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert('Failed to revoke access: ' + err.message);
    }
  };

  // Purge User Flight Data
  const handlePurgeUserFlights = async (user) => {
    const confirmation = window.prompt(
      `DANGER ZONE: Purge all flight records for "${user.email}"?\n\nType DELETE to confirm permanent erasure:`
    );
    if (confirmation !== 'DELETE') return;

    try {
      const res = await deleteAdminUserFlights(user.email);
      setSuccessMessage(`Purged ${res.deletedFlights} flight records for ${user.email}`);
      if (inspectingUser && inspectingUser.email === user.email) {
        handleInspectUser(user);
      }
      await loadAdminData(true);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      alert('Failed to delete flights: ' + err.message);
    }
  };

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];

    let list = [...data.users];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        u => u.email.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q))
      );
    }

    // Segmented filters
    switch (activeFilter) {
      case 'pending':
        list = list.filter(u => u.status === 'pending');
        break;
      case 'approved':
        list = list.filter(u => u.status === 'approved');
        break;
      case 'auth_and_data':
        list = list.filter(u => u.hasAuthenticated && u.hasData);
        break;
      case 'auth_only':
        list = list.filter(u => u.hasAuthenticated && !u.hasData);
        break;
      case 'data_only':
        list = list.filter(u => !u.hasAuthenticated && u.hasData);
        break;
      case 'admins':
        list = list.filter(u => u.isAdmin);
        break;
      case 'all':
      default:
        break;
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'flights_desc':
          return (b.flightCount || 0) - (a.flightCount || 0);
        case 'miles_desc':
          return (b.totalDistanceMiles || 0) - (a.totalDistanceMiles || 0);
        case 'last_login': {
          const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          return timeB - timeA;
        }
        case 'added_at': {
          const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return timeB - timeA;
        }
        case 'name_asc': {
          const nameA = (a.name || a.email).toLowerCase();
          const nameB = (b.name || b.email).toLowerCase();
          return nameA.localeCompare(nameB);
        }
        default:
          return 0;
      }
    });

    return list;
  }, [data, searchTerm, activeFilter, sortBy]);

  // Formatter for relative date
  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp;

    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDistance = (miles) => {
    if (!miles) return '0 mi';
    return `${Number(miles).toLocaleString()} mi`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation & Subheader */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Flights</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-black tracking-tight text-white m-0">
                    Admin Console
                  </h1>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hidden sm:inline-block">
                    User & Data Directory
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Authenticated users, active accounts, and recorded flight data logbooks
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadAdminData(true)}
              disabled={refreshing}
              title="Refresh Data"
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Grant Access</span>
              <span className="sm:hidden">Grant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1">
        {/* Pending Requests Notification Banner */}
        {data?.summary?.pendingApprovalsCount > 0 && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{data.summary.pendingApprovalsCount} {data.summary.pendingApprovalsCount === 1 ? 'User' : 'Users'} Awaiting Manual Approval</span>
                </div>
                <div className="text-xs text-amber-300/80 mt-0.5">
                  New users who have attempted to log in with Google and are awaiting administrator verification before access is granted.
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveFilter('pending')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-sm shrink-0 active:scale-95"
            >
              Review Pending Requests
            </button>
          </div>
        )}

        {/* Success / Error Alerts */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 text-xs text-rose-300 bg-rose-950/70 border border-rose-500/40 rounded-2xl shadow-lg">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2.5 p-3.5 text-xs text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Aggregate KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Users */}
          <div
            onClick={() => setActiveFilter('all')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? '...' : data?.summary?.totalUsers || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
              <span>Known accounts</span>
            </div>
          </div>

          {/* Pending Approvals (Manual Review Priority) */}
          <div
            onClick={() => setActiveFilter('pending')}
            className={`p-4 rounded-2xl border backdrop-blur-sm relative overflow-hidden group transition cursor-pointer ${
              (data?.summary?.pendingApprovalsCount || 0) > 0
                ? 'bg-amber-950/30 border-amber-500/40 shadow-lg shadow-amber-500/10 hover:border-amber-400'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Pending Review</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono">
              {loading ? '...' : data?.summary?.pendingApprovalsCount || 0}
            </div>
            <div className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1 truncate">
              <span>{(data?.summary?.pendingApprovalsCount || 0) > 0 ? 'Requires approval' : 'All caught up'}</span>
            </div>
          </div>

          {/* Authenticated Users */}
          <div
            onClick={() => setActiveFilter('approved')}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Approved Access</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Key className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {loading ? '...' : data?.summary?.approvedUsersCount || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Authorized users</span>
            </div>
          </div>

          {/* Authenticated AND With Data (The Core Request) */}
          <div
            onClick={() => setActiveFilter('auth_and_data')}
            className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-slate-900/80 border border-cyan-500/40 backdrop-blur-sm relative overflow-hidden shadow-lg shadow-cyan-500/10 cursor-pointer"
          >
            <div className="flex items-center justify-between text-cyan-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auth & With Data</span>
              </span>
              <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1.5">
              <span>{loading ? '...' : data?.summary?.totalAuthenticatedWithData || 0}</span>
              <span className="text-xs font-normal text-cyan-400">
                {data?.summary?.totalUsers
                  ? `${Math.round(((data.summary.totalAuthenticatedWithData || 0) / data.summary.totalUsers) * 100)}%`
                  : ''}
              </span>
            </div>
            <div className="text-[11px] text-cyan-300/80 mt-1 truncate">
              <span>Active users with logbook</span>
            </div>
          </div>

          {/* System Flights & Miles */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">System Flights</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">
              {loading ? '...' : Number(data?.summary?.totalFlightsSystem || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">
              <span>{Number(data?.summary?.totalMilesSystem || 0).toLocaleString()} total mi</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>All Users</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {data?.summary?.totalUsers || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : (data?.summary?.pendingApprovalsCount || 0) > 0
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40 hover:bg-amber-900/50'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>Pending Approval</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                {data?.summary?.pendingApprovalsCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === 'approved'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Approved</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {data?.summary?.approvedUsersCount || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('auth_and_data')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === 'auth_and_data'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Auth & With Data</span>
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                {data?.summary?.totalAuthenticatedWithData || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('data_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === 'data_only'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>Data Only</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {data ? data.summary.totalWithData - data.summary.totalAuthenticatedWithData : 0}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('admins')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeFilter === 'admins'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Shield className="w-3 h-3 text-cyan-400" />
              <span>Admins</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
                {data?.summary?.totalAdmins || 0}
              </span>
            </button>
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="flights_desc">Most Flights</option>
              <option value="miles_desc">Most Miles</option>
              <option value="last_login">Most Recent Login</option>
              <option value="added_at">Date Added</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Authentication</th>
                  <th className="py-3.5 px-4">Application Data</th>
                  <th className="py-3.5 px-4">Status & Role</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-mono">Loading user directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-600" />
                        <span className="text-sm font-semibold text-slate-400">No matching users found</span>
                        <span className="text-xs text-slate-500">Try adjusting your search query or filter tab.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = currentUser && currentUser.email?.toLowerCase() === user.email.toLowerCase();

                    return (
                      <tr
                        key={user.email}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* User Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {user.picture ? (
                              <img
                                src={user.picture}
                                alt={user.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0">
                                {(user.name || user.email)[0].toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white truncate text-xs">
                                  {user.name || user.email.split('@')[0]}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                                    You
                                  </span>
                                )}
                                {user.isPrimaryAdmin && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold uppercase">
                                    Primary Admin
                                  </span>
                                )}
                                {!user.isPrimaryAdmin && user.isAdmin && (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono font-bold uppercase">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">
                                {user.email}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Added {user.addedAt ? formatRelativeTime(user.addedAt) : 'via import'} • by {user.addedBy || 'system'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Authentication Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {user.hasAuthenticated ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Authenticated</span>
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {user.loginCount || 1} {user.loginCount === 1 ? 'login' : 'logins'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>Last seen: {formatRelativeTime(user.lastLogin)}</span>
                              </div>
                              {user.lastLoginMethod && (
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                                  Method: {user.lastLoginMethod}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 text-[10px] font-medium">
                                <XCircle className="w-3 h-3 text-slate-500" />
                                <span>Never Logged In</span>
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Pending first sign-in
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Application Data (Flights) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {user.hasData ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                                  <Plane className="w-3 h-3 text-cyan-400" />
                                  <span>{user.flightCount} {user.flightCount === 1 ? 'Flight' : 'Flights'}</span>
                                </span>
                                <span className="text-[11px] font-mono text-slate-300 font-semibold">
                                  {formatDistance(user.totalDistanceMiles)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span>{user.uniqueAirports || 0} airports</span>
                                <span>•</span>
                                <span>{user.uniqueAirlines || 0} airlines</span>
                              </div>
                              {user.earliestFlightDate && (
                                <div className="text-[10px] text-slate-500">
                                  Span: {user.earliestFlightDate.slice(0, 4)} — {user.latestFlightDate ? user.latestFlightDate.slice(0, 4) : 'present'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 text-[10px] font-medium">
                                <span>No flights recorded</span>
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5">Empty logbook</div>
                            </div>
                          )}
                        </td>

                        {/* Approval Status & Role */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1.5">
                            {/* Approval Status Badge */}
                            <div>
                              {user.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Approved</span>
                                </span>
                              ) : user.status === 'pending' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Pending Approval</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  <span>Declined</span>
                                </span>
                              )}
                            </div>

                            {/* User Role */}
                            <div>
                              {user.isAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-semibold">
                                  <ShieldCheck className="w-2.5 h-2.5 text-purple-400" />
                                  <span>Administrator</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Standard User
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If Pending: Quick 1-Click Approve / Decline */}
                            {user.status === 'pending' && (
                              <button
                                onClick={() => handleApproveUser(user)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-500/20 transition active:scale-95"
                                title="Approve user for immediate application access"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Approve</span>
                              </button>
                            )}
                            {user.status === 'pending' && !user.isPrimaryAdmin && (
                              <button
                                onClick={() => handleRejectUser(user)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition"
                                title="Decline access request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* If Rejected: Can Re-Approve */}
                            {user.status === 'rejected' && (
                              <button
                                onClick={() => handleApproveUser(user)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-950 text-emerald-400 border border-slate-700 flex items-center gap-1 text-[11px] font-semibold transition"
                                title="Re-approve access"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* Inspect Flights CTA */}
                            <button
                              onClick={() => handleInspectUser(user)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 flex items-center gap-1 text-[11px] font-semibold transition"
                              title="Inspect User Flights & Analytics"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect</span>
                            </button>

                            {/* If Approved: Option to Suspend / Revoke */}
                            {user.status === 'approved' && !user.isPrimaryAdmin && !isSelf && (
                              <button
                                onClick={() => handleRejectUser(user)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition"
                                title="Suspend Access (Set to Declined)"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Toggle Role (Admin only, not primary admin) */}
                            {!user.isPrimaryAdmin && (
                              <button
                                onClick={() => handleRoleToggle(user)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition"
                                title={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete User */}
                            {!user.isPrimaryAdmin && !isSelf && (
                              <button
                                onClick={() => handleRevokeUser(user)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="Permanently delete user record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL 1: Grant Access / Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Grant Application Access</h3>
                  <p className="text-[11px] text-slate-400">Add an authorized Google account</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="p-3 text-xs text-rose-300 bg-rose-950/70 border border-rose-500/30 rounded-xl">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Google Account Email *
                </label>
                <input
                  type="email"
                  placeholder="e.g. pilot@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  User Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Captain Miller"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Application Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="user">Standard User (Personal Flight Logbook)</option>
                  <option value="admin">Administrator (Full System & User Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-md shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {addingUser ? 'Granting Access...' : 'Authorize User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: User Flight & Data Inspector Drawer */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Inspector Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {inspectingUser.picture ? (
                  <img
                    src={inspectingUser.picture}
                    alt={inspectingUser.name}
                    className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-sm">
                    {(inspectingUser.name || inspectingUser.email)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      {inspectingUser.name || inspectingUser.email.split('@')[0]}
                    </h2>
                    {inspectingUser.isAdmin && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-mono font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">{inspectingUser.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {inspectData?.flights?.length > 0 && (
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inspectData.flights, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `flights_${inspectingUser.email}_export.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition"
                    title="Export flights as JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export JSON</span>
                  </button>
                )}

                <button
                  onClick={handleCloseInspector}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inspector Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {inspectLoading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono">Retrieving user flights and aviation records...</span>
                </div>
              ) : inspectError ? (
                <div className="p-4 text-xs text-rose-300 bg-rose-950/70 border border-rose-500/30 rounded-2xl">
                  {inspectError}
                </div>
              ) : (
                <>
                  {/* User Stats Overview Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Flights</div>
                      <div className="text-xl font-black text-cyan-400 font-mono mt-1">
                        {inspectData?.stats?.totalFlights || 0}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</div>
                      <div className="text-xl font-black text-white font-mono mt-1">
                        {formatDistance(inspectData?.stats?.totalMiles || 0)}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Airports Visited</div>
                      <div className="text-xl font-black text-purple-400 font-mono mt-1">
                        {inspectData?.stats?.topAirports?.length || 0}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Airlines Flown</div>
                      <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                        {inspectData?.stats?.topAirlines?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* Top Routes & Airlines Summary */}
                  {(inspectData?.stats?.topAirports?.length > 0 || inspectData?.stats?.topAirlines?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Top Airports */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Top Airport Hubs</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {inspectData.stats.topAirports.slice(0, 5).map((a) => (
                            <div key={a.iata} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60">
                              <span className="font-mono font-bold text-cyan-300">{a.iata}</span>
                              <span className="text-slate-400 text-[11px] truncate mx-2">{a.city || a.name}</span>
                              <span className="text-slate-500 font-mono text-[10px]">{a.visits} visits</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Airlines */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                        <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                          <Plane className="w-3.5 h-3.5 text-blue-400" />
                          <span>Top Airlines Flown</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {inspectData.stats.topAirlines.slice(0, 5).map((al) => (
                            <div key={al.airline} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900/60">
                              <span className="font-semibold text-white truncate">{al.airline}</span>
                              <span className="text-slate-400 font-mono text-[11px] ml-2 shrink-0">{al.count} flights</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Flight Records Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Logged Flights ({inspectData?.flights?.length || 0})</span>
                      </div>

                      {/* Inner flight search */}
                      {inspectData?.flights?.length > 0 && (
                        <div className="relative w-full sm:w-64">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter user's flights..."
                            value={inspectFlightSearch}
                            onChange={(e) => setInspectFlightSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      )}
                    </div>

                    {inspectData?.flights?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                        This user does not have any flight records in the database.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40 max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0 z-10">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Flight</th>
                              <th className="py-2.5 px-3">Airline</th>
                              <th className="py-2.5 px-3">Route</th>
                              <th className="py-2.5 px-3 text-right">Distance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {inspectData.flights
                              .filter((f) => {
                                if (!inspectFlightSearch.trim()) return true;
                                const q = inspectFlightSearch.trim().toLowerCase();
                                return (
                                  (f.flight_number && f.flight_number.toLowerCase().includes(q)) ||
                                  (f.airline && f.airline.toLowerCase().includes(q)) ||
                                  (f.origin_iata && f.origin_iata.toLowerCase().includes(q)) ||
                                  (f.dest_iata && f.dest_iata.toLowerCase().includes(q)) ||
                                  (f.origin_city && f.origin_city.toLowerCase().includes(q)) ||
                                  (f.dest_city && f.dest_city.toLowerCase().includes(q)) ||
                                  (f.date && f.date.includes(q))
                                );
                              })
                              .map((f) => (
                                <tr key={f.id} className="hover:bg-slate-800/30 transition">
                                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                    {f.date}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold text-white whitespace-nowrap">
                                    {f.flight_number || '—'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 truncate max-w-[140px]">
                                    {f.airline}
                                  </td>
                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1 font-mono">
                                      <span className="font-bold text-cyan-300">{f.origin_iata}</span>
                                      <span className="text-slate-500">→</span>
                                      <span className="font-bold text-cyan-300">{f.dest_iata}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                      {f.origin_city} to {f.dest_city}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                    {Number(f.distance_miles || 0).toLocaleString()} mi
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone: GDPR User Flight Data Purge */}
                  {inspectData?.flights?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/30 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>GDPR & Privacy Purge</span>
                        </div>
                        <p className="text-[11px] text-rose-400/80 mt-0.5">
                          Permanently delete all {inspectData.flights.length} flight records belonging to this user account.
                        </p>
                      </div>
                      <button
                        onClick={() => handlePurgeUserFlights(inspectingUser)}
                        className="px-3 py-1.5 rounded-xl bg-rose-900/40 hover:bg-rose-900/70 border border-rose-500/40 text-rose-300 hover:text-white text-xs font-bold transition shrink-0"
                      >
                        Purge Flights
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Inspector Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                User Record ID: {inspectingUser.email}
              </span>
              <button
                onClick={handleCloseInspector}
                className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

