import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState([]);
    const [newProjectName, setNewProjectName] = useState('');

    useEffect(() => {
        const fetchProjects = async () => {
            const { data } = await api.get('/projects');
            setProjects(data);
        };
        fetchProjects();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        const { data } = await api.post('/projects', { name: newProjectName });
        setProjects([data, ...projects]);
        setNewProjectName('');
    };

    return (
        <div>
            <header>
                <h1>My Projects</h1>
                <p>Logged in as: {user?.email} <button onClick={logout}>Logout</button></p>
            </header>

            <form onSubmit={handleCreate}>
                <input
                    type="text"
                    placeholder="New project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    required
                />
                <button type="submit">Create Project</button>
            </form>

            <ul>
                {projects.map((project) => (
                    <li key={project.id}>
                        <Link to={`/projects/${project.id}`}>{project.name}</Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;