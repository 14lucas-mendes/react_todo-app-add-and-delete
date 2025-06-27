/* eslint-disable prettier/prettier */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect, useRef } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID } from './api/todos';
import { client } from './utils/fetchClient';
import { Todo } from './types/Todo';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingAction('load');
    client
      .get<Todo[]>(`/todos?userId=${USER_ID}`)
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'))
      .finally(() => setLoadingAction(null));
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [todos, tempTodo]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTodoTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage('Title should not be empty');

      return;
    }

    const newTempTodo: Todo = {
      id: 0,
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    };

    setTempTodo(newTempTodo);
    setLoadingAction('add');
    setNewTodoTitle('');

    client
      .post<Todo>('/todos', {
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    })
      .then(newTodo => {
        setTodos(prev => [...prev, newTodo]);
        setNewTodoTitle('');
      })
      .catch(() => {
        setErrorMessage('Unable to add a todo');
        setNewTodoTitle(trimmedTitle);
      })
      .finally(() => {
        setTempTodo(null);
        setLoadingAction(null);
        inputRef.current?.focus();
      });
  };

  const handleDeleteTodo = (id: number) => {
    setLoadingAction(`delete-${id}`);
    client
      .delete(`/todos/${id}`)
      .then(() => {
        setTodos(prev => prev.filter(todo => todo.id !== id));
      })
      .catch(() => setErrorMessage('Unable to delete a todo'))
      .finally(() => setLoadingAction(null));
  };

  const handleToggleCompleted = (id: number) => {
    setLoadingAction(`toggle-${id}`);
    const foundTodo = todos.find(t => t.id === id);

    if (!foundTodo) {
      return;
    }

    client
      .patch<Todo>(`/todos/${id}`, { completed: !foundTodo.completed })
      .then(updatedTodo => {
        setTodos(prev =>
          prev.map(t =>
            t.id === id ? { ...t, completed: updatedTodo.completed } : t,
          ),
        );
      })
      .catch(() => setErrorMessage('Unable to update todo'))
      .finally(() => setLoadingAction(null));
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const saveEditing = (id: number) => {
    const trimmedTitle = editingTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage('Title should not be empty');

      return;
    }

    setLoadingAction(`edit-${id}`);
    client
      .patch<Todo>(`/todos/${id}`, { title: trimmedTitle })
      .then(updatedTodo => {
        setTodos(prev =>
          prev.map(todo =>
            todo.id === id ? { ...todo, title: updatedTodo.title } : todo,
          ),
        );
        setEditingId(null);
      })
      .catch(() => setErrorMessage('Unable to edit todo'))
      .finally(() => setLoadingAction(null));
  };

  const activeTodosCount = todos.filter(todo => !todo.completed).length;
  const hasCompletedTodos = todos.some(todo => todo.completed);

  const clearCompleted = () => {
    setLoadingAction('clear');
    Promise.all(
      todos
        .filter(todo => todo.completed)
        .map(todo => client.delete(`/todos/${todo.id}`)),
    )
      .then(() => {
        setTodos(prev => prev.filter(todo => !todo.completed));
      })
      .catch(() => setErrorMessage('Unable to clear completed todos'))
      .finally(() => setLoadingAction(null));
  };

  const handleToggleAll = () => {
    const shouldCompleteAll = todos.some(todo => !todo.completed);

    setLoadingAction('toggle-all');
    Promise.all(
      todos.map(todo =>
        client.patch(`/todos/${todo.id}`, { completed: shouldCompleteAll }),
      ),
    )
      .then(() => {
        setTodos(prev =>
          prev.map(todo => ({
            ...todo,
            completed: shouldCompleteAll,
          })),
        );
      })
      .catch(() => setErrorMessage('Unable to toggle all todos'))
      .finally(() => setLoadingAction(null));
  };

  const getFilteredTodos = () => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={`todoapp__toggle-all ${
              activeTodosCount === 0 ? 'active' : ''
            }`}
            data-cy="ToggleAllButton"
            onClick={handleToggleAll}
            disabled={loadingAction === 'toggle-all'}
            aria-label="Toggle all todos"
          />

          <form onSubmit={handleAddTodo}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={loadingAction !== null}
              aria-label="New todo title"
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {getFilteredTodos().map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
            >
              <label
                className="todo__status-label"
                htmlFor={`todo-checkbox-${todo.id}`}
              >
                <input
                  id={`todo-checkbox-${todo.id}`}
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleToggleCompleted(todo.id)}
                  disabled={loadingAction === `toggle-${todo.id}`}
                />
              </label>

              {editingId === todo.id ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    saveEditing(todo.id);
                  }}
                >
                  <input
                    type="text"
                    className="todo__title-field"
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => saveEditing(todo.id)}
                    autoFocus
                    aria-label="Edit todo title"
                  />
                </form>
              ) : (
                <span
                  className="todo__title"
                  onDoubleClick={() => startEditing(todo)}
                >
                  {todo.title}
                </span>
              )}

              <button
                type="button"
                className="todo__remove"
                onClick={() => handleDeleteTodo(todo.id)}
                disabled={loadingAction === `delete-${todo.id}`}
                aria-label={`Delete ${todo.title}`}
              >
                ×
              </button>
            </div>
          ))}

          {tempTodo && (
            <div data-cy="Todo" className="todo">
              <div className="todo__title">
                {tempTodo.title}
              </div>
              <div className="modal overlay is-active">
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          )}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer">
            <span className="todo-count">{activeTodosCount} items left</span>

            <nav className="filter">
              <a
                href="#/"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </a>
              <a
                href="#/active"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                onClick={() => setFilter('active')}
              >
                Active
              </a>
              <a
                href="#/completed"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            {hasCompletedTodos && (
              <button
                type="button"
                className="todoapp__clear-completed"
                onClick={clearCompleted}
                aria-label="Clear completed todos"
              >
                Clear completed
              </button>
            )}
          </footer>
        )}
      </div>

      {errorMessage && (
        <div
          className="notification is-danger is-light has-text-weight-normal"
          role="alert"
          data-cy="ErrorNotification"
        >
          <button
            type="button"
            className="delete"
            onClick={() => setErrorMessage('')}
            aria-label="Close error message"
          />
          {errorMessage}
        </div>
      )}
    </div>
  );
};
