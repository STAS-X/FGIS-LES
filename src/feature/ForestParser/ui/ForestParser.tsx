import { MouseEvent } from 'react';

interface ForestParserProps<T = MouseEvent> {
	onParse: (e: T) => void;
}

export const ForestParser = (props: ForestParserProps) => {
	const { onParse } = props;

	return (
		<div className='d-flex justify-content-end my-5 mw-100'>
			<button className='btn btn-success' id={'fgis'} onClick={onParse}>
				Парсить лес
			</button>
		</div>
	);
};
