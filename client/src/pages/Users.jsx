import { useState, useEffect } from 'react';
import { User, Trash2, Shield, Calendar, Music, ListMusic, Loader2, Search } from 'lucide-react';
import { userAPI } from '../lib/api';
import { cn } from '../lib/utils';
import ConfirmModal from '../components/ConfirmModal';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userAPI.getAll();
      setUsers(res.data.users);
    } catch (err) {
      setError('Failed to load users. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      setDeleting(true);
      await userAPI.delete(deleteUserId);
      setUsers(users.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Manage your community and member permissions.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden shadow-xl border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">User</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Role</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Stats</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Joined</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.username}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      u.isAdmin ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-white/10 text-[hsl(var(--muted-foreground))] border border-white/10"
                    )}>
                      {u.isAdmin ? <Shield size={10} /> : <User size={10} />}
                      {u.isAdmin ? 'Admin' : 'Member'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 text-[hsl(var(--muted-foreground))]">
                      <div className="flex items-center gap-1.5" title="Songs Uploaded">
                        <Music size={14} />
                        <span className="text-xs font-medium">{u.songCount}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Playlists Created">
                        <ListMusic size={14} />
                        <span className="text-xs font-medium">{u.playlistCount}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-[hsl(var(--muted-foreground))]">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeleteUserId(u.id)}
                      disabled={u.isAdmin && u.email === 'yashan2003@test.com'}
                      className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-0 pointer-events-auto"
                      title="Delete User"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">
            No users found matching your search.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteUserId !== null}
        onClose={() => setDeleteUserId(null)}
        onConfirm={handleDelete}
        title="Delete User?"
        message="This action is permanent. All of the user's uploaded songs and playlists will be deleted as well."
        confirmText="Delete User"
        loading={deleting}
        isDestructive
      />
    </div>
  );
}
