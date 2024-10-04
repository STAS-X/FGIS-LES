import { ChangeEventHandler, FormEventHandler, MouseEventHandler, useEffect, useRef, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.scss';
import { AddTask } from './feature/AddTask';
import { TaskList, TaskMainProps } from './shared/components/TaskList';
import { jsonFetch } from './shared/lib/fetcher/jsonFetcher';
import { ForestParser } from './feature/ForestParser';

const urlPath = 'http://localhost:8000';

export const App = () => {
	const [addTaskText, setAddTaskText] = useState<string>('');
	const [tasks, setTasks] = useState<Array<TaskMainProps>>([]);
	const addTextRef = useRef<HTMLInputElement>(null);

	const handleAddTaskTextChange: ChangeEventHandler = (event) => {
		setAddTaskText((event.target as HTMLInputElement).value);
	};

	const handleAddTaskSubmit: FormEventHandler = (event) => {
		event.preventDefault();
		let addedText = addTaskText.trim();
		if (!addedText) {
			return setAddTaskText('');
		}
		jsonFetch(`${urlPath}/add-task`, { text: addedText })
			.then(() => {
				setAddTaskText('');
			})
			.catch((err: Error) => {
				console.log(err);
			})
			.finally(() => {
				addTextRef.current?.focus();
			});
	};

	const handleTaskCheck: ChangeEventHandler = (event) => {
		const checked = (event.target as HTMLInputElement).checked;
		const targetId = event.target.id.substring(3);

		jsonFetch(`${urlPath}/check-task`, { id: targetId, checked }).catch((err: Error) => {
			console.log(err);
		});
	};

	const handleTaskDel: MouseEventHandler = (event) => {
		const targetId = (event.target as HTMLElement).closest('button')?.id.substring(3);

		jsonFetch(`${urlPath}/del-task`, { id: targetId }).catch((err: Error) => {
			console.log(err);
		});
	};

	const handleForestParse: MouseEventHandler = (event) => {
		const targetId = (event.target as HTMLElement).closest('button')?.id;

		jsonFetch(`${urlPath}/parse`, { id: targetId }, 'GET').catch((err: Error) => {
			console.log(err);
		});
	};

	useEffect(() => {
		let mount = true;
		let events: EventSource;
		let timer: number | undefined;
		let createEvents = () => {
			// Закрываем соединение если открыто
			if (events) {
				events.close();
			}
			// Устанавливаем SSE соединение
			events = new EventSource(`${urlPath}/events`);
			events.onmessage = (event) => {
				// Если компонент смонтирован, устанавливаем
				// полученными данными состояние списка
				if (mount) {
					let parsedData = JSON.parse(event.data);
					console.log(parsedData, 'get list of todos');
					setTasks(parsedData);
				}
			};
			// Если возникает ошибка - ждём секунду и
			// снова вызываем функцию подключения
			events.onerror = (err: Event) => {
				timer = setTimeout(() => {
					createEvents();
				}, 1000) as unknown as number;
			};
		};
		createEvents();

		// Перед размонтированием компонента отчищаем
		// таймер и закрываем соединение
		return () => {
			mount = false;
			clearTimeout(timer);
			events.close();
		};
	}, []);

	return (
		<>
			<div className='d-flex justify-content-around'>
				<a href='https://vitejs.dev' target='_blank'>
					<img src={viteLogo} className='logo' alt='Vite logo' />
				</a>
				<a href='https://react.dev' target='_blank'>
					<img src={reactLogo} className='logo react' alt='React logo' />
				</a>
			</div>
			<h1>Vite + React</h1>
			<ForestParser onParse={handleForestParse} />
			<main>
				<div className='l-todo'>
					<h2>Todo List</h2>
					<AddTask
						text={addTaskText}
						onSubmit={handleAddTaskSubmit}
						onTextChange={handleAddTaskTextChange}
						textRef={addTextRef}
					/>
					<TaskList tasks={tasks} onCheck={handleTaskCheck} onDel={handleTaskDel} />
				</div>
			</main>
		</>
	);
};
