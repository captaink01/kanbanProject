exports.createProject = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    try {
        const result = await req.db.query(
            'INSERT INTO projects (name, user_id) VALUES ($1, $2) RETURNING *',
            [name, req.user.userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.getProjects = async (req, res) => {
    try {
        const result = await req.db.query(
            'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.getProject = async (req, res) => {
    try {
        const result = await req.db.query(
            'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.updateProject = async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    try {
        const result = await req.db.query(
            'UPDATE projects SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [name, req.params.id, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.deleteProject = async (req, res) => {
    try {
        const result = await req.db.query(
            'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, req.user.userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};