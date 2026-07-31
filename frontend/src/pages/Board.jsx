import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/axios';

const Board = () => {
    const { projectId } = useParams();
    const [lists, setLists] = useState([]);
    const [tasks, setTasks] = useState({});   // key: listId, value: array of tasks
    const [projectName, setProjectName] = useState('');

    // Fetch the whole board when projectId changes
    useEffect(() => {
        const fetchBoard = async () => {
            try {
                // 1. Get project details
                const projectRes = await api.get(`/projects/${projectId}`);
                setProjectName(projectRes.data.name);

                // 2. Get all lists for the project
                const listsRes = await api.get(`/projects/${projectId}/lists`);
                const fetchedLists = listsRes.data;
                setLists(fetchedLists);

                // 3. For each list, fetch its tasks
                const tasksMap = {};
                for (const list of fetchedLists) {
                    const tasksRes = await api.get(`/lists/${list.id}/tasks`);
                    tasksMap[list.id] = tasksRes.data;
                }
                setTasks(tasksMap);
            } catch (err) {
                console.error('Failed to load board', err);
            }
        };
        fetchBoard();
    }, [projectId]);

    // Drag & drop handler
    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside any list, or didn't actually move
        if (!destination) return;
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) return;

        const sourceListId = source.droppableId;
        const destListId = destination.droppableId;
        const taskId = draggableId;

        // Make a deep copy of the tasks state
        const newTasks = { ...tasks };
        // Remove the task from the source list
        const sourceTasks = Array.isArray(newTasks[sourceListId]) ? [...newTasks[sourceListId]] : [];
        const [movedTask] = sourceTasks.splice(source.index, 1);
        newTasks[sourceListId] = sourceTasks;

        // Insert the task into the destination list
        const destTasks = Array.isArray(newTasks[destListId]) ? [...newTasks[destListId]] : [];
        destTasks.splice(destination.index, 0, movedTask);
        newTasks[destListId] = destTasks;

        // Optimistically update the state (UI updates instantly)
        setTasks(newTasks);

        // Send the move request to the backend
        try {
            await api.patch(`/lists/${sourceListId}/tasks/${taskId}/move`, {
                listId: destListId,
                position: destination.index,
            });
        } catch (err) {
            console.error('Failed to move task', err);
            // If the API call fails, refresh the board to get the correct state from server
            const listsRes = await api.get(`/projects/${projectId}/lists`);
            const fetchedLists = listsRes.data;
            const tasksMap = {};
            for (const list of fetchedLists) {
                const tasksRes = await api.get(`/lists/${list.id}/tasks`);
                tasksMap[list.id] = tasksRes.data;
            }
            setLists(fetchedLists);
            setTasks(tasksMap);
        }
    };

    return (
        <div>
            <h1>{projectName}</h1>
            <DragDropContext onDragEnd={onDragEnd}>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                    {lists.map((list) => (
                        <div
                            key={list.id}
                            style={{
                                flex: '0 0 300px',
                                backgroundColor: '#f4f5f7',
                                borderRadius: '6px',
                                padding: '8px',
                            }}
                        >
                            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>{list.title}</h2>
                            <Droppable droppableId={list.id}>
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{ minHeight: '100px', padding: '4px' }}
                                    >
                                        {tasks[list.id]?.map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{
                                                            userSelect: 'none',
                                                            padding: '12px',
                                                            margin: '0 0 8px 0',
                                                            backgroundColor: 'white',
                                                            borderRadius: '4px',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                                            ...provided.draggableProps.style,
                                                        }}
                                                    >
                                                        {task.content}
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default Board;