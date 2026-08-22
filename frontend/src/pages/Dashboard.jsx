import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchProjects = async () => {
        try {
            const { data } = await api.get('/projects');
            setProjects(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        try {
            const { data } = await api.post('/projects', { name: newProjectName });
            setProjects([data, ...projects]);
            setNewProjectName('');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create project');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this project and all its data?')) return;
        try {
            await api.delete(`/projects/${id}`);
            setProjects(projects.filter((p) => p.id !== id));
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-fuchsia-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">Loading projects...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative bg-slate-950 overflow-x-hidden">
            <div className="absolute top-0 left-1/4 w-[36rem] h-[36rem] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-40 right-0 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[size:28px_28px] pointer-events-none" />

            {/* Navbar */}
            <nav className="sticky top-0 z-20 bg-slate-950/70 backdrop-blur-2xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 h-18 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/20 rotate-3">
                            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white">Projects</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2.5 pr-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-[11px] font-semibold text-white">
                                {initials}
                            </div>
                            <span className="text-sm text-slate-400">{user?.email}</span>
                        </div>
                        <button
                            onClick={logout}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-200"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
                {/* Create project */}
                <form onSubmit={handleCreate} className="mb-12">
                    <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
                        <input
                            type="text"
                            placeholder="Name your new project..."
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="flex-1 px-5 py-3.5 bg-white/[0.04] border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/30 focus:border-fuchsia-400/30 transition-all backdrop-blur-xl"
                            required
                        />
                        <button
                            type="submit"
                            className="px-6 py-3.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-semibold rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-fuchsia-500/20 whitespace-nowrap"
                        >
                            + Create Project
                        </button>
                    </div>
                </form>

                {/* Projects grid */}
                {projects.length === 0 ? (
                    <div className="text-center py-28">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center backdrop-blur-xl">
                            <svg className="w-9 h-9 text-fuchsia-300/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-1.5">No projects yet</h3>
                        <p className="text-sm text-slate-500">Create your first project above to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                className="group relative bg-white/[0.04] backdrop-blur-xl rounded-[24px] border border-white/10 hover:border-fuchsia-400/30 hover:bg-white/[0.06] transition-all duration-300 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 to-cyan-500/0 group-hover:from-fuchsia-500/[0.06] group-hover:to-cyan-500/[0.06] transition-all duration-300 pointer-events-none" />

                                <Link to={`/projects/${project.id}`} className="block p-6 relative">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h2 className="text-[17px] font-semibold text-white group-hover:text-fuchsia-200 transition-colors truncate">
                                                {project.name}
                                            </h2>
                                            <p className="mt-1.5 text-sm text-slate-500">
                                                Created {new Date(project.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 text-fuchsia-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>

                                <div className="px-6 pb-5 flex justify-end relative">
                                    <button
                                        onClick={() => handleDelete(project.id)}
                                        className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;