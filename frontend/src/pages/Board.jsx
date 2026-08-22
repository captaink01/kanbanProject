import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';

const Board = () => {
    const { projectId } = useParams();
    const [lists, setLists] = useState([]);
    const [tasks, setTasks] = useState({});
    const [projectName, setProjectName] = useState('');
    const [newListTitle, setNewListTitle] = useState('');
    const [showAddList, setShowAddList] = useState(false);
    const [newTaskContent, setNewTaskContent] = useState({}); // key: listId, value: content
    const [editingTask, setEditingTask] = useState(null); // { taskId, listId, content }

    // Fetch board
    useEffect(() => {
        fetchBoard();
    }, [projectId]);

    const fetchBoard = async () => {
        try {
            const projectRes = await api.get(`/projects/${projectId}`);
            setProjectName(projectRes.data.name);

            const listsRes = await api.get(`/projects/${projectId}/lists`);
            setLists(listsRes.data);

            const tasksMap = {};
            for (const list of listsRes.data) {
                const tasksRes = await api.get(`/lists/${list.id}/tasks`);
                tasksMap[list.id] = tasksRes.data;
            }
            setTasks(tasksMap);
        } catch (err) {
            console.error('Failed to load board', err);
        }
    };

    // Add list
    const handleAddList = async (e) => {
        e.preventDefault();
        if (!newListTitle.trim()) return;
        try {
            const { data } = await api.post(`/projects/${projectId}/lists`, { title: newListTitle });
            setLists([...lists, data]);
            setTasks({ ...tasks, [data.id]: [] });
            setNewListTitle('');
            setShowAddList(false);
        } catch (err) {
            alert('Failed to create list');
        }
    };

    // Add task to a specific list
    const handleAddTask = async (e, listId) => {
        e.preventDefault();
        const content = newTaskContent[listId] || '';
        if (!content.trim()) return;
        try {
            const { data } = await api.post(`/lists/${listId}/tasks`, { content });
            setTasks({ ...tasks, [listId]: [...tasks[listId], data] });
            setNewTaskContent({ ...newTaskContent, [listId]: '' });
        } catch (err) {
            alert('Failed to add task');
        }
    };

    // Delete list
    const handleDeleteList = async (listId) => {
        if (!window.confirm('Delete this list and all its tasks?')) return;
        try {
            await api.delete(`/projects/${projectId}/lists/${listId}`);
            setLists(lists.filter((l) => l.id !== listId));
            const newTasks = { ...tasks };
            delete newTasks[listId];
            setTasks(newTasks);
        } catch (err) {
            alert('Failed to delete list');
        }
    };

    // Delete task
    const handleDeleteTask = async (listId, taskId) => {
        try {
            await api.delete(`/lists/${listId}/tasks/${taskId}`);
            setTasks({
                ...tasks,
                [listId]: tasks[listId].filter((t) => t.id !== taskId),
            });
        } catch (err) {
            alert('Failed to delete task');
        }
    };

    // Start editing a task inline
    const startEditTask = (task, listId) => {
        setEditingTask({ taskId: task.id, listId, content: task.content });
    };

    // Save edited task
    const saveEditTask = async () => {
        if (!editingTask) return;
        const { taskId, listId, content } = editingTask;
        try {
            await api.put(`/lists/${listId}/tasks/${taskId}`, { content });
            setTasks({
                ...tasks,
                [listId]: tasks[listId].map((t) =>
                    t.id === taskId ? { ...t, content } : t
                ),
            });
            setEditingTask(null);
        } catch (err) {
            alert('Failed to update task');
        }
    };

    // Drag & drop
    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceListId = source.droppableId;
        const destListId = destination.droppableId;
        const taskId = draggableId;

        // Optimistic update
        const newTasks = { ...tasks };
        const sourceTasks = [...newTasks[sourceListId]];
        const [movedTask] = sourceTasks.splice(source.index, 1);
        newTasks[sourceListId] = sourceTasks;
        const destTasks = [...(newTasks[destListId] || [])];
        destTasks.splice(destination.index, 0, movedTask);
        newTasks[destListId] = destTasks;
        setTasks(newTasks);

        try {
            await api.patch(`/lists/${sourceListId}/tasks/${taskId}/move`, {
                listId: destListId,
                position: destination.index,
            });
        } catch (err) {
            console.error('Move failed', err);
            fetchBoard(); // rollback
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-blue-50 to-indigo-100">
            <nav className="bg-white shadow-sm p-4 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800">{projectName}</h1>
            </nav>

            <div className="p-6">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-6 overflow-x-auto pb-4">
                        {lists.map((list) => (
                            <div
                                key={list.id}
                                className="flex-shrink-0 w-72 bg-gray-100 rounded-lg shadow-md flex flex-col max-h-[calc(100vh-150px)]"
                            >
                                {/* List header */}
                                <div className="p-3 flex justify-between items-center border-b border-gray-200">
                                    <h2 className="font-semibold text-gray-700">{list.title}</h2>
                                    <button
                                        onClick={() => handleDeleteList(list.id)}
                                        className="text-gray-400 hover:text-red-500"
                                        title="Delete list"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Tasks droppable area */}
                                <Droppable droppableId={list.id}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="p-2 flex-1 overflow-y-auto min-h-[50px]"
                                        >
                                            {tasks[list.id]?.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className="bg-white p-3 mb-2 rounded shadow-sm border border-gray-200 group hover:shadow-md transition-shadow"
                                                            onDoubleClick={() => startEditTask(task, list.id)}
                                                        >
                                                            {editingTask && editingTask.taskId === task.id ? (
                                                                <div className="flex gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={editingTask.content}
                                                                        onChange={(e) =>
                                                                            setEditingTask({ ...editingTask, content: e.target.value })
                                                                        }
                                                                        className="flex-1 px-2 py-1 text-sm border rounded"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') saveEditTask();
                                                                            if (e.key === 'Escape') setEditingTask(null);
                                                                        }}
                                                                    />
                                                                    <button onClick={saveEditTask} className="text-green-500 hover:text-green-700">✓</button>
                                                                    <button onClick={() => setEditingTask(null)} className="text-red-500 hover:text-red-700">✕</button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-between items-start">
                                                                    <span className="text-sm text-gray-800 whitespace-pre-wrap break-words">{task.content}</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteTask(list.id, task.id);
                                                                        }}
                                                                        className="text-gray-400 hover:text-red-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>

                                {/* Add task form at bottom of list */}
                                <div className="p-2 border-t border-gray-200">
                                    <form onSubmit={(e) => handleAddTask(e, list.id)} className="flex gap-1">
                                        <input
                                            type="text"
                                            placeholder="Add a task..."
                                            value={newTaskContent[list.id] || ''}
                                            onChange={(e) =>
                                                setNewTaskContent({ ...newTaskContent, [list.id]: e.target.value })
                                            }
                                            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                        />
                                        <button
                                            type="submit"
                                            className="px-2 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
                                        >
                                            Add
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}

                        {/* Add new list column */}
                        <div className="flex-shrink-0 w-72">
                            {!showAddList ? (
                                <button
                                    onClick={() => setShowAddList(true)}
                                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg p-3 text-left transition-colors"
                                >
                                    + Add another list
                                </button>
                            ) : (
                                <div className="bg-gray-100 rounded-lg p-3">
                                    <form onSubmit={handleAddList}>
                                        <input
                                            type="text"
                                            placeholder="Enter list title..."
                                            value={newListTitle}
                                            onChange={(e) => setNewListTitle(e.target.value)}
                                            className="w-full px-2 py-1 text-sm border rounded mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="px-3 py-1 bg-indigo-500 text-white rounded text-sm hover:bg-indigo-600"
                                            >
                                                Add List
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddList(false)}
                                                className="px-3 py-1 text-gray-600 hover:text-gray-800"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
};

export default Board;