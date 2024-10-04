import { ChangeEvent, MouseEvent } from 'react';
import deleteLogo from '@assets/delete.svg';

export interface TaskMainProps {
	id: string;
	text: string;
	checked: boolean;
}

export interface TaskProcedureProps<T = ChangeEvent, P = MouseEvent> {
	onCheck: (e: T) => void;
	onDel: (e: P) => void;
}

interface TaskProps extends TaskMainProps, TaskProcedureProps {}

export const Task = (props: TaskProps) => {
	const { id, text, checked, onCheck, onDel } = props;
	return (
		<div key={id} className='d-flex justify-content-between my-3'>
			<div className='d-flex align-items-center'>
				<input
					className='form-check-input'
					type='checkbox'
					name={`chk${id}`}
					id={`chk${id}`}
					checked={checked}
					onChange={onCheck}
				/>
				<label className='btn-outline-primary fs-5 mx-3' htmlFor={`chk${id}`}>
					{text}
				</label>
			</div>
			<button className='btn btn-success p-1' id={`btn${id}`} onClick={onDel}>
				<img src={deleteLogo} className='logo' alt='delete task' />
			</button>
		</div>
	);
};
