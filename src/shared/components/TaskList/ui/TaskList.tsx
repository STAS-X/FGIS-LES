import type { TaskMainProps, TaskProcedureProps } from './Task/Task';
import { Task } from './Task/Task';

interface TaskListProps<T> extends TaskProcedureProps {
	tasks: Array<T>;
}

export const TaskList = (props: TaskListProps<TaskMainProps>) => {
	const { tasks, onCheck, onDel } = props;
	return tasks.length === 0 ? (
		<div>Таски пока не добавлены</div>
	) : (
		<>
			{tasks.map((item) => (
				<Task key={item.id} id={item.id} text={item.text} checked={item.checked} onCheck={onCheck} onDel={onDel} />
			))}
		</>
	);
};
