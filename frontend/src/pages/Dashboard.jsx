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

    if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
                    <h1 className="text-xl font-bold text-gray-900">My Projects</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{user?.email}</span>
                        <button
                            onClick={logout}
                            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <form onSubmit={handleCreate} className="flex gap-2 mb-8">
                    <input
                        type="text"
                        placeholder="New project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                    <button
                        type="submit"
                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        Create Project
                    </button>
                </form>

                {projects.length === 0 ? (
                    <div className="text-center text-gray-500 mt-12">No projects yet. Create one above.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <div key={project.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                                <div className="p-6">
                                    <Link to={`/projects/${project.id}`} className="block">
                                        <h2 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 truncate">
                                            {project.name}
                                        </h2>
                                        <p className="mt-2 text-sm text-gray-500">
                                            Created {new Date(project.created_at).toLocaleDateString()}
                                        </p>
                                    </Link>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={() => handleDelete(project.id)}
                                            className="text-sm text-red-600 hover:text-red-800"
                                        >
                                            Delete
                                        </button>
                                    </div>
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