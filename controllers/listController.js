exports.createList = async (req, res) => {
    const { title } = req.body;
    const { projectId } = req.params;
    if (!title) return res.status(400).json({ error: 'List title is required' });

    try {
        // Verify project ownership
        const project = await req.db.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.userId]
        );
        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Determine next position
        const maxPos = await req.db.query(
            'SELECT COALESCE(MAX(position), -1) AS max_pos FROM lists WHERE project_id = $1',
            [projectId]
        );
        const nextPosition = maxPos.rows[0].max_pos + 1;

        const result = await req.db.query(
            'INSERT INTO lists (title, position, project_id) VALUES ($1, $2, $3) RETURNING *',
            [title, nextPosition, projectId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};



exports.getLists = async (req, res) => {
    const { projectId } = req.params;
    try {
        const project = await req.db.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.userId]
        );
        if (project.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const lists = await req.db.query(
            'SELECT * FROM lists WHERE project_id = $1 ORDER BY position',
            [projectId]
        );
        res.json(lists.rows);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};



exports.updateList = async (req, res) => {
    const { title } = req.body;
    const { projectId, listId } = req.params;
    if (!title) return res.status(400).json({ error: 'List title is required' });

    try {
        // Verify project ownership
        const project = await req.db.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.userId]
        );
        if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        const result = await req.db.query(
            'UPDATE lists SET title = $1 WHERE id = $2 AND project_id = $3 RETURNING *',
            [title, listId, projectId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'List not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.deleteList = async (req, res) => {
    const { projectId, listId } = req.params;
    try {
        const project = await req.db.query(
            'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
            [projectId, req.user.userId]
        );
        if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

        const result = await req.db.query(
            'DELETE FROM lists WHERE id = $1 AND project_id = $2 RETURNING *',
            [listId, projectId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'List not found' });
        res.json({ message: 'List deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};


