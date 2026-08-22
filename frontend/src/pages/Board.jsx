import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';

// Renders the dragged card into document.body so it's never clipped
// or hidden behind sibling list columns while it's being moved.
const DraggablePortal = ({ isDragging, children }) => {
    if (!isDragging) return children;
    return ReactDOM.createPortal(children, document.body);
};

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
        <div className="min-h-screen relative bg-slate-950">
            <div className="absolute top-0 left-1/3 w-[34rem] h-[34rem] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.05)_1px,_transparent_0)] bg-[size:28px_28px] pointer-events-none" />

            {/* Top bar */}
            <nav className="sticky top-0 z-20 bg-slate-950/70 backdrop-blur-2xl border-b border-white/5">
                <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center gap-4">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all duration-200 text-sm shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </Link>

                    <div className="w-px h-6 bg-white/10 shrink-0" />

                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-fuchsia-500/20">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white truncate">{projectName}</h1>
                    </div>
                </div>
            </nav>

            <div className="p-6 max-w-[1600px] mx-auto relative z-10">
                <DragDropContext onDragEnd={onDragEnd}>
                    {/* Lists now WRAP onto new rows instead of forcing horizontal scroll */}
                    <div className="flex flex-wrap gap-5">
                        {lists.map((list) => (
                            <div
                                key={list.id}
                                className="w-full sm:w-[19rem] bg-white/[0.04] backdrop-blur-xl rounded-[24px] border border-white/10 flex flex-col max-h-[calc(100vh-140px)]"
                            >
                                {/* List header */}
                                <div className="px-4 py-4 flex justify-between items-center border-b border-white/5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400 shrink-0" />
                                        <h2 className="font-semibold text-white text-[15px] tracking-tight truncate">{list.title}</h2>
                                        <span className="text-xs text-slate-500 shrink-0">{tasks[list.id]?.length ?? 0}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteList(list.id)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                                        title="Delete list"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Add task — now at the TOP, always visible, no scrolling to reach it */}
                                <div className="p-3 border-b border-white/5">
                                    <form onSubmit={(e) => handleAddTask(e, list.id)} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Add a task..."
                                            value={newTaskContent[list.id] || ''}
                                            onChange={(e) =>
                                                setNewTaskContent({ ...newTaskContent, [list.id]: e.target.value })
                                            }
                                            className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400/30 focus:border-fuchsia-400/30 transition-all placeholder:text-slate-500"
                                        />
                                        <button
                                            type="submit"
                                            className="px-3.5 py-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:brightness-110 active:scale-[0.97] transition-all shrink-0"
                                        >
                                            +
                                        </button>
                                    </form>
                                </div>

                                {/* Tasks droppable area */}
                                <Droppable droppableId={list.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`p-3 flex-1 overflow-y-auto min-h-[80px] space-y-2.5 transition-colors duration-200 rounded-b-[24px] ${
                                                snapshot.isDraggingOver ? 'bg-fuchsia-500/[0.06]' : ''
                                            }`}
                                        >
                                            {tasks[list.id]?.map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <DraggablePortal isDragging={snapshot.isDragging}>
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    transform: snapshot.isDragging
                                                                        ? `${provided.draggableProps.style?.transform || ''} rotate(3deg)`
                                                                        : provided.draggableProps.style?.transform,
                                                                }}
                                                                className={`bg-white/[0.06] p-3.5 rounded-2xl border group transition-shadow duration-150 cursor-grab active:cursor-grabbing ${
                                                                    snapshot.isDragging
                                                                        ? 'shadow-2xl shadow-black/50 border-fuchsia-400/40 bg-white/10 scale-[1.03]'
                                                                        : 'border-white/10 hover:border-fuchsia-400/20 hover:bg-white/[0.08]'
                                                                }`}
                                                                onDoubleClick={() => startEditTask(task, list.id)}
                                                            >
                                                                {editingTask && editingTask.taskId === task.id ? (
                                                                    <div className="flex gap-1.5 items-center">
                                                                        <input
                                                                            type="text"
                                                                            value={editingTask.content}
                                                                            onChange={(e) =>
                                                                                setEditingTask({ ...editingTask, content: e.target.value })
                                                                            }
                                                                            className="flex-1 px-2.5 py-1.5 text-sm bg-white/5 border border-fuchsia-400/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
                                                                            autoFocus
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') saveEditTask();
                                                                                if (e.key === 'Escape') setEditingTask(null);
                                                                            }}
                                                                        />
                                                                        <button onClick={saveEditTask} className="p-1.5 rounded-md text-emerald-400 hover:bg-emerald-500/10 transition-colors">✓</button>
                                                                        <button onClick={() => setEditingTask(null)} className="p-1.5 rounded-md text-slate-400 hover:bg-white/5 transition-colors">✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <span className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{task.content}</span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteTask(list.id, task.id);
                                                                            }}
                                                                            className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </DraggablePortal>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}

                        {/* Add new list */}
                        <div className="w-full sm:w-[19rem]">
                            {!showAddList ? (
                                <button
                                    onClick={() => setShowAddList(true)}
                                    className="w-full h-14 bg-white/[0.03] hover:bg-white/[0.06] border border-dashed border-white/15 hover:border-fuchsia-400/30 text-slate-400 hover:text-fuchsia-200 rounded-[24px] flex items-center justify-center gap-2 transition-all duration-200 group"
                                >
                                    <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="text-sm font-medium">Add another list</span>
                                </button>
                            ) : (
                                <div className="bg-white/[0.04] backdrop-blur-xl rounded-[24px] p-4 border border-white/10">
                                    <form onSubmit={handleAddList}>
                                        <input
                                            type="text"
                                            placeholder="Enter list title..."
                                            value={newListTitle}
                                            onChange={(e) => setNewListTitle(e.target.value)}
                                            className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white mb-3 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/30 focus:border-fuchsia-400/30 transition-all"
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="submit"
                                                className="px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:brightness-110 active:scale-[0.97] transition-all"
                                            >
                                                Add List
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddList(false)}
                                                className="px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
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