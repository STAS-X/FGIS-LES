import { ChangeEvent, FormEvent, RefObject } from 'react';

interface AddTaskProps<T = ChangeEvent, P = FormEvent> {
	text: string;
	onTextChange: (e: T) => void;
	onSubmit: (e: P) => void;
	textRef: RefObject<HTMLInputElement>;
}

export const AddTask = (props: AddTaskProps) => {
	const { text, onTextChange, onSubmit, textRef } = props;
	return (
		<form className='d-flex' onSubmit={onSubmit}>
			<input
				className='form-control text-primary bg-light border-1 rounded-4 border-success fs-6 mw-80'
				type='text'
				name='add'
				value={text}
				onChange={onTextChange}
				ref={textRef}
			/>
			<input className='btn btn-primary' type='submit' value='Добавить' />
		</form>
	);
};
