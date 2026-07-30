// controllers/taskController.js

exports.createTask = async (req, res) => {
    const { content } = req.body;
    const { listId } = req.params;
    if (!content) return res.status(400).json({ error: 'Task content is required' });

    try {
        // Verify the list belongs to the user
        const listCheck = await req.db.query(
            `SELECT l.id FROM lists l
             JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND p.user_id = $2`,
            [listId, req.user.userId]
        );
        if (listCheck.rows.length === 0) return res.status(404).json({ error: 'List not found' });

        // Determine next position
        const maxPos = await req.db.query(
            'SELECT COALESCE(MAX(position), -1) AS max_pos FROM tasks WHERE list_id = $1',
            [listId]
        );
        const nextPos = maxPos.rows[0].max_pos + 1;

        const result = await req.db.query(
            'INSERT INTO tasks (content, position, list_id) VALUES ($1, $2, $3) RETURNING *',
            [content, nextPos, listId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getTasks = async (req, res) => {
    const { listId } = req.params;
    try {
        const listCheck = await req.db.query(
            `SELECT l.id FROM lists l
             JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND p.user_id = $2`,
            [listId, req.user.userId]
        );
        if (listCheck.rows.length === 0) return res.status(404).json({ error: 'List not found' });

        const tasks = await req.db.query(
            'SELECT * FROM tasks WHERE list_id = $1 ORDER BY position',
            [listId]
        );
        res.json(tasks.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateTask = async (req, res) => {
    const { content } = req.body;
    const { listId, taskId } = req.params;
    if (!content) return res.status(400).json({ error: 'Content is required' });

    try {
        const listCheck = await req.db.query(
            `SELECT l.id FROM lists l
             JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND p.user_id = $2`,
            [listId, req.user.userId]
        );
        if (listCheck.rows.length === 0) return res.status(404).json({ error: 'List not found' });

        const result = await req.db.query(
            'UPDATE tasks SET content = $1 WHERE id = $2 AND list_id = $3 RETURNING *',
            [content, taskId, listId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteTask = async (req, res) => {
    const { listId, taskId } = req.params;
    try {
        const listCheck = await req.db.query(
            `SELECT l.id FROM lists l
             JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND p.user_id = $2`,
            [listId, req.user.userId]
        );
        if (listCheck.rows.length === 0) return res.status(404).json({ error: 'List not found' });

        const result = await req.db.query(
            'DELETE FROM tasks WHERE id = $1 AND list_id = $2 RETURNING *',
            [taskId, listId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.moveTask = async (req, res) => {
    const { taskId } = req.params;
    const { listId, position } = req.body;
    if (listId === undefined || position === undefined) {
        return res.status(400).json({ error: 'listId and position are required' });
    }

    try {
        // Verify the task exists and belongs to user (via project)
        const taskCheck = await req.db.query(
            `SELECT t.id, t.list_id, t.position FROM tasks t
             JOIN lists l ON t.list_id = l.id
             JOIN projects p ON l.project_id = p.id
             WHERE t.id = $1 AND p.user_id = $2`,
            [taskId, req.user.userId]
        );
        if (taskCheck.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

        // Verify target list belongs to user
        const targetListCheck = await req.db.query(
            `SELECT l.id FROM lists l
             JOIN projects p ON l.project_id = p.id
             WHERE l.id = $1 AND p.user_id = $2`,
            [listId, req.user.userId]
        );
        if (targetListCheck.rows.length === 0) return res.status(404).json({ error: 'Target list not found' });

        const oldListId = taskCheck.rows[0].list_id;
        const oldPosition = taskCheck.rows[0].position;
        const newPosition = parseInt(position, 10);

        // Start transaction for consistency
        await req.db.query('BEGIN');

        // 1. Remove from old list: decrement positions after old position
        await req.db.query(
            'UPDATE tasks SET position = position - 1 WHERE list_id = $1 AND position > $2',
            [oldListId, oldPosition]
        );

        // 2. In target list, make room: increment positions >= new position
        await req.db.query(
            'UPDATE tasks SET position = position + 1 WHERE list_id = $1 AND position >= $2',
            [listId, newPosition]
        );

        // 3. Move the task
        const result = await req.db.query(
            'UPDATE tasks SET list_id = $1, position = $2 WHERE id = $3 RETURNING *',
            [listId, newPosition, taskId]
        );

        await req.db.query('COMMIT');

        res.json(result.rows[0]);
    } catch (err) {
        await req.db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};